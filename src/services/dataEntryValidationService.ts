import { IntakeRecord, CourseEvaluationRecord, RegistrationReceipt } from '../types';
import { IGNOU_PROGRAMMES } from '../data/ignouMasterData';

export interface FieldValidationStatus {
  valid: boolean;
  severity: 'success' | 'warning' | 'error' | 'idle';
  message: string;
}

export interface SeparatedCourseItem {
  code: string;
  component: 'Assignment (TMA)' | 'Practical';
  isPractical: boolean;
  label: string;
}

export interface DataEntryValidationResult {
  isValid: boolean;
  hasErrors: boolean;
  hasWarnings: boolean;
  errors: string[];
  warnings: string[];
  fields: {
    enrollmentNo: FieldValidationStatus;
    studentName: FieldValidationStatus;
    studentPhone: FieldValidationStatus;
    programmeCode: FieldValidationStatus;
    courseCodes: FieldValidationStatus;
    components: FieldValidationStatus;
    submissionDate: FieldValidationStatus;
  };
  separated: {
    assignmentCourses: string[]; // TMA courses only
    practicalCourses: string[];  // Practical courses only
    separatedItems: SeparatedCourseItem[];
    formattedGoogleSheetsString: string; // e.g. "MEG-01 (TMA), MEG-02 (TMA), MCSL-016 (Practical)"
  };
}

export interface ValidationContext {
  existingIntakes?: IntakeRecord[];
  existingEvaluations?: CourseEvaluationRecord[];
  existingReceipts?: RegistrationReceipt[];
  currentIntakeId?: string;
  currentSession?: string;
}

export interface IntakeDataToValidate {
  enrollmentNo: string;
  studentName: string;
  studentPhone?: string;
  programmeCode: string;
  courseCodes: string[];
  courseComponents?: Record<string, 'Assignment' | 'Practical' | 'Both'>;
  practicalCourses?: string[];
  assignmentCourses?: string[];
  submissionDate?: string;
  session?: string;
}

/**
 * Normalizes enrollment number string to numeric digits only.
 */
export function cleanEnrollmentDigits(raw: any): string {
  return String(raw || '').replace(/\D/g, '').trim();
}

/**
 * Normalizes Indian phone number to 10 digits.
 */
export function cleanIndianPhoneNumber(raw: any): string {
  const digits = String(raw || '').replace(/\D/g, '').trim();
  // Strip leading international code +91 (91) or domestic trunk prefix 0 if length is 12 or 11
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  return digits;
}

/**
 * Validates IGNOU Enrollment Number.
 * Rules:
 * - Strictly 9 or 10 numeric digits
 * - Cannot be pure dummy repetitive numbers (0000000000, 1111111111, 9999999999)
 * - Cannot be sequential dummy runs (1234567890, 0123456789)
 */
export function validateEnrollmentNumber(
  rawVal: string,
  programmeCode?: string,
  context?: ValidationContext
): FieldValidationStatus {
  const trimmed = String(rawVal || '').trim();
  if (!trimmed) {
    return {
      valid: false,
      severity: 'idle',
      message: 'Enter 9 or 10-digit IGNOU Enrollment Number',
    };
  }

  // Check for non-numeric characters
  if (/[^0-9]/.test(trimmed)) {
    return {
      valid: false,
      severity: 'error',
      message: 'Malformed: Enrollment number must contain digits only (no spaces, letters, or symbols)',
    };
  }

  const digits = cleanEnrollmentDigits(trimmed);

  if (digits.length < 7) {
    return {
      valid: false,
      severity: 'error',
      message: `Malformed: Too short (${digits.length} digits). IGNOU enrollment numbers must be at least 7 digits`,
    };
  }

  if (digits.length > 12) {
    return {
      valid: false,
      severity: 'error',
      message: `Malformed: Too long (${digits.length} digits). IGNOU enrollment numbers cannot exceed 12 digits`,
    };
  }

  if (digits.length !== 9 && digits.length !== 10) {
    return {
      valid: true,
      severity: 'warning',
      message: `Note: Enrollment is ${digits.length} digits (standard IGNOU format is 9 or 10 digits)`,
    };
  }

  // Check for dummy repetitive digits (e.g. 0000000000, 1111111111)
  if (/^(\d)\1{8,}$/.test(digits)) {
    return {
      valid: false,
      severity: 'error',
      message: 'Malformed: Fake or dummy repetitive enrollment number detected',
    };
  }

  // Check sequential dummy patterns
  if (digits === '1234567890' || digits === '0123456789' || digits === '9876543210') {
    return {
      valid: false,
      severity: 'error',
      message: 'Malformed: Dummy sequential test number not permitted for official registration',
    };
  }

  // Check Rule 1: Enrollment Number cannot belong to a different programme in historical records
  if (context?.existingIntakes && programmeCode) {
    const cleanProg = programmeCode.trim().toUpperCase();
    for (const it of context.existingIntakes) {
      if (context.currentIntakeId && (it.id === context.currentIntakeId || it.tokenNo === context.currentIntakeId)) {
        continue;
      }
      const itEnr = cleanEnrollmentDigits(it.enrollmentNo || (it as any).Enrollment_No);
      const itProg = String(it.programmeCode || (it as any).Programme || '').trim().toUpperCase();
      if (itEnr === digits && itProg && itProg !== cleanProg) {
        return {
          valid: false,
          severity: 'error',
          message: `Scope Conflict: Enrollment ${digits} is already registered under Programme "${itProg}". Cannot register under "${cleanProg}".`,
        };
      }
    }
  }

  return {
    valid: true,
    severity: 'success',
    message: `Valid ${digits.length}-digit IGNOU Enrollment Number`,
  };
}

/**
 * Validates Candidate / Student Full Name.
 */
export function validateCandidateName(name: string): FieldValidationStatus {
  const trimmed = String(name || '').trim();
  if (!trimmed) {
    return {
      valid: false,
      severity: 'idle',
      message: 'Enter student / candidate legal name as per IGNOU records',
    };
  }

  if (trimmed.length < 2) {
    return {
      valid: false,
      severity: 'error',
      message: 'Malformed: Candidate name must be at least 2 characters long',
    };
  }

  // Reject names consisting purely of numbers or special symbols
  if (!/[a-zA-Z]/.test(trimmed)) {
    return {
      valid: false,
      severity: 'error',
      message: 'Malformed: Candidate name must contain alphabetical letters',
    };
  }

  // Check for illegal special characters (allowing letters, spaces, dots, single quotes, hyphens)
  if (!/^[a-zA-Z\s\.\'\-]+$/.test(trimmed)) {
    return {
      valid: false,
      severity: 'error',
      message: 'Malformed: Name contains illegal characters or digits (only letters, spaces, and periods allowed)',
    };
  }

  // Check dummy names
  const upper = trimmed.toUpperCase();
  if (['TEST', 'DUMMY', 'ASDF', 'XYZ', 'SAMPLE', 'UNKNOWN'].includes(upper)) {
    return {
      valid: false,
      severity: 'warning',
      message: 'Notice: Appears to be placeholder / test student name',
    };
  }

  return {
    valid: true,
    severity: 'success',
    message: 'Candidate name format validated',
  };
}

/**
 * Validates 10-Digit Indian Mobile Contact Number.
 */
export function validateStudentPhone(phone?: string): FieldValidationStatus {
  const raw = String(phone || '').trim();
  if (!raw) {
    return {
      valid: true,
      severity: 'idle',
      message: 'Contact number optional (recommended for SMS alerts)',
    };
  }

  const digits = cleanIndianPhoneNumber(raw);

  if (digits.length !== 10) {
    return {
      valid: false,
      severity: 'error',
      message: `Malformed: Contact number must be exactly 10 digits (current: ${digits.length})`,
    };
  }

  // Indian standard telecommunication numbering plan begins with 6, 7, 8, or 9
  if (!/^[6-9]\d{9}$/.test(digits)) {
    return {
      valid: false,
      severity: 'error',
      message: 'Malformed: Indian mobile numbers must start with 6, 7, 8, or 9',
    };
  }

  // Reject dummy numbers
  if (/^(\d)\1{9}$/.test(digits) || digits === '1234567890' || digits === '9876543210') {
    return {
      valid: false,
      severity: 'error',
      message: 'Malformed: Dummy or repetitive mobile number not allowed',
    };
  }

  return {
    valid: true,
    severity: 'success',
    message: `Valid 10-digit mobile number (+91 ${digits})`,
  };
}

/**
 * Validates IGNOU Programme Code.
 */
export function validateProgrammeCode(code: string): FieldValidationStatus {
  const clean = String(code || '').trim().toUpperCase();
  if (!clean) {
    return {
      valid: false,
      severity: 'idle',
      message: 'Select or enter IGNOU Programme (e.g., MEG, MPS, BCA, BAG)',
    };
  }

  if (clean.length < 2 || clean.length > 10) {
    return {
      valid: false,
      severity: 'error',
      message: 'Malformed: Programme code must be between 2 and 10 uppercase characters',
    };
  }

  if (!/^[A-Z0-9]+$/.test(clean)) {
    return {
      valid: false,
      severity: 'error',
      message: 'Malformed: Programme code must contain only letters and numbers without spaces',
    };
  }

  return {
    valid: true,
    severity: 'success',
    message: `Programme verified: ${clean}`,
  };
}

/**
 * Validates Course Codes and Enforces Strict TMA vs. Practical Separation.
 * Never mixes Assignment(TMA) and Practical together.
 */
export function validateAndSeparateCourses(
  courses: string[],
  programme: string,
  courseComponents?: Record<string, 'Assignment' | 'Practical' | 'Both'>,
  explicitPracticalCourses?: string[],
  explicitAssignmentCourses?: string[]
): {
  status: FieldValidationStatus;
  componentsStatus: FieldValidationStatus;
  assignmentCourses: string[];
  practicalCourses: string[];
  separatedItems: SeparatedCourseItem[];
  formattedGoogleSheetsString: string;
} {
  const cleanList = Array.from(
    new Set(
      (Array.isArray(courses) ? courses : String(courses || '').split(','))
        .map((c) => String(c).trim().toUpperCase())
        .filter(Boolean)
    )
  );

  if (cleanList.length === 0) {
    return {
      status: {
        valid: false,
        severity: 'idle',
        message: 'At least one course code must be added for intake registration',
      },
      componentsStatus: {
        valid: false,
        severity: 'idle',
        message: 'No courses selected',
      },
      assignmentCourses: [],
      practicalCourses: [],
      separatedItems: [],
      formattedGoogleSheetsString: '',
    };
  }

  if (cleanList.length > 20) {
    return {
      status: {
        valid: false,
        severity: 'error',
        message: `Maximum 20 courses allowed per registration receipt (selected: ${cleanList.length})`,
      },
      componentsStatus: {
        valid: false,
        severity: 'error',
        message: 'Exceeds course limit',
      },
      assignmentCourses: [],
      practicalCourses: [],
      separatedItems: [],
      formattedGoogleSheetsString: '',
    };
  }

  // Validate formatting of individual course codes
  const malformedCourses: string[] = [];
  cleanList.forEach((c) => {
    // IGNOU Course codes typically: e.g. MEG-01, MEG01, MCS-211, BCSL-013, BPSC-131, FEG-02
    if (!/^[A-Z]{2,6}[-]?[0-9]{1,4}[A-Z]?$/.test(c)) {
      malformedCourses.push(c);
    }
  });

  if (malformedCourses.length > 0) {
    return {
      status: {
        valid: false,
        severity: 'error',
        message: `Malformed course code(s) detected: ${malformedCourses.join(', ')}. Use standard IGNOU format (e.g. MEG-01, MCS-211, BCSL-013)`,
      },
      componentsStatus: {
        valid: false,
        severity: 'error',
        message: 'Fix malformed course codes',
      },
      assignmentCourses: [],
      practicalCourses: [],
      separatedItems: [],
      formattedGoogleSheetsString: '',
    };
  }

  // Separate courses into Assignment (TMA) and Practical
  const assignmentCourses: string[] = [];
  const practicalCourses: string[] = [];
  const separatedItems: SeparatedCourseItem[] = [];

  cleanList.forEach((c) => {
    const compSetting = courseComponents?.[c];
    const isExplicitPrac = explicitPracticalCourses?.includes(c);
    const isExplicitAsgn = explicitAssignmentCourses?.includes(c);

    // BRL (Bachelor in Retailing under BCOMF) courses are strictly theory TMA courses.
    const isBrlCourse = /^BRL[-_]?\d+/i.test(c);

    // Practical indicator check: true lab prefixes or explicit practical flags
    const isLabOrPracCode = !isBrlCourse && (
      /^(BCSL|MCSL|CITL|BPCL|MPCL|BBYCL|BCHCL|BPHCL|BZYCL|BGGCL|BGYCL|PGDCL)[-_]?\d+/i.test(c) ||
      /^(BCSP|MCSP)[-_]?\d+/i.test(c) ||
      /[-_]P$|\(L\)|\(P\)|[-_]LAB|[-_]L$/i.test(c) ||
      ['BLIE-227', 'BLIE-229', 'MLII-101', 'MLII-102', 'MLII-103', 'MLII-104', 'DNHE-4', 'DECE-4'].includes(c)
    );

    // Strict priority: If user selected Assignment, it is ALWAYS Assignment
    if (compSetting === 'Assignment') {
      assignmentCourses.push(c);
      separatedItems.push({
        code: c,
        component: 'Assignment (TMA)',
        isPractical: false,
        label: `${c} [Assignment (TMA)]`,
      });
    } else if (compSetting === 'Both' || (isExplicitPrac && isExplicitAsgn)) {
      // Must RECORD SEPARATELY: One TMA entry and one Practical entry
      assignmentCourses.push(c);
      practicalCourses.push(c);

      separatedItems.push({
        code: c,
        component: 'Assignment (TMA)',
        isPractical: false,
        label: `${c} [Assignment (TMA)]`,
      });
      separatedItems.push({
        code: c,
        component: 'Practical',
        isPractical: true,
        label: `${c} [Practical Script]`,
      });
    } else if (compSetting === 'Practical' || (isExplicitPrac && !isExplicitAsgn) || (!compSetting && isLabOrPracCode && !isExplicitAsgn)) {
      practicalCourses.push(c);
      separatedItems.push({
        code: c,
        component: 'Practical',
        isPractical: true,
        label: `${c} [Practical Script]`,
      });
    } else {
      assignmentCourses.push(c);
      separatedItems.push({
        code: c,
        component: 'Assignment (TMA)',
        isPractical: false,
        label: `${c} [Assignment (TMA)]`,
      });
    }
  });

  // Strict Separated Formatting for Google Sheets:
  // e.g. "MEG-01 (TMA), MEG-02 (TMA), BCSL-013 (Practical)"
  const formattedGoogleSheetsString = separatedItems
    .map((item) => (item.isPractical ? `${item.code} (Practical)` : `${item.code} (TMA)`))
    .join(', ');

  const tmaCount = assignmentCourses.length;
  const pracCount = practicalCourses.length;
  const compMessage = pracCount > 0 && tmaCount > 0
    ? `Strictly Separated: ${tmaCount} Assignment(TMA) + ${pracCount} Practical recorded into distinct rows`
    : pracCount > 0
    ? `All ${pracCount} course(s) recorded exclusively as Practical scripts`
    : `All ${tmaCount} course(s) recorded exclusively as Assignment (TMA) scripts`;

  return {
    status: {
      valid: true,
      severity: 'success',
      message: `${cleanList.length} course code(s) verified for ${programme}`,
    },
    componentsStatus: {
      valid: true,
      severity: 'success',
      message: compMessage,
    },
    assignmentCourses,
    practicalCourses,
    separatedItems,
    formattedGoogleSheetsString,
  };
}

/**
 * Validates Submission / Receipt Date.
 */
export function validateSubmissionDate(dateStr?: string): FieldValidationStatus {
  const clean = String(dateStr || '').trim();
  if (!clean) {
    return {
      valid: false,
      severity: 'error',
      message: 'Intake submission date is required',
    };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return {
      valid: false,
      severity: 'error',
      message: 'Malformed date: Date must follow YYYY-MM-DD format',
    };
  }

  const d = new Date(clean);
  if (isNaN(d.getTime())) {
    return {
      valid: false,
      severity: 'error',
      message: 'Malformed date: Invalid calendar date',
    };
  }

  // Allow local calendar date including timezone offset buffer (+1 day from UTC)
  const now = new Date();
  const maxDate = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  if (clean > maxDate) {
    return {
      valid: false,
      severity: 'error',
      message: 'Malformed date: Submission date cannot be in the future',
    };
  }

  if (clean < '2015-01-01') {
    return {
      valid: false,
      severity: 'warning',
      message: 'Date is earlier than standard academic operational window',
    };
  }

  return {
    valid: true,
    severity: 'success',
    message: 'Submission date verified',
  };
}

/**
 * Complete Real-Time Background Validation Service.
 * Validates all data entry fields before pushing to Google Sheets,
 * and ensures Assignment(TMA) and Practical are recorded strictly separately.
 */
export function runBackgroundDataEntryValidation(
  data: IntakeDataToValidate,
  context?: ValidationContext
): DataEntryValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Enrollment Number Validation
  const enrollmentStatus = validateEnrollmentNumber(data.enrollmentNo, data.programmeCode, context);
  if (!enrollmentStatus.valid) {
    if (enrollmentStatus.severity === 'error') {
      errors.push(enrollmentStatus.message);
    }
  }

  // 2. Candidate Name Validation
  const nameStatus = validateCandidateName(data.studentName);
  if (!nameStatus.valid) {
    if (nameStatus.severity === 'error') {
      errors.push(nameStatus.message);
    }
  } else if (nameStatus.severity === 'warning') {
    warnings.push(nameStatus.message);
  }

  // 3. Contact Number Validation
  const phoneStatus = validateStudentPhone(data.studentPhone);
  if (!phoneStatus.valid) {
    errors.push(phoneStatus.message);
  }

  // 4. Programme Code Validation
  const programmeStatus = validateProgrammeCode(data.programmeCode);
  if (!programmeStatus.valid) {
    errors.push(programmeStatus.message);
  }

  // 5. Course Selection & Strict TMA / Practical Separation
  const courseValidation = validateAndSeparateCourses(
    data.courseCodes,
    data.programmeCode,
    data.courseComponents,
    data.practicalCourses,
    data.assignmentCourses
  );

  if (!courseValidation.status.valid) {
    errors.push(courseValidation.status.message);
  }

  // 6. Submission Date Validation
  const dateStatus = validateSubmissionDate(data.submissionDate);
  if (!dateStatus.valid) {
    errors.push(dateStatus.message);
  } else if (dateStatus.severity === 'warning') {
    warnings.push(dateStatus.message);
  }

  const isValid = errors.length === 0 &&
    enrollmentStatus.valid &&
    nameStatus.valid &&
    phoneStatus.valid &&
    programmeStatus.valid &&
    courseValidation.status.valid &&
    dateStatus.valid;

  return {
    isValid,
    hasErrors: errors.length > 0,
    hasWarnings: warnings.length > 0,
    errors,
    warnings,
    fields: {
      enrollmentNo: enrollmentStatus,
      studentName: nameStatus,
      studentPhone: phoneStatus,
      programmeCode: programmeStatus,
      courseCodes: courseValidation.status,
      components: courseValidation.componentsStatus,
      submissionDate: dateStatus,
    },
    separated: {
      assignmentCourses: courseValidation.assignmentCourses,
      practicalCourses: courseValidation.practicalCourses,
      separatedItems: courseValidation.separatedItems,
      formattedGoogleSheetsString: courseValidation.formattedGoogleSheetsString,
    },
  };
}

export interface PrePushValidationResult {
  canPush: boolean;
  errors: string[];
  warnings: string[];
  sanitizedData?: {
    enrollmentNo: string;
    candidateName: string;
    contact: string;
    programme: string;
    assignmentCourses: string[];
    practicalCourses: string[];
    separatedCourseString: string;
    categoryLabel: string;
    submissionDate: string;
    unpackedCourses?: any[];
  };
}

/**
 * Background Pre-Push Validation Service.
 * Blocks any corrupted, malformed, or invalid data entry before pushing to Google Sheets.
 * Enforces strict separation of Assignment(TMA) and Practical.
 */
export function validatePrePushToGoogleSheets(
  intakeRecord: any,
  unpackedCourses?: any[],
  context?: ValidationContext
): PrePushValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const rawEnr = intakeRecord.enrollmentNo || intakeRecord.Enrollment_No || '';
  const rawName = intakeRecord.candidateName || intakeRecord.studentName || intakeRecord.Candidate_Name || '';
  const rawPhone = intakeRecord.contact || intakeRecord.studentPhone || intakeRecord.Contact_No || '';
  const rawProg = intakeRecord.programme || intakeRecord.programmeCode || intakeRecord.Programme || '';
  const rawDate = intakeRecord.submissionDate || intakeRecord.receiptDate || intakeRecord.Submission_Date || '';

  // 1. Check for malformed enrollment numbers
  const enrStatus = validateEnrollmentNumber(rawEnr, rawProg, context);
  if (!enrStatus.valid) {
    errors.push(enrStatus.message);
  }

  // 2. Candidate Name Check
  const nameStatus = validateCandidateName(rawName);
  if (!nameStatus.valid) {
    errors.push(nameStatus.message);
  } else if (nameStatus.severity === 'warning') {
    warnings.push(nameStatus.message);
  }

  // 3. Contact Number Check (if provided)
  if (rawPhone) {
    const phoneStatus = validateStudentPhone(rawPhone);
    if (!phoneStatus.valid) {
      errors.push(phoneStatus.message);
    }
  }

  // 4. Programme Code Check
  const progStatus = validateProgrammeCode(rawProg);
  if (!progStatus.valid) {
    errors.push(progStatus.message);
  }

  // 5. Course codes & Strict Assignment (TMA) vs Practical Separation
  const rawCourses = intakeRecord.courses || intakeRecord.courseCodes || intakeRecord.Courses || [];
  const coursesArray: string[] = Array.isArray(rawCourses)
    ? rawCourses.flatMap((c: any) => String(c).split(',')).map((c: string) => String(c).trim().toUpperCase()).filter(Boolean)
    : typeof rawCourses === 'string'
    ? rawCourses.split(',').map((c: string) => String(c).trim().toUpperCase()).filter(Boolean)
    : [];

  const explicitPracticals: string[] = Array.isArray(intakeRecord.practicalCourses)
    ? intakeRecord.practicalCourses.map((c: any) => String(c).trim().toUpperCase())
    : [];
  const explicitAssignments: string[] = Array.isArray(intakeRecord.assignmentCourses)
    ? intakeRecord.assignmentCourses.map((c: any) => String(c).trim().toUpperCase())
    : [];

  const courseResult = validateAndSeparateCourses(
    coursesArray,
    rawProg,
    intakeRecord.courseComponents,
    explicitPracticals,
    explicitAssignments
  );

  if (!courseResult.status.valid) {
    errors.push(courseResult.status.message);
  }

  // 6. Submission Date Check
  if (rawDate) {
    const dateStatus = validateSubmissionDate(rawDate);
    if (!dateStatus.valid) {
      errors.push(dateStatus.message);
    } else if (dateStatus.severity === 'warning') {
      warnings.push(dateStatus.message);
    }
  }

  const cleanEnr = cleanEnrollmentDigits(rawEnr);
  const cleanName = String(rawName).trim();
  const cleanPhone = cleanIndianPhoneNumber(rawPhone);
  const cleanProg = String(rawProg).trim().toUpperCase();
  const cleanDate = rawDate ? String(rawDate).trim() : new Date().toISOString().split('T')[0];

  const tmaCount = courseResult.assignmentCourses.length;
  const pracCount = courseResult.practicalCourses.length;
  const categoryLabel = pracCount > 0 && tmaCount > 0
    ? 'Separated (TMA + Practical)'
    : pracCount > 0
    ? 'Practical'
    : 'Assignment (TMA)';

  // Build sanitized, strictly separated unpacked rows
  const sanitizedUnpackedRows = (unpackedCourses || []).map((row: any) => {
    const code = String(row.courseCode || row.Course_Code || '').replace(/\s*[\(\[](Practical|TMA)[\)\]]\s*/gi, '').trim().toUpperCase();
    const isPrac = Boolean(row.isPractical || row.componentType === 'Practical' || courseResult.practicalCourses.includes(code));
    return {
      ...row,
      courseCode: code,
      Course_Code: isPrac ? `${code} (Practical)` : `${code} (TMA)`,
      Component: isPrac ? 'Practical' : 'Assignment (TMA)',
      componentType: isPrac ? 'Practical' : 'Assignment',
      isPractical: isPrac,
    };
  });

  return {
    canPush: errors.length === 0,
    errors,
    warnings,
    sanitizedData: {
      enrollmentNo: cleanEnr,
      candidateName: cleanName,
      contact: cleanPhone,
      programme: cleanProg,
      assignmentCourses: courseResult.assignmentCourses,
      practicalCourses: courseResult.practicalCourses,
      separatedCourseString: courseResult.formattedGoogleSheetsString,
      categoryLabel,
      submissionDate: cleanDate,
      unpackedCourses: sanitizedUnpackedRows,
    },
  };
}
