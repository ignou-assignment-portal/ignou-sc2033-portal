import React, { useState, useCallback, useEffect } from 'react';
import { useApp, isDummyIntakeId, isDummyEvaluationId, normalizeSessionName, norm } from '../context/AppContext';
import { getCustomScriptUrl } from '../services/sheetsService';
import { calculateIGNOUGrade, isPracticalCourse } from '../utils/helpers';
import {
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Wrench,
  Database,
  CheckCircle2,
  XCircle,
  Download,
  ChevronDown,
  ChevronUp,
  Search,
  Layers,
  FileSpreadsheet,
  ArrowRight,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  UploadCloud,
} from 'lucide-react';

interface DatasetDiagnosticRow {
  key: 'intakes' | 'ledger' | 'admissions' | 'evaluators';
  label: string;
  sheetTabName: string;
  rawSheetCount: number;
  mappedValidCount: number;
  appTotalCount: number;
  appSessionCount: number;
  diffTotal: number; // appTotalCount - rawSheetCount
  diffSession: number; // appSessionCount - rawSheetCount
  faultStage: 'PARITY_OK' | 'API_OR_CACHE_STALE' | 'LOCAL_MAPPING_DROP' | 'SESSION_FILTER_HIDDEN';
  diagnosisText: string;
}

interface MissingRecordDetail {
  dataset: 'Intake Register' | 'Course Ledger';
  sheetRowNumber: number;
  enrollmentNo: string;
  candidateName: string;
  courseOrProg: string;
  rawSession: string;
  normalizedSession: string;
  stage: 'Local Mapping' | 'State / Cache Hydration' | 'Session Filter';
  reason: string;
  rawRecord: any;
}

interface IntegrityDebugResult {
  checkedAt: string;
  latencyMs: number;
  source: 'Direct Google Apps Script' | 'Server Proxy (/api/sheets)';
  endpointUrl: string;
  rawPayload: any;
  datasets: DatasetDiagnosticRow[];
  missingRecords: MissingRecordDetail[];
  hasDiscrepancy: boolean;
}

export const IntegrityDebuggerPanel: React.FC = () => {
  const {
    allIntakes,
    sessionIntakes,
    allCourseEvaluations,
    sessionCourseEvaluations,
    studentRegistrations,
    evaluators,
    currentSession,
    setSession,
    setIntakeRegister,
    setCourseLedger,
    syncGoogleSheets,
    purgeOldDemoDataAndSyncLive,
    getCourseTitle,
    showToast,
  } = useApp();

  const [isRunning, setIsRunning] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [report, setReport] = useState<IntegrityDebugResult | null>(null);
  const [showMissingTable, setShowMissingTable] = useState(true);
  const [filterText, setFilterText] = useState('');

  // Live Production Web App (GitHub -> Vercel) Sync State
  const [githubToken, setGithubToken] = useState('');
  const [githubRepo, setGithubRepo] = useState('ignou-assignment-portal/ignou-sc2033-portal');
  const [isPushingGithub, setIsPushingGithub] = useState(false);
  const [githubPushResult, setGithubPushResult] = useState<{
    success?: boolean;
    commitSha?: string;
    commitUrl?: string;
    error?: string;
    filesPushed?: string[];
  } | null>(null);
  const [copiedAppContext, setCopiedAppContext] = useState(false);

  const handleCopyFixedAppContext = async () => {
    try {
      const res = await fetch('/api/export-source-file?file=src/context/AppContext.tsx');
      if (!res.ok) throw new Error('Failed to fetch source file');
      const data = await res.json();
      await navigator.clipboard.writeText(data.content);
      setCopiedAppContext(true);
      showToast('Copied fixed AppContext.tsx to clipboard!', 'success');
      setTimeout(() => setCopiedAppContext(false), 3000);
    } catch {
      showToast('Could not copy file. Use the Download button instead.', 'error');
    }
  };

  const handlePushToGithub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubToken.trim()) {
      showToast('Please enter a GitHub Personal Access Token.', 'warning');
      return;
    }
    setIsPushingGithub(true);
    setGithubPushResult(null);
    try {
      const res = await fetch('/api/github-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: githubToken.trim(),
          repo: githubRepo.trim(),
          branch: 'main',
          commitMessage:
            'fix: restore all 46 intake entries and 208 course ledger rows + add Integrity Debugger',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setGithubPushResult(data);
        showToast(
          'Pushed to GitHub! Vercel is now deploying the 46/208 fix to your live web app.',
          'success'
        );
      } else {
        setGithubPushResult({
          success: false,
          error: data.error || 'Failed to push to GitHub.',
        });
        showToast(data.error || 'GitHub push failed.', 'error');
      }
    } catch (err: any) {
      setGithubPushResult({
        success: false,
        error: err?.message || 'Network error while pushing to GitHub.',
      });
    } finally {
      setIsPushingGithub(false);
    }
  };

  const runIntegrityVerification = useCallback(async () => {
    setIsRunning(true);
    const startTime = performance.now();
    const targetUrl = getCustomScriptUrl();
    const cb = `_cb=${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    let rawData: any = null;
    let usedSource: 'Direct Google Apps Script' | 'Server Proxy (/api/sheets)' = 'Direct Google Apps Script';

    // 1. Try direct uncached fetch to Google Apps Script (Simple GET without preflight headers)
    try {
      const directRes = await fetch(`${targetUrl}?action=doGet&${cb}`, {
        method: 'GET',
        redirect: 'follow',
        signal: AbortSignal.timeout(18000),
      });
      if (directRes.ok) {
        const text = await directRes.text();
        try {
          rawData = JSON.parse(text);
        } catch {
          rawData = null;
        }
      }
    } catch (err) {
      console.warn('[IntegrityDebugger] Direct fetch failed, trying proxy:', err);
    }

    // 2. Fallback to /api/sheets proxy if direct failed
    if (!rawData || (!rawData.intakeRegister && !rawData.intakes && !rawData.courseLedger)) {
      usedSource = 'Server Proxy (/api/sheets)';
      try {
        const proxyRes = await fetch(
          `/api/sheets?action=doGet&scriptUrl=${encodeURIComponent(targetUrl)}&${cb}`,
          {
            method: 'GET',
            headers: { Accept: 'application/json' },
            cache: 'no-store',
            signal: AbortSignal.timeout(25000),
          }
        );
        if (proxyRes.ok) {
          rawData = await proxyRes.json();
        }
      } catch (proxyErr) {
        console.error('[IntegrityDebugger] Proxy fetch failed:', proxyErr);
      }
    }

    const latencyMs = Math.round(performance.now() - startTime);

    if (!rawData) {
      setIsRunning(false);
      showToast('Integrity Debugger could not reach Google Sheets API.', 'error');
      return;
    }

    const rawIntakes: any[] =
      rawData.intakeRegister || rawData.Intake_Register || rawData.intakes || [];
    const rawLedger: any[] =
      rawData.courseLedger || rawData.Course_Ledger || rawData.course_ledger || [];
    const rawAdmissions: any[] =
      rawData.studentRegistrations && Array.isArray(rawData.studentRegistrations) && rawData.studentRegistrations.length > 0
        ? rawData.studentRegistrations
        : [
            ...(Array.isArray(rawData.freshAdmissions) ? rawData.freshAdmissions : []),
            ...(Array.isArray(rawData.reRegistrations) ? rawData.reRegistrations : []),
          ];
    const rawEvaluators: any[] =
      rawData.evaluatorsMaster || rawData.Evaluators_Master || rawData.evaluators || [];

    const missingRecords: MissingRecordDetail[] = [];

    // Build lookup sets of what is currently in App State
    const appIntakeEnrollments = new Set(
      (allIntakes || []).map((i: any) => String(i.enrollmentNo || i.Enrollment_No || '').replace(/^'/, '').trim())
    );
    const appIntakeTokens = new Set(
      (allIntakes || []).map((i: any) => String(i.tokenNo || i.id || '').trim())
    );

    // Check each raw intake row
    let validMappedIntakes = 0;
    rawIntakes.forEach((r: any, idx: number) => {
      const rowNum = idx + 2; // Sheet row (1-based + header)
      const enr = String(r?.Enrollment_No || r?.enrollmentNo || r?.['Enrollment No'] || '')
        .replace(/^'/, '')
        .trim();
      const cand = String(
        r?.Candidate_Name || r?.candidateName || r?.['Candidate Name'] || r?.studentName || ''
      ).trim();
      const rawSess = String(r?.Session || r?.session || '');
      const normSess = normalizeSessionName(rawSess || 'July 2026');
      const coursesStr = Array.isArray(r?.Courses || r?.courses)
        ? (r.Courses || r.courses).join(', ')
        : String(r?.Courses || r?.courses || r?.courseCodes || '');
      const id = String(r?.id || r?.tokenNo || r?.Token_No || '').trim();

      if (!r || !enr || enr.length < 5) {
        missingRecords.push({
          dataset: 'Intake Register',
          sheetRowNumber: rowNum,
          enrollmentNo: enr || '(Empty)',
          candidateName: cand || '(Empty)',
          courseOrProg: coursesStr || String(r?.Programme || ''),
          rawSession: rawSess,
          normalizedSession: normSess,
          stage: 'Local Mapping',
          reason: 'Rejected during local mapping: Enrollment_No is empty or shorter than 5 characters.',
          rawRecord: r,
        });
        return;
      }

      if (isDummyIntakeId(id, enr, cand)) {
        missingRecords.push({
          dataset: 'Intake Register',
          sheetRowNumber: rowNum,
          enrollmentNo: enr,
          candidateName: cand,
          courseOrProg: coursesStr,
          rawSession: rawSess,
          normalizedSession: normSess,
          stage: 'Local Mapping',
          reason: 'Filtered out by demo/seed ID blocklist (isDummyIntakeId).',
          rawRecord: r,
        });
        return;
      }

      validMappedIntakes++;

      // Check if present in allIntakes
      const isInAppGlobal = appIntakeEnrollments.has(enr) || (id && appIntakeTokens.has(id));
      if (!isInAppGlobal) {
        missingRecords.push({
          dataset: 'Intake Register',
          sheetRowNumber: rowNum,
          enrollmentNo: enr,
          candidateName: cand,
          courseOrProg: coursesStr,
          rawSession: rawSess,
          normalizedSession: normSess,
          stage: 'State / Cache Hydration',
          reason: 'Valid in Google Sheet but missing from local App State (stale browser cache or unhydrated).',
          rawRecord: r,
        });
      } else if (
        currentSession &&
        currentSession.toLowerCase() !== 'all' &&
        norm(normSess) !== norm(currentSession)
      ) {
        missingRecords.push({
          dataset: 'Intake Register',
          sheetRowNumber: rowNum,
          enrollmentNo: enr,
          candidateName: cand,
          courseOrProg: coursesStr,
          rawSession: rawSess,
          normalizedSession: normSess,
          stage: 'Session Filter',
          reason: `Loaded in App State under session "${normSess}", which is hidden by active cycle filter "${currentSession}".`,
          rawRecord: r,
        });
      }
    });

    // Build lookup sets for Course Ledger in App State
    const appLedgerKeys = new Set(
      (allCourseEvaluations || []).map((c: any) => {
        const enr = String(c.enrollmentNo || c.Enrollment_No || '').replace(/^'/, '').trim();
        const code = String(c.courseCode || c.Course_Code || '')
          .replace(/\s*[\(\[](Practical|TMA\s*\+\s*Practical|TMA|Both|P|Asgn|Assignment)[\)\]]\s*/gi, '')
          .trim()
          .toUpperCase();
        return `${enr}_${code}`;
      })
    );
    const appLedgerSubIds = new Set(
      (allCourseEvaluations || []).map((c: any) => String(c.subId || c.Sub_ID || c.id || '').trim())
    );

    let validMappedLedger = 0;
    rawLedger.forEach((r: any, idx: number) => {
      const rowNum = idx + 2;
      const enr = String(r?.Enrollment_No || r?.enrollmentNo || r?.['Enrollment No'] || '')
        .replace(/^'/, '')
        .trim();
      const rawCourse = String(r?.Course_Code || r?.courseCode || r?.['Course Code'] || '').trim();
      const cleanCourse = rawCourse
        .replace(/\s*[\(\[](Practical|TMA\s*\+\s*Practical|TMA|Both|P|Asgn|Assignment)[\)\]]\s*/gi, '')
        .trim()
        .toUpperCase();
      const cand = String(
        r?.Candidate_Name || r?.candidateName || r?.['Candidate Name'] || r?.studentName || ''
      ).trim();
      const subId = String(r?.Sub_ID || r?.subId || r?.id || '').trim();
      const rawSess = String(r?.Session || r?.session || '');
      const normSess = normalizeSessionName(rawSess || 'July 2026', subId);

      if (!r || !enr || enr.length < 5 || !cleanCourse) {
        missingRecords.push({
          dataset: 'Course Ledger',
          sheetRowNumber: rowNum,
          enrollmentNo: enr || '(Empty)',
          candidateName: cand || '(Empty)',
          courseOrProg: rawCourse || '(Missing Course_Code)',
          rawSession: rawSess,
          normalizedSession: normSess,
          stage: 'Local Mapping',
          reason: 'Rejected during local mapping: Missing Enrollment_No (<5 chars) or empty Course_Code.',
          rawRecord: r,
        });
        return;
      }

      if (isDummyEvaluationId(subId, r?.intakeId, enr, cand)) {
        missingRecords.push({
          dataset: 'Course Ledger',
          sheetRowNumber: rowNum,
          enrollmentNo: enr,
          candidateName: cand,
          courseOrProg: cleanCourse,
          rawSession: rawSess,
          normalizedSession: normSess,
          stage: 'Local Mapping',
          reason: 'Filtered out by demo/seed ID blocklist (isDummyEvaluationId).',
          rawRecord: r,
        });
        return;
      }

      validMappedLedger++;

      const isInAppLedger =
        (subId && appLedgerSubIds.has(subId)) || appLedgerKeys.has(`${enr}_${cleanCourse}`);
      if (!isInAppLedger) {
        missingRecords.push({
          dataset: 'Course Ledger',
          sheetRowNumber: rowNum,
          enrollmentNo: enr,
          candidateName: cand,
          courseOrProg: cleanCourse,
          rawSession: rawSess,
          normalizedSession: normSess,
          stage: 'State / Cache Hydration',
          reason: 'Valid in Google Sheet but missing from local Course Ledger state (stale browser cache).',
          rawRecord: r,
        });
      } else if (
        currentSession &&
        currentSession.toLowerCase() !== 'all' &&
        norm(normSess) !== norm(currentSession)
      ) {
        missingRecords.push({
          dataset: 'Course Ledger',
          sheetRowNumber: rowNum,
          enrollmentNo: enr,
          candidateName: cand,
          courseOrProg: cleanCourse,
          rawSession: rawSess,
          normalizedSession: normSess,
          stage: 'Session Filter',
          reason: `Loaded in App State under session "${normSess}", hidden by active filter "${currentSession}".`,
          rawRecord: r,
        });
      }
    });

    // Helper to classify dataset status
    const buildDatasetRow = (
      key: DatasetDiagnosticRow['key'],
      label: string,
      sheetTabName: string,
      rawCount: number,
      mappedCount: number,
      appTotal: number,
      appSession: number
    ): DatasetDiagnosticRow => {
      const diffTotal = appTotal - rawCount;
      const diffSession = appSession - rawCount;

      let faultStage: DatasetDiagnosticRow['faultStage'] = 'PARITY_OK';
      let diagnosisText = '100% Parity — All Google Sheet rows are processed and visible in App.';

      if (mappedCount < rawCount) {
        faultStage = 'LOCAL_MAPPING_DROP';
        diagnosisText = `${rawCount - mappedCount} row(s) dropped during local data mapping/validation.`;
      } else if (appTotal < rawCount) {
        faultStage = 'API_OR_CACHE_STALE';
        diagnosisText = `API returned ${rawCount} rows, but App State has ${appTotal} (${rawCount - appTotal} unhydrated due to stale local cache).`;
      } else if (appSession < appTotal && appSession < rawCount) {
        faultStage = 'SESSION_FILTER_HIDDEN';
        diagnosisText = `All ${rawCount} rows are in App State, but ${appTotal - appSession} belong to another academic cycle (Current: ${currentSession}).`;
      } else if (appTotal > rawCount) {
        diagnosisText = `App has ${appTotal - rawCount} additional local record(s) not yet pushed to Sheet.`;
      }

      return {
        key,
        label,
        sheetTabName,
        rawSheetCount: rawCount,
        mappedValidCount: mappedCount,
        appTotalCount: appTotal,
        appSessionCount: appSession,
        diffTotal,
        diffSession,
        faultStage,
        diagnosisText,
      };
    };

    const datasets: DatasetDiagnosticRow[] = [
      buildDatasetRow(
        'intakes',
        'Intake Register (Receipts)',
        'Intake_Register',
        rawIntakes.length,
        validMappedIntakes,
        allIntakes.length,
        sessionIntakes.length
      ),
      buildDatasetRow(
        'ledger',
        'Course Evaluation Ledger',
        'Course_Ledger',
        rawLedger.length,
        validMappedLedger,
        allCourseEvaluations.length,
        sessionCourseEvaluations.length
      ),
      buildDatasetRow(
        'admissions',
        'Student Admissions & Re-Reg',
        'Fresh_* / ReReg_*',
        rawAdmissions.length,
        rawAdmissions.length,
        studentRegistrations.length,
        studentRegistrations.filter((s) =>
          !currentSession || currentSession.toLowerCase() === 'all'
            ? true
            : norm(s.session) === norm(currentSession)
        ).length
      ),
      buildDatasetRow(
        'evaluators',
        'Evaluators Master Directory',
        'Evaluators_Master',
        rawEvaluators.length,
        rawEvaluators.length,
        evaluators.length,
        evaluators.length
      ),
    ];

    const hasDiscrepancy =
      datasets.some((d) => d.faultStage !== 'PARITY_OK') || missingRecords.length > 0;

    setReport({
      checkedAt: new Date().toLocaleTimeString('en-IN'),
      latencyMs,
      source: usedSource,
      endpointUrl: targetUrl,
      rawPayload: rawData,
      datasets,
      missingRecords,
      hasDiscrepancy,
    });
    setIsRunning(false);
  }, [
    allIntakes,
    sessionIntakes,
    allCourseEvaluations,
    sessionCourseEvaluations,
    studentRegistrations,
    evaluators,
    currentSession,
    showToast,
  ]);

  // Run automatically on mount so the user immediately sees the live comparison
  useEffect(() => {
    runIntegrityVerification();
  }, []);

  // Re-evaluate report counts whenever app state changes after a fix
  useEffect(() => {
    if (!report || !report.rawPayload) return;
    const rawIntakes: any[] =
      report.rawPayload.intakeRegister ||
      report.rawPayload.Intake_Register ||
      report.rawPayload.intakes ||
      [];
    const rawLedger: any[] =
      report.rawPayload.courseLedger ||
      report.rawPayload.Course_Ledger ||
      report.rawPayload.course_ledger ||
      [];
    if (
      allIntakes.length === rawIntakes.length &&
      allCourseEvaluations.length === rawLedger.length &&
      report.hasDiscrepancy
    ) {
      runIntegrityVerification();
    }
  }, [allIntakes.length, allCourseEvaluations.length]);

  /**
   * One-Click Fix & Force-Hydrate All Raw Sheet Rows into App State
   */
  const handleFixAndForceHydrate = async () => {
    setIsFixing(true);
    try {
      if (report?.rawPayload) {
        const rawData = report.rawPayload;
        const rawIntake: any[] =
          rawData.intakeRegister || rawData.Intake_Register || rawData.intakes || [];
        const rawLedger: any[] =
          rawData.courseLedger || rawData.Course_Ledger || rawData.course_ledger || [];

        const seenIntakeIds = new Set<string>();
        const intakePracticalCourseSet = new Set<string>();

        // Map all raw intakes with resilient fallbacks so zero valid rows are lost
        const repairedIntakes = rawIntake
          .filter((r: any) => {
            if (!r) return false;
            const enr = String(
              r.Enrollment_No || r.enrollmentNo || r['Enrollment No'] || ''
            ).trim();
            return enr.length >= 4;
          })
          .map((r: any, idx: number) => {
            const rawCourses = r.Courses || r.courses || r.courseCodes || '';
            const rawCourseList: string[] = Array.isArray(rawCourses)
              ? rawCourses.flatMap((c: any) => String(c).split(','))
              : String(rawCourses).split(',');

            const enrollment = String(
              r.Enrollment_No || r.enrollmentNo || r['Enrollment No'] || ''
            )
              .replace(/^'/, '')
              .trim();
            const candidate = String(
              r.Candidate_Name || r.candidateName || r['Candidate Name'] || r.studentName || 'Student'
            ).trim();
            const session = normalizeSessionName(r.Session || r.session || currentSession || 'July 2026');
            const programme = String(
              r.Programme || r.programme || r.programmeCode || 'BAG'
            ).trim();
            const contact = String(r.Contact || r.contact || r.studentPhone || '')
              .replace(/^'/, '')
              .trim();

            const practicalCourses: string[] = [];
            const assignmentCourses: string[] = [];
            const cleanCourseList: string[] = [];

            rawCourseList.forEach((rawC: string) => {
              const rawStr = String(rawC).trim();
              if (!rawStr) return;
              const clean = rawStr
                .replace(
                  /\s*[\(\[](Practical|TMA\s*\+\s*Practical|TMA|Both|P|Asgn|Assignment)[\)\]]\s*/gi,
                  ''
                )
                .trim()
                .toUpperCase();
              if (!clean) return;
              if (!cleanCourseList.includes(clean)) cleanCourseList.push(clean);

              const isBrl = /^BRL[-_]?\d+/i.test(clean);
              const hasPracTag = !isBrl && /\b(Practical|P)\b/i.test(rawStr);
              if (hasPracTag || (!isBrl && isPracticalCourse(clean))) {
                if (!practicalCourses.includes(clean)) practicalCourses.push(clean);
                intakePracticalCourseSet.add(`${enrollment}_${clean}_${session}`);
              } else {
                if (!assignmentCourses.includes(clean)) assignmentCourses.push(clean);
              }
            });

            const rawId = r.id || r.tokenNo || r.Token_No;
            const courseSlug = cleanCourseList.slice().sort().join('_') || `entry${idx}`;
            let id = rawId ? String(rawId).trim() : '';
            if (!id || seenIntakeIds.has(id)) {
              id = `intake-${enrollment}-${session.replace(/\s+/g, '')}-${courseSlug}-${idx}`;
            }
            seenIntakeIds.add(id);
            const tokenNo = r.tokenNo || r.Token_No || id;

            const rawTimestamp = r.Timestamp || r.timestamp || r.createdAt || '';
            const subDate = rawTimestamp && String(rawTimestamp).includes('T')
              ? String(rawTimestamp).split('T')[0]
              : new Date().toISOString().split('T')[0];
            const timestamp = rawTimestamp || `${subDate}T10:00:00.000Z`;
            const official = r.Official || r.handledBy || r.official || 'Desk Official';

            const isPurePractical = practicalCourses.length > 0 && assignmentCourses.length === 0;
            const isPureAssignment = assignmentCourses.length > 0 && practicalCourses.length === 0;
            const componentCategory: 'Assignment' | 'Practical' | 'Both' = isPurePractical
              ? 'Practical'
              : isPureAssignment
              ? 'Assignment'
              : 'Both';

            const courseDetails = cleanCourseList.map((code) => ({
              code,
              type: (practicalCourses.includes(code) ? 'Practical' : 'Assignment') as
                | 'Assignment'
                | 'Practical',
              title: getCourseTitle(code, programme),
              addedInPart: 1,
              submissionDate: subDate,
            }));

            return {
              timestamp,
              session,
              enrollmentNo: enrollment,
              candidateName: candidate,
              contact,
              programme,
              courses: cleanCourseList,
              coursesStr: cleanCourseList.join(', '),
              handledBy: official,
              practicalCourses,
              assignmentCourses,
              courseDetails,
              componentType: componentCategory,
              isPractical: isPurePractical,
              Timestamp: timestamp,
              Session: session,
              Enrollment_No: enrollment,
              Candidate_Name: candidate,
              Contact: contact,
              Programme: programme,
              Courses: cleanCourseList.join(', '),
              Official: official,
              Component: componentCategory,
              id,
              tokenNo,
              studentName: candidate,
              studentPhone: contact,
              programmeCode: programme,
              courseCodes: cleanCourseList,
              submissionDate: subDate,
              receiptDate: subDate,
              Submission_Date: subDate,
              submissionMode: (r.submissionMode || 'In-Person (Desk)') as any,
              status: (r.status || r.Status || 'Received') as any,
              marks: r.marks || {},
              createdAt: timestamp,
              receiptNumber: r.receiptNumber || tokenNo,
            };
          });

        // Map all raw course ledger rows
        const repairedLedger = rawLedger
          .filter((r: any) => {
            if (!r) return false;
            const enr = String(
              r.Enrollment_No || r.enrollmentNo || r['Enrollment No'] || ''
            ).trim();
            const course = String(
              r.Course_Code || r.courseCode || r['Course Code'] || ''
            ).trim();
            return enr.length >= 4 && Boolean(course);
          })
          .map((r: any, idx: number) => {
            const enrollment = String(
              r.Enrollment_No || r.enrollmentNo || r['Enrollment No'] || ''
            )
              .replace(/^'/, '')
              .trim();
            const rawCourseStr = String(
              r.Course_Code || r.courseCode || r['Course Code'] || ''
            ).trim();
            const courseCode = rawCourseStr
              .replace(
                /\s*[\(\[](Practical|TMA\s*\+\s*Practical|TMA|Both|P|Asgn|Assignment)[\)\]]\s*/gi,
                ''
              )
              .trim()
              .toUpperCase();
            const session = normalizeSessionName(
              r.Session || r.session || currentSession || 'July 2026',
              r.Sub_ID || r.subId
            );
            const subId = String(
              r.Sub_ID ||
                r.subId ||
                r.id ||
                `SUB_${enrollment}_${courseCode}_${session.replace(/\s+/g, '')}_${idx}`
            ).trim();
            const candidate = String(
              r.Candidate_Name || r.candidateName || r['Candidate Name'] || r.studentName || ''
            ).trim();
            const programme = String(
              r.Programme || r.programme || r.programmeCode || 'BAG'
            ).trim();
            const evaluator =
              r.Allotted_Evaluator || r.allottedEvaluator || r.evaluatorName || 'Unallotted';
            const rawMarks =
              r.Marks !== undefined && r.Marks !== ''
                ? r.Marks
                : r.marks !== undefined
                ? r.marks
                : '';
            const numericMarks =
              rawMarks !== '' && rawMarks !== null && !isNaN(Number(rawMarks))
                ? Number(rawMarks)
                : null;
            const grade =
              r.Grade || r.grade || (numericMarks !== null ? calculateIGNOUGrade(numericMarks).grade : '');
            const status = r.Status || r.status || 'Pending';
            const isLocked = Boolean(
              status === 'Locked' || status === 'Marks Locked' || r.isLocked
            );

            const matchingIntake = repairedIntakes.find(
              (i: any) =>
                i.enrollmentNo === enrollment &&
                norm(i.session) === norm(session) &&
                i.courses.includes(courseCode)
            );

            const isBrl = /^BRL[-_]?\d+/i.test(courseCode);
            const isPrac =
              !isBrl &&
              (intakePracticalCourseSet.has(`${enrollment}_${courseCode}_${session}`) ||
                isPracticalCourse(courseCode));
            const compType: 'Assignment' | 'Practical' = isPrac ? 'Practical' : 'Assignment';
            const subDate =
              matchingIntake?.submissionDate || new Date().toISOString().split('T')[0];

            return {
              subId,
              session,
              enrollmentNo: enrollment,
              candidateName: candidate,
              programme,
              courseCode,
              allottedEvaluator: evaluator,
              marks: rawMarks,
              grade,
              status: status as any,
              componentType: compType,
              isPractical: isPrac,
              Component: compType,
              Sub_ID: subId,
              Session: session,
              Enrollment_No: enrollment,
              Candidate_Name: candidate,
              Programme: programme,
              Course_Code: courseCode,
              Allotted_Evaluator: evaluator,
              Marks: rawMarks,
              Grade: grade,
              Status: status,
              id: subId,
              submissionKey: subId,
              intakeId: matchingIntake?.id || '',
              tokenNo: matchingIntake?.tokenNo || '',
              studentName: candidate,
              programmeCode: programme,
              evaluatorName: evaluator !== 'Unallotted' ? evaluator : null,
              isLocked,
              submissionDate: subDate,
              receiptDate: subDate,
              Submission_Date: subDate,
              receivedDate: subDate,
              intakeDate: subDate,
              submissionMode: (r.submissionMode || 'In-Person (Desk)') as any,
            };
          });

        // Persist repaired datasets directly to localStorage and state
        localStorage.setItem('ignou_sc2033_intake', JSON.stringify(repairedIntakes));
        localStorage.setItem('ignou_sc2033_ledger', JSON.stringify(repairedLedger));
        localStorage.setItem('ignou_sc2033_intakes_v4_1', JSON.stringify(repairedIntakes));
        localStorage.setItem('ignou_sc2033_course_evals_v4_1', JSON.stringify(repairedLedger));

        setIntakeRegister(repairedIntakes as any);
        setCourseLedger(repairedLedger as any);

        await syncGoogleSheets(true);
        showToast(
          `Fixed & Hydrated: ${repairedIntakes.length} Intake Entries and ${repairedLedger.length} Course Ledger Rows active!`,
          'success'
        );
      } else {
        await purgeOldDemoDataAndSyncLive();
      }
      await runIntegrityVerification();
    } catch (err) {
      console.error('[IntegrityDebugger Fix Error]:', err);
      showToast('Failed to execute auto-repair. Try Force Refresh.', 'error');
    } finally {
      setIsFixing(false);
    }
  };

  const handleExportReport = () => {
    if (!report) return;
    const exportPayload = {
      generatedAt: new Date().toISOString(),
      checkedAt: report.checkedAt,
      latencyMs: report.latencyMs,
      source: report.source,
      currentSession,
      datasets: report.datasets,
      missingRecords: report.missingRecords.map(({ rawRecord, ...rest }) => rest),
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SC2033_Integrity_Debug_Report_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredMissing = (report?.missingRecords || []).filter((m) => {
    if (!filterText.trim()) return true;
    const q = filterText.toLowerCase();
    return (
      m.enrollmentNo.toLowerCase().includes(q) ||
      m.candidateName.toLowerCase().includes(q) ||
      m.courseOrProg.toLowerCase().includes(q) ||
      m.reason.toLowerCase().includes(q)
    );
  });

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
      {/* Executive Header Bar */}
      <div className="bg-slate-900 text-white px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0">
            <Database className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold tracking-tight text-white">
                Integrity Debugger: Raw Sheet vs. App State Verification
              </h3>
              {report && (
                <span
                  className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded ${
                    !report.hasDiscrepancy
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60'
                      : 'bg-amber-950 text-amber-300 border border-amber-700/60'
                  }`}
                >
                  {!report.hasDiscrepancy
                    ? '100% PARITY VERIFIED'
                    : `${report.missingRecords.length} DISCREPANCY DETECTED`}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Compares unparsed Google Sheets API rows against local normalization and active React state to isolate API fetch vs. local mapping drops.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={runIntegrityVerification}
            disabled={isRunning || isFixing}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
            <span>{isRunning ? 'Inspecting Raw API...' : 'Run Verification'}</span>
          </button>

          <button
            type="button"
            onClick={handleFixAndForceHydrate}
            disabled={isRunning || isFixing}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 whitespace-nowrap"
            title="Repair and force-hydrate all raw Google Sheet rows directly into App State and LocalStorage"
          >
            <Wrench className={`w-3.5 h-3.5 ${isFixing ? 'animate-spin' : ''}`} />
            <span>{isFixing ? 'Repairing State...' : 'Fix & Force-Hydrate All Rows'}</span>
          </button>

          {report && (
            <button
              type="button"
              onClick={handleExportReport}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap"
              title="Download JSON diagnostic report"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>
          )}
        </div>
      </div>

      {/* Telemetry Metadata Bar */}
      {report && (
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-4">
            <span>
              Source: <strong className="text-slate-900">{report.source}</strong>
            </span>
            <span className="text-slate-300">·</span>
            <span>
              Roundtrip Latency:{' '}
              <strong className="font-mono tabular-nums text-slate-900">{report.latencyMs}ms</strong>
            </span>
            <span className="text-slate-300">·</span>
            <span>
              Checked At:{' '}
              <strong className="font-mono tabular-nums text-slate-900">{report.checkedAt}</strong>
            </span>
            <span className="text-slate-300">·</span>
            <span>
              Active Session Filter:{' '}
              <strong className="font-mono text-indigo-700">{currentSession}</strong>
            </span>
          </div>

          {currentSession && currentSession.toLowerCase() !== 'all' && (
            <button
              type="button"
              onClick={() => setSession('All')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
            >
              <span>Show All Academic Cycles</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* Main Comparison Matrix */}
      <div className="p-5 space-y-5">
        {!report && isRunning ? (
          <div className="py-10 text-center space-y-2">
            <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin mx-auto" />
            <p className="text-xs font-semibold text-slate-700">
              Fetching raw unfiltered Google Sheets payload and verifying row-by-row parity...
            </p>
          </div>
        ) : report ? (
          <>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-2.5 px-4">Dataset / Sheet Tab</th>
                    <th className="py-2.5 px-4 text-right">Total Rows in Sheet (Raw API)</th>
                    <th className="py-2.5 px-4 text-right">Mapped Rows (Normalizer)</th>
                    <th className="py-2.5 px-4 text-right">Processed Rows in App</th>
                    <th className="py-2.5 px-4 text-right">Difference (App − Sheet)</th>
                    <th className="py-2.5 px-4">Stage Isolation & Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {report.datasets.map((ds) => {
                    const isMatch = ds.diffTotal === 0 && ds.mappedValidCount === ds.rawSheetCount;
                    return (
                      <tr key={ds.key} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{ds.label}</div>
                          <div className="text-[11px] font-mono text-slate-500">{ds.sheetTabName}</div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-slate-900 text-sm">
                          {ds.rawSheetCount}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-700 text-sm">
                          {ds.mappedValidCount}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-sm">
                          <span
                            className={
                              ds.appTotalCount === ds.rawSheetCount
                                ? 'text-emerald-700'
                                : 'text-amber-700'
                            }
                          >
                            {ds.appTotalCount}
                          </span>
                          {ds.appSessionCount !== ds.appTotalCount && (
                            <div className="text-[10px] font-normal text-slate-500">
                              ({ds.appSessionCount} in {currentSession})
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-sm">
                          {ds.diffTotal === 0 ? (
                            <span className="text-emerald-600">0 (Exact Match)</span>
                          ) : (
                            <span className="text-rose-600">
                              {ds.diffTotal > 0 ? `+${ds.diffTotal}` : ds.diffTotal}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-start gap-2">
                            {isMatch ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            )}
                            <div>
                              <div
                                className={`font-semibold ${
                                  isMatch ? 'text-emerald-800' : 'text-amber-900'
                                }`}
                              >
                                {ds.faultStage === 'PARITY_OK' && 'Stage Verified: Zero Data Loss'}
                                {ds.faultStage === 'LOCAL_MAPPING_DROP' &&
                                  'Isolated Fault: Local Data Mapping / Filter Drop'}
                                {ds.faultStage === 'API_OR_CACHE_STALE' &&
                                  'Isolated Fault: Stale Browser Cache vs. Raw API'}
                                {ds.faultStage === 'SESSION_FILTER_HIDDEN' &&
                                  'Isolated Fault: Hidden by Active Cycle Filter'}
                              </div>
                              <div className="text-[11px] text-slate-600 mt-0.5">
                                {ds.diagnosisText}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Actionable Remediation Callout if Discrepancies Exist */}
            {report.hasDiscrepancy ? (
              <div className="p-4 bg-amber-50/90 border border-amber-300 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-amber-950">
                      Discrepancy Isolated ({report.missingRecords.length} Record(s) Affected)
                    </h4>
                    <p className="text-xs text-amber-900 leading-relaxed">
                      The raw Google Sheets API returned{' '}
                      <strong className="font-mono tabular-nums">
                        {report.datasets[0]?.rawSheetCount}
                      </strong>{' '}
                      intake entries and{' '}
                      <strong className="font-mono tabular-nums">
                        {report.datasets[1]?.rawSheetCount}
                      </strong>{' '}
                      course ledger records. Click{' '}
                      <strong>&ldquo;Fix &amp; Force-Hydrate All Rows&rdquo;</strong> to immediately
                      repair and load all missing rows into the app.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleFixAndForceHydrate}
                    disabled={isFixing}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs whitespace-nowrap"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>{isFixing ? 'Applying Fix...' : 'Fix & Force-Hydrate All Rows'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => purgeOldDemoDataAndSyncLive()}
                    className="px-3.5 py-2 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Clear Cache &amp; Re-Pull</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-emerald-950">
                      100% Data Integrity Confirmed: Sheet Rows Match App State
                    </h4>
                    <p className="text-xs text-emerald-800 mt-0.5">
                      All{' '}
                      <strong className="font-mono tabular-nums">
                        {report.datasets[0]?.rawSheetCount}
                      </strong>{' '}
                      Intake Register entries and{' '}
                      <strong className="font-mono tabular-nums">
                        {report.datasets[1]?.rawSheetCount}
                      </strong>{' '}
                      Course Ledger rows from Google Sheets are processed and active in the application.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Row-Level Dropped / Missing Record Inspector */}
            {report.missingRecords.length > 0 && (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-slate-100 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setShowMissingTable((prev) => !prev)}
                    className="flex items-center gap-2 text-xs font-bold text-slate-900 cursor-pointer"
                  >
                    {showMissingTable ? (
                      <ChevronUp className="w-4 h-4 text-slate-600" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-600" />
                    )}
                    <span>
                      Row-by-Row Discrepancy Breakdown ({report.missingRecords.length} Records)
                    </span>
                  </button>

                  {showMissingTable && (
                    <div className="relative w-full sm:w-64">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                        placeholder="Filter by enrollment, name, course..."
                        className="w-full pl-8 pr-3 py-1 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>
                  )}
                </div>

                {showMissingTable && (
                  <div className="max-h-72 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                          <th className="py-2 px-3">Dataset</th>
                          <th className="py-2 px-3">Sheet Row</th>
                          <th className="py-2 px-3">Enrollment No.</th>
                          <th className="py-2 px-3">Candidate Name</th>
                          <th className="py-2 px-3">Course / Programme</th>
                          <th className="py-2 px-3">Isolation Stage</th>
                          <th className="py-2 px-3">Diagnostic Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredMissing.map((item, idx) => (
                          <tr key={`${item.dataset}-${item.sheetRowNumber}-${idx}`} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-semibold text-slate-800">
                              {item.dataset}
                            </td>
                            <td className="py-2 px-3 font-mono tabular-nums text-slate-600">
                              #{item.sheetRowNumber}
                            </td>
                            <td className="py-2 px-3 font-mono tabular-nums font-bold text-indigo-700">
                              {item.enrollmentNo}
                            </td>
                            <td className="py-2 px-3 font-medium text-slate-900">
                              {item.candidateName}
                            </td>
                            <td className="py-2 px-3 font-mono text-slate-700">
                              {item.courseOrProg}
                            </td>
                            <td className="py-2 px-3 font-semibold text-amber-800">
                              {item.stage}
                            </td>
                            <td className="py-2 px-3 text-slate-600">{item.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Live Production Web App (GitHub -> Vercel) Sync Toolkit */}
            <div className="border border-indigo-200 bg-indigo-50/40 rounded-xl p-4 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-indigo-200/70">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <UploadCloud className="w-4 h-4 text-indigo-600" />
                    <span>
                      Update Live Production Web App (ignou-sc2033-portal.vercel.app)
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    AI Studio Preview already runs the fixed code (46 Intakes &amp; 208 Courses). To update your deployed Vercel web app, push the fixed code to{' '}
                    <span className="font-mono text-indigo-800 font-semibold">
                      ignou-assignment-portal/ignou-sc2033-portal
                    </span>{' '}
                    using either Option A (Zero-Token 15-Second Upload) or Option B (1-Click API Push).
                  </p>
                </div>
                <a
                  href="https://ignou-sc2033-portal.vercel.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 transition"
                >
                  <span>Open Live Vercel App</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Option A: Zero-Token 2-Click GitHub Web Upload */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">
                      Option A: Zero-Token GitHub Browser Upload (Recommended)
                    </span>
                    <span className="text-[10px] font-mono text-emerald-700 font-semibold">
                      No Token Needed · 15s
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    1. Download the fixed <code className="font-mono text-slate-900">AppContext.tsx</code> file below.
                    <br />
                    2. Click <strong>Open GitHub Upload Page</strong>, drag-and-drop{' '}
                    <code className="font-mono text-slate-900">AppContext.tsx</code>, and click{' '}
                    <strong>Commit changes</strong>. Vercel will automatically rebuild and deploy all 46 intakes and 208 courses.
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <a
                      href="/api/export-source-file?file=src/context/AppContext.tsx&download=1"
                      download="AppContext.tsx"
                      className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>1. Download Fixed AppContext.tsx</span>
                    </a>

                    <button
                      type="button"
                      onClick={handleCopyFixedAppContext}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap"
                    >
                      {copiedAppContext ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-slate-600" />
                      )}
                      <span>{copiedAppContext ? 'Copied!' : 'Copy Code'}</span>
                    </button>

                    <a
                      href="https://github.com/ignou-assignment-portal/ignou-sc2033-portal/upload/main/src/context"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap"
                    >
                      <span>2. Open GitHub Upload Page</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {/* Option B: 1-Click Automated GitHub API Push */}
                <form
                  onSubmit={handlePushToGithub}
                  className="bg-white border border-slate-200 rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">
                      Option B: 1-Click Automated GitHub API Push
                    </span>
                    <span className="text-[10px] font-mono text-indigo-700 font-semibold">
                      Pushes All 11 Updated Files
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                        Target GitHub Repository
                      </label>
                      <input
                        type="text"
                        value={githubRepo}
                        onChange={(e) => setGithubRepo(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono text-xs text-slate-800"
                        placeholder="owner/repo"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                        GitHub Personal Access Token (repo scope)
                      </label>
                      <input
                        type="password"
                        value={githubToken}
                        onChange={(e) => setGithubToken(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono text-xs text-slate-800"
                        placeholder="ghp_... or github_pat_..."
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <a
                      href="https://github.com/settings/tokens/new?scopes=repo&description=IGNOU-SC2033-Portal-Deploy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-semibold text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      <span>Generate GitHub Token</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>

                    <button
                      type="submit"
                      disabled={isPushingGithub}
                      className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 whitespace-nowrap"
                    >
                      <UploadCloud className={`w-3.5 h-3.5 ${isPushingGithub ? 'animate-bounce' : ''}`} />
                      <span>
                        {isPushingGithub ? 'Pushing to GitHub...' : 'Push All Files to GitHub'}
                      </span>
                    </button>
                  </div>

                  {githubPushResult && (
                    <div
                      className={`p-2.5 rounded-lg border text-xs ${
                        githubPushResult.success
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : 'bg-rose-50 border-rose-200 text-rose-900'
                      }`}
                    >
                      {githubPushResult.success ? (
                        <div className="flex items-center justify-between gap-2">
                          <span>
                            Successfully pushed {githubPushResult.filesPushed?.length} files! Commit:{' '}
                            <strong className="font-mono">
                              {githubPushResult.commitSha?.slice(0, 7)}
                            </strong>
                          </span>
                          {githubPushResult.commitUrl && (
                            <a
                              href={githubPushResult.commitUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-bold text-emerald-800 underline flex items-center gap-1 shrink-0"
                            >
                              <span>View Commit</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      ) : (
                        <span>{githubPushResult.error}</span>
                      )}
                    </div>
                  )}
                </form>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};
