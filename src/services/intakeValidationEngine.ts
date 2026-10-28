import { IntakeRecord, CourseEvaluationRecord, RegistrationReceipt, AssignmentSubmission } from '../types';

export interface ValidationSuccess {
  valid: true;
  rule?: undefined;
  reason?: undefined;
}

export interface ValidationFailure {
  valid: false;
  rule: 'Rule 1: Enrollment Number vs. Programme Scope' | 'Rule 2: Multi-Course Intake Allowance' | 'Rule 3: No Duplicate Course Selections';
  reason: string;
}

export type ValidationResult =
  | ValidationSuccess
  | ValidationFailure
  | {
      valid: boolean;
      rule?: 'Rule 1: Enrollment Number vs. Programme Scope' | 'Rule 2: Multi-Course Intake Allowance' | 'Rule 3: No Duplicate Course Selections';
      reason?: string;
    };

export interface EngineSuccessResponse<T = any> {
  Status: 'Success';
  Action: 'Create' | 'Update' | 'Delete';
  Data: T;
}

export interface EngineRejectedResponse {
  Status: 'Rejected';
  Reason: string;
  Rule?: string;
}

export type EngineResponse<T = any> = EngineSuccessResponse<T> | EngineRejectedResponse;

export interface ValidateIntakeParams {
  enrollmentNo: string;
  programmeCode: string;
  courseCodes: string[];
  session?: string;
  currentIntakeId?: string; // Set when updating an existing record to exclude itself
  existingIntakes: IntakeRecord[];
  existingEvaluations?: CourseEvaluationRecord[];
  existingReceipts?: RegistrationReceipt[];
  practicalCourses?: string[];
  assignmentCourses?: string[];
  courseComponents?: Record<string, 'Assignment' | 'Practical' | 'Both'>;
}

/**
 * Normalizes text by removing non-alphanumeric chars for IDs or trimming and uppercasing.
 */
export const normCode = (val?: any): string => {
  return String(val ?? '').trim().toUpperCase();
};

export const normEnrollment = (val?: any): string => {
  return String(val ?? '').replace(/\D/g, '').trim();
};

/**
 * Finds if an Enrollment Number is already associated with any Programme across
 * intakes, course evaluations, or receipts (excluding currentIntakeId).
 */
export function getRegisteredProgrammeForEnrollment(
  enrollmentNo: string,
  existingIntakes: IntakeRecord[] = [],
  existingEvaluations?: CourseEvaluationRecord[],
  existingReceipts?: RegistrationReceipt[],
  currentIntakeId?: string
): string | null {
  const cleanEnr = normEnrollment(enrollmentNo);
  if (!cleanEnr) return null;

  // 1. Check existing intakes
  if (Array.isArray(existingIntakes)) {
    for (const it of existingIntakes) {
      if (!it) continue;
      if (currentIntakeId && (it.id === currentIntakeId || it.tokenNo === currentIntakeId)) continue;
      const itEnr = normEnrollment(it.enrollmentNo || (it as any).Enrollment_No || (it as any).studentId || (it as any)['Enrollment No']);
      const itProg = it.programmeCode || (it as any).Programme || (it as any).programme || (it as any).Programme_Code || (it as any)['Programme'];
      if (itEnr === cleanEnr && itProg) {
        return normCode(itProg);
      }
    }
  }

  // 2. Check existing course evaluations
  if (Array.isArray(existingEvaluations)) {
    for (const ce of existingEvaluations) {
      if (!ce) continue;
      if (currentIntakeId && (ce.intakeId === currentIntakeId || ce.id === currentIntakeId)) continue;
      const ceEnr = normEnrollment(ce.enrollmentNo || (ce as any).Enrollment_No || (ce as any)['Enrollment No']);
      const ceProg = ce.programmeCode || (ce as any).Programme || (ce as any).programme || (ce as any).Programme_Code || (ce as any)['Programme'];
      if (ceEnr === cleanEnr && ceProg) {
        return normCode(ceProg);
      }
    }
  }

  // 3. Check existing receipts
  if (Array.isArray(existingReceipts)) {
    for (const rcpt of existingReceipts) {
      if (!rcpt) continue;
      if (currentIntakeId && (rcpt.id === currentIntakeId || (rcpt as any).intakeId === currentIntakeId)) continue;
      const rcptEnr = normEnrollment(rcpt.studentId || (rcpt as any).enrollmentNo || (rcpt as any).Enrollment_No || (rcpt as any)['Enrollment No']);
      const rcptProg = rcpt.programmeCode || (rcpt as any).Programme || (rcpt as any).programme || (rcpt as any).Programme_Code || (rcpt as any)['Programme'];
      if (rcptEnr === cleanEnr && rcptProg) {
        return normCode(rcptProg);
      }
    }
  }

  return null;
}

/**
 * Gets all courses already registered by a student under a specific programme
 * (excluding currentIntakeId).
 */
export function getEnrolledCoursesForStudent(
  enrollmentNo: string,
  existingIntakes: IntakeRecord[] = [],
  existingEvaluations?: CourseEvaluationRecord[],
  currentIntakeId?: string
): Set<string> {
  const cleanEnr = normEnrollment(enrollmentNo);
  const enrolled = new Set<string>();
  if (!cleanEnr) return enrolled;

  const currentIntake = currentIntakeId && Array.isArray(existingIntakes)
    ? existingIntakes.find((it) => it && (it.id === currentIntakeId || it.tokenNo === currentIntakeId))
    : null;
  const currentToken = currentIntake?.tokenNo;
  const currentCourses = new Set(
    (currentIntake?.courseCodes || []).map((c) => normCode(c)).filter(Boolean)
  );

  if (Array.isArray(existingIntakes)) {
    existingIntakes.forEach((it) => {
      if (!it) return;
      if (currentIntakeId && (it.id === currentIntakeId || it.tokenNo === currentIntakeId || (currentIntake && it.id === currentIntake.id))) return;
      const itEnr = normEnrollment(it.enrollmentNo || (it as any).Enrollment_No || (it as any).studentId || (it as any)['Enrollment No']);
      if (itEnr === cleanEnr) {
        const rawCourses = it.courseCodes || (it as any).courses || (it as any).Courses || [];
        const courseArr = Array.isArray(rawCourses)
          ? rawCourses
          : String(rawCourses || '').split(',').map((c) => c.trim()).filter(Boolean);
        courseArr.forEach((c) => {
          const cleanC = normCode(c);
          if (cleanC) enrolled.add(cleanC);
        });
      }
    });
  }

  if (Array.isArray(existingEvaluations)) {
    existingEvaluations.forEach((ce) => {
      if (!ce) return;
      if (currentIntakeId && (ce.intakeId === currentIntakeId || ce.id === currentIntakeId)) return;
      if (currentToken && (ce.tokenNo === currentToken || (ce as any).Token_No === currentToken)) return;
      const ceEnr = normEnrollment(ce.enrollmentNo || (ce as any).Enrollment_No || (ce as any)['Enrollment No']);
      if (ceEnr === cleanEnr) {
        const course = ce.courseCode || (ce as any).Course_Code || (ce as any)['Course Code'];
        const cleanC = normCode(course);
        // If this evaluation belongs to the intake currently being edited, don't flag as duplicate
        if (currentIntake && currentCourses.has(cleanC)) return;
        if (cleanC) enrolled.add(cleanC);
      }
    });
  }

  return enrolled;
}

/**
 * Gets map of courses and their specific enrolled components ('Assignment' | 'Practical')
 * for a student (excluding currentIntakeId).
 */
export function getEnrolledCourseComponentsForStudent(
  enrollmentNo: string,
  existingIntakes: IntakeRecord[] = [],
  existingEvaluations?: CourseEvaluationRecord[],
  currentIntakeId?: string
): Map<string, Set<'Assignment' | 'Practical'>> {
  const cleanEnr = normEnrollment(enrollmentNo);
  const map = new Map<string, Set<'Assignment' | 'Practical'>>();
  if (!cleanEnr) return map;

  const currentIntake = currentIntakeId && Array.isArray(existingIntakes)
    ? existingIntakes.find((it) => it && (it.id === currentIntakeId || it.tokenNo === currentIntakeId))
    : null;
  const currentToken = currentIntake?.tokenNo;
  const currentCourses = new Set(
    (currentIntake?.courseCodes || []).map((c) => normCode(c)).filter(Boolean)
  );

  const addComp = (code: string, type: 'Assignment' | 'Practical') => {
    const cleanC = normCode(code);
    if (!cleanC) return;
    const current = map.get(cleanC) || new Set<'Assignment' | 'Practical'>();
    current.add(type);
    map.set(cleanC, current);
  };

  if (Array.isArray(existingEvaluations)) {
    existingEvaluations.forEach((ce) => {
      if (!ce) return;
      if (currentIntakeId && (ce.intakeId === currentIntakeId || ce.id === currentIntakeId)) return;
      if (currentToken && (ce.tokenNo === currentToken || (ce as any).Token_No === currentToken)) return;
      const ceEnr = normEnrollment(ce.enrollmentNo || (ce as any).Enrollment_No || (ce as any)['Enrollment No']);
      if (ceEnr === cleanEnr) {
        const c = ce.courseCode || (ce as any).Course_Code;
        const cleanC = normCode(c);
        if (currentIntake && currentCourses.has(cleanC)) return;
        if (c) {
          const isPrac = Boolean(ce.isPractical || ce.componentType === 'Practical');
          addComp(c, isPrac ? 'Practical' : 'Assignment');
        }
      }
    });
  }

  if (Array.isArray(existingIntakes)) {
    existingIntakes.forEach((it) => {
      if (!it) return;
      if (currentIntakeId && (it.id === currentIntakeId || it.tokenNo === currentIntakeId || (currentIntake && it.id === currentIntake.id))) return;
      const itEnr = normEnrollment(it.enrollmentNo || (it as any).Enrollment_No || (it as any).studentId || (it as any)['Enrollment No']);
      if (itEnr === cleanEnr) {
        (it.practicalCourses || []).forEach((c) => addComp(c, 'Practical'));
        (it.assignmentCourses || []).forEach((c) => addComp(c, 'Assignment'));
      }
    });
  }

  return map;
}

/**
 * Core Validation Engine enforcing:
 * - Rule 1: Enrollment Number vs. Programme Scope (same enrollment cannot exist in different programmes)
 * - Rule 2: Multi-Course Intake Allowance (same enrollment & programme allowed if courses or components are different)
 * - Rule 3: No Duplicate Course Selections (no repeated courses or components within entry or across student's profile)
 */
export function validateIntakeRecord(params: ValidateIntakeParams): ValidationResult {
  const cleanEnr = normEnrollment(params.enrollmentNo);
  const cleanProg = normCode(params.programmeCode);
  const rawCourses = params.courseCodes || [];
  const courseList = Array.isArray(rawCourses)
    ? rawCourses
    : String(rawCourses || '').split(',').map((c: string) => c.trim()).filter(Boolean);

  // Basic sanity check
  if (!cleanEnr) {
    return {
      valid: false,
      rule: 'Rule 1: Enrollment Number vs. Programme Scope',
      reason: 'Student Enrollment Number is required.',
    };
  }

  if (!cleanProg) {
    return {
      valid: false,
      rule: 'Rule 1: Enrollment Number vs. Programme Scope',
      reason: 'Programme code is required.',
    };
  }

  if (courseList.length === 0) {
    return {
      valid: false,
      rule: 'Rule 3: No Duplicate Course Selections',
      reason: 'At least one course must be selected.',
    };
  }

  // --- Rule 3 (Internal): No duplicate courses within the single entry ---
  const seenInBatch = new Set<string>();
  const internalDuplicates: string[] = [];

  for (const c of courseList) {
    const clean = normCode(c);
    if (!clean) continue;
    if (seenInBatch.has(clean)) {
      if (!internalDuplicates.includes(clean)) {
        internalDuplicates.push(clean);
      }
    } else {
      seenInBatch.add(clean);
    }
  }

  if (internalDuplicates.length > 0) {
    return {
      valid: false,
      rule: 'Rule 3: No Duplicate Course Selections',
      reason: `Duplicate course selection detected: Course(s) ${internalDuplicates.join(', ')} cannot be repeated within the same intake entry.`,
    };
  }

  // --- Rule 1: Enrollment Number vs. Programme Scope ---
  // The exact same Enrollment Number CANNOT exist in two different Programmes.
  const existingProg = getRegisteredProgrammeForEnrollment(
    cleanEnr,
    params.existingIntakes,
    params.existingEvaluations,
    params.existingReceipts,
    params.currentIntakeId
  );

  if (existingProg && existingProg !== cleanProg) {
    return {
      valid: false,
      rule: 'Rule 1: Enrollment Number vs. Programme Scope',
      reason: `Enrollment number already exists in another programme: Enrollment ${cleanEnr} is already registered under Programme "${existingProg}". In IGNOU, an enrollment number cannot belong to a different programme ("${cleanProg}").`,
    };
  }

  // --- Rule 2 & Rule 3: Multi-Course Intake Allowance & No Duplicate Course Selections Across Entries ---
  // A student can have multiple intake records using SAME Enrollment & SAME Programme,
  // but ONLY if the Course Selection (or Component Type: Assignment vs Practical) is completely different for each entry.
  const enrolledComponents = getEnrolledCourseComponentsForStudent(
    cleanEnr,
    params.existingIntakes,
    params.existingEvaluations,
    params.currentIntakeId
  );
  const alreadyEnrolledCourses = getEnrolledCoursesForStudent(
    cleanEnr,
    params.existingIntakes,
    params.existingEvaluations,
    params.currentIntakeId
  );

  const repeatedCourses: string[] = [];
  seenInBatch.forEach((c) => {
    const desiredComp = params.courseComponents?.[c] ||
      (params.practicalCourses?.includes(c) ? 'Practical' : params.assignmentCourses?.includes(c) ? 'Assignment' : undefined);
    
    const existingComps = enrolledComponents.get(c);
    if (existingComps && existingComps.size > 0) {
      if (!desiredComp) {
        repeatedCourses.push(c);
      } else if (desiredComp === 'Both') {
        if (existingComps.has('Assignment') || existingComps.has('Practical')) {
          const compsStr = Array.from(existingComps).join(' & ');
          repeatedCourses.push(`${c} (${compsStr} already submitted)`);
        }
      } else if (existingComps.has(desiredComp as 'Assignment' | 'Practical')) {
        repeatedCourses.push(`${c} (${desiredComp})`);
      }
    } else if (alreadyEnrolledCourses.has(c) && !desiredComp) {
      repeatedCourses.push(c);
    }
  });

  if (repeatedCourses.length > 0) {
    return {
      valid: false,
      rule: 'Rule 3: No Duplicate Course Selections',
      reason: `Duplicate course selection detected: Student ${cleanEnr} is already enrolled in course(s): ${repeatedCourses.join(', ')}. RULE: Additional intake of student is permitted if the course code or component (Assignment vs Practical) is different.`,
    };
  }

  return { valid: true };
}

/**
 * Cascading Update Engine
 * Applies full cascading update across Intakes, Course Evaluations, Receipts, and Submissions.
 */
export interface CascadingUpdateInput {
  targetId: string;
  originalEnrollmentNo: string;
  enrollmentNo: string;
  studentName: string;
  studentPhone?: string;
  studentEmail?: string;
  programmeCode: string;
  courseCodes: string[];
  session: string;
  submissionDate?: string;
  submissionMode?: string;
  consignmentNo?: string;
  remarks?: string;
}

export interface CascadingUpdateResult {
  updatedIntake: IntakeRecord;
  updatedEvaluations: CourseEvaluationRecord[];
  updatedReceipts: RegistrationReceipt[];
  updatedSubmissions: AssignmentSubmission[];
}

export function applyCascadingUpdate(
  input: CascadingUpdateInput,
  currentState: {
    intakes: IntakeRecord[];
    courseEvaluations: CourseEvaluationRecord[];
    registrationReceipts: RegistrationReceipt[];
    assignmentSubmissions: AssignmentSubmission[];
  }
): CascadingUpdateResult {
  const cleanNewEnr = normEnrollment(input.enrollmentNo);
  const cleanOrigEnr = normEnrollment(input.originalEnrollmentNo) || cleanNewEnr;
  const cleanProg = normCode(input.programmeCode);
  const cleanCourses = Array.from(new Set(input.courseCodes.map(normCode).filter(Boolean)));
  const cleanName = input.studentName.trim();
  const cleanContact = input.studentPhone?.trim() || '';
  const cleanEmail = input.studentEmail?.trim() || '';
  const resolvedDate = input.submissionDate ? input.submissionDate.trim() : new Date().toISOString().split('T')[0];

  const targetIntake = currentState.intakes.find((i) => i.id === input.targetId);
  const targetToken = targetIntake?.tokenNo || `SC2033-${input.session.substring(0, 3).toUpperCase()}-MOD`;

  // 1. Update Intake Master record
  const newMarks: Record<string, number | null> = {};
  cleanCourses.forEach((c) => {
    newMarks[c] = targetIntake?.marks?.[c] ?? null;
  });
  const hasMarks = cleanCourses.some((c) => newMarks[c] !== null && newMarks[c] !== undefined);
  const allMarks = cleanCourses.length > 0 && cleanCourses.every((c) => newMarks[c] !== null && newMarks[c] !== undefined);
  const newStatus = allMarks ? 'Evaluated' : hasMarks ? 'Under Evaluation' : (targetIntake?.status || 'Received');

  const updatedIntake: IntakeRecord = {
    ...(targetIntake || {
      id: input.targetId,
      session: input.session,
      tokenNo: targetToken,
      registeredBy: 'Desk Official',
    }),
    id: input.targetId,
    enrollmentNo: cleanNewEnr,
    studentName: cleanName,
    studentPhone: cleanContact,
    studentEmail: cleanEmail,
    programmeCode: cleanProg,
    courseCodes: cleanCourses,
    submissionDate: resolvedDate,
    receiptDate: resolvedDate,
    Submission_Date: resolvedDate,
    Timestamp: `${resolvedDate}T10:00:00.000Z`,
    timestamp: `${resolvedDate}T10:00:00.000Z`,
    createdAt: `${resolvedDate}T10:00:00.000Z`,
    marks: newMarks,
    status: newStatus,
    submissionMode: (input.submissionMode as any) || targetIntake?.submissionMode || 'In-Person (Desk)',
    consignmentNo: input.consignmentNo ?? targetIntake?.consignmentNo,
    remarks: input.remarks ?? targetIntake?.remarks,
  };

  // 2. Cascading update on Course Ledger (Course Evaluations)
  // Identify rows tied strictly to this intake
  const otherEvals = currentState.courseEvaluations.filter(
    (e) => !(e.intakeId === input.targetId || (e.tokenNo && e.tokenNo === targetToken))
  );

  const existingTiedEvals = currentState.courseEvaluations.filter(
    (e) => e.intakeId === input.targetId || (e.tokenNo && e.tokenNo === targetToken)
  );

  // Update existing kept courses
  const keptEvals = existingTiedEvals
    .filter((e) => cleanCourses.includes(normCode(e.courseCode)))
    .map((e) => {
      const code = normCode(e.courseCode);
      const subId = `SUB_${cleanNewEnr}_${code}_${input.session.replace(/\s+/g, '').toUpperCase()}`;
      return {
        ...e,
        Sub_ID: subId,
        subId,
        submissionKey: subId,
        Session: input.session,
        session: input.session,
        Enrollment_No: cleanNewEnr,
        enrollmentNo: cleanNewEnr,
        Candidate_Name: cleanName,
        studentName: cleanName,
        Contact_No: cleanContact,
        studentPhone: cleanContact,
        Email_ID: cleanEmail,
        studentEmail: cleanEmail,
        Programme_Code: cleanProg,
        programmeCode: cleanProg,
        Programme: cleanProg,
        submissionDate: resolvedDate,
        receiptDate: resolvedDate,
        Submission_Date: resolvedDate,
        receivedDate: resolvedDate,
        intakeDate: resolvedDate,
        updatedAt: new Date().toISOString(),
      };
    });

  // Create new rows for newly added courses
  const existingCodes = keptEvals.map((e) => normCode(e.courseCode));
  const newCodes = cleanCourses.filter((c) => !existingCodes.includes(c));
  const newEvals: CourseEvaluationRecord[] = newCodes.map((c) => {
    const subId = `SUB_${cleanNewEnr}_${c}_${input.session.replace(/\s+/g, '').toUpperCase()}`;
    return {
      Sub_ID: subId,
      subId,
      submissionKey: subId,
      Session: input.session,
      session: input.session,
      Enrollment_No: cleanNewEnr,
      enrollmentNo: cleanNewEnr,
      Candidate_Name: cleanName,
      studentName: cleanName,
      Contact_No: cleanContact,
      studentPhone: cleanContact,
      Email_ID: cleanEmail,
      studentEmail: cleanEmail,
      Programme_Code: cleanProg,
      programmeCode: cleanProg,
      Programme: cleanProg,
      Course_Code: c,
      courseCode: c,
      Course_Title: `${cleanProg} Course ${c}`,
      courseTitle: `${cleanProg} Course ${c}`,
      Allotted_Evaluator: '',
      Marks: null,
      Grade: '—',
      Status: 'Pending Allotment',
      id: subId,
      intakeId: input.targetId,
      tokenNo: targetToken,
      submissionDate: resolvedDate,
      receiptDate: resolvedDate,
      Submission_Date: resolvedDate,
      receivedDate: resolvedDate,
      intakeDate: resolvedDate,
      submissionMode: (input.submissionMode as any) || 'In-Person (Desk)',
      consignmentNo: input.consignmentNo || null,
      evaluatorId: null,
      evaluatorCode: null,
      evaluatorName: null,
      allottedDate: null,
      allottedBy: null,
      marks: null,
      grade: null,
      gradeLabel: null,
      isLocked: false,
      lockedAt: null,
      lockedBy: null,
      status: 'Pending Allotment',
      updatedAt: new Date().toISOString(),
      remarks: input.remarks,
    };
  });

  const updatedEvaluations = [...otherEvals, ...keptEvals, ...newEvals];

  // 3. Cascading update on Registration Receipts
  const updatedReceipts = currentState.registrationReceipts.map((rcpt) => {
    const isTied =
      rcpt.id === input.targetId ||
      (rcpt as any).intakeId === input.targetId ||
      rcpt.receiptNumber === targetToken ||
      (rcpt as any).tokenNo === targetToken;

    if (isTied) {
      return {
        ...rcpt,
        studentId: cleanNewEnr,
        studentName: cleanName,
        studentPhone: cleanContact,
        studentEmail: cleanEmail || undefined,
        programmeCode: cleanProg,
        registeredCourses: cleanCourses,
        submissionDate: resolvedDate,
        receiptDate: resolvedDate,
        Submission_Date: resolvedDate,
        issuedAt: resolvedDate ? `${resolvedDate}T10:00:00.000Z` : rcpt.issuedAt,
      };
    }
    return rcpt;
  });

  // 4. Cascading update on Assignment Submissions
  const updatedSubmissions = currentState.assignmentSubmissions.map((sub) => {
    const isTied =
      (normEnrollment(sub.studentId) === cleanOrigEnr || normEnrollment(sub.studentId) === cleanNewEnr) &&
      cleanCourses.includes(normCode(sub.courseCode));

    if (isTied) {
      return {
        ...sub,
        studentId: cleanNewEnr,
        studentName: cleanName,
        programmeCode: cleanProg,
        submissionDate: resolvedDate,
        updatedAt: new Date().toISOString(),
      };
    }
    return sub;
  });

  return {
    updatedIntake,
    updatedEvaluations,
    updatedReceipts,
    updatedSubmissions,
  };
}

/**
 * Cascading Deletion Engine
 * Completely removes the intake and cleans up any dependent or mirrored data tied specifically to that unique intake transaction.
 */
export interface CascadingDeletionResult {
  deletedIntakeId: string;
  deletedTokenNo: string;
  deletedEnrollmentNo: string;
  updatedIntakes: IntakeRecord[];
  updatedEvaluations: CourseEvaluationRecord[];
  updatedReceipts: RegistrationReceipt[];
  updatedSubmissions: AssignmentSubmission[];
}

export function applyCascadingDeletion(
  intakeId: string,
  currentState: {
    intakes: IntakeRecord[];
    courseEvaluations: CourseEvaluationRecord[];
    registrationReceipts: RegistrationReceipt[];
    assignmentSubmissions: AssignmentSubmission[];
  }
): CascadingDeletionResult {
  const target = currentState.intakes.find((i) => i.id === intakeId);
  const targetToken = target?.tokenNo || '';
  const cleanEnr = target ? normEnrollment(target.enrollmentNo) : '';
  const targetCourses = (target?.courseCodes || []).map(normCode);

  // 1. Remove from Intakes
  const updatedIntakes = currentState.intakes.filter((i) => i.id !== intakeId);

  // 2. Remove Course Evaluations tied specifically to this intake
  const updatedEvaluations = currentState.courseEvaluations.filter((ce) => {
    const isTied =
      ce.intakeId === intakeId ||
      (targetToken && ce.tokenNo === targetToken) ||
      (!ce.intakeId && normEnrollment(ce.enrollmentNo) === cleanEnr && targetCourses.includes(normCode(ce.courseCode)));
    return !isTied;
  });

  // 3. Remove Registration Receipt tied to this intake
  const updatedReceipts = currentState.registrationReceipts.filter((rcpt) => {
    const isTied =
      rcpt.id === intakeId ||
      (rcpt as any).intakeId === intakeId ||
      (targetToken && (rcpt.receiptNumber === targetToken || (rcpt as any).tokenNo === targetToken));
    return !isTied;
  });

  // 4. Remove Assignment Submissions tied to this intake transaction
  const updatedSubmissions = currentState.assignmentSubmissions.filter((sub) => {
    const isTied =
      normEnrollment(sub.studentId) === cleanEnr &&
      targetCourses.includes(normCode(sub.courseCode));
    return !isTied;
  });

  return {
    deletedIntakeId: intakeId,
    deletedTokenNo: targetToken,
    deletedEnrollmentNo: cleanEnr,
    updatedIntakes,
    updatedEvaluations,
    updatedReceipts,
    updatedSubmissions,
  };
}
