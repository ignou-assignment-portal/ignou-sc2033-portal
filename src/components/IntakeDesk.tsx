import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp, norm } from '../context/AppContext';
import { SubmissionMode, IntakeRecord } from '../types';
import { formatDate, formatDateTime, isPracticalCourse, isDualComponentCourse, getProgrammeDurationInfo, getAssignmentSubmissionEligibility } from '../utils/helpers';
import { AddRegistrationModal } from './AddRegistrationModal';
import { IntakeStatusMatrix } from './IntakeStatusMatrix';
import {
  UserPlus,
  GitMerge,
  FlaskConical,
  User,
  BookOpen,
  CheckCircle,
  Hash,
  Printer,
  Calendar,
  Layers,
  Sparkles,
  AlertCircle,
  Plus,
  X,
  Search,
  Receipt,
  ShieldCheck,
  FileCheck,
  FileCheck2,
  Camera,
  QrCode,
  Eye,
  CheckCircle2,
  GraduationCap,
  Phone,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Edit3,
  Check,
  TableProperties,
  Trash2,
  Pencil,
  Loader2,
  Globe,
  RefreshCw,
  XCircle,
  ShieldAlert,
  AlertTriangle,
  FileCode,
  Copy,
  ArrowRight,
  FileDown,
  Download,
  Activity,
  Clock,
  TrendingUp,
  ArrowUpRight,
  Lock,
} from 'lucide-react';
import { IntakeRegister } from './IntakeRegister';
import { EditIntakeModal } from './EditIntakeModal';
import { ValidationSummary, ValidationSummaryProps } from './ValidationSummary';
import { ProgrammeIntakeBarChart } from './ProgrammeIntakeBarChart';
import { EnrollmentAuditModal, DuplicateEnrollmentGroup } from './EnrollmentAuditModal';
import { IntakeReportModal } from './IntakeReportModal';
import { downloadStudentIntakePDF } from '../services/pdfReportGenerator';
import { AssignmentStatusSummaryCard } from './AssignmentStatusSummaryCard';
import { ErrorBoundary } from './ErrorBoundary';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { runBackgroundDataEntryValidation } from '../services/dataEntryValidationService';

export { ValidationSummary, ProgrammeIntakeBarChart, EnrollmentAuditModal, IntakeReportModal, AssignmentStatusSummaryCard };
export type { ValidationSummaryProps };

export interface ValidationSummaryItem {
  status: 'Success' | 'Rejected' | 'Error';
  reason?: string;
  rule?: string;
  action?: 'Create' | 'Update' | 'Delete' | 'Validate' | string;
  timestamp?: string;
  cleanData?: {
    id?: string;
    tokenNo?: string;
    enrollmentNo?: string;
    studentName?: string;
    programmeCode?: string;
    courseCodes?: string[];
    session?: string;
    submissionDate?: string;
    submissionMode?: string;
    marks?: Record<string, number | null>;
    receiptNumber?: string;
    [key: string]: any;
  };
  attemptedData?: {
    enrollmentNo?: string;
    studentName?: string;
    programmeCode?: string;
    courseCodes?: string[];
    session?: string;
    [key: string]: any;
  };
}

export const IntakeDesk: React.FC = () => {
  const {
    currentSession,
    setSession,
    availableSessions,
    addIntakeRecord,
    integrateIntakeWithPrevious,
    deleteIntakeRecord,
    sessionIntakes,
    allIntakes,
    intakeRegister,
    allCourseEvaluations,
    sessionCourseEvaluations,
    auditLogs,
    openReceiptModal,
    currentRole,
    isAdmin,
    verifyAndSetAdminRole,
    settings,
    addRegistrationReceipt,
    openRegistrationReceiptModal,
    recordStudentAssignmentSubmissions,
    sessionRegistrationReceipts,
    allRegistrationReceipts,
    allProgrammes,
    saveCustomProgramme,
    getProgrammeCourses,
    saveCustomCourse,
    getCourseTitle,
    getCourseInfo,
    updateCourseTitleFromIgnou,
    courseTitlesRegistry,
    studentRegistrations,
    getStudentRegistrationByEnrollment,
    getRegisteredProgrammeForEnrollment,
    getEnrolledCoursesForStudent,
    getEnrolledCourseComponentsForStudent,
    validateIntake,
    updateIntakeDate,
    logAuditEvent,
    showToast,
  } = useApp();

  // Form states
  const [enrollmentNo, setEnrollmentNo] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentPhone, setStudentPhone] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [selectedProgramme, setSelectedProgramme] = useState('');
  const [selectedSession, setSelectedSession] = useState(currentSession);
  const [courseSearchInput, setCourseSearchInput] = useState('');
  const [isAddRegistrationModalOpen, setIsAddRegistrationModalOpen] = useState(false);
  const [registrationModalCadre, setRegistrationModalCadre] = useState<'FRESH' | 'RE_REGISTRATION'>('FRESH');
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  // Default intake component mode: Assignment (TMA) by default, or Practical (Lab/Viva)
  const [defaultIntakeComponent, setDefaultIntakeComponent] = useState<'Assignment' | 'Practical'>('Assignment');
  const [courseComponentTypes, setCourseComponentTypes] = useState<Record<string, 'Assignment' | 'Practical' | 'Both'>>({});
  const [shouldIntegrateWithPrevious, setShouldIntegrateWithPrevious] = useState<boolean>(true);
  const [submissionDate, setSubmissionDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [submissionMode, setSubmissionMode] = useState<SubmissionMode>('In-Person (Desk)');
  const [consignmentNo, setConsignmentNo] = useState('');
  const [remarks, setRemarks] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [justSubmittedToken, setJustSubmittedToken] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationSummaryItem | null>(null);
  const [selectedChartProgramme, setSelectedChartProgramme] = useState<string | null>(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isScanningDuplicates, setIsScanningDuplicates] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Quick Receipt Date Editor states
  const [quickDateModalRecord, setQuickDateModalRecord] = useState<any | null>(null);
  const [quickDateValue, setQuickDateValue] = useState<string>('');
  const [quickDateSuccessToast, setQuickDateSuccessToast] = useState<string | null>(null);

  const handleOpenDateEdit = (record: any) => {
    const recAny = record as any;
    const subDate =
      record.submissionDate ||
      recAny.receiptDate ||
      (recAny.Timestamp ? String(recAny.Timestamp).split('T')[0] : '') ||
      (recAny.createdAt ? String(recAny.createdAt).split('T')[0] : '') ||
      new Date().toISOString().split('T')[0];
    setQuickDateModalRecord(record);
    setQuickDateValue(subDate);
  };

  const handleSaveQuickDate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!quickDateModalRecord || !quickDateValue) return;

    const token =
      quickDateModalRecord.Token_No ||
      quickDateModalRecord.tokenNo ||
      quickDateModalRecord.receiptNumber ||
      quickDateModalRecord.id;

    await updateIntakeDate(quickDateModalRecord.id || token, quickDateValue.trim());

    setQuickDateSuccessToast(`Receipt date updated to ${formatDate(quickDateValue.trim())} & validated with Google Sheets`);
    setTimeout(() => setQuickDateSuccessToast(null), 3500);
    setQuickDateModalRecord(null);
  };

  // Record statutory rejection into the real-time operational audit log
  const recordRejectedAttempt = (rule: string, reason: string, attemptedCourses: string[] = []) => {
    const cleanEnr = enrollmentNo.trim();
    try {
      logAuditEvent({
        action: 'INTAKE_REJECTED' as any,
        category: 'ASSIGNMENT_INTAKE' as any,
        actor: currentRole === 'ADMIN' ? `${settings.coordinatorName || 'Coordinator'} (Admin)` : 'Desk Official',
        role: currentRole,
        session: selectedSession || currentSession,
        targetIdentifier: cleanEnr || 'Unidentified Candidate',
        summary: `Intake validation rejected: ${reason}`,
        details: {
          enrollmentNo: cleanEnr,
          studentName: studentName.trim(),
          programmeCode: selectedProgramme.trim().toUpperCase(),
          courses: attemptedCourses,
          rule,
          reason,
        },
        status: 'FAILED',
      });
    } catch (e) {
      console.error('Failed to log rejected intake attempt', e);
    }
  };

  // Export current session data as CSV (Restricted to Authorized Administrators)
  const handleExportSessionCSV = () => {
    if (!isAdmin) {
      showToast('Permission Denied: Only Administrators can export session data.', 'error');
      return;
    }

    if (!sessionIntakes || sessionIntakes.length === 0) {
      showToast(`No intake records found in session ${currentSession} to export.`, 'warning');
      return;
    }

    const headers = [
      'Token No',
      'Session',
      'Enrollment No',
      'Student Name',
      'Phone Number',
      'Email Address',
      'Programme Code',
      'Course Count',
      'Course Codes',
      'Submission Date',
      'Submission Mode',
      'Consignment No',
      'Status',
      'Marks Awarded',
      'Registered By',
      'Created At',
      'Remarks',
    ];

    const rows = sessionIntakes.map((r) => {
      const marksStr = r.marks
        ? Object.entries(r.marks)
            .map(([c, m]) => `${c}:${m !== null && m !== undefined ? m : 'NA'}`)
            .join('; ')
        : '';

      return [
        `"${r.tokenNo || ''}"`,
        `"${r.session || currentSession}"`,
        `'${r.enrollmentNo || ''}`,
        `"${(r.studentName || '').replace(/"/g, '""')}"`,
        `"${r.studentPhone || ''}"`,
        `"${r.studentEmail || ''}"`,
        `"${r.programmeCode || ''}"`,
        r.courseCodes ? r.courseCodes.length : 0,
        `"${(r.courseCodes || []).join(', ')}"`,
        `"${r.submissionDate || ''}"`,
        `"${r.submissionMode || ''}"`,
        `"${r.consignmentNo || ''}"`,
        `"${r.status || 'Received'}"`,
        `"${marksStr}"`,
        `"${r.registeredBy || ''}"`,
        `"${r.createdAt || ''}"`,
        `"${(r.remarks || '').replace(/"/g, '""')}"`,
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeSession = (currentSession || 'session').replace(/[^a-zA-Z0-9_-]/g, '_');
    link.setAttribute('href', url);
    link.setAttribute('download', `IGNOU_SC2033_Intake_Session_${safeSession}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    try {
      logAuditEvent({
        action: 'SHEETS_SYNCED' as any,
        category: 'ASSIGNMENT_INTAKE' as any,
        actor: currentRole === 'ADMIN' ? `${settings.coordinatorName || 'Coordinator'} (Admin)` : 'Administrator',
        role: currentRole,
        session: currentSession,
        targetIdentifier: `SESSION_CSV_${safeSession}`,
        summary: `Exported ${sessionIntakes.length} session intake records to CSV for ${currentSession}`,
        details: {
          session: currentSession,
          totalRecords: sessionIntakes.length,
          totalCourses: sessionIntakes.reduce((acc, r) => acc + (r.courseCodes ? r.courseCodes.length : 0), 0),
        },
        status: 'SUCCESS',
      });
    } catch {}

    showToast(`Successfully exported ${sessionIntakes.length} records for ${currentSession} to CSV`, 'success');
  };

  // Scope and course validation states for Rule 1, 2, and 3
  const registeredProgForEnrollment = useMemo(() => {
    const clean = String(enrollmentNo || '').trim();
    if (!clean || clean.length < 5) return null;
    try {
      const res = getRegisteredProgrammeForEnrollment(clean);
      return typeof res === 'string' ? res : res ? String(res) : null;
    } catch {
      return null;
    }
  }, [enrollmentNo, getRegisteredProgrammeForEnrollment]);

  const alreadyEnrolledCourses = useMemo<Set<string>>(() => {
    const clean = String(enrollmentNo || '').trim();
    if (!clean) return new Set<string>();
    try {
      const res = getEnrolledCoursesForStudent(clean);
      if (res instanceof Set) return res;
      if (Array.isArray(res)) return new Set(res);
      return new Set<string>();
    } catch {
      return new Set<string>();
    }
  }, [enrollmentNo, getEnrolledCoursesForStudent]);

  const alreadyEnrolledComponents = useMemo<Map<string, Set<'Assignment' | 'Practical'>>>(() => {
    const clean = String(enrollmentNo || '').trim();
    if (!clean) return new Map();
    try {
      const res = getEnrolledCourseComponentsForStudent(clean);
      return res instanceof Map ? res : new Map();
    } catch {
      return new Map();
    }
  }, [enrollmentNo, getEnrolledCourseComponentsForStudent]);

  // Detect existing intake for this student in active session to enable Part-by-Part integration
  const existingIntakeForStudent = useMemo<IntakeRecord | null>(() => {
    const clean = String(enrollmentNo || '').replace(/\D/g, '').trim();
    if (!clean) return null;
    const targetSession = selectedSession || currentSession;
    return (
      (sessionIntakes || []).find((r) => {
        const itEnr = String(r.enrollmentNo || (r as any).Enrollment_No || '').replace(/\D/g, '').trim();
        const itSession = r.session || (r as any).Session;
        return itEnr === clean && (!itSession || norm(itSession) === norm(targetSession));
      }) || null
    );
  }, [enrollmentNo, selectedSession, currentSession, sessionIntakes]);

  const isRule1Violated = Boolean(
    registeredProgForEnrollment &&
    selectedProgramme &&
    String(registeredProgForEnrollment).toUpperCase() !== String(selectedProgramme || '').trim().toUpperCase()
  );

  // Real-time Background Data Entry Validation Service:
  // Checks for common data entry errors (malformed enrollment numbers, names, phone numbers,
  // programme codes, dates) before pushing data to Google Sheets, providing real-time feedback
  // to the user and always recording separately Assignment(TMA) and Practical.
  const realtimeValidation = useMemo(() => {
    return runBackgroundDataEntryValidation(
      {
        enrollmentNo,
        studentName,
        studentPhone,
        programmeCode: selectedProgramme,
        courseCodes: selectedCourses,
        courseComponents: courseComponentTypes,
        submissionDate,
        session: selectedSession || currentSession,
      },
      {
        existingIntakes: allIntakes || sessionIntakes,
        existingEvaluations: allCourseEvaluations || sessionCourseEvaluations,
        existingReceipts: allRegistrationReceipts || sessionRegistrationReceipts,
        currentSession: selectedSession || currentSession,
      }
    );
  }, [
    enrollmentNo,
    studentName,
    studentPhone,
    selectedProgramme,
    selectedCourses,
    courseComponentTypes,
    submissionDate,
    selectedSession,
    currentSession,
    allIntakes,
    sessionIntakes,
    allCourseEvaluations,
    sessionCourseEvaluations,
    allRegistrationReceipts,
    sessionRegistrationReceipts,
  ]);

  // Active student registration profile (Fresh Admission or Re-Registration)
  const studentRegistration = useMemo(() => {
    const clean = String(enrollmentNo || '').replace(/\D/g, '').trim();
    if (!clean || clean.length < 5) return null;
    return getStudentRegistrationByEnrollment(clean);
  }, [enrollmentNo, getStudentRegistrationByEnrollment, studentRegistrations]);

  const registrationEligibility = useMemo(() => {
    if (!studentRegistration) return null;
    return getAssignmentSubmissionEligibility(
      studentRegistration.cadre,
      studentRegistration.session,
      studentRegistration.academicYear
    );
  }, [studentRegistration]);

  const programmeDurationInfo = useMemo(() => {
    return getProgrammeDurationInfo(selectedProgramme || studentRegistration?.programmeCode);
  }, [selectedProgramme, studentRegistration]);

  // Auto-fill student profile when existing enrollment is typed (Priority 1: Fresh & Re-Registration master, Priority 2: Returning Intakes)
  useEffect(() => {
    const clean = String(enrollmentNo || '').replace(/\D/g, '').trim();
    if (clean.length >= 5) {
      try {
        // Priority 1: Check Fresh Admission & Re-Registration Database
        const regMatch = getStudentRegistrationByEnrollment(clean);
        if (regMatch) {
          if (regMatch.studentName && (!studentName || studentName !== regMatch.studentName)) {
            setStudentName(regMatch.studentName);
          }
          if (regMatch.studentPhone && (!studentPhone || studentPhone !== regMatch.studentPhone)) {
            setStudentPhone(regMatch.studentPhone.replace(/\D/g, '').slice(0, 10));
          }
          if (regMatch.studentEmail && (!studentEmail || studentEmail !== regMatch.studentEmail)) {
            setStudentEmail(regMatch.studentEmail);
          }
          if (regMatch.programmeCode && (!selectedProgramme || selectedProgramme !== regMatch.programmeCode)) {
            setSelectedProgramme(regMatch.programmeCode);
          }
          return;
        }

        // Priority 2: Returning student in Intakes / Ledger
        if (clean.length >= 9) {
          const existingProg = getRegisteredProgrammeForEnrollment(clean);
          if (existingProg && !selectedProgramme) {
            setSelectedProgramme(String(existingProg));
          }
          const match =
            (allIntakes || []).find((i) => String(i?.enrollmentNo || (i as any)?.Enrollment_No || '').trim() === clean) ||
            (allCourseEvaluations || []).find((e) => String(e?.enrollmentNo || (e as any)?.Enrollment_No || '').trim() === clean);
          if (match) {
            const matchedName =
              match.studentName ||
              (match as any).Candidate_Name ||
              (match as any)['Candidate Name'] ||
              (match as any).candidateName;
            if (!studentName && matchedName) setStudentName(String(matchedName));

            const matchedPhone =
              match.studentPhone ||
              (match as any).Contact ||
              (match as any)['Contact'] ||
              (match as any).contact;
            if (!studentPhone && matchedPhone) {
              setStudentPhone(String(matchedPhone).replace(/\D/g, '').slice(0, 10));
            }

            const matchedEmail =
              (match as any).studentEmail ||
              (match as any).Email ||
              (match as any)['Email_ID'] ||
              (match as any).email;
            if (!studentEmail && matchedEmail) {
              setStudentEmail(String(matchedEmail));
            }
          }
        }
      } catch (err) {
        console.warn('Auto-fill profile error:', err);
      }
    }
  }, [enrollmentNo, getStudentRegistrationByEnrollment, allIntakes, allCourseEvaluations, getRegisteredProgrammeForEnrollment, selectedProgramme, studentName, studentPhone, studentEmail]);

  // Live IGNOU title lookup states
  const [fetchingIgnouCodes, setFetchingIgnouCodes] = useState<Record<string, boolean>>({});
  const [isBulkFetchingTitles, setIsBulkFetchingTitles] = useState(false);
  const [newCourseForProgrammeInput, setNewCourseForProgrammeInput] = useState('');
  const [isAddingNewProgrammeInline, setIsAddingNewProgrammeInline] = useState(false);
  const [inlineNewProgCode, setInlineNewProgCode] = useState('');
  const [inlineNewProgName, setInlineNewProgName] = useState('');

  // Programme Combobox & Custom Override states
  const [progSearchQuery, setProgSearchQuery] = useState('');
  const [isProgDropdownOpen, setIsProgDropdownOpen] = useState(false);
  const [isCustomProgMode, setIsCustomProgMode] = useState(false);
  const [customProgInput, setCustomProgInput] = useState('');
  const progDropdownRef = useRef<HTMLDivElement>(null);

  // Sub-view toggle for Desk Official
  const [deskView, setDeskView] = useState<'REGISTER' | 'SUBMISSIONS_REGISTER' | 'RECEIPTS'>('REGISTER');
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
  const [isBannerCollapsed, setIsBannerCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('ignou_sc2033_intake_banner_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleBannerCollapsed = () => {
    setIsBannerCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('ignou_sc2033_intake_banner_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  // Flexible Session Filtering: normalizes activeSession so whitespace, date formatting, or case does not hide valid rows
  const normalizeSession = (s: any) => norm(s);

  const filteredIntake = useMemo(() => {
    const list = (intakeRegister && intakeRegister.length > 0)
      ? intakeRegister
      : (allIntakes && allIntakes.length > 0)
      ? allIntakes
      : sessionIntakes;
    return list.filter((row: any) => {
      if (!currentSession || currentSession === "All" || currentSession.toLowerCase() === "all") return true;
      return norm(row.Session || row.session) === norm(currentSession);
    });
  }, [intakeRegister, allIntakes, sessionIntakes, currentSession]);

  const displayedRecentIntakes = useMemo(() => {
    if (!selectedChartProgramme) return filteredIntake;
    return filteredIntake.filter((record: any) => {
      const prog = (record.Programme || record.programme || record.programmeCode || '').trim().toUpperCase();
      return prog === selectedChartProgramme.toUpperCase();
    });
  }, [filteredIntake, selectedChartProgramme]);

  // Validity Rule Audit: Checks whether any enrollment number has duplicate entries across all intakes in the active session
  const duplicateEnrollmentGroups = useMemo<DuplicateEnrollmentGroup[]>(() => {
    const targetSession = selectedSession || currentSession;
    const recordsInSession = sessionIntakes.filter((r) => {
      const s = r.session || (r as any).Session;
      return !s || norm(s) === norm(targetSession);
    });

    const enrollmentMap = new Map<string, IntakeRecord[]>();
    recordsInSession.forEach((r) => {
      const clean = String(r?.enrollmentNo || (r as any)?.Enrollment_No || '').trim();
      if (!clean) return;
      const list = enrollmentMap.get(clean) || [];
      list.push(r);
      enrollmentMap.set(clean, list);
    });

    const dupes: DuplicateEnrollmentGroup[] = [];
    enrollmentMap.forEach((records, enrollmentNo) => {
      if (records.length > 1) {
        const studentName = records[0].studentName || (records[0] as any).Candidate_Name || 'Candidate';
        const progs = Array.from(new Set(records.map((r) => (r.programmeCode || (r as any).Programme || '').trim().toUpperCase())));
        const isProgrammeConflict = progs.length > 1;

        // Check duplicate courses
        const allCourses: string[] = [];
        const dupeCourses: string[] = [];
        records.forEach((r) => {
          const cList = r.courseCodes || (r as any).Courses || [];
          const arr = Array.isArray(cList) ? cList : String(cList).split(',').map((c: string) => c.trim().toUpperCase());
          arr.forEach((c: string) => {
            if (allCourses.includes(c) && !dupeCourses.includes(c)) {
              dupeCourses.push(c);
            }
            allCourses.push(c);
          });
        });

        dupes.push({
          enrollmentNo,
          studentName,
          programmeCodes: progs,
          records,
          isProgrammeConflict,
          duplicateCourses: dupeCourses,
          isSupplementaryMultiCourse: !isProgrammeConflict && dupeCourses.length === 0,
        });
      }
    });

    return dupes;
  }, [sessionIntakes, selectedSession, currentSession]);

  const conflictEnrollmentGroups = useMemo(() => {
    return duplicateEnrollmentGroups.filter((g) => g.isProgrammeConflict || g.duplicateCourses.length > 0);
  }, [duplicateEnrollmentGroups]);

  const supplementaryEnrollmentGroups = useMemo(() => {
    return duplicateEnrollmentGroups.filter((g) => g.isSupplementaryMultiCourse);
  }, [duplicateEnrollmentGroups]);

  const filteredReceipts = useMemo(() => {
    if (!currentSession || currentSession === "All" || currentSession.toLowerCase() === "all") {
      return (allRegistrationReceipts && allRegistrationReceipts.length > 0)
        ? allRegistrationReceipts
        : sessionRegistrationReceipts;
    }
    return sessionRegistrationReceipts;
  }, [allRegistrationReceipts, sessionRegistrationReceipts, currentSession]);

  const handleEditClick = (record: any) => {
    setEditingRecord(record);
  };

  const handleDeleteClick = (record: any) => {
    // 4. Access Guard: Require Coordinator Mode (PIN 2033) for Delete actions
    if (!isAdmin) {
      const enteredPin = window.prompt('Coordinator PIN Required: Enter PIN 2033 to authorize deletion of intake records:');
      if (!enteredPin) return;
      if (enteredPin.trim() === '2033') {
        const authorized = verifyAndSetAdminRole('2033');
        if (!authorized) {
          showToast('Coordinator PIN verification failed.', 'error');
          return;
        }
      } else {
        showToast('Unauthorized: Incorrect Coordinator PIN.', 'error');
        return;
      }
    }

    // 3. Check if any course for this student in courseLedger has status === "Locked" or isLocked
    const activeSession = record.session || currentSession;
    const isAnyCourseLocked = allCourseEvaluations.some(
      (ce) =>
        (ce.intakeId === record.id || String(ce?.enrollmentNo || '').trim() === String(record?.enrollmentNo || '').trim()) &&
        String(ce.session || '').trim().toLowerCase() === String(activeSession || '').trim().toLowerCase() &&
        (ce.isLocked || (ce.status as any) === 'Locked' || ce.status === 'Marks Locked')
    );

    if (isAnyCourseLocked) {
      showToast('Cannot delete intake. Marks have already been locked for one or more courses.', 'error');
      return;
    }

    // Confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete intake receipt for ${record.studentName} (${record.enrollmentNo})? This will also remove unpacked pending scripts from Course Ledger.`
    );

    if (confirmed) {
      deleteIntakeRecord(record.id);
    }
  };

  // Keep selectedSession in sync if currentSession changes
  useEffect(() => {
    setSelectedSession(currentSession);
  }, [currentSession]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (progDropdownRef.current && !progDropdownRef.current.contains(e.target as Node)) {
        setIsProgDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered programmes for the combobox (standard + custom added + intake history)
  const filteredProgrammes = useMemo(() => {
    const q = progSearchQuery.trim().toUpperCase();
    if (!q) return allProgrammes;
    return allProgrammes.filter(
      (p) => p.code.toUpperCase().includes(q) || p.name.toUpperCase().includes(q)
    );
  }, [progSearchQuery, allProgrammes]);

  // Selected programme info from dynamic registry
  const programmeData = useMemo(() => {
    return allProgrammes.find((p) => p.code === selectedProgramme);
  }, [selectedProgramme, allProgrammes]);

  // Available courses for currently selected programme (standard + custom + history)
  const availableProgrammeCourses = useMemo(() => {
    if (!selectedProgramme) return [];
    return getProgrammeCourses(selectedProgramme);
  }, [selectedProgramme, getProgrammeCourses]);

  // Autocomplete course suggestions across all known courses
  const courseAutocompleteList = useMemo(() => {
    if (!courseSearchInput.trim()) return [];
    const query = courseSearchInput.trim().toUpperCase();
    const matches: { code: string; title: string; programme: string }[] = [];
    const seen = new Set<string>();

    // Search courses for currently selected programme first
    if (selectedProgramme) {
      const progCourses = getProgrammeCourses(selectedProgramme);
      progCourses.forEach((c) => {
        const title = getCourseTitle(c.code, selectedProgramme);
        if (
          (c.code.toUpperCase().includes(query) || title.toUpperCase().includes(query)) &&
          !selectedCourses.includes(c.code) &&
          !seen.has(c.code)
        ) {
          seen.add(c.code);
          matches.push({ code: c.code, title, programme: selectedProgramme });
        }
      });
    }

    // Search across all other programmes in registry
    allProgrammes.forEach((p) => {
      if (p.code === selectedProgramme) return;
      const pCourses = getProgrammeCourses(p.code);
      pCourses.forEach((c) => {
        const title = getCourseTitle(c.code, p.code);
        if (
          (c.code.toUpperCase().includes(query) || title.toUpperCase().includes(query)) &&
          !selectedCourses.includes(c.code) &&
          !seen.has(c.code)
        ) {
          seen.add(c.code);
          matches.push({ code: c.code, title, programme: p.code });
        }
      });
    });

    return matches.slice(0, 15);
  }, [courseSearchInput, selectedCourses, selectedProgramme, allProgrammes, getProgrammeCourses, getCourseTitle]);

  const handleSelectProgramme = (progCode: string) => {
    setSelectedProgramme(progCode);
    setIsCustomProgMode(false);
    setCustomProgInput('');
    setProgSearchQuery('');
    setIsProgDropdownOpen(false);
    setErrorMsg('');
  };

  const handleApplyCustomProgramme = (code: string, customName?: string) => {
    const clean = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!clean) return;
    saveCustomProgramme({
      code: clean,
      name: customName?.trim() || `Programme ${clean}`,
      level: 'Diploma',
    });
    setSelectedProgramme(clean);
    setIsCustomProgMode(false);
    setCustomProgInput('');
    setProgSearchQuery('');
    setIsProgDropdownOpen(false);
    setErrorMsg('');
    setSuccessMsg(`Added programme "${clean}" to quick suggestions. It will now appear in quick suggestions every time.`);
    setTimeout(() => setSuccessMsg(''), 4500);
  };

  const handleSaveInlineNewProgramme = () => {
    const cleanCode = inlineNewProgCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!cleanCode) {
      setErrorMsg('Programme code is required (e.g. BLIS, DTS, MAJY).');
      return;
    }
    saveCustomProgramme({
      code: cleanCode,
      name: inlineNewProgName.trim() || `Programme ${cleanCode}`,
      level: 'Diploma',
    });
    setSelectedProgramme(cleanCode);
    setInlineNewProgCode('');
    setInlineNewProgName('');
    setIsAddingNewProgrammeInline(false);
    setErrorMsg('');
    setSuccessMsg(`Added programme "${cleanCode}"! It is now saved in Quick Suggestions.`);
    setTimeout(() => setSuccessMsg(''), 4500);
  };

  // Course addition with dynamic multi-course support, duplicate check, and unlimited selection (up to 50)
  // Course addition with dynamic multi-course support: allows intake if course code or component is different
  const handleAddCourse = (courseCode: string, initialType?: 'Assignment' | 'Practical' | 'Both') => {
    if (!courseCode.trim()) return;
    const splitCourses = courseCode
      .split(',')
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean);

    if (splitCourses.length === 0) return;

    if (selectedCourses.length + splitCourses.length > 50) {
      setErrorMsg('Maximum 50 course codes can be registered per submission batch.');
      return;
    }

    const cleanEnrollment = enrollmentNo.trim();
    const newCoursesToAdd: string[] = [];
    const skippedAlreadyEnrolled: string[] = [];
    const skippedAlreadyInBatch: string[] = [];

    for (const clean of splitCourses) {
      const isBrl = /^BRL[-_]?\d+/i.test(clean);
      const isDual = isDualComponentCourse(clean);
      const isPrac = !isBrl && isPracticalCourse(clean);
      // Absolute Precedence: User selected category / initialType takes priority.
      // All BRL courses (BRL-101 to BRL-115) are strictly Assignment (TMA).
      const defaultComp: 'Assignment' | 'Practical' | 'Both' =
        initialType ||
        (isBrl
          ? 'Assignment'
          : defaultIntakeComponent === 'Practical'
          ? (isDual ? 'Practical' : 'Practical')
          : (isDual ? 'Assignment' : isPrac ? 'Practical' : 'Assignment'));

      // Rule 3 check: Cannot enroll in the exact same course component more than once
      // Practical submissions are allowed if the student has not yet submitted practical for this course
      const studentComps = cleanEnrollment ? alreadyEnrolledComponents.get(clean) : undefined;
      const alreadyHasSameComp =
        studentComps &&
        (defaultComp === 'Both'
          ? (studentComps.has('Assignment') || studentComps.has('Practical'))
          : studentComps.has(defaultComp as 'Assignment' | 'Practical'));

      if (alreadyHasSameComp) {
        skippedAlreadyEnrolled.push(clean);
        continue;
      }

      // Check duplicate within same intake entry
      if (selectedCourses.includes(clean) || newCoursesToAdd.includes(clean)) {
        skippedAlreadyInBatch.push(clean);
        continue;
      }

      newCoursesToAdd.push(clean);
      setCourseComponentTypes((prev) => ({
        ...prev,
        [clean]: prev[clean] || defaultComp,
      }));

      // Save course to programme's custom courses so next time it is in quick suggestions!
      if (selectedProgramme) {
        saveCustomCourse(selectedProgramme, { code: clean });
      }

      // Fetch or update course title from IGNOU.ac.in in background
      updateCourseTitleFromIgnou(clean, selectedProgramme).catch(() => {});
    }

    if (newCoursesToAdd.length > 0) {
      setSelectedCourses([...selectedCourses, ...newCoursesToAdd]);
      setErrorMsg('');
      if (skippedAlreadyEnrolled.length > 0) {
        showToast(
          `Added differing course(s): ${newCoursesToAdd.join(', ')}. (Skipped ${skippedAlreadyEnrolled.join(', ')}: already enrolled for student ${cleanEnrollment}).`,
          'info'
        );
      }
    } else {
      if (skippedAlreadyEnrolled.length > 0) {
        const msg = `Duplicate course selection detected: Student ${cleanEnrollment} is already enrolled in course(s): ${skippedAlreadyEnrolled.join(', ')}. RULE: Additional intake of student is permitted if the course code is different.`;
        showToast(msg, 'error');
        setErrorMsg(msg);
      } else if (skippedAlreadyInBatch.length > 0) {
        setErrorMsg(`Course(s) "${skippedAlreadyInBatch.join(', ')}" already added to this intake entry.`);
      }
    }
    setCourseSearchInput('');
  };

  const handleSelectAllCourses = () => {
    if (!availableProgrammeCourses || availableProgrammeCourses.length === 0) return;
    // Rule: Filter to differing courses that are NOT already enrolled by this student
    const differingCourses = availableProgrammeCourses.filter(
      (c) => !(alreadyEnrolledCourses instanceof Set && alreadyEnrolledCourses.has(c.code))
    );
    if (differingCourses.length === 0) {
      showToast(
        `Student ${enrollmentNo || 'Candidate'} has already registered all courses for ${selectedProgramme}.`,
        'info'
      );
      return;
    }
    const codes = differingCourses.map((c) => c.code);
    handleAddCourse(codes.join(','));
  };

  const handleRemoveCourse = (courseCode: string) => {
    setSelectedCourses(selectedCourses.filter((c) => c !== courseCode));
    setCourseComponentTypes((prev) => {
      const next = { ...prev };
      delete next[courseCode];
      return next;
    });
    setErrorMsg('');
  };

  // Live fetch course title from IGNOU.ac.in
  const handleFetchIgnouTitle = async (code: string) => {
    setFetchingIgnouCodes((prev) => ({ ...prev, [code]: true }));
    try {
      const title = await updateCourseTitleFromIgnou(code, selectedProgramme);
      if (title) {
        setSuccessMsg(`Fetched course title for ${code} from IGNOU.ac.in: "${title}"`);
        setTimeout(() => setSuccessMsg(''), 4500);
      }
    } catch {
      // Handled
    } finally {
      setFetchingIgnouCodes((prev) => ({ ...prev, [code]: false }));
    }
  };

  const handleFetchAllIgnouTitles = async () => {
    if (selectedCourses.length === 0) return;
    setIsBulkFetchingTitles(true);
    try {
      for (const code of selectedCourses) {
        setFetchingIgnouCodes((prev) => ({ ...prev, [code]: true }));
        try {
          await updateCourseTitleFromIgnou(code, selectedProgramme);
        } finally {
          setFetchingIgnouCodes((prev) => ({ ...prev, [code]: false }));
        }
      }
      setSuccessMsg(`Updated titles from IGNOU.ac.in for ${selectedCourses.length} course(s).`);
      setTimeout(() => setSuccessMsg(''), 4500);
    } finally {
      setIsBulkFetchingTitles(false);
    }
  };

  // Add custom course to current programme suggestions
  const handleAddCustomCourseToProgramme = () => {
    const code = newCourseForProgrammeInput.trim().toUpperCase();
    if (!code) return;
    if (!selectedProgramme) {
      setErrorMsg('Please select a Programme before adding courses.');
      return;
    }
    saveCustomCourse(selectedProgramme, { code });
    handleAddCourse(code);
    setNewCourseForProgrammeInput('');
    setSuccessMsg(`Added course "${code}" to ${selectedProgramme} quick suggestions & fetched title from IGNOU.`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // Primary action: "Submit & Generate Receipt" (Strictly Non-Financial)
  const handleSubmitAndGenerateReceipt = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    setErrorMsg('');
    setSuccessMsg('');

    // Validation
    const cleanEnrollment = enrollmentNo.trim();
    if (!cleanEnrollment) {
      const msg = 'Student Enrollment Number is required.';
      setValidationResult({
        status: 'Rejected',
        action: 'Create',
        rule: 'Required Field',
        reason: msg,
        timestamp: new Date().toISOString(),
      });
      setErrorMsg(msg);
      return;
    }
    if (!/^\d{9,10}$/.test(cleanEnrollment)) {
      const msg = 'IGNOU Enrollment Number must be 9 or 10 numeric digits.';
      setValidationResult({
        status: 'Rejected',
        action: 'Create',
        rule: 'Rule 1: Enrollment Number Format',
        reason: msg,
        timestamp: new Date().toISOString(),
      });
      setErrorMsg(msg);
      return;
    }
    if (!studentName.trim()) {
      const msg = 'Candidate Name is required.';
      setValidationResult({
        status: 'Rejected',
        action: 'Create',
        rule: 'Required Field',
        reason: msg,
        timestamp: new Date().toISOString(),
      });
      setErrorMsg(msg);
      return;
    }

    // 1. Strict 10-Digit Mobile Number Validation:
    const cleanPhone = studentPhone.replace(/\D/g, '').slice(0, 10);
    if ((studentPhone && studentPhone.length !== 10) || (!cleanPhone || cleanPhone.length !== 10)) {
      const msg = 'Contact number must be exactly 10 digits.';
      setValidationResult({
        status: 'Rejected',
        action: 'Create',
        rule: 'Contact Verification',
        reason: msg,
        timestamp: new Date().toISOString(),
      });
      setErrorMsg(msg);
      return;
    }

    if (!selectedProgramme.trim()) {
      const msg = 'Please select or specify a Programme Code (e.g. BAG, MEG, BCA, MPS).';
      setValidationResult({
        status: 'Rejected',
        action: 'Create',
        rule: 'Programme Scope',
        reason: msg,
        timestamp: new Date().toISOString(),
      });
      setErrorMsg(msg);
      return;
    }
    // Merge any un-added input in courseSearchInput
    let combinedCourses = [...selectedCourses];
    if (courseSearchInput.trim()) {
      const extra = courseSearchInput
        .split(',')
        .map((c) => c.trim().toUpperCase())
        .filter(Boolean);
      extra.forEach((c) => {
        if (!combinedCourses.includes(c)) combinedCourses.push(c);
      });
    }

    const coursesArray = combinedCourses
      .flatMap((c) => c.split(','))
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean);

    if (coursesArray.length === 0) {
      const msg = 'Please enter or select at least one Course Code.';
      setValidationResult({
        status: 'Rejected',
        action: 'Create',
        rule: 'Rule 3: Course Codes',
        reason: msg,
        timestamp: new Date().toISOString(),
      });
      setErrorMsg(msg);
      return;
    }
    if (coursesArray.length > 50) {
      const msg = 'Maximum 50 course codes can be registered in a single intake receipt.';
      setValidationResult({
        status: 'Rejected',
        action: 'Create',
        rule: 'Rule 2: Maximum Intake Limit',
        reason: msg,
        timestamp: new Date().toISOString(),
      });
      setErrorMsg(msg);
      return;
    }
    if (submissionMode !== 'In-Person (Desk)' && !consignmentNo.trim()) {
      const msg = 'Tracking / Consignment number is required for postal or courier submission.';
      setValidationResult({
        status: 'Rejected',
        action: 'Create',
        rule: 'Postal Tracking',
        reason: msg,
        timestamp: new Date().toISOString(),
      });
      setErrorMsg(msg);
      return;
    }

    const targetSession = selectedSession || currentSession;

    // 1. Rule 1 Check: Enrollment Number vs. Programme Scope
    if (registeredProgForEnrollment && selectedProgramme.trim().toUpperCase() !== registeredProgForEnrollment.toUpperCase()) {
      const msg = `Enrollment number already exists in another programme: Enrollment ${cleanEnrollment} is registered under Programme "${registeredProgForEnrollment}". In IGNOU, an enrollment number cannot belong to a different programme ("${selectedProgramme.trim().toUpperCase()}").`;
      recordRejectedAttempt('Rule 1: Enrollment Number vs. Programme Scope', msg, coursesArray);
      setValidationResult({
        status: 'Rejected',
        action: 'Create',
        rule: 'Rule 1: Enrollment Number vs. Programme Scope',
        reason: msg,
        timestamp: new Date().toISOString(),
        attemptedData: {
          enrollmentNo: cleanEnrollment,
          studentName: studentName.trim(),
          programmeCode: selectedProgramme.trim().toUpperCase(),
          courseCodes: coursesArray,
          session: targetSession,
        },
      });
      setErrorMsg(msg);
      return;
    }

    // Real-Time Background Validation Check before pushing:
    if (!realtimeValidation.isValid) {
      const primaryError = realtimeValidation.errors[0] || 'Please fix data entry errors before saving.';
      recordRejectedAttempt('Background Pre-Push Validation Gate', primaryError, coursesArray);
      setValidationResult({
        status: 'Rejected',
        action: 'Create',
        rule: 'Background Pre-Push Validation Gate',
        reason: primaryError,
        timestamp: new Date().toISOString(),
        attemptedData: {
          enrollmentNo: cleanEnrollment,
          studentName: studentName.trim(),
          programmeCode: selectedProgramme.trim().toUpperCase(),
          courseCodes: coursesArray,
          session: targetSession,
        },
      });
      setErrorMsg(primaryError);
      return;
    }

    // Strictly separate practical and assignment courses: Never mix together
    const computedPracticals: string[] = realtimeValidation.separated.practicalCourses;
    const computedAssignments: string[] = realtimeValidation.separated.assignmentCourses;

    // 2. Strict Validation Engine Check (Rule 1, Rule 2, Rule 3)
    const validation = validateIntake({
      enrollmentNo: cleanEnrollment,
      programmeCode: selectedProgramme.trim().toUpperCase(),
      courseCodes: coursesArray,
      practicalCourses: computedPracticals,
      assignmentCourses: computedAssignments,
      courseComponents: courseComponentTypes,
      session: targetSession,
    });

    if (!validation.valid) {
      recordRejectedAttempt((validation as any).rule || 'Data Integrity Rule', validation.reason, coursesArray);
      setValidationResult({
        status: 'Rejected',
        action: 'Create',
        rule: (validation as any).rule || 'Data Integrity Rule',
        reason: validation.reason,
        timestamp: new Date().toISOString(),
        attemptedData: {
          enrollmentNo: cleanEnrollment,
          studentName: studentName.trim(),
          programmeCode: selectedProgramme.trim().toUpperCase(),
          courseCodes: coursesArray,
          session: targetSession,
        },
      });
      setErrorMsg(validation.reason);
      return;
    }

    setIsSubmitting(true);
    try {
      const registeredBy = currentRole === 'ADMIN' ? 'Coordinator Desk' : 'Desk Official - Counter 1';

      // Ensure global session matches selected session if user switched it
      if (targetSession !== currentSession) {
        setSession(targetSession);
      }

      // If student already has an intake in this session and integration mode is active:
      if (existingIntakeForStudent && shouldIntegrateWithPrevious) {
        const result = integrateIntakeWithPrevious({
          targetIntakeId: existingIntakeForStudent.id,
          newCourseCodes: coursesArray,
          practicalCourses: computedPracticals,
          assignmentCourses: computedAssignments,
          submissionDate,
          submissionMode,
          consignmentNo: consignmentNo.trim() || undefined,
          remarks: remarks.trim() || undefined,
        });

        const progClean = selectedProgramme.trim().toUpperCase();
        saveCustomProgramme({ code: progClean });
        coursesArray.forEach((c) => {
          saveCustomCourse(progClean, { code: c });
          updateCourseTitleFromIgnou(c, progClean).catch(() => {});
        });

        setJustSubmittedToken(existingIntakeForStudent.tokenNo);
        const partNum = (existingIntakeForStudent.submissionParts?.length || 1) + 1;
        setSuccessMsg(
          `Part-by-part intake integrated! Candidate ${studentName.trim()} (${cleanEnrollment}) added differing course(s): ${coursesArray.join(', ')} under ${progClean} into Token: ${existingIntakeForStudent.tokenNo} (Part ${partNum}). Practicals recorded separately.`
        );

        setValidationResult({
          status: 'Success',
          reason: `Integrated Part ${partNum} into Token ${existingIntakeForStudent.tokenNo}`,
          action: 'Update',
          timestamp: new Date().toLocaleTimeString(),
          cleanData: {
            tokenNo: existingIntakeForStudent.tokenNo,
            enrollmentNo: cleanEnrollment,
            studentName: studentName.trim(),
            programmeCode: progClean,
            courseCodes: coursesArray,
            practicalCourses: computedPracticals,
            assignmentCourses: computedAssignments,
            partNo: partNum,
            isIntegrated: true,
          },
        });

        if (result?.receipt) {
          openRegistrationReceiptModal(result.receipt);
        }

        setSelectedCourses([]);
        setCourseComponentTypes({});
        setCourseSearchInput('');
        setRemarks('');
        setConsignmentNo('');
        setIsSubmitting(false);
        return;
      }

      // 1. Create intake record in IntakeMaster and optimistically unpack to Course_Ledger
      const newRecord = addIntakeRecord({
        session: targetSession,
        enrollmentNo: cleanEnrollment,
        studentName: studentName.trim(),
        studentPhone: cleanPhone,
        studentEmail: studentEmail.trim() || undefined,
        programmeCode: selectedProgramme.trim().toUpperCase(),
        courseCodes: coursesArray,
        practicalCourses: computedPracticals,
        assignmentCourses: computedAssignments,
        submissionDate,
        submissionMode,
        consignmentNo: consignmentNo.trim() || undefined,
        remarks: remarks.trim() || undefined,
        status: 'Received',
        registeredBy,
      });

      // 2. Link each registered course in mock table AssignmentSubmissions
      recordStudentAssignmentSubmissions({
        studentId: cleanEnrollment,
        studentName: studentName.trim(),
        programmeCode: selectedProgramme.trim().toUpperCase(),
        courseCodes: coursesArray,
        practicalCourses: computedPracticals,
        assignmentCourses: computedAssignments,
        session: targetSession,
        initialStatus: 'submitted',
        submissionDate,
        submissionMode,
        consignmentNo: consignmentNo.trim() || undefined,
        remarks: remarks.trim() || undefined,
      });

      // 3. Store official receipt record in mock table RegistrationReceipts (Non-Financial)
      const newReceipt = addRegistrationReceipt({
        intakeId: newRecord.id,
        tokenNo: newRecord.tokenNo,
        studentId: cleanEnrollment,
        studentName: studentName.trim(),
        studentPhone: cleanPhone,
        studentEmail: studentEmail.trim() || undefined,
        programmeCode: selectedProgramme.trim().toUpperCase(),
        session: targetSession,
        registeredCourses: coursesArray,
        practicalCourses: computedPracticals,
        assignmentCourses: computedAssignments,
        issuedBy: registeredBy,
        remarks: remarks.trim() || undefined,
        submissionDate: submissionDate,
        receiptDate: submissionDate,
        issuedAt: `${submissionDate}T${new Date().toTimeString().split(' ')[0]}`,
      });

      (newRecord as any).receiptNumber = newReceipt.receiptNumber;

      // 4. Ensure programme and all submitted courses are stored in quick suggestions
      const progClean = selectedProgramme.trim().toUpperCase();
      saveCustomProgramme({ code: progClean });
      coursesArray.forEach((c) => {
        saveCustomCourse(progClean, { code: c });
        updateCourseTitleFromIgnou(c, progClean).catch(() => {});
      });

      setJustSubmittedToken(newRecord.tokenNo);
      if (alreadyEnrolledCourses instanceof Set && alreadyEnrolledCourses.size > 0) {
        setSuccessMsg(
          `Supplementary intake recorded! Candidate ${studentName.trim()} (${cleanEnrollment}) registered for differing course(s): ${coursesArray.join(', ')} under ${selectedProgramme.trim().toUpperCase()} with Token: ${newRecord.tokenNo}.`
        );
      } else {
        setSuccessMsg(
          `Successfully registered candidate ${studentName.trim()} (${cleanEnrollment}) with Token: ${newRecord.tokenNo}.`
        );
      }

      // Update Validation Summary with success confirmation & clean finalized object
      setValidationResult({
        status: 'Success',
        action: 'Create',
        rule: (alreadyEnrolledCourses instanceof Set && alreadyEnrolledCourses.size > 0)
          ? 'Rule: Supplementary Intake Recorded for Differing Course Codes'
          : 'Rule: Candidate Intake Recorded',
        reason: (alreadyEnrolledCourses instanceof Set && alreadyEnrolledCourses.size > 0)
          ? `Candidate ${studentName.trim()} (${cleanEnrollment}) successfully registered for additional differing course(s): ${coursesArray.join(', ')} in Programme ${selectedProgramme.trim().toUpperCase()}.`
          : `Candidate ${studentName.trim()} (${cleanEnrollment}) registered successfully.`,
        timestamp: new Date().toISOString(),
        cleanData: {
          ...newRecord,
          receiptNumber: newReceipt.receiptNumber,
        },
      });

      // 4. Instantly launch the printable official acknowledgment receipt modal!
      openReceiptModal(newRecord);

      // Reset form fields
      setEnrollmentNo('');
      setStudentName('');
      setStudentPhone('');
      setStudentEmail('');
      setSelectedCourses([]);
      setSubmissionDate(new Date().toISOString().split('T')[0]);
      setConsignmentNo('');
      setRemarks('');
      setCourseSearchInput('');
    } catch (err: any) {
      console.error(err);
      const msg = err?.message || 'Failed to complete registration and store receipt. Please try again.';
      setValidationResult({
        status: 'Rejected',
        action: 'Create',
        rule: 'System Processing Error',
        reason: msg,
        timestamp: new Date().toISOString(),
      });
      setErrorMsg(msg);
    } finally {
      setTimeout(() => setIsSubmitting(false), 1500); // Debounce protection
    }
  };

  // Pre-Check Integrity Action: lets operators run integrity check without committing
  const handleRunPreCheck = () => {
    setErrorMsg('');
    setSuccessMsg('');
    const cleanEnrollment = enrollmentNo.trim();
    if (!cleanEnrollment) {
      setValidationResult({
        status: 'Rejected',
        action: 'Validate',
        rule: 'Rule 1: Enrollment Number vs. Programme Scope',
        reason: 'Student Enrollment Number is required to run the integrity check.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (!selectedProgramme) {
      setValidationResult({
        status: 'Rejected',
        action: 'Validate',
        rule: 'Rule 1: Enrollment Number vs. Programme Scope',
        reason: 'Programme code is required to run the integrity check.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const combinedCourses = [...selectedCourses];
    if (courseSearchInput.trim()) {
      const extra = courseSearchInput
        .split(',')
        .map((c) => c.trim().toUpperCase())
        .filter(Boolean);
      extra.forEach((c) => {
        if (!combinedCourses.includes(c)) combinedCourses.push(c);
      });
    }

    const coursesArray = combinedCourses
      .flatMap((c) => c.split(','))
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean);

    if (coursesArray.length === 0) {
      setValidationResult({
        status: 'Rejected',
        action: 'Validate',
        rule: 'Rule 3: No Duplicate Course Selections',
        reason: 'Please enter or select at least one Course Code to run the integrity check.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const targetSession = selectedSession || currentSession;

    // Rule 1 check
    if (registeredProgForEnrollment && selectedProgramme.trim().toUpperCase() !== registeredProgForEnrollment.toUpperCase()) {
      const msg = `Enrollment number already exists in another programme: Enrollment ${cleanEnrollment} is registered under Programme "${registeredProgForEnrollment}". In IGNOU, an enrollment number cannot belong to a different programme ("${selectedProgramme.trim().toUpperCase()}").`;
      setValidationResult({
        status: 'Rejected',
        action: 'Validate',
        rule: 'Rule 1: Enrollment Number vs. Programme Scope',
        reason: msg,
        timestamp: new Date().toISOString(),
        attemptedData: {
          enrollmentNo: cleanEnrollment,
          studentName: studentName.trim(),
          programmeCode: selectedProgramme.trim().toUpperCase(),
          courseCodes: coursesArray,
          session: targetSession,
        },
      });
      return;
    }

    const computedPracticals: string[] = [];
    const computedAssignments: string[] = [];
    coursesArray.forEach((c) => {
      const isBrl = /^BRL[-_]?\d+/i.test(c);
      const isDual = isDualComponentCourse(c);
      const isPrac = !isBrl && isPracticalCourse(c);
      const ct = isBrl
        ? 'Assignment'
        : courseComponentTypes[c] || (defaultIntakeComponent === 'Practical' ? 'Practical' : (isDual ? 'Both' : isPrac ? 'Practical' : 'Assignment'));
      if (ct === 'Both') {
        computedAssignments.push(c);
        computedPracticals.push(c);
      } else if (ct === 'Practical') {
        computedPracticals.push(c);
      } else {
        computedAssignments.push(c);
      }
    });

    const validation = validateIntake({
      enrollmentNo: cleanEnrollment,
      programmeCode: selectedProgramme.trim().toUpperCase(),
      courseCodes: coursesArray,
      practicalCourses: computedPracticals,
      assignmentCourses: computedAssignments,
      courseComponents: courseComponentTypes,
      session: targetSession,
    });

    if (!validation.valid) {
      setValidationResult({
        status: 'Rejected',
        action: 'Validate',
        rule: (validation as any).rule || 'Data Integrity Rule',
        reason: validation.reason,
        timestamp: new Date().toISOString(),
        attemptedData: {
          enrollmentNo: cleanEnrollment,
          studentName: studentName.trim(),
          programmeCode: selectedProgramme.trim().toUpperCase(),
          courseCodes: coursesArray,
          session: targetSession,
        },
      });
    } else {
      setValidationResult({
        status: 'Success',
        action: 'Validate',
        timestamp: new Date().toISOString(),
        cleanData: {
          enrollmentNo: cleanEnrollment,
          studentName: studentName.trim() || 'Candidate Name Pending',
          programmeCode: selectedProgramme.trim().toUpperCase(),
          courseCodes: coursesArray,
          session: targetSession,
          submissionDate,
          submissionMode,
        },
      });
    }
  };

  // Validity Rule Audit: Trigger integrity scan to detect duplicate enrollment numbers across all current active session records
  const handleTriggerIntegrityScan = () => {
    setIsScanningDuplicates(true);
    const targetSession = selectedSession || currentSession;

    setTimeout(() => {
      setIsScanningDuplicates(false);
      setIsAuditModalOpen(true);
      const totalEnrCount = new Set(sessionIntakes.map((r) => String(r?.enrollmentNo || '').trim()).filter(Boolean)).size;
      if (conflictEnrollmentGroups.length > 0) {
        setValidationResult({
          status: 'Rejected',
          action: 'Validate',
          rule: 'Integrity Scan: Duplicate Enrollment Conflicts',
          reason: `Integrity Scan Alert: Found ${conflictEnrollmentGroups.length} enrollment number conflict(s) across intake records in active session ${targetSession} (programme mismatch or repeated courses).`,
          timestamp: new Date().toISOString(),
        });
      } else if (supplementaryEnrollmentGroups.length > 0) {
        setValidationResult({
          status: 'Success',
          action: 'Validate',
          rule: 'Integrity Scan: Multi-Course Supplementary Intakes Valid',
          reason: `Integrity Scan Verified: Found ${supplementaryEnrollmentGroups.length} candidate(s) with multiple intakes under the same programme having differing course codes. This is 100% permitted under IGNOU rules.`,
          timestamp: new Date().toISOString(),
          cleanData: {
            session: targetSession,
            totalRecords: sessionIntakes.length,
            uniqueEnrollments: totalEnrCount,
            supplementaryCandidateGroups: supplementaryEnrollmentGroups.length,
          },
        });
      } else {
        setValidationResult({
          status: 'Success',
          action: 'Validate',
          rule: 'Integrity Scan: Enrollment Integrity Verified',
          reason: `Integrity Scan Passed: All ${totalEnrCount} student enrollment numbers across ${sessionIntakes.length} intake records in active session ${targetSession} are completely unique. No duplicates detected.`,
          timestamp: new Date().toISOString(),
          cleanData: {
            session: targetSession,
            totalRecords: sessionIntakes.length,
            uniqueEnrollments: totalEnrCount,
          },
        });
      }
    }, 250);
  };

  const handleOpenEnrollmentAudit = handleTriggerIntegrityScan;

  // Single Enrollment Check: checks if the entered enrollment number already has an intake in the active session
  const handleCheckSingleEnrollmentInActiveSession = () => {
    const cleanEnr = enrollmentNo.trim();
    if (!cleanEnr) {
      const msg = 'Please enter an Enrollment Number to check.';
      setErrorMsg(msg);
      setValidationResult({
        status: 'Rejected',
        action: 'Validate',
        rule: 'Enrollment Input Required',
        reason: 'Please enter a 9 or 10-digit Student Enrollment Number first.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const targetSession = selectedSession || currentSession;
    const existingMatches = sessionIntakes.filter((r) => {
      const s = r.session || (r as any).Session;
      const matchSession = !s || norm(s) === norm(targetSession);
      const matchEnr = String(r?.enrollmentNo || (r as any)?.Enrollment_No || '').trim() === cleanEnr;
      return matchSession && matchEnr;
    });

    if (existingMatches.length > 0) {
      const first = existingMatches[0];
      const prog = first.programmeCode || (first as any).Programme;
      const allSubmittedCourses = existingMatches.flatMap((m) => {
        const raw = m.courseCodes || (m as any).courses || (m as any).Courses || [];
        return Array.isArray(raw)
          ? raw
          : typeof raw === 'string'
          ? raw.split(',').map((c: string) => c.trim()).filter(Boolean)
          : [];
      });
      const coursesStr = allSubmittedCourses.join(', ');

      // Autofill candidate name and programme if currently empty
      const candName =
        first.studentName ||
        (first as any).Candidate_Name ||
        (first as any)['Candidate Name'] ||
        (first as any).candidateName;
      if (!studentName && candName) {
        setStudentName(String(candName));
      }
      if (!selectedProgramme && prog) {
        setSelectedProgramme(String(prog));
      }

      // Check if user currently has courses entered or selected
      const currentSelected = [...selectedCourses];
      if (courseSearchInput.trim()) {
        courseSearchInput
          .split(',')
          .map((c) => c.trim().toUpperCase())
          .filter(Boolean)
          .forEach((c) => {
            if (!currentSelected.includes(c)) currentSelected.push(c);
          });
      }

      const hasSelectedCourses = currentSelected.length > 0;
      const enrolledComps = alreadyEnrolledComponents;
      const overlapping = currentSelected.filter((c) => {
        const comps = enrolledComps.get(c);
        if (!comps || comps.size === 0) return false;
        const desired = courseComponentTypes[c] || defaultIntakeComponent;
        if (desired === 'Both') {
          return comps.has('Assignment') || comps.has('Practical');
        }
        return comps.has(desired as 'Assignment' | 'Practical');
      });
      const differing = currentSelected.filter((c) => !overlapping.includes(c));

      if (hasSelectedCourses && differing.length > 0 && overlapping.length === 0) {
        const msg = `RULE VERIFIED: Student ${cleanEnr} (${candName || studentName || 'Candidate'}) is registered under Programme ${prog}. The selected course code(s) or components [${differing.join(', ')}] DIFFER from previous intake course(s) [${coursesStr}]. Additional intake is FULLY ALLOWED and ready to be added!`;
        setSuccessMsg(`Rule Verified: Additional intake allowed for differing course(s)/component(s): ${differing.join(', ')}.`);
        setErrorMsg('');
        setValidationResult({
          status: 'Success',
          action: 'Validate',
          rule: 'Rule: Supplementary Intake Allowed for Differing Course Codes',
          reason: msg,
          timestamp: new Date().toISOString(),
          cleanData: {
            enrollmentNo: cleanEnr,
            programmeCode: prog,
            studentName: candName || studentName,
            differingCourses: differing.join(', '),
            alreadyEnrolledCourses: coursesStr,
            ruleNotice: 'Add intake of student is permitted since course codes or components differ',
          },
        });
      } else if (hasSelectedCourses && overlapping.length > 0) {
        const msg = `Duplicate course/component detected: Course component(s) [${overlapping.join(', ')}] are already registered for student ${cleanEnr}. RULE: Intake of this student can only be added if course code or component (TMA vs Practical) is different.`;
        setErrorMsg(msg);
        setValidationResult({
          status: 'Rejected',
          action: 'Validate',
          rule: 'Rule 3: No Duplicate Course Selections',
          reason: msg,
          timestamp: new Date().toISOString(),
        });
      } else {
        const msg = `Enrollment ${cleanEnr} (${candName || 'Candidate'}) has existing intake record(s) under Programme ${prog} in cycle (${targetSession}) for courses: [${coursesStr}]. RULE: Additional intake of this student is ALLOWED as long as the newly submitted course code(s) differ from previously enrolled courses.`;
        setSuccessMsg(`Active student profile verified: Additional intake allowed for differing course codes.`);
        setErrorMsg('');
        setValidationResult({
          status: 'Success',
          action: 'Validate',
          rule: 'Rule: Supplementary Intake Allowed for Differing Course Codes',
          reason: msg,
          timestamp: new Date().toISOString(),
          attemptedData: first,
          cleanData: {
            enrollmentNo: cleanEnr,
            programmeCode: prog,
            studentName: candName,
            alreadyEnrolledCourses: coursesStr,
            ruleNotice: 'Add intake allowed if course code differs',
          },
        });
      }
    } else {
      setErrorMsg('');
      const msg = `Verified: Enrollment ${cleanEnr} has no previous intake in active session (${targetSession}). Ready for initial intake registration.`;
      setSuccessMsg(msg);
      setValidationResult({
        status: 'Success',
        action: 'Validate',
        rule: 'Rule: Enrollment Verified',
        reason: msg,
        timestamp: new Date().toISOString(),
        cleanData: {
          enrollmentNo: cleanEnr,
          session: targetSession,
        },
      });
    }
  };

  // Barcode / QR Scanner detection handler
  const handleBarcodeScanSuccess = (decodedText: string) => {
    setIsScannerModalOpen(false);
    const raw = String(decodedText || '').trim();
    if (!raw) return;

    // Check if decoded text is JSON (e.g. from a generated QR)
    let scannedEnrollment = '';
    let scannedToken = '';
    let scannedProgramme = '';
    let scannedCandidateName = '';

    try {
      if (raw.startsWith('{') && raw.endsWith('}')) {
        const parsed = JSON.parse(raw);
        scannedEnrollment = String(parsed.enrollmentNo || parsed.studentId || parsed.Enrollment_No || '').trim();
        scannedToken = String(parsed.tokenNo || parsed.receiptNumber || parsed.token || parsed.id || '').trim();
        scannedProgramme = String(parsed.programmeCode || parsed.programme || parsed.Programme || '').trim();
        scannedCandidateName = String(parsed.candidateName || parsed.studentName || parsed.Candidate_Name || '').trim();
      }
    } catch {}

    // Extract enrollment or token if not parsed from JSON
    if (!scannedEnrollment) {
      if (/^(SC2033|REG-|TOK-|intake-|sub-)/i.test(raw)) {
        scannedToken = raw;
      }
      const enrMatch = raw.match(/\b\d{9,10}\b/);
      if (enrMatch) {
        scannedEnrollment = enrMatch[0];
      } else {
        const digits = raw.replace(/\D/g, '');
        if (digits.length >= 7 && digits.length <= 11) {
          scannedEnrollment = digits;
        } else {
          scannedToken = raw;
        }
      }
    }

    // 1. Try to find existing record in active session by Token or Receipt Number
    let matchedIntake: any = null;
    let matchedReceipt: any = null;

    if (scannedToken) {
      matchedIntake = sessionIntakes.find(
        (r: any) =>
          norm(r.tokenNo) === norm(scannedToken) ||
          norm(r.id) === norm(scannedToken) ||
          norm(r.receiptNumber) === norm(scannedToken) ||
          norm(r.Token_No) === norm(scannedToken)
      );
      matchedReceipt = sessionRegistrationReceipts.find(
        (r: any) =>
          norm(r.receiptNumber) === norm(scannedToken) ||
          norm(r.id) === norm(scannedToken)
      );
    }

    // 2. Try to find by enrollment number in active session
    const targetEnr = scannedEnrollment || matchedIntake?.enrollmentNo || matchedReceipt?.studentId;
    if (!matchedIntake && targetEnr) {
      matchedIntake = sessionIntakes.find(
        (r: any) =>
          String(r.enrollmentNo || r.Enrollment_No || '').trim() === String(targetEnr).trim()
      );
    }

    if (!matchedReceipt && targetEnr) {
      matchedReceipt = sessionRegistrationReceipts.find(
        (r: any) =>
          String(r.studentId || r.enrollmentNo || '').trim() === String(targetEnr).trim()
      );
    }

    if (matchedIntake) {
      const enr = matchedIntake.enrollmentNo || matchedIntake.Enrollment_No || '';
      const name = matchedIntake.studentName || matchedIntake.candidateName || matchedIntake.Candidate_Name || '';
      const prog = matchedIntake.programmeCode || matchedIntake.programme || matchedIntake.Programme || '';
      const phone = matchedIntake.studentPhone || matchedIntake.contact || matchedIntake.Contact || '';
      const courses = matchedIntake.courseCodes || matchedIntake.courses || [];

      setEnrollmentNo(enr);
      if (name) setStudentName(name);
      if (prog) setSelectedProgramme(prog);
      if (phone) setStudentPhone(phone);

      showToast(
        `Scanned & Identified: ${name} (${enr}) - ${prog} [${courses.length} course${courses.length !== 1 ? 's' : ''}] in ${selectedSession || currentSession}`,
        'success'
      );

      openReceiptModal(matchedIntake);
      return;
    }

    if (matchedReceipt) {
      const enr = matchedReceipt.studentId || matchedReceipt.enrollmentNo || '';
      const name = matchedReceipt.studentName || matchedReceipt.candidateName || '';
      const prog = matchedReceipt.programmeCode || matchedReceipt.programme || '';
      const phone = matchedReceipt.studentPhone || matchedReceipt.contact || '';

      setEnrollmentNo(enr);
      if (name) setStudentName(name);
      if (prog) setSelectedProgramme(prog);
      if (phone) setStudentPhone(phone);

      showToast(`Scanned & Retrieved Receipt: ${name} (${enr}) - ${prog}`, 'success');
      openRegistrationReceiptModal(matchedReceipt);
      return;
    }

    // Check if student exists in allIntakes history or lookup catalog
    if (targetEnr) {
      setEnrollmentNo(targetEnr);
      const hist: any = allIntakes.find(
        (r: any) => String(r.enrollmentNo || r.Enrollment_No || '').trim() === String(targetEnr).trim()
      );
      if (hist) {
        if (hist.studentName || hist.candidateName) setStudentName(hist.studentName || hist.candidateName);
        if (hist.programmeCode || hist.programme) setSelectedProgramme(hist.programmeCode || hist.programme);
        if (hist.studentPhone || hist.contact) setStudentPhone(hist.studentPhone || hist.contact);
      } else if (scannedCandidateName) {
        setStudentName(scannedCandidateName);
      }
      if (scannedProgramme) {
        setSelectedProgramme(scannedProgramme);
      }

      showToast(`Scanned Enrollment No: ${targetEnr}. Verified and loaded into Desk.`, 'info');
      setTimeout(() => {
        handleCheckSingleEnrollmentInActiveSession();
      }, 50);
      return;
    }

    showToast(`Scanned barcode/QR: "${raw}". No matching student assignment found.`, 'warning');
  };

  const handleIntakeSubmit = handleSubmitAndGenerateReceipt;

  return (
    <div className="space-y-4">
      {/* Top Banner Notice - Collapsible for maximum vertical screen space */}
      <div className="bg-gradient-to-r from-indigo-950 via-zinc-900 to-indigo-900 text-white rounded-2xl shadow-sm transition-all duration-200">
        <div className={`p-3 sm:p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${
          isBannerCollapsed ? 'py-2.5 sm:py-3' : ''
        }`}>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-zinc-950 uppercase tracking-wide">
                Module A: Student Intake
              </span>
              <span className="text-xs text-indigo-200">
                Cycle: <strong className="text-white">{currentSession}</strong>
              </span>
            </div>
            {!isBannerCollapsed && (
              <>
                <h2 className="text-base sm:text-lg font-black mt-1 tracking-tight">
                  IGNOU Study Centre SC-2033 Assignment Operations
                </h2>
                <p className="text-xs text-zinc-300 mt-0.5 max-w-2xl">
                  Dynamic Multi-Course Registration Desk, printable acknowledgment receipt, and status matrix.
                </p>
              </>
            )}
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            <div className="bg-white/10 backdrop-blur-md rounded-xl px-3 py-1.5 text-xs border border-white/15 flex items-center gap-4">
              <div className="text-right">
                <div className="text-zinc-300 text-[10px] uppercase font-bold">Candidates</div>
                <div className="text-base sm:text-lg font-black text-white leading-tight">
                  {new Set(sessionIntakes.map((r) => String(r?.enrollmentNo || '').trim()).filter(Boolean)).size}
                </div>
              </div>
              <div className="w-px h-6 bg-white/20"></div>
              <div className="text-right">
                <div className="text-zinc-300 text-[10px] uppercase font-bold">Scripts</div>
                <div className="text-base sm:text-lg font-black text-amber-300 leading-tight">
                  {sessionIntakes.reduce((sum, r) => {
                    const c = r?.courseCodes || (r as any)?.courses || (r as any)?.Courses;
                    return sum + (Array.isArray(c) ? c.length : typeof c === 'string' ? c.split(',').filter(Boolean).length : 0);
                  }, 0)}
                </div>
              </div>
            </div>

            {/* Export CSV Button (Visible only to authorized Administrators) */}
            {isAdmin && (
              <button
                type="button"
                id="banner-export-session-csv-btn"
                data-testid="banner-export-session-csv-btn"
                onClick={handleExportSessionCSV}
                className="px-3 py-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-400/40 text-emerald-200 hover:text-white font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
                title={`Export all student intake records for ${currentSession} as a CSV spreadsheet (Authorized Administrator only)`}
              >
                <Download className="w-3.5 h-3.5 text-emerald-300" />
                <span className="hidden sm:inline">Export CSV</span>
                <span className="sm:hidden font-mono text-[11px]">CSV</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsReportModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
              title={`Compile all student data for ${currentSession} into a downloadable PDF summary report`}
            >
              <FileDown className="w-3.5 h-3.5 text-indigo-300" />
              <span className="hidden sm:inline">Generate Report</span>
              <span className="sm:hidden font-mono text-[11px]">PDF</span>
            </button>

            <button
              type="button"
              onClick={toggleBannerCollapsed}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-zinc-200 hover:text-white transition cursor-pointer shrink-0"
              title={isBannerCollapsed ? "Expand Banner Overview" : "Collapse Banner to save screen space"}
              aria-label="Toggle Banner Overview"
            >
              <ChevronUp className={`w-4 h-4 transition-transform duration-200 ${isBannerCollapsed ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Operational Oversight Summary Card: Real-time counts of Pending, Verified, and Rejected assignments */}
      <AssignmentStatusSummaryCard onSelectSubView={setDeskView} />

      {/* Desk Official Sub-Navigation Tabs & Audit Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 p-1 bg-zinc-200/80 rounded-xl max-w-fit text-xs font-semibold">
          <button
            id="desk-view-register-tab"
            type="button"
            onClick={() => setDeskView('REGISTER')}
            className={`px-4 py-2 rounded-lg transition flex items-center gap-2 cursor-pointer ${
              deskView === 'REGISTER'
                ? 'bg-white text-zinc-950 shadow-xs font-bold'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5 text-indigo-600" />
            <span>Registration Desk & Status Matrix</span>
          </button>

          <button
            id="desk-view-submissions-tab"
            type="button"
            onClick={() => setDeskView('SUBMISSIONS_REGISTER')}
            className={`px-4 py-2 rounded-lg transition flex items-center gap-2 cursor-pointer ${
              deskView === 'SUBMISSIONS_REGISTER'
                ? 'bg-white text-zinc-950 shadow-xs font-bold'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <TableProperties className="w-3.5 h-3.5 text-indigo-600" />
            <span>Submissions Register</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 text-indigo-800 font-bold">
              {sessionIntakes.length}
            </span>
          </button>

          <button
            id="desk-view-receipts-tab"
            type="button"
            onClick={() => setDeskView('RECEIPTS')}
            className={`px-4 py-2 rounded-lg transition flex items-center gap-2 cursor-pointer ${
              deskView === 'RECEIPTS'
                ? 'bg-white text-zinc-950 shadow-xs font-bold'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Receipt className="w-3.5 h-3.5 text-teal-600" />
            <span>Registration Receipts Register</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-teal-100 text-teal-800 font-bold">
              {sessionRegistrationReceipts.length}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* CSV Export Button: Visible only to authorized users (Administrators/Coordinators) */}
          {isAdmin && (
            <button
              type="button"
              id="export-session-csv-btn"
              data-testid="export-session-csv-btn"
              onClick={handleExportSessionCSV}
              className="px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-2xs border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 hover:border-emerald-400 active:scale-98"
              title={`Export all student intake records for ${currentSession} as a CSV spreadsheet (Authorized Administrator only)`}
            >
              <Download className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>Export CSV</span>
              <span className="px-1.5 py-0.2 rounded-md bg-emerald-200/80 text-emerald-900 font-mono text-[10px] font-bold">
                {sessionIntakes.length}
              </span>
            </button>
          )}

          {/* Generate Report Button: compiles all student data for current session into a downloadable PDF summary */}
          <button
            type="button"
            id="generate-report-btn"
            data-testid="generate-report-btn"
            onClick={() => setIsReportModalOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-2xs border border-indigo-200 bg-indigo-50/90 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 active:scale-98"
            title={`Compile all student data for ${selectedSession || currentSession} into a downloadable PDF summary`}
          >
            <FileDown className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>Generate Report</span>
            <span className="px-1.5 py-0.2 rounded-md bg-indigo-200/70 text-indigo-900 font-mono text-[10px] font-bold">
              PDF
            </span>
          </button>

          {/* Barcode / QR Scanner Button: Uses device camera to scan and identify student records */}
          <button
            type="button"
            id="open-barcode-scanner-btn"
            data-testid="open-barcode-scanner-btn"
            onClick={() => setIsScannerModalOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-2xs border border-purple-200 bg-purple-50/90 text-purple-700 hover:bg-purple-100 hover:border-purple-300 active:scale-98"
            title="Scan student assignment barcode or QR code using device camera"
          >
            <Camera className="w-4 h-4 text-purple-600 shrink-0" />
            <span>Scan Barcode/QR</span>
          </button>

          {/* Button to trigger integrity scan to detect duplicate enrollment numbers across all current active session records */}
          <button
            type="button"
            id="trigger-integrity-scan-btn"
            data-testid="trigger-integrity-scan-btn"
            onClick={handleTriggerIntegrityScan}
            disabled={isScanningDuplicates}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-2xs border ${
              conflictEnrollmentGroups.length > 0
                ? 'bg-rose-50 border-rose-300 text-rose-950 hover:bg-rose-100'
                : supplementaryEnrollmentGroups.length > 0
                ? 'bg-blue-50 border-blue-300 text-blue-950 hover:bg-blue-100'
                : 'bg-emerald-50 border-emerald-300 text-emerald-950 hover:bg-emerald-100'
            }`}
            title={`Run integrity scan across records in active session (${currentSession})`}
          >
            {isScanningDuplicates ? (
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600 shrink-0" />
            ) : conflictEnrollmentGroups.length > 0 ? (
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
            ) : supplementaryEnrollmentGroups.length > 0 ? (
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <span>
              {isScanningDuplicates
                ? 'Scanning Records...'
                : `Trigger Integrity Scan (${currentSession})`}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                conflictEnrollmentGroups.length > 0
                  ? 'bg-rose-600 text-white'
                  : supplementaryEnrollmentGroups.length > 0
                  ? 'bg-blue-600 text-white'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              {conflictEnrollmentGroups.length > 0
                ? `${conflictEnrollmentGroups.length} Conflict${conflictEnrollmentGroups.length === 1 ? '' : 's'}`
                : supplementaryEnrollmentGroups.length > 0
                ? `${supplementaryEnrollmentGroups.length} Supplementary Valid`
                : '100% Unique'}
            </span>
          </button>
        </div>
      </div>

      {deskView === 'REGISTER' && (
        <div className="space-y-4">
          {/* Validation Summary: Displays results of the integrity check (Success or Rejected with reason) after user attempts an intake entry */}
          {validationResult && (
            <ValidationSummary
              status={validationResult.status as 'Success' | 'Rejected'}
              reason={validationResult.reason}
              rule={validationResult.rule}
              action={validationResult.action}
              cleanData={validationResult.cleanData}
              onDismiss={() => setValidationResult(null)}
              onClose={() => setValidationResult(null)}
            />
          )}

          {/* Intake Registration Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Dynamic Multi-Course Registration Desk (7 cols) */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-zinc-200 p-5 sm:p-6 shadow-xs">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-100">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-indigo-600" />
                  <div>
                    <h3 className="font-bold text-zinc-900 text-sm sm:text-base">
                      Dynamic Multi-Course Registration Desk
                    </h3>
                    <p className="text-[11px] text-zinc-500">
                      Enter student details, select course codes, and issue instant acknowledgment receipt.
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase text-zinc-400 block">Session</span>
                  <span className="text-xs font-bold text-indigo-950">{selectedSession}</span>
                </div>
              </div>

              {errorMsg && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-800 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmitAndGenerateReceipt} className="space-y-4">
                {/* Submission Category Selector in the Beginning: TMA (Assignment) vs Practical */}
                <div className="p-4 bg-gradient-to-r from-indigo-50/95 via-purple-50/80 to-zinc-50 border-2 border-indigo-200/90 rounded-2xl shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                          <Layers className="w-4 h-4 text-indigo-600" />
                          <span>Select Intake Category (In the Beginning):</span>
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          defaultIntakeComponent === 'Assignment'
                            ? 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                            : 'bg-purple-100 text-purple-900 border border-purple-200'
                        }`}>
                          {defaultIntakeComponent === 'Assignment'
                            ? 'All Students Submit TMA Only (Default)'
                            : 'Few Students Submit Practical'}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-600 mt-1">
                        All the students submit their Assignment (TMA) only, but few students submit Practical. All added courses will automatically default to the selected component.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-zinc-200 shadow-2xs self-start sm:self-auto">
                      <button
                        type="button"
                        id="intake-category-tma-btn"
                        onClick={() => {
                          setDefaultIntakeComponent('Assignment');
                          // Update any currently selected courses to Assignment
                          if (selectedCourses.length > 0) {
                            setCourseComponentTypes((prev) => {
                              const updated = { ...prev };
                              selectedCourses.forEach((c) => {
                                updated[c] = 'Assignment';
                              });
                              return updated;
                            });
                          }
                        }}
                        className={`px-3.5 py-2 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                          defaultIntakeComponent === 'Assignment'
                            ? 'bg-indigo-600 text-white shadow-xs font-black'
                            : 'text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100'
                        }`}
                      >
                        <FileCheck2 className="w-4 h-4" />
                        <span>Assignment (TMA)</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                          defaultIntakeComponent === 'Assignment' ? 'bg-indigo-700 text-white' : 'bg-zinc-200 text-zinc-700'
                        }`}>
                          All Students (Default)
                        </span>
                      </button>

                      <button
                        type="button"
                        id="intake-category-practical-btn"
                        onClick={() => {
                          setDefaultIntakeComponent('Practical');
                          // Update any currently selected courses to Practical
                          if (selectedCourses.length > 0) {
                            setCourseComponentTypes((prev) => {
                              const updated = { ...prev };
                              selectedCourses.forEach((c) => {
                                updated[c] = 'Practical';
                              });
                              return updated;
                            });
                          }
                        }}
                        className={`px-3.5 py-2 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                          defaultIntakeComponent === 'Practical'
                            ? 'bg-purple-700 text-white shadow-xs font-black'
                            : 'text-purple-900 hover:text-purple-950 hover:bg-purple-100/60'
                        }`}
                      >
                        <FlaskConical className="w-4 h-4 text-purple-300" />
                        <span>Practical</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                          defaultIntakeComponent === 'Practical' ? 'bg-purple-800 text-white' : 'bg-purple-100 text-purple-800'
                        }`}>
                          Few Students
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 1. Student Enrollment Number (9-10 digits) & Candidate Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="enrollment-input" className="block text-xs font-semibold text-zinc-700">
                        Student Enrollment Number <span className="text-rose-500">*</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          id="btn-scan-camera-enrollment"
                          onClick={() => setIsScannerModalOpen(true)}
                          className="text-[11px] font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-md flex items-center gap-1 cursor-pointer transition shadow-2xs"
                          title="Open camera to scan Barcode / QR from assignment slip or student ID"
                        >
                          <Camera className="w-3 h-3 text-purple-600" />
                          <span>Scan Barcode / QR</span>
                        </button>
                        <button
                          type="button"
                          id="btn-check-enrollment-active-session"
                          onClick={handleCheckSingleEnrollmentInActiveSession}
                          className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 cursor-pointer transition"
                          title={`Check if this enrollment number is already registered in active session (${selectedSession || currentSession})`}
                        >
                          <Search className="w-3 h-3" />
                          <span>Check in {selectedSession || currentSession}</span>
                        </button>
                      </div>
                    </div>
                    <div className="relative">
                      <Hash className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        id="enrollment-input"
                        maxLength={10}
                        placeholder="e.g. 2350198421 (9 or 10 digits)"
                        value={enrollmentNo}
                        onChange={(e) => setEnrollmentNo(e.target.value.replace(/\D/g, ''))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (enrollmentNo.trim().length >= 5) {
                              handleCheckSingleEnrollmentInActiveSession();
                            }
                            const nameInput = document.getElementById('student-name-input');
                            if (nameInput) nameInput.focus();
                          }
                        }}
                        className={`w-full pl-9 pr-10 py-2 text-xs font-mono font-bold tracking-wider border rounded-lg focus:outline-hidden transition ${
                          enrollmentNo.trim().length === 0
                            ? 'border-zinc-300 focus:ring-2 focus:ring-indigo-500'
                            : realtimeValidation.fields.enrollmentNo.valid
                            ? 'border-emerald-400 bg-emerald-50/20 focus:ring-2 focus:ring-emerald-500 text-emerald-950'
                            : 'border-rose-400 bg-rose-50/25 focus:ring-2 focus:ring-rose-500 text-rose-950'
                        }`}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setIsScannerModalOpen(true)}
                        className="absolute right-2 top-2 p-1 text-zinc-400 hover:text-purple-600 hover:bg-purple-50 rounded transition cursor-pointer"
                        title="Scan Barcode / QR with camera"
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Real-time Enrollment Number Validation Feedback */}
                    {enrollmentNo.trim().length > 0 && (
                      <div
                        className={`mt-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition animate-in fade-in ${
                          realtimeValidation.fields.enrollmentNo.valid
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                            : 'bg-rose-50 text-rose-800 border border-rose-300'
                        }`}
                      >
                        {realtimeValidation.fields.enrollmentNo.valid ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        )}
                        <span>{realtimeValidation.fields.enrollmentNo.message}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-zinc-500 mt-0.5">
                      <span>{enrollmentNo.length}/10 digits (Numbers only)</span>
                      {enrollmentNo.trim().length >= 5 && (
                        <button
                          type="button"
                          onClick={handleCheckSingleEnrollmentInActiveSession}
                          className="text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer font-semibold"
                        >
                          Check Profile & Courses
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Candidate Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="student-name-input"
                      placeholder="Candidate name as registered in IGNOU"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-hidden transition ${
                        studentName.trim().length === 0
                          ? 'border-zinc-300 focus:ring-2 focus:ring-indigo-500'
                          : realtimeValidation.fields.studentName.valid
                          ? 'border-emerald-400 bg-emerald-50/20 focus:ring-2 focus:ring-emerald-500 text-emerald-950 font-semibold'
                          : 'border-rose-400 bg-rose-50/25 focus:ring-2 focus:ring-rose-500 text-rose-950'
                      }`}
                      required
                    />

                    {/* Real-time Candidate Name Validation Feedback */}
                    {studentName.trim().length > 0 && (
                      <div
                        className={`mt-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition animate-in fade-in ${
                          realtimeValidation.fields.studentName.valid
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-300'
                        }`}
                      >
                        {realtimeValidation.fields.studentName.valid ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        )}
                        <span>{realtimeValidation.fields.studentName.message}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Academic Admission & Re-Registration Profile Card (Fresh Admission vs Re-Registration) */}
                {studentRegistration ? (
                  <div className="p-3.5 bg-indigo-50/95 border-2 border-indigo-300 rounded-xl space-y-2 animate-in fade-in shadow-2xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-indigo-950 text-xs sm:text-sm flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-indigo-700" />
                          <span>Student Profile: {studentRegistration.studentName}</span>
                        </span>
                        <span className="text-[10.5px] font-mono font-bold bg-indigo-200 text-indigo-950 px-2 py-0.5 rounded-full border border-indigo-300">
                          {studentRegistration.cadre === 'FRESH' ? 'Fresh Admission' : 'Re-Registration'} • {studentRegistration.academicYear}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-mono font-bold text-indigo-900">
                        <span>Admitted Cycle: {studentRegistration.session}</span>
                        <span className="text-indigo-300">•</span>
                        <span>{studentRegistration.courseCodes.length} Registered Courses</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between text-xs text-indigo-900 gap-2 border-t border-indigo-200/70 pt-2">
                      <div className="flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-indigo-700" />
                        <span className="font-semibold">{programmeDurationInfo.description}</span>
                      </div>
                      <div className="text-[11px] font-bold text-indigo-800 bg-white/80 px-2 py-0.5 rounded-md border border-indigo-200">
                        {registrationEligibility?.description}
                      </div>
                    </div>
                  </div>
                ) : enrollmentNo.trim().length >= 5 ? (
                  <div className="p-3.5 bg-amber-50/90 border border-amber-300 rounded-xl space-y-2 text-xs text-amber-950 animate-in fade-in shadow-2xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                        <span className="font-bold text-amber-950">
                          Candidate (<strong className="font-mono text-indigo-950">{enrollmentNo}</strong>) not in 2024–2026 registration database
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Walk-In Intake Permitted</span>
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-900 leading-relaxed">
                      Past students or walk-in candidates can submit assignments directly without prior registration. Enter candidate name, select or input the Programme and Course Codes below to issue an official stamped acknowledgment receipt.
                    </p>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-amber-200/60 pt-1.5 text-[11px]">
                      <span className="text-zinc-600">Optional: Register candidate into official roster:</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setRegistrationModalCadre('FRESH');
                            setIsAddRegistrationModalOpen(true);
                          }}
                          className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-bold cursor-pointer transition inline-flex items-center gap-1 shadow-2xs"
                        >
                          <UserPlus className="w-3 h-3" />
                          <span>+ Fresh Admission</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRegistrationModalCadre('RE_REGISTRATION');
                            setIsAddRegistrationModalOpen(true);
                          }}
                          className="px-2 py-0.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded text-[10px] font-semibold cursor-pointer transition"
                        >
                          <span>+ Re-Registration</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Rule 1 Violation Alert & Rule 2 Multi-Course Allowance Banner */}
                {isRule1Violated && (
                  <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-900 flex items-start gap-2.5 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-bold text-rose-950">Rule 1 Block: Enrollment Number Scope Conflict</div>
                      <div className="mt-0.5">
                        Enrollment Number <strong className="font-mono font-black text-rose-950">{enrollmentNo}</strong> is registered under Programme <strong className="font-mono font-black text-rose-950">{registeredProgForEnrollment}</strong>. An enrollment number cannot exist in another programme (<span className="font-mono font-bold">{selectedProgramme}</span>).
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProgramme(registeredProgForEnrollment || '');
                          setErrorMsg('');
                        }}
                        className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 bg-rose-700 hover:bg-rose-800 text-white rounded-md text-[11px] font-bold cursor-pointer transition shadow-2xs"
                      >
                        <span>Switch to {registeredProgForEnrollment}</span>
                      </button>
                    </div>
                  </div>
                )}

                {!isRule1Violated && (alreadyEnrolledCourses instanceof Set ? alreadyEnrolledCourses.size : 0) > 0 && (
                  <div className="p-3.5 bg-emerald-50/95 border-2 border-emerald-400 rounded-xl text-xs text-emerald-950 flex items-start gap-3 shadow-xs animate-in fade-in">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-extrabold text-emerald-950 text-sm flex flex-wrap items-center gap-2">
                        <span>RULE: Part-by-Part & Additional Intake Permitted for Differing Course Codes</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-200/90 text-emerald-950 text-[10px] font-mono font-bold">
                          Same Enr • Same Programme • Supplementary Submission
                        </span>
                      </div>
                      <div className="mt-1 text-emerald-900 leading-relaxed">
                        Student <strong className="font-mono font-bold text-zinc-950">{enrollmentNo}</strong> (<strong>{studentName || 'Candidate'}</strong>) is registered under Programme <strong className="font-mono text-zinc-950">{selectedProgramme || registeredProgForEnrollment}</strong> with previously registered course(s):{' '}
                        <span className="font-mono font-black text-emerald-950 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 inline-block">
                          {Array.from(alreadyEnrolledCourses || []).join(', ')}
                        </span>.
                      </div>

                      {/* Part-by-Part Integration Option for returning students */}
                      {existingIntakeForStudent && (
                        <div className="mt-2.5 p-2.5 bg-white/95 border border-emerald-300 rounded-lg shadow-2xs">
                          <label className="flex items-start gap-2.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={shouldIntegrateWithPrevious}
                              onChange={(e) => setShouldIntegrateWithPrevious(e.target.checked)}
                              className="mt-0.5 h-4 w-4 rounded border-emerald-400 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                            <div className="flex-1 text-[11.5px]">
                              <span className="font-bold text-emerald-950 flex items-center gap-1.5 flex-wrap">
                                <GitMerge className="w-3.5 h-3.5 text-emerald-700" />
                                <span>Integrate with previous intake record (Token: {existingIntakeForStudent.tokenNo} • Part {(existingIntakeForStudent.submissionParts?.length || 1) + 1} Supplementary)</span>
                                <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[10px] font-semibold border border-emerald-300">
                                  Recommended for Part-by-Part
                                </span>
                              </span>
                              <p className="text-zinc-600 mt-0.5 text-[11px] leading-relaxed">
                                Merges newly submitted differing courses and practicals directly into the student’s existing token, keeping practical records distinct and generating an integrated supplementary receipt.
                              </p>
                            </div>
                          </label>
                        </div>
                      )}

                      <div className="mt-2 text-[11px] text-emerald-800 font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline shrink-0" />
                        <span>Rule: Intake of student is added if course code is differ even though enrollment number, name and Programme are same. Practicals (like BAPI-003) are recorded separately from theory assignments.</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Contact Number, Session, Submission Mode & Intake Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Contact Number <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
                      <input
                        type="tel"
                        id="contact-phone-input"
                        maxLength={10}
                        pattern="[6-9][0-9]{9}"
                        placeholder="10-digit mobile (e.g. 9436013686)"
                        value={studentPhone}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setStudentPhone(val);
                        }}
                        onInput={(e: any) => {
                          e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
                        }}
                        className={`w-full pl-8 pr-3 py-2 text-xs border rounded-lg focus:outline-hidden transition ${
                          studentPhone.trim().length === 0
                            ? 'border-zinc-300 focus:ring-2 focus:ring-indigo-500'
                            : realtimeValidation.fields.studentPhone.valid
                            ? 'border-emerald-400 bg-emerald-50/20 focus:ring-2 focus:ring-emerald-500 text-emerald-950 font-semibold'
                            : 'border-rose-400 bg-rose-50/25 focus:ring-2 focus:ring-rose-500 text-rose-950'
                        }`}
                        required
                      />
                    </div>
                    {studentPhone.trim().length > 0 && (
                      <div
                        className={`mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 transition animate-in fade-in ${
                          realtimeValidation.fields.studentPhone.valid
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-300'
                        }`}
                      >
                        {realtimeValidation.fields.studentPhone.valid ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
                        )}
                        <span className="truncate">{realtimeValidation.fields.studentPhone.message}</span>
                      </div>
                    )}
                    <span className="text-[10px] text-zinc-500 mt-0.5 block">
                      {studentPhone.length}/10 digits
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Academic Session <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
                      <select
                        value={selectedSession}
                        onChange={(e) => setSelectedSession(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 text-xs font-bold border border-zinc-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                      >
                        {availableSessions.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Submission Mode <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={submissionMode}
                      onChange={(e) => setSubmissionMode(e.target.value as SubmissionMode)}
                      className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    >
                      <option value="In-Person (Desk)">In-Person (Physical Counter)</option>
                      <option value="Speed Post">Speed Post (India Post)</option>
                      <option value="Registered Post">Registered Post (Inward)</option>
                      <option value="Courier">Courier / Dispatch</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="intake-submission-date-input" className="block text-xs font-semibold text-zinc-700">
                        Intake / Receipt Date <span className="text-rose-500">*</span>
                      </label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const d = new Date();
                            d.setDate(d.getDate() - 1);
                            setSubmissionDate(d.toISOString().split('T')[0]);
                          }}
                          className="text-[10px] text-zinc-500 hover:text-zinc-800 font-medium cursor-pointer"
                          title="Set to yesterday's date"
                        >
                          Yesterday
                        </button>
                        <span className="text-zinc-300">•</span>
                        <button
                          type="button"
                          onClick={() => setSubmissionDate(new Date().toISOString().split('T')[0])}
                          className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                          title="Set to today's date"
                        >
                          Today
                        </button>
                      </div>
                    </div>
                    <div className="relative">
                      <Calendar className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
                      <input
                        type="date"
                        id="intake-submission-date-input"
                        value={submissionDate}
                        onChange={(e) => setSubmissionDate(e.target.value)}
                        max="2099-12-31"
                        className={`w-full pl-8 pr-3 py-2 text-xs font-bold border rounded-lg bg-white focus:outline-hidden transition ${
                          !realtimeValidation.fields.submissionDate.valid
                            ? 'border-rose-400 bg-rose-50/20 focus:ring-2 focus:ring-rose-500 text-rose-950'
                            : 'border-zinc-300 focus:ring-2 focus:ring-indigo-500'
                        }`}
                        required
                      />
                    </div>
                    {!realtimeValidation.fields.submissionDate.valid && (
                      <div className="mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-800 border border-rose-300 flex items-center gap-1 animate-in fade-in">
                        <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
                        <span>{realtimeValidation.fields.submissionDate.message}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-0.5 text-[10px]">
                      <span className="text-zinc-500 truncate">
                        {formatDate(submissionDate)}
                      </span>
                      {submissionDate !== new Date().toISOString().split('T')[0] && (
                        <span className="text-[9px] font-semibold text-amber-700 bg-amber-50 px-1 py-0.2 rounded border border-amber-200">
                          Custom Date Selected
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {submissionMode !== 'In-Person (Desk)' && (
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg animate-in fade-in">
                    <label className="block text-xs font-semibold text-amber-900 mb-1">
                      Postal Tracking / Consignment No. <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ED948123049IN or RP203948102IN"
                      value={consignmentNo}
                      onChange={(e) => setConsignmentNo(e.target.value.toUpperCase())}
                      className="w-full px-3 py-1.5 text-xs font-mono border border-amber-300 rounded-md bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                      required
                    />
                  </div>
                )}

                {/* 3. Programme Master & Flexible Entry (Combobox + Manual Override) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-zinc-700">
                      Programme Enrolled <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomProgMode(!isCustomProgMode);
                          if (!isCustomProgMode) {
                            setCustomProgInput(selectedProgramme);
                          }
                        }}
                        className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>{isCustomProgMode ? 'Back to Standard Catalog' : 'Custom / Other Programme'}</span>
                      </button>
                    </div>
                  </div>

                  {/* If Manual Custom Programme Mode */}
                  {isCustomProgMode ? (
                    <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2 animate-in fade-in">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-amber-900">
                          Manual Programme Override (Any Unlisted IGNOU Code)
                        </span>
                        <span className="text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded font-medium">
                          Custom Entry Active
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Type programme code (e.g. BCA, MCA, DTS, BLIS, PGDRD)"
                          value={customProgInput}
                          onChange={(e) => {
                            const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                            setCustomProgInput(val);
                            setSelectedProgramme(val);
                          }}
                          className="flex-1 px-3 py-2 text-xs font-mono font-bold border border-amber-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (customProgInput.trim()) {
                              handleApplyCustomProgramme(customProgInput);
                            }
                          }}
                          className="px-3 py-2 bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs rounded-lg cursor-pointer"
                        >
                          Set Code
                        </button>
                      </div>
                      <p className="text-[10px] text-amber-800">
                        Desk operators can enter any unlisted programme without validation restriction.
                      </p>
                    </div>
                  ) : (
                    /* Searchable Combobox for Standard Programmes */
                    <div className="relative" ref={progDropdownRef}>
                      <div
                        onClick={() => setIsProgDropdownOpen(!isProgDropdownOpen)}
                        className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-lg bg-white flex items-center justify-between cursor-pointer hover:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          {selectedProgramme ? (
                            <span className="font-mono font-bold text-indigo-950">
                              {selectedProgramme}
                              {programmeData && (
                                <span className="text-zinc-600 font-sans font-normal ml-2 text-xs">
                                  — {programmeData.name}
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-zinc-400">Search or select from 19 standard IGNOU programmes...</span>
                          )}
                        </div>
                        <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${isProgDropdownOpen ? 'rotate-180' : ''}`} />
                      </div>

                      {/* Dropdown Menu */}
                      {isProgDropdownOpen && (
                        <div className="absolute left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-xl shadow-xl z-30 overflow-hidden">
                          <div className="p-2 border-b border-zinc-100 bg-zinc-50">
                            <div className="relative">
                              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2" />
                              <input
                                type="text"
                                autoFocus
                                placeholder="Type to filter programmes (e.g. BAG, MEG, History...)"
                                value={progSearchQuery}
                                onChange={(e) => setProgSearchQuery(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 text-xs border border-zinc-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>
                          </div>

                          <div className="max-h-52 overflow-y-auto divide-y divide-zinc-100">
                            {filteredProgrammes.length === 0 ? (
                              <div className="p-3 text-center text-xs text-zinc-500">
                                <div>No standard programme matches "{progSearchQuery}".</div>
                                <button
                                  type="button"
                                  onClick={() => handleApplyCustomProgramme(progSearchQuery)}
                                  className="mt-2 inline-flex items-center gap-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Use "{progSearchQuery.toUpperCase()}" as Custom Programme</span>
                                </button>
                              </div>
                            ) : (
                                filteredProgrammes.map((prog) => (
                                <button
                                  type="button"
                                  key={prog.code}
                                  onClick={() => handleSelectProgramme(prog.code)}
                                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-indigo-50 transition cursor-pointer ${
                                    selectedProgramme === prog.code ? 'bg-indigo-50/80 font-bold' : ''
                                  }`}
                                >
                                  <div>
                                    <span className="font-mono font-black text-indigo-950 mr-2">
                                      {prog.code}
                                    </span>
                                    <span className="text-zinc-700 text-[11px]">{prog.name}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded font-medium">
                                      {prog.level}
                                    </span>
                                    {selectedProgramme === prog.code && (
                                      <Check className="w-3.5 h-3.5 text-indigo-600" />
                                    )}
                                  </div>
                                </button>
                              ))
                            )}
                          </div>

                          <div className="p-2 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => {
                                setIsProgDropdownOpen(false);
                                setIsCustomProgMode(true);
                              }}
                              className="text-[11px] text-indigo-700 hover:text-indigo-900 font-semibold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Custom Programme Entry</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsProgDropdownOpen(false);
                                setIsAddingNewProgrammeInline(true);
                              }}
                              className="text-[11px] text-emerald-700 hover:text-emerald-900 font-semibold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Add New to Suggestions</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Inline New Programme Adder Modal/Drawer */}
                  {isAddingNewProgrammeInline && (
                    <div className="p-3 bg-emerald-50/80 border border-emerald-300 rounded-xl space-y-2 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                          <Plus className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Add New Programme to Quick Suggestions</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsAddingNewProgrammeInline(false)}
                          className="text-emerald-700 hover:text-emerald-900 p-0.5"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <input
                          type="text"
                          placeholder="Programme Code (e.g. BLIS, DTS, MAJY, MBA)"
                          value={inlineNewProgCode}
                          onChange={(e) => setInlineNewProgCode(e.target.value.toUpperCase())}
                          className="px-2.5 py-1.5 font-mono font-bold border border-emerald-300 rounded-lg bg-white"
                        />
                        <input
                          type="text"
                          placeholder="Full Programme Title (Optional)"
                          value={inlineNewProgName}
                          onChange={(e) => setInlineNewProgName(e.target.value)}
                          className="px-2.5 py-1.5 border border-emerald-300 rounded-lg bg-white"
                        />
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsAddingNewProgrammeInline(false)}
                          className="px-2.5 py-1 text-xs text-zinc-600 hover:text-zinc-800"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveInlineNewProgramme}
                          className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                        >
                          Save & Add to Quick Suggestions
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Fast 1-Click Quick Select Pills for All Programmes (Standard + Newly Added) */}
                  <div>
                    <div className="text-[10px] text-zinc-500 uppercase font-semibold mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Layers className="w-3 h-3 text-indigo-600" />
                        <span>Quick Suggestions ({allProgrammes.length} Programmes):</span>
                      </span>
                      <div className="flex items-center gap-2">
                        {selectedProgramme && (
                          <span className="text-indigo-700 font-bold normal-case text-xs">
                            Active: {selectedProgramme}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => setIsAddingNewProgrammeInline(!isAddingNewProgrammeInline)}
                          className="text-emerald-700 hover:text-emerald-900 font-bold text-[10px] flex items-center gap-0.5 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Programme</span>
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto p-1.5 bg-zinc-50/70 border border-zinc-200 rounded-lg">
                      {allProgrammes.map((prog) => {
                        const isSelected = selectedProgramme === prog.code;
                        return (
                          <button
                            type="button"
                            key={prog.code}
                            onClick={() => handleSelectProgramme(prog.code)}
                            className={`px-2 py-0.5 text-[11px] font-mono font-bold rounded-md transition cursor-pointer flex items-center gap-1 ${
                              isSelected
                                ? 'bg-indigo-600 text-white shadow-2xs ring-2 ring-indigo-400'
                                : 'bg-white text-zinc-700 hover:bg-indigo-50 hover:text-indigo-900 border border-zinc-200'
                            }`}
                            title={`${prog.code} - ${prog.name}`}
                          >
                            <span>{prog.code}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Active Programme Confirmation Ribbon */}
                  {selectedProgramme && (
                    <div className="text-[11px] text-indigo-950 bg-indigo-50/90 px-3 py-1.5 rounded-lg border border-indigo-200 flex items-center justify-between">
                      <span className="truncate">
                        Active Programme: <strong className="font-mono text-indigo-900">{selectedProgramme}</strong>
                        {programmeData ? ` — ${programmeData.name}` : ' — Programme registered at Study Centre'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProgramme('');
                          setIsCustomProgMode(false);
                        }}
                        className="text-indigo-600 hover:text-indigo-800 text-xs font-bold cursor-pointer ml-2 shrink-0"
                      >
                        Change
                      </button>
                    </div>
                  )}
                </div>

                {/* 4. Course Selection: Dynamic multi-course codes with chips, suggestions, and live IGNOU titles */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-zinc-700">
                      Course Selection <span className="text-rose-500">*</span>
                      <span className="text-[11px] font-normal text-zinc-500 ml-1.5">
                        (Supports selecting more than 8 courses — up to 50 allowed)
                      </span>
                    </label>
                    <div className="flex items-center gap-2">
                      {selectedCourses.length > 0 && (
                        <button
                          type="button"
                          onClick={handleFetchAllIgnouTitles}
                          disabled={isBulkFetchingTitles}
                          className="text-[11px] text-indigo-700 hover:text-indigo-900 font-bold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          title="Query IGNOU.ac.in for official course titles for all selected courses"
                        >
                          {isBulkFetchingTitles ? (
                            <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
                          ) : (
                            <RefreshCw className="w-3 h-3 text-indigo-600" />
                          )}
                          <span>Update Titles from IGNOU.ac.in</span>
                        </button>
                      )}
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          selectedCourses.length > 0
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-zinc-100 text-zinc-500'
                        }`}
                      >
                        {selectedCourses.length} {selectedCourses.length === 1 ? 'course' : 'courses'} selected
                      </span>
                    </div>
                  </div>

                  {/* Automated Course Codes Reader from Fresh Admission or Re-Registration */}
                  {studentRegistration && studentRegistration.courseCodes && studentRegistration.courseCodes.length > 0 && (
                    <div className="mb-3.5 p-3.5 bg-indigo-50/95 border-2 border-indigo-300 rounded-xl space-y-2.5 animate-in fade-in shadow-2xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-200/80 pb-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-extrabold text-indigo-950 text-xs sm:text-sm flex items-center gap-1.5">
                              <BookOpen className="w-4 h-4 text-indigo-700" />
                              <span>Registered Course Codes Read from {studentRegistration.cadre === 'FRESH' ? 'Fresh Admission' : 'Re-Registration'}</span>
                            </span>
                            <span className="text-[10px] font-mono font-bold bg-indigo-200 text-indigo-950 px-2 py-0.5 rounded-full border border-indigo-300">
                              {studentRegistration.academicYear} • Cycle: {studentRegistration.session}
                            </span>
                          </div>
                          <p className="text-[11px] text-indigo-800 mt-0.5">
                            Click individual course cards to select/deselect, or click "Select All Registered" to populate the submission queue.
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              const enrolled = studentRegistration.courseCodes.map((c) => c.trim().toUpperCase());
                              setSelectedCourses((prev) => Array.from(new Set([...prev, ...enrolled])));
                              setCourseComponentTypes((prev) => {
                                const updated = { ...prev };
                                enrolled.forEach((c) => {
                                  if (!updated[c]) {
                                    updated[c] = isPracticalCourse(c) ? 'Practical' : defaultIntakeComponent;
                                  }
                                });
                                return updated;
                              });
                            }}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Select All Registered ({studentRegistration.courseCodes.length})</span>
                          </button>

                          {selectedCourses.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCourses([]);
                                setCourseComponentTypes({});
                              }}
                              className="px-2.5 py-1.5 bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-300 rounded-lg text-xs font-semibold transition cursor-pointer"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Enrolled Courses Interactive Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {studentRegistration.courseCodes.map((code) => {
                          const cleanCode = code.trim().toUpperCase();
                          const isSelected = selectedCourses.includes(cleanCode);
                          const title = getCourseTitle(cleanCode, studentRegistration.programmeCode);
                          const isPractical = isPracticalCourse(cleanCode, title);
                          const isAlreadyEnrolled = alreadyEnrolledCourses instanceof Set ? alreadyEnrolledCourses.has(cleanCode) : false;

                          return (
                            <div
                              key={cleanCode}
                              onClick={() => {
                                if (isAlreadyEnrolled && !shouldIntegrateWithPrevious) {
                                  showToast(`Course ${cleanCode} is already enrolled in this session.`, 'info');
                                  return;
                                }
                                if (isSelected) {
                                  handleRemoveCourse(cleanCode);
                                } else {
                                  handleAddCourse(cleanCode);
                                }
                              }}
                              className={`p-2.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between select-none ${
                                isSelected
                                  ? 'bg-emerald-50/95 border-emerald-500 shadow-xs ring-2 ring-emerald-300'
                                  : isAlreadyEnrolled
                                  ? 'bg-amber-50/70 border-amber-300 hover:border-amber-400'
                                  : 'bg-white hover:bg-indigo-50/60 border-zinc-200 hover:border-indigo-400 shadow-2xs'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-1.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-mono font-black text-xs text-zinc-950 tracking-wider">
                                    {cleanCode}
                                  </span>
                                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                    isPractical
                                      ? 'bg-purple-100 text-purple-900 border border-purple-200'
                                      : 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                                  }`}>
                                    {isPractical ? 'Practical' : 'Assignment'}
                                  </span>
                                </div>

                                <div className={`w-4 h-4 rounded flex items-center justify-center border transition shrink-0 ${
                                  isSelected
                                    ? 'bg-emerald-600 border-emerald-600 text-white'
                                    : 'bg-white border-zinc-300 text-transparent'
                                }`}>
                                  <Check className="w-3 h-3 stroke-[3]" />
                                </div>
                              </div>

                              <div className="mt-1 text-[11px] text-zinc-700 font-medium line-clamp-1">
                                {title || 'Course Title in Catalog'}
                              </div>

                              <div className="mt-1.5 pt-1 border-t border-zinc-100 flex items-center justify-between text-[9.5px]">
                                <span className={isSelected ? 'text-emerald-800 font-bold' : 'text-zinc-500'}>
                                  {isSelected ? '✓ Selected for Intake' : 'Click to select'}
                                </span>
                                {isAlreadyEnrolled && (
                                  <span className="text-amber-800 font-bold flex items-center gap-0.5">
                                    <Lock className="w-2.5 h-2.5" />
                                    <span>Already Enrolled</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Suggestions for currently selected programme or Additional Carryover Courses */}
                  {selectedProgramme && (
                    <div className="mb-2 p-2.5 bg-zinc-50 border border-zinc-200 rounded-lg">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 flex items-center gap-1">
                          <BookOpen className="w-3 h-3 text-indigo-600" />
                          <span>
                            {studentRegistration ? `Additional / Carryover Course Suggestions for ${selectedProgramme}:` : `Quick Course Suggestions for ${selectedProgramme} (${availableProgrammeCourses.length} Available):`}
                          </span>
                        </span>
                        {availableProgrammeCourses.length > 0 && (
                          <div className="flex items-center gap-2">
                            {(alreadyEnrolledCourses instanceof Set && alreadyEnrolledCourses.size > 0) && (
                              <button
                                type="button"
                                onClick={handleSelectAllCourses}
                                className="text-[10px] text-emerald-700 hover:text-emerald-900 font-bold cursor-pointer underline flex items-center gap-1"
                                title="Add all differing courses that have not yet been enrolled by this candidate"
                              >
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                <span>Add All Differing Courses ({availableProgrammeCourses.filter((c) => !(alreadyEnrolledCourses instanceof Set && alreadyEnrolledCourses.has(c.code))).length})</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={handleSelectAllCourses}
                              className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"
                            >
                              {(alreadyEnrolledCourses instanceof Set && alreadyEnrolledCourses.size > 0) ? 'Select Differing' : `Select All (${availableProgrammeCourses.length})`}
                            </button>
                          </div>
                        )}
                      </div>

                      {availableProgrammeCourses.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 bg-white rounded border border-zinc-100 mb-2">
                          {availableProgrammeCourses.map((c) => {
                            if (!c || !c.code) return null;
                            const isAlreadySelected = selectedCourses.includes(c.code);
                            const isAlreadyEnrolled = alreadyEnrolledCourses instanceof Set ? alreadyEnrolledCourses.has(c.code) : false;
                            const title = getCourseTitle(c.code, selectedProgramme);
                            const isPractical = isPracticalCourse(c.code, title);
                            return (
                              <button
                                type="button"
                                key={c.code}
                                disabled={isAlreadySelected || isAlreadyEnrolled}
                                onClick={() => handleAddCourse(c.code)}
                                className={`px-2 py-0.5 text-[11px] font-mono rounded font-bold transition cursor-pointer flex items-center gap-1 ${
                                  isAlreadySelected
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 opacity-60 cursor-not-allowed'
                                    : isAlreadyEnrolled
                                    ? 'bg-amber-100 text-amber-900 border border-amber-300 opacity-75 cursor-not-allowed'
                                    : isPractical
                                    ? 'bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 hover:border-purple-400'
                                    : 'bg-zinc-50 hover:bg-indigo-50 text-indigo-900 border border-zinc-200 hover:border-indigo-400'
                                }`}
                                title={
                                  isAlreadyEnrolled
                                    ? `Already Registered: Course ${c.code} was previously enrolled for student ${enrollmentNo}. Rule: Additional intake is permitted for differing course codes.`
                                    : `${c.code}: ${title}${isPractical ? ' (Practical / Lab Course)' : ' (Theory Course)'} - Click to add intake`
                                }
                              >
                                {isPractical && <FlaskConical className="w-2.5 h-2.5 text-purple-600 shrink-0" />}
                                <span>{c.code}</span>
                                {isPractical && (
                                  <span className="text-[8.5px] px-1 py-0 rounded bg-purple-200 text-purple-900 font-sans font-semibold">
                                    Practical
                                  </span>
                                )}
                                {isAlreadySelected ? (
                                  <Check className="w-2.5 h-2.5" />
                                ) : isAlreadyEnrolled ? (
                                  <Lock className="w-2.5 h-2.5 text-amber-700" />
                                ) : (
                                  <Plus className="w-2.5 h-2.5" />
                                )}
                                {isAlreadyEnrolled && (
                                  <span className="text-[9px] font-normal text-amber-800 font-sans">(Enrolled)</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-[11px] text-zinc-500 italic mb-2">
                          No pre-seeded courses for {selectedProgramme}. Type below to add course codes, and they will be saved to quick suggestions automatically!
                        </div>
                      )}

                      {/* Quick Add New Course to this Programme */}
                      <div className="flex items-center gap-1.5 pt-1 border-t border-zinc-200/60 flex-wrap">
                        <span className="text-[10px] text-zinc-500 font-semibold whitespace-nowrap">
                          + Add Course to {selectedProgramme}:
                        </span>
                        <input
                          type="text"
                          placeholder="e.g. BEGC-102 or MCSL-016 (Practical)"
                          value={newCourseForProgrammeInput}
                          onChange={(e) => setNewCourseForProgrammeInput(e.target.value.toUpperCase())}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddCustomCourseToProgramme();
                            }
                          }}
                          className="px-2 py-0.5 text-xs font-mono font-bold border border-zinc-300 rounded bg-white w-48"
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomCourseToProgramme}
                          disabled={!newCourseForProgrammeInput.trim()}
                          className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-300 text-white text-[11px] font-bold rounded cursor-pointer transition flex items-center gap-1"
                        >
                          {isPracticalCourse(newCourseForProgrammeInput) && (
                            <FlaskConical className="w-3 h-3 text-purple-200" />
                          )}
                          <span>
                            {isPracticalCourse(newCourseForProgrammeInput) ? 'Add Practical Course' : 'Add Course'}
                          </span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Search / Manual Multi-Add Input */}
                  <div className="relative">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5" />
                        <input
                          type="text"
                          placeholder="Type course code (e.g. BEGC-101, MCSL-016) or comma-separated list (BEGC-101, BLIE-227...) and press Enter or Add"
                          value={courseSearchInput}
                          onChange={(e) => setCourseSearchInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (courseSearchInput.trim()) {
                                handleAddCourse(courseSearchInput.trim());
                              }
                            }
                          }}
                          className="w-full pl-8 pr-3 py-1.5 text-xs font-mono border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                        />
                      </div>
                      <button
                        type="button"
                        disabled={!courseSearchInput.trim()}
                        onClick={() => {
                          if (courseSearchInput.trim()) {
                            handleAddCourse(courseSearchInput.trim());
                          }
                        }}
                        className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-900 disabled:bg-zinc-300 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg shrink-0 cursor-pointer flex items-center gap-1"
                      >
                        {isPracticalCourse(courseSearchInput) && (
                          <FlaskConical className="w-3 h-3 text-purple-300" />
                        )}
                        <span>
                          {isPracticalCourse(courseSearchInput) ? 'Add Practical' : 'Add'}
                        </span>
                      </button>
                    </div>

                    {/* Autocomplete Dropdown List */}
                    {courseAutocompleteList.length > 0 && (
                      <div className="absolute left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto divide-y divide-zinc-100">
                        {courseAutocompleteList.map((match) => {
                          const matchIsPractical = isPracticalCourse(match.code, match.title);
                          return (
                            <button
                              type="button"
                              key={`${match.programme}-${match.code}`}
                              onClick={() => handleAddCourse(match.code)}
                              className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 flex items-center justify-between group transition cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-indigo-900 group-hover:text-indigo-700">
                                  {match.code}
                                </span>
                                {matchIsPractical && (
                                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 border border-purple-200">
                                    <FlaskConical className="w-2.5 h-2.5 text-purple-600" />
                                    <span>Practical</span>
                                  </span>
                                )}
                                <span className="text-zinc-600 text-[11px] truncate max-w-xs">{match.title}</span>
                              </div>
                              <span className="text-[10px] bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded font-semibold">
                                {match.programme}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Selected Courses Chips Display with dynamic titles and IGNOU lookup buttons */}
                  <div className="mt-2.5">
                    {selectedCourses.length === 0 ? (
                      <div className="text-xs text-zinc-400 italic p-2.5 border border-dashed border-zinc-200 rounded-lg text-center">
                        No course codes added yet. Click above quick suggestions or type/paste comma-separated course codes to select (both Theory and Practical courses supported).
                      </div>
                    ) : (
                      <div className="space-y-1.5 p-2.5 bg-indigo-50/40 border border-indigo-200 rounded-lg max-h-64 overflow-y-auto">
                        <div className="flex items-center justify-between text-[11px] font-bold text-indigo-950 pb-1 border-b border-indigo-100">
                          <span className="flex items-center gap-2">
                            <span>Selected Courses ({selectedCourses.length} courses):</span>
                            {selectedCourses.some((c) => isPracticalCourse(c, getCourseTitle(c, selectedProgramme))) && (
                              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.2 rounded-full bg-purple-100 text-purple-800 font-bold border border-purple-200">
                                <FlaskConical className="w-2.5 h-2.5 text-purple-700" />
                                <span>Includes Practical Courses</span>
                              </span>
                            )}
                          </span>
                          <span className="text-zinc-500 font-normal text-[10px]">
                            Titles auto-linked & updatable from IGNOU.ac.in
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {selectedCourses.map((code) => {
                            const title = getCourseTitle(code, selectedProgramme);
                            const isFetching = fetchingIgnouCodes[code];
                            const isDual = isDualComponentCourse(code, title);
                            const isPrac = isPracticalCourse(code, title);
                            const currentComp = courseComponentTypes[code] || (isDual ? 'Both' : isPrac ? 'Practical' : 'Assignment');

                            return (
                              <div
                                key={code}
                                className={`flex items-start justify-between gap-2 bg-white p-2 rounded-lg shadow-2xs transition border ${
                                  currentComp === 'Both'
                                    ? 'border-indigo-300 ring-1 ring-purple-200'
                                    : currentComp === 'Practical'
                                    ? 'border-purple-200 hover:border-purple-300'
                                    : 'border-amber-200 hover:border-amber-300'
                                }`}
                              >
                                <div className="min-w-0 flex-1 space-y-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-mono font-black text-indigo-950 text-xs flex items-center gap-1">
                                      {code}
                                    </span>
                                    {isDual && (
                                      <span className="inline-flex items-center gap-0.5 text-[8.5px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300">
                                        Dual Component (Both Asgn & Prac)
                                      </span>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleFetchIgnouTitle(code)}
                                      disabled={isFetching}
                                      className="text-[9px] text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.2 rounded font-semibold flex items-center gap-0.5 cursor-pointer disabled:opacity-50"
                                      title="Update title from IGNOU.ac.in"
                                    >
                                      {isFetching ? (
                                        <Loader2 className="w-2.5 h-2.5 animate-spin text-indigo-600" />
                                      ) : (
                                        <RefreshCw className="w-2.5 h-2.5" />
                                      )}
                                      <span>IGNOU Title</span>
                                    </button>
                                  </div>

                                  <div className="text-[10.5px] text-zinc-600 truncate font-medium" title={title}>
                                    {title}
                                  </div>

                                  {/* Component Selector: Assignment, Practical, or Both */}
                                  <div className="pt-1 flex items-center gap-1 flex-wrap">
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 mr-0.5">
                                      Component:
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setCourseComponentTypes((prev) => ({ ...prev, [code]: 'Assignment' }))}
                                      className={`px-1.5 py-0.5 text-[9px] font-bold rounded cursor-pointer transition ${
                                        currentComp === 'Assignment'
                                          ? 'bg-amber-600 text-white shadow-2xs'
                                          : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                                      }`}
                                      title="Record as Theory Assignment (TMA) submission"
                                    >
                                      Assignment
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setCourseComponentTypes((prev) => ({ ...prev, [code]: 'Practical' }))}
                                      className={`px-1.5 py-0.5 text-[9px] font-bold rounded cursor-pointer transition inline-flex items-center gap-0.5 ${
                                        currentComp === 'Practical'
                                          ? 'bg-purple-600 text-white shadow-2xs'
                                          : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                                      }`}
                                      title="Record separately as Practical / Lab submission"
                                    >
                                      <FlaskConical className="w-2.5 h-2.5" />
                                      <span>Practical</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setCourseComponentTypes((prev) => ({ ...prev, [code]: 'Both' }))}
                                      className={`px-1.5 py-0.5 text-[9px] font-bold rounded cursor-pointer transition inline-flex items-center gap-0.5 ${
                                        currentComp === 'Both'
                                          ? 'bg-gradient-to-r from-amber-600 to-purple-600 text-white shadow-2xs'
                                          : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                                      }`}
                                      title="Learner submits BOTH Assignment and Practical for this course (recorded separately)"
                                    >
                                      <span>Both (Asgn + Prac)</span>
                                    </button>
                                  </div>

                                  {/* Component indicator note */}
                                  {currentComp === 'Both' ? (
                                    <div className="text-[9px] text-purple-900 bg-purple-50/80 px-1.5 py-0.5 rounded border border-purple-200 flex items-center gap-1 font-semibold">
                                      <CheckCircle2 className="w-2.5 h-2.5 text-purple-600 shrink-0" />
                                      <span>Records 2 distinct entries: 1 Theory TMA + 1 Practical (Separate keys & regional records)</span>
                                    </div>
                                  ) : currentComp === 'Practical' ? (
                                    <div className="text-[9px] text-purple-900 bg-purple-50/60 px-1.5 py-0.2 rounded border border-purple-200 flex items-center gap-1">
                                      <FlaskConical className="w-2.5 h-2.5 text-purple-600 shrink-0" />
                                      <span>Recorded separately under Practical Register</span>
                                    </div>
                                  ) : null}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCourse(code)}
                                  className="text-zinc-400 hover:text-rose-600 p-1 transition cursor-pointer mt-0.5"
                                  title={`Remove ${code}`}
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Strict Component Separation Gate: Displays Assignment (TMA) vs Practical breakdown */}
                    {selectedCourses.length > 0 && (
                      <div className="mt-2.5 p-3 bg-gradient-to-r from-amber-50/90 via-purple-50/80 to-indigo-50/90 border border-indigo-200 rounded-xl space-y-2 shadow-2xs animate-in fade-in">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-indigo-700" />
                            <span>Strict Component Separation (Assignment TMA vs. Practical)</span>
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-white text-indigo-900 border border-indigo-200">
                            Recorded Separately in Google Sheets
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {/* Assignment (TMA) Column */}
                          <div className="p-2.5 bg-white rounded-lg border border-amber-200 shadow-2xs">
                            <div className="flex items-center justify-between mb-1 pb-1 border-b border-amber-100">
                              <span className="font-bold text-amber-950 flex items-center gap-1 text-[11px]">
                                <FileCheck className="w-3.5 h-3.5 text-amber-600" />
                                <span>Assignment (TMA) Scripts</span>
                              </span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-amber-100 text-amber-900">
                                {realtimeValidation.separated.assignmentCourses.length} TMA
                              </span>
                            </div>
                            {realtimeValidation.separated.assignmentCourses.length > 0 ? (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {realtimeValidation.separated.assignmentCourses.map((c) => (
                                  <span key={`tma-chip-${c}`} className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-950 font-mono text-[10.5px] font-bold border border-amber-200">
                                    {c} <span className="text-[9px] text-amber-700 font-sans font-semibold">(TMA)</span>
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[10.5px] text-zinc-400 italic">No TMA courses selected</p>
                            )}
                          </div>

                          {/* Practical Column */}
                          <div className="p-2.5 bg-white rounded-lg border border-purple-200 shadow-2xs">
                            <div className="flex items-center justify-between mb-1 pb-1 border-b border-purple-100">
                              <span className="font-bold text-purple-950 flex items-center gap-1 text-[11px]">
                                <FlaskConical className="w-3.5 h-3.5 text-purple-600" />
                                <span>Practical Scripts</span>
                              </span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-purple-100 text-purple-900">
                                {realtimeValidation.separated.practicalCourses.length} Practical
                              </span>
                            </div>
                            {realtimeValidation.separated.practicalCourses.length > 0 ? (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {realtimeValidation.separated.practicalCourses.map((c) => (
                                  <span key={`prac-chip-${c}`} className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-950 font-mono text-[10.5px] font-bold border border-purple-200">
                                    {c} <span className="text-[9px] text-purple-700 font-sans font-semibold">(Practical)</span>
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[10.5px] text-zinc-400 italic">No Practical courses selected</p>
                            )}
                          </div>
                        </div>
                        <div className="text-[10.5px] text-indigo-950 bg-white/70 px-2.5 py-1 rounded-md border border-indigo-100 flex items-center justify-between">
                          <span>
                            Sheets Entry: <strong className="font-mono text-zinc-900">{realtimeValidation.separated.formattedGoogleSheetsString || 'None'}</strong>
                          </span>
                          <span className="text-[9.5px] text-emerald-800 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Strictly Separated • Never Mixed Together</span>
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Additional Optional Contact & Remarks */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-600 mb-1">
                      Student Email (Optional)
                    </label>
                    <input
                      type="email"
                      placeholder="student@ignou.ac.in"
                      value={studentEmail}
                      onChange={(e) => setStudentEmail(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-zinc-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-600 mb-1">
                      Desk Remarks (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Identity verified, physical script verified"
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-zinc-300 rounded-lg"
                    />
                  </div>
                </div>

                {/* Immediate Feedback Validation Summary after submission / validation attempts */}
                {validationResult && (
                  <div className="pt-2">
                    <ValidationSummary
                      status={validationResult.status as 'Success' | 'Rejected'}
                      reason={validationResult.reason}
                      rule={validationResult.rule}
                      action={validationResult.action}
                      cleanData={validationResult.cleanData}
                      onDismiss={() => setValidationResult(null)}
                      onClose={() => setValidationResult(null)}
                    />
                  </div>
                )}

                {/* Background Data Entry Validation Service: Real-Time Pre-Push Feedback */}
                <div
                  id="background-validation-card"
                  className={`p-3.5 rounded-xl border transition-all ${
                    realtimeValidation.isValid
                      ? 'bg-emerald-50/90 border-emerald-300 shadow-xs'
                      : realtimeValidation.errors.length > 0
                      ? 'bg-rose-50/90 border-rose-300 shadow-xs'
                      : 'bg-zinc-50 border-zinc-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 flex-1">
                      {realtimeValidation.isValid ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <div className={`text-xs font-black ${realtimeValidation.isValid ? 'text-emerald-950' : 'text-rose-950'}`}>
                          {realtimeValidation.isValid
                            ? '✓ Pre-Push Background Validation Passed: Ready for Google Sheets'
                            : `⚠️ Pre-Push Background Validation: Push Blocked (${realtimeValidation.errors.length} Issue${realtimeValidation.errors.length === 1 ? '' : 's'})`}
                        </div>
                        <p className={`text-[11px] mt-0.5 ${realtimeValidation.isValid ? 'text-emerald-800' : 'text-rose-800'}`}>
                          {realtimeValidation.isValid
                            ? 'All entry fields verified against IGNOU integrity rules. TMA and Practical courses recorded strictly separately.'
                            : 'Common data entry errors detected. Correct the issues below before saving to ensure clean Google Sheets records.'}
                        </p>

                        {/* Live List of Errors if any */}
                        {realtimeValidation.errors.length > 0 && (
                          <ul className="mt-2 space-y-1 text-[11px] font-semibold text-rose-900 bg-white/80 p-2 rounded-lg border border-rose-200">
                            {realtimeValidation.errors.map((err, idx) => (
                              <li key={idx} className="flex items-start gap-1.5">
                                <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                                <span>{err}</span>
                              </li>
                            ))}
                          </ul>
                        )}

                        {/* Live Warnings if any */}
                        {realtimeValidation.warnings.length > 0 && (
                          <div className="mt-1.5 text-[10.5px] font-medium text-amber-900 bg-amber-50/80 px-2 py-1 rounded border border-amber-200 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                            <span>{realtimeValidation.warnings.join(' • ')}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Pre-Push Checklist Badges */}
                    <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-1 shrink-0 text-[10px] font-bold">
                      <span className={`px-2 py-0.5 rounded-full ${
                        realtimeValidation.fields.enrollmentNo.valid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {realtimeValidation.fields.enrollmentNo.valid ? '✓ Enrollment No.' : '! Enrollment No.'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full ${
                        realtimeValidation.fields.studentName.valid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {realtimeValidation.fields.studentName.valid ? '✓ Candidate Name' : '! Candidate Name'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full ${
                        realtimeValidation.fields.courseCodes.valid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {realtimeValidation.fields.courseCodes.valid ? '✓ Courses' : '! Courses'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full ${
                        realtimeValidation.fields.components.valid ? 'bg-purple-100 text-purple-900' : 'bg-zinc-100 text-zinc-600'
                      }`}>
                        Strict TMA/Prac Separated
                      </span>
                    </div>
                  </div>
                </div>

                {/* Form Actions: "Submit & Generate Receipt" (Non-Financial) */}
                <div className="pt-4 border-t border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-[11px] text-zinc-500">
                    Session: <strong className="text-zinc-800">{selectedSession}</strong> • Non-Financial Counter Intake (SC-2033)
                  </div>

                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    <button
                      type="button"
                      id="check-duplicate-enrollment-btn"
                      onClick={handleCheckSingleEnrollmentInActiveSession}
                      className="px-3.5 py-2.5 font-bold text-xs rounded-xl border border-zinc-200 bg-zinc-50/90 hover:bg-zinc-100 text-zinc-700 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:scale-98"
                      title="Check whether this enrollment number already has an intake in the active session"
                    >
                      <Hash className="w-4 h-4 text-zinc-500" />
                      <span>Check Duplicate</span>
                    </button>

                    <button
                      type="button"
                      id="run-integrity-check-btn"
                      onClick={handleRunPreCheck}
                      className="px-4 py-2.5 font-bold text-xs rounded-xl border border-indigo-200 bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:scale-98"
                      title="Validate entry against Rule 1, Rule 2, and Rule 3 before saving"
                    >
                      <ShieldCheck className="w-4 h-4 text-indigo-600" />
                      <span>Check Integrity</span>
                    </button>

                    <button
                      type="submit"
                      id="submit-and-generate-receipt-btn"
                      disabled={isSubmitting}
                      className={`px-6 py-2.5 font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 ${
                        isSubmitting
                          ? 'bg-indigo-400 text-white cursor-not-allowed opacity-80'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer active:scale-98'
                      }`}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Recording...</span>
                        </>
                      ) : (
                        <>
                          <Printer className="w-4 h-4" />
                          <span>Confirm Intake & Save</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Right: Counter Live Activity & Analytics Dashboard Widget (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              {/* Dashboard Widget: Visualizes total number of student intakes per programme using a bar chart */}
              <ErrorBoundary fallbackTitle="Programme Intake Bar Chart Encountered an Issue">
                <ProgrammeIntakeBarChart
                  onSelectProgramme={(code) => setSelectedChartProgramme(code)}
                  selectedProgramme={selectedChartProgramme}
                />
              </ErrorBoundary>

              <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                  <div className="flex items-center gap-2">
                    <Printer className="w-4 h-4 text-emerald-600" />
                    <h3 className="font-bold text-zinc-900 text-sm">
                      Recent Receipts ({currentSession})
                    </h3>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {selectedChartProgramme && (
                      <button
                        type="button"
                        onClick={() => setSelectedChartProgramme(null)}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 font-semibold cursor-pointer transition flex items-center gap-1"
                        title="Clear programme filter"
                      >
                        <span>{selectedChartProgramme}</span>
                        <X className="w-3 h-3" />
                      </button>
                    )}
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 font-semibold">
                      {displayedRecentIntakes.length} {displayedRecentIntakes.length === 1 ? 'Record' : 'Records'}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-zinc-500 mt-2 mb-3">
                  {selectedChartProgramme
                    ? `Filtered by programme ${selectedChartProgramme}. Click any student record to preview or re-print.`
                    : 'Click any student record to preview or re-print the official acknowledgment receipt slip.'}
                </p>

                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {displayedRecentIntakes.length === 0 ? (
                    <div className="text-center py-10 text-zinc-400 text-xs">
                      {selectedChartProgramme ? (
                        <>
                          No student intakes found for programme <strong className="text-zinc-700">{selectedChartProgramme}</strong> in {currentSession}.
                          <br />
                          <button
                            type="button"
                            onClick={() => setSelectedChartProgramme(null)}
                            className="mt-2 text-indigo-600 hover:underline font-semibold cursor-pointer inline-block"
                          >
                            Show all programmes
                          </button>
                        </>
                      ) : (
                        <>
                          No submissions recorded yet for {currentSession}.
                          <br />
                          Use the registration form on the left to register a student.
                        </>
                      )}
                    </div>
                  ) : (
                    displayedRecentIntakes.map((record: any, idx: number) => {
                      const enr = record.Enrollment_No || record.enrollmentNo || record["Enrollment No"] || "-";
                      const candName = record.Candidate_Name || record.candidateName || record["Candidate Name"] || record.studentName || "-";
                      const prog = record.Programme || record.programme || record.programmeCode || "-";
                      const rawCourses = record.Courses || record.courses || record.courseCodes || [];
                      const coursesArr: string[] = Array.isArray(rawCourses)
                        ? rawCourses
                        : typeof rawCourses === 'string'
                        ? rawCourses.split(',').map((c: string) => c.trim()).filter(Boolean)
                        : [];
                      const token = record.Token_No || record.tokenNo || record.receiptNumber || record.id || "-";
                      const subMode = record.submissionMode || record.mode || "In-Person (Desk)";
                      const subDate = record.submissionDate || record.receiptDate || (record.Timestamp ? String(record.Timestamp).split('T')[0] : (record.createdAt ? String(record.createdAt).split('T')[0] : ""));
                      const status = record.Status || record.status || "Received";

                      return (
                        <div
                          key={`recent-intake-${record.id || token || enr}-${idx}`}
                          className="p-3 bg-zinc-50 hover:bg-indigo-50/40 border border-zinc-200 hover:border-indigo-300 rounded-xl transition group text-xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-mono font-bold text-indigo-950 text-xs flex items-center gap-1.5">
                                {token}
                                {token === justSubmittedToken && (
                                  <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-sans font-bold">
                                    JUST GENERATED
                                  </span>
                                )}
                              </div>
                              <div className="font-semibold text-zinc-800 mt-0.5">
                                {candName}
                                <span className="text-zinc-500 font-normal ml-1">
                                  ({enr})
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {/* Quick Edit Receipt Date */}
                              <button
                                id={`recent-date-btn-${record.id || token}`}
                                onClick={() => handleOpenDateEdit(record)}
                                className="p-1.5 text-zinc-600 hover:text-indigo-600 hover:bg-indigo-50 border border-zinc-200 rounded-lg text-xs font-semibold transition cursor-pointer"
                                title="Edit Intake / Receipt Date"
                              >
                                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                              </button>

                              {/* Edit Intake Receipt */}
                              <button
                                id={`recent-edit-btn-${record.id || token}`}
                                onClick={() => handleEditClick(record)}
                                className="p-1.5 text-zinc-600 hover:text-indigo-600 hover:bg-indigo-50 border border-zinc-200 rounded-lg text-xs font-semibold transition cursor-pointer"
                                title="Edit Full Intake Record"
                              >
                                <Pencil className="w-3.5 h-3.5 text-zinc-600 hover:text-indigo-600" />
                              </button>

                              {/* Delete Intake Record */}
                              <button
                                id={`recent-delete-btn-${record.id || token}`}
                                onClick={() => handleDeleteClick(record)}
                                className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 border border-zinc-200 rounded-lg text-xs font-semibold transition cursor-pointer"
                                title="Delete Intake Record (Coordinator PIN 2033 Required)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>

                              {/* Print Receipt */}
                              <button
                                id={`recent-receipt-btn-${record.id || token}`}
                                onClick={() => {
                                  openReceiptModal({
                                    ...record,
                                    courseCodes: coursesArr,
                                    courses: coursesArr,
                                    enrollmentNo: enr,
                                    studentName: candName,
                                    programmeCode: prog,
                                    tokenNo: token,
                                    submissionDate: subDate,
                                    receiptDate: subDate,
                                  });
                                }}
                                className="px-2 py-1 bg-white hover:bg-indigo-600 hover:text-white border border-zinc-300 text-zinc-700 rounded-lg text-[11px] font-semibold transition flex items-center gap-1 shrink-0 shadow-2xs cursor-pointer"
                                title="Print Official Acknowledgment Receipt"
                              >
                                <Printer className="w-3 h-3" />
                                <span>Receipt</span>
                              </button>
                            </div>
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-800">
                              {prog}
                            </span>
                            {coursesArr.map((c: string) => (
                              <span
                                key={c}
                                className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white text-zinc-700 border border-zinc-200"
                              >
                                {c}
                              </span>
                            ))}
                          </div>

                          <div className="mt-2 pt-2 border-t border-zinc-200/60 flex items-center justify-between text-[10px] text-zinc-500">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span>{subMode}</span>
                              <span>•</span>
                              <button
                                type="button"
                                onClick={() => handleOpenDateEdit(record)}
                                className="inline-flex items-center gap-1 hover:text-indigo-700 hover:bg-indigo-50 px-1.5 py-0.5 rounded font-semibold text-zinc-700 border border-zinc-200/80 hover:border-indigo-300 transition cursor-pointer group"
                                title="Wrong receipt date? Click to change date"
                              >
                                <Calendar className="w-3 h-3 text-indigo-600 group-hover:scale-110 transition shrink-0" />
                                <span className="underline decoration-dotted underline-offset-2">
                                  {subDate ? formatDate(subDate) : 'Set Date'}
                                </span>
                                <Pencil className="w-2.5 h-2.5 text-zinc-400 group-hover:text-indigo-600 ml-0.5 shrink-0" />
                              </button>
                            </div>
                            <span
                              className={`px-1.5 py-0.2 rounded font-medium ${
                                status === 'Evaluated'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : status === 'Under Evaluation'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-zinc-100 text-zinc-600'
                              }`}
                            >
                              {status}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Module A Requirement 3: Assignment Status Analytics & Intake Matrix */}
          <div className="pt-2">
            <ErrorBoundary fallbackTitle="Assignment Status Analytics & Intake Matrix Encountered an Issue">
              <IntakeStatusMatrix />
            </ErrorBoundary>
          </div>
        </div>
      )}

      {/* View 2: Submissions Register (Stage 1 Master Table with Edit and Delete Actions) */}
      {deskView === 'SUBMISSIONS_REGISTER' && (
        <IntakeRegister />
      )}

      {/* View 3: Registration Receipts Register (Completely Non-Financial) */}
      {deskView === 'RECEIPTS' && (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xs overflow-hidden">
          <div className="p-5 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-teal-600" />
                <h3 className="font-bold text-zinc-900 text-base">
                  Registration Receipts Ledger (Study Centre Acknowledgment Register)
                </h3>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Official statutory intake receipts generated for registered students in <strong className="text-zinc-800">{currentSession}</strong>.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-900 self-start sm:self-auto">
              Total Receipts: {filteredReceipts.length}
            </span>
          </div>

          {/* Mobile Cards View (screens < 768px) */}
          <div className="block md:hidden space-y-3 p-4">
            {filteredReceipts.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-xl border border-zinc-200 text-zinc-400 text-sm">
                No registration receipts issued yet in cycle {currentSession}.
              </div>
            ) : (
              filteredReceipts.map((rcpt: any, idx: number) => {
                const enrollment = rcpt.Enrollment_No || rcpt.enrollmentNo || rcpt.studentId || rcpt["Enrollment No"] || "-";
                const candidateName = rcpt.Candidate_Name || rcpt.candidateName || rcpt.studentName || rcpt["Candidate Name"] || "-";
                const contact = rcpt.Contact || rcpt.contact || rcpt.studentPhone || rcpt["Contact Number"] || "";
                const programme = rcpt.Programme || rcpt.programme || rcpt.programmeCode || "-";
                const rawCourses = rcpt.Courses || rcpt.courses || rcpt.registeredCourses || [];
                const coursesStr = Array.isArray(rawCourses) ? rawCourses.join(", ") : String(rawCourses || "-");
                const timestamp = rcpt.submissionDate || rcpt.receiptDate || (rcpt.issuedAt ? String(rcpt.issuedAt).split('T')[0] : (rcpt.Timestamp ? String(rcpt.Timestamp).split('T')[0] : (rcpt.createdAt || "-")));
                const official = rcpt.Official || rcpt.handledBy || rcpt.official || rcpt.issuedBy || "-";
                const rcptNo = rcpt.receiptNumber || rcpt.Token_No || rcpt.tokenNo || rcpt.id || "-";

                return (
                  <div
                    key={`mobile-receipt-${rcpt.id || rcptNo || enrollment}-${idx}`}
                    style={{
                      backgroundColor: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '12px',
                      marginBottom: '10px',
                    }}
                    className="shadow-xs"
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>{enrollment}</span>
                      <span style={{ fontSize: '11px', background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px' }}>{programme}</span>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>{candidateName}</div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Courses: {coursesStr}</div>
                    {contact && contact !== '-' && (
                      <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>Ph: {contact}</div>
                    )}
                    <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{formatDate(timestamp)}</span>
                      <span>By: {official}</span>
                    </div>
                    {/* Action Row */}
                    <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-zinc-100">
                      <span className="font-mono text-[10px] text-zinc-500 font-semibold">{rcptNo}</span>
                      <button
                        type="button"
                        onClick={() => openRegistrationReceiptModal(rcpt)}
                        className="px-2.5 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md inline-flex items-center gap-1 shadow-xs cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print Slip</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Table View (screens >= 768px) */}
          <div className="hidden md:block overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 text-zinc-600 uppercase text-[10px] font-bold border-b border-zinc-200">
                <tr>
                  <th className="py-3 px-4">Receipt Number</th>
                  <th className="py-3 px-4">Candidate Details</th>
                  <th className="py-3 px-4">Programme</th>
                  <th className="py-3 px-4">Registered Courses</th>
                  <th className="py-3 px-4">Submission Mode</th>
                  <th className="py-3 px-4">Issuing Official</th>
                  <th className="py-3 px-4 text-right">Official Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {filteredReceipts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-zinc-400">
                      No registration receipts issued yet in cycle {currentSession}.
                    </td>
                  </tr>
                ) : (
                  filteredReceipts.map((rcpt: any, idx: number) => {
                    const enrollment = rcpt.Enrollment_No || rcpt.enrollmentNo || rcpt.studentId || rcpt["Enrollment No"] || "-";
                    const candidateName = rcpt.Candidate_Name || rcpt.candidateName || rcpt.studentName || rcpt["Candidate Name"] || "-";
                    const contact = rcpt.Contact || rcpt.contact || rcpt.studentPhone || rcpt["Contact Number"] || "";
                    const programme = rcpt.Programme || rcpt.programme || rcpt.programmeCode || "-";
                    const rawCourses = rcpt.Courses || rcpt.courses || rcpt.registeredCourses || [];
                    const coursesArr = Array.isArray(rawCourses)
                      ? rawCourses
                      : typeof rawCourses === 'string'
                      ? rawCourses.split(',').map((c: string) => c.trim()).filter(Boolean)
                      : [];
                    const rcptDate = rcpt.submissionDate || rcpt.receiptDate || (rcpt.issuedAt ? String(rcpt.issuedAt).split('T')[0] : (rcpt.Timestamp ? String(rcpt.Timestamp).split('T')[0] : (rcpt.createdAt || "-")));
                    const official = rcpt.Official || rcpt.handledBy || rcpt.official || rcpt.issuedBy || "-";
                    const rcptNo = rcpt.receiptNumber || rcpt.Token_No || rcpt.tokenNo || rcpt.id || "-";

                    return (
                      <tr key={`receipt-row-${rcpt.id || rcptNo || enrollment}-${idx}`} className="hover:bg-zinc-50/70 transition">
                        <td className="py-3 px-4 font-mono font-bold text-indigo-950">
                          {rcptNo}
                          <div className="mt-0.5">
                            <button
                              type="button"
                              onClick={() => handleOpenDateEdit(rcpt)}
                              className="inline-flex items-center gap-1 text-[10px] font-sans font-medium text-zinc-600 hover:text-indigo-600 hover:underline cursor-pointer group"
                              title="Edit Receipt Date (Quick Presets & Custom Picker)"
                            >
                              <Calendar className="w-3 h-3 text-indigo-600 shrink-0 group-hover:scale-110 transition" />
                              <span>{formatDate(rcptDate)}</span>
                              <Pencil className="w-2.5 h-2.5 text-zinc-400 group-hover:text-indigo-600 shrink-0 ml-0.5" />
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-zinc-900">{candidateName}</div>
                          <div className="text-zinc-500 font-mono text-[11px]">ID: {enrollment}</div>
                          {contact && (
                            <div className="text-zinc-400 text-[10px]">Ph: {contact}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 font-bold text-zinc-700">
                          <span className="px-2 py-0.5 rounded bg-zinc-100 text-zinc-900 font-mono">
                            {programme}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {coursesArr.map((c: string) => (
                              <span
                                key={c}
                                className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-900 font-mono text-[10px] font-bold border border-indigo-200"
                              >
                                {c}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-zinc-700 font-medium">
                          <div className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-zinc-100 text-zinc-800">
                            In-Person / Verified
                          </div>
                          {rcpt.remarks && (
                            <div className="text-[10px] text-zinc-400 italic mt-0.5">
                              {rcpt.remarks}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-zinc-600">
                          <div className="font-semibold text-zinc-900">{official}</div>
                          <div className="text-emerald-700 text-[10px] font-bold">
                            Zero-Fee Intake
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              id={`receipt-date-edit-btn-${rcpt.id || rcptNo || enrollment}`}
                              onClick={() => handleOpenDateEdit(rcpt)}
                              className="p-1.5 text-zinc-600 hover:text-indigo-600 hover:bg-indigo-50 border border-zinc-200 rounded-lg text-xs font-semibold transition cursor-pointer"
                              title="Edit Receipt Date (Quick Presets Today/Yesterday or Custom Picker)"
                            >
                              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                            </button>
                            <button
                              onClick={() => openRegistrationReceiptModal(rcpt)}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-xs transition inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Print Slip</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Intake Receipt Modal */}
      <EditIntakeModal
        isOpen={!!editingRecord}
        record={editingRecord}
        onClose={() => setEditingRecord(null)}
      />

      {/* Enrollment Uniqueness Audit Modal (Active Session Duplicate Check) */}
      <EnrollmentAuditModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        sessionName={selectedSession || currentSession}
        duplicateGroups={duplicateEnrollmentGroups}
        totalIntakes={sessionIntakes.length}
        totalUniqueEnrollments={new Set(sessionIntakes.map((r) => String(r?.enrollmentNo || '').trim()).filter(Boolean)).size}
        onInspectRecord={(record) => openReceiptModal(record)}
        onEditRecord={(record) => setEditingRecord(record)}
      />

      {/* Student Intake Compiled PDF Summary Report Modal */}
      <IntakeReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        sessionName={selectedSession || currentSession}
        records={filteredIntake}
      />

      {/* Quick Edit Receipt Date Modal */}
      {quickDateModalRecord && (
        <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-zinc-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900 text-sm">
                    Edit Intake / Receipt Date
                  </h3>
                  <p className="text-[11px] text-zinc-500">
                    Update date for slip <span className="font-mono font-bold text-indigo-900">{quickDateModalRecord.tokenNo || quickDateModalRecord.Token_No || quickDateModalRecord.receiptNumber || quickDateModalRecord.id}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuickDateModalRecord(null)}
                className="p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickDate} className="p-5 space-y-4">
              {/* Summary Details */}
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Candidate Name:</span>
                  <strong className="text-zinc-900">
                    {quickDateModalRecord.studentName || quickDateModalRecord.Candidate_Name || quickDateModalRecord['Candidate Name'] || '-'}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Enrollment No:</span>
                  <strong className="font-mono text-zinc-900">
                    {quickDateModalRecord.enrollmentNo || quickDateModalRecord.Enrollment_No || quickDateModalRecord['Enrollment No'] || '-'}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Programme:</span>
                  <strong className="text-indigo-950 font-bold">
                    {quickDateModalRecord.programmeCode || quickDateModalRecord.Programme || '-'}
                  </strong>
                </div>
                <div className="flex justify-between border-t border-zinc-200/80 pt-1">
                  <span className="text-zinc-500">Current Saved Date:</span>
                  <span className="font-semibold text-zinc-700">
                    {formatDate(
                      quickDateModalRecord.submissionDate ||
                      quickDateModalRecord.receiptDate ||
                      (quickDateModalRecord.Timestamp ? String(quickDateModalRecord.Timestamp).split('T')[0] : '') ||
                      (quickDateModalRecord.createdAt ? String(quickDateModalRecord.createdAt).split('T')[0] : '')
                    )}
                  </span>
                </div>
              </div>

              {/* Date Input with Presets */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-zinc-700">
                    Correct Receipt Date <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() - 1);
                        setQuickDateValue(d.toISOString().split('T')[0]);
                      }}
                      className="text-[10px] text-zinc-600 hover:text-zinc-900 font-semibold cursor-pointer"
                    >
                      Yesterday
                    </button>
                    <span className="text-zinc-300">•</span>
                    <button
                      type="button"
                      onClick={() => setQuickDateValue(new Date().toISOString().split('T')[0])}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                    >
                      Today
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <Calendar className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                  <input
                    type="date"
                    value={quickDateValue}
                    onChange={(e) => setQuickDateValue(e.target.value)}
                    required
                    max="2099-12-31"
                    className="w-full pl-9 pr-3 py-2 text-xs font-bold border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white"
                  />
                </div>
                <div className="flex items-center justify-between mt-1 text-[11px] text-zinc-500">
                  <span>Selected: <strong className="text-zinc-800">{formatDate(quickDateValue)}</strong></span>
                </div>
              </div>

              <div className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-2.5 leading-relaxed">
                <strong>Synchronized Update:</strong> Saving this date will immediately update this intake slip, Stage 2 course evaluation records, and official printable receipt acknowledgment slips.
              </div>

              <div className="pt-2 border-t border-zinc-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setQuickDateModalRecord(null)}
                  className="px-3.5 py-1.5 text-xs text-zinc-600 hover:bg-zinc-100 rounded-lg font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Update Receipt Date</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barcode & QR Scanner Modal (Camera-assisted Student Retrieval) */}
      <BarcodeScannerModal
        isOpen={isScannerModalOpen}
        onClose={() => setIsScannerModalOpen(false)}
        onScanSuccess={handleBarcodeScanSuccess}
      />

      {/* Student Fresh Admission & Re-Registration Modal */}
      <AddRegistrationModal
        isOpen={isAddRegistrationModalOpen}
        onClose={() => setIsAddRegistrationModalOpen(false)}
        defaultCadre={registrationModalCadre}
        initialEnrollmentNo={enrollmentNo}
        initialProgrammeCode={selectedProgramme}
      />

      {/* Floating Success Toast for Quick Date Updates */}
      {quickDateSuccessToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-900 text-white text-xs px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{quickDateSuccessToast}</span>
        </div>
      )}
    </div>
  );
};
