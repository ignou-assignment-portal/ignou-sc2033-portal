/**
 * IGNOU SC-2033 Assignment Operations Dashboard Data Types
 */

export type UserRole = 'ADMIN' | 'OFFICIAL';

export interface RoleConfig {
  id: UserRole;
  title: string;
  badgeLabel: string;
  description: string;
  canSanctionBills: boolean;
  canOverrideRates: boolean;
  canAllocateEvaluators: boolean;
  canResetDatabase: boolean;
  canEnterMarks: boolean;
  canRegisterStudent: boolean;
  canPrintReceipts: boolean;
}

export type SubmissionMode = 'In-Person (Desk)' | 'Speed Post' | 'Registered Post' | 'Courier';

export type IntakeStatus = 'Received' | 'In Packet' | 'Under Evaluation' | 'Evaluated' | 'Marks Uploaded';

export interface IntakeRecord {
  id: string;
  session: string; // Strict session isolation: e.g., 'July 2026'
  tokenNo: string; // e.g., 'SC2033-JUL26-0001'
  enrollmentNo: string;
  studentName: string;
  studentPhone?: string;
  studentEmail?: string;
  programmeCode: string;
  courseCodes: string[];
  submissionDate: string; // YYYY-MM-DD
  receiptDate?: string;
  Submission_Date?: string;
  receiptNumber?: string;
  Timestamp?: string;
  timestamp?: string;
  submissionMode: SubmissionMode;
  consignmentNo?: string; // For postal/speedpost
  remarks?: string;
  status: IntakeStatus;
  marks: Record<string, number | null>; // courseCode -> Assignment marks (0-100) or null
  practicalMarks?: Record<string, number | null>; // courseCode -> Practical marks (0-100) or null
  practicalCourses?: string[]; // course codes recorded as Practical submissions
  assignmentCourses?: string[]; // course codes recorded as Theory Assignment submissions
  courseDetails?: Array<{
    code: string;
    type: 'Assignment' | 'Practical';
    title?: string;
    addedInPart?: number;
    submissionDate?: string;
  }>;
  isIntegrated?: boolean; // True if this intake has been integrated part-by-part
  integratedPartsCount?: number;
  submissionParts?: Array<{
    partNo: number;
    submissionDate: string;
    tokenNo?: string;
    courseCodes: string[];
    practicalCourses?: string[];
    assignmentCourses?: string[];
    receiptNumber?: string;
  }>;
  createdAt: string;
  registeredBy: string;
}

export interface Evaluator {
  id: string;
  evaluatorCode: string; // e.g. EV-101
  name: string;
  evaluatorName?: string; // alias for name
  designation: string; // e.g. Associate Professor
  department: string; // e.g. Department of English
  collegeInstitution: string; // e.g. S.D. Jain Girls' College, Dimapur
  contactPhone: string;
  contactNumber?: string; // alias for contactPhone
  email: string;
  emailId?: string; // alias for email
  eligibleCourses: string[]; // e.g. ['MEG-01', 'MEG-02', 'BEGC-131']
  bankName: string;
  accountNumber: string;
  bankAccountNo?: string; // alias for accountNumber
  ifscCode: string;
  panNumber: string;
  status: 'Active' | 'On Leave' | 'Inactive' | string;
  lastSyncedAt: string;
}

export interface CoursePacket {
  id: string;
  session: string;
  packetNumber: string; // e.g., PKT-JUL26-MEG01-01
  courseCode: string;
  programmeCode: string;
  evaluatorId: string | null;
  scriptCount: number;
  assignedDate: string | null;
  expectedReturnDate: string | null;
  returnedDate: string | null;
  status: 'Formed' | 'Dispatched' | 'Evaluated' | 'Archived';
  notes?: string;
}

export interface RemunerationBill {
  id: string;
  session: string;
  billNumber: string;
  evaluatorId: string;
  evaluatorCode: string;
  evaluatorName: string;
  bankAccountNo?: string;
  accountNumber?: string;
  ifscCode?: string;
  bankName?: string;
  panNumber?: string;
  department?: string;
  designation?: string;
  courseCodes: string[];
  totalScripts: number;
  ratePerScript: number;
  scriptAmount: number;
  conveyanceAmount: number;
  grossAmount: number;
  totalAmount?: number;
  sanctionStatus: 'Draft' | 'Sanctioned' | 'Disbursed';
  sanctionedDate?: string;
  sanctionedBy?: string;
  disbursedDate?: string;
  disbursementReference?: string;
}

export interface SystemSettings {
  centreCode: string; // 'SC-2033'
  centreName: string; // 'IGNOU Study Centre 2033'
  institutionName: string; // "S.D. Jain Girls' College, Dimapur"
  hostInstitution?: string; // "S.D. Jain Girls' College, Dimapur"
  collegeName?: string; // "S.D. Jain Girls' College, Dimapur"
  regionalCentreCode: string; // 'RC-20 Kohima (Regional Centre Kohima)'
  regionalCentre?: string; // 'RC-20 Kohima'
  coordinatorName: string; // 'Dr. Sant K. Gupta'
  coordinatorDesignation?: string;
  coordinatorContact: string; // '+91 9436013686 | sant.k.gupta@gmail.com'
  coordinatorPhone?: string; // '9436013686'
  coordinatorEmail?: string; // 'sant.k.gupta@gmail.com'
  remunerationRatePerScript: number; // default Rs 27.50
  conveyanceAllowancePerPacket: number; // default Rs 0.00
  coordinationChargesPerScript: number; // default Rs 0.00
  availableSessions: string[];
  defaultSession: string;
  adminPin?: string; // 4-digit Administrator PIN (default: '2033')
  lastBackupDate?: string;
  appsScriptUrl?: string;
  googleSheetScriptUrl?: string;
}

export interface IGNOUCourse {
  code: string;
  title: string;
  credits: number;
  programme: string;
  medium?: string;
}

export interface IGNOUProgramme {
  code: string;
  name: string;
  level: 'Bachelor' | 'Master' | 'Diploma' | 'Certificate';
  department: string;
  courses: IGNOUCourse[];
}

export type SubmissionStatusType = 'submitted' | 'not submitted';

export interface AssignmentSubmission {
  id: string;
  studentId: string; // StudentID / Enrollment Number (e.g. 2350198421)
  studentName: string;
  programmeCode: string;
  courseCode: string;
  session: string; // Academic Session (e.g. 'July 2026')
  status: SubmissionStatusType; // 'submitted' or 'not submitted'
  submissionDate?: string | null;
  submissionMode?: SubmissionMode | null;
  consignmentNo?: string | null;
  remarks?: string | null;
  componentType?: 'Assignment' | 'Practical';
  isPractical?: boolean;
  marks?: number | null;
  practicalMarks?: number | null;
  updatedAt: string;
  updatedBy: string;
}

export type PaymentMode = 'Cash' | 'UPI / QR' | 'Demand Draft' | 'Online Netbanking';

export interface RegistrationReceiptFees {
  handlingFeePerCourse?: number;
  totalCourses?: number;
  courseFeeTotal?: number;
  lateFee?: number;
  totalFeesPaid?: number;
  paymentMode?: string;
  transactionRef?: string;
  paymentDate?: string;
}

export interface RegistrationReceipt {
  id: string;
  receiptNumber: string; // e.g. 'REG-SC2033-JUL26-0001'
  intakeId?: string; // Linked Intake Token / Id
  tokenNo?: string; // Intake Token e.g., SC2033-JUL26-0001
  studentId: string; // Enrollment No / Student ID
  studentName: string;
  studentPhone?: string;
  studentEmail?: string;
  programmeCode: string;
  session: string;
  registeredCourses: string[];
  practicalCourses?: string[];
  assignmentCourses?: string[];
  courseDetails?: Array<{
    code: string;
    type: 'Assignment' | 'Practical';
    title?: string;
    addedInPart?: number;
  }>;
  isIntegrated?: boolean;
  partNo?: number;
  submissionParts?: Array<{
    partNo: number;
    submissionDate?: string;
    courseCodes: string[];
    practicalCourses?: string[];
    assignmentCourses?: string[];
  }>;
  issuedBy: string;
  issuedAt: string;
  submissionDate?: string; // YYYY-MM-DD
  receiptDate?: string; // YYYY-MM-DD
  remarks?: string;
  feesPaid?: RegistrationReceiptFees;
}

// Module B: Automated Ledger Unpacking (2_Course_Evaluation_Master) & Marks Engine
export type EvaluationStatus = 'Pending Allotment' | 'Allotted' | 'Evaluated' | 'Marks Locked';

export interface CourseEvaluationRecord {
  // Clean Google Sheets Course_Ledger keys
  Sub_ID?: string;
  subId?: string;
  Session?: string;
  Enrollment_No?: string;
  Candidate_Name?: string;
  Contact_No?: string;
  Email_ID?: string;
  Programme?: string;
  Programme_Code?: string;
  Course_Code?: string;
  Course_Title?: string;
  Allotted_Evaluator?: string | null;
  Marks?: number | null;
  Grade?: string | null;
  Status?: string;

  id: string; // Deterministic Primary Key format: SUB_ENR_COURSE_TERM (e.g. SUB_2401928371_MEG01_JUL2026)
  submissionKey: string; // Same as id
  intakeId?: string; // Linked Intake Token / Id
  tokenNo: string; // Intake Token e.g., SC2033-JUL26-0001
  enrollmentNo: string;
  studentName: string;
  studentPhone?: string;
  studentEmail?: string;
  programmeCode: string;
  courseCode: string; // e.g. MEG-01
  courseTitle?: string;
  session: string; // e.g. July 2026
  submissionDate: string; // YYYY-MM-DD
  receiptDate?: string;
  Submission_Date?: string;
  Timestamp?: string;
  receivedDate?: string;
  intakeDate?: string;
  submissionMode: SubmissionMode;
  consignmentNo?: string | null;

  // Academic Evaluator Allotment
  evaluatorId: string | null;
  evaluatorCode?: string | null; // e.g. EV-101
  evaluatorName?: string | null;
  allottedDate: string | null;
  allottedBy?: string | null;

  // Marks Engine
  marks: number | null; // Numeric 0 to 100 (Primary/Assignment)
  assignmentMarks?: number | null; // Dedicated Assignment marks (0-100)
  practicalMarks?: number | null; // Dedicated Practical marks (0-100)
  grade: string | null; // 'A' | 'B' | 'C' | 'D' | 'E' | '—'
  gradeLabel: string | null; // 'Excellent' | 'Very Good' | 'Good' | 'Satisfactory' | 'Unsatisfactory / Failed' | 'Pending'
  practicalGrade?: string | null; // 'A' | 'B' | 'C' | 'D' | 'E' | '—'
  practicalGradeLabel?: string | null;

  // Marks Locking & Verification
  isLocked: boolean;
  isPracticalLocked?: boolean;
  lockedAt: string | null;
  lockedBy: string | null;

  status: EvaluationStatus;
  componentType?: 'Assignment' | 'Practical';
  isPractical?: boolean;
  updatedAt: string;
  remarks?: string;
}

export interface SessionArchiveRecord {
  id: string;
  name: string;
  session: string;
  archivedAt: string;
  archivedBy: string;
  notes?: string;
  stats: {
    totalIntakes: number;
    totalCandidates: number;
    totalCourseScripts: number;
    totalPackets: number;
    totalBills: number;
    totalEvaluated: number;
    totalLocked: number;
  };
  snapshot: {
    session: string;
    intakes: IntakeRecord[];
    courseEvaluations: CourseEvaluationRecord[];
    packets: CoursePacket[];
    bills: RemunerationBill[];
    assignmentSubmissions: AssignmentSubmission[];
    registrationReceipts: RegistrationReceipt[];
    settings?: Partial<SystemSettings>;
  };
}

export type AppTheme = 'classic' | 'dark' | 'emerald' | 'indigo' | 'sandstone' | 'monochrome';

export interface ThemeOption {
  id: AppTheme;
  name: string;
  subtitle: string;
  description: string;
  isDark?: boolean;
  colors: {
    primary: string;
    accent: string;
    bg: string;
    surface: string;
    border: string;
    text: string;
  };
}

export type AuditActionType =
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'ROLE_SWITCH'
  | 'PIN_CHANGED'
  | 'INTAKE_CREATED'
  | 'INTAKE_UPDATED'
  | 'INTAKE_DELETED'
  | 'INTAKE_REJECTED'
  | 'INTAKE_DATE_CHANGED'
  | 'MARKS_UPDATED'
  | 'MARKS_LOCKED'
  | 'MARKS_UNLOCKED'
  | 'PRACTICAL_MARKS_UPDATED'
  | 'PRACTICAL_MARKS_LOCKED'
  | 'EVALUATOR_ALLOTTED'
  | 'PACKET_CREATED'
  | 'PACKET_UPDATED'
  | 'BILL_GENERATED'
  | 'BILL_SANCTIONED'
  | 'SETTINGS_UPDATED'
  | 'SESSION_ARCHIVED'
  | 'SESSION_RESTORED'
  | 'SHEETS_SYNCED'
  | 'DATA_PURGED'
  | 'AUTH_FAILED'
  | 'AUTH_LOCKOUT_TRIGGERED'
  | 'STEP_UP_AUTHORIZED'
  | 'STEP_UP_FAILED'
  | 'SECURITY_CREDENTIALS_UPDATED'
  | 'SESSION_AUTO_LOCKED';

export type AuditTargetCategory =
  | 'AUTHENTICATION'
  | 'ASSIGNMENT_INTAKE'
  | 'MARKS_EVALUATION'
  | 'PACKETS_DISPATCH'
  | 'FINANCE_BILLS'
  | 'SYSTEM_SETTINGS'
  | 'SESSION_MANAGEMENT'
  | 'SECURITY';

export interface AuditLogEntry {
  id: string;
  timestamp: string; // ISO string
  action: AuditActionType;
  category: AuditTargetCategory;
  actor: string; // e.g. "Dr. Sant K. Gupta (Coordinator)", "Desk Official (Terminal)"
  role: 'ADMIN' | 'OFFICIAL' | 'SYSTEM';
  session: string; // e.g. "July 2026"
  targetIdentifier?: string; // Enrollment No, Course Code, Packet ID, Token
  summary: string;
  details?: Record<string, any>;
  ipOrDevice?: string;
  status: 'SUCCESS' | 'WARNING' | 'FAILED';
}

export type RegistrationCadre = 'FRESH' | 'RE_REGISTRATION';
export type AcademicYearLevel = '1st Year' | '2nd Year' | '3rd Year' | 'Semester';

export interface StudentRegistrationRecord {
  id: string;
  cadre: RegistrationCadre;
  academicYear: AcademicYearLevel;
  semesterNo?: number;
  enrollmentNo: string;
  studentName: string;
  programmeCode: string;
  programmeName?: string;
  session: string; // e.g. 'July 2026' or 'January 2026'
  sessionCycle: 'January' | 'July';
  sessionYear: number;
  courseCodes: string[];
  studentPhone: string;
  studentEmail: string;
  registrationDate: string;
  status: 'Confirmed' | 'Provisional' | 'Cancelled';
  feeReference?: string;
  studyCentreCode: string;
  regionalCentreCode: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export type RbacOperation =
  | 'intake_registration'
  | 'intake_edit_delete'
  | 'marks_entry'
  | 'marks_locking'
  | 'packets_dispatch'
  | 'remuneration_billing'
  | 'sed_award_sheets'
  | 'evaluators_directory'
  | 'system_settings'
  | 'forensic_audit_trail';

export type RbacAccessLevel = 'ALLOWED' | 'PIN_REQUIRED' | 'FORBIDDEN';

export interface RbacPolicy {
  desk: RbacAccessLevel;
  admin: RbacAccessLevel;
  label: string;
  description: string;
  category: 'Intake' | 'Evaluation' | 'Finance' | 'Administration';
}

export interface RbacConfiguration {
  enabled: boolean;
  requireCoordinatorPinForMarksLock: boolean;
  requireCoordinatorPinForBilling: boolean;
  policies: Record<RbacOperation, RbacPolicy>;
  lastUpdated?: string;
  updatedBy?: string;
}

export interface StaffAccount {
  username: string;
  name: string;
  password: string;
  role: 'desk';
}

export interface CoordinatorAccount {
  username: string;
  name: string;
  masterPassphrase: string;
}

export interface SecurityCredentials {
  staffAccount: StaffAccount;
  coordinatorAccount: CoordinatorAccount;
  inactivityTimeoutMinutes: number;
  maxFailedAttempts: number;
  lockoutDurationMinutes: number;
}

export interface LockoutState {
  failedAttempts: number;
  isLocked: boolean;
  lockoutUntil: number | null;
  lastAttemptAt?: string;
}

