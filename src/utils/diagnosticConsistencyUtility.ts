/**
 * Diagnostic Utility: CourseLedger & Intake_Register Consistency Verifier
 * IGNOU SC-2033 Assignment Operations
 * 
 * Verifies relational integrity and data parity between Intake_Register and CourseLedger.
 * Identifies missing scripts, orphan records, key mismatches, and specifically highlights
 * discrepancies in the Assigned Evaluator column.
 */

import {
  IntakeRecord,
  CourseEvaluationRecord,
  Evaluator,
  CoursePacket,
  DiagnosticConsistencyReport,
  DiagnosticDiscrepancyItem,
} from '../types';

/**
 * Normalizes enrollment numbers by stripping leading apostrophes/quotes, spaces, and punctuation.
 */
export function normalizeDiagnosticEnrollment(enr: string | null | undefined): string {
  if (!enr) return '';
  return String(enr).trim().replace(/^['"]+/, '').replace(/\s+/g, '').toUpperCase();
}

/**
 * Normalizes course codes handling hyphenation, spacing, and zero-padding (e.g. 'MPS-001' <-> 'MPS-1').
 */
export function normalizeDiagnosticCourse(course: string | null | undefined): string {
  if (!course) return '';
  const clean = String(course).trim().toUpperCase().replace(/\s+/g, '-');
  // Match prefix and numbers, e.g. MPS-001 -> MPS-1 or BCOC-131
  const match = clean.match(/^([A-Z]+)[-_]?0*(\d+)$/i);
  if (match) {
    return `${match[1]}-${parseInt(match[2], 10)}`;
  }
  return clean.replace(/_/g, '-');
}

/**
 * Normalizes session names handling ISO dates, timestamps, and terms.
 */
export function normalizeDiagnosticSession(sess: string | null | undefined): string {
  if (!sess) return '';
  const str = String(sess).trim();
  // Check ISO string like '2026-06-30T18:30:00.000Z'
  if (str.includes('T') || str.includes('Z')) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const month = d.getUTCMonth(); // 0-11
      const year = d.getUTCFullYear();
      if (month >= 5 && month <= 7) return `July ${year}`;
      if (month <= 1 || month === 11) return `January ${month === 11 ? year + 1 : year}`;
    }
  }
  // Standardize 'July 2026', 'July2026', 'JUL26'
  const clean = str.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (clean.includes('JUL') || clean.includes('JULY')) {
    const yr = clean.match(/\d+/)?.[0] || '2026';
    const fullYr = yr.length === 2 ? `20${yr}` : yr;
    return `July ${fullYr}`;
  }
  if (clean.includes('JAN') || clean.includes('JANUARY')) {
    const yr = clean.match(/\d+/)?.[0] || '2026';
    const fullYr = yr.length === 2 ? `20${yr}` : yr;
    return `January ${fullYr}`;
  }
  return str;
}

/**
 * Builds canonical uppercase assignmentId format: SUB_ENR_COURSE_TERM
 */
export function buildDiagnosticAssignmentId(enr: string, course: string, session: string): string {
  const normEnr = normalizeDiagnosticEnrollment(enr);
  const normCourse = normalizeDiagnosticCourse(course);
  const sessClean = session.replace(/\s+/g, '');
  return `SUB_${normEnr}_${normCourse}_${sessClean}`;
}

export interface VerifyConsistencyParams {
  intakes: IntakeRecord[];
  courseEvaluations: CourseEvaluationRecord[];
  evaluators?: Evaluator[];
  packets?: CoursePacket[];
  targetSession?: string; // Optional session filter (e.g. 'July 2026')
}

/**
 * Primary Diagnostic Function:
 * Analyzes consistency between Intake_Register and CourseLedger, highlighting
 * assignmentId gaps and evaluator column discrepancies.
 */
export function verifyCourseLedgerIntakeConsistency({
  intakes,
  courseEvaluations,
  evaluators = [],
  packets = [],
  targetSession,
}: VerifyConsistencyParams): DiagnosticConsistencyReport {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  // Filter by session if specified
  const filteredIntakes = targetSession
    ? intakes.filter((i) => normalizeDiagnosticSession(i.session) === normalizeDiagnosticSession(targetSession))
    : intakes;

  const filteredEvaluations = targetSession
    ? courseEvaluations.filter(
        (e) => normalizeDiagnosticSession(e.session || (e as any).Session) === normalizeDiagnosticSession(targetSession)
      )
    : courseEvaluations;

  // Build lookups for Evaluators
  const evaluatorById = new Map<string, Evaluator>();
  const evaluatorByCode = new Map<string, Evaluator>();
  const evaluatorByName = new Map<string, Evaluator>();

  evaluators.forEach((ev) => {
    evaluatorById.set(ev.id, ev);
    if (ev.evaluatorCode) evaluatorByCode.set(ev.evaluatorCode.toUpperCase(), ev);
    const n = (ev.evaluatorName || ev.name || '').trim().toLowerCase();
    if (n) evaluatorByName.set(n, ev);
  });

  // Build packet allotment map by courseCode -> enrollment -> packet
  const packetByEnrCourse = new Map<string, CoursePacket>();
  packets.forEach((pkt) => {
    const pktCourse = normalizeDiagnosticCourse(pkt.courseCode);
    const pktSess = normalizeDiagnosticSession(pkt.session);
    (pkt.assignedEnrollments || []).forEach((rawEnr) => {
      const enr = normalizeDiagnosticEnrollment(rawEnr);
      packetByEnrCourse.set(`${enr}_${pktCourse}_${pktSess}`, pkt);
      packetByEnrCourse.set(`${enr}_${pktCourse}`, pkt);
    });
  });

  // Build indexed map of CourseLedger records
  // Support multi-tier matching: by exact Sub_ID/id, stripped alphanumeric key, and (enr + course + sess)
  const evalById = new Map<string, CourseEvaluationRecord>();
  const evalByStripKey = new Map<string, CourseEvaluationRecord>();
  const evalByEnrCourse = new Map<string, CourseEvaluationRecord>();
  const allLedgerEnrCoursePairs = new Set<string>();

  filteredEvaluations.forEach((rec) => {
    const rawId = rec.id || rec.subId || rec.submissionKey || (rec as any).Sub_ID;
    if (rawId) {
      evalById.set(rawId, rec);
      evalByStripKey.set(String(rawId).replace(/[^A-Za-z0-9]/g, '').toUpperCase(), rec);
    }

    const enr = normalizeDiagnosticEnrollment(rec.enrollmentNo || rec.Enrollment_No);
    const course = normalizeDiagnosticCourse(rec.courseCode || rec.Course_Code);
    const sess = normalizeDiagnosticSession(rec.session || rec.Session);

    if (enr && course) {
      const tripleKey = `${enr}_${course}_${sess}`;
      const doubleKey = `${enr}_${course}`;
      evalByEnrCourse.set(tripleKey, rec);
      if (!evalByEnrCourse.has(doubleKey)) {
        evalByEnrCourse.set(doubleKey, rec);
      }
      allLedgerEnrCoursePairs.add(tripleKey);
      allLedgerEnrCoursePairs.add(doubleKey);
    }
  });

  const discrepancies: DiagnosticDiscrepancyItem[] = [];
  const expectedScriptKeys = new Set<string>();
  let expectedScriptsFromIntakes = 0;
  let matchedScriptsCount = 0;
  let allottedEvaluatorsCount = 0;
  let unallottedEvaluatorsCount = 0;

  // 1. Audit Intake_Register -> verify existence and evaluator status in CourseLedger
  filteredIntakes.forEach((intake) => {
    const enr = normalizeDiagnosticEnrollment(intake.enrollmentNo);
    const candName = intake.studentName || (intake as any).candidateName || 'Unknown Student';
    const sess = normalizeDiagnosticSession(intake.session || targetSession || 'July 2026');
    const rawCourses = (intake as any).courses || intake.courseCodes || [];
    const courseList: string[] = (
      Array.isArray(rawCourses)
        ? rawCourses.flatMap((c: any) => String(c).split(','))
        : String(rawCourses).split(',')
    )
      .map((c) => c.trim())
      .filter(Boolean);

    courseList.forEach((rawCourse) => {
      expectedScriptsFromIntakes++;
      const normCourse = normalizeDiagnosticCourse(rawCourse);
      const canonicalKey = buildDiagnosticAssignmentId(enr, normCourse, sess);
      const tripleKey = `${enr}_${normCourse}_${sess}`;
      const doubleKey = `${enr}_${normCourse}`;
      expectedScriptKeys.add(tripleKey);
      expectedScriptKeys.add(doubleKey);

      // Attempt matching in CourseLedger
      const matchedRecord =
        evalById.get(canonicalKey) ||
        evalByStripKey.get(canonicalKey.replace(/[^A-Za-z0-9]/g, '').toUpperCase()) ||
        evalByEnrCourse.get(tripleKey) ||
        evalByEnrCourse.get(doubleKey);

      if (!matchedRecord) {
        // DISCREPANCY: Assignment exists in Intake_Register but missing in CourseLedger
        discrepancies.push({
          id: `disc-missing-${enr}-${normCourse}-${Date.now()}`,
          assignmentId: canonicalKey,
          enrollmentNo: enr,
          candidateName: candName,
          courseCode: normCourse,
          session: sess,
          tokenNo: intake.tokenNo,
          discrepancyType: 'MISSING_IN_COURSE_LEDGER',
          severity: 'error',
          courseLedgerEvaluator: undefined,
          expectedEvaluator: 'Pending Allotment',
          statusInIntake: intake.status || 'Received',
          statusInLedger: 'MISSING',
          details: `Course script ${normCourse} is registered in Intake ${intake.tokenNo} for ${candName} (${enr}), but has no corresponding record in CourseLedger.`,
          suggestedFix: `Auto-inject script ${normCourse} into CourseLedger for student ${enr}.`,
        });
      } else {
        matchedScriptsCount++;

        // Specifically check the Assigned Evaluator column
        const ledgerEvalDisplay = (
          matchedRecord.Allotted_Evaluator ||
          matchedRecord.allottedEvaluator ||
          matchedRecord.evaluatorName ||
          ''
        ).trim();

        const ledgerEvalId = (matchedRecord.evaluatorId || '').trim();
        const ledgerEvalCode = (matchedRecord.evaluatorCode || '').trim();

        // Check if an associated packet allotting an evaluator exists
        const associatedPacket =
          packetByEnrCourse.get(tripleKey) || packetByEnrCourse.get(doubleKey);

        const packetEvalObj = associatedPacket?.evaluatorId
          ? evaluatorById.get(associatedPacket.evaluatorId) ||
            evaluatorByCode.get(associatedPacket.evaluatorId.toUpperCase())
          : null;

        const hasLedgerEvaluator =
          ledgerEvalDisplay !== '' &&
          ledgerEvalDisplay !== 'Unallotted' &&
          ledgerEvalDisplay !== '-- Select Academic Counsellor --';

        if (hasLedgerEvaluator) {
          allottedEvaluatorsCount++;
        } else {
          unallottedEvaluatorsCount++;
        }

        // EVALUATOR DISCREPANCY SCENARIO 1:
        // Evaluator is allotted in Packet Dispatch, but CourseLedger evaluator column is empty or unallotted
        if (packetEvalObj && !hasLedgerEvaluator) {
          const expectedName = `${packetEvalObj.evaluatorName || packetEvalObj.name} (${packetEvalObj.evaluatorCode})`;
          discrepancies.push({
            id: `disc-eval-packet-missing-${matchedRecord.id}`,
            assignmentId: matchedRecord.id || canonicalKey,
            subId: matchedRecord.subId || (matchedRecord as any).Sub_ID,
            enrollmentNo: enr,
            candidateName: candName,
            courseCode: normCourse,
            session: sess,
            tokenNo: intake.tokenNo,
            discrepancyType: 'EVALUATOR_DISCREPANCY',
            severity: 'error',
            courseLedgerEvaluator: ledgerEvalDisplay || 'Unallotted',
            expectedEvaluator: expectedName,
            statusInLedger: matchedRecord.status,
            details: `Script is bundled in Packet ${associatedPacket.packetNumber} with evaluator ${expectedName}, but CourseLedger has '${ledgerEvalDisplay || 'Unallotted'}'.`,
            suggestedFix: `Update CourseLedger Allotted_Evaluator to '${expectedName}' and sync to Google Sheets.`,
          });
        }
        // EVALUATOR DISCREPANCY SCENARIO 2:
        // Evaluator ID is stored, but Allotted_Evaluator string is blank or 'Unallotted'
        else if (ledgerEvalId && (!ledgerEvalDisplay || ledgerEvalDisplay === 'Unallotted')) {
          const resolvedEv = evaluatorById.get(ledgerEvalId);
          const expectedName = resolvedEv
            ? `${resolvedEv.evaluatorName || resolvedEv.name} (${resolvedEv.evaluatorCode})`
            : ledgerEvalId;

          discrepancies.push({
            id: `disc-eval-id-nostring-${matchedRecord.id}`,
            assignmentId: matchedRecord.id || canonicalKey,
            subId: matchedRecord.subId || (matchedRecord as any).Sub_ID,
            enrollmentNo: enr,
            candidateName: candName,
            courseCode: normCourse,
            session: sess,
            tokenNo: intake.tokenNo,
            discrepancyType: 'EVALUATOR_DISCREPANCY',
            severity: 'warning',
            courseLedgerEvaluator: ledgerEvalDisplay || 'Unallotted',
            expectedEvaluator: expectedName,
            statusInLedger: matchedRecord.status,
            details: `Record has evaluatorId '${ledgerEvalId}', but CourseLedger Allotted_Evaluator display column is '${ledgerEvalDisplay || 'Unallotted'}'.`,
            suggestedFix: `Populate Allotted_Evaluator with '${expectedName}'.`,
          });
        }
        // EVALUATOR DISCREPANCY SCENARIO 3:
        // Allotted_Evaluator has a name, but evaluatorId or evaluatorCode is missing
        else if (hasLedgerEvaluator && (!ledgerEvalId || !ledgerEvalCode)) {
          const matchedEv =
            evaluatorByName.get(ledgerEvalDisplay.toLowerCase()) ||
            Array.from(evaluatorById.values()).find(
              (ev) =>
                ledgerEvalDisplay.includes(ev.evaluatorCode) ||
                ledgerEvalDisplay.toLowerCase().includes((ev.evaluatorName || ev.name).toLowerCase())
            );

          if (!matchedEv) {
            discrepancies.push({
              id: `disc-eval-unknown-${matchedRecord.id}`,
              assignmentId: matchedRecord.id || canonicalKey,
              subId: matchedRecord.subId || (matchedRecord as any).Sub_ID,
              enrollmentNo: enr,
              candidateName: candName,
              courseCode: normCourse,
              session: sess,
              tokenNo: intake.tokenNo,
              discrepancyType: 'EVALUATOR_DISCREPANCY',
              severity: 'warning',
              courseLedgerEvaluator: ledgerEvalDisplay,
              expectedEvaluator: 'Empanelled Evaluator Code',
              statusInLedger: matchedRecord.status,
              details: `Allotted_Evaluator is set to '${ledgerEvalDisplay}', but does not link to a known evaluator in Evaluators_Master.`,
              suggestedFix: `Map evaluator '${ledgerEvalDisplay}' to an official Evaluator Code in Evaluators_Master.`,
            });
          }
        }
      }
    });
  });

  // 2. Audit CourseLedger -> check for orphan records that have no matching Intake
  filteredEvaluations.forEach((rec) => {
    const enr = normalizeDiagnosticEnrollment(rec.enrollmentNo || rec.Enrollment_No);
    const course = normalizeDiagnosticCourse(rec.courseCode || rec.Course_Code);
    const sess = normalizeDiagnosticSession(rec.session || rec.Session);
    const tripleKey = `${enr}_${course}_${sess}`;
    const doubleKey = `${enr}_${course}`;

    if (!expectedScriptKeys.has(tripleKey) && !expectedScriptKeys.has(doubleKey)) {
      // DISCREPANCY: Script in CourseLedger without an Intake_Register entry
      const evalDisplay = (
        rec.Allotted_Evaluator ||
        rec.allottedEvaluator ||
        rec.evaluatorName ||
        'Unallotted'
      ).trim();

      discrepancies.push({
        id: `disc-orphan-${rec.id || enr + '-' + course}`,
        assignmentId: rec.id || buildDiagnosticAssignmentId(enr, course, sess),
        subId: rec.subId || (rec as any).Sub_ID,
        enrollmentNo: enr,
        candidateName: rec.studentName || rec.candidateName || 'Unknown Student',
        courseCode: course,
        session: sess,
        tokenNo: rec.tokenNo,
        discrepancyType: 'ORPHAN_IN_COURSE_LEDGER',
        severity: 'warning',
        courseLedgerEvaluator: evalDisplay,
        expectedEvaluator: undefined,
        statusInLedger: rec.status,
        details: `Course script ${course} for student ${enr} exists in CourseLedger, but does not match any Intake_Register record.`,
        suggestedFix: `Verify student admission or create an Intake receipt to reconcile.`,
      });
    }
  });

  const missingInLedgerCount = discrepancies.filter((d) => d.discrepancyType === 'MISSING_IN_COURSE_LEDGER').length;
  const orphanInLedgerCount = discrepancies.filter((d) => d.discrepancyType === 'ORPHAN_IN_COURSE_LEDGER').length;
  const evaluatorDiscrepanciesCount = discrepancies.filter((d) => d.discrepancyType === 'EVALUATOR_DISCREPANCY').length;

  const durationMs = Date.now() - startTime;
  const isConsistent = discrepancies.length === 0;

  let summary = '';
  if (isConsistent) {
    summary = `Parity verified: All ${expectedScriptsFromIntakes} expected scripts from ${filteredIntakes.length} intakes are consistent with CourseLedger. No evaluator discrepancies detected.`;
  } else {
    summary = `Consistency audit identified ${discrepancies.length} discrepancy(ies): ${evaluatorDiscrepanciesCount} evaluator discrepancy(ies), ${missingInLedgerCount} missing in CourseLedger, and ${orphanInLedgerCount} orphan scripts.`;
  }

  // Developer Console Logging
  console.groupCollapsed(
    `%c[DiagnosticConsistency] Audit Complete: ${isConsistent ? '100% Consistent' : `${discrepancies.length} Discrepancies Found`}`,
    isConsistent ? 'color: #10b981; font-weight: bold;' : 'color: #ef4444; font-weight: bold;'
  );
  console.log('Execution Time:', `${durationMs}ms`);
  console.log('Summary:', summary);
  console.log('Metrics:', {
    totalIntakesChecked: filteredIntakes.length,
    expectedScriptsFromIntakes,
    totalCourseLedgerScripts: filteredEvaluations.length,
    matchedScriptsCount,
    missingInLedgerCount,
    orphanInLedgerCount,
    evaluatorDiscrepanciesCount,
    allottedEvaluatorsCount,
    unallottedEvaluatorsCount,
  });
  if (discrepancies.length > 0) {
    console.table(
      discrepancies.map((d) => ({
        Type: d.discrepancyType,
        Assignment_ID: d.assignmentId,
        Enrollment: d.enrollmentNo,
        Course: d.courseCode,
        Ledger_Evaluator: d.courseLedgerEvaluator,
        Expected_Evaluator: d.expectedEvaluator,
        Details: d.details,
      }))
    );
  }
  console.groupEnd();

  return {
    timestamp,
    totalIntakesChecked: filteredIntakes.length,
    expectedScriptsFromIntakes,
    totalCourseLedgerScripts: filteredEvaluations.length,
    matchedScriptsCount,
    missingInLedgerCount,
    orphanInLedgerCount,
    evaluatorDiscrepanciesCount,
    allottedEvaluatorsCount,
    unallottedEvaluatorsCount,
    discrepancies,
    summary,
    isConsistent,
  };
}

/**
 * Exports the diagnostic audit report as formatted JSON.
 */
export function exportDiagnosticReportJSON(report: DiagnosticConsistencyReport): void {
  const jsonStr = JSON.stringify(report, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const dateStr = new Date().toISOString().split('T')[0];
  a.download = `IGNOU_SC2033_DIAGNOSTIC_CONSISTENCY_REPORT_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Exports the diagnostic discrepancy table as CSV.
 */
export function exportDiagnosticReportCSV(report: DiagnosticConsistencyReport): void {
  const headers = [
    'Discrepancy_Type',
    'Severity',
    'Assignment_ID',
    'Enrollment_No',
    'Candidate_Name',
    'Course_Code',
    'Session',
    'Token_No',
    'Course_Ledger_Evaluator',
    'Expected_Evaluator',
    'Status_In_Ledger',
    'Details',
    'Suggested_Fix',
  ];

  const rows = report.discrepancies.map((d) => [
    `"${d.discrepancyType}"`,
    `"${d.severity}"`,
    `"${d.assignmentId}"`,
    `"${d.enrollmentNo}"`,
    `"${(d.candidateName || '').replace(/"/g, '""')}"`,
    `"${d.courseCode}"`,
    `"${d.session}"`,
    `"${d.tokenNo || ''}"`,
    `"${(d.courseLedgerEvaluator || '').replace(/"/g, '""')}"`,
    `"${(d.expectedEvaluator || '').replace(/"/g, '""')}"`,
    `"${d.statusInLedger || ''}"`,
    `"${(d.details || '').replace(/"/g, '""')}"`,
    `"${(d.suggestedFix || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const dateStr = new Date().toISOString().split('T')[0];
  a.download = `IGNOU_SC2033_DISCREPANCIES_${dateStr}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
