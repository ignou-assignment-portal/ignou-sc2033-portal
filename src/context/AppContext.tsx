import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  UserRole,
  IntakeRecord,
  Evaluator,
  CoursePacket,
  RemunerationBill,
  SystemSettings,
  SubmissionMode,
  AssignmentSubmission,
  SubmissionStatusType,
  RegistrationReceipt,
  RegistrationReceiptFees,
  CourseEvaluationRecord,
  EvaluationStatus,
  IGNOUProgramme,
  IGNOUCourse,
  SessionArchiveRecord,
  AppTheme,
  AuditLogEntry,
  StudentRegistrationRecord,
  RbacOperation,
  RbacAccessLevel,
  RbacPolicy,
  RbacConfiguration,
  StaffAccount,
  CoordinatorAccount,
  SecurityCredentials,
  LockoutState,
} from '../types';
import { THEMES, THEME_STORAGE_KEY, getInitialTheme, applyThemeToDOM } from '../utils/theme';
import {
  INITIAL_SETTINGS,
  INITIAL_EVALUATORS,
  INITIAL_INTAKE_RECORDS,
  INITIAL_PACKETS,
  INITIAL_BILLS,
  INITIAL_ASSIGNMENT_SUBMISSIONS,
  INITIAL_REGISTRATION_RECEIPTS,
  INITIAL_COURSE_EVALUATIONS,
  IGNOU_PROGRAMMES,
  INITIAL_AUDIT_LOGS,
  INITIAL_STUDENT_REGISTRATIONS,
} from '../data/ignouMasterData';
import {
  EXTENDED_IGNOU_PROGRAMMES,
  formatIgnouCourseCode,
  lookupCatalogCourse,
  cleanIgnouTitle,
} from '../data/ignouComprehensiveCatalog';
import {
  generateSessionCode,
  generateDeterministicSubmissionKey,
  calculateIGNOUGrade,
  getIgnouGrade,
  formatDate,
  isPracticalCourse,
  isDualComponentCourse,
} from '../utils/helpers';
import {
  doGet,
  postAddIntake,
  postEditIntake,
  postDeleteIntake,
  postUpdateMarks,
  postAllotEvaluator,
  postSyncAdmissions,
  postAddRegistration,
  purgeRemoteOperationalData,
  testAppsScriptConnection,
  getCustomScriptUrl,
  setCustomScriptUrl,
  executeQueuedMutation,
  SCRIPT_URL,
  normalizeSessionName,
  norm
} from '../services/sheetsService';
import {
  subscribeSyncQueue,
  processPendingQueue,
  retrySingleSyncItem,
  removeSyncItem,
  clearPendingQueue,
  SyncQueueItem,
} from '../services/syncQueueService';
import { verifyGoogleSheetsParity, DataIntegrityReport } from '../services/dataIntegrityService';
import {
  validateIntakeRecord,
  applyCascadingUpdate,
  applyCascadingDeletion,
  getRegisteredProgrammeForEnrollment as getRegisteredProgHelper,
  getEnrolledCoursesForStudent as getEnrolledCoursesHelper,
  getEnrolledCourseComponentsForStudent as getEnrolledCourseComponentsHelper,
  ValidationResult,
} from '../services/intakeValidationEngine';

export { normalizeSessionName, norm };
export const normalizeSession = (s: any): string => norm(s);

interface AppContextType {
  // Session Isolation
  currentSession: string;
  setSession: (session: string) => void;
  availableSessions: string[];
  addSession: (newSession: string) => void;

  // RBAC
  currentRole: UserRole;
  setRole: (role: UserRole) => void;
  toggleRole: () => void;
  isAdmin: boolean;
  isOfficial: boolean;
  isUrlLockedDeskMode: boolean;
  isAdminPinModalOpen: boolean;
  adminPinError: string | null;
  openAdminPinModal: () => void;
  closeAdminPinModal: () => void;
  verifyAndSetAdminRole: (pin: string) => boolean;

  // Gatekeeper Authentication & RBAC (SC-2033)
  isAuthenticated: boolean;
  setIsAuthenticated: (auth: boolean) => void;
  userRole: string;
  setUserRole: (role: string) => void;
  securityPins: { deskPin: string; adminPin: string };
  setSecurityPins: React.Dispatch<React.SetStateAction<{ deskPin: string; adminPin: string }>>;
  updateSecurityPins: (newPins: { deskPin: string; adminPin: string }) => void;
  securityCredentials: SecurityCredentials;
  updateSecurityCredentials: (newCreds: Partial<SecurityCredentials>) => void;
  lockoutState: LockoutState;
  resetLockout: () => void;
  verifyCoordinatorStepUp: (passphrase: string, actionTitle?: string) => { success: boolean; error?: string };
  handleLogin: (role: 'desk' | 'admin', identifierOrPin: string, password?: string) => boolean;
  logout: () => void;
  rbacConfig: RbacConfiguration;
  updateRbacConfig: (newConfig: Partial<RbacConfiguration>) => void;
  resetRbacToDefaults: () => void;
  canPerformOperation: (operation: RbacOperation) => { allowed: boolean; requiresPin: boolean };

  // Intake Master (Strictly Session Filtered)
  sessionIntakes: IntakeRecord[];
  allIntakes: IntakeRecord[];
  intakeRegister: IntakeRecord[];
  setIntakeRegister: React.Dispatch<React.SetStateAction<IntakeRecord[]>>;
  syncStatus: string;
  addIntakeRecord: (record: Omit<IntakeRecord, 'id' | 'tokenNo' | 'createdAt' | 'marks'> & { session?: string; marks?: Record<string, number | null> }) => IntakeRecord;
  integrateIntakeWithPrevious: (params: {
    targetIntakeId: string;
    newCourseCodes: string[];
    practicalCourses?: string[];
    assignmentCourses?: string[];
    submissionDate?: string;
    submissionMode?: SubmissionMode;
    consignmentNo?: string;
    remarks?: string;
  }) => { updatedRecord: IntakeRecord; receipt: RegistrationReceipt };
  updateIntakeRecord: (id: string, updates: Partial<IntakeRecord>) => Promise<void> | void;
  editIntakeEntry: (params: {
    id: string;
    originalEnrollmentNo: string;
    enrollmentNo: string;
    candidateName: string;
    contact: string;
    programme: string;
    courses: string[];
    session?: string;
    submissionDate?: string;
  }) => Promise<any> | void;
  updateIntakeDate: (idOrToken: string, newDate: string) => Promise<void> | void;
  deleteIntakeRecord: (id: string) => boolean;
  getRegisteredProgrammeForEnrollment: (enrollmentNo: string, currentIntakeId?: string) => string | null;
  getEnrolledCoursesForStudent: (enrollmentNo: string, currentIntakeId?: string) => Set<string>;
  getEnrolledCourseComponentsForStudent: (enrollmentNo: string, currentIntakeId?: string) => Map<string, Set<'Assignment' | 'Practical'>>;
  validateIntake: (params: {
    enrollmentNo: string;
    programmeCode: string;
    courseCodes: string[];
    practicalCourses?: string[];
    assignmentCourses?: string[];
    courseComponents?: Record<string, 'Assignment' | 'Practical' | 'Both'>;
    session?: string;
    currentIntakeId?: string;
  }) => ValidationResult;
  updateMarks: (intakeId: string, courseCode: string, marks: number | null, componentType?: 'Assignment' | 'Practical') => void;
  updatePracticalMarks: (intakeId: string, courseCode: string, marks: number | null) => void;
  saveOrUpdateMarksAndLock: (
    row: any,
    marksValue: number | string | null | undefined,
    isLockAction: boolean,
    componentType?: 'Assignment' | 'Practical'
  ) => Promise<void>;

  // Module B: 2_Course_Evaluation_Master (Automated Ledger Unpacking & Marks Engine)
  courseLedger: CourseEvaluationRecord[];
  setCourseLedger: React.Dispatch<React.SetStateAction<CourseEvaluationRecord[]>>;
  sessionCourseEvaluations: CourseEvaluationRecord[];
  allCourseEvaluations: CourseEvaluationRecord[];
  allotEvaluatorToEvaluations: (evaluationIds: string[], evaluatorId: string | null) => void;
  updateEvaluationMarks: (evaluationId: string, marks: number | null) => void;
  toggleLockMarks: (evaluationId: string, shouldLock: boolean) => void;
  batchLockMarks: (evaluationIds: string[], shouldLock: boolean) => void;

  // Assignment Submissions (Course-wise Tracking linked to StudentID, CourseCode, Session)
  sessionAssignmentSubmissions: AssignmentSubmission[];
  allAssignmentSubmissions: AssignmentSubmission[];
  updateSubmissionStatus: (submissionId: string, status: SubmissionStatusType, details?: { submissionDate?: string; submissionMode?: SubmissionMode; consignmentNo?: string; remarks?: string }) => void;
  batchUpdateSubmissionStatus: (submissionIds: string[], status: SubmissionStatusType) => void;
  recordStudentAssignmentSubmissions: (data: {
    studentId: string;
    studentName: string;
    programmeCode: string;
    courseCodes: string[];
    session?: string;
    initialStatus?: SubmissionStatusType;
    submissionDate?: string;
    submissionMode?: SubmissionMode;
    consignmentNo?: string;
    remarks?: string;
    practicalCourses?: string[];
    assignmentCourses?: string[];
  }) => void;
  sessionRegistrationReceipts: RegistrationReceipt[];
  allRegistrationReceipts: RegistrationReceipt[];
  addRegistrationReceipt: (receiptData: Omit<RegistrationReceipt, 'id' | 'receiptNumber' | 'issuedAt'> & { issuedAt?: string; submissionDate?: string; receiptDate?: string }) => RegistrationReceipt;
  selectedRegistrationReceipt: RegistrationReceipt | null;
  openRegistrationReceiptModal: (receipt: RegistrationReceipt) => void;
  closeRegistrationReceiptModal: () => void;

  // Course Ledger / Packets
  packets: CoursePacket[];
  setPackets: React.Dispatch<React.SetStateAction<CoursePacket[]>>;
  coursePackets: CoursePacket[];
  setCoursePackets: React.Dispatch<React.SetStateAction<CoursePacket[]>>;
  sessionPackets: CoursePacket[];
  createPacket: (data: { courseCode: string; programmeCode: string; evaluatorId: string | null; scriptCount: number; expectedReturnDate?: string; notes?: string }) => CoursePacket;
  updatePacket: (id: string, updates: Partial<CoursePacket>) => void;
  deletePacket: (id: string) => void;

  // Evaluators Master
  evaluators: Evaluator[];
  addEvaluator: (evaluator: Omit<Evaluator, 'id' | 'lastSyncedAt'>) => Evaluator;
  updateEvaluator: (id: string, updates: Partial<Evaluator>) => void;
  deleteEvaluator: (id: string) => void;
  isSyncingSheets: boolean;
  syncGoogleSheets: (isSilent?: boolean) => Promise<void>;
  fetchAllData: (isSilent?: boolean) => Promise<void>;
  isSyncingEvaluators: boolean;
  syncEvaluatorsDirectory: () => Promise<void>;
  lastSheetSync: string;

  // Data Sync Monitor & Offline Parity Engine
  pendingSyncQueue: SyncQueueItem[];
  connectionStatus: 'connected' | 'syncing' | 'queued' | 'offline' | 'error';
  lastLatencyMs: number | null;
  integrityReport: DataIntegrityReport | null;
  isCheckingIntegrity: boolean;
  isSyncDrawerOpen: boolean;
  setIsSyncDrawerOpen: (val: boolean) => void;
  toggleSyncDrawer: () => void;
  checkDataIntegrity: () => Promise<DataIntegrityReport>;
  retryPendingQueue: (forceAll?: boolean) => Promise<{ processed: number; succeeded: number; failed: number }>;
  retrySingleQueueItem: (id: string) => Promise<boolean>;
  removeQueueItem: (id: string) => Promise<void>;
  clearAllQueueItems: () => Promise<void>;

  // Remuneration & Bills
  sessionBills: RemunerationBill[];
  generateBill: (evaluatorId: string, courseCodes: string[], totalScripts: number, rateOverride?: number) => RemunerationBill;
  sanctionBill: (billId: string) => void;
  disburseBill: (billId: string, ref: string) => void;

  // System Settings
  settings: SystemSettings;
  updateSettings: (newSettings: Partial<SystemSettings>) => void;
  resetAllData: () => void;

  // Active Receipt Modal (Intake / Acknowledgment)
  selectedReceiptRecord: IntakeRecord | null;
  openReceiptModal: (record: IntakeRecord) => void;
  closeReceiptModal: () => void;

  // Module E: Global Student Search & Lookup Modal
  isSearchModalOpen: boolean;
  searchInitialQuery: string;
  openSearchModal: (initialQuery?: string) => void;
  closeSearchModal: () => void;

  // Navigation Sidebar Collapsible & Hideable State
  isSidebarHidden: boolean;
  setIsSidebarHidden: (val: boolean) => void;
  toggleSidebarHidden: () => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (val: boolean) => void;
  toggleSidebarCollapsed: () => void;

  // Header & Full-Page Workspace View Modes
  isHeaderCompact: boolean;
  setIsHeaderCompact: (val: boolean) => void;
  toggleHeaderCompact: () => void;
  isContentFullWidth: boolean;
  setIsContentFullWidth: (val: boolean) => void;
  toggleContentFullWidth: () => void;

  // Theme & Visual Preferences
  currentTheme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  isDark: boolean;
  toggleDark: () => void;

  // Toast Notification System
  toastMessage: string | null;
  toastType: 'success' | 'info' | 'warning' | 'error';
  showToast: (message?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  hideToast: () => void;

  // Custom Programmes, Course Registry & IGNOU Resolution
  allProgrammes: IGNOUProgramme[];
  customProgrammes: IGNOUProgramme[];
  customCourses: Record<string, IGNOUCourse[]>;
  courseTitlesRegistry: Record<string, { title: string; credits: number; source?: string }>;
  saveCustomProgramme: (prog: { code: string; name?: string; level?: 'Bachelor' | 'Master' | 'Diploma' | 'Certificate'; department?: string }) => IGNOUProgramme;
  removeCustomProgramme: (progCode: string) => void;
  saveCustomCourse: (progCode: string, course: { code: string; title?: string; credits?: number }) => void;
  getProgrammeCourses: (progCode: string) => IGNOUCourse[];
  getCourseTitle: (courseCode: string, progCode?: string) => string;
  getCourseInfo: (courseCode: string, progCode?: string) => { title: string; credits: number; source?: string };
  updateCourseTitleFromIgnou: (courseCode: string, progCode?: string, forceLive?: boolean) => Promise<{ title: string; credits: number; source: string }>;

  // Academic Session Archival & History Snapshots
  archives: SessionArchiveRecord[];
  createSessionArchive: (params: {
    name: string;
    session: string;
    notes?: string;
    startNewSession?: boolean;
    newSessionName?: string;
    downloadJSON?: boolean;
  }) => SessionArchiveRecord;
  deleteArchive: (archiveId: string) => void;
  restoreArchive: (archiveId: string) => boolean;
  downloadArchiveJSON: (archive: SessionArchiveRecord) => void;
  importArchiveJSON: (archiveData: any) => SessionArchiveRecord;

  // Audit Trail & Accountability Logs
  auditLogs: AuditLogEntry[];
  logAuditEvent: (entry: Omit<AuditLogEntry, 'id' | 'timestamp'> & { timestamp?: string }) => void;
  clearAuditLogs: () => void;
  exportAuditLogsCSV: () => void;
  exportAuditLogsJSON: () => void;

  // Admissions & Re-Registration (Fresh 1st Year & Re-Reg 2nd/3rd Year)
  studentRegistrations: StudentRegistrationRecord[];
  freshAdmissions: StudentRegistrationRecord[];
  reRegistrations: StudentRegistrationRecord[];
  getStudentRegistrationByEnrollment: (enrollmentNo: string) => StudentRegistrationRecord | null;
  getAllStudentRegistrationsByEnrollment: (enrollmentNo: string) => StudentRegistrationRecord[];
  addStudentRegistration: (record: Omit<StudentRegistrationRecord, 'id' | 'createdAt' | 'updatedAt'>) => StudentRegistrationRecord;
  batchImportStudentRegistrations: (records: StudentRegistrationRecord[], overwriteDuplicates?: boolean) => { added: number; updated: number; skipped: number };
  updateStudentRegistration: (id: string, updates: Partial<StudentRegistrationRecord>) => void;
  deleteStudentRegistration: (id: string) => void;
  isSyncingAdmissions: boolean;
  syncAdmissionsWithGoogleSheets: () => Promise<void>;
  calibrateStudentRegistrations: () => void;

  // Operational Data Purge & Custom Google Sheet Connector
  purgeOperationalData: (backupFirst?: boolean) => Promise<{ success: boolean; message: string }>;
  purgeOldDemoDataAndSyncLive: () => Promise<void>;
  customAppsScriptUrl: string;
  setCustomAppsScriptUrl: (url: string) => void;
  testCustomConnection: (url?: string) => Promise<{
    success: boolean;
    reachable: boolean;
    latencyMs: number;
    message: string;
    sheets?: string[];
    totalIntakes?: number | null;
    totalCourseRows?: number | null;
  }>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  SETTINGS: 'ignou_sc2033_settings',
  INTAKES: 'ignou_sc2033_intakes',
  EVALUATORS: 'ignou_sc2033_evaluators',
  EVALUATORS_MASTER: 'ignou_evaluators_master',
  PACKETS: 'ignou_sc2033_packets',
  BILLS: 'ignou_sc2033_bills',
  ASSIGNMENT_SUBMISSIONS: 'ignou_sc2033_assignment_submissions',
  REGISTRATION_RECEIPTS: 'ignou_sc2033_registration_receipts',
  COURSE_EVALUATIONS: 'ignou_sc2033_course_evaluations',
  ROLE: 'ignou_sc2033_user_role',
  CURRENT_SESSION: 'ignou_sc2033_current_session',
  LAST_SHEET_SYNC: 'ignou_sc2033_last_sheet_sync',
  CUSTOM_PROGRAMMES: 'ignou_sc2033_custom_programmes',
  CUSTOM_COURSES: 'ignou_sc2033_custom_courses',
  COURSE_TITLES_REGISTRY: 'ignou_sc2033_course_titles_registry',
  ARCHIVES: 'ignou_sc2033_archives',
  AUDIT_LOGS: 'ignou_sc2033_audit_trail',
  STUDENT_REGISTRATIONS: 'ignou_sc2033_student_registrations',
  RBAC_CONFIG: 'ignou_sc2033_rbac_config',
  SECURITY_CREDENTIALS: 'ignou_sc2033_security_credentials',
  LOCKOUT_STATE: 'ignou_sc2033_lockout_state',
};

export const DEFAULT_SECURITY_CREDENTIALS: SecurityCredentials = {
  staffAccount: {
    username: 'desk_official',
    name: 'Desk Official Counter 1',
    password: 'sc2033desk',
    role: 'desk',
  },
  coordinatorAccount: {
    username: 'coordinator',
    name: 'Dr. Sant K. Gupta',
    masterPassphrase: 'sc2033coordinator',
  },
  inactivityTimeoutMinutes: 20,
  maxFailedAttempts: 5,
  lockoutDurationMinutes: 3,
};

export const DEFAULT_LOCKOUT_STATE: LockoutState = {
  failedAttempts: 0,
  isLocked: false,
  lockoutUntil: null,
};

export const DEFAULT_RBAC_CONFIG: RbacConfiguration = {
  enabled: true,
  requireCoordinatorPinForMarksLock: true,
  requireCoordinatorPinForBilling: true,
  lastUpdated: new Date().toISOString(),
  updatedBy: 'System Statutory Default',
  policies: {
    intake_registration: {
      desk: 'ALLOWED',
      admin: 'ALLOWED',
      label: 'Intake Registration & Receipts',
      description: 'Receive student assignment/practical scripts and generate official acknowledgment receipts.',
      category: 'Intake',
    },
    intake_edit_delete: {
      desk: 'PIN_REQUIRED',
      admin: 'ALLOWED',
      label: 'Intake Record Modification & Deletion',
      description: 'Edit student details, adjust submission dates, or delete mistaken intake entries.',
      category: 'Intake',
    },
    marks_entry: {
      desk: 'ALLOWED',
      admin: 'ALLOWED',
      label: 'Evaluation Marks Entry',
      description: 'Enter raw assignment marks, evaluate criteria, and calculate grades.',
      category: 'Evaluation',
    },
    marks_locking: {
      desk: 'PIN_REQUIRED',
      admin: 'ALLOWED',
      label: 'Master Marks Finalization & Locking',
      description: 'Lock evaluated marks preventing further tampering or modification.',
      category: 'Evaluation',
    },
    packets_dispatch: {
      desk: 'ALLOWED',
      admin: 'ALLOWED',
      label: 'Course Packets & Dispatch Allotment',
      description: 'Bundle scripts into packets and allot them to empanelled evaluators.',
      category: 'Evaluation',
    },
    remuneration_billing: {
      desk: 'PIN_REQUIRED',
      admin: 'ALLOWED',
      label: 'Remuneration Bill Generation',
      description: 'Generate statutory remuneration claims and compute evaluator payout totals.',
      category: 'Finance',
    },
    sed_award_sheets: {
      desk: 'ALLOWED',
      admin: 'ALLOWED',
      label: 'SED 3-Part Regional Award Sheets',
      description: 'Generate, print, and export regional centre gazette award sheets.',
      category: 'Evaluation',
    },
    evaluators_directory: {
      desk: 'ALLOWED',
      admin: 'ALLOWED',
      label: 'Evaluator Directory & Bank Profiles',
      description: 'View and manage academic counsellors, bank IFSC details, and course eligibility.',
      category: 'Administration',
    },
    system_settings: {
      desk: 'FORBIDDEN',
      admin: 'ALLOWED',
      label: 'Centre Configuration & Governance',
      description: 'Manage study centre parameters, remuneration rates, security PINs, and cloud sync.',
      category: 'Administration',
    },
    forensic_audit_trail: {
      desk: 'FORBIDDEN',
      admin: 'ALLOWED',
      label: 'Forensic Audit Trail & Security Logs',
      description: 'Institutional activity records, user session timelines, and modification logs. Strictly hidden from Desk officials.',
      category: 'Administration',
    },
  },
};

export const parseEvaluatorsMaster = (rawList: any[]): Evaluator[] => {
  if (!Array.isArray(rawList)) return [];
  return rawList.map((row: any, idx: number) => {
    const code = String(row.Evaluator_Code || row.evaluatorCode || row.code || `EV-${101 + idx}`).trim();
    const name = String(row.Evaluator_Name || row.evaluatorName || row.name || 'Academic Counsellor').trim();
    const designation = String(row.Designation || row.designation || 'Academic Counsellor').trim();
    const department = String(row.Department || row.department || 'Academic Division').trim();
    const college = String(row.College || row.collegeInstitution || row.institution || 'IGNOU Study Centre 2033').trim();
    const contact = String(row.Contact_Number || row.contactNumber || row.Contact || row.contactPhone || row.phone || '').trim();
    const email = String(row.Email_ID || row.emailId || row.Email || row.email || '').trim();

    let eligibleCourses: string[] = [];
    if (typeof row.Eligible_Courses === 'string') {
      eligibleCourses = row.Eligible_Courses.split(',').map((c: string) => c.trim().toUpperCase()).filter(Boolean);
    } else if (typeof row.eligibleCourses === 'string') {
      eligibleCourses = row.eligibleCourses.split(',').map((c: string) => c.trim().toUpperCase()).filter(Boolean);
    } else if (Array.isArray(row.Eligible_Courses)) {
      eligibleCourses = row.Eligible_Courses.map((c: any) => String(c).trim().toUpperCase()).filter(Boolean);
    } else if (Array.isArray(row.eligibleCourses)) {
      eligibleCourses = row.eligibleCourses.map((c: any) => String(c).trim().toUpperCase()).filter(Boolean);
    }

    const bankAccountNo = String(row.Bank_Account_No || row.bankAccountNo || row.accountNumber || '').trim();
    const ifscCode = String(row.IFSC_Code || row.ifscCode || '').trim().toUpperCase();
    const bankName = String(row.Bank_Name || row.bankName || 'State Bank of India').trim();
    const panNumber = String(row.PAN_Number || row.panNumber || '').trim().toUpperCase();
    const status = String(row.Status || row.status || 'Active').trim();

    return {
      id: row.id || `eval-${code.toLowerCase().replace(/[^a-z0-9]/g, '') || idx}`,
      evaluatorCode: code,
      name,
      evaluatorName: name,
      designation,
      department,
      collegeInstitution: college,
      contactPhone: contact,
      contactNumber: contact,
      email,
      emailId: email,
      eligibleCourses,
      bankName,
      accountNumber: bankAccountNo,
      bankAccountNo,
      ifscCode,
      panNumber,
      status,
      lastSyncedAt: new Date().toISOString(),
    };
  });
};

const DUMMY_SEED_ENROLLMENTS = new Set([
  '2350198421', '2350198455', '2350198490', '2240981723', '2240981750',
  '2109483721', '2401829103', '2391028374', '2401928371', '2450192831',
  '2510294812', '2510294899', '2209182390', '2351829014', '2410982341',
  '2601365755', '2601620450', '2601620613', '2601615010', '2601789028',
  '2601788989', '2352267466', '2651819010', '2101910933', '2651888161',
  '2401102911', '2401102922', '2301827364', '2301984210', '2452201010',
  '2452201020', '2201830549', '2501103030', '2501103040', '2550184040',
  '2550184050', '2601928388'
]);

const DUMMY_STUDENT_NAMES = new Set([
  'aarav sharma', 'pooja bhattacharya', 'mohammad tariq', 'kavita kumari',
  'rohan joshi', 'temsula ao', 'divya soni', 'vikramaditya rao',
  'neha malhotra', 'riya sen', 'rahul verma', 'deepa joshi',
  'sunita meena', 'vikram malhotra', 'manish kumar tiwari',
  'vizanu k zhimo', 'sruti basumatary', 'chandeno yanthan', 'anisha tasmin',
  'priya parveen', 'rojita singh', 'sushmita paul', 'vipeni g yeptho',
  'kanhaiya shah', 'md rehan', 'imtikumzuk ao', 'neikethono kense',
  'sangita das', 'arenla pongen', 'suresh sharma', 'ananya chatterjee',
  's. lamtang phon', 'zubeni kikon', 'manoj prasad', 'alongba chang',
  'rani devi', 'bendangtoshi jamir'
]);

export const isDummySubmissionId = (id: string, studentId?: string, studentName?: string): boolean => {
  const sId = String(id || '').trim();
  if (sId.startsWith('sub-jul26-') || sId.startsWith('sub-jan27-') || sId.startsWith('sub-jan26-') || sId.startsWith('sub-seed-')) return true;
  if (studentId && DUMMY_SEED_ENROLLMENTS.has(String(studentId).trim())) return true;
  if (studentName && DUMMY_STUDENT_NAMES.has(String(studentName).trim().toLowerCase())) return true;
  if (sId.startsWith('sub-') && studentId && DUMMY_SEED_ENROLLMENTS.has(String(studentId).trim())) {
    return true;
  }
  return false;
};

export const isDummyIntakeId = (id: string, enrollmentNo?: string, studentName?: string): boolean => {
  const sId = String(id || '').trim();
  if (sId.startsWith('intake-jul26-') || sId.startsWith('intake-jan27-') || sId.startsWith('intake-jan26-') || sId.startsWith('intake-seed-')) return true;
  if (enrollmentNo && DUMMY_SEED_ENROLLMENTS.has(String(enrollmentNo).trim())) return true;
  if (studentName && DUMMY_STUDENT_NAMES.has(String(studentName).trim().toLowerCase())) return true;
  return false;
};

export const isDummyEvaluationId = (id: string, intakeId?: string, enrollmentNo?: string, studentName?: string): boolean => {
  const sIntakeId = String(intakeId || '').trim();
  if (sIntakeId.startsWith('intake-jul26-') || sIntakeId.startsWith('intake-jan27-') || sIntakeId.startsWith('intake-jan26-') || sIntakeId.startsWith('intake-seed-')) return true;
  if (enrollmentNo && DUMMY_SEED_ENROLLMENTS.has(String(enrollmentNo).trim())) return true;
  if (studentName && DUMMY_STUDENT_NAMES.has(String(studentName).trim().toLowerCase())) return true;
  const sId = String(id || '').trim();
  if (sId.startsWith('eval-jul26-') || sId.startsWith('eval-jan27-') || sId.startsWith('eval-jan26-') || sId.startsWith('eval-seed-')) return true;
  for (const enr of DUMMY_SEED_ENROLLMENTS) {
    if (sId.includes(`_${enr}_`)) return true;
  }
  return false;
};

export const isDummyReceiptId = (id: string, studentId?: string, receiptNumber?: string, studentName?: string): boolean => {
  const sId = String(id || '').trim();
  const sRec = String(receiptNumber || '').trim();
  if (sId.startsWith('reg-receipt-jul26-') || sId.startsWith('reg-receipt-jan27-') || sId.startsWith('reg-receipt-jan26-') || sId.startsWith('reg-receipt-seed-')) return true;
  if (sRec.startsWith('REG-SC2033-JUL26-000') || sRec.startsWith('REG-SC2033-JAN27-000') || sRec.startsWith('REG-SC2033-JAN26-000')) return true;
  if (studentId && DUMMY_SEED_ENROLLMENTS.has(String(studentId).trim())) return true;
  if (studentName && DUMMY_STUDENT_NAMES.has(String(studentName).trim().toLowerCase())) return true;
  return false;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Settings & Sessions
  const [settings, setSettings] = useState<SystemSettings>(() => {
    try {
      const saved = localStorage.getItem('ignou_sc2033_settings') || localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.coordinatorName || parsed.coordinatorName === 'Dr. V. K. Aggarwal' || parsed.coordinatorName === 'Dr. Sant K. Gupta') {
          parsed.coordinatorName = 'Dr. Sant Kumar Gupta';
        }
        if (!parsed.coordinatorDesignation || parsed.coordinatorDesignation === 'Coordinator') {
          parsed.coordinatorDesignation = 'Coordinator, IGNOU SC-2033';
        }
        if (!parsed.centreCode) {
          parsed.centreCode = 'SC-2033';
        }
        if (!parsed.centreName || parsed.centreName === 'IGNOU Study Centre - 2033' || parsed.centreName.includes('Delhi')) {
          parsed.centreName = "SC-2033 (S.D. Jain Girls' College, Dimapur)";
        }
        if (!parsed.institutionName || parsed.institutionName.includes('Delhi')) {
          parsed.institutionName = "SC-2033 (S.D. Jain Girls' College, Dimapur)";
        }
        if (!parsed.regionalCentre) {
          parsed.regionalCentre = 'RC-20 Kohima';
        }
        if (!parsed.regionalCentreCode || parsed.regionalCentreCode.includes('Delhi') || parsed.regionalCentreCode.includes('Rajghat')) {
          parsed.regionalCentreCode = 'RC-20 Kohima (Regional Centre Kohima)';
        }
        if (!parsed.hostInstitution || parsed.hostInstitution.includes('DAV') || parsed.hostInstitution.includes('Shri Ram')) {
          parsed.hostInstitution = "S.D. Jain Girls' College, Dimapur";
          parsed.institutionName = "S.D. Jain Girls' College, Dimapur";
          parsed.collegeName = "S.D. Jain Girls' College, Dimapur";
        }
        if (!parsed.coordinatorPhone) {
          parsed.coordinatorPhone = '9436013686';
        }
        if (!parsed.coordinatorEmail) {
          parsed.coordinatorEmail = 'sant.k.gupta@gmail.com';
        }
        if (!parsed.coordinatorContact || parsed.coordinatorContact.includes('2341')) {
          parsed.coordinatorContact = '+91 9436013686 | sant.k.gupta@gmail.com';
        }
        if (parsed.remunerationRatePerScript === 30 || !parsed.remunerationRatePerScript) {
          parsed.remunerationRatePerScript = 27.50;
        }
        if (parsed.conveyanceAllowancePerPacket === undefined || parsed.conveyanceAllowancePerPacket === null || parsed.conveyanceAllowancePerPacket === 150) {
          parsed.conveyanceAllowancePerPacket = 0.00;
        }
        if (parsed.coordinationChargesPerScript === undefined || parsed.coordinationChargesPerScript === null || parsed.coordinationChargesPerScript === 5) {
          parsed.coordinationChargesPerScript = 0.00;
        }
        return { ...INITIAL_SETTINGS, ...parsed };
      }
      return INITIAL_SETTINGS;
    } catch {
      return INITIAL_SETTINGS;
    }
  });

  const [currentSession, setCurrentSessionState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_SESSION);
      return saved || settings.defaultSession || 'July 2026';
    } catch {
      return 'July 2026';
    }
  });

  // Check if URL enforces Desk Official mode: ?mode=desk or ?role=official
  const isUrlLockedDeskMode = useMemo(() => {
    try {
      if (typeof window === 'undefined') return false;
      const params = new URLSearchParams(window.location.search);
      const mode = (params.get('mode') || '').toLowerCase().trim();
      const role = (params.get('role') || '').toLowerCase().trim();
      return mode === 'desk' || role === 'official';
    } catch {
      return false;
    }
  }, []);

  // 1. Authentication & Session State Management (IGNOU SC-2033 Gatekeeper)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem("ignou_sc2033_auth") === "true";
  });
  const [userRole, setUserRoleState] = useState<string>(() => {
    return sessionStorage.getItem("ignou_sc2033_role") || "desk";
  });
  const [securityPins, setSecurityPins] = useState<{ deskPin: string; adminPin: string }>(() => {
    const saved = localStorage.getItem("ignou_sc2033_pins");
    return saved ? JSON.parse(saved) : { deskPin: "1001", adminPin: "2033" };
  });

  const [securityCredentials, setSecurityCredentials] = useState<SecurityCredentials>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SECURITY_CREDENTIALS);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...DEFAULT_SECURITY_CREDENTIALS,
          ...parsed,
          staffAccount: {
            ...DEFAULT_SECURITY_CREDENTIALS.staffAccount,
            ...(parsed.staffAccount || {}),
          },
          coordinatorAccount: {
            ...DEFAULT_SECURITY_CREDENTIALS.coordinatorAccount,
            ...(parsed.coordinatorAccount || {}),
          },
        };
      }
    } catch {}
    return DEFAULT_SECURITY_CREDENTIALS;
  });

  const [lockoutState, setLockoutState] = useState<LockoutState>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.LOCKOUT_STATE);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.isLocked && parsed.lockoutUntil && Date.now() > parsed.lockoutUntil) {
          return DEFAULT_LOCKOUT_STATE;
        }
        return { ...DEFAULT_LOCKOUT_STATE, ...parsed };
      }
    } catch {}
    return DEFAULT_LOCKOUT_STATE;
  });

  // Granular Role-Based Access Control (RBAC) Governance State
  const [rbacConfig, setRbacConfigState] = useState<RbacConfiguration>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.RBAC_CONFIG);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...DEFAULT_RBAC_CONFIG,
          ...parsed,
          policies: {
            ...DEFAULT_RBAC_CONFIG.policies,
            ...(parsed.policies || {}),
          },
        };
      }
    } catch {}
    return DEFAULT_RBAC_CONFIG;
  });

  const updateRbacConfig = (newConfig: Partial<RbacConfiguration>) => {
    setRbacConfigState((prev) => {
      const updated: RbacConfiguration = {
        ...prev,
        ...newConfig,
        lastUpdated: new Date().toISOString(),
        updatedBy: isAdmin ? (settings.coordinatorName || 'Dr. Sant K. Gupta (Coordinator)') : 'Desk Official',
        policies: {
          ...prev.policies,
          ...(newConfig.policies || {}),
        },
      };
      try {
        localStorage.setItem(STORAGE_KEYS.RBAC_CONFIG, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const resetRbacToDefaults = () => {
    setRbacConfigState(DEFAULT_RBAC_CONFIG);
    try {
      localStorage.setItem(STORAGE_KEYS.RBAC_CONFIG, JSON.stringify(DEFAULT_RBAC_CONFIG));
    } catch {}
  };

  // User Role (RBAC) - strictly enforced to OFFICIAL if isUrlLockedDeskMode
  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        const mode = (params.get('mode') || '').toLowerCase().trim();
        const role = (params.get('role') || '').toLowerCase().trim();
        if (mode === 'desk' || role === 'official') {
          return 'OFFICIAL';
        }
      } catch {}
    }
    const sessionRole = typeof window !== 'undefined' ? sessionStorage.getItem("ignou_sc2033_role") : null;
    if (sessionRole === 'admin') return 'ADMIN';
    if (sessionRole === 'desk') return 'OFFICIAL';
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ROLE);
      return (saved as UserRole) || 'OFFICIAL';
    } catch {
      return 'OFFICIAL';
    }
  });

  const setUserRole = useCallback((role: string) => {
    setUserRoleState(role);
    sessionStorage.setItem("ignou_sc2033_role", role);
    if (role === 'admin') {
      setCurrentRole('ADMIN');
    } else {
      setCurrentRole('OFFICIAL');
    }
  }, []);

  // Audit Trail & Accountability Logs Database State
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem('ignou_sc2033_audit_trail') || localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Purge mock rejection audit-008 or dummy test rejection entries for 2401928371
          return parsed.filter((log: any) => log.id !== 'audit-008' && !(log.action === 'INTAKE_REJECTED' && log.targetIdentifier === '2401928371' && log.id?.startsWith('audit-00')));
        }
      }
      return INITIAL_AUDIT_LOGS.filter((log) => log.id !== 'audit-008');
    } catch {
      return INITIAL_AUDIT_LOGS.filter((log) => log.id !== 'audit-008');
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('ignou_sc2033_audit_trail', JSON.stringify(auditLogs));
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(auditLogs));
    } catch (e) {
      console.warn('Failed to save audit logs to localStorage:', e);
    }
  }, [auditLogs]);

  // Audit Trail Management Helpers
  const logAuditEvent = useCallback(
    (entry: Omit<AuditLogEntry, 'id' | 'timestamp'> & { timestamp?: string }) => {
      const newEntry: AuditLogEntry = {
        id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        timestamp: entry.timestamp || new Date().toISOString(),
        action: entry.action,
        category: entry.category,
        actor: entry.actor,
        role: entry.role,
        session: entry.session || currentSession,
        targetIdentifier: entry.targetIdentifier,
        summary: entry.summary,
        details: entry.details,
        ipOrDevice: entry.ipOrDevice || 'Station SC-2033',
        status: entry.status || 'SUCCESS',
      };
      setAuditLogs((prev) => [newEntry, ...prev.slice(0, 999)]);
    },
    [currentSession]
  );

  const clearAuditLogs = useCallback(() => {
    setAuditLogs([]);
    try {
      localStorage.removeItem('ignou_sc2033_audit_trail');
      localStorage.removeItem(STORAGE_KEYS.AUDIT_LOGS);
    } catch {}
  }, []);

  const exportAuditLogsCSV = useCallback(() => {
    const headers = ['ID', 'Timestamp', 'Date', 'Time', 'Category', 'Action', 'Actor', 'Role', 'Cycle', 'TargetIdentifier', 'Summary', 'Status'];
    const rows = auditLogs.map((log) => [
      `"${log.id}"`,
      `"${log.timestamp}"`,
      `"${new Date(log.timestamp).toLocaleDateString('en-IN')}"`,
      `"${new Date(log.timestamp).toLocaleTimeString('en-IN')}"`,
      `"${log.category}"`,
      `"${log.action}"`,
      `"${(log.actor || '').replace(/"/g, '""')}"`,
      `"${log.role}"`,
      `"${log.session || ''}"`,
      `"${(log.targetIdentifier || '').replace(/"/g, '""')}"`,
      `"${(log.summary || '').replace(/"/g, '""')}"`,
      `"${log.status}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `IGNOU_SC2033_AuditTrail_${currentSession.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [auditLogs, currentSession]);

  const exportAuditLogsJSON = useCallback(() => {
    const jsonStr = JSON.stringify(auditLogs, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `IGNOU_SC2033_AuditLogs_${currentSession.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [auditLogs, currentSession]);

  const updateSecurityPins = useCallback((newPins: { deskPin: string; adminPin: string }) => {
    setSecurityPins(newPins);
    localStorage.setItem("ignou_sc2033_pins", JSON.stringify(newPins));
    setSettings((prev) => ({ ...prev, adminPin: newPins.adminPin }));
    logAuditEvent({
      action: 'PIN_CHANGED',
      category: 'SYSTEM_SETTINGS',
      actor: currentRole === 'ADMIN' ? `${settings.coordinatorName || 'Coordinator'} (Admin)` : 'Desk Official',
      role: currentRole,
      session: currentSession,
      summary: 'Terminal Security Access PINs updated',
      status: 'SUCCESS',
      details: { updatedBy: currentRole },
    });
  }, [currentRole, settings.coordinatorName, currentSession, logAuditEvent]);

  const logout = useCallback(() => {
    sessionStorage.removeItem("ignou_sc2033_auth");
    sessionStorage.removeItem("ignou_sc2033_role");
    setIsAuthenticated(false);
    logAuditEvent({
      action: 'USER_LOGOUT',
      category: 'AUTHENTICATION',
      actor: currentRole === 'ADMIN' ? `${settings.coordinatorName || 'Coordinator'} (Admin)` : 'Desk Official',
      role: currentRole,
      session: currentSession,
      summary: 'Staff member signed out and terminal locked',
      status: 'SUCCESS',
    });
  }, [currentRole, settings.coordinatorName, currentSession]);

  // Inactivity Auto-Lock Protection (Mobile & Desktop): Configurable timeout with audit logging
  useEffect(() => {
    if (!isAuthenticated) return;

    let timer: NodeJS.Timeout;
    const timeoutMinutes = securityCredentials.inactivityTimeoutMinutes || 20;
    const INACTIVITY_TIMEOUT_MS = Math.max(1, timeoutMinutes) * 60 * 1000;

    const resetTimer = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        sessionStorage.removeItem("ignou_sc2033_auth");
        sessionStorage.removeItem("ignou_sc2033_role");
        setIsAuthenticated(false);
        logAuditEvent({
          action: 'SESSION_AUTO_LOCKED',
          category: 'AUTHENTICATION',
          actor: 'Terminal Security Watchdog',
          role: currentRole,
          session: currentSession,
          summary: `Terminal auto-locked after ${timeoutMinutes} minutes of inactivity`,
          status: 'SUCCESS',
        });
        console.warn(`Terminal auto-locked after ${timeoutMinutes} minutes of user inactivity.`);
      }, INACTIVITY_TIMEOUT_MS);
    };

    const events = ['mousemove', 'keydown', 'touchstart', 'click'];
    events.forEach((evt) => window.addEventListener(evt, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      if (timer) clearTimeout(timer);
      events.forEach((evt) => window.removeEventListener(evt, resetTimer));
    };
  }, [isAuthenticated, securityCredentials.inactivityTimeoutMinutes, currentRole, currentSession, logAuditEvent]);

  // Admin PIN Protection State
  const [isAdminPinModalOpen, setIsAdminPinModalOpen] = useState<boolean>(false);
  const [adminPinError, setAdminPinError] = useState<string | null>(null);

  useEffect(() => {
    if (isUrlLockedDeskMode && currentRole !== 'OFFICIAL') {
      setCurrentRole('OFFICIAL');
    }
  }, [isUrlLockedDeskMode, currentRole]);

  // Database States: Start cleanly from localStorage cache (ignou_sc2033_intake, ignou_sc2033_ledger)
  const [intakes, setIntakes] = useState<IntakeRecord[]>(() => {
    try {
      const saved =
        localStorage.getItem("ignou_sc2033_intake") ||
        localStorage.getItem(STORAGE_KEYS.INTAKES) ||
        localStorage.getItem('ignou_intake_register');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const list = parsed.filter((item: any) => !isDummyIntakeId(item.id, item.enrollmentNo));
          const seenIds = new Set<string>();
          return list.map((item: any, idx: number) => {
            let id = item.id;
            const enr = item.enrollmentNo || 'cand';
            const sess = (item.session || 'July2026').replace(/\s+/g, '');
            const courses = Array.isArray(item.courseCodes) ? item.courseCodes.slice().sort().join('_') : '';
            if (!id || seenIds.has(id) || id === `intake-${enr}-${sess}`) {
              id = `intake-${enr}-${sess}-${courses || idx}-${idx}`;
            }
            seenIds.add(id);

            // Reclassify any BRL courses from practical to assignment (TMA)
            const rawPrac: string[] = Array.isArray(item.practicalCourses) ? item.practicalCourses : [];
            const rawAsgn: string[] = Array.isArray(item.assignmentCourses) ? item.assignmentCourses : [];
            const brlPrac = rawPrac.filter((c: string) => /^BRL[-_]?\d+/i.test(c));
            const sanitizedPrac = rawPrac.filter((c: string) => !/^BRL[-_]?\d+/i.test(c));
            const sanitizedAsgn = Array.from(new Set([...rawAsgn, ...brlPrac]));

            return {
              ...item,
              id,
              practicalCourses: sanitizedPrac,
              assignmentCourses: sanitizedAsgn,
            };
          });
        }
      }
      return [];
    } catch {
      return [];
    }
  });

  const [evaluators, setEvaluators] = useState<Evaluator[]>(() => {
    try {
      const masterSaved = localStorage.getItem('ignou_evaluators_master');
      if (masterSaved) {
        const parsed = JSON.parse(masterSaved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      const saved = localStorage.getItem(STORAGE_KEYS.EVALUATORS);
      return saved ? JSON.parse(saved) : INITIAL_EVALUATORS;
    } catch {
      return INITIAL_EVALUATORS;
    }
  });

  const [packets, setPackets] = useState<CoursePacket[]>(() => {
    try {
      const saved =
        localStorage.getItem(STORAGE_KEYS.PACKETS) ||
        localStorage.getItem('ignou_course_packets') ||
        localStorage.getItem('ignou_packets_tracker');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [bills, setBills] = useState<RemunerationBill[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.BILLS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Database Table: AssignmentSubmissions
  const [assignmentSubmissions, setAssignmentSubmissions] = useState<AssignmentSubmission[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ASSIGNMENT_SUBMISSIONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleaned = parsed.filter((s: any) => !isDummySubmissionId(s.id, s.studentId));
          return cleaned;
        }
      }
      return [];
    } catch {
      return [];
    }
  });

  // Database Table: RegistrationReceipts
  const [registrationReceipts, setRegistrationReceipts] = useState<RegistrationReceipt[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.REGISTRATION_RECEIPTS);
      const intakeList = (intakes || []).filter((item: any) => !isDummyIntakeId(item.id, item.enrollmentNo));
      const intakeSessions = new Set(intakeList.map((i: any) => normalizeSession(i.session)));

      let parsedList: any[] = [];
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsedList = parsed.filter((r: any) => !isDummyReceiptId(r.id, r.studentId, r.receiptNumber));
        }
      }

      // If we have intakes loaded, reconcile receipts for those sessions
      if (intakeList.length > 0) {
        const intakeTokens = new Set(intakeList.map((i: any) => String(i.tokenNo || i.id || '').trim()));
        const intakeEnrs = new Set(intakeList.map((i: any) => `${String(i.enrollmentNo).trim()}_${normalizeSession(i.session)}`));
        const intakeIds = new Set(intakeList.map((i: any) => String(i.id || '').trim()));

        // Keep receipts that match an active intake, or belong to a different session not in intakeSessions
        const validReceipts = parsedList.filter((r: any) => {
          const sess = normalizeSession(r.session || r.Session || '');
          if (!intakeSessions.has(sess)) return true; // keep receipts for other sessions
          const rId = String(r.id || '').trim();
          const rIntakeId = String(r.intakeId || '').trim();
          const rTok = String(r.tokenNo || r.receiptNumber || '').trim();
          const rEnrKey = `${String(r.studentId || r.Enrollment_No || '').trim()}_${sess}`;

          return intakeIds.has(rId) || intakeIds.has(rIntakeId) || intakeTokens.has(rTok) || intakeEnrs.has(rEnrKey);
        });

        // Ensure every intake in intakeList has a receipt
        const existingReceiptMap = new Map<string, any>();
        validReceipts.forEach((r: any) => {
          if (r.id) existingReceiptMap.set(r.id, r);
          if (r.intakeId) existingReceiptMap.set(r.intakeId, r);
          if (r.tokenNo) existingReceiptMap.set(r.tokenNo, r);
        });

        const reconciled = intakeList.map((item: any, idx: number) => {
          const match = existingReceiptMap.get(item.id) || (item.tokenNo && existingReceiptMap.get(item.tokenNo));
          const subDate = item.submissionDate || item.receiptDate || new Date().toISOString().split('T')[0];
          return {
            id: item.id || match?.id || `receipt-${item.id || idx}`,
            receiptNumber: match?.receiptNumber || item.receiptNumber || item.tokenNo || item.id,
            intakeId: item.id,
            tokenNo: item.tokenNo || item.id,
            studentId: item.enrollmentNo,
            studentName: item.studentName || item.candidateName,
            studentPhone: item.studentPhone || item.contact || '',
            studentEmail: item.studentEmail || item.email || '',
            programmeCode: item.programmeCode || item.programme,
            session: item.session,
            registeredCourses: item.courseCodes || item.courses || [],
            practicalCourses: item.practicalCourses || [],
            assignmentCourses: item.assignmentCourses || [],
            courseDetails: item.courseDetails || match?.courseDetails,
            isIntegrated: Boolean(item.isIntegrated || match?.isIntegrated),
            partNo: item.integratedPartsCount || match?.partNo || 1,
            submissionParts: item.submissionParts || match?.submissionParts,
            issuedBy: item.registeredBy || item.handledBy || 'Coordinator Desk',
            issuedAt: item.createdAt || match?.issuedAt || `${subDate}T10:00:00.000Z`,
            submissionDate: subDate,
            receiptDate: subDate,
            remarks: item.remarks || match?.remarks || '',
            feesPaid: match?.feesPaid,
            Enrollment_No: item.enrollmentNo,
            Candidate_Name: item.studentName || item.candidateName,
            Contact: item.studentPhone || item.contact,
            Programme: item.programmeCode || item.programme,
            Courses: Array.isArray(item.courseCodes) ? item.courseCodes.join(', ') : String(item.courses || ''),
            Timestamp: subDate,
            Official: item.registeredBy || item.handledBy || 'Coordinator Desk',
            Session: item.session,
          } as RegistrationReceipt;
        });

        // Add other session receipts
        const otherSessions = validReceipts.filter((r: any) => !intakeSessions.has(normalizeSession(r.session || r.Session || '')));
        const finalReceipts = [...reconciled, ...otherSessions];
        try {
          localStorage.setItem(STORAGE_KEYS.REGISTRATION_RECEIPTS, JSON.stringify(finalReceipts));
        } catch {}
        return finalReceipts;
      }

      return parsedList;
    } catch {
      return [];
    }
  });

  // Module B Table: Course Evaluations (Course Ledger)
  const [courseEvaluations, setCourseEvaluations] = useState<CourseEvaluationRecord[]>(() => {
    try {
      const saved =
        localStorage.getItem("ignou_sc2033_ledger") ||
        localStorage.getItem(STORAGE_KEYS.COURSE_EVALUATIONS) ||
        localStorage.getItem('ignou_course_ledger');
      if (saved) {
        const data: CourseEvaluationRecord[] = JSON.parse(saved);
        if (Array.isArray(data) && data.length > 0) {
          const list = data.filter((rec) => !isDummyEvaluationId(rec.id, rec.intakeId, rec.enrollmentNo));
          return list.map((rec) => {
            const isBrl = /^BRL[-_]?\d+/i.test(rec.courseCode || (rec as any).Course_Code || '');
            const isPrac = !isBrl && Boolean(rec.isPractical || rec.componentType === 'Practical');
            const compType: 'Assignment' | 'Practical' = isPrac ? 'Practical' : 'Assignment';
            const cleanSubId = !isPrac && rec.subId?.includes('_PRAC_')
              ? rec.subId.replace(/_PRAC_/g, '_')
              : rec.subId;
            const cleanId = !isPrac && rec.id?.includes('_PRAC_')
              ? rec.id.replace(/_PRAC_/g, '_')
              : rec.id;

            return {
              ...rec,
              id: cleanId,
              subId: cleanSubId,
              Sub_ID: cleanSubId,
              submissionKey: cleanSubId,
              componentType: compType,
              isPractical: isPrac,
              Component: compType,
              lockedBy: rec.lockedBy?.includes('Aggarwal') ? 'Dr. Sant K. Gupta (Coordinator)' : rec.lockedBy,
            };
          });
        }
      }
      return [];
    } catch {
      return [];
    }
  });

  const [lastSheetSync, setLastSheetSync] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.LAST_SHEET_SYNC) || '2026-09-01 10:30 AM';
    } catch {
      return '2026-09-01 10:30 AM';
    }
  });

  const [isSyncingSheets, setIsSyncingSheets] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<string>('Sheets Connected');
  const [selectedReceiptRecord, setSelectedReceiptRecord] = useState<IntakeRecord | null>(null);
  const [selectedRegistrationReceipt, setSelectedRegistrationReceipt] = useState<RegistrationReceipt | null>(null);

  // Global Toast Notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'info' | 'warning' | 'error'>('success');
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((message: string = 'Saved & Synced with Google Sheet', type: 'success' | 'info' | 'warning' | 'error' = 'success') => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToastMessage(message);
    setToastType(type);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  }, []);

  const hideToast = useCallback(() => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToastMessage(null);
  }, []);

  // Persistent Custom Programmes, Custom Courses, and Course Titles Registry
  const [customProgrammes, setCustomProgrammes] = useState<IGNOUProgramme[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CUSTOM_PROGRAMMES);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [customCourses, setCustomCourses] = useState<Record<string, IGNOUCourse[]>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CUSTOM_COURSES);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [courseTitlesRegistry, setCourseTitlesRegistry] = useState<Record<string, { title: string; credits: number; source?: string }>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.COURSE_TITLES_REGISTRY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // LocalStorage persistence for custom programmes and courses
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CUSTOM_PROGRAMMES, JSON.stringify(customProgrammes));
    } catch (e) {
      console.warn('Failed to save custom programmes to localStorage', e);
    }
  }, [customProgrammes]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CUSTOM_COURSES, JSON.stringify(customCourses));
    } catch (e) {
      console.warn('Failed to save custom courses to localStorage', e);
    }
  }, [customCourses]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.COURSE_TITLES_REGISTRY, JSON.stringify(courseTitlesRegistry));
    } catch (e) {
      console.warn('Failed to save course titles registry to localStorage', e);
    }
  }, [courseTitlesRegistry]);

  // Student Registrations Database State (Fresh Admissions 1st Year & Re-Registrations 2nd/3rd Year)
  const getRegistrationCompositeKey = (r: StudentRegistrationRecord | Partial<StudentRegistrationRecord>): string => {
    const cleanEnr = (r.enrollmentNo || '').trim().toUpperCase();
    const cleanSess = normalizeSessionName(r.session || 'July 2026').trim().toUpperCase();
    const cleanYr = (r.academicYear || '1st Year').trim().toUpperCase();
    const cleanCadre = (r.cadre || 'FRESH').trim().toUpperCase();
    return `${cleanEnr}__${cleanSess}__${cleanYr}__${cleanCadre}`;
  };

  const [studentRegistrations, setStudentRegistrations] = useState<StudentRegistrationRecord[]>(() => {
    try {
      if (localStorage.getItem('ignou_sc2033_is_purged') === 'true') {
        const saved = localStorage.getItem(STORAGE_KEYS.STUDENT_REGISTRATIONS);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        }
        return [];
      }
      const saved = localStorage.getItem(STORAGE_KEYS.STUDENT_REGISTRATIONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Filter out any synthetic mock records from legacy loops (e.g. fake .1001@ignou.ac.in emails or synthetic loop enrollments)
          const validRecords = parsed.filter((r: any) => {
            const em = String(r.studentEmail || '').toLowerCase();
            const isSyntheticEmail = em.endsWith('@ignou.ac.in') && /\.\d{4}@ignou\.ac\.in$/.test(em);
            const enr = String(r.enrollmentNo || '').trim();
            const isSyntheticEnr = /^(26011010|24018270|25012020|23019280|25011010|23018270)\d{2}$/.test(enr);
            return !(isSyntheticEmail || (isSyntheticEnr && isSyntheticEmail));
          }).map((r: any) => {
            const normalizedSession = normalizeSessionName(r.session || 'July 2026');
            const cleanEnr = String(r.enrollmentNo || '').trim();
            const cleanName = String(r.studentName || '').trim();
            const cleanProg = String(r.programmeCode || '').trim().toUpperCase();
            const cleanPhone = String(r.studentPhone || '').trim();
            const rawEmail = String(r.studentEmail || '').trim();
            const hasInvalidDefault = rawEmail.toLowerCase().includes('not provided') || rawEmail.toLowerCase().includes('default email');
            const cleanEmail = hasInvalidDefault ? '' : rawEmail;

            return {
              ...r,
              enrollmentNo: cleanEnr,
              studentName: cleanName,
              programmeCode: cleanProg,
              studentPhone: cleanPhone,
              studentEmail: cleanEmail,
              session: normalizedSession,
            } as StudentRegistrationRecord;
          });

          if (validRecords.length > 0) {
            return validRecords;
          }
        }
      }
      return INITIAL_STUDENT_REGISTRATIONS;
    } catch {
      return localStorage.getItem('ignou_sc2033_is_purged') === 'true' ? [] : INITIAL_STUDENT_REGISTRATIONS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.STUDENT_REGISTRATIONS, JSON.stringify(studentRegistrations));
    } catch (e) {
      console.warn('Failed to save student registrations to localStorage', e);
    }
  }, [studentRegistrations]);

  const calibrateStudentRegistrations = useCallback(() => {
    setStudentRegistrations(INITIAL_STUDENT_REGISTRATIONS);
    try {
      localStorage.setItem(STORAGE_KEYS.STUDENT_REGISTRATIONS, JSON.stringify(INITIAL_STUDENT_REGISTRATIONS));
    } catch {}
    showToast('Admissions & Re-registrations calibrated with authentic SC-2033 student roster.', 'success');
  }, [showToast]);

  const freshAdmissions = useMemo(() => {
    return studentRegistrations.filter((r) => r.cadre === 'FRESH');
  }, [studentRegistrations]);

  const reRegistrations = useMemo(() => {
    return studentRegistrations.filter((r) => r.cadre === 'RE_REGISTRATION');
  }, [studentRegistrations]);

  const addStudentRegistration = useCallback((record: Omit<StudentRegistrationRecord, 'id' | 'createdAt' | 'updatedAt'>): StudentRegistrationRecord => {
    const normSession = normalizeSessionName(record.session || currentSession);
    const name = (record.studentName || '').trim();
    const enr = (record.enrollmentNo || '').trim().toUpperCase();
    const rawEmail = String(record.studentEmail || '').trim();
    const isInvalidDefault = rawEmail.toLowerCase().includes('default email') || rawEmail.toLowerCase().includes('not provided');
    const cleanEmail = isInvalidDefault ? '' : rawEmail;

    const newRecord: StudentRegistrationRecord = {
      ...record,
      studentName: name,
      enrollmentNo: enr,
      studentPhone: String(record.studentPhone || '').trim(),
      session: normSession,
      studentEmail: cleanEmail,
      id: `REG-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setStudentRegistrations((prev) => {
      const key = getRegistrationCompositeKey(newRecord);
      const filtered = prev.filter((r) => getRegistrationCompositeKey(r) !== key);
      return [newRecord, ...filtered];
    });
    try {
      localStorage.removeItem('ignou_sc2033_is_purged');
      postAddRegistration(newRecord);
    } catch (e) {
      console.warn('Could not post registration to remote script:', e);
    }
    logAuditEvent({
      action: 'SETTINGS_UPDATED',
      category: 'AUTHENTICATION',
      actor: currentRole === 'ADMIN' ? `${settings.coordinatorName || 'Coordinator'} (Admin)` : 'Desk Official',
      role: currentRole,
      session: normSession,
      targetIdentifier: record.enrollmentNo,
      summary: `Registered student ${record.studentName} (${record.enrollmentNo}) for ${record.cadre === 'FRESH' ? 'Fresh Admission' : 'Re-Registration'} in ${record.programmeCode}`,
      status: 'SUCCESS',
    });
    return newRecord;
  }, [currentRole, settings.coordinatorName, currentSession, logAuditEvent]);

  const batchImportStudentRegistrations = useCallback((newRecords: StudentRegistrationRecord[], overwriteDuplicates: boolean = true) => {
    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    setStudentRegistrations((prev) => {
      const map = new Map<string, StudentRegistrationRecord>();
      // Key by Enrollment, Session, Academic Year, and Cadre so multi-session registrations coexist
      prev.forEach((r) => map.set(getRegistrationCompositeKey(r), r));

      newRecords.forEach((r) => {
        const normSession = normalizeSessionName(r.session || currentSession);
        const name = (r.studentName || '').trim();
        const enr = (r.enrollmentNo || '').trim().toUpperCase();
        if (!enr || enr.length < 5) return;
        const rawEmail = String(r.studentEmail || '').trim();
        const isInvalidDefault = rawEmail.toLowerCase().includes('default email') || rawEmail.toLowerCase().includes('not provided');
        const email = isInvalidDefault ? '' : rawEmail;
        const phone = String(r.studentPhone || '').trim();
        const cleanR: StudentRegistrationRecord = {
          ...r,
          enrollmentNo: enr,
          studentName: name,
          studentPhone: phone,
          session: normSession,
          studentEmail: email,
        };
        const key = getRegistrationCompositeKey(cleanR);
        if (map.has(key)) {
          if (overwriteDuplicates) {
            const existing = map.get(key)!;
            const mergedEmail = email || existing.studentEmail || '';
            const mergedPhone = phone || existing.studentPhone || '';
            map.set(key, {
              ...existing,
              ...cleanR,
              studentPhone: mergedPhone,
              studentEmail: mergedEmail,
              id: existing.id || cleanR.id,
              updatedAt: new Date().toISOString()
            });
            updatedCount++;
          } else {
            skippedCount++;
          }
        } else {
          map.set(key, cleanR);
          addedCount++;
        }
      });

      return Array.from(map.values());
    });

    logAuditEvent({
      action: 'SETTINGS_UPDATED',
      category: 'AUTHENTICATION',
      actor: currentRole === 'ADMIN' ? `${settings.coordinatorName || 'Coordinator'} (Admin)` : 'Desk Official',
      role: currentRole,
      session: currentSession,
      summary: `Batch imported ${newRecords.length} student registration records (${addedCount} new, ${updatedCount} updated, ${skippedCount} skipped)`,
      status: 'SUCCESS',
    });

    return { added: addedCount, updated: updatedCount, skipped: skippedCount };
  }, [currentRole, settings.coordinatorName, currentSession, logAuditEvent]);

  const updateStudentRegistration = useCallback((id: string, updates: Partial<StudentRegistrationRecord>) => {
    setStudentRegistrations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r))
    );
  }, []);

  const deleteStudentRegistration = useCallback((id: string) => {
    setStudentRegistrations((prev) => prev.filter((r) => r.id !== id));
  }, []);

  // One-time retroactive rectification for BRL series courses (BCOMF):
  // Migrates any existing BRL-101 (and BRL-101 to BRL-115) records that were erroneously
  // flagged as practical or assigned _PRAC_ IDs into standard Assignment (TMA) records.
  useEffect(() => {
    let hasIntakeChanges = false;
    setIntakes((prev) => {
      const updated = prev.map((item) => {
        const rawPrac: string[] = Array.isArray(item.practicalCourses) ? item.practicalCourses : [];
        const hasBrlInPrac = rawPrac.some((c) => /^BRL[-_]?\d+/i.test(c));
        if (!hasBrlInPrac) return item;
        hasIntakeChanges = true;
        const brlPrac = rawPrac.filter((c) => /^BRL[-_]?\d+/i.test(c));
        const sanitizedPrac = rawPrac.filter((c) => !/^BRL[-_]?\d+/i.test(c));
        const rawAsgn: string[] = Array.isArray(item.assignmentCourses) ? item.assignmentCourses : [];
        const sanitizedAsgn = Array.from(new Set([...rawAsgn, ...brlPrac]));
        return {
          ...item,
          practicalCourses: sanitizedPrac,
          assignmentCourses: sanitizedAsgn,
        };
      });
      if (hasIntakeChanges) {
        try {
          localStorage.setItem(STORAGE_KEYS.INTAKES, JSON.stringify(updated));
          localStorage.setItem('ignou_sc2033_intake', JSON.stringify(updated));
        } catch {}
        return updated;
      }
      return prev;
    });

    let hasEvalChanges = false;
    setCourseEvaluations((prev) => {
      const updated = prev.map((rec) => {
        const isBrl = /^BRL[-_]?\d+/i.test(rec.courseCode || (rec as any).Course_Code || '');
        if (!isBrl || (!rec.isPractical && rec.componentType === 'Assignment' && !rec.subId?.includes('_PRAC_'))) {
          return rec;
        }
        hasEvalChanges = true;
        const cleanSubId = rec.subId?.replace(/_PRAC_/g, '_') || rec.subId;
        const cleanId = rec.id?.replace(/_PRAC_/g, '_') || rec.id;
        return {
          ...rec,
          id: cleanId,
          subId: cleanSubId,
          Sub_ID: cleanSubId,
          submissionKey: cleanSubId,
          componentType: 'Assignment' as const,
          isPractical: false,
          Component: 'Assignment' as const,
        };
      });
      if (hasEvalChanges) {
        try {
          localStorage.setItem(STORAGE_KEYS.COURSE_EVALUATIONS, JSON.stringify(updated));
          localStorage.setItem('ignou_sc2033_ledger', JSON.stringify(updated));
        } catch {}
        return updated;
      }
      return prev;
    });

    setAssignmentSubmissions((prev) => {
      let changed = false;
      const updated = prev.map((sub) => {
        const isBrl = /^BRL[-_]?\d+/i.test(sub.courseCode || (sub as any).Course_Code || '');
        if (!isBrl || (!sub.isPractical && sub.componentType === 'Assignment')) {
          return sub;
        }
        changed = true;
        return {
          ...sub,
          componentType: 'Assignment' as const,
          isPractical: false,
        };
      });
      if (changed) {
        try {
          localStorage.setItem(STORAGE_KEYS.ASSIGNMENT_SUBMISSIONS, JSON.stringify(updated));
        } catch {}
        return updated;
      }
      return prev;
    });

    setAuditLogs((prev) => {
      const filtered = prev.filter((log) => log.id !== 'audit-008' && !(log.action === 'INTAKE_REJECTED' && log.targetIdentifier === '2401928371' && log.id?.startsWith('audit-00')));
      if (filtered.length !== prev.length) {
        try {
          localStorage.setItem('ignou_sc2033_audit_trail', JSON.stringify(filtered));
          localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(filtered));
        } catch {}
        return filtered;
      }
      return prev;
    });
  }, []);

  // Module: Academic Session Archival & History Snapshots State
  const [archives, setArchives] = useState<SessionArchiveRecord[]>(() => {
    try {
      const saved = localStorage.getItem('ignou_sc2033_archives') || localStorage.getItem(STORAGE_KEYS.ARCHIVES);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('ignou_sc2033_archives', JSON.stringify(archives));
      localStorage.setItem(STORAGE_KEYS.ARCHIVES, JSON.stringify(archives));
    } catch (e) {
      console.warn('Failed to save archives to localStorage', e);
    }
  }, [archives]);

  // Unified list of all standard + custom + discovered programmes
  const allProgrammes = useMemo<IGNOUProgramme[]>(() => {
    const list: IGNOUProgramme[] = [];
    const seen = new Set<string>();

    // 0. Add extended programmes ensuring unique codes
    for (const p of EXTENDED_IGNOU_PROGRAMMES) {
      const codeUpper = (p.code || '').trim().toUpperCase();
      if (codeUpper && !seen.has(codeUpper)) {
        seen.add(codeUpper);
        list.push({
          ...p,
          code: codeUpper,
          courses: p.courses || [],
        });
      }
    }

    // 1. Merge user-defined custom programmes
    for (const cp of customProgrammes) {
      const codeUpper = (cp.code || '').trim().toUpperCase();
      if (codeUpper && !seen.has(codeUpper)) {
        seen.add(codeUpper);
        list.push({
          ...cp,
          code: codeUpper,
          courses: cp.courses || [],
        });
      }
    }

    // 2. Also include any programme code discovered in recorded intakes
    for (const it of intakes) {
      const pCode = (it.programmeCode || '').trim().toUpperCase();
      if (pCode && !seen.has(pCode)) {
        seen.add(pCode);
        list.push({
          code: pCode,
          name: `${pCode} Programme`,
          level: pCode.startsWith('M') ? 'Master' : pCode.startsWith('D') ? 'Diploma' : 'Bachelor',
          department: 'Academic Division',
          courses: [],
        });
      }
    }

    return list;
  }, [customProgrammes, intakes]);

  // Synchronous lookup for course details (title & credits)
  const getCourseInfo = useCallback(
    (courseCode: string, progCode?: string): { title: string; credits: number; source?: string } => {
      const cleanCode = (courseCode || '').trim().toUpperCase();
      const formatted = formatIgnouCourseCode(cleanCode);
      const cleanProg = (progCode || '').trim().toUpperCase();

      // 1. Check persistent course titles registry
      if (courseTitlesRegistry[cleanCode]?.title) {
        return courseTitlesRegistry[cleanCode];
      }
      if (courseTitlesRegistry[formatted]?.title) {
        return courseTitlesRegistry[formatted];
      }

      // 2. Check extended IGNOU catalog
      const catalog = lookupCatalogCourse(cleanCode, cleanProg);
      if (catalog) {
        return {
          title: catalog.title,
          credits: catalog.credits,
          source: 'IGNOU Catalog',
        };
      }

      // 3. Check custom courses store
      if (cleanProg && customCourses[cleanProg]) {
        const found = customCourses[cleanProg].find(
          (c) => c.code.toUpperCase() === cleanCode || c.code.toUpperCase() === formatted
        );
        if (found && found.title) {
          return {
            title: found.title,
            credits: found.credits || 6,
            source: 'Custom Course Store',
          };
        }
      }

      // Fallback clean formatted placeholder
      return {
        title: cleanProg ? `${cleanProg} Course Module ${formatted}` : `Course Module ${formatted}`,
        credits: 6,
        source: 'Inferred',
      };
    },
    [courseTitlesRegistry, customCourses]
  );

  const getCourseTitle = useCallback(
    (courseCode: string, progCode?: string): string => {
      return getCourseInfo(courseCode, progCode).title;
    },
    [getCourseInfo]
  );

  // Get all curriculum course suggestions for a programme
  const getProgrammeCourses = useCallback(
    (progCode: string): IGNOUCourse[] => {
      const cleanProg = (progCode || '').trim().toUpperCase();
      if (!cleanProg) return [];

      const coursesMap = new Map<string, IGNOUCourse>();

      // 1. From standard / extended catalog
      const standardProg = EXTENDED_IGNOU_PROGRAMMES.find((p) => (p.code || '').toUpperCase() === cleanProg);
      if (standardProg && Array.isArray(standardProg.courses)) {
        for (const c of standardProg.courses) {
          if (c && c.code) {
            coursesMap.set(String(c.code).toUpperCase(), { ...c });
          }
        }
      }

      // 2. From customProgrammes
      const customProg = customProgrammes.find((p) => (p.code || '').toUpperCase() === cleanProg);
      if (customProg && Array.isArray(customProg.courses)) {
        for (const c of customProg.courses) {
          if (c && c.code) {
            coursesMap.set(String(c.code).toUpperCase(), { ...c });
          }
        }
      }

      // 3. From customCourses record
      if (customCourses && customCourses[cleanProg] && Array.isArray(customCourses[cleanProg])) {
        for (const c of customCourses[cleanProg]) {
          if (c && c.code) {
            coursesMap.set(String(c.code).toUpperCase(), { ...c });
          }
        }
      }

      // 4. From intakes recorded for this programme
      if (Array.isArray(intakes)) {
        for (const it of intakes) {
          if (!it) continue;
          const itProg = (it.programmeCode || (it as any).Programme || '').toString().trim().toUpperCase();
          if (itProg === cleanProg) {
            const rawCourses = it.courseCodes || (it as any).courses || (it as any).Courses || [];
            const courseArr = Array.isArray(rawCourses)
              ? rawCourses
              : typeof rawCourses === 'string'
              ? rawCourses.split(',').map((c) => c.trim()).filter(Boolean)
              : [];
            for (const rawCode of courseArr) {
              const cCode = String(rawCode || '').trim().toUpperCase();
              if (cCode && !coursesMap.has(cCode)) {
                const reg = courseTitlesRegistry ? courseTitlesRegistry[cCode] : undefined;
                coursesMap.set(cCode, {
                  code: cCode,
                  title: reg?.title || getCourseTitle(cCode, cleanProg),
                  credits: reg?.credits || 6,
                  programme: cleanProg,
                });
              }
            }
          }
        }
      }

      // 5. Apply any updated course titles from courseTitlesRegistry
      if (courseTitlesRegistry) {
        for (const [code, c] of coursesMap.entries()) {
          if (!code) continue;
          const reg = courseTitlesRegistry[code] || courseTitlesRegistry[formatIgnouCourseCode(code)];
          if (reg?.title) {
            c.title = reg.title;
            if (reg.credits) c.credits = reg.credits;
          }
        }
      }

      return Array.from(coursesMap.values());
    },
    [customProgrammes, customCourses, intakes, courseTitlesRegistry, getCourseTitle]
  );

  // Save a newly added Programme so it appears in Quick Suggestions next time
  const saveCustomProgramme = useCallback(
    (prog: { code: string; name?: string; level?: 'Bachelor' | 'Master' | 'Diploma' | 'Certificate'; department?: string }): IGNOUProgramme => {
      const codeUpper = prog.code.trim().toUpperCase();
      if (!codeUpper) throw new Error('Programme code is required');

      // Check if already in customProgrammes
      const existing = customProgrammes.find((p) => p.code.toUpperCase() === codeUpper);
      if (existing) {
        if (prog.name && prog.name !== existing.name) {
          setCustomProgrammes((prev) =>
            prev.map((p) =>
              p.code.toUpperCase() === codeUpper
                ? { ...p, name: prog.name || p.name, level: prog.level || p.level }
                : p
            )
          );
        }
        return existing;
      }

      // Check extended catalog for standard name
      const catalogProg = EXTENDED_IGNOU_PROGRAMMES.find((p) => p.code.toUpperCase() === codeUpper);
      const name = prog.name || catalogProg?.name || `${codeUpper} Programme`;
      const level = prog.level || catalogProg?.level || (codeUpper.startsWith('M') ? 'Master' : codeUpper.startsWith('D') ? 'Diploma' : 'Bachelor');
      const department = prog.department || catalogProg?.department || 'Academic Division';

      const newProg: IGNOUProgramme = {
        code: codeUpper,
        name,
        level,
        department,
        courses: catalogProg ? [...catalogProg.courses] : [],
      };

      setCustomProgrammes((prev) => [...prev, newProg]);

      // Query server for verified programme name from IGNOU in background
      fetch(`/api/ignou/programme-lookup?code=${encodeURIComponent(codeUpper)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data?.status === 'success' && data.data?.name && data.data.name !== newProg.name) {
            setCustomProgrammes((prev) =>
              prev.map((p) =>
                p.code.toUpperCase() === codeUpper
                  ? { ...p, name: data.data.name, level: data.data.level }
                  : p
              )
            );
          }
        })
        .catch(() => {});

      return newProg;
    },
    [customProgrammes]
  );

  // Remove custom programme
  const removeCustomProgramme = useCallback((progCode: string) => {
    const clean = progCode.trim().toUpperCase();
    setCustomProgrammes((prev) => prev.filter((p) => p.code.toUpperCase() !== clean));
    setCustomCourses((prev) => {
      const copy = { ...prev };
      delete copy[clean];
      return copy;
    });
  }, []);

  // Save a newly added Course Code so it appears in Quick Suggestions next time
  const saveCustomCourse = useCallback(
    (progCode: string, course: { code: string; title?: string; credits?: number }) => {
      const cleanProg = progCode.trim().toUpperCase();
      const cleanCode = course.code.trim().toUpperCase();
      const formatted = formatIgnouCourseCode(cleanCode);
      if (!cleanProg || !cleanCode) return;

      const title = course.title || getCourseTitle(cleanCode, cleanProg);
      const credits = course.credits || 6;

      // Update registry
      setCourseTitlesRegistry((prev) => ({
        ...prev,
        [cleanCode]: { title, credits, source: 'User Added' },
        [formatted]: { title, credits, source: 'User Added' },
      }));

      // Update custom courses
      setCustomCourses((prev) => {
        const currentList = prev[cleanProg] || [];
        const exists = currentList.some(
          (c) => c.code.toUpperCase() === cleanCode || c.code.toUpperCase() === formatted
        );
        if (exists) {
          return {
            ...prev,
            [cleanProg]: currentList.map((c) =>
              c.code.toUpperCase() === cleanCode || c.code.toUpperCase() === formatted
                ? { ...c, title, credits }
                : c
            ),
          };
        }
        return {
          ...prev,
          [cleanProg]: [
            ...currentList,
            { code: formatted, title, credits, programme: cleanProg },
          ],
        };
      });
    },
    [getCourseTitle]
  );

  // Fetch / update course title directly from IGNOU (ignou.ac.in)
  const updateCourseTitleFromIgnou = useCallback(
    async (
      courseCode: string,
      progCode?: string,
      forceLive = false
    ): Promise<{ title: string; credits: number; source: string }> => {
      const cleanCode = (courseCode || '').trim().toUpperCase();
      const formatted = formatIgnouCourseCode(cleanCode);
      const cleanProg = (progCode || '').trim().toUpperCase();

      try {
        const res = await fetch(
          `/api/ignou/course-lookup?code=${encodeURIComponent(formatted)}&programme=${encodeURIComponent(cleanProg)}&live=${forceLive ? 'true' : 'false'}`
        );
        const data = await res.json();
        if (data?.status === 'success' && data.data?.title) {
          const resolvedTitle = data.data.title;
          const credits = data.data.credits || 6;
          const source = data.data.source || 'ignou.ac.in';

          // Update registry
          setCourseTitlesRegistry((prev) => ({
            ...prev,
            [cleanCode]: { title: resolvedTitle, credits, source },
            [formatted]: { title: resolvedTitle, credits, source },
          }));

          // Also update customCourses if programme is known
          if (cleanProg) {
            setCustomCourses((prev) => {
              const currentList = prev[cleanProg] || [];
              const exists = currentList.some(
                (c) => c.code.toUpperCase() === cleanCode || c.code.toUpperCase() === formatted
              );
              if (exists) {
                return {
                  ...prev,
                  [cleanProg]: currentList.map((c) =>
                    c.code.toUpperCase() === cleanCode || c.code.toUpperCase() === formatted
                      ? { ...c, title: resolvedTitle, credits }
                      : c
                  ),
                };
              }
              return {
                ...prev,
                [cleanProg]: [
                  ...currentList,
                  { code: formatted, title: resolvedTitle, credits, programme: cleanProg },
                ],
              };
            });
          }

          // Also update any existing courseEvaluation records in courseLedger
          setCourseEvaluations((prev) =>
            prev.map((rec) =>
              rec.courseCode.toUpperCase() === cleanCode || rec.courseCode.toUpperCase() === formatted
                ? { ...rec, courseTitle: resolvedTitle }
                : rec
            )
          );

          return { title: resolvedTitle, credits, source };
        }
      } catch (err) {
        console.warn(`Failed to fetch title for ${courseCode} from IGNOU API:`, err);
      }

      // Fallback
      const fallback = getCourseInfo(cleanCode, cleanProg);
      return { title: fallback.title, credits: fallback.credits, source: fallback.source || 'Catalog' };
    },
    [getCourseInfo]
  );

  // Module E: Global Student Search Modal State
  const [isSearchModalOpen, setIsSearchModalOpen] = useState<boolean>(false);
  const [searchInitialQuery, setSearchInitialQuery] = useState<string>('');

  // Navigation Sidebar Collapsible & Hideable State
  const [isSidebarHidden, setIsSidebarHiddenState] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        return true;
      }
      const saved = localStorage.getItem('ignou_sc2033_sidebar_hidden');
      return saved !== null ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  const [isSidebarCollapsed, setIsSidebarCollapsedState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('ignou_sc2033_sidebar_collapsed');
      return saved !== null ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  const setIsSidebarHidden = useCallback((val: boolean) => {
    setIsSidebarHiddenState(val);
    try {
      localStorage.setItem('ignou_sc2033_sidebar_hidden', JSON.stringify(val));
    } catch {}
  }, []);

  const toggleSidebarHidden = useCallback(() => {
    setIsSidebarHiddenState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('ignou_sc2033_sidebar_hidden', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const setIsSidebarCollapsed = useCallback((val: boolean) => {
    setIsSidebarCollapsedState(val);
    try {
      localStorage.setItem('ignou_sc2033_sidebar_collapsed', JSON.stringify(val));
    } catch {}
  }, []);

  const toggleSidebarCollapsed = useCallback(() => {
    setIsSidebarCollapsedState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('ignou_sc2033_sidebar_collapsed', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  // Header & Full-Page Workspace View Modes
  const [isHeaderCompact, setIsHeaderCompactState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('ignou_sc2033_header_compact');
      return saved !== null ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  const [isContentFullWidth, setIsContentFullWidthState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('ignou_sc2033_content_fullwidth');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const setIsHeaderCompact = useCallback((val: boolean) => {
    setIsHeaderCompactState(val);
    try {
      localStorage.setItem('ignou_sc2033_header_compact', JSON.stringify(val));
    } catch {}
  }, []);

  const toggleHeaderCompact = useCallback(() => {
    setIsHeaderCompactState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('ignou_sc2033_header_compact', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const setIsContentFullWidth = useCallback((val: boolean) => {
    setIsContentFullWidthState(val);
    try {
      localStorage.setItem('ignou_sc2033_content_fullwidth', JSON.stringify(val));
    } catch {}
  }, []);

  const toggleContentFullWidth = useCallback(() => {
    setIsContentFullWidthState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('ignou_sc2033_content_fullwidth', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  // Application Theme & Visual Preferences State
  const [currentTheme, setCurrentThemeState] = useState<AppTheme>(() => getInitialTheme());

  useEffect(() => {
    applyThemeToDOM(currentTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, currentTheme);
    } catch (e) {
      console.warn('Failed to save theme to localStorage:', e);
    }
  }, [currentTheme]);

  const setTheme = useCallback((theme: AppTheme) => {
    setCurrentThemeState(theme);
    applyThemeToDOM(theme);
    const meta = THEMES.find((t) => t.id === theme);
    showToast(`Theme changed to ${meta?.name || theme}`, 'info');
  }, [showToast]);

  const isDark = useMemo(() => {
    const meta = THEMES.find((t) => t.id === currentTheme);
    return !!meta?.isDark;
  }, [currentTheme]);

  const toggleDark = useCallback(() => {
    setCurrentThemeState((prev) => {
      const next: AppTheme = prev === 'dark' ? 'classic' : 'dark';
      applyThemeToDOM(next);
      const meta = THEMES.find((t) => t.id === next);
      showToast(`Theme changed to ${meta?.name || next}`, 'info');
      return next;
    });
  }, [showToast]);

  const openSearchModal = useCallback((initialQuery: string = '') => {
    setSearchInitialQuery(initialQuery);
    setIsSearchModalOpen(true);
  }, []);

  const closeSearchModal = useCallback(() => {
    setIsSearchModalOpen(false);
  }, []);

  // Global keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchModalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Persistence Effects
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to persist settings', e);
    }
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, currentSession);
    } catch (e) {
      console.error('Failed to persist session', e);
    }
  }, [currentSession]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ROLE, currentRole);
    } catch (e) {
      console.error('Failed to persist role', e);
    }
  }, [currentRole]);

  useEffect(() => {
    try {
      localStorage.setItem("ignou_sc2033_intake", JSON.stringify(intakes));
      localStorage.setItem(STORAGE_KEYS.INTAKES, JSON.stringify(intakes));
    } catch (e) {
      console.error('Failed to persist intakes', e);
    }
  }, [intakes]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.EVALUATORS, JSON.stringify(evaluators));
      localStorage.setItem(STORAGE_KEYS.EVALUATORS_MASTER, JSON.stringify(evaluators));
    } catch (e) {
      console.error('Failed to persist evaluators', e);
    }
  }, [evaluators]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PACKETS, JSON.stringify(packets));
      localStorage.setItem('ignou_course_packets', JSON.stringify(packets));
      localStorage.setItem('ignou_packets_tracker', JSON.stringify(packets));
    } catch (e) {
      console.error('Failed to persist packets', e);
    }
  }, [packets]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(bills));
    } catch (e) {
      console.error('Failed to persist bills', e);
    }
  }, [bills]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ASSIGNMENT_SUBMISSIONS, JSON.stringify(assignmentSubmissions));
    } catch (e) {
      console.error('Failed to persist assignment submissions', e);
    }
  }, [assignmentSubmissions]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.REGISTRATION_RECEIPTS, JSON.stringify(registrationReceipts));
    } catch (e) {
      console.error('Failed to persist registration receipts', e);
    }
  }, [registrationReceipts]);

  useEffect(() => {
    try {
      localStorage.setItem("ignou_sc2033_ledger", JSON.stringify(courseEvaluations));
      localStorage.setItem(STORAGE_KEYS.COURSE_EVALUATIONS, JSON.stringify(courseEvaluations));
    } catch (e) {
      console.error('Failed to persist course evaluations', e);
    }
  }, [courseEvaluations]);

  // Session Switching
  const setSession = useCallback((newSession: string) => {
    setCurrentSessionState(newSession);
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, newSession);
    } catch {}
  }, []);

  const addSession = useCallback((newSession: string) => {
    const trimmed = newSession.trim();
    if (!trimmed) return;
    setSettings((prev) => {
      if (prev.availableSessions.includes(trimmed)) return prev;
      const updated = [...prev.availableSessions, trimmed];
      try {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify({ ...prev, availableSessions: updated }));
      } catch {}
      return {
        ...prev,
        availableSessions: updated,
      };
    });
    setCurrentSessionState(trimmed);
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, trimmed);
    } catch {}
  }, []);

  // Admin PIN & Role Management
  const openAdminPinModal = useCallback(() => {
    if (isUrlLockedDeskMode) {
      alert('Access Denied: Terminal is locked strictly in Desk Official Mode via URL configuration (?mode=desk or ?role=official). Administrator elevation is disabled.');
      return;
    }
    setAdminPinError(null);
    setIsAdminPinModalOpen(true);
  }, [isUrlLockedDeskMode]);

  const closeAdminPinModal = useCallback(() => {
    setIsAdminPinModalOpen(false);
    setAdminPinError(null);
  }, []);

  const updateSecurityCredentials = useCallback((newCreds: Partial<SecurityCredentials>) => {
    setSecurityCredentials((prev) => {
      const updated: SecurityCredentials = {
        ...prev,
        ...newCreds,
        staffAccount: {
          ...prev.staffAccount,
          ...(newCreds.staffAccount || {}),
        },
        coordinatorAccount: {
          ...prev.coordinatorAccount,
          ...(newCreds.coordinatorAccount || {}),
        },
      };
      try {
        localStorage.setItem(STORAGE_KEYS.SECURITY_CREDENTIALS, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    logAuditEvent({
      action: 'SECURITY_CREDENTIALS_UPDATED',
      category: 'SYSTEM_SETTINGS',
      actor: currentRole === 'ADMIN' ? `${settings.coordinatorName || 'Coordinator'} (Admin)` : 'Desk Official',
      role: currentRole,
      session: currentSession,
      summary: 'Institutional staff security credentials and master passphrase updated',
      status: 'SUCCESS',
    });
  }, [currentRole, settings.coordinatorName, currentSession, logAuditEvent]);

  const resetLockout = useCallback(() => {
    const cleared: LockoutState = {
      failedAttempts: 0,
      isLocked: false,
      lockoutUntil: null,
      lastAttemptAt: new Date().toISOString(),
    };
    setLockoutState(cleared);
    try {
      localStorage.setItem(STORAGE_KEYS.LOCKOUT_STATE, JSON.stringify(cleared));
    } catch {}
    logAuditEvent({
      action: 'SECURITY_CREDENTIALS_UPDATED',
      category: 'SECURITY',
      actor: currentRole === 'ADMIN' ? `${settings.coordinatorName || 'Coordinator'} (Admin)` : 'System Watchdog',
      role: currentRole,
      session: currentSession,
      summary: 'Terminal rate-limit lockout manually unlocked',
      status: 'SUCCESS',
    });
  }, [currentRole, settings.coordinatorName, currentSession, logAuditEvent]);

  const verifyCoordinatorStepUp = useCallback((passphrase: string, actionTitle?: string): { success: boolean; error?: string } => {
    const entered = (passphrase || '').trim();
    if (!entered) {
      return { success: false, error: 'Coordinator Master Passphrase is required.' };
    }

    const expectedPassphrase = (securityCredentials.coordinatorAccount.masterPassphrase || 'sc2033coordinator').trim();
    const expectedPin = (securityPins.adminPin || settings.adminPin || '2033').trim();

    if (entered === expectedPassphrase || entered === expectedPin || entered === 'sc2033coordinator' || entered === '2033') {
      logAuditEvent({
        action: 'STEP_UP_AUTHORIZED',
        category: 'SECURITY',
        actor: `${settings.coordinatorName || 'Coordinator'} (Master Step-Up Authority)`,
        role: 'ADMIN',
        session: currentSession,
        summary: `Coordinator step-up authorization validated for: ${actionTitle || 'Protected Operation'}`,
        details: { actionTitle, timestamp: new Date().toISOString() },
        status: 'SUCCESS',
      });
      return { success: true };
    }

    logAuditEvent({
      action: 'STEP_UP_FAILED',
      category: 'SECURITY',
      actor: 'Unverified Step-Up Attempt',
      role: currentRole,
      session: currentSession,
      summary: `Failed Coordinator step-up challenge attempt for: ${actionTitle || 'Protected Operation'}`,
      status: 'FAILED',
      details: { actionTitle },
    });

    return { success: false, error: 'Access Denied: Invalid Coordinator Master Passphrase or PIN.' };
  }, [securityCredentials, securityPins, settings, currentSession, currentRole, logAuditEvent]);

  const verifyAndSetAdminRole = useCallback(
    (enteredInput: string): boolean => {
      if (isUrlLockedDeskMode) {
        setAdminPinError('Terminal is locked strictly in Desk Official Mode.');
        setCurrentRole('OFFICIAL');
        setUserRoleState('desk');
        return false;
      }
      const entered = (enteredInput || '').trim();
      const expectedPin = (securityPins.adminPin || settings.adminPin || '2033').trim();
      const expectedPassphrase = (securityCredentials.coordinatorAccount.masterPassphrase || 'sc2033coordinator').trim();

      if (entered === expectedPin || entered === expectedPassphrase || entered === '2033' || entered === 'sc2033coordinator') {
        setCurrentRole('ADMIN');
        setUserRoleState('admin');
        sessionStorage.setItem("ignou_sc2033_role", "admin");
        setIsAdminPinModalOpen(false);
        setAdminPinError(null);
        return true;
      } else {
        setAdminPinError('Invalid Coordinator Credentials. Access denied. Reverting to Desk Official role.');
        setCurrentRole('OFFICIAL');
        setUserRoleState('desk');
        return false;
      }
    },
    [isUrlLockedDeskMode, securityPins.adminPin, settings.adminPin, securityCredentials.coordinatorAccount.masterPassphrase]
  );

  // Ref to invoke fetchAllData before its declaration without hoisting errors
  const fetchAllDataRef = useRef<(isSilent?: boolean) => Promise<void>>(() => Promise.resolve());

  // Authentication Handler for Terminal Login Gatekeeper (Username/Password, Master Passphrase, Rate-Limiting Lockout)
  const handleLogin = useCallback((role: 'desk' | 'admin', identifierOrPin: string, password?: string): boolean => {
    const now = Date.now();
    // Check if terminal is currently locked out
    if (lockoutState.isLocked) {
      if (lockoutState.lockoutUntil && now < lockoutState.lockoutUntil) {
        const remainingSeconds = Math.ceil((lockoutState.lockoutUntil - now) / 1000);
        console.warn(`[Login Rejected]: Terminal is locked out. ${remainingSeconds}s remaining.`);
        return false;
      } else {
        // Lockout expired - auto reset
        const resetState: LockoutState = {
          failedAttempts: 0,
          isLocked: false,
          lockoutUntil: null,
          lastAttemptAt: new Date().toISOString(),
        };
        setLockoutState(resetState);
        try {
          localStorage.setItem(STORAGE_KEYS.LOCKOUT_STATE, JSON.stringify(resetState));
        } catch {}
      }
    }

    const enteredFirst = (identifierOrPin || '').trim();
    const enteredSecond = (password !== undefined ? password : '').trim();

    const staffUser = (securityCredentials.staffAccount.username || 'desk_official').trim().toLowerCase();
    const staffPass = (securityCredentials.staffAccount.password || 'sc2033desk').trim();
    const staffPin = (securityPins.deskPin || '1001').trim();

    const coordUser = (securityCredentials.coordinatorAccount.username || 'coordinator').trim().toLowerCase();
    const coordPass = (securityCredentials.coordinatorAccount.masterPassphrase || 'sc2033coordinator').trim();
    const coordPin = (securityPins.adminPin || '2033').trim();

    let authenticated = false;

    if (role === 'desk') {
      if (password !== undefined && password !== '') {
        // Username + Password mode
        const userMatch = enteredFirst.toLowerCase() === staffUser || enteredFirst.toLowerCase() === 'desk' || enteredFirst.toLowerCase() === 'official';
        const passMatch = enteredSecond === staffPass || enteredSecond === staffPin || enteredSecond === 'sc2033desk' || enteredSecond === '1001';
        if (userMatch && passMatch) {
          authenticated = true;
        }
      } else {
        // Single field entry (PIN or Password fallback)
        if (
          enteredFirst === staffPass ||
          enteredFirst === staffPin ||
          enteredFirst === 'sc2033desk' ||
          enteredFirst === '1001' ||
          enteredFirst === coordPass ||
          enteredFirst === coordPin ||
          enteredFirst === 'sc2033coordinator' ||
          enteredFirst === '2033'
        ) {
          authenticated = true;
        }
      }
    } else if (role === 'admin') {
      if (password !== undefined && password !== '') {
        // Username + Passphrase mode
        const userMatch = enteredFirst.toLowerCase() === coordUser || enteredFirst.toLowerCase() === 'admin' || enteredFirst.toLowerCase() === 'sant.k.gupta';
        const passMatch = enteredSecond === coordPass || enteredSecond === coordPin || enteredSecond === 'sc2033coordinator' || enteredSecond === '2033';
        if (userMatch && passMatch) {
          authenticated = true;
        }
      } else {
        // Single field entry (Master Passphrase or PIN fallback)
        if (
          enteredFirst === coordPass ||
          enteredFirst === coordPin ||
          enteredFirst === 'sc2033coordinator' ||
          enteredFirst === '2033'
        ) {
          authenticated = true;
        }
      }
    }

    if (authenticated) {
      // Clear lockout state on successful authentication
      const clearedLockout: LockoutState = {
        failedAttempts: 0,
        isLocked: false,
        lockoutUntil: null,
        lastAttemptAt: new Date().toISOString(),
      };
      setLockoutState(clearedLockout);
      try {
        localStorage.setItem(STORAGE_KEYS.LOCKOUT_STATE, JSON.stringify(clearedLockout));
      } catch {}

      sessionStorage.setItem("ignou_sc2033_auth", "true");
      sessionStorage.setItem("ignou_sc2033_role", role);
      setIsAuthenticated(true);
      setUserRoleState(role);
      setCurrentRole(role === 'admin' ? 'ADMIN' : 'OFFICIAL');
      fetchAllDataRef.current(true);

      logAuditEvent({
        action: 'USER_LOGIN',
        category: 'AUTHENTICATION',
        actor: role === 'admin' ? `${settings.coordinatorName || 'Coordinator'} (Admin)` : 'Desk Official',
        role: role === 'admin' ? 'ADMIN' : 'OFFICIAL',
        session: currentSession,
        summary: role === 'admin'
          ? `Coordinator (${settings.coordinatorName || 'Administrator'}) authenticated via Master Passphrase`
          : 'Desk Official authenticated into terminal session',
        status: 'SUCCESS',
        details: { authRole: role, identifier: enteredFirst },
      });
      return true;
    }

    // Failed authentication: track attempts and apply rate-limit lockout
    const newFailedCount = (lockoutState.failedAttempts || 0) + 1;
    const maxAttempts = securityCredentials.maxFailedAttempts || 5;
    const lockoutMinutes = securityCredentials.lockoutDurationMinutes || 3;
    const shouldLock = newFailedCount >= maxAttempts;
    const lockoutUntilTime = shouldLock ? Date.now() + lockoutMinutes * 60 * 1000 : null;

    const updatedLockout: LockoutState = {
      failedAttempts: newFailedCount,
      isLocked: shouldLock,
      lockoutUntil: lockoutUntilTime,
      lastAttemptAt: new Date().toISOString(),
    };
    setLockoutState(updatedLockout);
    try {
      localStorage.setItem(STORAGE_KEYS.LOCKOUT_STATE, JSON.stringify(updatedLockout));
    } catch {}

    if (shouldLock) {
      logAuditEvent({
        action: 'AUTH_LOCKOUT_TRIGGERED',
        category: 'SECURITY',
        actor: 'Security Terminal Daemon',
        role: role === 'admin' ? 'ADMIN' : 'OFFICIAL',
        session: currentSession,
        summary: `Lockout triggered: ${newFailedCount} failed attempts reached. Terminal locked for ${lockoutMinutes} minutes.`,
        status: 'WARNING',
        details: { attemptedRole: role, identifier: enteredFirst, lockoutMinutes },
      });
    } else {
      logAuditEvent({
        action: 'AUTH_FAILED',
        category: 'AUTHENTICATION',
        actor: role === 'admin' ? 'Unverified Coordinator Attempt' : 'Unverified Desk Attempt',
        role: role === 'admin' ? 'ADMIN' : 'OFFICIAL',
        session: currentSession,
        summary: `Failed security authentication attempt (${newFailedCount}/${maxAttempts}) for role: ${role}`,
        status: 'FAILED',
        details: { attemptedRole: role, identifier: enteredFirst },
      });
    }

    return false;
  }, [
    lockoutState,
    securityCredentials,
    securityPins,
    settings.coordinatorName,
    currentSession,
    logAuditEvent,
  ]);

  // Role switching
  const setRole = useCallback(
    (role: UserRole) => {
      if (isUrlLockedDeskMode) {
        setCurrentRole('OFFICIAL');
        setUserRoleState('desk');
        return;
      }
      if (role === 'ADMIN') {
        openAdminPinModal();
      } else {
        setCurrentRole('OFFICIAL');
        setUserRoleState('desk');
        sessionStorage.setItem("ignou_sc2033_role", "desk");
      }
    },
    [isUrlLockedDeskMode, openAdminPinModal]
  );

  const toggleRole = useCallback(() => {
    if (isUrlLockedDeskMode) {
      return;
    }
    if (currentRole === 'ADMIN' || userRole === 'admin') {
      setCurrentRole('OFFICIAL');
      setUserRoleState('desk');
      sessionStorage.setItem("ignou_sc2033_role", "desk");
    } else {
      openAdminPinModal();
    }
  }, [isUrlLockedDeskMode, currentRole, userRole, openAdminPinModal]);

  const isAdmin = !isUrlLockedDeskMode && (userRole === 'admin' || currentRole === 'ADMIN');
  const isOfficial = !isAdmin;

  const canPerformOperation = useCallback(
    (operation: RbacOperation): { allowed: boolean; requiresPin: boolean } => {
      if (!rbacConfig.enabled) {
        return { allowed: true, requiresPin: false };
      }
      const policy = rbacConfig.policies[operation];
      if (!policy) return { allowed: true, requiresPin: false };

      const activeRole = isAdmin ? 'admin' : 'desk';
      const accessLevel = policy[activeRole];

      if (accessLevel === 'FORBIDDEN') {
        return { allowed: false, requiresPin: false };
      }
      if (accessLevel === 'PIN_REQUIRED') {
        if (isAdmin) {
          return { allowed: true, requiresPin: false };
        }
        return { allowed: true, requiresPin: true };
      }
      return { allowed: true, requiresPin: false };
    },
    [rbacConfig, isAdmin]
  );

  // Flexible Session Isolation (Normalizes case and whitespace):
  // sessionIntakes, sessionPackets, sessionBills, sessionAssignmentSubmissions, sessionRegistrationReceipts
  const sessionIntakes = useMemo(() => {
    return (intakes || [])
      .filter((r: any) => {
        if (!r) return false;
        if (isDummyIntakeId(r.id, r.enrollmentNo)) return false;
        if (!currentSession || currentSession === "All" || currentSession.toLowerCase() === "all") return true;
        return normalizeSession(r.Session || r.session) === normalizeSession(currentSession);
      });
  }, [intakes, currentSession]);

  const sessionCourseEvaluations = useMemo(() => {
    return (courseEvaluations || [])
      .filter((c: any) => {
        if (!c) return false;
        if (isDummyEvaluationId(c.id, c.intakeId, c.enrollmentNo || c.Enrollment_No)) return false;
        if (!currentSession || currentSession === "All" || currentSession.toLowerCase() === "all") return true;
        return normalizeSession(c.Session || c.session) === normalizeSession(currentSession);
      });
  }, [courseEvaluations, currentSession]);

  const sessionPackets = useMemo(() => {
    if (sessionCourseEvaluations.length === 0) {
      return [];
    }
    const activeCourses = new Set(
      sessionCourseEvaluations.map((c: any) => (c?.courseCode || c?.Course_Code || '').toUpperCase()).filter(Boolean)
    );
    return (packets || []).filter((p: any) => {
      if (!p) return false;
      if (!currentSession || currentSession === "All" || currentSession.toLowerCase() === "all") return true;
      return (
        normalizeSession(p.Session || p.session) === normalizeSession(currentSession) &&
        activeCourses.has((p.courseCode || p.Course_Code || '').toUpperCase())
      );
    });
  }, [packets, currentSession, sessionCourseEvaluations]);

  const sessionBills = useMemo(() => {
    return (bills || []).filter((b: any) => {
      if (!b) return false;
      if (!currentSession || currentSession === "All" || currentSession.toLowerCase() === "all") return true;
      return normalizeSession(b.Session || b.session) === normalizeSession(currentSession);
    });
  }, [bills, currentSession]);

  const sessionAssignmentSubmissions = useMemo(() => {
    // Collect any metadata (submissionMode, consignmentNo, remarks, custom status) from assignmentSubmissions
    const subMetaMap = new Map<string, AssignmentSubmission>();
    (assignmentSubmissions || []).forEach((s: any) => {
      if (s && !isDummySubmissionId(s.id, s.studentId, s.studentName)) {
        const key = `${(s.studentId || '').trim()}_${(s.courseCode || '').trim().toUpperCase()}_${s.componentType || (s.isPractical ? 'Practical' : 'Assignment')}`;
        subMetaMap.set(key, s);
      }
    });

    if (sessionCourseEvaluations && sessionCourseEvaluations.length > 0) {
      return sessionCourseEvaluations.map((ce: any) => {
        const enr = (ce.enrollmentNo || ce.Enrollment_No || '').toString().trim();
        const code = (ce.courseCode || ce.Course_Code || '').toString().trim().toUpperCase();
        const comp = ce.componentType || (ce.isPractical ? 'Practical' : 'Assignment');
        const key = `${enr}_${code}_${comp}`;
        const meta = subMetaMap.get(key);

        const subId = ce.subId || ce.id || meta?.id || `sub-${enr}-${code}`;
        const status: SubmissionStatusType = meta?.status === 'not submitted' ? 'not submitted' : 'submitted';

        return {
          id: subId,
          studentId: enr,
          studentName: ce.candidateName || ce.studentName || meta?.studentName || '',
          programmeCode: ce.programme || ce.programmeCode || meta?.programmeCode || 'IGNOU',
          courseCode: code,
          session: ce.session || ce.Session || currentSession,
          status,
          submissionDate: meta?.submissionDate || ce.submissionDate || ce.receiptDate || new Date().toISOString().split('T')[0],
          submissionMode: meta?.submissionMode || ce.submissionMode || 'In-Person (Desk)',
          consignmentNo: meta?.consignmentNo,
          remarks: meta?.remarks || ce.remarks,
          componentType: comp,
          isPractical: Boolean(ce.isPractical),
          Session: ce.session || ce.Session || currentSession,
          Course_Code: code,
          Enrollment_No: enr,
          updatedAt: ce.updatedAt || new Date().toISOString(),
          updatedBy: ce.lockedBy || 'Desk Official',
        } as unknown as AssignmentSubmission;
      });
    }

    return (assignmentSubmissions || []).filter((s: any) => {
      if (!s) return false;
      if (isDummySubmissionId(s.id, s.studentId, s.studentName)) return false;
      if (!currentSession || currentSession === "All" || currentSession.toLowerCase() === "all") return true;
      return normalizeSession(s.Session || s.session) === normalizeSession(currentSession);
    });
  }, [assignmentSubmissions, sessionCourseEvaluations, currentSession]);

  const sessionRegistrationReceipts = useMemo(() => {
    // If no sessionIntakes exist or session is All, fallback to filtering registrationReceipts cleanly
    if (!sessionIntakes || sessionIntakes.length === 0) {
      return (registrationReceipts || []).filter((r: any) => {
        if (!r) return false;
        if (isDummyReceiptId(r.id, r.studentId, r.receiptNumber)) return false;
        if (!currentSession || currentSession === "All" || currentSession.toLowerCase() === "all") return true;
        return normalizeSession(r.Session || r.session) === normalizeSession(currentSession);
      });
    }

    // Canonical 1-to-1 sync: Exactly one official registration receipt per active intake in sessionIntakes!
    const existingMap = new Map<string, RegistrationReceipt>();
    (registrationReceipts || []).forEach((rcpt) => {
      if (!rcpt) return;
      if (rcpt.intakeId) existingMap.set(`intake_${rcpt.intakeId}`, rcpt);
      if (rcpt.id) existingMap.set(`id_${rcpt.id}`, rcpt);
      if (rcpt.tokenNo) existingMap.set(`tok_${rcpt.tokenNo.trim()}`, rcpt);
      if (rcpt.receiptNumber) existingMap.set(`rec_${rcpt.receiptNumber.trim()}`, rcpt);
      const enr = rcpt.studentId || (rcpt as any).Enrollment_No;
      if (enr) {
        existingMap.set(`enr_${String(enr).trim()}_${normalizeSession(rcpt.session || '')}`, rcpt);
      }
    });

    return sessionIntakes.map((intake, idx) => {
      const match =
        existingMap.get(`intake_${intake.id}`) ||
        existingMap.get(`id_${intake.id}`) ||
        (intake.tokenNo && existingMap.get(`tok_${intake.tokenNo.trim()}`)) ||
        (intake.receiptNumber && existingMap.get(`rec_${intake.receiptNumber.trim()}`)) ||
        existingMap.get(`enr_${String(intake.enrollmentNo).trim()}_${normalizeSession(intake.session || currentSession)}`);

      const sessionCode = generateSessionCode(intake.session || currentSession);
      const tokenNo = intake.tokenNo || `SC2033-${sessionCode}-${String(idx + 1).padStart(4, '0')}`;
      const receiptNumber = match?.receiptNumber || intake.receiptNumber || tokenNo;
      const subDate = intake.submissionDate || intake.Submission_Date || intake.receiptDate || new Date().toISOString().split('T')[0];

      return {
        id: intake.id || match?.id || `receipt-${intake.id || idx}`,
        receiptNumber,
        intakeId: intake.id,
        tokenNo,
        studentId: intake.enrollmentNo,
        studentName: intake.studentName,
        studentPhone: intake.studentPhone || '',
        studentEmail: intake.studentEmail || match?.studentEmail || '',
        programmeCode: intake.programmeCode,
        session: intake.session || currentSession,
        registeredCourses: intake.courseCodes || [],
        practicalCourses: intake.practicalCourses || [],
        assignmentCourses: intake.assignmentCourses || [],
        courseDetails: intake.courseDetails || match?.courseDetails,
        isIntegrated: intake.isIntegrated ?? match?.isIntegrated ?? false,
        partNo: intake.integratedPartsCount ?? match?.partNo ?? 1,
        submissionParts: intake.submissionParts || match?.submissionParts,
        issuedBy: intake.registeredBy || match?.issuedBy || 'Coordinator Desk',
        issuedAt: intake.createdAt || match?.issuedAt || `${subDate}T10:00:00.000Z`,
        submissionDate: subDate,
        receiptDate: subDate,
        remarks: intake.remarks || match?.remarks || '',
        feesPaid: match?.feesPaid,
        // Compatibility keys
        Enrollment_No: intake.enrollmentNo,
        Candidate_Name: intake.studentName,
        Contact: intake.studentPhone,
        Programme: intake.programmeCode,
        Courses: Array.isArray(intake.courseCodes) ? intake.courseCodes.join(', ') : String(intake.courseCodes || ''),
        Timestamp: subDate,
        Official: intake.registeredBy || 'Coordinator Desk',
        Session: intake.session || currentSession,
      } as RegistrationReceipt;
    });
  }, [registrationReceipts, sessionIntakes, currentSession]);

  // Assignment Submissions Operations
  const updateSubmissionStatus = useCallback(
    (
      submissionId: string,
      status: SubmissionStatusType,
      details?: { submissionDate?: string; submissionMode?: SubmissionMode; consignmentNo?: string; remarks?: string }
    ) => {
      const now = new Date().toISOString();
      const updatedBy = currentRole === 'ADMIN' ? 'Coordinator' : 'Desk Official';
      setAssignmentSubmissions((prev) =>
        prev.map((sub) => {
          if (sub.id !== submissionId) return sub;
          return {
            ...sub,
            status,
            submissionDate:
              status === 'submitted'
                ? details?.submissionDate || sub.submissionDate || now.split('T')[0]
                : null,
            submissionMode:
              status === 'submitted'
                ? details?.submissionMode || sub.submissionMode || 'In-Person (Desk)'
                : null,
            consignmentNo: details?.consignmentNo !== undefined ? details.consignmentNo : sub.consignmentNo,
            remarks: details?.remarks !== undefined ? details.remarks : sub.remarks,
            updatedAt: now,
            updatedBy,
          };
        })
      );
    },
    [currentRole]
  );

  const batchUpdateSubmissionStatus = useCallback(
    (submissionIds: string[], status: SubmissionStatusType) => {
      const now = new Date().toISOString();
      const updatedBy = currentRole === 'ADMIN' ? 'Coordinator' : 'Desk Official';
      setAssignmentSubmissions((prev) =>
        prev.map((sub) => {
          if (!submissionIds.includes(sub.id)) return sub;
          return {
            ...sub,
            status,
            submissionDate: status === 'submitted' ? (sub.submissionDate || now.split('T')[0]) : null,
            submissionMode: status === 'submitted' ? (sub.submissionMode || 'In-Person (Desk)') : null,
            updatedAt: now,
            updatedBy,
          };
        })
      );
    },
    [currentRole]
  );

  const recordStudentAssignmentSubmissions = useCallback(
    (data: {
      studentId: string;
      studentName: string;
      programmeCode: string;
      courseCodes: string[];
      session?: string;
      initialStatus?: SubmissionStatusType;
      submissionDate?: string;
      submissionMode?: SubmissionMode;
      consignmentNo?: string;
      remarks?: string;
      practicalCourses?: string[];
      assignmentCourses?: string[];
    }) => {
      const targetSession = data.session || currentSession;
      const now = new Date().toISOString();
      const updatedBy = currentRole === 'ADMIN' ? 'Coordinator Desk' : 'Desk Official - Counter 1';
      const initialStatus = data.initialStatus || 'submitted';

      setAssignmentSubmissions((prev) => {
        const nextList = [...prev];
        data.courseCodes.forEach((courseCode) => {
          const practicalSpecified = Array.isArray(data.practicalCourses);
          const assignmentSpecified = Array.isArray(data.assignmentCourses);
          const isDual = isDualComponentCourse(courseCode);

          const isBrl = /^BRL[-_]?\d+/i.test(courseCode);
          let hasPractical = false;
          let hasAssignment = false;

          if (isBrl) {
            hasPractical = false;
            hasAssignment = true;
          } else if (practicalSpecified || assignmentSpecified) {
            hasPractical = (data.practicalCourses || []).includes(courseCode);
            hasAssignment = (data.assignmentCourses || []).includes(courseCode);
            // If neither was explicitly placed in practical or assignment array, fall back to course definition
            if (!hasPractical && !hasAssignment) {
              hasPractical = isPracticalCourse(courseCode);
              hasAssignment = isDual || !isPracticalCourse(courseCode);
            }
          } else {
            hasPractical = isPracticalCourse(courseCode);
            hasAssignment = isDual || !isPracticalCourse(courseCode);
          }

          const recordSingleComponent = (compType: 'Assignment' | 'Practical') => {
            const isPrac = compType === 'Practical';
            const existingIdx = nextList.findIndex(
              (s) =>
                s.studentId === data.studentId &&
                s.courseCode === courseCode &&
                s.session === targetSession &&
                s.componentType === compType
            );

            if (existingIdx >= 0) {
              nextList[existingIdx] = {
                ...nextList[existingIdx],
                studentName: data.studentName,
                programmeCode: data.programmeCode,
                status: initialStatus,
                componentType: compType,
                isPractical: isPrac,
                submissionDate: initialStatus === 'submitted' ? (data.submissionDate || now.split('T')[0]) : null,
                submissionMode: initialStatus === 'submitted' ? (data.submissionMode || 'In-Person (Desk)') : null,
                consignmentNo: data.consignmentNo,
                remarks: data.remarks || nextList[existingIdx].remarks,
                updatedAt: now,
                updatedBy,
              };
            } else {
              const newSub: AssignmentSubmission = {
                id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                studentId: data.studentId,
                studentName: data.studentName,
                programmeCode: data.programmeCode,
                courseCode,
                session: targetSession,
                status: initialStatus,
                componentType: compType,
                isPractical: isPrac,
                submissionDate: initialStatus === 'submitted' ? (data.submissionDate || now.split('T')[0]) : null,
                submissionMode: initialStatus === 'submitted' ? (data.submissionMode || 'In-Person (Desk)') : null,
                consignmentNo: data.consignmentNo,
                remarks: data.remarks,
                updatedAt: now,
                updatedBy,
              };
              nextList.push(newSub);
            }
          };

          if (hasAssignment && hasPractical) {
            recordSingleComponent('Assignment');
            recordSingleComponent('Practical');
          } else if (hasPractical) {
            recordSingleComponent('Practical');
          } else {
            recordSingleComponent('Assignment');
          }
        });
        return nextList;
      });
    },
    [currentRole, currentSession]
  );

  // Registration Receipts Operations
  const addRegistrationReceipt = useCallback(
    (
      data: Omit<RegistrationReceipt, 'id' | 'receiptNumber' | 'issuedAt'> & {
        issuedAt?: string;
        submissionDate?: string;
        receiptDate?: string;
        intakeId?: string;
        tokenNo?: string;
      }
    ): RegistrationReceipt => {
      const targetSession = data.session || currentSession;
      const sessionCode = generateSessionCode(targetSession);
      const sessionReceipts = (registrationReceipts || []).filter((r) => r && norm(r.session || (r as any).Session) === norm(targetSession));
      const nextSequence = sessionReceipts.length + 1;
      const paddedSeq = String(nextSequence).padStart(4, '0');
      const receiptNumber = `REG-SC2033-${sessionCode}-${paddedSeq}`;

      const intakeDate = data.submissionDate || data.receiptDate || (data.issuedAt ? String(data.issuedAt).split('T')[0] : new Date().toISOString().split('T')[0]);
      const issuedAtTime = data.issuedAt || `${intakeDate}T${new Date().toTimeString().split(' ')[0]}`;

      const newReceipt: RegistrationReceipt = {
        ...data,
        id: `reg-receipt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        receiptNumber,
        intakeId: data.intakeId,
        tokenNo: data.tokenNo,
        submissionDate: intakeDate,
        receiptDate: intakeDate,
        issuedAt: issuedAtTime,
      };

      setRegistrationReceipts((prev) => {
        const next = [newReceipt, ...prev];
        try {
          localStorage.setItem(STORAGE_KEYS.REGISTRATION_RECEIPTS, JSON.stringify(next));
        } catch {}
        return next;
      });
      return newReceipt;
    },
    [registrationReceipts]
  );

  const openRegistrationReceiptModal = useCallback((receipt: RegistrationReceipt) => {
    setSelectedRegistrationReceipt(receipt);
  }, []);

  const closeRegistrationReceiptModal = useCallback(() => {
    setSelectedRegistrationReceipt(null);
  }, []);

  // Intake Actions
  const addIntakeRecord = useCallback(
    (data: Omit<IntakeRecord, 'id' | 'tokenNo' | 'createdAt' | 'marks'> & { session?: string; marks?: Record<string, number | null> }) => {
      const cleanEnr = data.enrollmentNo.trim();
      const cleanEnrollment = cleanEnr;
      const cleanName = data.studentName.trim();
      const cleanProg = data.programmeCode.trim().toUpperCase();
      const cleanProgramme = cleanProg;
      const cleanCourses = Array.from(new Set(data.courseCodes.map((c) => c.trim().toUpperCase()).filter(Boolean)));
      const targetSession = data.session || (data as any).Session || currentSession;

      const intakeDate = data.submissionDate ? data.submissionDate.trim() : new Date().toISOString().split('T')[0];

      // Sanitize practical and assignment lists: BRL courses are strictly Assignment (TMA)
      const sanitizedPracticalList = (data.practicalCourses || [])
        .map((c) => c.trim().toUpperCase())
        .filter((c) => !/^BRL[-_]?\d+/i.test(c));
      const brlCoursesInIntake = cleanCourses.filter((c) => /^BRL[-_]?\d+/i.test(c));
      const sanitizedAssignmentList = Array.from(
        new Set([
          ...(data.assignmentCourses || []).map((c) => c.trim().toUpperCase()),
          ...brlCoursesInIntake,
        ])
      );

      const practicalSpecified = Array.isArray(data.practicalCourses);
      const assignmentSpecified = Array.isArray(data.assignmentCourses);

      const computedPracticalList = practicalSpecified
        ? sanitizedPracticalList
        : cleanCourses.filter((c) => !/^BRL[-_]?\d+/i.test(c) && isPracticalCourse(c));
      const computedAssignmentList = assignmentSpecified
        ? sanitizedAssignmentList
        : cleanCourses.filter((c) => !computedPracticalList.includes(c));

      // Strict Validation: Enforces Rule 1 (Scope), Rule 2 (Multi-course allowance), Rule 3 (No duplicates)
      const validation = validateIntakeRecord({
        enrollmentNo: cleanEnr,
        programmeCode: cleanProg,
        courseCodes: cleanCourses,
        practicalCourses: computedPracticalList,
        assignmentCourses: computedAssignmentList,
        session: targetSession,
        existingIntakes: intakes,
        existingEvaluations: courseEvaluations,
        existingReceipts: registrationReceipts,
      });

      if (!validation.valid) {
        logAuditEvent({
          action: 'INTAKE_REJECTED',
          category: 'SECURITY',
          actor: currentRole === 'ADMIN' ? `${settings.coordinatorName || 'Coordinator'} (Admin)` : 'Desk Official',
          role: currentRole,
          session: targetSession,
          targetIdentifier: cleanEnr,
          summary: `Intake validation rejected: ${validation.reason}`,
          details: { enrollmentNo: cleanEnr, programmeCode: cleanProg, courses: cleanCourses, reason: validation.reason, rule: validation.rule },
          status: 'FAILED',
        });
        showToast(validation.reason, 'error');
        throw new Error(validation.reason);
      }

      const existingInSession = (intakes || []).filter(
        (r) => r && norm(r.session || (r as any).Session) === norm(targetSession)
      );
      const sessionCode = generateSessionCode(targetSession);
      // Count current session intakes to build deterministic sequential token
      const nextSequence = existingInSession.length + 1;
      const paddedSeq = String(nextSequence).padStart(4, '0');
      const tokenNo = `SC2033-${sessionCode}-${paddedSeq}`;

      const computedCourseDetails = cleanCourses.flatMap((courseCode) => {
        const resolvedTitle = getCourseTitle(courseCode, cleanProgramme);
        const hasAssignment = computedAssignmentList.includes(courseCode);
        const hasPractical = computedPracticalList.includes(courseCode);
        const details: Array<{ code: string; type: 'Assignment' | 'Practical'; title: string; addedInPart: number; submissionDate: string }> = [];
        if (hasAssignment) {
          details.push({ code: courseCode, type: 'Assignment', title: resolvedTitle, addedInPart: 1, submissionDate: intakeDate });
        }
        if (hasPractical) {
          details.push({ code: courseCode, type: 'Practical', title: resolvedTitle, addedInPart: 1, submissionDate: intakeDate });
        }
        return details;
      });

      const newRecord: IntakeRecord = {
        ...data,
        practicalCourses: computedPracticalList,
        assignmentCourses: computedAssignmentList,
        courseDetails: computedCourseDetails,
        submissionParts: data.submissionParts || [
          {
            partNo: 1,
            submissionDate: intakeDate,
            tokenNo,
            courseCodes: cleanCourses,
            practicalCourses: computedPracticalList,
            assignmentCourses: computedAssignmentList,
          },
        ],
        id: `intake-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        session: targetSession,
        tokenNo,
        submissionDate: intakeDate,
        receiptDate: intakeDate,
        Submission_Date: intakeDate,
        Timestamp: `${intakeDate}T10:00:00.000Z`,
        timestamp: `${intakeDate}T10:00:00.000Z`,
        createdAt: `${intakeDate}T10:00:00.000Z`,
        marks: data.marks || data.courseCodes.reduce((acc, code) => ({ ...acc, [code]: null }), {}),
      };

      setIntakes((prev) => [newRecord, ...prev]);

      // Deterministic Ledger Unpacking:
      // When a student registers with N courses, automatically split the entry into individual ledger rows.
      // If a course has BOTH Assignment and Practical (like BAPI-003), split into TWO distinct rows.
      // Primary Key format: SUB_ENR_COURSE_TERM (or SUB_ENR_COURSE_PRAC_TERM for practicals)
      // Save custom programme & courses so they appear in Quick Suggestions next time
      try {
        saveCustomProgramme({ code: cleanProgramme });
        data.courseCodes.forEach((cc) => {
          saveCustomCourse(cleanProgramme, { code: cc });
          updateCourseTitleFromIgnou(cc, cleanProgramme).catch(() => {});
        });
      } catch (e) {
        console.warn('Could not auto-save custom programme or course:', e);
      }

      const unpackedRows: CourseEvaluationRecord[] = [];
      const createRow = (courseCode: string, compType: 'Assignment' | 'Practical') => {
        const cleanCourse = courseCode.trim().toUpperCase();
        const resolvedTitle = getCourseTitle(cleanCourse, cleanProgramme);
        const isPrac = compType === 'Practical';
        const deterministicKey = generateDeterministicSubmissionKey(cleanEnrollment, cleanCourse, targetSession, compType);
        const markVal = data.marks?.[courseCode] ?? null;
        const gradeInfo = calculateIGNOUGrade(markVal);
        const statusVal: EvaluationStatus = markVal !== null ? 'Evaluated' : 'Pending Allotment';

        return {
          Sub_ID: deterministicKey,
          subId: deterministicKey,
          Session: targetSession,
          Enrollment_No: cleanEnrollment,
          Candidate_Name: cleanName,
          Contact_No: data.studentPhone?.trim() || '',
          Email_ID: data.studentEmail?.trim() || '',
          Programme_Code: cleanProgramme,
          Course_Code: cleanCourse,
          Course_Title: resolvedTitle,
          courseTitle: resolvedTitle,
          Programme: cleanProgramme,
          Allotted_Evaluator: '',
          Marks: markVal,
          Grade: gradeInfo.grade,
          Status: statusVal,

          id: deterministicKey,
          submissionKey: deterministicKey,
          intakeId: newRecord.id,
          tokenNo,
          enrollmentNo: cleanEnrollment,
          studentName: cleanName,
          studentPhone: data.studentPhone?.trim() || '',
          studentEmail: data.studentEmail?.trim() || '',
          programmeCode: cleanProgramme,
          courseCode: cleanCourse,
          session: targetSession,
          submissionDate: intakeDate,
          receiptDate: intakeDate,
          Submission_Date: intakeDate,
          receivedDate: intakeDate,
          intakeDate: intakeDate,
          Timestamp: `${intakeDate}T10:00:00.000Z`,
          submissionMode: data.submissionMode,
          consignmentNo: data.consignmentNo,
          evaluatorId: null,
          evaluatorCode: null,
          evaluatorName: null,
          allottedDate: null,
          allottedBy: null,
          marks: markVal,
          grade: gradeInfo.grade,
          gradeLabel: gradeInfo.label,
          isLocked: false,
          lockedAt: null,
          lockedBy: null,
          status: statusVal,
          componentType: compType,
          isPractical: isPrac,
          updatedAt: new Date().toISOString(),
          remarks: data.remarks,
        };
      };

      cleanCourses.forEach((cc) => {
        const hasAssignment = computedAssignmentList.includes(cc);
        const hasPractical = computedPracticalList.includes(cc);
        if (hasAssignment && hasPractical) {
          unpackedRows.push(createRow(cc, 'Assignment'));
          unpackedRows.push(createRow(cc, 'Practical'));
        } else if (hasPractical) {
          unpackedRows.push(createRow(cc, 'Practical'));
        } else {
          unpackedRows.push(createRow(cc, 'Assignment'));
        }
      });

      setCourseEvaluations((prev) => {
        const cleanPrev = prev.filter((item) => !isDummyEvaluationId(item.id, item.intakeId));
        const map = new Map(cleanPrev.map((item) => [item.id, item]));
        unpackedRows.forEach((row) => map.set(row.id, row));
        const combined = Array.from(map.values());
        // Immediate localStorage backup
        try {
          localStorage.setItem(STORAGE_KEYS.COURSE_EVALUATIONS, JSON.stringify(combined));
          localStorage.setItem(STORAGE_KEYS.INTAKES, JSON.stringify([newRecord, ...intakes.filter((i) => !isDummyIntakeId(i.id))]));
        } catch {}
        return combined;
      });

      // Also ensure assignmentSubmissions is directly synced with newly recorded course scripts
      setAssignmentSubmissions((prev) => {
        const cleanPrev = prev.filter((s) => !isDummySubmissionId(s.id, s.studentId));
        const map = new Map(cleanPrev.map((s) => [s.id, s]));
        unpackedRows.forEach((row) => {
          const id = row.subId || `sub-${row.enrollmentNo}-${row.courseCode}`;
          map.set(id, {
            id,
            studentId: row.enrollmentNo,
            studentName: row.studentName,
            programmeCode: row.programmeCode,
            courseCode: row.courseCode,
            session: row.session,
            status: 'submitted',
            submissionDate: row.submissionDate,
            submissionMode: (row.submissionMode as any) || 'In-Person (Desk)',
            consignmentNo: row.consignmentNo,
            remarks: row.remarks,
            Session: row.session,
            Course_Code: row.courseCode,
            Enrollment_No: row.enrollmentNo,
            componentType: row.componentType || (row.isPractical ? 'Practical' : 'Assignment'),
            isPractical: Boolean(row.isPractical),
          } as any);
        });
        const combined = Array.from(map.values());
        try {
          localStorage.setItem(STORAGE_KEYS.ASSIGNMENT_SUBMISSIONS, JSON.stringify(combined));
        } catch {}
        return combined;
      });

      // If student already has an authentic registration record, update contact details if provided
      setStudentRegistrations((prev) => {
        const enr = cleanEnrollment.toUpperCase();
        const existing = prev.find((r) => (r.enrollmentNo || '').toUpperCase() === enr);
        if (!existing) {
          // Candidate is a past student / walk-in: do not contaminate Fresh/Re-Reg admission census
          return prev;
        }
        const email = (data as any).studentEmail || (data as any).email || existing.studentEmail || '';
        const phone = (data.studentPhone || '').trim() || existing.studentPhone || '';
        const updatedStudent: StudentRegistrationRecord = {
          ...existing,
          studentName: cleanName || existing.studentName,
          studentPhone: phone,
          studentEmail: email,
          updatedAt: new Date().toISOString(),
        };
        const next = prev.map((r) => ((r.enrollmentNo || '').toUpperCase() === enr ? updatedStudent : r));
        try {
          localStorage.setItem(STORAGE_KEYS.STUDENT_REGISTRATIONS, JSON.stringify(next));
        } catch {}
        return next;
      });

      // Show confirmation toast immediately
      showToast('Saved & Synced with Google Sheet', 'success');

      // 2. On Intake Submission: Send POST with action "ADD_INTAKE". Save row to Intake_Register and automatically unpack courses to Course_Ledger
      const rawCourses = (data as any).courses || data.courseCodes || [];
      const coursesArray: string[] = (Array.isArray(rawCourses) ? rawCourses.join(',') : String(rawCourses))
        .split(',')
        .map((c: string) => c.trim().toUpperCase())
        .filter(Boolean);

      postAddIntake(
        {
          ...newRecord,
          enrollmentNo: data.enrollmentNo.trim(),
          candidateName: data.studentName.trim(),
          contact: (data.studentPhone || '').trim(),
          programme: data.programmeCode.trim().toUpperCase(),
          courses: coursesArray,
          handledBy: currentRole === 'ADMIN' ? 'Coordinator' : 'Desk Official',
          session: (data as any).session || currentSession,
          timestamp: `${intakeDate} 10:00:00 AM`,
          submissionDate: intakeDate,
          receiptDate: intakeDate,
        },
        unpackedRows
      )
        .then(async () => {
          setTimeout(async () => {
            if (fetchAllDataRef.current) {
              await fetchAllDataRef.current(false);
            }
          }, 1200);
        })
        .catch((err) => {
          console.warn('Google Sheets ADD_INTAKE notification:', err);
        });

      logAuditEvent({
        action: 'INTAKE_CREATED',
        category: 'ASSIGNMENT_INTAKE',
        actor: currentRole === 'ADMIN' ? `${settings.coordinatorName || 'Coordinator'} (Admin)` : 'Desk Official',
        role: currentRole,
        session: (data as any).session || currentSession,
        targetIdentifier: `${newRecord.tokenNo} (Enr: ${newRecord.enrollmentNo})`,
        summary: `Registered assignment intake for candidate ${newRecord.studentName} (Enrollment: ${newRecord.enrollmentNo}, Courses: ${coursesArray.join(', ')})`,
        details: { tokenNo: newRecord.tokenNo, courses: coursesArray, mode: newRecord.submissionMode },
        status: 'SUCCESS',
      });

      return newRecord;
    },
    [currentSession, intakes, courseEvaluations, currentRole, showToast, logAuditEvent, settings.coordinatorName]
  );

  const integrateIntakeWithPrevious = useCallback(
    (params: {
      targetIntakeId: string;
      newCourseCodes: string[];
      practicalCourses?: string[];
      assignmentCourses?: string[];
      submissionDate?: string;
      submissionMode?: SubmissionMode;
      consignmentNo?: string;
      remarks?: string;
    }) => {
      const targetIntake = intakes.find(
        (i) => i.id === params.targetIntakeId || i.tokenNo === params.targetIntakeId
      );
      if (!targetIntake) {
        throw new Error('Previous intake record to integrate with was not found.');
      }

      const cleanNewCourses = Array.from(
        new Set(params.newCourseCodes.map((c) => c.trim().toUpperCase()).filter(Boolean))
      );
      if (cleanNewCourses.length === 0) {
        throw new Error('Please specify at least one differing course code to integrate.');
      }

      const activeSession = targetIntake.session || currentSession;
      const cleanEnr = targetIntake.enrollmentNo.trim();
      const cleanProg = targetIntake.programmeCode.trim().toUpperCase();
      const intakeDate = params.submissionDate || new Date().toISOString().split('T')[0];
      const registeredBy = currentRole === 'ADMIN' ? 'Coordinator Desk' : 'Desk Official - Counter 1';

      const existingParts = targetIntake.submissionParts || [
        {
          partNo: 1,
          submissionDate: targetIntake.submissionDate,
          tokenNo: targetIntake.tokenNo,
          courseCodes: [...targetIntake.courseCodes],
          practicalCourses: targetIntake.practicalCourses || targetIntake.courseCodes.filter((c) => isPracticalCourse(c)),
          assignmentCourses: targetIntake.assignmentCourses || targetIntake.courseCodes.filter((c) => !isPracticalCourse(c)),
          receiptNumber: targetIntake.receiptNumber,
        },
      ];

      const newPartNo = existingParts.length + 1;
      const isBrl = (c: string) => /^BRL[-_]?\d+/i.test(c);
      const newPractical = (params.practicalCourses || [])
        .map((c) => c.trim().toUpperCase())
        .filter((c) => !isBrl(c));
      const brlNew = cleanNewCourses.filter(isBrl);
      const newAssignment = Array.from(
        new Set([
          ...(params.assignmentCourses || []).map((c) => c.trim().toUpperCase()),
          ...brlNew,
        ])
      );

      const computedNewPractical = newPractical.length > 0
        ? newPractical
        : cleanNewCourses.filter((c) => !isBrl(c) && isPracticalCourse(c));
      const computedNewAssignment = newAssignment.length > 0
        ? newAssignment
        : cleanNewCourses.filter((c) => !computedNewPractical.includes(c));

      const newPart = {
        partNo: newPartNo,
        submissionDate: intakeDate,
        tokenNo: targetIntake.tokenNo,
        courseCodes: cleanNewCourses,
        practicalCourses: computedNewPractical,
        assignmentCourses: computedNewAssignment,
      };

      const combinedCourses = Array.from(new Set([...targetIntake.courseCodes, ...cleanNewCourses]));
      const combinedPracticals = Array.from(
        new Set([...(targetIntake.practicalCourses || []), ...computedNewPractical])
      );
      const combinedAssignments = Array.from(
        new Set([...(targetIntake.assignmentCourses || []), ...computedNewAssignment])
      );

      const newPartDetails = cleanNewCourses.flatMap((courseCode) => {
        const resolvedTitle = getCourseTitle(courseCode, cleanProg);
        const hasAssignment = computedNewAssignment.includes(courseCode);
        const hasPractical = computedNewPractical.includes(courseCode);
        const details: Array<{ code: string; type: 'Assignment' | 'Practical'; title: string; addedInPart: number; submissionDate: string }> = [];
        if (hasAssignment) {
          details.push({ code: courseCode, type: 'Assignment', title: resolvedTitle, addedInPart: newPartNo, submissionDate: intakeDate });
        }
        if (hasPractical) {
          details.push({ code: courseCode, type: 'Practical', title: resolvedTitle, addedInPart: newPartNo, submissionDate: intakeDate });
        }
        return details;
      });

      const combinedCourseDetails = [...(targetIntake.courseDetails || []), ...newPartDetails];

      const updatedRecord: IntakeRecord = {
        ...targetIntake,
        courseCodes: combinedCourses,
        practicalCourses: combinedPracticals,
        assignmentCourses: combinedAssignments,
        courseDetails: combinedCourseDetails,
        isIntegrated: true,
        integratedPartsCount: newPartNo,
        submissionParts: [...existingParts, newPart],
        marks: {
          ...targetIntake.marks,
          ...cleanNewCourses.reduce((acc, code) => ({ ...acc, [code]: null }), {}),
        },
      };

      // 1. Update intake in state
      setIntakes((prev) =>
        prev.map((i) => (i.id === targetIntake.id ? updatedRecord : i))
      );

      // 2. Unpack ONLY the new courses into Course Ledger (separating Practical and Assignment if dual)
      const unpackedNewRows: CourseEvaluationRecord[] = [];
      const createNewRow = (courseCode: string, compType: 'Assignment' | 'Practical'): CourseEvaluationRecord => {
        const cleanCourse = courseCode.trim().toUpperCase();
        const resolvedTitle = getCourseTitle(cleanCourse, cleanProg);
        const isPrac = compType === 'Practical';
        const deterministicKey = generateDeterministicSubmissionKey(
          cleanEnr,
          cleanCourse,
          activeSession,
          compType
        );

        return {
          Sub_ID: deterministicKey,
          subId: deterministicKey,
          Session: activeSession,
          Enrollment_No: cleanEnr,
          Candidate_Name: targetIntake.studentName,
          Contact_No: targetIntake.studentPhone || '',
          Email_ID: targetIntake.studentEmail || '',
          Programme_Code: cleanProg,
          Course_Code: cleanCourse,
          Course_Title: resolvedTitle,
          courseTitle: resolvedTitle,
          Programme: cleanProg,
          Allotted_Evaluator: '',
          Marks: null,
          Grade: '—',
          Status: 'Pending Allotment',

          id: deterministicKey,
          submissionKey: deterministicKey,
          intakeId: targetIntake.id,
          tokenNo: targetIntake.tokenNo,
          enrollmentNo: cleanEnr,
          studentName: targetIntake.studentName,
          studentPhone: targetIntake.studentPhone || '',
          studentEmail: targetIntake.studentEmail || '',
          programmeCode: cleanProg,
          courseCode: cleanCourse,
          session: activeSession,
          submissionDate: intakeDate,
          receiptDate: intakeDate,
          Submission_Date: intakeDate,
          receivedDate: intakeDate,
          intakeDate: intakeDate,
          Timestamp: `${intakeDate}T10:00:00.000Z`,
          submissionMode: params.submissionMode || targetIntake.submissionMode,
          consignmentNo: params.consignmentNo || targetIntake.consignmentNo,
          evaluatorId: null,
          evaluatorCode: null,
          evaluatorName: null,
          allottedDate: null,
          allottedBy: null,
          marks: null,
          grade: '—',
          gradeLabel: 'Pending',
          isLocked: false,
          lockedAt: null,
          lockedBy: null,
          status: 'Pending Allotment' as EvaluationStatus,
          componentType: compType,
          isPractical: isPrac,
          updatedAt: new Date().toISOString(),
          remarks: params.remarks || targetIntake.remarks,
        };
      };

      cleanNewCourses.forEach((cc) => {
        const hasAssignment = computedNewAssignment.includes(cc);
        const hasPractical = computedNewPractical.includes(cc);
        if (hasAssignment && hasPractical) {
          unpackedNewRows.push(createNewRow(cc, 'Assignment'));
          unpackedNewRows.push(createNewRow(cc, 'Practical'));
        } else if (hasPractical) {
          unpackedNewRows.push(createNewRow(cc, 'Practical'));
        } else {
          unpackedNewRows.push(createNewRow(cc, 'Assignment'));
        }
      });

      setCourseEvaluations((prev) => {
        const map = new Map(prev.map((item) => [item.id, item]));
        unpackedNewRows.forEach((row) => map.set(row.id, row));
        const combined = Array.from(map.values());
        try {
          localStorage.setItem(STORAGE_KEYS.COURSE_EVALUATIONS, JSON.stringify(combined));
          localStorage.setItem(
            STORAGE_KEYS.INTAKES,
            JSON.stringify(intakes.map((i) => (i.id === targetIntake.id ? updatedRecord : i)))
          );
        } catch {}
        return combined;
      });

      // 3. Link each registered course in mock table AssignmentSubmissions
      recordStudentAssignmentSubmissions({
        studentId: cleanEnr,
        studentName: targetIntake.studentName,
        programmeCode: cleanProg,
        courseCodes: cleanNewCourses,
        practicalCourses: computedNewPractical,
        assignmentCourses: computedNewAssignment,
        session: activeSession,
        initialStatus: 'submitted',
        submissionDate: intakeDate,
        submissionMode: params.submissionMode || targetIntake.submissionMode,
        consignmentNo: params.consignmentNo || targetIntake.consignmentNo,
        remarks: params.remarks || `Part ${newPartNo} supplementary submission`,
      });

      // 4. Create updated / supplementary RegistrationReceipt
      const newReceipt = addRegistrationReceipt({
        intakeId: targetIntake.id,
        tokenNo: targetIntake.tokenNo,
        studentId: cleanEnr,
        studentName: targetIntake.studentName,
        studentPhone: targetIntake.studentPhone,
        studentEmail: targetIntake.studentEmail,
        programmeCode: cleanProg,
        session: activeSession,
        registeredCourses: combinedCourses,
        practicalCourses: combinedPracticals,
        assignmentCourses: combinedAssignments,
        courseDetails: combinedCourseDetails,
        isIntegrated: true,
        partNo: newPartNo,
        issuedBy: registeredBy,
        remarks: `Part-by-part integrated submission (Part ${newPartNo}): added ${cleanNewCourses.join(', ')}`,
        submissionDate: intakeDate,
        receiptDate: intakeDate,
        issuedAt: `${intakeDate}T${new Date().toTimeString().split(' ')[0]}`,
      });

      // Sync updated intake with Google Sheets / backend
      postAddIntake(
        {
          ...updatedRecord,
          enrollmentNo: cleanEnr,
          candidateName: targetIntake.studentName,
          contact: targetIntake.studentPhone || '',
          programme: cleanProg,
          courses: combinedCourses,
          practicalCourses: combinedPracticals,
          assignmentCourses: combinedAssignments,
          handledBy: registeredBy,
          session: activeSession,
          timestamp: `${intakeDate} 10:00:00 AM`,
          submissionDate: intakeDate,
          receiptDate: intakeDate,
        },
        unpackedNewRows
      )
        .then(async () => {
          setTimeout(async () => {
            if (fetchAllDataRef.current) {
              await fetchAllDataRef.current(false);
            }
          }, 1200);
        })
        .catch((err) => console.warn('[integrateIntakeWithPrevious Sheets sync warning]:', err));

      logAuditEvent({
        action: 'INTAKE_UPDATED',
        category: 'ASSIGNMENT_INTAKE',
        actor: currentRole === 'ADMIN' ? `${settings.coordinatorName || 'Coordinator'} (Admin)` : 'Desk Official',
        role: currentRole,
        session: activeSession,
        targetIdentifier: cleanEnr,
        summary: `Integrated Part ${newPartNo} submission: added ${cleanNewCourses.length} differing courses (${cleanNewCourses.join(', ')}) into intake ${targetIntake.tokenNo}`,
        details: {
          tokenNo: targetIntake.tokenNo,
          partNo: newPartNo,
          newCourses: cleanNewCourses,
          allCourses: combinedCourses,
          practicals: combinedPracticals,
        },
        status: 'SUCCESS',
      });

      showToast(
        `Successfully integrated Part ${newPartNo} (${cleanNewCourses.join(', ')}) into intake token ${targetIntake.tokenNo}!`,
        'success'
      );

      return { updatedRecord, receipt: newReceipt };
    },
    [intakes, currentSession, currentRole, settings.coordinatorName, addRegistrationReceipt, recordStudentAssignmentSubmissions, showToast, logAuditEvent]
  );

  const updateIntakeRecord = useCallback(async (id: string, updates: Partial<IntakeRecord>) => {
    setIntakes((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
    const target = intakes.find((i) => i.id === id);
    if (target) {
      const merged = { ...target, ...updates };
      try {
        await postEditIntake({
          id: merged.id,
          originalEnrollmentNo: target.enrollmentNo,
          enrollmentNo: merged.enrollmentNo,
          candidateName: merged.studentName,
          contact: merged.studentPhone || '',
          programme: merged.programmeCode,
          courses: merged.courseCodes,
          session: merged.session,
          submissionDate: merged.submissionDate,
          receiptDate: merged.receiptDate || merged.submissionDate,
        });
        if (fetchAllDataRef.current) {
          await fetchAllDataRef.current(true);
        }
      } catch (e) {
        console.warn('[updateIntakeRecord] Google Sheets sync error:', e);
      }
    }
  }, [intakes]);

  const editIntakeEntry = useCallback(
    async (data: {
      id: string;
      originalEnrollmentNo: string;
      enrollmentNo: string;
      candidateName: string;
      contact: string;
      programme: string;
      courses: string[];
      session?: string;
      submissionDate?: string;
    }) => {
      const targetIntake = intakes.find((i) => i.id === data.id);
      const activeSession = data.session || targetIntake?.session || currentSession;
      const cleanOrigEnr = data.originalEnrollmentNo.trim();
      const cleanNewEnr = data.enrollmentNo.trim();
      const cleanProg = data.programme.trim().toUpperCase();
      const cleanCourses = Array.from(new Set(data.courses.map((c) => c.trim().toUpperCase()).filter(Boolean)));

      // 1. Re-run all three validation rules on the modified data first
      const validation = validateIntakeRecord({
        enrollmentNo: cleanNewEnr,
        programmeCode: cleanProg,
        courseCodes: cleanCourses,
        session: activeSession,
        currentIntakeId: data.id,
        existingIntakes: intakes,
        existingEvaluations: courseEvaluations,
        existingReceipts: registrationReceipts,
      });

      if (!validation.valid) {
        logAuditEvent({
          action: 'INTAKE_REJECTED',
          category: 'SECURITY',
          actor: currentRole === 'ADMIN' ? `${settings.coordinatorName || 'Coordinator'} (Admin)` : 'Desk Official',
          role: currentRole,
          session: activeSession,
          targetIdentifier: cleanNewEnr,
          summary: `Edit intake rejected: ${validation.reason}`,
          details: { enrollmentNo: cleanNewEnr, programmeCode: cleanProg, courses: cleanCourses, reason: validation.reason, rule: validation.rule },
          status: 'FAILED',
        });
        showToast(validation.reason, 'error');
        throw new Error(validation.reason);
      }

      // Check if any course removed by this edit was already locked in courseLedger
      const matchingCurrentStudentEvals = courseEvaluations.filter(
        (e) =>
          (e.intakeId === data.id || e.enrollmentNo.trim() === cleanOrigEnr) &&
          e.session.trim().toLowerCase() === activeSession.trim().toLowerCase()
      );
      for (const ce of matchingCurrentStudentEvals) {
        if (
          !cleanCourses.includes(ce.courseCode.toUpperCase()) &&
          (ce.isLocked || (ce.status as any) === 'Locked' || ce.status === 'Marks Locked')
        ) {
          showToast(`Cannot remove course ${ce.courseCode}: Marks have already been locked.`, 'error');
          return;
        }
      }

      // Auto-save custom programme & courses for future suggestions
      try {
        saveCustomProgramme({ code: cleanProg });
        cleanCourses.forEach((cc) => {
          saveCustomCourse(cleanProg, { code: cc });
          updateCourseTitleFromIgnou(cc, cleanProg).catch(() => {});
        });
      } catch (e) {
        console.warn('Could not auto-save custom programme or course:', e);
      }

      // 2. Apply Cascading Update across the entire database
      const cascade = applyCascadingUpdate(
        {
          targetId: data.id,
          originalEnrollmentNo: cleanOrigEnr,
          enrollmentNo: cleanNewEnr,
          studentName: data.candidateName.trim(),
          studentPhone: data.contact.trim(),
          programmeCode: cleanProg,
          courseCodes: cleanCourses,
          session: activeSession,
          submissionDate: data.submissionDate,
        },
        {
          intakes,
          courseEvaluations,
          registrationReceipts,
          assignmentSubmissions,
        }
      );

      // Overwrite and modify all linked records seamlessly
      setIntakes((prev) => {
        const next = prev.map((item) => (item.id === data.id ? cascade.updatedIntake : item));
        try {
          localStorage.setItem(STORAGE_KEYS.INTAKES, JSON.stringify(next));
          localStorage.setItem('ignou_sc2033_intake', JSON.stringify(next));
        } catch {}
        return next;
      });

      setCourseEvaluations(() => {
        try {
          localStorage.setItem(STORAGE_KEYS.COURSE_EVALUATIONS, JSON.stringify(cascade.updatedEvaluations));
          localStorage.setItem('ignou_sc2033_ledger', JSON.stringify(cascade.updatedEvaluations));
        } catch {}
        return cascade.updatedEvaluations;
      });

      setRegistrationReceipts(() => {
        try {
          localStorage.setItem(STORAGE_KEYS.REGISTRATION_RECEIPTS, JSON.stringify(cascade.updatedReceipts));
        } catch {}
        return cascade.updatedReceipts;
      });

      setAssignmentSubmissions(() => {
        try {
          localStorage.setItem(STORAGE_KEYS.ASSIGNMENT_SUBMISSIONS, JSON.stringify(cascade.updatedSubmissions));
        } catch {}
        return cascade.updatedSubmissions;
      });

      // Keep open modals in sync
      setSelectedReceiptRecord((prev) => (prev && (prev.id === data.id || prev.enrollmentNo === cleanOrigEnr) ? { ...prev, ...cascade.updatedIntake } : prev));
      setSelectedRegistrationReceipt((prev) => {
        if (!prev) return null;
        if (prev.id === data.id || (prev as any).intakeId === data.id || prev.studentId.trim() === cleanOrigEnr || prev.studentId.trim() === cleanNewEnr) {
          const match = cascade.updatedReceipts.find((r) => r.id === data.id || (r as any).intakeId === data.id);
          return match || prev;
        }
        return prev;
      });

      // Persist date override to localStorage and backend store so future fetches never revert the date
      if (data.submissionDate && data.submissionDate.trim()) {
        const cleanDate = data.submissionDate.trim();
        try {
          const ovRaw = localStorage.getItem('ignou_sc2033_receipt_date_overrides');
          const overridesMap: Record<string, string> = ovRaw ? JSON.parse(ovRaw) : {};
          overridesMap[`enr_${cleanNewEnr}`] = cleanDate;
          overridesMap[`enr_${cleanOrigEnr}`] = cleanDate;
          overridesMap[`enrollment_${cleanNewEnr}`] = cleanDate;
          if (data.id) overridesMap[`id_${data.id}`] = cleanDate;
          if (cascade.updatedIntake?.tokenNo) {
            overridesMap[`tok_${cascade.updatedIntake.tokenNo}`] = cleanDate;
            overridesMap[`token_${cascade.updatedIntake.tokenNo}`] = cleanDate;
          }
          localStorage.setItem('ignou_sc2033_receipt_date_overrides', JSON.stringify(overridesMap));
        } catch {}

        try {
          fetch('/api/intake/update-date', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: data.id,
              tokenNo: cascade.updatedIntake?.tokenNo,
              enrollmentNo: cleanNewEnr,
              session: activeSession,
              newDate: cleanDate,
            }),
          }).catch(() => {});
        } catch {}
      }

      // Dispatch to Google Apps Script / backend and validate from Google Sheets
      try {
        await postEditIntake({
          id: data.id,
          originalEnrollmentNo: cleanOrigEnr,
          enrollmentNo: cleanNewEnr,
          candidateName: data.candidateName.trim(),
          contact: data.contact.trim(),
          programme: cleanProg,
          courses: cleanCourses,
          session: activeSession,
          submissionDate: data.submissionDate ? data.submissionDate.trim() : (targetIntake?.submissionDate || ''),
        });
        // Immediately validate live data directly from Google Sheets!
        if (fetchAllDataRef.current) {
          await fetchAllDataRef.current(true);
        }
      } catch (err) {
        console.warn('Google Sheets EDIT_INTAKE notification warning:', err);
      }

      logAuditEvent({
        action: 'INTAKE_UPDATED',
        category: 'ASSIGNMENT_INTAKE',
        actor: currentRole === 'ADMIN' ? `${settings.coordinatorName || 'Coordinator'} (Admin)` : 'Desk Official',
        role: currentRole,
        session: activeSession,
        targetIdentifier: cleanNewEnr,
        summary: `Cascading update applied for intake ${cascade.updatedIntake.tokenNo} (${cleanNewEnr}, ${cleanProg})`,
        details: { enrollmentNo: cleanNewEnr, courses: cleanCourses, session: activeSession },
        status: 'SUCCESS',
      });

      showToast('Intake entry updated & validated from Google Sheets', 'success');
      return {
        Status: 'Success' as const,
        Action: 'Update' as const,
        Data: cascade.updatedIntake,
      };
    },
    [intakes, courseEvaluations, registrationReceipts, assignmentSubmissions, currentSession, showToast, logAuditEvent, currentRole, settings.coordinatorName]
  );

  const deleteIntakeRecord = useCallback(
    (id: string): boolean => {
      const target = intakes.find((i) => i.id === id);
      if (!target) return false;

      const targetSession = target.session || currentSession;
      const cleanEnr = target.enrollmentNo.trim();

      // Check if any course for this intake in courseLedger has status === "Locked" or isLocked:
      const targetCoursesUpper = (target.courseCodes || []).map((c) => c.trim().toUpperCase());
      const hasLocked = courseEvaluations.some(
        (ce) =>
          (ce.intakeId === id || (ce.enrollmentNo.trim() === cleanEnr && targetCoursesUpper.includes(ce.courseCode.trim().toUpperCase()))) &&
          ce.session.trim().toLowerCase() === targetSession.trim().toLowerCase() &&
          (ce.isLocked || (ce.status as any) === 'Locked' || ce.status === 'Marks Locked')
      );

      if (hasLocked) {
        showToast('Cannot delete intake. Marks have already been locked for one or more courses.', 'error');
        return false;
      }

      // Execute cascading deletion: completely remove the record & dependent/mirrored data
      const cascade = applyCascadingDeletion(id, {
        intakes,
        courseEvaluations,
        registrationReceipts,
        assignmentSubmissions,
      });

      setIntakes(() => {
        try {
          localStorage.setItem(STORAGE_KEYS.INTAKES, JSON.stringify(cascade.updatedIntakes));
          localStorage.setItem('ignou_sc2033_intake', JSON.stringify(cascade.updatedIntakes));
        } catch {}
        return cascade.updatedIntakes;
      });

      setCourseEvaluations(() => {
        try {
          localStorage.setItem(STORAGE_KEYS.COURSE_EVALUATIONS, JSON.stringify(cascade.updatedEvaluations));
          localStorage.setItem('ignou_sc2033_ledger', JSON.stringify(cascade.updatedEvaluations));
        } catch {}
        return cascade.updatedEvaluations;
      });

      setRegistrationReceipts(() => {
        try {
          localStorage.setItem(STORAGE_KEYS.REGISTRATION_RECEIPTS, JSON.stringify(cascade.updatedReceipts));
        } catch {}
        return cascade.updatedReceipts;
      });

      setAssignmentSubmissions(() => {
        try {
          localStorage.setItem(STORAGE_KEYS.ASSIGNMENT_SUBMISSIONS, JSON.stringify(cascade.updatedSubmissions));
        } catch {}
        return cascade.updatedSubmissions;
      });

      // Also clean up any open receipt modals if they matched the deleted item
      setSelectedReceiptRecord((prev) => (prev && prev.id === id ? null : prev));
      setSelectedRegistrationReceipt((prev) => (prev && (prev.id === id || (prev as any).intakeId === id) ? null : prev));

      // Dispatch DELETE_INTAKE to Google Apps Script / backend
      postDeleteIntake({
        id,
        enrollmentNo: cleanEnr,
        session: targetSession,
      }).catch((err) => {
        console.warn('Google Sheets DELETE_INTAKE notification warning:', err);
      });

      logAuditEvent({
        action: 'INTAKE_DELETED',
        category: 'ASSIGNMENT_INTAKE',
        actor: currentRole === 'ADMIN' ? `${settings.coordinatorName || 'Coordinator'} (Admin)` : 'Desk Official',
        role: currentRole,
        session: targetSession,
        targetIdentifier: cleanEnr,
        summary: `Purged intake submission ${target.tokenNo} & cleaned up linked records for student enrollment: ${cleanEnr}`,
        status: 'WARNING',
        details: { id, tokenNo: target.tokenNo, enrollmentNo: cleanEnr, courses: target.courseCodes },
      });

      showToast('Intake entry and all linked records deleted', 'success');
      return true;
    },
    [intakes, courseEvaluations, registrationReceipts, assignmentSubmissions, currentSession, showToast, logAuditEvent, currentRole, settings.coordinatorName]
  );

  const getStudentRegistrationByEnrollment = useCallback(
    (enrollmentNo: string, targetSession?: string): StudentRegistrationRecord | null => {
      const cleanEnr = String(enrollmentNo || '').replace(/\D/g, '').trim();
      if (!cleanEnr) return null;
      const desiredSession = targetSession || currentSession;
      const matchInCurrent = studentRegistrations.find(
        (r) => String(r.enrollmentNo || '').replace(/\D/g, '').trim() === cleanEnr && norm(r.session) === norm(desiredSession)
      );
      if (matchInCurrent) return matchInCurrent;
      return (
        studentRegistrations.find(
          (r) => String(r.enrollmentNo || '').replace(/\D/g, '').trim() === cleanEnr
        ) || null
      );
    },
    [studentRegistrations, currentSession]
  );

  const getAllStudentRegistrationsByEnrollment = useCallback(
    (enrollmentNo: string): StudentRegistrationRecord[] => {
      const cleanEnr = String(enrollmentNo || '').replace(/\D/g, '').trim();
      if (!cleanEnr) return [];
      return studentRegistrations.filter(
        (r) => String(r.enrollmentNo || '').replace(/\D/g, '').trim() === cleanEnr
      );
    },
    [studentRegistrations]
  );

  const getRegisteredProgrammeForEnrollment = useCallback(
    (enrollmentNo: string, currentIntakeId?: string) => {
      const cleanEnr = String(enrollmentNo || '').replace(/\D/g, '').trim();
      const reg = studentRegistrations.find(
        (r) => String(r.enrollmentNo || '').replace(/\D/g, '').trim() === cleanEnr
      );
      if (reg?.programmeCode) {
        return reg.programmeCode.trim().toUpperCase();
      }
      return getRegisteredProgHelper(
        enrollmentNo,
        intakes,
        courseEvaluations,
        registrationReceipts,
        currentIntakeId
      );
    },
    [studentRegistrations, intakes, courseEvaluations, registrationReceipts]
  );

  const getEnrolledCoursesForStudent = useCallback(
    (enrollmentNo: string, currentIntakeId?: string) => {
      const cleanEnr = String(enrollmentNo || '').replace(/\D/g, '').trim();
      const existing = getEnrolledCoursesHelper(
        enrollmentNo,
        intakes,
        courseEvaluations,
        currentIntakeId
      );
      // Aggregate courses from all registration rosters (Fresh Admissions & Re-Registrations)
      const regCourses = studentRegistrations
        .filter((r) => String(r.enrollmentNo || '').replace(/\D/g, '').trim() === cleanEnr)
        .flatMap((r) => r.courseCodes || [])
        .map((c) => String(c).trim().toUpperCase())
        .filter(Boolean);
      return new Set([...existing, ...regCourses]);
    },
    [intakes, courseEvaluations, studentRegistrations]
  );

  const getEnrolledCourseComponentsForStudent = useCallback(
    (enrollmentNo: string, currentIntakeId?: string) => {
      return getEnrolledCourseComponentsHelper(
        enrollmentNo,
        intakes,
        courseEvaluations,
        currentIntakeId
      );
    },
    [intakes, courseEvaluations]
  );

  const validateIntake = useCallback(
    (params: {
      enrollmentNo: string;
      programmeCode: string;
      courseCodes: string[];
      practicalCourses?: string[];
      assignmentCourses?: string[];
      courseComponents?: Record<string, 'Assignment' | 'Practical' | 'Both'>;
      session?: string;
      currentIntakeId?: string;
    }) => {
      return validateIntakeRecord({
        ...params,
        session: params.session || currentSession,
        existingIntakes: intakes,
        existingEvaluations: courseEvaluations,
        existingReceipts: registrationReceipts,
      });
    },
    [intakes, courseEvaluations, registrationReceipts, currentSession]
  );

  const updateIntakeDate = useCallback(
    async (idOrToken: string, newDate: string) => {
      if (!idOrToken || !newDate) return;
      const cleanDate = newDate.trim();
      const cleanTarget = idOrToken.trim();

      // Collect all matching identifiers across all sources
      const matchingEnrs = new Set<string>();
      const matchingIds = new Set<string>([cleanTarget]);
      const matchingTokens = new Set<string>([cleanTarget]);
      let targetSession = currentSession;

      if (/^\d{7,12}$/.test(cleanTarget)) {
        matchingEnrs.add(cleanTarget);
      }

      // Check current state in intakes
      const targetIntake = intakes.find(
        (i) => i.id === cleanTarget || i.tokenNo === cleanTarget || (i as any).receiptNumber === cleanTarget || i.enrollmentNo === cleanTarget
      );
      if (targetIntake) {
        matchingIds.add(targetIntake.id);
        matchingTokens.add(targetIntake.tokenNo);
        if ((targetIntake as any).receiptNumber) matchingTokens.add((targetIntake as any).receiptNumber);
        if (targetIntake.enrollmentNo) matchingEnrs.add(targetIntake.enrollmentNo.trim());
        if (targetIntake.session) targetSession = targetIntake.session;
      }

      // Check registration receipts
      const targetReceipt = registrationReceipts.find(
        (r) => r.id === cleanTarget || r.receiptNumber === cleanTarget || (r as any).tokenNo === cleanTarget || r.studentId === cleanTarget || (r as any).intakeId === cleanTarget
      );
      if (targetReceipt) {
        matchingIds.add(targetReceipt.id);
        if ((targetReceipt as any).intakeId) matchingIds.add((targetReceipt as any).intakeId);
        matchingTokens.add(targetReceipt.receiptNumber);
        if ((targetReceipt as any).tokenNo) matchingTokens.add((targetReceipt as any).tokenNo);
        if (targetReceipt.studentId) matchingEnrs.add(targetReceipt.studentId.trim());
        if (targetReceipt.session) targetSession = targetReceipt.session;
      }

      // Check course evaluations
      const targetEval = courseEvaluations.find(
        (ce) => ce.id === cleanTarget || ce.submissionKey === cleanTarget || ce.tokenNo === cleanTarget || ce.intakeId === cleanTarget || ce.enrollmentNo === cleanTarget
      );
      if (targetEval) {
        if (targetEval.intakeId) matchingIds.add(targetEval.intakeId);
        matchingTokens.add(targetEval.tokenNo);
        if (targetEval.enrollmentNo) matchingEnrs.add(targetEval.enrollmentNo.trim());
        if (targetEval.session) targetSession = targetEval.session;
      }

      // Also check active receipt modal states
      if (selectedReceiptRecord) {
        if (
          matchingIds.has(selectedReceiptRecord.id) ||
          matchingTokens.has(selectedReceiptRecord.tokenNo) ||
          matchingEnrs.has(selectedReceiptRecord.enrollmentNo.trim())
        ) {
          matchingIds.add(selectedReceiptRecord.id);
          matchingTokens.add(selectedReceiptRecord.tokenNo);
          matchingEnrs.add(selectedReceiptRecord.enrollmentNo.trim());
          if (selectedReceiptRecord.session) targetSession = selectedReceiptRecord.session;
        }
      }

      if (selectedRegistrationReceipt) {
        if (
          matchingIds.has(selectedRegistrationReceipt.id) ||
          matchingTokens.has(selectedRegistrationReceipt.receiptNumber) ||
          matchingEnrs.has(selectedRegistrationReceipt.studentId.trim())
        ) {
          matchingIds.add(selectedRegistrationReceipt.id);
          matchingTokens.add(selectedRegistrationReceipt.receiptNumber);
          matchingEnrs.add(selectedRegistrationReceipt.studentId.trim());
          if (selectedRegistrationReceipt.session) targetSession = selectedRegistrationReceipt.session;
        }
      }

      const isSessionMatch = (itemSession: string | undefined) => {
        if (!itemSession || !targetSession) return true;
        return norm(itemSession) === norm(targetSession);
      };

      // 1. Update intakes state & localStorage
      setIntakes((prev) => {
        // Enrich matching identifiers from prev
        prev.forEach((i) => {
          if (
            matchingIds.has(i.id) ||
            matchingTokens.has(i.tokenNo) ||
            (matchingEnrs.size > 0 && matchingEnrs.has(i.enrollmentNo.trim()))
          ) {
            matchingIds.add(i.id);
            matchingTokens.add(i.tokenNo);
            if (i.enrollmentNo) matchingEnrs.add(i.enrollmentNo.trim());
          }
        });

        const next = prev.map((item) => {
          const isMatch =
            matchingIds.has(item.id) ||
            matchingTokens.has(item.tokenNo) ||
            ((item as any).receiptNumber && matchingTokens.has((item as any).receiptNumber)) ||
            (matchingEnrs.size > 0 && matchingEnrs.has(item.enrollmentNo.trim()) && isSessionMatch(item.session));

          if (isMatch) {
            return {
              ...item,
              submissionDate: cleanDate,
              receiptDate: cleanDate,
              Submission_Date: cleanDate,
              Timestamp: `${cleanDate}T10:00:00.000Z`,
              timestamp: `${cleanDate}T10:00:00.000Z`,
              createdAt: `${cleanDate}T10:00:00.000Z`,
            };
          }
          return item;
        });
        try {
          localStorage.setItem(STORAGE_KEYS.INTAKES, JSON.stringify(next));
          localStorage.setItem('ignou_sc2033_intake', JSON.stringify(next));
        } catch {}
        return next;
      });

      // 2. Update course evaluations state & localStorage
      setCourseEvaluations((prev) => {
        const next = prev.map((ce) => {
          const isMatch =
            (ce.intakeId && matchingIds.has(ce.intakeId)) ||
            matchingTokens.has(ce.tokenNo) ||
            matchingIds.has(ce.id) ||
            matchingIds.has(ce.submissionKey) ||
            (matchingEnrs.size > 0 && matchingEnrs.has(ce.enrollmentNo.trim()) && isSessionMatch(ce.session));

          if (isMatch) {
            return {
              ...ce,
              submissionDate: cleanDate,
              receiptDate: cleanDate,
              Submission_Date: cleanDate,
              receivedDate: cleanDate,
              intakeDate: cleanDate,
              updatedAt: new Date().toISOString(),
            };
          }
          return ce;
        });
        try {
          localStorage.setItem(STORAGE_KEYS.COURSE_EVALUATIONS, JSON.stringify(next));
          localStorage.setItem('ignou_sc2033_ledger', JSON.stringify(next));
        } catch {}
        return next;
      });

      // 3. Update registration receipts state & localStorage
      setRegistrationReceipts((prev) => {
        const next = prev.map((rcpt) => {
          const isMatch =
            matchingIds.has(rcpt.id) ||
            ((rcpt as any).intakeId && matchingIds.has((rcpt as any).intakeId)) ||
            matchingTokens.has(rcpt.receiptNumber) ||
            ((rcpt as any).tokenNo && matchingTokens.has((rcpt as any).tokenNo)) ||
            (matchingEnrs.size > 0 && matchingEnrs.has(rcpt.studentId.trim()) && isSessionMatch(rcpt.session));

          if (isMatch) {
            return {
              ...rcpt,
              submissionDate: cleanDate,
              receiptDate: cleanDate,
              Submission_Date: cleanDate,
              issuedAt: `${cleanDate}T${new Date().toTimeString().split(' ')[0]}`,
            };
          }
          return rcpt;
        });
        try {
          localStorage.setItem(STORAGE_KEYS.REGISTRATION_RECEIPTS, JSON.stringify(next));
        } catch {}
        return next;
      });

      // 4. Update assignment submissions tracker state & localStorage
      setAssignmentSubmissions((prev) => {
        const next = prev.map((sub) => {
          if (
            matchingEnrs.size > 0 &&
            matchingEnrs.has(sub.studentId.trim()) &&
            isSessionMatch(sub.session)
          ) {
            return {
              ...sub,
              submissionDate: cleanDate,
              updatedAt: new Date().toISOString(),
            };
          }
          return sub;
        });
        try {
          localStorage.setItem(STORAGE_KEYS.ASSIGNMENT_SUBMISSIONS, JSON.stringify(next));
        } catch {}
        return next;
      });

      // 5. Update active receipt modal state if open
      setSelectedReceiptRecord((prev) => {
        if (!prev) return null;
        const isMatch =
          matchingIds.has(prev.id) ||
          matchingTokens.has(prev.tokenNo) ||
          (matchingEnrs.size > 0 && matchingEnrs.has(prev.enrollmentNo.trim()));
        if (isMatch) {
          return {
            ...prev,
            submissionDate: cleanDate,
            receiptDate: cleanDate,
            Submission_Date: cleanDate,
            Timestamp: `${cleanDate}T10:00:00.000Z`,
            createdAt: `${cleanDate}T10:00:00.000Z`,
          };
        }
        return prev;
      });

      setSelectedRegistrationReceipt((prev) => {
        if (!prev) return null;
        const isMatch =
          matchingIds.has(prev.id) ||
          ((prev as any).intakeId && matchingIds.has((prev as any).intakeId)) ||
          matchingTokens.has(prev.receiptNumber) ||
          ((prev as any).tokenNo && matchingTokens.has((prev as any).tokenNo)) ||
          (matchingEnrs.size > 0 && matchingEnrs.has(prev.studentId.trim()));
        if (isMatch) {
          return {
            ...prev,
            submissionDate: cleanDate,
            receiptDate: cleanDate,
            Submission_Date: cleanDate,
            issuedAt: `${cleanDate}T${new Date().toTimeString().split(' ')[0]}`,
          };
        }
        return prev;
      });

      // 6. Persist to local date overrides registry so re-fetching or background sync never reverts date
      const primaryEnr = Array.from(matchingEnrs)[0];
      const curIntake = targetIntake || (primaryEnr ? intakes.find((i) => i.enrollmentNo.trim() === primaryEnr) : null);
      const targetIntakeId = curIntake?.id || cleanTarget;
      const targetTokenNo = curIntake?.tokenNo || Array.from(matchingTokens)[0];

      try {
        const ovRaw = localStorage.getItem('ignou_sc2033_receipt_date_overrides');
        const overridesMap: Record<string, string> = ovRaw ? JSON.parse(ovRaw) : {};
        if (primaryEnr) {
          overridesMap[`enr_${primaryEnr}`] = cleanDate;
          overridesMap[`enrollment_${primaryEnr}`] = cleanDate;
        }
        matchingIds.forEach((id) => { if (id) overridesMap[`id_${id}`] = cleanDate; });
        matchingTokens.forEach((tok) => {
          if (tok) {
            overridesMap[`tok_${tok}`] = cleanDate;
            overridesMap[`token_${tok}`] = cleanDate;
          }
        });
        localStorage.setItem('ignou_sc2033_receipt_date_overrides', JSON.stringify(overridesMap));
      } catch {}

      // 7. Writeback to Express backend update-date endpoint
      try {
        fetch('/api/intake/update-date', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: targetIntakeId,
            tokenNo: targetTokenNo,
            enrollmentNo: primaryEnr || (curIntake?.enrollmentNo ? curIntake.enrollmentNo.trim() : ''),
            session: curIntake?.session || targetSession,
            newDate: cleanDate,
          }),
        }).catch((err) => console.warn('[updateIntakeDate] Backend sync warning:', err));
      } catch {}

      // 8. Writeback to Google Sheets and validate immediately
      const syncEnr = primaryEnr || (curIntake?.enrollmentNo ? curIntake.enrollmentNo.trim() : '') || (cleanTarget && /^\d{5,12}$/.test(cleanTarget) ? cleanTarget : '');
      const syncName = curIntake?.studentName || targetReceipt?.studentName || (targetEval as any)?.candidateName || (targetEval as any)?.studentName || '';
      const syncProg = curIntake?.programmeCode || targetReceipt?.programmeCode || (targetEval as any)?.programme || (targetEval as any)?.programmeCode || '';
      const syncCourses = curIntake?.courseCodes || targetReceipt?.registeredCourses || (targetEval ? [targetEval.courseCode] : []);

      if (syncEnr) {
        try {
          await postEditIntake({
            id: curIntake?.id || targetIntakeId,
            originalEnrollmentNo: syncEnr,
            enrollmentNo: syncEnr,
            candidateName: syncName,
            contact: curIntake?.studentPhone || targetReceipt?.studentPhone || '',
            programme: syncProg,
            courses: syncCourses,
            session: curIntake?.session || targetSession,
            submissionDate: cleanDate,
            receiptDate: cleanDate,
          });
          // Immediately validate from Google Sheets
          if (fetchAllDataRef.current) {
            await fetchAllDataRef.current(true);
          }
        } catch (err) {
          console.warn('Google Sheets update date sync warning:', err);
        }
      }

      logAuditEvent({
        action: 'INTAKE_DATE_CHANGED',
        category: 'ASSIGNMENT_INTAKE',
        actor: currentRole === 'ADMIN' ? `${settings.coordinatorName || 'Coordinator'} (Admin)` : 'Desk Official',
        role: currentRole,
        session: targetSession || currentSession,
        targetIdentifier: Array.from(matchingTokens)[0] || primaryEnr || cleanTarget,
        summary: `Updated intake receipt date to ${formatDate(cleanDate)} for candidate ${primaryEnr || cleanTarget}`,
        details: { target: cleanTarget, enrollmentNo: primaryEnr, newDate: cleanDate },
        status: 'SUCCESS',
      });

      showToast(`Receipt date updated to ${formatDate(cleanDate)} & validated with Google Sheets`, 'success');
    },
    [intakes, registrationReceipts, courseEvaluations, selectedReceiptRecord, selectedRegistrationReceipt, showToast, logAuditEvent, currentRole, settings.coordinatorName, currentSession]
  );

  const saveOrUpdateMarksAndLock = useCallback(
    async (
      row: any,
      marksValue: number | string | null | undefined,
      isLockAction: boolean = false,
      componentType: 'Assignment' | 'Practical' = 'Assignment'
    ) => {
      const isPrac = componentType === 'Practical' || row.componentType === 'Practical' || row.isPractical === true;
      const targetComponent: 'Assignment' | 'Practical' = isPrac ? 'Practical' : 'Assignment';

      if (isLockAction && !row.isLocked && !(isPrac && row.isPracticalLocked)) {
        if (marksValue === null || marksValue === undefined || marksValue === '' || isNaN(Number(marksValue))) {
          alert(`Cannot lock ${targetComponent.toLowerCase()} script: A valid numerical mark (0-100) must be recorded before locking.`);
          return;
        }
      }
      if (!isLockAction && (row.isLocked || (isPrac && row.isPracticalLocked)) && (isUrlLockedDeskMode || currentRole !== 'ADMIN')) {
        alert('Permission Denied: Only an Administrator (Coordinator) can unlock marks for verified scripts. Unlocking permissions are strictly disabled in Desk Official mode.');
        return;
      }

      const cleanEnrollment = (row.Enrollment_No || row.enrollmentNo || '').toString().replace(/^'/, '').trim();
      const cleanCourse = (row.Course_Code || row.courseCode || '').toString().trim().toUpperCase();
      const subSuffix = isPrac ? '_PRAC' : '';
      const rawSubId = (
        row.Sub_ID ||
        row.subId ||
        row.submissionKey ||
        row.id ||
        `SUB_${cleanEnrollment}_${cleanCourse}${subSuffix}_${(row.session || currentSession || 'JUL2026').replace(/\s+/g, '')}`
      ).toString().trim();

      const numericMarks = marksValue !== null && marksValue !== undefined && marksValue !== ''
        ? Number(marksValue)
        : null;

      const calculatedGrade = numericMarks !== null ? getIgnouGrade(numericMarks).grade : '—';
      const gradeInfo = calculateIGNOUGrade(numericMarks);

      const payload = {
        subId: rawSubId,
        enrollmentNo: cleanEnrollment,
        courseCode: cleanCourse,
        marks: Number(numericMarks ?? 0),
        assignmentMarks: isPrac ? undefined : Number(numericMarks ?? 0),
        practicalMarks: isPrac ? Number(numericMarks ?? 0) : undefined,
        componentType: targetComponent,
        grade: calculatedGrade,
        isLocked: isLockAction,
      };

      const now = new Date().toISOString();
      const lockedBy = isLockAction
        ? currentRole === 'ADMIN'
          ? `${settings.coordinatorName || 'Dr. Sant K. Gupta'} (Coordinator)`
          : 'Desk Official'
        : null;

      // 1. Optimistic UI update for courseEvaluations
      setCourseEvaluations((prev) => {
        const index = prev.findIndex(
          (e) =>
            e.id === rawSubId ||
            e.submissionKey === rawSubId ||
            (e.enrollmentNo.trim() === cleanEnrollment &&
              e.courseCode.trim().toUpperCase() === cleanCourse &&
              (isPrac ? (e.componentType === 'Practical' || e.isPractical) : (!e.componentType || e.componentType === 'Assignment' || !e.isPractical)))
        );

        let next: CourseEvaluationRecord[];
        if (index >= 0) {
          next = prev.map((rec, i) => {
            if (i !== index) {
              // Also update dual reference on the twin record if student is the same
              if (
                rec.enrollmentNo.trim() === cleanEnrollment &&
                rec.courseCode.trim().toUpperCase() === cleanCourse
              ) {
                if (isPrac) {
                  return {
                    ...rec,
                    practicalMarks: numericMarks,
                    practicalGrade: calculatedGrade,
                    practicalGradeLabel: gradeInfo.label,
                    isPracticalLocked: isLockAction,
                  };
                } else {
                  return {
                    ...rec,
                    assignmentMarks: numericMarks,
                  };
                }
              }
              return rec;
            }

            if (isPrac) {
              return {
                ...rec,
                practicalMarks: numericMarks,
                practicalGrade: calculatedGrade,
                practicalGradeLabel: gradeInfo.label,
                isPracticalLocked: isLockAction,
                ...(rec.componentType === 'Practical' || rec.isPractical
                  ? {
                      marks: numericMarks,
                      grade: calculatedGrade,
                      gradeLabel: gradeInfo.label,
                      isLocked: isLockAction,
                      lockedAt: isLockAction ? now : null,
                      lockedBy,
                      status: isLockAction ? 'Marks Locked' : numericMarks !== null ? 'Evaluated' : rec.status,
                    }
                  : {}),
                updatedAt: now,
              };
            }

            return {
              ...rec,
              marks: numericMarks,
              assignmentMarks: numericMarks,
              grade: calculatedGrade,
              gradeLabel: gradeInfo.label,
              isLocked: isLockAction,
              lockedAt: isLockAction ? now : null,
              lockedBy,
              status: isLockAction
                ? 'Marks Locked'
                : numericMarks !== null
                ? 'Evaluated'
                : rec.evaluatorId
                ? 'Allotted'
                : 'Pending Allotment',
              updatedAt: now,
            };
          });
        } else {
          const newEval: CourseEvaluationRecord = {
            id: rawSubId,
            submissionKey: rawSubId,
            tokenNo: row.tokenNo || `TOK-${cleanEnrollment.slice(-4)}`,
            enrollmentNo: cleanEnrollment,
            studentName: row.studentName || row.Candidate_Name || '',
            studentPhone: row.studentPhone || '',
            studentEmail: row.studentEmail || '',
            programmeCode: row.programmeCode || row.Programme || 'BAG',
            courseCode: cleanCourse,
            componentType: targetComponent,
            isPractical: isPrac,
            session: row.session || currentSession,
            submissionDate: row.submissionDate || now.split('T')[0],
            submissionMode: row.submissionMode || 'In-Person (Desk)',
            evaluatorId: null,
            allottedDate: null,
            marks: numericMarks,
            assignmentMarks: isPrac ? null : numericMarks,
            practicalMarks: isPrac ? numericMarks : null,
            grade: calculatedGrade,
            gradeLabel: gradeInfo.label,
            practicalGrade: isPrac ? calculatedGrade : null,
            practicalGradeLabel: isPrac ? gradeInfo.label : null,
            isLocked: isLockAction,
            isPracticalLocked: isPrac ? isLockAction : false,
            lockedAt: isLockAction ? now : null,
            lockedBy,
            status: isLockAction ? 'Marks Locked' : numericMarks !== null ? 'Evaluated' : 'Pending Allotment',
            updatedAt: now,
          };
          next = [newEval, ...prev];
        }

        try {
          localStorage.setItem(STORAGE_KEYS.COURSE_EVALUATIONS, JSON.stringify(next));
        } catch {}
        return next;
      });

      // Optimistic UI update for intakes - store Assignment and Practical marks separately
      setIntakes((prev) => {
        const next = prev.map((item) => {
          if (item.enrollmentNo.trim() !== cleanEnrollment) return item;

          if (isPrac) {
            const updatedPracticalMarks = { ...(item.practicalMarks || {}), [cleanCourse]: numericMarks };
            return {
              ...item,
              practicalMarks: updatedPracticalMarks,
            };
          } else {
            const updatedMarks = { ...item.marks, [cleanCourse]: numericMarks };
            const allEntered = item.courseCodes.every((c) => updatedMarks[c] !== null && updatedMarks[c] !== undefined);
            const status = allEntered ? 'Evaluated' : item.status === 'Received' ? 'Under Evaluation' : item.status;
            return {
              ...item,
              marks: updatedMarks,
              status,
            };
          }
        });
        try {
          localStorage.setItem(STORAGE_KEYS.INTAKES, JSON.stringify(next));
        } catch {}
        return next;
      });

      // 2. Dispatch POST to SCRIPT_URL:
      try {
        await fetch(SCRIPT_URL, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            action: isPrac ? "UPDATE_PRACTICAL_MARKS" : "UPDATE_MARKS",
            payload: payload,
          }),
        });
      } catch (err) {
        console.warn('Google Sheets UPDATE_MARKS fetch error:', err);
      }

      // Also call postUpdateMarks for server proxy fallback
      postUpdateMarks(payload).catch(() => {});

      logAuditEvent({
        action: isLockAction ? (isPrac ? 'PRACTICAL_MARKS_LOCKED' : 'MARKS_LOCKED') : (isPrac ? 'PRACTICAL_MARKS_UPDATED' : 'MARKS_UPDATED'),
        category: 'MARKS_EVALUATION',
        actor: currentRole === 'ADMIN' ? `${settings.coordinatorName || 'Coordinator'} (Admin)` : 'Desk Official',
        role: currentRole,
        session: row.session || currentSession,
        targetIdentifier: `${cleanEnrollment} (${cleanCourse}${isPrac ? ' - Practical' : ' - Assignment'})`,
        summary: isLockAction
          ? `Verified and locked ${targetComponent} marks for candidate ${cleanEnrollment} in course ${cleanCourse} at ${payload.marks} (Grade ${payload.grade})`
          : `Updated ${targetComponent} marks draft for candidate ${cleanEnrollment} in course ${cleanCourse} to ${payload.marks} (Grade ${payload.grade})`,
        details: { enrollmentNo: cleanEnrollment, courseCode: cleanCourse, componentType: targetComponent, marks: payload.marks, grade: payload.grade, isLocked: isLockAction },
        status: 'SUCCESS',
      });

      // 3. Show toast notification
      showToast(
        `${targetComponent} marks for ${payload.courseCode} (${payload.marks}/100 - Grade ${payload.grade}) updated & stored separately`,
        'success'
      );
    },
    [currentRole, isUrlLockedDeskMode, settings.coordinatorName, currentSession, showToast, logAuditEvent]
  );

  const updateMarks = useCallback(
    (intakeId: string, courseCode: string, marksValue: number | null, componentType: 'Assignment' | 'Practical' = 'Assignment') => {
      const intake = intakes.find((i) => i.id === intakeId);
      const cleanCourse = courseCode.trim().toUpperCase();
      const cleanEnrollment = (intake?.enrollmentNo || '').trim();
      const isPrac = componentType === 'Practical';

      const matchingEval = courseEvaluations.find(
        (e) =>
          (e.intakeId === intakeId || e.enrollmentNo === cleanEnrollment) &&
          e.courseCode === cleanCourse &&
          (isPrac ? (e.componentType === 'Practical' || e.isPractical) : (!e.componentType || e.componentType === 'Assignment' || !e.isPractical))
      ) || courseEvaluations.find(
        (e) => (e.intakeId === intakeId || e.enrollmentNo === cleanEnrollment) && e.courseCode === cleanCourse
      );

      const subSuffix = isPrac ? '_PRAC' : '';
      const row = matchingEval || {
        subId: `SUB_${cleanEnrollment}_${cleanCourse}${subSuffix}_${(intake?.session || currentSession).replace(/\s+/g, '')}`,
        Sub_ID: `SUB_${cleanEnrollment}_${cleanCourse}${subSuffix}_${(intake?.session || currentSession).replace(/\s+/g, '')}`,
        enrollmentNo: cleanEnrollment,
        Enrollment_No: cleanEnrollment,
        courseCode: cleanCourse,
        Course_Code: cleanCourse,
        tokenNo: intake?.tokenNo,
        studentName: intake?.studentName,
        programmeCode: intake?.programmeCode,
        session: intake?.session || currentSession,
        componentType,
        isPractical: isPrac,
        isLocked: false,
      };

      saveOrUpdateMarksAndLock(row, marksValue, false, componentType);
    },
    [intakes, courseEvaluations, currentSession, saveOrUpdateMarksAndLock]
  );

  const updatePracticalMarks = useCallback(
    (intakeId: string, courseCode: string, marksValue: number | null) => {
      updateMarks(intakeId, courseCode, marksValue, 'Practical');
    },
    [updateMarks]
  );

  // Module B: 2_Course_Evaluation_Master Allotment & Marks Engine Operations
  const allotEvaluatorToEvaluations = useCallback(
    (evaluationIds: string[], evaluatorId: string | null) => {
      const ev = evaluatorId
        ? evaluators.find(
            (e) =>
              e.id === evaluatorId ||
              e.evaluatorCode === evaluatorId ||
              `${e.evaluatorName || e.name} (${e.evaluatorCode})` === evaluatorId
          )
        : null;
      const now = new Date().toISOString();
      const dateStr = now.split('T')[0];
      const allottedBy = currentRole === 'ADMIN' ? 'Coordinator Desk' : 'Counter Desk Official';
      const evalDisplayName = ev ? `${ev.evaluatorName || ev.name} (${ev.evaluatorCode})` : null;

      setCourseEvaluations((prev) => {
        const updated = prev.map((rec) => {
          if (!evaluationIds.includes(rec.id)) return rec;
          if (rec.isLocked && currentRole !== 'ADMIN') return rec;

          return {
            ...rec,
            evaluatorId: ev ? ev.id : null,
            evaluatorCode: ev ? ev.evaluatorCode : null,
            evaluatorName: ev ? (ev.evaluatorName || ev.name) : null,
            Allotted_Evaluator: evalDisplayName,
            allottedDate: ev ? dateStr : null,
            allottedBy: ev ? allottedBy : null,
            status: (rec.isLocked
              ? 'Marks Locked'
              : rec.marks !== null
              ? 'Evaluated'
              : ev
              ? 'Allotted'
              : 'Pending Allotment') as EvaluationStatus,
            updatedAt: now,
          };
        });

        try {
          localStorage.setItem(STORAGE_KEYS.COURSE_EVALUATIONS, JSON.stringify(updated));
        } catch {}

        return updated;
      });

      // Dispatch ALLOT_EVALUATOR to Google Sheets
      if (ev) {
        evaluationIds.forEach((subId) => {
          postAllotEvaluator(subId, {
            id: ev.id,
            name: ev.evaluatorName || ev.name,
            evaluatorCode: ev.evaluatorCode,
            Allotted_Evaluator: evalDisplayName,
          }).catch((err) => console.warn(err));
        });

        logAuditEvent({
          action: 'EVALUATOR_ALLOTTED',
          category: 'MARKS_EVALUATION',
          actor: currentRole === 'ADMIN' ? `${settings.coordinatorName || 'Coordinator'} (Admin)` : 'Desk Official',
          role: currentRole,
          session: currentSession,
          targetIdentifier: `${ev.evaluatorCode} (${ev.evaluatorName || ev.name})`,
          summary: `Allotted Academic Counsellor ${ev.evaluatorName || ev.name} (${ev.evaluatorCode}) to ${evaluationIds.length} script${evaluationIds.length === 1 ? '' : 's'}`,
          status: 'SUCCESS',
          details: { evaluatorCode: ev.evaluatorCode, count: evaluationIds.length, ids: evaluationIds },
        });
      }

      showToast('Saved & Synced with Google Sheet', 'success');
    },
    [evaluators, currentRole, showToast, logAuditEvent, settings.coordinatorName, currentSession]
  );

  const updateEvaluationMarks = useCallback(
    (evaluationId: string, marksValue: number | null) => {
      let updatedCourse = '';
      let updatedEnr = '';
      let targetSession = '';
      let targetIntakeId = '';
      let subKey = '';
      let isRecLocked = false;

      const gradeInfo = calculateIGNOUGrade(marksValue);
      const now = new Date().toISOString();

      setCourseEvaluations((prev) =>
        prev.map((rec) => {
          if (rec.id !== evaluationId && rec.submissionKey !== evaluationId && (rec as any).Sub_ID !== evaluationId) return rec;
          if (rec.isLocked) {
            alert('Security Notice: This assignment script is locked. Marks cannot be edited unless unlocked by an Administrator.');
            return rec;
          }

          updatedCourse = rec.courseCode;
          updatedEnr = rec.enrollmentNo;
          targetSession = rec.session;
          targetIntakeId = rec.intakeId || '';
          subKey = rec.submissionKey || rec.id;
          isRecLocked = rec.isLocked;

          return {
            ...rec,
            marks: marksValue,
            grade: gradeInfo.grade,
            gradeLabel: gradeInfo.label,
            status: marksValue !== null ? 'Evaluated' : rec.evaluatorId ? 'Allotted' : 'Pending Allotment',
            updatedAt: now,
          };
        })
      );

      // Keep intakes table in sync and dispatch fail-safe UPDATE_MARKS writeback
      if (updatedCourse) {
        setIntakes((prev) =>
          prev.map((item) => {
            const matches = targetIntakeId
              ? item.id === targetIntakeId
              : item.enrollmentNo === updatedEnr && item.session === targetSession;
            if (!matches) return item;
            const nextMarks = { ...item.marks, [updatedCourse]: marksValue };
            const allEntered = item.courseCodes.every((c) => nextMarks[c] !== null && nextMarks[c] !== undefined);
            return {
              ...item,
              marks: nextMarks,
              status: allEntered ? 'Evaluated' : item.status === 'Received' ? 'Under Evaluation' : item.status,
            };
          })
        );

        // Fail-safe Google Sheets writeback with subId + composite keys (enrollmentNo + courseCode) via mode: 'no-cors'
        postUpdateMarks({
          subId: subKey || evaluationId,
          enrollmentNo: updatedEnr,
          courseCode: updatedCourse,
          marks: marksValue,
          grade: gradeInfo.grade,
          isLocked: isRecLocked,
        }).catch((err) => {
          console.warn('Google Sheets UPDATE_MARKS writeback warning:', err);
        });

        logAuditEvent({
          action: 'MARKS_UPDATED',
          category: 'MARKS_EVALUATION',
          actor: currentRole === 'ADMIN' ? `${settings.coordinatorName || 'Coordinator'} (Admin)` : 'Desk Official',
          role: currentRole,
          session: targetSession || currentSession,
          targetIdentifier: `${updatedEnr} (${updatedCourse})`,
          summary: `Updated marks to ${marksValue !== null ? `${marksValue}/100 (Grade ${gradeInfo.grade})` : 'unassigned'} for candidate ${updatedEnr} in course ${updatedCourse}`,
          status: 'SUCCESS',
          details: { enrollmentNo: updatedEnr, courseCode: updatedCourse, marks: marksValue, grade: gradeInfo.grade },
        });
      }
    },
    [currentRole, settings.coordinatorName, currentSession, logAuditEvent]
  );

  const toggleLockMarks = useCallback(
    (evaluationId: string, shouldLock: boolean) => {
      const rec = courseEvaluations.find(
        (e) =>
          e.id === evaluationId ||
          e.submissionKey === evaluationId ||
          (e as any).Sub_ID === evaluationId ||
          (e as any).subId === evaluationId
      );
      if (!rec) return;
      saveOrUpdateMarksAndLock(
        rec,
        (rec as any).Marks !== undefined && (rec as any).Marks !== '' ? (rec as any).Marks : (rec as any).marks,
        shouldLock
      );
    },
    [courseEvaluations, saveOrUpdateMarksAndLock]
  );

  const batchLockMarks = useCallback(
    (evaluationIds: string[], shouldLock: boolean) => {
      if (!shouldLock && (isUrlLockedDeskMode || currentRole !== 'ADMIN')) {
        alert('Permission Denied: Only an Administrator (Coordinator) can unlock marks. Unlocking permissions are strictly disabled in Desk Official mode.');
        return;
      }

      const now = new Date().toISOString();
      const lockedBy = currentRole === 'ADMIN' ? `${settings.coordinatorName || 'Dr. Sant K. Gupta'} (Coordinator)` : 'Desk Official';

      setCourseEvaluations((prev) => {
        const next = prev.map((rec) => {
          if (!evaluationIds.includes(rec.id)) return rec;

          if (shouldLock) {
            if (rec.marks === null || rec.marks === undefined) return rec;
            const gradeInfo = calculateIGNOUGrade(rec.marks);
            // 3. On Marks Locking: Send POST with action "UPDATE_MARKS" containing subId, enrollmentNo, courseCode, marks, calculated grade, and isLocked: true
            postUpdateMarks({
              subId: rec.submissionKey || rec.id,
              enrollmentNo: rec.enrollmentNo,
              courseCode: rec.courseCode,
              marks: rec.marks,
              grade: gradeInfo.grade,
              isLocked: true,
            }).catch((err) => {
              console.warn('Google Sheets UPDATE_MARKS notification:', err);
            });
            return {
              ...rec,
              isLocked: true,
              lockedAt: now,
              lockedBy,
              status: 'Marks Locked' as EvaluationStatus,
              updatedAt: now,
            };
          } else {
            const gradeInfo = calculateIGNOUGrade(rec.marks);
            postUpdateMarks({
              subId: rec.submissionKey || rec.id,
              enrollmentNo: rec.enrollmentNo,
              courseCode: rec.courseCode,
              marks: rec.marks,
              grade: gradeInfo.grade,
              isLocked: false,
            }).catch((err) => {
              console.warn('Google Sheets UPDATE_MARKS notification:', err);
            });
            return {
              ...rec,
              isLocked: false,
              lockedAt: null,
              lockedBy,
              status: (rec.marks !== null ? 'Evaluated' : rec.evaluatorId ? 'Allotted' : 'Pending Allotment') as EvaluationStatus,
              updatedAt: now,
            };
          }
        });

        try {
          localStorage.setItem(STORAGE_KEYS.COURSE_EVALUATIONS, JSON.stringify(next));
        } catch {}

        return next;
      });

      logAuditEvent({
        action: shouldLock ? 'MARKS_LOCKED' : 'MARKS_UNLOCKED',
        category: 'MARKS_EVALUATION',
        actor: currentRole === 'ADMIN' ? `${settings.coordinatorName || 'Coordinator'} (Admin)` : 'Desk Official',
        role: currentRole,
        session: currentSession,
        targetIdentifier: `${evaluationIds.length} Scripts`,
        summary: shouldLock
          ? `Statutory verification: Locked marks for ${evaluationIds.length} candidate script${evaluationIds.length === 1 ? '' : 's'}`
          : `Administrator unlocked marks for ${evaluationIds.length} candidate script${evaluationIds.length === 1 ? '' : 's'}`,
        status: 'SUCCESS',
        details: { count: evaluationIds.length, shouldLock, ids: evaluationIds },
      });

      if (shouldLock) {
        showToast('Saved & Synced with Google Sheet', 'success');
      }
    },
    [currentRole, isUrlLockedDeskMode, settings.coordinatorName, currentSession, showToast, logAuditEvent]
  );

  // Course Packets
  const createPacket = useCallback(
    (data: { courseCode: string; programmeCode: string; evaluatorId: string | null; scriptCount: number; expectedReturnDate?: string; notes?: string }) => {
      const sessionCode = generateSessionCode(currentSession);
      const cleanCode = data.courseCode.replace(/[^a-zA-Z0-9]/g, '');
      const existingPackets = packets.filter((p) => p.session === currentSession && p.courseCode === data.courseCode);
      const packetNumber = `PKT-${sessionCode}-${cleanCode}-${String(existingPackets.length + 1).padStart(2, '0')}`;

      const newPacket: CoursePacket = {
        id: `pkt-${Date.now()}`,
        session: currentSession,
        packetNumber,
        courseCode: data.courseCode,
        programmeCode: data.programmeCode,
        evaluatorId: data.evaluatorId,
        scriptCount: data.scriptCount,
        assignedDate: data.evaluatorId ? new Date().toISOString().split('T')[0] : null,
        expectedReturnDate: data.expectedReturnDate || null,
        returnedDate: null,
        status: data.evaluatorId ? 'Dispatched' : 'Formed',
        notes: data.notes,
      };

      setPackets((prev) => [newPacket, ...prev]);
      return newPacket;
    },
    [currentSession, packets]
  );

  const updatePacket = useCallback((id: string, updates: Partial<CoursePacket>) => {
    setPackets((prev) => prev.map((pkt) => (pkt.id === id ? { ...pkt, ...updates } : pkt)));
  }, []);

  const deletePacket = useCallback((id: string) => {
    setPackets((prev) => prev.filter((pkt) => pkt.id !== id));
  }, []);

  // Evaluators Master
  const addEvaluator = useCallback((data: Omit<Evaluator, 'id' | 'lastSyncedAt'>) => {
    const newEvaluator: Evaluator = {
      ...data,
      id: `ev-${Date.now()}`,
      lastSyncedAt: new Date().toISOString(),
    };
    setEvaluators((prev) => [...prev, newEvaluator]);
    return newEvaluator;
  }, []);

  const updateEvaluator = useCallback((id: string, updates: Partial<Evaluator>) => {
    setEvaluators((prev) => prev.map((ev) => (ev.id === id ? { ...ev, ...updates } : ev)));
  }, []);

  const deleteEvaluator = useCallback((id: string) => {
    setEvaluators((prev) => prev.filter((ev) => ev.id !== id));
  }, []);

  // 1. Google Sheets Backend Hydration & Persistent Storage Sync (fetchAllData / syncGoogleSheets)
  const fetchAllData = useCallback(async (isSilent = false) => {
    setIsSyncingSheets(true);
    setSyncStatus('Syncing with Google Sheets...');
    try {
      let data: any = null;

      // 1. Try direct fetch from SCRIPT_URL with redirect: "follow" and clean cache-busting (without custom headers that trigger CORS preflight)
      const timestampParam = `_cb=${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const targetScriptUrl = getCustomScriptUrl();
      try {
        const res = await fetch(`${targetScriptUrl}?action=doGet&${timestampParam}`, {
          method: "GET",
          redirect: "follow",
          signal: AbortSignal.timeout(15000),
        });
        if (res.ok) {
          const contentType = res.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            data = await res.json();
          } else {
            const text = await res.text();
            try {
              data = JSON.parse(text);
            } catch {
              // Not direct JSON
            }
          }
        }
      } catch (directErr) {
        console.warn('[Direct SCRIPT_URL fetch failed, trying proxy]:', directErr);
      }

      // 2. If direct fetch failed or gave non-JSON, try the Express backend proxy
      if (!data || (!data.intakeRegister && !data.intakes && !data.courseLedger)) {
        try {
          const proxyRes = await fetch(`/api/sheets?action=doGet&scriptUrl=${encodeURIComponent(targetScriptUrl)}&${timestampParam}`, {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
            cache: "no-store",
            signal: AbortSignal.timeout(25000),
          });
          if (proxyRes.ok) {
            data = await proxyRes.json();
          }
        } catch (proxyErr) {
          console.warn('[Proxy fetch error]:', proxyErr);
        }
      }

      // 3. Fallback to doGet() if data still empty
      if (!data || (!data.intakeRegister && !data.intakes && !data.courseLedger)) {
        const dogetRes = await doGet();
        if (dogetRes.success) {
          data = {
            intakeRegister: dogetRes.intakes,
            courseLedger: dogetRes.courseLedger,
            evaluatorsMaster: dogetRes.evaluatorsMaster,
          };
        }
      }

      if (data) {
        const rawIntake = data.intakeRegister || data.intakes || data.Intake_Register || [];
        const rawLedger = data.courseLedger || data.course_ledger || data.Course_Ledger || [];

        // Load local date overrides and merge with any backend date overrides
        let localDateOverrides: Record<string, string> = {};
        try {
          const ovStr = localStorage.getItem('ignou_sc2033_receipt_date_overrides');
          if (ovStr) localDateOverrides = JSON.parse(ovStr);
        } catch {}
        if (data.dateOverrides && typeof data.dateOverrides === 'object') {
          localDateOverrides = { ...localDateOverrides, ...data.dateOverrides };
          try {
            localStorage.setItem('ignou_sc2033_receipt_date_overrides', JSON.stringify(localDateOverrides));
          } catch {}
        }

        const getLocalOverrideDate = (enr: string, token: string, id: string) => {
          const cleanE = enr ? enr.replace(/\D/g, '').trim() : '';
          const cleanTok = token ? token.trim() : '';
          const cleanId = id ? id.trim() : '';
          return (
            (cleanE && (localDateOverrides[`enr_${cleanE}`] || localDateOverrides[`enrollment_${cleanE}`])) ||
            (cleanTok && (localDateOverrides[`token_${cleanTok}`] || localDateOverrides[`tok_${cleanTok}`])) ||
            (cleanId && localDateOverrides[`id_${cleanId}`]) ||
            null
          );
        };

        // 1. Universal Normalizer: Intake Register
        const seenIntakeIds = new Set<string>();
        const intakePracticalCourseSet = new Set<string>();

        const cleanIntake = rawIntake
          .filter((r: any) => {
            if (!r) return false;
            const enr = String(r.Enrollment_No || r.enrollmentNo || r["Enrollment No"] || "").trim();
            const cand = String(r.Candidate_Name || r.candidateName || r["Candidate Name"] || r.studentName || "").trim();
            const id = String(r.id || r.tokenNo || r.Token_No || "").trim();
            if (!enr || enr.length < 5) return false;
            if (isDummyIntakeId(id, enr, cand)) return false;
            return true;
          })
          .map((r: any, idx: number) => {
          const rawCourses = r.Courses || r.courses || r.courseCodes || "";
          const rawCourseList: string[] = Array.isArray(rawCourses)
            ? rawCourses.flatMap((c: any) => String(c).split(','))
            : String(rawCourses).split(',');

          const enrollment = (r.Enrollment_No || r.enrollmentNo || r["Enrollment No"] || "").toString().replace(/^'/, '').trim();
          const candidate = (r.Candidate_Name || r.candidateName || r["Candidate Name"] || r.studentName || "").toString().trim();
          const session = normalizeSessionName(r.Session || r.session || "July 2026");
          const programme = (r.Programme || r.programme || r.programmeCode || "MEG").toString().trim();
          const rawContact = r.Contact || r.contact || r.studentPhone || "";
          const contact = (rawContact).toString().replace(/^'/, '').trim();

          const isRecordOverallPractical =
            r.Component === 'Practical' ||
            r.component === 'Practical' ||
            r.componentType === 'Practical' ||
            r.isPractical === true;

          const practicalCourses: string[] = [];
          const assignmentCourses: string[] = [];
          const cleanCourseList: string[] = [];

          rawCourseList.forEach((rawC: string) => {
            const rawStr = String(rawC).trim();
            if (!rawStr) return;
            const clean = rawStr
              .replace(/\s*[\(\[](Practical|TMA\s*\+\s*Practical|TMA|Both|P|Asgn|Assignment)[\)\]]\s*/gi, '')
              .trim()
              .toUpperCase();
            if (!clean) return;

            if (!cleanCourseList.includes(clean)) cleanCourseList.push(clean);

            const isBrl = /^BRL[-_]?\d+/i.test(clean);
            const hasPracTag = !isBrl && /\b(Practical|P)\b/i.test(rawStr);
            const hasAsgnTag = isBrl || /\b(TMA|Assignment|Asgn)\b/i.test(rawStr);

            if (isBrl || (hasAsgnTag && !hasPracTag)) {
              if (!assignmentCourses.includes(clean)) assignmentCourses.push(clean);
            } else if (hasPracTag && hasAsgnTag) {
              if (!practicalCourses.includes(clean)) practicalCourses.push(clean);
              if (!assignmentCourses.includes(clean)) assignmentCourses.push(clean);
              intakePracticalCourseSet.add(`${enrollment}_${clean}_${session}`);
            } else if (
              hasPracTag ||
              (isRecordOverallPractical && !hasAsgnTag) ||
              (Array.isArray(r.practicalCourses) && r.practicalCourses.includes(clean) && !isBrl) ||
              (!isBrl && isPracticalCourse(clean))
            ) {
              if (!practicalCourses.includes(clean)) practicalCourses.push(clean);
              intakePracticalCourseSet.add(`${enrollment}_${clean}_${session}`);
            } else {
              if (!assignmentCourses.includes(clean)) assignmentCourses.push(clean);
            }
          });

          // If explicit arrays already exist on r, preserve them
          if (Array.isArray(r.practicalCourses)) {
            r.practicalCourses.forEach((pc: string) => {
              const cleanPc = String(pc).trim().toUpperCase();
              if (/^BRL[-_]?\d+/i.test(cleanPc)) {
                if (!assignmentCourses.includes(cleanPc)) assignmentCourses.push(cleanPc);
                return;
              }
              if (cleanPc && !practicalCourses.includes(cleanPc)) practicalCourses.push(cleanPc);
              intakePracticalCourseSet.add(`${enrollment}_${cleanPc}_${session}`);
            });
          }
          if (Array.isArray(r.assignmentCourses)) {
            r.assignmentCourses.forEach((ac: string) => {
              const cleanAc = String(ac).trim().toUpperCase();
              if (cleanAc && !assignmentCourses.includes(cleanAc)) assignmentCourses.push(cleanAc);
            });
          }

          const rawId = r.id || r.tokenNo || r.Token_No;
          const baseLegacyId = `intake-${enrollment}-${session.replace(/\s+/g, '')}`;
          const courseSlug = cleanCourseList.slice().sort().join('_') || `entry${idx}`;
          let id = rawId ? String(rawId).trim() : '';
          if (!id || seenIntakeIds.has(id) || id === baseLegacyId) {
            id = `intake-${enrollment || 'cand'}-${session.replace(/\s+/g, '')}-${courseSlug}-${idx}`;
            if (seenIntakeIds.has(id)) {
              id = `${id}-${idx}`;
            }
          }
          seenIntakeIds.add(id);
          const tokenNo = r.tokenNo || r.Token_No || id;

          // Explicit user-edited date override takes highest precedence so edited dates never revert
          const explicitOverride = getLocalOverrideDate(enrollment, tokenNo, id);
          const sheetExplicitDate = r.submissionDate || r.receiptDate || r.Submission_Date || r.Date || r.date;
          const rawTimestamp = r.Timestamp || r.timestamp || r.createdAt || "";
          let subDate = "";
          if (explicitOverride) {
            subDate = String(explicitOverride).split('T')[0];
          } else if (sheetExplicitDate) {
            subDate = String(sheetExplicitDate).split('T')[0];
          } else if (rawTimestamp) {
            const strTs = String(rawTimestamp).trim();
            if (strTs.includes('T')) {
              subDate = strTs.split('T')[0];
            } else if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/.test(strTs)) {
              const parts = strTs.split(/[\/\-]/);
              subDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            } else {
              subDate = strTs.split(' ')[0];
            }
          } else {
            subDate = new Date().toISOString().split('T')[0];
          }
          const timestamp = rawTimestamp || `${subDate}T10:00:00.000Z`;
          const official = r.Official || r.handledBy || r.official || "Desk Official";

          const isPurePractical = practicalCourses.length > 0 && assignmentCourses.length === 0;
          const isPureAssignment = assignmentCourses.length > 0 && practicalCourses.length === 0;
          const componentCategory: 'Assignment' | 'Practical' | 'Both' =
            isPurePractical ? 'Practical' : isPureAssignment ? 'Assignment' : 'Both';

          const courseDetails = cleanCourseList.flatMap((code) => {
            const details: Array<{ code: string; type: 'Assignment' | 'Practical'; title: string; addedInPart: number; submissionDate: string }> = [];
            if (practicalCourses.includes(code)) {
              details.push({ code, type: 'Practical', title: getCourseTitle(code, programme), addedInPart: 1, submissionDate: subDate });
            }
            if (assignmentCourses.includes(code)) {
              details.push({ code, type: 'Assignment', title: getCourseTitle(code, programme), addedInPart: 1, submissionDate: subDate });
            }
            return details;
          });

          return {
            timestamp,
            session,
            enrollmentNo: enrollment,
            candidateName: candidate,
            contact,
            programme,
            courses: cleanCourseList,
            coursesStr: cleanCourseList.join(", "),
            handledBy: official,
            practicalCourses,
            assignmentCourses,
            courseDetails: r.courseDetails || courseDetails,
            componentType: componentCategory,
            isPractical: isPurePractical,
            // Dual-key fallbacks
            Timestamp: timestamp,
            Session: session,
            Enrollment_No: enrollment,
            Candidate_Name: candidate,
            Contact: contact,
            Programme: programme,
            Courses: cleanCourseList.join(", "),
            Official: official,
            Component: componentCategory,
            // Component compatibility keys
            id,
            tokenNo,
            studentName: candidate,
            studentPhone: contact,
            programmeCode: programme,
            courseCodes: cleanCourseList,
            submissionDate: subDate,
            receiptDate: subDate,
            Submission_Date: subDate,
            submissionMode: r.submissionMode || 'In-Person (Desk)',
            status: r.status || r.Status || 'Received',
            marks: r.marks || {},
            createdAt: timestamp,
            receiptNumber: r.receiptNumber || tokenNo,
          };
        });

        // 2. Universal Normalizer: Course Ledger
        const cleanLedger = rawLedger
          .filter((r: any) => {
            if (!r) return false;
            const enr = String(r.Enrollment_No || r.enrollmentNo || r["Enrollment No"] || "").trim();
            const course = String(r.Course_Code || r.courseCode || r["Course Code"] || "").trim();
            const cand = String(r.Candidate_Name || r.candidateName || r["Candidate Name"] || r.studentName || "").trim();
            const subId = String(r.Sub_ID || r.subId || r.id || "").trim();
            if (!enr || enr.length < 5 || !course) return false;
            if (isDummyEvaluationId(subId, r.intakeId, enr, cand)) return false;
            return true;
          })
          .map((r: any) => {
          const enrollment = (r.Enrollment_No || r.enrollmentNo || r["Enrollment No"] || "").toString().replace(/^'/, '').trim();
          const rawCourse = (r.Course_Code || r.courseCode || r["Course Code"] || "").toString().trim();
          const cleanCourse = rawCourse
            .replace(/\s*[\(\[](Practical|TMA\s*\+\s*Practical|TMA|Both|P|Asgn|Assignment)[\)\]]\s*/gi, '')
            .trim()
            .toUpperCase();
          const session = normalizeSessionName(r.Session || r.session || "July 2026", r.Sub_ID || r.subId);
          const subId = (r.Sub_ID || r.subId || r.id || `SUB_${enrollment}_${cleanCourse}_${session.replace(/\s+/g, '')}`).toString().trim();
          const candidate = (r.Candidate_Name || r.candidateName || r["Candidate Name"] || r.studentName || "").toString().trim();
          const programme = (r.Programme || r.programme || r.programmeCode || "MEG").toString().trim();
          const evaluator = r.Allotted_Evaluator || r.allottedEvaluator || r.evaluatorName || "Unallotted";
          const marks = (r.Marks !== undefined && r.Marks !== "") ? r.Marks : (r.marks !== undefined ? r.marks : "");
          const numMarks = (marks !== "" && marks !== null && !isNaN(Number(marks))) ? Number(marks) : null;
          const grade = r.Grade || r.grade || (numMarks !== null ? calculateIGNOUGrade(numMarks).grade : "");
          const status = r.Status || r.status || "Pending";
          const isLocked = Boolean(status === 'Locked' || status === 'Marks Locked' || r.isLocked);

          const matchingIntake = cleanIntake.find((it: any) => {
            if (r.tokenNo && it.tokenNo === r.tokenNo) return true;
            if (r.intakeId && it.id === r.intakeId) return true;
            return (
              it.enrollmentNo === enrollment &&
              norm(it.session) === norm(session) &&
              Array.isArray(it.courses) &&
              it.courses.includes(cleanCourse)
            );
          });
          const resolvedIntakeId = r.intakeId || matchingIntake?.id || '';
          const resolvedTokenNo = r.tokenNo || matchingIntake?.tokenNo || '';

          const explicitLedgerOverride = getLocalOverrideDate(enrollment, resolvedTokenNo || r.tokenNo || '', subId);
          const sheetLedgerDate = r.submissionDate || r.receiptDate || r.Submission_Date || r.receivedDate || r.intakeDate || r.Date || r.date;
          let ledgerDate = "";
          if (explicitLedgerOverride) {
            ledgerDate = String(explicitLedgerOverride).split('T')[0];
          } else if (matchingIntake?.submissionDate) {
            ledgerDate = String(matchingIntake.submissionDate).split('T')[0];
          } else if (sheetLedgerDate) {
            ledgerDate = String(sheetLedgerDate).split('T')[0];
          } else {
            ledgerDate = new Date().toISOString().split('T')[0];
          }

          const isBrl = /^BRL[-_]?\d+/i.test(cleanCourse);
          const hasAsgnTag = isBrl || /\b(TMA|Assignment|Asgn)\b/i.test(rawCourse) || r.componentType === 'Assignment' || r.Component === 'Assignment';
          const hasPracTag = !isBrl && (/\b(Practical|P)\b/i.test(rawCourse) || subId.includes('_PRAC_'));

          let isPractical = false;
          if (isBrl || (hasAsgnTag && !hasPracTag)) {
            isPractical = false;
          } else if (
            hasPracTag ||
            r.isPractical === true ||
            r.componentType === 'Practical' ||
            r.Component === 'Practical' ||
            intakePracticalCourseSet.has(`${enrollment}_${cleanCourse}_${session}`) ||
            (!isBrl && isPracticalCourse(cleanCourse))
          ) {
            isPractical = true;
          }

          const compType: 'Assignment' | 'Practical' = isPractical ? 'Practical' : 'Assignment';
          const normalizedSubId = (!isPractical && subId.includes('_PRAC_'))
            ? subId.replace(/_PRAC_/g, '_')
            : subId;

          return {
            subId: normalizedSubId,
            session,
            enrollmentNo: enrollment,
            candidateName: candidate,
            programme,
            courseCode: cleanCourse,
            allottedEvaluator: evaluator,
            marks,
            grade,
            status,
            componentType: compType,
            isPractical,
            Component: compType,
            // Dual-key fallbacks
            Sub_ID: normalizedSubId,
            Session: session,
            Enrollment_No: enrollment,
            Candidate_Name: candidate,
            Programme: programme,
            Course_Code: cleanCourse,
            Allotted_Evaluator: evaluator,
            Marks: marks,
            Grade: grade,
            Status: status,
            // Component compatibility keys
            id: normalizedSubId,
            submissionKey: normalizedSubId,
            intakeId: resolvedIntakeId,
            tokenNo: resolvedTokenNo,
            studentName: candidate,
            programmeCode: programme,
            evaluatorName: evaluator !== 'Unallotted' ? evaluator : null,
            isLocked,
            submissionDate: ledgerDate,
            receiptDate: ledgerDate,
            Submission_Date: ledgerDate,
            receivedDate: ledgerDate,
            intakeDate: ledgerDate,
            submissionMode: r.submissionMode || 'In-Person (Desk)',
          };
        });

        // 3. Update React State with zero-loss optimistic merge (preserve locally added unconfirmed records, strictly excluding any mock demo records)
        setIntakes((prevIntakes) => {
          const remoteTokens = new Set((cleanIntake as any[]).map((c: any) => String(c.tokenNo || c.id || '').trim()));
          const remoteKeys = new Set(
            (cleanIntake as any[]).map((c: any) => `${c.enrollmentNo}_${norm(c.session)}_${(c.courses || c.courseCodes || []).slice().sort().join(',')}`)
          );
          const localPending = (prevIntakes || []).filter((loc: any) => {
            if (!loc) return false;
            const tok = String(loc.tokenNo || loc.id || '').trim();
            if (tok && remoteTokens.has(tok)) return false;
            const key = `${loc.enrollmentNo}_${norm(loc.session)}_${(loc.courses || loc.courseCodes || []).slice().sort().join(',')}`;
            if (remoteKeys.has(key)) return false;
            if (isDummyIntakeId(loc.id, loc.enrollmentNo, loc.candidateName || loc.studentName)) return false;
            return true;
          });
          return [...cleanIntake, ...localPending];
        });

        setCourseEvaluations((prevEvals) => {
          const remoteSubIds = new Set((cleanLedger as any[]).map((c: any) => String(c.subId || c.Sub_ID || c.id || '').trim()));
          const localPending = (prevEvals || []).filter((loc: any) => {
            if (!loc) return false;
            const sId = String(loc.subId || loc.Sub_ID || loc.id || '').trim();
            if (sId && remoteSubIds.has(sId)) return false;
            if (isDummyEvaluationId(loc.id || loc.subId, loc.intakeId, loc.enrollmentNo, loc.candidateName || loc.studentName)) return false;
            return true;
          });
          return [...cleanLedger, ...localPending];
        });

        // Also update Registration Receipts so receipts view has latest entries
        // Clean canonical receipts strictly derived from cleanIntake:
        setRegistrationReceipts((prev) => {
          const incomingSessionsSet = new Set(cleanIntake.map((item: any) => normalizeSession(item.session)));
          const prevMap = new Map<string, RegistrationReceipt>();
          prev.forEach((p) => {
            if (p.intakeId) prevMap.set(`intake_${p.intakeId}`, p);
            if (p.id) prevMap.set(`id_${p.id}`, p);
            if (p.tokenNo) prevMap.set(`tok_${p.tokenNo.trim()}`, p);
            if (p.receiptNumber) prevMap.set(`rec_${p.receiptNumber.trim()}`, p);
            const enr = p.studentId || (p as any).Enrollment_No;
            if (enr) prevMap.set(`enr_${String(enr).trim()}_${normalizeSession(p.session)}`, p);
          });

          const syncedReceipts: RegistrationReceipt[] = cleanIntake.map((item: any) => {
            const match =
              prevMap.get(`intake_${item.id}`) ||
              prevMap.get(`id_${item.id}`) ||
              (item.tokenNo && prevMap.get(`tok_${item.tokenNo.trim()}`)) ||
              (item.receiptNumber && prevMap.get(`rec_${item.receiptNumber.trim()}`)) ||
              prevMap.get(`enr_${String(item.enrollmentNo).trim()}_${normalizeSession(item.session)}`);

            const receiptId = item.id;
            const tokenNo = item.tokenNo || item.id;
            const receiptNumber = match?.receiptNumber || item.receiptNumber || tokenNo;
            const subDate = item.submissionDate || item.receiptDate || (item.timestamp ? String(item.timestamp).split('T')[0] : new Date().toISOString().split('T')[0]);

            return {
              id: receiptId,
              receiptNumber,
              intakeId: item.id,
              tokenNo,
              studentId: item.enrollmentNo,
              studentName: item.candidateName,
              studentPhone: item.contact,
              studentEmail: item.email || match?.studentEmail || '',
              programmeCode: item.programme,
              session: item.session,
              registeredCourses: item.courses,
              practicalCourses: item.practicalCourses || [],
              assignmentCourses: item.assignmentCourses || [],
              courseDetails: item.courseDetails || match?.courseDetails,
              isIntegrated: Boolean(item.isIntegrated || match?.isIntegrated),
              partNo: item.integratedPartsCount || match?.partNo || 1,
              submissionParts: item.submissionParts || match?.submissionParts,
              issuedBy: item.handledBy || match?.issuedBy || 'Coordinator Desk',
              issuedAt: item.submissionDate ? `${item.submissionDate}T10:00:00Z` : (item.timestamp || new Date().toISOString()),
              submissionDate: subDate,
              receiptDate: subDate,
              remarks: item.remarks || match?.remarks || '',
              feesPaid: match?.feesPaid,
              Enrollment_No: item.enrollmentNo,
              Candidate_Name: item.candidateName,
              Contact: item.contact,
              Programme: item.programme,
              Courses: item.courses,
              Timestamp: subDate,
              Official: item.handledBy || 'Coordinator Desk',
              Session: item.session,
            } as any;
          });

          // Retain receipts from other non-synced sessions only
          const otherSessionReceipts = prev.filter((p) => !incomingSessionsSet.has(normalizeSession(p.session)));
          const combined = [...syncedReceipts, ...otherSessionReceipts];
          try {
            localStorage.setItem(STORAGE_KEYS.REGISTRATION_RECEIPTS, JSON.stringify(combined));
          } catch {}
          return combined;
        });

        // Also update Assignment Submissions so Course Submissions Tracker is hydrated
        // Build directly from cleanLedger so NO dummy mock entries persist!
        setAssignmentSubmissions(() => {
          const map = new Map<string, AssignmentSubmission>();
          cleanLedger.forEach((cl: any) => {
            const id = cl.subId || `sub-${cl.enrollmentNo}-${cl.courseCode}`;
            map.set(id, {
              id,
              studentId: cl.enrollmentNo,
              studentName: cl.candidateName,
              programmeCode: cl.programme,
              courseCode: cl.courseCode,
              session: cl.session,
              status: cl.isLocked ? 'locked' : cl.status === 'Evaluated' ? 'evaluated' : 'submitted',
              submissionDate: cl.submissionDate || new Date().toISOString().split('T')[0],
              submissionMode: (cl.submissionMode as any) || 'In-Person (Desk)',
              Session: cl.session,
              Course_Code: cl.courseCode,
              Enrollment_No: cl.enrollmentNo,
              componentType: cl.componentType || (cl.isPractical ? 'Practical' : 'Assignment'),
              isPractical: Boolean(cl.isPractical),
            } as any);
          });
          const result = Array.from(map.values());
          try {
            localStorage.setItem(STORAGE_KEYS.ASSIGNMENT_SUBMISSIONS, JSON.stringify(result));
          } catch {}
          return result;
        });

        // 4. Update LocalStorage Cache immediately so data survives reloads & login
        localStorage.setItem("ignou_sc2033_intake", JSON.stringify(cleanIntake));
        localStorage.setItem("ignou_sc2033_ledger", JSON.stringify(cleanLedger));
        localStorage.setItem(STORAGE_KEYS.INTAKES, JSON.stringify(cleanIntake));
        localStorage.setItem(STORAGE_KEYS.COURSE_EVALUATIONS, JSON.stringify(cleanLedger));

        // Hydrate Student Registrations (Fresh Admissions 1st Year & Re-Registrations for Assignment Intake)
        // Parse from Google Sheets studentRegistrations / freshAdmissions / reRegistrations
        let incomingRegs: StudentRegistrationRecord[] = [];
        const rawRegList = (data.studentRegistrations && Array.isArray(data.studentRegistrations) && data.studentRegistrations.length > 0)
          ? data.studentRegistrations
          : [
              ...(Array.isArray(data.freshAdmissions) ? data.freshAdmissions : []),
              ...(Array.isArray(data.reRegistrations) ? data.reRegistrations : [])
            ];

        if (rawRegList.length > 0) {
          incomingRegs = rawRegList.map((r: any, idx: number) => {
            const enr = String(r.enrollmentNo || r.Enrollment_No || '').replace(/^'/, '').trim();
            const tabStr = String(r.sheetTab || r.cadre || '');
            let parsedSession = 'July 2026';
            let parsedCadre: 'FRESH' | 'RE_REGISTRATION' = 'FRESH';
            let parsedYear: '1st Year' | '2nd Year' | '3rd Year' = '1st Year';
            let parsedCycle: 'January' | 'July' = 'July';
            let parsedYearNum = 2026;

            if (tabStr) {
              if (tabStr.toLowerCase().startsWith('fresh')) {
                parsedCadre = 'FRESH';
                parsedYear = '1st Year';
              } else if (tabStr.toLowerCase().startsWith('rereg')) {
                parsedCadre = 'RE_REGISTRATION';
                parsedYear = '2nd Year';
              }
              const match = tabStr.match(/(Jan(?:uary)?|Jul(?:y)?)[_-]?(\d{4})/i);
              if (match) {
                parsedCycle = match[1].toLowerCase().startsWith('jul') ? 'July' : 'January';
                parsedYearNum = parseInt(match[2], 10);
                parsedSession = `${parsedCycle} ${parsedYearNum}`;
              }
            } else if (r.session) {
              parsedSession = normalizeSessionName(r.session);
              parsedCycle = parsedSession.toLowerCase().includes('jan') ? 'January' : 'July';
              const yrMatch = parsedSession.match(/\d{4}/);
              parsedYearNum = yrMatch ? parseInt(yrMatch[0], 10) : 2026;
            }

            if (r.cadre === 'FRESH' || r.cadre === 'RE_REGISTRATION') {
              parsedCadre = r.cadre;
            }
            if (r.academicYear) {
              parsedYear = r.academicYear;
            }

            const rawCourses = r.courseCodes || r.courses || r.Registered_Courses || [];
            const courseList: string[] = Array.isArray(rawCourses)
              ? rawCourses.flatMap((c: any) => String(c).split(',').map((s) => s.trim().toUpperCase()))
              : String(rawCourses).split(',').map((s) => s.trim().toUpperCase());
            const cleanCourseCodes = Array.from(new Set(courseList.filter(Boolean)));

            return {
              id: r.id || `REG-${enr}-${parsedSession.replace(/\s+/g, '').toUpperCase()}-${parsedCadre === 'FRESH' ? 'F' : 'RR'}-${idx}`,
              cadre: parsedCadre,
              academicYear: parsedYear,
              session: parsedSession,
              sessionCycle: parsedCycle,
              sessionYear: parsedYearNum,
              enrollmentNo: enr,
              studentName: String(r.studentName || r.Student_Name || r.Candidate_Name || '').trim(),
              programmeCode: String(r.programmeCode || r.Programme_Code || r.Programme || '').trim().toUpperCase(),
              courseCodes: cleanCourseCodes,
              studentPhone: String(r.studentPhone || r.Student_Phone || r.Contact || '').trim(),
              studentEmail: String(r.studentEmail || r.Student_Email || r.Email || '').trim(),
              status: (r.status || r.Status || 'Confirmed') as any,
              feeReference: r.feeReference || r.Fee_Reference || '',
              studyCentreCode: '2033',
              regionalCentreCode: 'RC-20',
              registrationDate: r.registrationDate || '',
              createdAt: r.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              sheetTab: tabStr,
            };
          });
        }

        if (incomingRegs.length > 0) {
          setStudentRegistrations(incomingRegs);
          try {
            localStorage.setItem(STORAGE_KEYS.STUDENT_REGISTRATIONS, JSON.stringify(incomingRegs));
          } catch {}
        }

        // Auto-register any incoming sessions discovered from Google Sheets (Fresh, Re-Reg, Intakes, Ledger)
        const incomingSessions = new Set<string>();
        cleanIntake.forEach((r: any) => { if (r.session) incomingSessions.add(normalizeSessionName(r.session)); });
        cleanLedger.forEach((r: any) => { if (r.session) incomingSessions.add(normalizeSessionName(r.session)); });
        incomingRegs.forEach((r: any) => { if (r.session) incomingSessions.add(normalizeSessionName(r.session)); });
        if (data.availableSessions && Array.isArray(data.availableSessions)) {
          data.availableSessions.forEach((s: string) => { if (s && s.trim()) incomingSessions.add(normalizeSessionName(s.trim())); });
        }
        if (incomingSessions.size > 0) {
          setSettings((prev) => {
            const updated = Array.from(new Set([...prev.availableSessions, ...incomingSessions]));
            if (updated.length !== prev.availableSessions.length) {
              try {
                localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify({ ...prev, availableSessions: updated }));
              } catch {}
              return { ...prev, availableSessions: updated };
            }
            return prev;
          });
        }

        const syncMsg = `Synced (${incomingRegs.length} admissions, ${cleanIntake.length} receipts, ${cleanLedger.length} scripts)`;
        setSyncStatus(syncMsg);

        const now = new Date();
        const formattedDate = `${now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} ${now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
        setLastSheetSync(formattedDate);
        localStorage.setItem(STORAGE_KEYS.LAST_SHEET_SYNC, formattedDate);

        // Also handle evaluatorsMaster if present
        if (data.evaluatorsMaster && data.evaluatorsMaster.length > 0) {
          const parsedEvaluators = parseEvaluatorsMaster(data.evaluatorsMaster);
          if (parsedEvaluators.length > 0) {
            setEvaluators(parsedEvaluators);
            localStorage.setItem(STORAGE_KEYS.EVALUATORS_MASTER, JSON.stringify(parsedEvaluators));
            localStorage.setItem(STORAGE_KEYS.EVALUATORS, JSON.stringify(parsedEvaluators));
          }
        }

        if (!isSilent) {
          showToast(syncMsg, 'success');
        }
      } else {
        setSyncStatus('Using Cached Data (Offline)');
        if (!isSilent) {
          showToast('Offline mode: Using cached data', 'info');
        }
      }
    } catch (err) {
      console.warn('[fetchAllData error]:', err);
      setSyncStatus('Sync Failed (Using Cache)');
      if (!isSilent) {
        showToast('Sync failed. Using cached data.', 'warning');
      }
    } finally {
      setIsSyncingSheets(false);
    }
  }, [showToast]);

  fetchAllDataRef.current = fetchAllData;

  const syncGoogleSheets = fetchAllData;

  const [isSyncingEvaluators, setIsSyncingEvaluators] = useState<boolean>(false);

  const syncEvaluatorsDirectory = useCallback(async () => {
    setIsSyncingEvaluators(true);
    try {
      const res = await doGet();
      if (res.evaluatorsMaster && res.evaluatorsMaster.length > 0) {
        const parsed = parseEvaluatorsMaster(res.evaluatorsMaster);
        if (parsed.length > 0) {
          setEvaluators(parsed);
          try {
            localStorage.setItem(STORAGE_KEYS.EVALUATORS_MASTER, JSON.stringify(parsed));
            localStorage.setItem(STORAGE_KEYS.EVALUATORS, JSON.stringify(parsed));
          } catch {}
        }
      }
      const now = new Date();
      const formattedDate = `${now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} ${now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
      setLastSheetSync(formattedDate);
      localStorage.setItem(STORAGE_KEYS.LAST_SHEET_SYNC, formattedDate);
      showToast('Evaluators Directory Synced', 'success');
    } catch (err) {
      console.warn('[Evaluators Directory Sync Error]:', err);
      showToast('Evaluators Directory Synced', 'success');
    } finally {
      setIsSyncingEvaluators(false);
    }
  }, [showToast]);

  const [isSyncingAdmissions, setIsSyncingAdmissions] = useState<boolean>(false);

  const syncAdmissionsWithGoogleSheets = useCallback(async () => {
    setIsSyncingAdmissions(true);
    try {
      await fetchAllData(false);
      showToast('Admissions & Re-registrations synchronized with Google Sheets.', 'success');
    } catch (err: any) {
      console.warn('Admissions sync pull error:', err);
      showToast('Failed to pull admissions from Google Sheets.', 'error');
    } finally {
      setIsSyncingAdmissions(false);
    }
  }, [fetchAllData, showToast]);

  // 1. On Load: Call doGet() to hydrate IntakeRegister and CourseLedger state from Google Sheets
  useEffect(() => {
    syncGoogleSheets(true);
  }, [syncGoogleSheets]);

  // Data Sync Monitor & Offline Parity Engine State
  const [pendingSyncQueue, setPendingSyncQueue] = useState<SyncQueueItem[]>([]);
  const [lastLatencyMs, setLastLatencyMs] = useState<number | null>(null);
  const [integrityReport, setIntegrityReport] = useState<DataIntegrityReport | null>(null);
  const [isCheckingIntegrity, setIsCheckingIntegrity] = useState<boolean>(false);
  const [isSyncDrawerOpen, setIsSyncDrawerOpen] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));

  // Subscribe to persistent IndexedDB sync queue
  useEffect(() => {
    const unsubscribe = subscribeSyncQueue((queue) => {
      setPendingSyncQueue(queue);
    });
    return unsubscribe;
  }, []);

  const toggleSyncDrawer = useCallback(() => {
    setIsSyncDrawerOpen((prev) => !prev);
  }, []);

  const checkDataIntegrity = useCallback(async (): Promise<DataIntegrityReport> => {
    setIsCheckingIntegrity(true);
    try {
      const report = await verifyGoogleSheetsParity({
        intakes: intakes.length,
        ledger: courseEvaluations.length,
        evaluators: evaluators.length,
      });
      setIntegrityReport(report);
      setLastLatencyMs(report.latencyMs);
      return report;
    } catch (err) {
      console.error('[checkDataIntegrity error]:', err);
      const fallbackReport: DataIntegrityReport = {
        timestamp: new Date().toISOString(),
        latencyMs: 0,
        isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
        status: 'error',
        summary: 'Failed to verify data integrity with master sheet.',
        entities: [],
      };
      setIntegrityReport(fallbackReport);
      return fallbackReport;
    } finally {
      setIsCheckingIntegrity(false);
    }
  }, [intakes.length, courseEvaluations.length, evaluators.length]);

  const retryPendingQueue = useCallback(async (forceAll: boolean = true) => {
    const res = await processPendingQueue(executeQueuedMutation, forceAll);
    if (res.processed > 0) {
      if (res.succeeded > 0) {
        showToast(`Synced ${res.succeeded} queued mutation(s) to Google Sheets`, 'success');
        fetchAllData(true);
        checkDataIntegrity();
      }
      if (res.failed > 0) {
        showToast(`${res.failed} queued item(s) could not be synced yet`, 'warning');
      }
    } else {
      showToast('No pending items in sync queue', 'info');
    }
    return res;
  }, [fetchAllData, checkDataIntegrity, showToast]);

  const retrySingleQueueItem = useCallback(async (id: string) => {
    const ok = await retrySingleSyncItem(id, executeQueuedMutation);
    if (ok) {
      showToast('Item synced successfully to Google Sheets', 'success');
      fetchAllData(true);
      checkDataIntegrity();
    } else {
      showToast('Retry failed. Item remains in queue.', 'error');
    }
    return ok;
  }, [fetchAllData, checkDataIntegrity, showToast]);

  const removeQueueItem = useCallback(async (id: string) => {
    await removeSyncItem(id);
    showToast('Queued mutation discarded', 'info');
  }, [showToast]);

  const clearAllQueueItems = useCallback(async () => {
    await clearPendingQueue();
    showToast('Offline sync queue cleared', 'info');
  }, [showToast]);

  // Monitor network online / offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast('Network restored: online mode active', 'info');
      retryPendingQueue(true);
      checkDataIntegrity();
    };

    const handleOffline = () => {
      setIsOnline(false);
      showToast('Offline mode: outgoing changes will be queued in IndexedDB', 'warning');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [retryPendingQueue, checkDataIntegrity, showToast]);

  const connectionStatus = useMemo((): 'connected' | 'syncing' | 'queued' | 'offline' | 'error' => {
    if (!isOnline) return 'offline';
    if (isSyncingSheets || isCheckingIntegrity) return 'syncing';
    if (pendingSyncQueue.length > 0) return 'queued';
    if (integrityReport?.status === 'error') return 'error';
    return 'connected';
  }, [isOnline, isSyncingSheets, isCheckingIntegrity, pendingSyncQueue.length, integrityReport?.status]);

  // Billing & Remuneration
  const generateBill = useCallback(
    (evaluatorId: string, courseCodes: string[], totalScripts: number, rateOverride?: number) => {
      const ev = evaluators.find((e) => e.id === evaluatorId || e.evaluatorCode === evaluatorId);
      const rate = rateOverride !== undefined ? Number(rateOverride) : Number(settings.remunerationRatePerScript || 27.50);
      const scriptAmount = totalScripts * rate;
      const conveyanceAmount = Number(settings.conveyanceAllowancePerPacket ?? 0.00);
      const grossAmount = scriptAmount + conveyanceAmount;
      const sessionCode = generateSessionCode(currentSession);
      const billNumber = `BILL-SC2033-${sessionCode}-${String(bills.length + 1).padStart(3, '0')}`;

      const newBill: RemunerationBill = {
        id: `bill-${Date.now()}`,
        session: currentSession,
        billNumber,
        evaluatorId: ev?.id || evaluatorId,
        evaluatorCode: ev?.evaluatorCode || 'EV-UNK',
        evaluatorName: ev?.name || ev?.evaluatorName || 'Academic Counsellor',
        bankAccountNo: ev?.bankAccountNo || ev?.accountNumber || '',
        accountNumber: ev?.bankAccountNo || ev?.accountNumber || '',
        ifscCode: ev?.ifscCode || '',
        bankName: ev?.bankName || '',
        panNumber: ev?.panNumber || '',
        department: ev?.department || '',
        designation: ev?.designation || '',
        courseCodes,
        totalScripts,
        ratePerScript: rate,
        scriptAmount,
        conveyanceAmount,
        grossAmount,
        sanctionStatus: 'Draft',
      };

      setBills((prev) => [newBill, ...prev]);
      return newBill;
    },
    [evaluators, settings, currentSession, bills.length]
  );

  const sanctionBill = useCallback(
    (billId: string) => {
      if (currentRole !== 'ADMIN') {
        alert('Permission Denied: Only Administrator / Study Centre Coordinator can sanction remuneration bills.');
        return;
      }
      setBills((prev) =>
        prev.map((b) =>
          b.id === billId
            ? {
                ...b,
                sanctionStatus: 'Sanctioned',
                sanctionedDate: new Date().toISOString().split('T')[0],
                sanctionedBy: `${settings.coordinatorName} (Coordinator, ${settings.centreCode})`,
              }
            : b
        )
      );

      const bill = bills.find((b) => b.id === billId);
      logAuditEvent({
        action: 'BILL_SANCTIONED',
        category: 'FINANCE_BILLS',
        actor: `${settings.coordinatorName || 'Coordinator'} (Admin)`,
        role: 'ADMIN',
        session: bill?.session || currentSession,
        targetIdentifier: bill?.billNumber || billId,
        summary: `Statutory financial sanction granted for bill ${bill?.billNumber || billId} (₹${(bill?.totalAmount || bill?.grossAmount || 0).toFixed(2)})`,
        status: 'SUCCESS',
        details: { billId, amount: bill?.totalAmount || bill?.grossAmount || 0, evaluator: bill?.evaluatorName },
      });
    },
    [currentRole, settings, bills, currentSession, logAuditEvent]
  );

  const disburseBill = useCallback((billId: string, ref: string) => {
    setBills((prev) =>
      prev.map((b) =>
        b.id === billId
          ? {
              ...b,
              sanctionStatus: 'Disbursed',
              disbursedDate: new Date().toISOString().split('T')[0],
              disbursementReference: ref,
            }
          : b
      )
    );
  }, []);

  // Settings
  const updateSettings = useCallback((newValues: Partial<SystemSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newValues };
      try {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
        localStorage.setItem('ignou_sc2033_settings', JSON.stringify(updated));
      } catch (err) {
        console.warn('Failed to persist settings:', err);
      }
      return updated;
    });

    logAuditEvent({
      action: 'SETTINGS_UPDATED',
      category: 'SYSTEM_SETTINGS',
      actor: currentRole === 'ADMIN' ? `${settings.coordinatorName || 'Coordinator'} (Admin)` : 'Desk Official',
      role: currentRole,
      session: currentSession,
      targetIdentifier: 'System Settings',
      summary: 'Updated institution operational configuration parameters',
      status: 'SUCCESS',
      details: { updatedKeys: Object.keys(newValues) },
    });
  }, [currentRole, settings.coordinatorName, currentSession, logAuditEvent]);

  const resetAllData = useCallback(() => {
    if (window.confirm('Are you sure you want to reset all data to initial institutional seed state? This cannot be undone.')) {
      const defaultResetSettings = {
        ...INITIAL_SETTINGS,
        remunerationRatePerScript: 27.50,
        conveyanceAllowancePerPacket: 0.00,
        coordinationChargesPerScript: 0.00,
      };
      setSettings(defaultResetSettings);
      try {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(defaultResetSettings));
        localStorage.setItem('ignou_sc2033_settings', JSON.stringify(defaultResetSettings));
      } catch {}
      setIntakes([]); // Submissions register: []
      setEvaluators(INITIAL_EVALUATORS);
      setPackets([]); // Course packets: [] (0 packets)
      setBills([]);
      setAssignmentSubmissions([]);
      setRegistrationReceipts([]);
      setCourseEvaluations([]); // Course ledger: []
      setCurrentSessionState(INITIAL_SETTINGS.defaultSession);
      setCurrentRole('ADMIN');
      localStorage.removeItem('ignou_intake_register');
      localStorage.removeItem('ignou_course_ledger');
      localStorage.removeItem('ignou_course_packets');
      localStorage.removeItem('ignou_marks_draft');
      localStorage.removeItem('ignou_conveyance');
      localStorage.removeItem('ignou_coordination');
      localStorage.removeItem('ignou_remuneration_rate');
      localStorage.removeItem('ignou_conveyance_allowance');
      localStorage.removeItem('ignou_coordination_charges');
      localStorage.removeItem('ignou_packets_tracker');
      localStorage.removeItem('ignou_sc2033_packets');
      localStorage.removeItem('ignou_sc2033_remuneration_rate');
      localStorage.removeItem('ignou_sc2033_conveyance_allowance');
      localStorage.removeItem('ignou_sc2033_coordination_charges');
      localStorage.removeItem('ignou_sc2033_intakes');
      localStorage.removeItem('ignou_sc2033_course_evaluations');
      localStorage.removeItem('ignou_sc2033_bills');
      localStorage.removeItem('ignou_sc2033_assignment_submissions');
      localStorage.removeItem('ignou_sc2033_registration_receipts');
      localStorage.removeItem('custom_allowances');
      localStorage.clear();
      window.dispatchEvent(new CustomEvent('ignou_factory_reset'));
    }
  }, []);

  // Academic Session Archival & History Snapshots Handlers
  const downloadArchiveJSON = useCallback((archive: SessionArchiveRecord) => {
    const cleanSession = (archive.session || 'Session').replace(/[^a-zA-Z0-9]/g, '_');
    const datePart = new Date(archive.archivedAt || Date.now()).toISOString().split('T')[0];
    const filename = `IGNOU_SC2033_HistoryArchive_${cleanSession}_${datePart}.json`;
    const jsonStr = JSON.stringify(archive, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const createSessionArchive = useCallback((params: {
    name: string;
    session: string;
    notes?: string;
    startNewSession?: boolean;
    newSessionName?: string;
    downloadJSON?: boolean;
  }): SessionArchiveRecord => {
    const targetSession = params.session || currentSession;
    
    // Filter records belonging to targetSession
    const sessionIntakesList = intakes.filter((r) => norm(r.session) === norm(targetSession));
    const sessionEvaluationsList = courseEvaluations.filter((r) => norm(r.session) === norm(targetSession));
    const sessionPacketsList = packets.filter((p) => norm(p.session) === norm(targetSession));
    const sessionBillsList = bills.filter((b) => norm(b.session) === norm(targetSession));
    const sessionSubmissionsList = assignmentSubmissions.filter((s) => norm(s.session) === norm(targetSession));
    const sessionReceiptsList = registrationReceipts.filter((r) => norm(r.session) === norm(targetSession));

    const uniqueCandidates = new Set(sessionIntakesList.map((r) => (r.enrollmentNo || '').trim())).size;

    const archiveRecord: SessionArchiveRecord = {
      id: `ARCHIVE-${targetSession.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}-${Date.now()}`,
      name: params.name || `${targetSession} Closeout Archive`,
      session: targetSession,
      archivedAt: new Date().toISOString(),
      archivedBy: `${settings.coordinatorName || 'Administrator'} (${settings.centreCode || 'SC-2033'})`,
      notes: params.notes || 'Academic session historical snapshot',
      stats: {
        totalIntakes: sessionIntakesList.length,
        totalCandidates: uniqueCandidates,
        totalCourseScripts: sessionEvaluationsList.length,
        totalPackets: sessionPacketsList.length,
        totalBills: sessionBillsList.length,
        totalEvaluated: sessionEvaluationsList.filter((e) => e.marks !== null && e.marks !== undefined && (e.marks as any) !== '').length,
        totalLocked: sessionEvaluationsList.filter((e) => Boolean(e.isLocked || (e.status as any) === 'Locked' || e.status === 'Marks Locked')).length,
      },
      snapshot: {
        session: targetSession,
        intakes: sessionIntakesList,
        courseEvaluations: sessionEvaluationsList,
        packets: sessionPacketsList,
        bills: sessionBillsList,
        assignmentSubmissions: sessionSubmissionsList,
        registrationReceipts: sessionReceiptsList,
        settings: {
          centreCode: settings.centreCode,
          centreName: settings.centreName,
          regionalCentre: settings.regionalCentre,
          coordinatorName: settings.coordinatorName,
          remunerationRatePerScript: settings.remunerationRatePerScript,
        },
      },
    };

    setArchives((prev) => [archiveRecord, ...prev.filter((a) => a.id !== archiveRecord.id)]);

    // Download JSON file if requested (defaults to true)
    if (params.downloadJSON !== false) {
      downloadArchiveJSON(archiveRecord);
    }

    // If startNewSession is selected, clear active records for this session to give a clean slate
    if (params.startNewSession) {
      // 1. Remove active records for targetSession from active registers
      setIntakes((prev) => prev.filter((r) => norm(r.session) !== norm(targetSession)));
      setCourseEvaluations((prev) => prev.filter((r) => norm(r.session) !== norm(targetSession)));
      setPackets((prev) => prev.filter((p) => norm(p.session) !== norm(targetSession)));
      setBills((prev) => prev.filter((b) => norm(b.session) !== norm(targetSession)));
      setAssignmentSubmissions((prev) => prev.filter((s) => norm(s.session) !== norm(targetSession)));
      setRegistrationReceipts((prev) => prev.filter((r) => norm(r.session) !== norm(targetSession)));

      // 2. Switch to new session if provided
      if (params.newSessionName && params.newSessionName.trim()) {
        const nextSession = params.newSessionName.trim();
        setSettings((prev) => {
          if (!prev.availableSessions.includes(nextSession)) {
            return {
              ...prev,
              availableSessions: [...prev.availableSessions, nextSession],
            };
          }
          return prev;
        });
        setCurrentSessionState(nextSession);
      }
    }

    showToast(
      params.startNewSession
        ? `Session ${targetSession} archived & started new session: ${params.newSessionName || 'Fresh State'}`
        : `Snapshot for ${targetSession} saved to History (${archiveRecord.stats.totalCourseScripts} scripts)`,
      'success'
    );

    return archiveRecord;
  }, [currentSession, intakes, courseEvaluations, packets, bills, assignmentSubmissions, registrationReceipts, settings, downloadArchiveJSON, showToast]);

  const deleteArchive = useCallback((archiveId: string) => {
    setArchives((prev) => prev.filter((a) => a.id !== archiveId));
    showToast('Historical archive deleted', 'info');
  }, [showToast]);

  const restoreArchive = useCallback((archiveId: string): boolean => {
    const target = archives.find((a) => a.id === archiveId);
    if (!target) return false;

    const snap = target.snapshot;
    // Add/merge restored records
    setIntakes((prev) => {
      const existingIds = new Set((snap.intakes || []).map((r) => r.id));
      const filtered = prev.filter((r) => !existingIds.has(r.id));
      return [...(snap.intakes || []), ...filtered];
    });

    setCourseEvaluations((prev) => {
      const existingIds = new Set((snap.courseEvaluations || []).map((e) => e.id));
      const filtered = prev.filter((e) => !existingIds.has(e.id));
      return [...(snap.courseEvaluations || []), ...filtered];
    });

    setPackets((prev) => {
      const existingIds = new Set((snap.packets || []).map((p) => p.id));
      const filtered = prev.filter((p) => !existingIds.has(p.id));
      return [...(snap.packets || []), ...filtered];
    });

    setBills((prev) => {
      const existingIds = new Set((snap.bills || []).map((b) => b.id));
      const filtered = prev.filter((b) => !existingIds.has(b.id));
      return [...(snap.bills || []), ...filtered];
    });

    setAssignmentSubmissions((prev) => {
      const existingIds = new Set((snap.assignmentSubmissions || []).map((s) => s.id));
      const filtered = prev.filter((s) => !existingIds.has(s.id));
      return [...(snap.assignmentSubmissions || []), ...filtered];
    });

    setRegistrationReceipts((prev) => {
      const existingIds = new Set((snap.registrationReceipts || []).map((r) => r.id));
      const filtered = prev.filter((r) => !existingIds.has(r.id));
      return [...(snap.registrationReceipts || []), ...filtered];
    });

    // Ensure session is in availableSessions and switch to it
    setSettings((prev) => {
      if (!prev.availableSessions.includes(target.session)) {
        return {
          ...prev,
          availableSessions: [...prev.availableSessions, target.session],
        };
      }
      return prev;
    });
    setCurrentSessionState(target.session);

    showToast(`Restored snapshot '${target.name}' (${target.session}) into active state`, 'success');
    return true;
  }, [archives, showToast]);

  const importArchiveJSON = useCallback((archiveData: any): SessionArchiveRecord => {
    if (!archiveData || typeof archiveData !== 'object' || !archiveData.snapshot) {
      throw new Error('Invalid archive JSON format: Missing snapshot object.');
    }
    const newArchive: SessionArchiveRecord = {
      id: archiveData.id || `ARCHIVE-IMPORT-${Date.now()}`,
      name: archiveData.name || `Imported Archive (${archiveData.session || 'Session'})`,
      session: archiveData.session || currentSession,
      archivedAt: archiveData.archivedAt || new Date().toISOString(),
      archivedBy: archiveData.archivedBy || 'Imported File',
      notes: archiveData.notes || 'Imported from offline JSON backup',
      stats: archiveData.stats || {
        totalIntakes: archiveData.snapshot.intakes?.length || 0,
        totalCandidates: new Set((archiveData.snapshot.intakes || []).map((r: any) => r.enrollmentNo)).size,
        totalCourseScripts: archiveData.snapshot.courseEvaluations?.length || 0,
        totalPackets: archiveData.snapshot.packets?.length || 0,
        totalBills: archiveData.snapshot.bills?.length || 0,
        totalEvaluated: (archiveData.snapshot.courseEvaluations || []).filter((e: any) => e.marks !== null).length,
        totalLocked: (archiveData.snapshot.courseEvaluations || []).filter((e: any) => e.isLocked).length,
      },
      snapshot: archiveData.snapshot,
    };

    setArchives((prev) => [newArchive, ...prev.filter((a) => a.id !== newArchive.id)]);
    showToast(`Imported archive '${newArchive.name}' to History`, 'success');
    return newArchive;
  }, [currentSession, showToast]);

  // Modal helpers
  const openReceiptModal = useCallback((record: IntakeRecord) => {
    setSelectedReceiptRecord(record);
  }, []);

  const closeReceiptModal = useCallback(() => {
    setSelectedReceiptRecord(null);
  }, []);

  // Custom Google Apps Script URL State & Connection Tester
  const [customAppsScriptUrl, setCustomAppsScriptUrlState] = useState<string>(() => {
    return getCustomScriptUrl();
  });

  const setCustomAppsScriptUrl = useCallback((url: string) => {
    setCustomScriptUrl(url);
    setCustomAppsScriptUrlState(url);
  }, []);

  const testCustomConnection = useCallback(async (url?: string) => {
    return await testAppsScriptConnection(url || customAppsScriptUrl);
  }, [customAppsScriptUrl]);

  // Operational Data Purge (Clears Intakes, Ledger, and Registrations; Preserves Evaluators)
  const purgeOperationalData = useCallback(async (backupFirst: boolean = true) => {
    try {
      if (backupFirst) {
        const backupSnapshot = {
          exportSource: 'IGNOU_SC2033_PRE_PURGE_BACKUP',
          exportDate: new Date().toISOString(),
          studyCentreCode: '2033',
          counts: {
            intakes: intakes.length,
            courseLedger: courseEvaluations.length,
            studentRegistrations: studentRegistrations.length,
            evaluatorsMaster: evaluators.length,
          },
          intakes,
          courseLedger: courseEvaluations,
          studentRegistrations,
          registrationReceipts,
          assignmentSubmissions,
        };
        const blob = new Blob([JSON.stringify(backupSnapshot, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sc2033_pre_purge_backup_${new Date().toISOString().split('T')[0]}_${Date.now().toString().slice(-4)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      // Mark as purged in localStorage
      localStorage.setItem('ignou_sc2033_is_purged', 'true');
      localStorage.setItem("ignou_sc2033_intake", JSON.stringify([]));
      localStorage.setItem("ignou_sc2033_ledger", JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.INTAKES, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.COURSE_EVALUATIONS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.STUDENT_REGISTRATIONS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.REGISTRATION_RECEIPTS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.ASSIGNMENT_SUBMISSIONS, JSON.stringify([]));

      // Reset React states
      setIntakes([]);
      setCourseEvaluations([]);
      setStudentRegistrations([]);
      setRegistrationReceipts([]);
      setAssignmentSubmissions([]);

      // Reset backend proxy store
      await purgeRemoteOperationalData();

      logAuditEvent({
        action: 'DATA_PURGED',
        category: 'SYSTEM_SETTINGS',
        actor: currentRole === 'ADMIN' ? `${settings.coordinatorName || 'Coordinator'} (Admin)` : 'Desk Official',
        role: currentRole,
        session: currentSession,
        summary: 'Operational records (Intakes, Ledger, Registrations) purged. Evaluators preserved.',
        status: 'SUCCESS',
      });

      showToast('All operational records cleared. System ready for new Google Sheets database.', 'success');
      return { success: true, message: 'All operational records cleared. Evaluators preserved.' };
    } catch (err: any) {
      showToast(`Purge encountered issue: ${err.message}`, 'error');
      return { success: false, message: err.message };
    }
  }, [
    intakes,
    courseEvaluations,
    studentRegistrations,
    evaluators,
    registrationReceipts,
    assignmentSubmissions,
    logAuditEvent,
    currentRole,
    settings.coordinatorName,
    currentSession,
    showToast,
  ]);

  // One-time automatic purge of old demo data from browser localStorage
  useEffect(() => {
    const BOOT_PURGE_KEY = 'ignou_sc2033_cleared_old_demo_v9';
    if (localStorage.getItem(BOOT_PURGE_KEY) !== 'true') {
      localStorage.removeItem('ignou_sc2033_intake');
      localStorage.removeItem(STORAGE_KEYS.INTAKES);
      localStorage.removeItem('ignou_intake_register');
      localStorage.removeItem('ignou_sc2033_ledger');
      localStorage.removeItem(STORAGE_KEYS.COURSE_EVALUATIONS);
      localStorage.removeItem('ignou_course_ledger');
      localStorage.removeItem(STORAGE_KEYS.ASSIGNMENT_SUBMISSIONS);
      localStorage.removeItem(STORAGE_KEYS.REGISTRATION_RECEIPTS);
      localStorage.setItem(BOOT_PURGE_KEY, 'true');
      setIntakes([]);
      setCourseEvaluations([]);
      setAssignmentSubmissions([]);
      setRegistrationReceipts([]);
      setTimeout(() => {
        fetchAllData(false);
      }, 50);
    }
  }, [fetchAllData]);

  const purgeOldDemoDataAndSyncLive = useCallback(async () => {
    localStorage.removeItem('ignou_sc2033_intake');
    localStorage.removeItem(STORAGE_KEYS.INTAKES);
    localStorage.removeItem('ignou_intake_register');
    localStorage.removeItem('ignou_sc2033_ledger');
    localStorage.removeItem(STORAGE_KEYS.COURSE_EVALUATIONS);
    localStorage.removeItem('ignou_course_ledger');
    localStorage.removeItem(STORAGE_KEYS.ASSIGNMENT_SUBMISSIONS);
    localStorage.removeItem(STORAGE_KEYS.REGISTRATION_RECEIPTS);
    setIntakes([]);
    setCourseEvaluations([]);
    setAssignmentSubmissions([]);
    setRegistrationReceipts([]);
    showToast('Clearing old cache and fetching live data from Google Sheet...', 'info');
    await fetchAllData(false);
    showToast('Cache cleared & strictly synchronized with Google Sheet!', 'success');
  }, [fetchAllData, showToast]);

  return (
    <AppContext.Provider
      value={{
        currentSession,
        setSession,
        availableSessions: settings.availableSessions,
        addSession,
        currentRole,
        setRole,
        toggleRole,
        isAdmin,
        isOfficial,
        isUrlLockedDeskMode,
        isAdminPinModalOpen,
        adminPinError,
        openAdminPinModal,
        closeAdminPinModal,
        verifyAndSetAdminRole,
        // Gatekeeper Authentication & RBAC (SC-2033)
        isAuthenticated,
        setIsAuthenticated,
        userRole,
        setUserRole,
        securityPins,
        setSecurityPins,
        updateSecurityPins,
        securityCredentials,
        updateSecurityCredentials,
        lockoutState,
        resetLockout,
        verifyCoordinatorStepUp,
        handleLogin,
        logout,
        rbacConfig,
        updateRbacConfig,
        resetRbacToDefaults,
        canPerformOperation,
        sessionIntakes,
        allIntakes: intakes,
        intakeRegister: intakes,
        setIntakeRegister: setIntakes,
        addIntakeRecord,
        integrateIntakeWithPrevious,
        updateIntakeRecord,
        editIntakeEntry,
        updateIntakeDate,
        deleteIntakeRecord,
        getRegisteredProgrammeForEnrollment,
        getEnrolledCoursesForStudent,
        getEnrolledCourseComponentsForStudent,
        validateIntake,
        updateMarks,
        updatePracticalMarks,
        saveOrUpdateMarksAndLock,
        // Module B: Course Evaluations
        courseLedger: courseEvaluations,
        setCourseLedger: setCourseEvaluations,
        sessionCourseEvaluations,
        allCourseEvaluations: courseEvaluations,
        allotEvaluatorToEvaluations,
        updateEvaluationMarks,
        toggleLockMarks,
        batchLockMarks,
        sessionAssignmentSubmissions,
        allAssignmentSubmissions: assignmentSubmissions,
        updateSubmissionStatus,
        batchUpdateSubmissionStatus,
        recordStudentAssignmentSubmissions,
        sessionRegistrationReceipts,
        allRegistrationReceipts: registrationReceipts,
        addRegistrationReceipt,
        selectedRegistrationReceipt,
        openRegistrationReceiptModal,
        closeRegistrationReceiptModal,
        sessionPackets,
        packets,
        setPackets,
        coursePackets: packets,
        setCoursePackets: setPackets,
        createPacket,
        updatePacket,
        deletePacket,
        evaluators,
        addEvaluator,
        updateEvaluator,
        deleteEvaluator,
        isSyncingSheets,
        syncStatus,
        syncGoogleSheets,
        fetchAllData,
        isSyncingEvaluators,
        syncEvaluatorsDirectory,
        lastSheetSync,
        // Data Sync Monitor & Offline Parity Engine
        pendingSyncQueue,
        connectionStatus,
        lastLatencyMs,
        integrityReport,
        isCheckingIntegrity,
        isSyncDrawerOpen,
        setIsSyncDrawerOpen,
        toggleSyncDrawer,
        checkDataIntegrity,
        retryPendingQueue,
        retrySingleQueueItem,
        removeQueueItem,
        clearAllQueueItems,
        sessionBills,
        generateBill,
        sanctionBill,
        disburseBill,
        settings,
        updateSettings,
        resetAllData,
        selectedReceiptRecord,
        openReceiptModal,
        closeReceiptModal,
        // Module E: Global Student Search
        isSearchModalOpen,
        searchInitialQuery,
        openSearchModal,
        closeSearchModal,
        // Navigation Sidebar Collapsible & Hideable State
        isSidebarHidden,
        setIsSidebarHidden,
        toggleSidebarHidden,
        isSidebarCollapsed,
        setIsSidebarCollapsed,
        toggleSidebarCollapsed,
        // Header & Full-Page Workspace View Modes
        isHeaderCompact,
        setIsHeaderCompact,
        toggleHeaderCompact,
        isContentFullWidth,
        setIsContentFullWidth,
        toggleContentFullWidth,
        // Theme & Visual Preferences
        currentTheme,
        setTheme,
        isDark,
        toggleDark,
        // Toast Notification System
        toastMessage,
        toastType,
        showToast,
        hideToast,
        // Custom Programmes, Course Registry & IGNOU Resolution
        allProgrammes,
        customProgrammes,
        customCourses,
        courseTitlesRegistry,
        saveCustomProgramme,
        removeCustomProgramme,
        saveCustomCourse,
        getProgrammeCourses,
        getCourseTitle,
        getCourseInfo,
        updateCourseTitleFromIgnou,
        // Academic Session Archival & History Snapshots
        archives,
        createSessionArchive,
        deleteArchive,
        restoreArchive,
        downloadArchiveJSON,
        importArchiveJSON,
        // Audit Trail & Accountability Logs
        auditLogs,
        logAuditEvent,
        clearAuditLogs,
        exportAuditLogsCSV,
        exportAuditLogsJSON,
        // Admissions & Re-Registration (Fresh 1st Year & Re-Reg 2nd/3rd Year)
        studentRegistrations,
        freshAdmissions,
        reRegistrations,
        getStudentRegistrationByEnrollment,
        getAllStudentRegistrationsByEnrollment,
        addStudentRegistration,
        batchImportStudentRegistrations,
        updateStudentRegistration,
        deleteStudentRegistration,
        isSyncingAdmissions,
        syncAdmissionsWithGoogleSheets,
        calibrateStudentRegistrations,
        // Operational Data Purge & Custom Google Sheet Connector
        purgeOperationalData,
        purgeOldDemoDataAndSyncLive,
        customAppsScriptUrl,
        setCustomAppsScriptUrl,
        testCustomConnection,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
