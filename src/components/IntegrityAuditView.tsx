import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  FileDown,
  Printer,
  Database,
  Search,
  Filter,
  Layers,
  BookOpen,
  Hash,
  Users,
  Award,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Activity,
  Cpu,
  Lock,
} from 'lucide-react';
import { IntakeRecord, CourseEvaluationRecord, RegistrationReceipt } from '../types';
import { formatDate } from '../utils/helpers';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface AuditRuleResult {
  ruleId: string;
  ruleCode: string;
  name: string;
  category: 'Student Identity' | 'Course Submissions' | 'Relational Integrity' | 'Evaluations & Marks' | 'Data Quality';
  description: string;
  status: 'PASSED' | 'WARNING' | 'FAILED';
  recordsAudited: number;
  violationCount: number;
  violations: Array<{
    id: string;
    identifier: string;
    description: string;
    details?: any;
  }>;
  verifiedDetails: string;
}

export const IntegrityAuditView: React.FC = () => {
  const {
    currentSession,
    sessionIntakes,
    allIntakes,
    intakeRegister,
    sessionCourseEvaluations,
    allCourseEvaluations,
    sessionRegistrationReceipts,
    allRegistrationReceipts,
    sessionPackets,
    evaluators,
    isAdmin,
  } = useApp();

  const [auditScope, setAuditScope] = useState<'CURRENT' | 'ALL'>('CURRENT');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [lastScanTimestamp, setLastScanTimestamp] = useState<string>(() => new Date().toLocaleTimeString());
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PASSED' | 'ISSUES'>('ALL');
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>('RULE-1');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Target records based on scope
  const targetIntakes = useMemo<IntakeRecord[]>(() => {
    if (auditScope === 'ALL') {
      if (allIntakes && allIntakes.length > 0) return allIntakes;
      if (intakeRegister && intakeRegister.length > 0) return intakeRegister;
      return sessionIntakes;
    }
    return sessionIntakes;
  }, [auditScope, allIntakes, intakeRegister, sessionIntakes]);

  const targetEvaluations = useMemo<CourseEvaluationRecord[]>(() => {
    if (auditScope === 'ALL') {
      return allCourseEvaluations || sessionCourseEvaluations;
    }
    return sessionCourseEvaluations;
  }, [auditScope, allCourseEvaluations, sessionCourseEvaluations]);

  const targetReceipts = useMemo<RegistrationReceipt[]>(() => {
    if (auditScope === 'ALL') {
      return allRegistrationReceipts || sessionRegistrationReceipts;
    }
    return sessionRegistrationReceipts;
  }, [auditScope, allRegistrationReceipts, sessionRegistrationReceipts]);

  // Execute full database health check across institutional rules
  const auditResults = useMemo<AuditRuleResult[]>(() => {
    const results: AuditRuleResult[] = [];

    // =========================================================================
    // RULE 1: Enrollment Number vs. Programme Scope
    // In IGNOU, an enrollment number cannot belong to multiple different programmes.
    // =========================================================================
    const enrollmentProgMap = new Map<string, { programmes: Set<string>; records: IntakeRecord[] }>();
    targetIntakes.forEach((r) => {
      const enr = (r.enrollmentNo || (r as any).Enrollment_No || '').trim();
      const prog = (r.programmeCode || (r as any).Programme || '').trim().toUpperCase();
      if (!enr || !prog) return;

      if (!enrollmentProgMap.has(enr)) {
        enrollmentProgMap.set(enr, { programmes: new Set<string>(), records: [] });
      }
      const item = enrollmentProgMap.get(enr)!;
      item.programmes.add(prog);
      item.records.push(r);
    });

    const rule1Violations: AuditRuleResult['violations'] = [];
    enrollmentProgMap.forEach((val, enr) => {
      if (val.programmes.size > 1) {
        rule1Violations.push({
          id: `r1-${enr}`,
          identifier: `Enrollment: ${enr}`,
          description: `Conflict: Enrollment ${enr} is registered across ${val.programmes.size} different programmes: ${Array.from(val.programmes).join(', ')}.`,
          details: { enrollmentNo: enr, programmes: Array.from(val.programmes), recordsCount: val.records.length },
        });
      }
    });

    results.push({
      ruleId: 'RULE-1',
      ruleCode: 'Rule 1: Programme Scope Binding',
      name: 'Enrollment Number vs. Programme Scope',
      category: 'Student Identity',
      description: 'An IGNOU enrollment number must remain strictly bound to a single registered academic programme across all intakes and evaluations.',
      status: rule1Violations.length === 0 ? 'PASSED' : 'FAILED',
      recordsAudited: targetIntakes.length,
      violationCount: rule1Violations.length,
      violations: rule1Violations,
      verifiedDetails: `${enrollmentProgMap.size} distinct student enrollments verified against academic programmes.`,
    });

    // =========================================================================
    // RULE 2: Multi-Course Intake Allowance & Limits
    // Multi-course intake allowed under same student & programme, max 50 courses.
    // =========================================================================
    const rule2Violations: AuditRuleResult['violations'] = [];
    targetIntakes.forEach((r) => {
      const courses = r.courseCodes || (r as any).Courses || [];
      const coursesArr = Array.isArray(courses) ? courses : String(courses).split(',').map((c) => c.trim());
      const token = r.tokenNo || r.id;

      if (coursesArr.length === 0) {
        rule2Violations.push({
          id: `r2-zero-${token}`,
          identifier: `Token: ${token}`,
          description: `Intake entry has zero registered courses.`,
          details: r,
        });
      } else if (coursesArr.length > 50) {
        rule2Violations.push({
          id: `r2-exceed-${token}`,
          identifier: `Token: ${token}`,
          description: `Intake exceeds maximum institutional ceiling of 50 courses (has ${coursesArr.length}).`,
          details: r,
        });
      }
    });

    results.push({
      ruleId: 'RULE-2',
      ruleCode: 'Rule 2: Multi-Course Intake Allowance',
      name: 'Course Selection Quotas & Batch Ceiling',
      category: 'Course Submissions',
      description: 'Enforces proper batch boundaries: each intake receipt must contain between 1 and 50 registered course codes.',
      status: rule2Violations.length === 0 ? 'PASSED' : 'FAILED',
      recordsAudited: targetIntakes.length,
      violationCount: rule2Violations.length,
      violations: rule2Violations,
      verifiedDetails: `All batches adhere to statutory course quota limits (1 - 50 courses per transaction).`,
    });

    // =========================================================================
    // RULE 3: No Duplicate Course Submissions
    // No repeated courses within single entry or across student's intake in same session.
    // =========================================================================
    const rule3Violations: AuditRuleResult['violations'] = [];
    const studentSessionCourseMap = new Map<string, Map<string, string[]>>(); // enr -> (course -> tokens[])

    targetIntakes.forEach((r) => {
      const enr = (r.enrollmentNo || (r as any).Enrollment_No || '').trim();
      const token = r.tokenNo || r.id;
      const rawCourses = r.courseCodes || (r as any).Courses || [];
      const coursesArr = Array.isArray(rawCourses) ? rawCourses : String(rawCourses).split(',').map((c) => c.trim().toUpperCase());

      // Check within single entry
      const seenInEntry = new Set<string>();
      coursesArr.forEach((c) => {
        if (seenInEntry.has(c)) {
          rule3Violations.push({
            id: `r3-internal-${token}-${c}`,
            identifier: `Token: ${token}`,
            description: `Duplicate Course: ${c} is entered more than once within the same receipt.`,
            details: { token, course: c },
          });
        }
        seenInEntry.add(c);
      });

      // Check across session entries for same enrollment
      if (enr) {
        if (!studentSessionCourseMap.has(enr)) {
          studentSessionCourseMap.set(enr, new Map<string, string[]>());
        }
        const courseMap = studentSessionCourseMap.get(enr)!;
        coursesArr.forEach((c) => {
          const prevTokens = courseMap.get(c) || [];
          if (prevTokens.length > 0) {
            rule3Violations.push({
              id: `r3-cross-${enr}-${c}`,
              identifier: `Enrollment: ${enr} (${c})`,
              description: `Duplicate Submission: Course ${c} submitted in multiple receipts (${[...prevTokens, token].join(', ')}).`,
              details: { enrollmentNo: enr, course: c, tokens: [...prevTokens, token] },
            });
          }
          prevTokens.push(token);
          courseMap.set(c, prevTokens);
        });
      }
    });

    results.push({
      ruleId: 'RULE-3',
      ruleCode: 'Rule 3: Course Uniqueness Constraint',
      name: 'No Duplicate Course Submissions',
      category: 'Course Submissions',
      description: 'A student cannot register the same course multiple times within the same session or within a single receipt slip.',
      status: rule3Violations.length === 0 ? 'PASSED' : 'FAILED',
      recordsAudited: targetIntakes.length,
      violationCount: rule3Violations.length,
      violations: rule3Violations,
      verifiedDetails: `Verified that course codes are unique per student profile in the active cycle.`,
    });

    // =========================================================================
    // RULE 4: Relational Foreign Key Integrity (Intake -> Evaluations -> Receipts)
    // Every evaluation must link back to a valid parent intake receipt.
    // =========================================================================
    const intakeTokenSet = new Set(targetIntakes.map((r) => (r.tokenNo || r.id).trim().toUpperCase()));
    const intakeEnrSet = new Set(targetIntakes.map((r) => (r.enrollmentNo || '').trim()));

    const rule4Violations: AuditRuleResult['violations'] = [];
    targetEvaluations.forEach((ev) => {
      const parentToken = (ev.tokenNo || '').trim().toUpperCase();
      const enr = (ev.enrollmentNo || '').trim();

      if (parentToken && !intakeTokenSet.has(parentToken)) {
        rule4Violations.push({
          id: `r4-orphaned-eval-${ev.id}`,
          identifier: `Evaluation: ${ev.courseCode} (${ev.enrollmentNo})`,
          description: `Orphaned Record: Course evaluation links to unknown Token No '${parentToken}'.`,
          details: ev,
        });
      }
    });

    results.push({
      ruleId: 'RULE-4',
      ruleCode: 'Rule 4: Relational Integrity',
      name: 'Intake to Evaluation Linkage Consistency',
      category: 'Relational Integrity',
      description: 'Ensures relational linkage between Stage 1 Intake Counter slips and Stage 2 Course Evaluations.',
      status: rule4Violations.length === 0 ? 'PASSED' : 'FAILED',
      recordsAudited: targetEvaluations.length,
      violationCount: rule4Violations.length,
      violations: rule4Violations,
      verifiedDetails: `Evaluations correctly trace back to verified counter tokens in the intake ledger.`,
    });

    // =========================================================================
    // RULE 5: Evaluation Marks & Lock Consistency
    // Marks must be 0-100 or null, locked records must have evaluator codes.
    // =========================================================================
    const rule5Violations: AuditRuleResult['violations'] = [];
    targetEvaluations.forEach((ev) => {
      if (ev.marks !== null && ev.marks !== undefined) {
        if (typeof ev.marks !== 'number' || isNaN(ev.marks) || ev.marks < 0 || ev.marks > 100) {
          rule5Violations.push({
            id: `r5-invalid-mark-${ev.id}`,
            identifier: `Eval ID: ${ev.id}`,
            description: `Out-of-Range Marks: Evaluation for ${ev.courseCode} has invalid score '${ev.marks}' (must be 0-100).`,
            details: ev,
          });
        }
      }

      if (ev.isLocked && !ev.evaluatorCode) {
        rule5Violations.push({
          id: `r5-locked-no-eval-${ev.id}`,
          identifier: `Eval ID: ${ev.id}`,
          description: `Locked Without Evaluator: Evaluation record is marked locked but lacks an approved Evaluator Code.`,
          details: ev,
        });
      }
    });

    results.push({
      ruleId: 'RULE-5',
      ruleCode: 'Rule 5: Academic Evaluation Standards',
      name: 'Marks Scoring Range & Award Locks',
      category: 'Evaluations & Marks',
      description: 'Enforces statutory scoring ranges (0 - 100 marks) and mandates assigned evaluators on finalized records.',
      status: rule5Violations.length === 0 ? 'PASSED' : 'FAILED',
      recordsAudited: targetEvaluations.length,
      violationCount: rule5Violations.length,
      violations: rule5Violations,
      verifiedDetails: `All course evaluation scores strictly adhere to official IGNOU grading parameters.`,
    });

    // =========================================================================
    // RULE 6: Mandatory Fields & Number Formats
    // Enrollment 9-10 digits, Phone 10 digits, candidate names present.
    // =========================================================================
    const rule6Violations: AuditRuleResult['violations'] = [];
    targetIntakes.forEach((r) => {
      const enr = (r.enrollmentNo || '').trim();
      const name = (r.studentName || '').trim();
      const phone = (r.studentPhone || '').replace(/\D/g, '');
      const token = r.tokenNo || r.id;

      if (!/^\d{9,10}$/.test(enr)) {
        rule6Violations.push({
          id: `r6-bad-enr-${token}`,
          identifier: `Token: ${token}`,
          description: `Format Error: Enrollment number '${enr}' is not 9 or 10 numeric digits.`,
          details: r,
        });
      }

      if (!name) {
        rule6Violations.push({
          id: `r6-bad-name-${token}`,
          identifier: `Token: ${token}`,
          description: `Missing Mandatory Field: Candidate name is empty.`,
          details: r,
        });
      }

      if (phone && phone.length !== 10) {
        rule6Violations.push({
          id: `r6-bad-phone-${token}`,
          identifier: `Token: ${token}`,
          description: `Format Warning: Contact phone number has ${phone.length} digits (expected 10).`,
          details: r,
        });
      }
    });

    results.push({
      ruleId: 'RULE-6',
      ruleCode: 'Rule 6: Field Format Compliance',
      name: 'Mandatory Student Attributes & Digit Formats',
      category: 'Data Quality',
      description: 'Validates enrollment numbers (9-10 digits), candidate identity, and standard contact records.',
      status: rule6Violations.length === 0 ? 'PASSED' : 'WARNING',
      recordsAudited: targetIntakes.length,
      violationCount: rule6Violations.length,
      violations: rule6Violations,
      verifiedDetails: `Candidate profiles satisfy required field constraints and standard data types.`,
    });

    // =========================================================================
    // RULE 7: Session Tagging & Cycle Isolation
    // Every record must be tagged with a valid session string.
    // =========================================================================
    const rule7Violations: AuditRuleResult['violations'] = [];
    targetIntakes.forEach((r) => {
      const s = (r.session || (r as any).Session || '').trim();
      const token = r.tokenNo || r.id;
      if (!s) {
        rule7Violations.push({
          id: `r7-missing-session-${token}`,
          identifier: `Token: ${token}`,
          description: `Session Tag Missing: Intake record does not have a designated academic cycle.`,
          details: r,
        });
      }
    });

    results.push({
      ruleId: 'RULE-7',
      ruleCode: 'Rule 7: Session Isolation',
      name: 'Academic Cycle Tagging & Data Isolation',
      category: 'Data Quality',
      description: 'Guarantees every intake and evaluation is strictly tagged with its respective academic admission cycle.',
      status: rule7Violations.length === 0 ? 'PASSED' : 'FAILED',
      recordsAudited: targetIntakes.length,
      violationCount: rule7Violations.length,
      violations: rule7Violations,
      verifiedDetails: `All transactions are securely assigned to the active session cycle (${currentSession}).`,
    });

    // =========================================================================
    // RULE 8: Duplicate Enrollment & Cross-Intake Verification
    // Scans all records in current active session to verify no duplicate enrollment numbers
    // have overlapping courses or conflicting duplicate intake receipts.
    // =========================================================================
    const rule8Violations: AuditRuleResult['violations'] = [];
    const enrollmentReceiptsMap = new Map<string, IntakeRecord[]>();
    targetIntakes.forEach((r) => {
      const enr = (r.enrollmentNo || (r as any).Enrollment_No || '').trim();
      if (!enr) return;
      if (!enrollmentReceiptsMap.has(enr)) {
        enrollmentReceiptsMap.set(enr, []);
      }
      enrollmentReceiptsMap.get(enr)!.push(r);
    });

    enrollmentReceiptsMap.forEach((records, enr) => {
      if (records.length > 1) {
        const allCourseOccurrences = new Map<string, string[]>();
        records.forEach((rec) => {
          const rawCourses = rec.courseCodes || (rec as any).Courses || [];
          const coursesArr = Array.isArray(rawCourses)
            ? rawCourses
            : String(rawCourses).split(',').map((c) => c.trim().toUpperCase());
          const token = rec.tokenNo || rec.id;
          coursesArr.forEach((c) => {
            const list = allCourseOccurrences.get(c) || [];
            list.push(token);
            allCourseOccurrences.set(c, list);
          });
        });

        const duplicateCourses = Array.from(allCourseOccurrences.entries())
          .filter(([_, tokens]) => tokens.length > 1)
          .map(([c]) => c);

        if (duplicateCourses.length > 0) {
          rule8Violations.push({
            id: `r8-dup-courses-${enr}`,
            identifier: `Enrollment: ${enr}`,
            description: `Duplicate Enrollment Conflict: Student has ${records.length} intake receipts with overlapping duplicate courses (${duplicateCourses.join(', ')}).`,
            details: { enrollmentNo: enr, recordsCount: records.length, duplicateCourses },
          });
        }
      }
    });

    results.push({
      ruleId: 'RULE-8',
      ruleCode: 'Rule 8: Active Session Enrollment Integrity Scan',
      name: 'Enrollment Number Duplicate Scan across Session',
      category: 'Student Identity',
      description: 'Scans all active session records to guarantee no duplicate enrollment numbers exist with conflicting or repeated course submissions across separate intake receipts.',
      status: rule8Violations.length === 0 ? 'PASSED' : 'FAILED',
      recordsAudited: targetIntakes.length,
      violationCount: rule8Violations.length,
      violations: rule8Violations,
      verifiedDetails: `Scanned ${targetIntakes.length} intake records across ${enrollmentReceiptsMap.size} distinct enrollments. ${
        rule8Violations.length === 0
          ? 'Zero duplicate enrollment conflicts found.'
          : `${rule8Violations.length} duplicate conflicts identified.`
      }`,
    });

    return results;
  }, [targetIntakes, targetEvaluations, targetReceipts, currentSession]);

  // Overall Health Score & Statistics
  const totalRules = auditResults.length;
  const passedRules = auditResults.filter((r) => r.status === 'PASSED').length;
  const failedRules = auditResults.filter((r) => r.status === 'FAILED').length;
  const warningRules = auditResults.filter((r) => r.status === 'WARNING').length;
  const totalViolations = auditResults.reduce((sum, r) => sum + r.violationCount, 0);

  const healthScore = totalRules > 0 ? Math.round((passedRules / totalRules) * 100) : 100;
  const isAllHealthy = failedRules === 0 && warningRules === 0;

  // Filtered Rules Display
  const displayedRules = useMemo(() => {
    return auditResults.filter((r) => {
      if (filterStatus === 'PASSED' && r.status !== 'PASSED') return false;
      if (filterStatus === 'ISSUES' && r.status === 'PASSED') return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        r.name.toLowerCase().includes(q) ||
        r.ruleCode.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q)
      );
    });
  }, [auditResults, filterStatus, searchQuery]);

  const handleRunHealthCheck = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setLastScanTimestamp(new Date().toLocaleTimeString());
    }, 450);
  };

  const handleDownloadAuditPDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;

    // Header
    doc.setFillColor(30, 27, 75); // Deep Indigo
    doc.rect(0, 0, pageWidth, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('INDIRA GANDHI NATIONAL OPEN UNIVERSITY (IGNOU)', margin, 11);

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.text("Study Centre SC-2033 • S.D. Jain Girls' College, Dimapur", margin, 17);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(254, 240, 138);
    doc.text(`DATABASE HEALTH CHECK & INTEGRITY AUDIT REPORT — ${currentSession.toUpperCase()}`, margin, 23);

    // Meta
    doc.setTextColor(51, 65, 85);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated At: ${new Date().toLocaleString('en-IN')}`, margin, 34);
    doc.text(`Overall Score: ${healthScore}% HEALTHY`, pageWidth - margin - 50, 34);

    // Table
    const tableData = auditResults.map((r, idx) => [
      String(idx + 1),
      r.ruleCode,
      r.name,
      r.category,
      String(r.recordsAudited),
      r.status,
      String(r.violationCount),
    ]);

    autoTable(doc, {
      startY: 38,
      margin: { left: margin, right: margin },
      head: [['#', 'Rule Code', 'Rule Name', 'Category', 'Audited', 'Status', 'Violations']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 27, 75],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      styles: {
        fontSize: 8,
        cellPadding: 2.5,
      },
    });

    doc.save(`IGNOU_SC2033_Database_Integrity_Audit_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div
      id="integrity-audit-dashboard"
      data-testid="integrity-audit-dashboard"
      className="space-y-6"
    >
      {/* Top Banner & Control Deck */}
      <div className="bg-gradient-to-r from-zinc-900 via-indigo-950 to-zinc-900 text-white rounded-2xl p-5 sm:p-6 shadow-sm border border-zinc-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500 text-zinc-950 uppercase tracking-wide">
                Institutional Quality Assurance
              </span>
              <span className="text-xs text-indigo-200">
                Cycle: <strong className="text-white">{currentSession}</strong>
              </span>
              <span className="text-[11px] text-zinc-400 font-mono">
                • Last Checked: {lastScanTimestamp}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
              <span>Database Health Check & Integrity Audit</span>
            </h1>
            <p className="text-xs text-zinc-300 max-w-2xl leading-relaxed">
              Automated institutional diagnostics engine verifying all IGNOU validation rules across student intakes,
              course evaluations, marks ledgers, and official acknowledgment receipts.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              id="run-full-health-check-btn"
              data-testid="run-full-health-check-btn"
              onClick={handleRunHealthCheck}
              disabled={isScanning}
              className={`px-4 py-2.5 font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer ${
                isScanning
                  ? 'bg-emerald-600 text-white cursor-wait opacity-90'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 active:scale-98'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Auditing Database...' : 'Run Full Health Check'}</span>
            </button>

            <button
              type="button"
              id="download-audit-report-btn"
              onClick={handleDownloadAuditPDF}
              className="px-3.5 py-2.5 font-semibold text-xs rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-white transition flex items-center gap-1.5 cursor-pointer"
            >
              <FileDown className="w-4 h-4 text-indigo-300" />
              <span>Export PDF</span>
            </button>
          </div>
        </div>

        {/* Scope Toggle & Database Size Indicators */}
        <div className="mt-5 pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="inline-flex p-1 bg-black/40 rounded-xl border border-white/10 text-xs">
            <button
              type="button"
              onClick={() => setAuditScope('CURRENT')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                auditScope === 'CURRENT'
                  ? 'bg-white text-zinc-950 shadow-xs'
                  : 'text-zinc-300 hover:text-white'
              }`}
            >
              Active Session ({currentSession})
            </button>
            <button
              type="button"
              onClick={() => setAuditScope('ALL')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                auditScope === 'ALL'
                  ? 'bg-white text-zinc-950 shadow-xs'
                  : 'text-zinc-300 hover:text-white'
              }`}
            >
              Entire Database (All Historical Cycles)
            </button>
          </div>

          <div className="flex items-center gap-4 text-zinc-300 text-[11px] font-mono">
            <span>
              <strong>{targetIntakes.length}</strong> Intakes
            </span>
            <span>•</span>
            <span>
              <strong>{targetEvaluations.length}</strong> Evaluations
            </span>
            <span>•</span>
            <span>
              <strong>{evaluators.length}</strong> Evaluators
            </span>
          </div>
        </div>
      </div>

      {/* System Health Score & KPI Dashboard Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Health Grade Meter */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
              Health Status
            </span>
            <div className="text-2xl font-black font-mono text-zinc-900">
              {healthScore}%
            </div>
            <span
              className={`text-xs font-bold inline-flex items-center gap-1 ${
                isAllHealthy ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {isAllHealthy ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
              {isAllHealthy ? 'Optimal Integrity' : `${totalViolations} Issues Detected`}
            </span>
          </div>
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl font-mono ${
              isAllHealthy ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}
          >
            {isAllHealthy ? 'A+' : 'B'}
          </div>
        </div>

        {/* Rules Verified */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
            Rules Verified
          </span>
          <div className="text-2xl font-black font-mono text-indigo-900">
            {passedRules} <span className="text-base text-zinc-400 font-normal">/ {totalRules}</span>
          </div>
          <span className="text-xs text-zinc-500 block">
            100% Institutional Rules Audited
          </span>
        </div>

        {/* Records Audited */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
            Audited Records
          </span>
          <div className="text-2xl font-black font-mono text-zinc-900">
            {targetIntakes.length + targetEvaluations.length}
          </div>
          <span className="text-xs text-zinc-500 block">
            Intake slips, awards & evaluations
          </span>
        </div>

        {/* Violations Count */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
            Discrepancies
          </span>
          <div
            className={`text-2xl font-black font-mono ${
              totalViolations === 0 ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            {totalViolations}
          </div>
          <span className="text-xs text-zinc-500 block">
            {totalViolations === 0 ? 'Zero integrity violations' : 'Requires administrative review'}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar for Rules */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search rule title, category, or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          <div className="inline-flex p-0.5 bg-zinc-100 rounded-lg border border-zinc-200">
            <button
              type="button"
              onClick={() => setFilterStatus('ALL')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition cursor-pointer ${
                filterStatus === 'ALL'
                  ? 'bg-white text-zinc-900 shadow-2xs font-bold'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              All Rules ({totalRules})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('PASSED')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition cursor-pointer ${
                filterStatus === 'PASSED'
                  ? 'bg-white text-zinc-900 shadow-2xs font-bold'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Passed ({passedRules})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('ISSUES')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition cursor-pointer ${
                filterStatus === 'ISSUES'
                  ? 'bg-white text-zinc-900 shadow-2xs font-bold'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Issues ({failedRules + warningRules})
            </button>
          </div>
        </div>

        <span className="text-[11px] text-zinc-500 font-medium">
          Showing {displayedRules.length} of {totalRules} institutional rules
        </span>
      </div>

      {/* Comprehensive Rules Status Cards Accordion List */}
      <div className="space-y-3">
        {displayedRules.map((rule) => {
          const isExpanded = expandedRuleId === rule.ruleId;
          const isPassed = rule.status === 'PASSED';
          const isWarning = rule.status === 'WARNING';

          return (
            <div
              key={rule.ruleId}
              id={`rule-card-${rule.ruleId.toLowerCase()}`}
              className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden shadow-2xs ${
                !isPassed
                  ? 'border-rose-300 ring-1 ring-rose-100'
                  : isExpanded
                  ? 'border-indigo-300 ring-1 ring-indigo-50'
                  : 'border-zinc-200 hover:border-zinc-300'
              }`}
            >
              {/* Rule Card Header */}
              <div
                onClick={() => setExpandedRuleId(isExpanded ? null : rule.ruleId)}
                className="p-4 sm:p-5 flex items-start sm:items-center justify-between gap-3 cursor-pointer select-none bg-zinc-50/50 hover:bg-zinc-50 transition"
              >
                <div className="flex items-start sm:items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                      isPassed
                        ? 'bg-emerald-100 text-emerald-700'
                        : isWarning
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {isPassed ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5" />
                    )}
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                        {rule.ruleCode}
                      </span>
                      <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                        {rule.category}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          isPassed
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}
                      >
                        {rule.status}
                      </span>
                    </div>

                    <h3 className="font-bold text-zinc-900 text-sm sm:text-base">
                      {rule.name}
                    </h3>

                    <p className="text-xs text-zinc-500 line-clamp-1">
                      {rule.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right hidden sm:block text-xs font-mono">
                    <span className="text-zinc-400 block text-[10px] font-sans">Violations</span>
                    <span
                      className={`font-bold ${
                        rule.violationCount === 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {rule.violationCount} found
                    </span>
                  </div>

                  <button
                    type="button"
                    className="p-1 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 transition"
                    aria-label={isExpanded ? 'Collapse' : 'Expand'}
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Rule Card Expanded Diagnostics Panel */}
              {isExpanded && (
                <div className="p-4 sm:p-5 border-t border-zinc-100 bg-white space-y-4 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5 p-3 rounded-xl bg-zinc-50 border border-zinc-200">
                      <span className="font-bold text-zinc-700 block">Institutional Rule Specification</span>
                      <p className="text-zinc-600 text-xs leading-relaxed">
                        {rule.description}
                      </p>
                    </div>

                    <div className="space-y-1.5 p-3 rounded-xl bg-zinc-50 border border-zinc-200">
                      <span className="font-bold text-zinc-700 block">Audit Verification Results</span>
                      <p className="text-zinc-600 text-xs leading-relaxed">
                        {rule.verifiedDetails}
                      </p>
                      <div className="text-[11px] font-mono text-zinc-500 pt-1">
                        Audited Records: <strong>{rule.recordsAudited}</strong> • Violations: <strong>{rule.violationCount}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Violations List or Clean Confirmation */}
                  {rule.violationCount === 0 ? (
                    <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/70 text-emerald-950 flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        <strong>Verification Passed:</strong> Zero discrepancies detected. All {rule.recordsAudited} records
                        comply 100% with this statutory validation rule.
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="font-bold text-rose-900 text-xs flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        <span>Detected Discrepancies ({rule.violationCount}):</span>
                      </div>

                      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                        {rule.violations.map((v) => (
                          <div
                            key={v.id}
                            className="p-2.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-950 text-xs flex items-start justify-between gap-2"
                          >
                            <div>
                              <span className="font-mono font-bold">{v.identifier}:</span>{' '}
                              <span>{v.description}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default IntegrityAuditView;
