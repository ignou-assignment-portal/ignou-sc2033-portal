import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { formatDate, marksToWords, isPracticalCourse, isDualComponentCourse } from '../utils/helpers';
import {
  Printer,
  X,
  Download,
  Building2,
  Users,
  FileCheck2,
  Layers,
  CheckCircle2,
  Calendar,
  FileText,
  Filter,
  Search,
  FlaskConical,
  BookOpen,
} from 'lucide-react';
import { IntakeRecord } from '../types';

interface AssignmentIntakePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ComponentFilterType = 'ALL' | 'ASSIGNMENT_ONLY' | 'PRACTICAL_ONLY';

/**
 * Extracts distinct assignment and practical course instances for an intake record
 */
function extractCourseComponentsForIntake(r: IntakeRecord) {
  const assignments: string[] = [];
  const practicals: string[] = [];

  if (r.courseDetails && r.courseDetails.length > 0) {
    r.courseDetails.forEach((cd) => {
      const code = cd.code.trim().toUpperCase();
      if (cd.type === 'Practical') {
        practicals.push(code);
      } else {
        assignments.push(code);
      }
    });
  } else {
    const pracList = (r.practicalCourses || []).map((c) => c.trim().toUpperCase());
    const asgnList = (r.assignmentCourses || []).map((c) => c.trim().toUpperCase());

    r.courseCodes.forEach((rawCode) => {
      const c = rawCode.trim().toUpperCase();
      const inPrac = pracList.includes(c) || isPracticalCourse(c);
      const inAsgn = asgnList.includes(c) || (!isPracticalCourse(c) && !pracList.includes(c));

      if (inPrac && inAsgn) {
        assignments.push(c);
        practicals.push(c);
      } else if (inPrac) {
        practicals.push(c);
      } else {
        assignments.push(c);
      }
    });
  }

  return { assignments, practicals };
}

export const AssignmentIntakePrintModal: React.FC<AssignmentIntakePrintModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { currentSession, sessionIntakes, allProgrammes, settings } = useApp();

  // Modal Configuration States
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const defaultMemo = useMemo(() => {
    const cleanSession = currentSession.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    return `SC2033/RC20/ASGN-PRAC/${cleanSession || '2026'}/01`;
  }, [currentSession]);

  const [dispatchMemoNo, setDispatchMemoNo] = useState<string>(defaultMemo);
  const [dispatchDate, setDispatchDate] = useState<string>(todayStr);
  const [componentFilter, setComponentFilter] = useState<ComponentFilterType>('ALL');
  const [showCourseBreakup, setShowCourseBreakup] = useState<boolean>(true);
  const [showPracticalSchedule, setShowPracticalSchedule] = useState<boolean>(true);
  const [onlyWithSubmissions, setOnlyWithSubmissions] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const coveringNote = useMemo(() => {
    if (componentFilter === 'PRACTICAL_ONLY') {
      return 'Certified that all practical / lab records detailed below have been duly received from bonafide learners at IGNOU Study Centre 2033, Dimapur and recorded separately for transmission to Regional Director, Regional Centre Kohima (RC-20).';
    }
    if (componentFilter === 'ASSIGNMENT_ONLY') {
      return 'Certified that all theory assignment responses (TMA) detailed below have been duly received from bonafide learners at IGNOU Study Centre 2033, Dimapur and documented in the primary register.';
    }
    return 'Certified that all assignment responses (TMA) and practical / lab submissions detailed below have been duly received from bonafide learners at IGNOU Study Centre 2033, Dimapur. In accordance with university directives, practical components are recorded separately from theory assignments.';
  }, [componentFilter]);

  // Compute Programme-wise Data
  const programmeReportRows = useMemo(() => {
    const intakeProgCodes = Array.from(
      new Set(sessionIntakes.map((r) => r.programmeCode.trim().toUpperCase()))
    ).filter(Boolean);
    const masterProgCodes = allProgrammes.map((p) => p.code.trim().toUpperCase());

    const allDistinctCodes = Array.from(
      new Set([...intakeProgCodes, ...(onlyWithSubmissions ? [] : masterProgCodes)])
    );

    const rows = allDistinctCodes.map((pCode) => {
      const progMaster = allProgrammes.find((p) => p.code.trim().toUpperCase() === pCode);
      const progIntakes = sessionIntakes.filter(
        (r) => r.programmeCode.trim().toUpperCase() === pCode
      );

      // Candidates = count of unique enrollment numbers for this programme with matching filter
      const matchingIntakes = progIntakes.filter((r) => {
        const { assignments, practicals } = extractCourseComponentsForIntake(r);
        if (componentFilter === 'ASSIGNMENT_ONLY') return assignments.length > 0;
        if (componentFilter === 'PRACTICAL_ONLY') return practicals.length > 0;
        return assignments.length > 0 || practicals.length > 0;
      });

      const candidates = new Set(matchingIntakes.map((r) => r.enrollmentNo.trim())).size;

      // Calculate separate assignment scripts and practical scripts
      let assignmentScripts = 0;
      let practicalScripts = 0;

      const courseBreakdownMap: Record<
        string,
        {
          code: string;
          totalCount: number;
          assignmentCount: number;
          practicalCount: number;
          isDual: boolean;
        }
      > = {};

      progIntakes.forEach((r) => {
        const { assignments, practicals } = extractCourseComponentsForIntake(r);

        assignments.forEach((c) => {
          assignmentScripts += 1;
          if (!courseBreakdownMap[c]) {
            courseBreakdownMap[c] = {
              code: c,
              totalCount: 0,
              assignmentCount: 0,
              practicalCount: 0,
              isDual: isDualComponentCourse(c),
            };
          }
          courseBreakdownMap[c].assignmentCount += 1;
          courseBreakdownMap[c].totalCount += 1;
        });

        practicals.forEach((c) => {
          practicalScripts += 1;
          if (!courseBreakdownMap[c]) {
            courseBreakdownMap[c] = {
              code: c,
              totalCount: 0,
              assignmentCount: 0,
              practicalCount: 0,
              isDual: isDualComponentCourse(c),
            };
          }
          courseBreakdownMap[c].practicalCount += 1;
          courseBreakdownMap[c].totalCount += 1;
        });
      });

      const totalScripts = assignmentScripts + practicalScripts;
      const effectiveScripts =
        componentFilter === 'ASSIGNMENT_ONLY'
          ? assignmentScripts
          : componentFilter === 'PRACTICAL_ONLY'
          ? practicalScripts
          : totalScripts;

      // Filter course breakdown by active componentFilter
      const coursesBreakup = Object.values(courseBreakdownMap)
        .filter((c) => {
          if (componentFilter === 'ASSIGNMENT_ONLY') return c.assignmentCount > 0;
          if (componentFilter === 'PRACTICAL_ONLY') return c.practicalCount > 0;
          return c.totalCount > 0;
        })
        .sort((a, b) => a.code.localeCompare(b.code));

      return {
        programmeCode: pCode,
        programmeTitle: progMaster ? progMaster.name : `${pCode} Programme`,
        department: progMaster?.department || '',
        candidatesCount: candidates,
        assignmentScripts,
        practicalScripts,
        totalScripts,
        effectiveScripts,
        coursesBreakup,
      };
    });

    // Filter by submissions if enabled
    let result = onlyWithSubmissions ? rows.filter((r) => r.effectiveScripts > 0) : rows;

    // Filter by search query if any
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (r) =>
          r.programmeCode.toLowerCase().includes(q) ||
          r.programmeTitle.toLowerCase().includes(q) ||
          r.coursesBreakup.some((c) => c.code.toLowerCase().includes(q))
      );
    }

    return result.sort(
      (a, b) => b.effectiveScripts - a.effectiveScripts || a.programmeCode.localeCompare(b.programmeCode)
    );
  }, [sessionIntakes, allProgrammes, onlyWithSubmissions, searchQuery, componentFilter]);

  // Grand Total Calculations
  const grandTotalCandidates = useMemo(() => {
    const matchingIntakes = sessionIntakes.filter((r) => {
      const { assignments, practicals } = extractCourseComponentsForIntake(r);
      if (componentFilter === 'ASSIGNMENT_ONLY') return assignments.length > 0;
      if (componentFilter === 'PRACTICAL_ONLY') return practicals.length > 0;
      return assignments.length > 0 || practicals.length > 0;
    });
    return new Set(matchingIntakes.map((r) => r.enrollmentNo.trim())).size;
  }, [sessionIntakes, componentFilter]);

  const grandTotalAssignmentScripts = useMemo(() => {
    return sessionIntakes.reduce((acc, r) => {
      const { assignments } = extractCourseComponentsForIntake(r);
      return acc + assignments.length;
    }, 0);
  }, [sessionIntakes]);

  const grandTotalPracticalScripts = useMemo(() => {
    return sessionIntakes.reduce((acc, r) => {
      const { practicals } = extractCourseComponentsForIntake(r);
      return acc + practicals.length;
    }, 0);
  }, [sessionIntakes]);

  const grandTotalAllScripts = useMemo(() => {
    return grandTotalAssignmentScripts + grandTotalPracticalScripts;
  }, [grandTotalAssignmentScripts, grandTotalPracticalScripts]);

  const effectiveGrandTotal =
    componentFilter === 'ASSIGNMENT_ONLY'
      ? grandTotalAssignmentScripts
      : componentFilter === 'PRACTICAL_ONLY'
      ? grandTotalPracticalScripts
      : grandTotalAllScripts;

  // Individual Practical Submissions Schedule (Annexure / Schedule B)
  const practicalScheduleItems = useMemo(() => {
    const items: Array<{
      id: string;
      tokenNo: string;
      enrollmentNo: string;
      studentName: string;
      studentPhone?: string;
      programmeCode: string;
      courseCode: string;
      submissionDate: string;
      submissionMode: string;
      partNo?: number;
      remarks?: string;
    }> = [];

    sessionIntakes.forEach((r) => {
      const { practicals } = extractCourseComponentsForIntake(r);
      practicals.forEach((pCode) => {
        const matchingPart = r.submissionParts?.find((p) =>
          p.practicalCourses?.includes(pCode) || p.courseCodes?.includes(pCode)
        );
        items.push({
          id: `${r.id}-${pCode}`,
          tokenNo: r.tokenNo,
          enrollmentNo: r.enrollmentNo,
          studentName: r.studentName,
          studentPhone: r.studentPhone,
          programmeCode: r.programmeCode,
          courseCode: pCode,
          submissionDate: r.submissionDate,
          submissionMode: r.submissionMode,
          partNo: matchingPart?.partNo,
          remarks: r.remarks,
        });
      });
    });

    return items.sort((a, b) =>
      a.programmeCode.localeCompare(b.programmeCode) || a.enrollmentNo.localeCompare(b.enrollmentNo)
    );
  }, [sessionIntakes]);

  // Export CSV Action with Separate Assignment & Practical Columns
  const handleExportCSV = () => {
    const headers = [
      'S.No',
      'Programme Code',
      'Programme Title',
      'Candidates Count',
      'Assignment Scripts (TMA)',
      'Practical Scripts (Lab/Project)',
      'Total Scripts',
      'Courses Breakup',
    ];

    const dataRows = programmeReportRows.map((r, idx) => [
      idx + 1,
      r.programmeCode,
      `"${r.programmeTitle.replace(/"/g, '""')}"`,
      r.candidatesCount,
      r.assignmentScripts,
      r.practicalScripts,
      r.totalScripts,
      `"${r.coursesBreakup
        .map(
          (c) =>
            `${c.code}${
              c.isDual
                ? ` [TMA: ${c.assignmentCount}, Practical: ${c.practicalCount}]`
                : c.practicalCount > 0
                ? ' (Practical)'
                : ' (TMA)'
            }: ${c.totalCount}`
        )
        .join('; ')}"`,
    ]);

    const grandTotalRow = [
      '""',
      '"GRAND TOTAL"',
      `"Total Programmes: ${programmeReportRows.length}"`,
      grandTotalCandidates,
      grandTotalAssignmentScripts,
      grandTotalPracticalScripts,
      grandTotalAllScripts,
      '""',
    ];

    const csvContent = [
      `"IGNOU STUDY CENTRE 2033 (SC-2033) - REGIONAL OFFICE INTAKE REPORT"`,
      `"Academic Session: ${currentSession} | Dispatch Memo: ${dispatchMemoNo} | Date: ${dispatchDate}"`,
      `"Filter View: ${componentFilter} | Regional Centre: RC-20 Kohima | Host Campus: S.D. Jain Girls' College, Dimapur"`,
      '',
      headers.join(','),
      ...dataRows.map((row) => row.join(',')),
      grandTotalRow.join(','),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `IGNOU_SC2033_Regional_Office_Intake_Report_${componentFilter}_${currentSession.replace(/\s+/g, '_')}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    document.body.classList.add('printing-intake-matrix-report');
    window.print();
  };

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('printing-intake-matrix-report');
      return () => {
        document.body.classList.remove('printing-intake-matrix-report');
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-zinc-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto animate-in fade-in print:p-0 print:m-0 print:static print:bg-transparent print:overflow-visible print:block">
      <div className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl border border-zinc-300 overflow-hidden my-auto print:m-0 print:p-0 print:border-none print:shadow-none print:w-full print:rounded-none print:overflow-visible">
        {/* Modal Action Bar (Hidden when printing) */}
        <div className="px-5 py-3.5 bg-zinc-900 text-white flex items-center justify-between gap-3 border-b border-zinc-800 print:hidden">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
              <Building2 className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-zinc-100">
                  Regional Office Assignment & Practical Submission Report
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-500/40">
                  RC-20 Kohima
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Official transmittal to Regional Director with separate recording for Practicals and Assignments
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-lg transition border border-zinc-700 cursor-pointer"
              title="Download Report as CSV file"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            <button
              onClick={handlePrint}
              type="button"
              id="btn-print-intake-report"
              className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition shadow-md cursor-pointer"
              title="Print Report or Save as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save as PDF</span>
            </button>

            <button
              onClick={onClose}
              type="button"
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition cursor-pointer ml-1"
              title="Close Print Preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* View Component Filter Tabs (Hidden when printing) */}
        <div className="bg-zinc-850 text-white px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-750 print:hidden">
          <div className="flex items-center gap-1 bg-zinc-900/80 p-1 rounded-lg border border-zinc-700 text-xs">
            <button
              type="button"
              onClick={() => setComponentFilter('ALL')}
              className={`px-3 py-1 rounded-md font-bold transition flex items-center gap-1.5 cursor-pointer ${
                componentFilter === 'ALL'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Consolidated (Assignments & Practicals)</span>
            </button>

            <button
              type="button"
              onClick={() => setComponentFilter('PRACTICAL_ONLY')}
              className={`px-3 py-1 rounded-md font-bold transition flex items-center gap-1.5 cursor-pointer ${
                componentFilter === 'PRACTICAL_ONLY'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5 text-purple-300" />
              <span>Practicals Only ({grandTotalPracticalScripts})</span>
            </button>

            <button
              type="button"
              onClick={() => setComponentFilter('ASSIGNMENT_ONLY')}
              className={`px-3 py-1 rounded-md font-bold transition flex items-center gap-1.5 cursor-pointer ${
                componentFilter === 'ASSIGNMENT_ONLY'
                  ? 'bg-amber-600 text-white shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-300" />
              <span>Assignments (TMA) Only ({grandTotalAssignmentScripts})</span>
            </button>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <label className="flex items-center gap-2 cursor-pointer text-zinc-300 font-semibold select-none">
              <input
                type="checkbox"
                checked={showPracticalSchedule}
                onChange={(e) => setShowPracticalSchedule(e.target.checked)}
                className="rounded border-zinc-600 text-purple-500 focus:ring-purple-400"
              />
              <span>Include Schedule B (Practical Submissions Annexure)</span>
            </label>
          </div>
        </div>

        {/* Configuration Strip (Hidden when printing) */}
        <div className="bg-zinc-50 border-b border-zinc-200 px-5 py-3 print:hidden">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">
                Dispatch Memo Ref No.
              </label>
              <input
                type="text"
                value={dispatchMemoNo}
                onChange={(e) => setDispatchMemoNo(e.target.value)}
                className="w-full bg-white border border-zinc-300 rounded-lg px-2.5 py-1.5 font-mono text-xs text-zinc-900 focus:ring-2 focus:ring-indigo-500"
                placeholder="Memo Reference"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">
                Report / Dispatch Date
              </label>
              <input
                type="date"
                value={dispatchDate}
                onChange={(e) => setDispatchDate(e.target.value)}
                className="w-full bg-white border border-zinc-300 rounded-lg px-2.5 py-1.5 font-mono text-xs text-zinc-900 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 cursor-pointer select-none text-zinc-700 font-semibold py-1.5">
                <input
                  type="checkbox"
                  checked={showCourseBreakup}
                  onChange={(e) => setShowCourseBreakup(e.target.checked)}
                  className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Include Course-wise Breakup</span>
              </label>
            </div>

            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 cursor-pointer select-none text-zinc-700 font-semibold py-1.5">
                <input
                  type="checkbox"
                  checked={onlyWithSubmissions}
                  onChange={(e) => setOnlyWithSubmissions(e.target.checked)}
                  className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Programmes with Intake Only</span>
              </label>
            </div>
          </div>
        </div>

        {/* Printable Document Body */}
        <div
          id="printable-intake-matrix-report"
          className="p-6 md:p-8 space-y-6 bg-white text-zinc-900 max-h-[78vh] overflow-y-auto print:max-h-none print:overflow-visible print:p-0 print:m-0 print:space-y-4"
        >
          {/* Institutional University & Study Centre Header */}
          <div className="border-b-2 border-zinc-900 pb-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 border border-zinc-800 rounded bg-zinc-100">
                  {componentFilter === 'PRACTICAL_ONLY'
                    ? 'OFFICIAL PRACTICAL / LAB SUBMISSION REPORT TO REGIONAL CENTRE'
                    : componentFilter === 'ASSIGNMENT_ONLY'
                    ? 'OFFICIAL ASSIGNMENT (TMA) INTAKE REPORT TO REGIONAL CENTRE'
                    : 'OFFICIAL ASSIGNMENT & PRACTICAL TRANSMITTAL REPORT TO REGIONAL CENTRE'}
                </span>
                <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-zinc-950 font-serif mt-1.5">
                  Indira Gandhi National Open University
                </h1>
                <div className="text-sm font-bold text-zinc-800">
                  IGNOU Study Centre 2033 (SC-2033)
                </div>
                <div className="text-xs text-zinc-600 mt-0.5">
                  Host Campus: S.D. Jain Girls' College, Jain Temple Road, Dimapur - 797112, Nagaland
                </div>
                <div className="text-[11px] font-semibold text-indigo-900">
                  Jurisdiction: Regional Centre Kohima (RC-20)
                </div>
              </div>

              <div className="border border-zinc-300 rounded-xl p-3 bg-zinc-50 sm:text-right text-xs shrink-0 min-w-[210px] space-y-1">
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase font-bold block">
                    Dispatch Reference No:
                  </span>
                  <span className="font-mono font-black text-zinc-950 text-xs">
                    {dispatchMemoNo}
                  </span>
                </div>
                <div className="pt-1 border-t border-zinc-200">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold block">
                    Report Date:
                  </span>
                  <span className="font-medium text-zinc-900">
                    {formatDate(dispatchDate)}
                  </span>
                </div>
                <div className="pt-1 border-t border-zinc-200">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold block">
                    Academic Cycle:
                  </span>
                  <span className="font-bold text-indigo-900">
                    {currentSession}
                  </span>
                </div>
                <div className="pt-1 border-t border-zinc-200">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold block">
                    Component Schedule:
                  </span>
                  <span className="font-semibold text-zinc-800">
                    {componentFilter === 'PRACTICAL_ONLY'
                      ? 'Practicals / Labs Recorded Separately'
                      : componentFilter === 'ASSIGNMENT_ONLY'
                      ? 'Theory Assignments (TMA) Only'
                      : 'Assignments & Practicals Tabulated'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Addressee & Dispatch Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-zinc-50 p-3.5 rounded-xl border border-zinc-200">
            <div>
              <span className="text-[10px] font-bold uppercase text-zinc-500 block mb-0.5">
                Submitted To:
              </span>
              <div className="font-bold text-zinc-900 text-sm">
                The Regional Director (SED / Evaluation)
              </div>
              <div className="text-zinc-700">IGNOU Regional Centre Kohima (RC-20)</div>
              <div className="text-zinc-600">Agriland Building, below AG Office</div>
              <div className="text-zinc-600">AG Colony, Kohima - 797001, Nagaland</div>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase text-zinc-500 block mb-0.5">
                Transmitted By:
              </span>
              <div className="font-bold text-zinc-900 text-sm">
                The Coordinator / In-Charge
              </div>
              <div className="text-zinc-700">IGNOU Study Centre 2033 (SC-2033)</div>
              <div className="text-zinc-600">S.D. Jain Girls' College, Dimapur - 797112</div>
              <div className="text-zinc-600 font-mono text-[11px]">
                Phone: {settings.coordinatorContact || '+91 9436013686'}
              </div>
            </div>
          </div>

          {/* Key Summary Stats Cards - Distinct Assignment vs Practical Counts */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center">
            <div className="border border-zinc-300 bg-zinc-50 rounded-xl p-2.5">
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                Programmes
              </div>
              <div className="text-2xl font-black text-zinc-950 font-mono mt-0.5">
                {programmeReportRows.length}
              </div>
              <div className="text-[10px] text-zinc-500">Represented</div>
            </div>

            <div className="border border-indigo-200 bg-indigo-50/60 rounded-xl p-2.5">
              <div className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider">
                Unique Learners
              </div>
              <div className="text-2xl font-black text-indigo-950 font-mono mt-0.5">
                {grandTotalCandidates}
              </div>
              <div className="text-[10px] text-indigo-700 font-medium">Candidates</div>
            </div>

            <div className="border border-amber-300 bg-amber-50/70 rounded-xl p-2.5">
              <div className="text-[10px] font-bold text-amber-900 uppercase tracking-wider">
                Assignment (TMA)
              </div>
              <div className="text-2xl font-black text-amber-950 font-mono mt-0.5">
                {grandTotalAssignmentScripts}
              </div>
              <div className="text-[10px] text-amber-800 font-bold">Theory Scripts</div>
            </div>

            <div className="border border-purple-300 bg-purple-50/70 rounded-xl p-2.5">
              <div className="text-[10px] font-bold text-purple-900 uppercase tracking-wider">
                Practical (Lab)
              </div>
              <div className="text-2xl font-black text-purple-950 font-mono mt-0.5">
                {grandTotalPracticalScripts}
              </div>
              <div className="text-[10px] text-purple-800 font-bold">Separate Practical Records</div>
            </div>

            <div className="border border-emerald-300 bg-emerald-50/70 rounded-xl p-2.5 col-span-2 sm:col-span-1">
              <div className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider">
                Total Intake
              </div>
              <div className="text-2xl font-black text-emerald-950 font-mono mt-0.5">
                {effectiveGrandTotal}
              </div>
              <div className="text-[10px] text-emerald-800 font-bold">Consolidated Scripts</div>
            </div>
          </div>

          {/* Primary Programme-Wise Tabulation Table with Separate Practical Column */}
          <div className="overflow-x-auto border border-zinc-800 rounded-lg">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-100 text-zinc-900 uppercase text-[10px] font-bold border-b-2 border-zinc-800">
                  <th className="py-2.5 px-3 w-12 text-center border-r border-zinc-300">S.No</th>
                  <th className="py-2.5 px-3 min-w-[200px] border-r border-zinc-300">
                    Programme (Code & Title)
                  </th>
                  <th className="py-2.5 px-3 text-center w-24 border-r border-zinc-300">
                    Candidates <span className="block text-[9px] font-normal text-zinc-500">(Learners)</span>
                  </th>
                  {componentFilter !== 'PRACTICAL_ONLY' && (
                    <th className="py-2.5 px-3 text-center w-28 border-r border-zinc-300 bg-amber-50/60 text-amber-950">
                      Assignments <span className="block text-[9px] font-normal text-amber-800">(TMA Scripts)</span>
                    </th>
                  )}
                  {componentFilter !== 'ASSIGNMENT_ONLY' && (
                    <th className="py-2.5 px-3 text-center w-28 border-r border-zinc-300 bg-purple-50/60 text-purple-950">
                      Practicals <span className="block text-[9px] font-normal text-purple-800">(Lab/Project)</span>
                    </th>
                  )}
                  {componentFilter === 'ALL' && (
                    <th className="py-2.5 px-3 text-center w-24 border-r border-zinc-300 bg-emerald-50/50 text-emerald-950">
                      Total Scripts <span className="block text-[9px] font-normal text-emerald-800">(Combined)</span>
                    </th>
                  )}
                  {showCourseBreakup && (
                    <th className="py-2.5 px-3 border-r border-zinc-300 min-w-[260px]">
                      Course Codes Received & Script Count (Recorded Sep.)
                    </th>
                  )}
                  <th className="py-2.5 px-3 text-center w-28">Status / Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-300 text-zinc-800">
                {programmeReportRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={showCourseBreakup ? 8 : 7}
                      className="py-8 text-center text-zinc-500 italic"
                    >
                      No matching submission records found for academic cycle {currentSession} under filter "{componentFilter}".
                    </td>
                  </tr>
                ) : (
                  programmeReportRows.map((row, index) => (
                    <tr
                      key={row.programmeCode}
                      className={index % 2 === 1 ? 'bg-zinc-50/50' : 'bg-white'}
                    >
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-zinc-600 border-r border-zinc-300">
                        {index + 1}
                      </td>
                      <td className="py-2.5 px-3 border-r border-zinc-300">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-zinc-200 text-zinc-900 font-mono font-black text-xs border border-zinc-300">
                            {row.programmeCode}
                          </span>
                          <span className="font-bold text-zinc-950">
                            {row.programmeTitle}
                          </span>
                        </div>
                        {row.department && (
                          <div className="text-[10px] text-zinc-500 mt-0.5 ml-1">
                            {row.department}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-zinc-950 border-r border-zinc-300 text-sm">
                        {row.candidatesCount}
                      </td>
                      {componentFilter !== 'PRACTICAL_ONLY' && (
                        <td className="py-2.5 px-3 text-center font-mono font-black text-amber-950 border-r border-zinc-300 bg-amber-50/30 text-sm">
                          {row.assignmentScripts}
                        </td>
                      )}
                      {componentFilter !== 'ASSIGNMENT_ONLY' && (
                        <td className="py-2.5 px-3 text-center font-mono font-black text-purple-950 border-r border-zinc-300 bg-purple-50/30 text-sm">
                          {row.practicalScripts > 0 ? (
                            <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-900 border border-purple-200">
                              {row.practicalScripts}
                            </span>
                          ) : (
                            <span className="text-zinc-400 font-normal">0</span>
                          )}
                        </td>
                      )}
                      {componentFilter === 'ALL' && (
                        <td className="py-2.5 px-3 text-center font-mono font-black text-emerald-950 border-r border-zinc-300 bg-emerald-50/20 text-sm">
                          {row.totalScripts}
                        </td>
                      )}
                      {showCourseBreakup && (
                        <td className="py-2.5 px-3 border-r border-zinc-300">
                          {row.coursesBreakup.length === 0 ? (
                            <span className="text-zinc-400 italic text-[11px]">—</span>
                          ) : (
                            <div className="flex flex-wrap gap-1 max-w-md">
                              {row.coursesBreakup.map((c) => {
                                if (c.isDual) {
                                  return (
                                    <span
                                      key={c.code}
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-950 font-mono text-[10px] font-semibold border border-indigo-200"
                                      title="Course with both Assignment and Practical components recorded separately"
                                    >
                                      <strong className="text-zinc-900">{c.code}:</strong>
                                      {c.assignmentCount > 0 && (
                                        <span className="px-1 rounded bg-amber-100 text-amber-900 text-[9px] font-bold">
                                          TMA: {c.assignmentCount}
                                        </span>
                                      )}
                                      {c.practicalCount > 0 && (
                                        <span className="px-1 rounded bg-purple-100 text-purple-900 text-[9px] font-bold">
                                          Prac: {c.practicalCount}
                                        </span>
                                      )}
                                    </span>
                                  );
                                }

                                if (c.practicalCount > 0) {
                                  return (
                                    <span
                                      key={c.code}
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-50 text-purple-900 font-mono text-[10px] font-semibold border border-purple-200"
                                    >
                                      <span>{c.code} (Prac):</span>
                                      <strong className="text-purple-950">{c.practicalCount}</strong>
                                    </span>
                                  );
                                }

                                return (
                                  <span
                                    key={c.code}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-800 font-mono text-[10px] font-semibold border border-zinc-200"
                                  >
                                    <span>{c.code}:</span>
                                    <strong className="text-indigo-900">{c.assignmentCount}</strong>
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </td>
                      )}
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Intake Verified
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              {/* Statutory Grand Total Row */}
              <tfoot className="bg-zinc-100 font-bold border-t-2 border-zinc-900 text-zinc-950">
                <tr>
                  <td
                    colSpan={2}
                    className="py-3 px-3 text-left font-black uppercase text-xs border-r border-zinc-300 tracking-wider"
                  >
                    GRAND TOTAL ({programmeReportRows.length} Programmes)
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-black text-base border-r border-zinc-300 text-indigo-950">
                    {grandTotalCandidates}
                  </td>
                  {componentFilter !== 'PRACTICAL_ONLY' && (
                    <td className="py-3 px-3 text-center font-mono font-black text-base border-r border-zinc-300 bg-amber-100 text-amber-950">
                      {grandTotalAssignmentScripts}
                    </td>
                  )}
                  {componentFilter !== 'ASSIGNMENT_ONLY' && (
                    <td className="py-3 px-3 text-center font-mono font-black text-base border-r border-zinc-300 bg-purple-100 text-purple-950">
                      {grandTotalPracticalScripts}
                    </td>
                  )}
                  {componentFilter === 'ALL' && (
                    <td className="py-3 px-3 text-center font-mono font-black text-base border-r border-zinc-300 bg-emerald-100 text-emerald-950">
                      {grandTotalAllScripts}
                    </td>
                  )}
                  {showCourseBreakup && (
                    <td className="py-3 px-3 text-xs text-zinc-600 border-r border-zinc-300 font-medium">
                      Assignment Scripts: <strong>{grandTotalAssignmentScripts}</strong> | Practical Records: <strong>{grandTotalPracticalScripts}</strong>
                    </td>
                  )}
                  <td className="py-3 px-3 text-center text-[10px] uppercase font-bold text-zinc-700">
                    Consolidated
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Intake Count in Words Banner */}
          <div className="p-3 bg-zinc-50 border border-zinc-300 rounded-xl text-xs space-y-1.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <span className="text-zinc-500 font-medium uppercase text-[10px] tracking-wider">
                  Total Script Intake in Words:{' '}
                </span>
                <span className="font-bold text-zinc-950 font-serif">
                  {effectiveGrandTotal > 0
                    ? `${marksToWords(effectiveGrandTotal)} Scripts/Records Only`
                    : 'Zero Scripts'}
                </span>
              </div>
              <div className="text-[11px] text-zinc-600">
                Assignment TMA:{' '}
                <strong className="text-amber-900 font-mono">{grandTotalAssignmentScripts}</strong> | Practical Records:{' '}
                <strong className="text-purple-900 font-mono">{grandTotalPracticalScripts}</strong> | Total Learners:{' '}
                <strong className="text-zinc-900 font-mono">{grandTotalCandidates}</strong>
              </div>
            </div>
            <p className="text-[11px] text-zinc-600 italic pt-1 border-t border-zinc-200">
              {coveringNote}
            </p>
          </div>

          {/* SCHEDULE B: Separate Record of Practical / Lab Submissions Transmitted to Regional Office */}
          {showPracticalSchedule && practicalScheduleItems.length > 0 && (
            <div className="mt-6 pt-6 border-t-2 border-dashed border-zinc-400 print:break-before-page">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded bg-purple-100 text-purple-800">
                    <FlaskConical className="w-4 h-4" />
                  </span>
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-tight text-zinc-950">
                      SCHEDULE B: Separate Register of Practical / Lab Submissions
                    </h2>
                    <p className="text-[11px] text-zinc-600">
                      Statutory transmittal to Regional Director (RC-20 Kohima) for courses requiring practical records & evaluation
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-100 text-purple-900 border border-purple-200">
                    Total Practicals: {practicalScheduleItems.length}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto border border-zinc-800 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-purple-950 text-white uppercase text-[10px] font-bold">
                      <th className="py-2 px-2.5 w-10 text-center border-r border-purple-850">S.No</th>
                      <th className="py-2 px-2.5 w-32 border-r border-purple-850">Enrollment No.</th>
                      <th className="py-2 px-2.5 border-r border-purple-850">Learner Name</th>
                      <th className="py-2 px-2.5 w-20 text-center border-r border-purple-850">Prog.</th>
                      <th className="py-2 px-2.5 w-28 text-center border-r border-purple-850 bg-purple-900">Course Code</th>
                      <th className="py-2 px-2.5 w-32 text-center border-r border-purple-850">Component</th>
                      <th className="py-2 px-2.5 w-28 text-center border-r border-purple-850">Intake Token</th>
                      <th className="py-2 px-2.5 w-24 text-center border-r border-purple-850">Date Recd.</th>
                      <th className="py-2 px-2.5 text-center w-24">Verification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-300 text-zinc-800">
                    {practicalScheduleItems.map((item, idx) => (
                      <tr key={item.id} className={idx % 2 === 1 ? 'bg-purple-50/20' : 'bg-white'}>
                        <td className="py-2 px-2.5 text-center font-mono font-bold text-zinc-600 border-r border-zinc-300">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-2.5 font-mono font-bold text-zinc-950 border-r border-zinc-300">
                          {item.enrollmentNo}
                        </td>
                        <td className="py-2 px-2.5 font-bold text-zinc-900 border-r border-zinc-300">
                          {item.studentName}
                        </td>
                        <td className="py-2 px-2.5 text-center font-mono font-bold text-zinc-800 border-r border-zinc-300">
                          {item.programmeCode}
                        </td>
                        <td className="py-2 px-2.5 text-center font-mono font-black text-purple-950 border-r border-zinc-300 bg-purple-50/50">
                          {item.courseCode}
                        </td>
                        <td className="py-2 px-2.5 text-center border-r border-zinc-300">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-900 border border-purple-200">
                            Practical / Lab
                          </span>
                        </td>
                        <td className="py-2 px-2.5 text-center font-mono text-[11px] text-zinc-700 border-r border-zinc-300">
                          {item.tokenNo}
                          {item.partNo && item.partNo > 1 ? ` (Part ${item.partNo})` : ''}
                        </td>
                        <td className="py-2 px-2.5 text-center font-mono text-[11px] text-zinc-600 border-r border-zinc-300">
                          {formatDate(item.submissionDate)}
                        </td>
                        <td className="py-2 px-2.5 text-center">
                          <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                            Verified
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Statutory Formal Sign-Off Footer */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-xs border-t border-zinc-300 print:grid-cols-3 print:break-inside-avoid print:gap-3 print:pt-3">
            {/* Column 1: Intake Desk Official */}
            <div className="p-3.5 flex flex-col justify-between space-y-6 bg-white border-0 border-none shadow-none print:border-none print:shadow-none">
              <div>
                <div className="text-[10px] font-bold uppercase text-zinc-700 tracking-wider">
                  1. Assignment Intake Desk In-Charge
                </div>
                <p className="text-[10px] text-zinc-600 mt-1 leading-relaxed">
                  Verified with primary intake register tokens, part-by-part logs, and physical scripts/practical records.
                </p>
              </div>
              <div className="border-t border-dashed border-zinc-400 pt-2 text-center">
                <div className="font-bold text-zinc-900 text-xs">Intake Desk Official</div>
                <div className="text-[10px] text-zinc-500">Assignment & Practical Desk, SC-2033</div>
                <div className="text-[10px] font-mono text-zinc-400 mt-0.5">Date: {formatDate(dispatchDate)}</div>
              </div>
            </div>

            {/* Column 2: Study Centre Coordinator Attestation & Seal */}
            <div className="p-3.5 flex flex-col justify-between space-y-6 bg-white border-0 border-none shadow-none print:border-none print:shadow-none">
              <div>
                <div className="text-[10px] font-bold uppercase text-zinc-900 tracking-wider">
                  2. Coordinator Attestation & Seal
                </div>
                <p className="text-[10px] text-zinc-600 mt-1 leading-relaxed">
                  Transmitted to Regional Centre Kohima with intact institutional seal and separate practical schedules.
                </p>
              </div>
              <div className="border-t border-dashed border-zinc-400 pt-2 text-center">
                <div className="font-serif italic font-black text-indigo-950 text-sm">
                  {settings.coordinatorName || 'Dr. Sant Kumar Gupta'}
                </div>
                <div className="font-bold text-[11px] text-zinc-900">
                  {settings.coordinatorDesignation || 'Coordinator, IGNOU SC-2033'}
                </div>
                <div className="text-[10px] text-zinc-600">
                  S.D. Jain Girls' College, Dimapur
                </div>
              </div>
            </div>

            {/* Column 3: Regional Centre Kohima Receipt Acknowledgment Slip */}
            <div className="border border-zinc-400 rounded-xl p-3.5 flex flex-col justify-between space-y-6 bg-zinc-50/50">
              <div>
                <div className="text-[10px] font-bold uppercase text-zinc-700 tracking-wider">
                  3. Regional Centre Kohima Acknowledgment
                </div>
                <p className="text-[10px] text-zinc-600 mt-1 leading-relaxed">
                  For use at Regional Centre Kohima (RC-20) Inward Desk.
                </p>
              </div>
              <div className="border-t border-dashed border-zinc-400 pt-2 text-left space-y-1 text-[10px] font-mono text-zinc-600">
                <div>RC Inward Diary No: __________________</div>
                <div>Date Received: _______________________</div>
                <div>Receiving Official Signature: ___________</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
