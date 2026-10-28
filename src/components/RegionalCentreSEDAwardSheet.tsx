import React, { useState, useMemo } from 'react';
import { useApp, norm } from '../context/AppContext';
import { IGNOU_PROGRAMMES } from '../data/ignouMasterData';
import { marksToWords, formatDate, calculateIGNOUGrade } from '../utils/helpers';
import { postGenerateSedPdf } from '../services/sheetsService';
import {
  FileCheck2,
  Printer,
  Download,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Layers,
  ChevronRight,
  Filter,
  Sparkles,
  Info,
  ShieldCheck,
  Send,
  Calendar,
  Search,
  BookOpen,
} from 'lucide-react';

export type TripartiteCopyType = 'SED_COPY' | 'RC_COPY' | 'SC_COPY' | 'ALL_THREE';

export const RegionalCentreSEDAwardSheet: React.FC = () => {
  const {
    currentSession,
    sessionCourseEvaluations,
    allCourseEvaluations,
    courseLedger,
    settings,
    isAdmin,
    evaluators,
  } = useApp();

  // Selected Course Code
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [overrideEvaluator, setOverrideEvaluator] = useState<string>('');
  const [selectedCopy, setSelectedCopy] = useState<TripartiteCopyType>('SED_COPY');
  const [wordsStyle, setWordsStyle] = useState<'cardinal' | 'digits'>('cardinal');
  const [dispatchMemoNo, setDispatchMemoNo] = useState<string>('SC2033/SED/DISP-2026/042');
  const [dispatchDate, setDispatchDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [filterLockedOnly, setFilterLockedOnly] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isGeneratingSedPdf, setIsGeneratingSedPdf] = useState<boolean>(false);

  const normalizeSession = (s: any) => norm(s);

  const filteredLedger = useMemo(() => {
    const list = (courseLedger && courseLedger.length > 0)
      ? courseLedger
      : (allCourseEvaluations && allCourseEvaluations.length > 0)
      ? allCourseEvaluations
      : sessionCourseEvaluations;
    return list.filter((row: any) => {
      if (!currentSession || currentSession === "All" || currentSession.toLowerCase() === "all") return true;
      return norm(row.Session || row.session) === norm(currentSession);
    });
  }, [courseLedger, allCourseEvaluations, sessionCourseEvaluations, currentSession]);

  // Extract all distinct course codes available in the session
  const distinctCourses = useMemo(() => {
    const map = new Map<string, { count: number; lockedCount: number; evaluatedCount: number }>();
    filteredLedger.forEach((r: any) => {
      const code = (r.Course_Code || r.courseCode || r["Course Code"] || "").toString().trim().toUpperCase();
      if (!code) return;
      const isLocked = Boolean(r.isLocked || r.Status === 'Locked' || r.status === 'Locked' || r.status === 'Marks Locked');
      const rawMarks = r.Marks !== undefined && r.Marks !== "" && r.Marks !== null ? r.Marks : r.marks;
      const cur = map.get(code) || { count: 0, lockedCount: 0, evaluatedCount: 0 };
      cur.count += 1;
      if (isLocked) cur.lockedCount += 1;
      if (rawMarks !== null && rawMarks !== undefined && rawMarks !== "") cur.evaluatedCount += 1;
      map.set(code, cur);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredLedger]);

  // Auto-populate Course Selection in Stage 3:
  const availableCourses = useMemo(() => {
    const fromLedger = (courseLedger || []).map((r: any) => r.courseCode || r.Course_Code);
    const fromDistinct = distinctCourses.map(([c]) => c);
    return [...new Set([...fromLedger, ...fromDistinct])].filter(Boolean);
  }, [courseLedger, distinctCourses]);

  React.useEffect(() => {
    if (!selectedCourse && availableCourses.length > 0) {
      setSelectedCourse(availableCourses[0]);
    } else if ((!selectedCourse || !distinctCourses.some(([c]) => c === selectedCourse)) && distinctCourses.length > 0) {
      setSelectedCourse(distinctCourses[0][0]);
    }
  }, [availableCourses, distinctCourses, selectedCourse]);

  // Reset override evaluator on course change
  React.useEffect(() => {
    setOverrideEvaluator('');
  }, [selectedCourse]);

  // Course metadata lookup
  const courseMeta = useMemo(() => {
    if (!selectedCourse) return null;
    for (const prog of IGNOU_PROGRAMMES) {
      const match = prog.courses.find((c) => c.code === selectedCourse);
      if (match) {
        return {
          title: match.title,
          credits: match.credits,
          programmeCode: prog.code,
          programmeName: prog.name,
        };
      }
    }
    // Fallback if not found in master catalogue
    const sample = filteredLedger.find((r: any) => {
      const c = (r.Course_Code || r.courseCode || r["Course Code"] || "").toString().trim().toUpperCase();
      return c === selectedCourse.trim().toUpperCase();
    });
    const progCode = sample?.Programme || (sample as any)?.programme || sample?.programmeCode || 'IGNOU';
    return {
      title: `${selectedCourse} Assignment Course`,
      credits: 6,
      programmeCode: progCode,
      programmeName: progCode,
    };
  }, [selectedCourse, filteredLedger]);

  // Records for the selected course
  const currentCourseRecords = useMemo(() => {
    return filteredLedger.filter((r: any) => {
      const code = (r.Course_Code || r.courseCode || r["Course Code"] || "").toString().trim().toUpperCase();
      return code === selectedCourse.trim().toUpperCase();
    });
  }, [filteredLedger, selectedCourse]);

  const detectedEvaluator = useMemo(() => {
    const found = currentCourseRecords.find(
      (r: any) => {
        const ev = r.Allotted_Evaluator || (r as any).allottedEvaluator || r.evaluatorName;
        return ev && ev !== 'Unallotted' && ev.trim() !== '';
      }
    );
    if (found) return found.Allotted_Evaluator || (found as any).allottedEvaluator || found.evaluatorName;

    // Fallback to evaluatorName or evaluatorId from sample
    const sample = currentCourseRecords.find(
      (r: any) => r.evaluatorId || r.evaluatorCode
    );
    if (sample?.evaluatorId) {
      const ev = evaluators.find((e) => e.id === sample.evaluatorId || e.evaluatorCode === sample.evaluatorId);
      if (ev) return `${ev.evaluatorName || ev.name} (${ev.evaluatorCode})`;
    }
    return 'Not Allotted';
  }, [currentCourseRecords, evaluators]);

  // Active Evaluator displayed on Award Sheet
  const activeEvaluatorName = overrideEvaluator || (detectedEvaluator !== 'Not Allotted' ? detectedEvaluator : 'Academic Evaluation Panel');
  
  // Find evaluator metadata object if matched
  const activeEvaluatorObj = useMemo(() => {
    return evaluators.find(e => {
      const fullName = (e.evaluatorName || e.name || '').toLowerCase();
      const code = (e.evaluatorCode || '').toLowerCase();
      const current = activeEvaluatorName.toLowerCase();
      return (code && current.includes(code)) || (fullName && current.includes(fullName));
    }) || null;
  }, [evaluators, activeEvaluatorName]);

  // Filtered rows for the award sheet
  const displayRecords = useMemo(() => {
    let list = currentCourseRecords;
    if (filterLockedOnly) {
      list = list.filter((r: any) => Boolean(r.isLocked || r.Status === 'Locked' || r.status === 'Locked' || r.status === 'Marks Locked'));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((r: any) => {
        const enr = String(r.Enrollment_No || r.enrollmentNo || r["Enrollment No"] || "");
        const name = String(r.Candidate_Name || r.candidateName || r["Candidate Name"] || r.studentName || "");
        const subKey = String(r.Sub_ID || r.subId || r.submissionKey || r.id || "");
        return enr.toLowerCase().includes(q) || name.toLowerCase().includes(q) || subKey.toLowerCase().includes(q);
      });
    }
    return list;
  }, [currentCourseRecords, filterLockedOnly, searchQuery]);

  // Statistics for this course
  const courseStats = useMemo(() => {
    const total = currentCourseRecords.length;
    const evaluated = currentCourseRecords.filter((r: any) => {
      const m = r.Marks !== undefined && r.Marks !== "" && r.Marks !== null ? r.Marks : r.marks;
      return m !== null && m !== undefined && m !== "";
    }).length;
    const locked = currentCourseRecords.filter((r: any) => {
      return Boolean(r.isLocked || r.Status === 'Locked' || r.status === 'Locked' || r.status === 'Marks Locked');
    }).length;
    const unlocked = total - locked;

    let a = 0,
      b = 0,
      c = 0,
      d = 0,
      e = 0;
    currentCourseRecords.forEach((r: any) => {
      const rawM = r.Marks !== undefined && r.Marks !== "" && r.Marks !== null ? r.Marks : r.marks;
      const numM = rawM !== null && rawM !== undefined && rawM !== "" && !isNaN(Number(rawM)) ? Number(rawM) : null;
      const g = r.Grade || r.grade || (numM !== null ? calculateIGNOUGrade(numM).grade : '-');
      if (g === 'A') a++;
      else if (g === 'B') b++;
      else if (g === 'C') c++;
      else if (g === 'D') d++;
      else if (g === 'E') e++;
    });

    return { total, evaluated, locked, unlocked, a, b, c, d, e };
  }, [currentCourseRecords]);

  // Export CSV
  const handleExportCSV = () => {
    if (displayRecords.length === 0) return;
    const headers = [
      'S.No',
      'Enrolment Number',
      'Student Name',
      'Programme',
      'Course Code',
      'Session',
      'Deterministic Key',
      'Numerical Marks',
      'Grade',
      'Marks in Words',
      'Verification Status',
      'Evaluator Code',
      'Evaluator Name',
    ];

    const rows = displayRecords.map((r: any, idx: number) => {
      const enr = r.Enrollment_No || r.enrollmentNo || r["Enrollment No"] || "-";
      const name = r.Candidate_Name || r.candidateName || r["Candidate Name"] || r.studentName || "-";
      const prog = r.Programme || r.programme || r.programmeCode || "-";
      const course = r.Course_Code || r.courseCode || r["Course Code"] || selectedCourse;
      const session = r.Session || r.session || currentSession;
      const subKey = r.Sub_ID || r.subId || r.submissionKey || r.id || `SUB-${enr}-${course}`;
      const rawMarks = r.Marks !== undefined && r.Marks !== "" && r.Marks !== null ? r.Marks : (r.marks !== undefined && r.marks !== null ? r.marks : null);
      const numMarks = rawMarks !== null && rawMarks !== undefined && rawMarks !== "" && !isNaN(Number(rawMarks)) ? Number(rawMarks) : null;
      const grade = r.Grade || r.grade || (numMarks !== null ? calculateIGNOUGrade(numMarks).grade : '-');
      const isLocked = Boolean(r.isLocked || r.Status === 'Locked' || r.status === 'Locked' || r.status === 'Marks Locked');
      const ev = r.Allotted_Evaluator || r.allottedEvaluator || r.evaluatorName || activeEvaluatorName;
      return [
        idx + 1,
        `"${enr}"`,
        `"${name}"`,
        prog,
        course,
        `"${session}"`,
        `"${subKey}"`,
        numMarks !== null ? numMarks : 'AB',
        grade,
        `"${marksToWords(numMarks, wordsStyle)}"`,
        isLocked ? 'LOCKED_VERIFIED' : 'DRAFT',
        activeEvaluatorObj?.evaluatorCode || 'SC2033',
        `"${ev}"`,
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `IGNOU_SED_AwardSheet_${selectedCourse}_${currentSession.replace(/\s+/g, '_')}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 4. Download SED Award PDF: calls action "GENERATE_SED_PDF" and opens returned URL in new tab
  const handleDownloadSedPdf = async () => {
    if (displayRecords.length === 0) return;
    setIsGeneratingSedPdf(true);
    try {
      const normalizedRecords = displayRecords.map((r: any) => {
        const enr = r.Enrollment_No || r.enrollmentNo || r["Enrollment No"] || "";
        const name = r.Candidate_Name || r.candidateName || r["Candidate Name"] || r.studentName || "";
        const prog = r.Programme || r.programme || r.programmeCode || "";
        const course = r.Course_Code || r.courseCode || r["Course Code"] || selectedCourse;
        const session = r.Session || r.session || currentSession;
        const subKey = r.Sub_ID || r.subId || r.submissionKey || r.id || `SUB-${enr}-${course}`;
        const rawMarks = r.Marks !== undefined && r.Marks !== "" && r.Marks !== null ? r.Marks : (r.marks !== undefined && r.marks !== null ? r.marks : null);
        const numMarks = rawMarks !== null && rawMarks !== undefined && rawMarks !== "" && !isNaN(Number(rawMarks)) ? Number(rawMarks) : null;
        const grade = r.Grade || r.grade || (numMarks !== null ? calculateIGNOUGrade(numMarks).grade : '-');
        const isLocked = Boolean(r.isLocked || r.Status === 'Locked' || r.status === 'Locked' || r.status === 'Marks Locked');
        const ev = r.Allotted_Evaluator || r.allottedEvaluator || r.evaluatorName || activeEvaluatorName;
        return {
          enrollmentNo: enr,
          Enrollment_No: enr,
          studentName: name,
          Candidate_Name: name,
          programmeCode: prog,
          Programme: prog,
          courseCode: course,
          Course_Code: course,
          session: session,
          Session: session,
          submissionKey: subKey,
          Sub_ID: subKey,
          marks: numMarks,
          Marks: numMarks,
          grade: grade,
          Grade: grade,
          marksInWords: marksToWords(numMarks, wordsStyle),
          isLocked: isLocked,
          evaluatorName: ev,
          Allotted_Evaluator: ev,
        };
      });

      const downloadUrl = await postGenerateSedPdf({
        courseCode: selectedCourse,
        session: currentSession,
        records: normalizedRecords,
        dispatchMemoNo,
        dispatchDate,
        centreCode: settings.centreCode,
      });
      if (downloadUrl) {
        window.open(downloadUrl, '_blank');
      }
    } catch (err) {
      console.error('Failed to generate SED Award PDF:', err);
    } finally {
      setIsGeneratingSedPdf(false);
    }
  };

  // Render copy header metadata
  const getCopyInfo = (type: TripartiteCopyType) => {
    switch (type) {
      case 'SED_COPY':
        return {
          title: 'SED COPY (ORIGINAL)',
          sub: 'For Student Evaluation Division (SED), IGNOU HQ',
          accent: 'border-indigo-600 text-indigo-900 bg-indigo-50/50',
          badge: 'PART - 1: SED TABULATION COPY',
        };
      case 'RC_COPY':
        return {
          title: 'REGIONAL CENTRE COPY (DUPLICATE)',
          sub: 'For Regional Evaluation Centre / Regional Director, RC-20 Kohima (Regional Centre Kohima)',
          accent: 'border-emerald-600 text-emerald-900 bg-emerald-50/50',
          badge: 'PART - 2: REGIONAL EVALUATION CENTRE COPY',
        };
      case 'SC_COPY':
        return {
          title: 'STUDY CENTRE OFFICE COPY (TRIPLICATE)',
          sub: "Retained for 2-Year Audit Record at Study Centre SC-2033 (S.D. Jain Girls' College, Dimapur)",
          accent: 'border-amber-600 text-amber-900 bg-amber-50/50',
          badge: 'PART - 3: STUDY CENTRE RECORD COPY',
        };
      default:
        return {
          title: 'SED STATUTORY COPY',
          sub: 'Student Evaluation Division Dispatch Sheet',
          accent: 'border-zinc-600 text-zinc-900 bg-zinc-50',
          badge: 'STATUTORY COPY',
        };
    }
  };

  // Printable award sheet component
  const renderSingleSheet = (copyType: 'SED_COPY' | 'RC_COPY' | 'SC_COPY') => {
    const copyMeta = getCopyInfo(copyType);

    return (
      <div
        key={copyType}
        className="bg-white border-2 border-zinc-900 rounded-xl p-6 md:p-8 shadow-sm print:border-zinc-900 print:shadow-none print:m-0 print:p-6 print:rounded-none page-break-after space-y-6"
      >
        {/* Top Copy Banner */}
        <div className="flex items-center justify-between border-b-2 border-zinc-900 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-black uppercase px-2 py-0.5 border border-zinc-900 bg-zinc-100 rounded">
              {copyMeta.badge}
            </span>
            <span className="text-xs font-bold text-zinc-800">{copyMeta.title}</span>
          </div>
          <div className="text-right text-[10px] font-mono text-zinc-600">
            DISPATCH MEMO: <span className="font-bold text-zinc-950">{dispatchMemoNo}</span>
          </div>
        </div>

        {/* Institutional University Header */}
        <div className="text-center space-y-1 pt-1">
          <h1 className="text-lg md:text-xl font-black uppercase tracking-wider text-zinc-950 font-serif">
            INDIRA GANDHI NATIONAL OPEN UNIVERSITY
          </h1>
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-800">
            STUDENT EVALUATION DIVISION (SED) • INDIRA GANDHI NATIONAL OPEN UNIVERSITY
          </p>
          <div className="text-[11px] font-semibold text-zinc-600">
            STATUTORY CONSOLIDATED ASSIGNMENT MARKS AWARD LIST (TMA / CMA)
          </div>
          <p className="text-[10px] text-zinc-500 italic">{copyMeta.sub}</p>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border border-zinc-900 p-3 rounded-lg text-xs bg-zinc-50/60 print:bg-white">
          <div>
            <span className="text-[10px] text-zinc-500 uppercase font-bold block">
              Study Centre Code & Name
            </span>
            <span className="font-mono font-black text-zinc-950 text-sm">
              {settings.centreCode || 'SC-2033'}
            </span>
            <div className="text-[10px] text-zinc-700 font-semibold">{settings.centreName || "SC-2033 (S.D. Jain Girls' College, Dimapur)"}</div>
          </div>

          <div>
            <span className="text-[10px] text-zinc-500 uppercase font-bold block">
              Regional Centre
            </span>
            <span className="font-bold text-zinc-950">
              {settings.regionalCentreCode || 'RC-20 Kohima'}
            </span>
            <div className="text-[10px] text-zinc-700 font-semibold">RC-20 Kohima (Regional Centre Kohima)</div>
          </div>

          <div>
            <span className="text-[10px] text-zinc-500 uppercase font-bold block">
              Course Code & Title
            </span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-black text-indigo-950 bg-indigo-100/70 border border-indigo-300 px-1.5 py-0.5 rounded text-xs">
                {selectedCourse}
              </span>
              <span className="font-semibold text-zinc-800 text-[11px] truncate">
                {courseMeta?.title}
              </span>
            </div>
            <div className="text-[10px] text-zinc-600">
              Prog: {courseMeta?.programmeCode} ({courseMeta?.credits} Credits)
            </div>
          </div>

          <div>
            <span className="text-[10px] text-zinc-500 uppercase font-bold block">
              Academic Term / Session
            </span>
            <span className="font-mono font-black text-zinc-950 text-sm">
              {currentSession.toUpperCase()}
            </span>
            <div className="text-[10px] text-zinc-600">
              Dispatch Date: {formatDate(dispatchDate)}
            </div>
          </div>
        </div>

        {/* Counsellor Allotment Reference */}
        <div className="flex flex-wrap items-center justify-between text-xs px-3 py-1.5 bg-zinc-100/80 border border-zinc-300 rounded font-mono">
          <div>
            <span className="text-zinc-500">Evaluator / Academic Counsellor: </span>
            <strong className="text-zinc-900">
              {activeEvaluatorName}
            </strong>
          </div>
          <div>
            <span className="text-zinc-500">Total Scripts on Sheet: </span>
            <strong className="text-zinc-950">{displayRecords.length}</strong>
          </div>
        </div>

        {/* Mobile View (< 768px): Responsive Award Sheet Cards */}
        <div className="block md:hidden space-y-3 print:hidden">
          {displayRecords.length === 0 ? (
            <div className="p-6 text-center text-zinc-500 border border-zinc-200 rounded-xl bg-zinc-50">
              <p className="font-semibold text-zinc-700 text-xs">
                No evaluation records available for {selectedCourse}
              </p>
              <p className="text-[11px] text-zinc-400 mt-1">
                {filterLockedOnly
                  ? 'Ensure marks are entered and locked by the Coordinator in Stage 2 (Course Evaluation Master).'
                  : 'No registrations exist for this course in the active cycle.'}
              </p>
            </div>
          ) : (
            displayRecords.map((rec: any, index: number) => {
              const recId = rec.id || rec.Sub_ID || rec.subId || rec.submissionKey || `award-mob-${index}`;
              const enr = rec.Enrollment_No || rec.enrollmentNo || rec["Enrollment No"] || "-";
              const name = rec.Candidate_Name || rec.candidateName || rec["Candidate Name"] || rec.studentName || "-";
              const rawMarks = rec.Marks !== undefined && rec.Marks !== "" && rec.Marks !== null ? rec.Marks : (rec.marks !== undefined && rec.marks !== null ? rec.marks : null);
              const numMarks = rawMarks !== null && rawMarks !== undefined && rawMarks !== "" && !isNaN(Number(rawMarks)) ? Number(rawMarks) : null;
              const grade = rec.Grade || rec.grade || (numMarks !== null ? calculateIGNOUGrade(numMarks).grade : '-');
              const marksWords = marksToWords(numMarks, wordsStyle);
              const subKey = rec.Sub_ID || rec.subId || rec.submissionKey || rec.id || `SUB-${enr}-${selectedCourse}`;
              const isLocked = Boolean(rec.isLocked || rec.Status === 'Locked' || rec.status === 'Locked' || rec.status === 'Marks Locked');

              return (
                <div
                  key={recId}
                  className="bg-zinc-50 border-2 border-zinc-900 rounded-xl p-3.5 space-y-2.5 shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2 border-b border-zinc-200 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-zinc-200 text-zinc-800 text-[10px] font-bold flex items-center justify-center font-mono shrink-0">
                        {index + 1}
                      </span>
                      <div>
                        <div className="font-bold text-zinc-900 text-xs">{name}</div>
                        <div className="text-[11px] font-mono text-zinc-600 font-semibold">{enr}</div>
                      </div>
                    </div>
                    <div>
                      {isLocked ? (
                        <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-900 font-mono text-[10px] font-black border border-purple-300">
                          SEALED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-mono text-[10px] font-black border border-amber-300">
                          DRAFT
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white border border-zinc-200 rounded-lg p-2">
                      <div className="text-[9px] font-bold text-zinc-500 uppercase">Marks (Max 100)</div>
                      <div className="font-mono font-black text-base text-zinc-900">
                        {numMarks !== null ? numMarks : 'AB'}
                      </div>
                    </div>
                    <div className="bg-white border border-zinc-200 rounded-lg p-2">
                      <div className="text-[9px] font-bold text-zinc-500 uppercase">Awarded Grade</div>
                      <div className="font-bold text-base">
                        <span
                          className={
                            grade === 'A'
                              ? 'text-emerald-700'
                              : grade === 'B'
                              ? 'text-blue-700'
                              : grade === 'C'
                              ? 'text-amber-700'
                              : grade === 'D'
                              ? 'text-orange-700'
                              : 'text-rose-700'
                          }
                        >
                          {grade}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-zinc-200 rounded-lg p-2 text-xs">
                    <div className="text-[9px] font-bold text-zinc-500 uppercase">Statutory Marks in Words</div>
                    <div className="font-mono font-semibold text-zinc-800 text-[11px] mt-0.5">
                      {marksWords}
                    </div>
                  </div>

                  <div className="text-[10px] font-mono text-zinc-500 truncate flex items-center justify-between pt-1">
                    <span>Key: {subKey}</span>
                    <span className="text-zinc-400 font-semibold">{selectedCourse}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Data Table (Desktop & Printable View) */}
        <div className="hidden md:block print:block overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          <table className="w-full text-left border-collapse border-2 border-zinc-900 text-xs">
            <thead>
              <tr className="bg-zinc-100 border-b-2 border-zinc-900 text-zinc-800 text-[10px] font-bold uppercase">
                <th className="border border-zinc-700 p-2 w-10 text-center">S.No</th>
                <th className="border border-zinc-700 p-2 w-32">Enrolment Number</th>
                <th className="border border-zinc-700 p-2">Candidate Name</th>
                <th className="border border-zinc-700 p-2 text-center w-24">
                  Numerical Marks <span className="block text-[9px] font-normal">(Max 100)</span>
                </th>
                <th className="border border-zinc-700 p-2 text-center w-16">Grade</th>
                <th className="border border-zinc-700 p-2">Marks in Words (Statutory Entry)</th>
                <th className="border border-zinc-700 p-2 w-36 font-mono text-[10px]">
                  Deterministic Key
                </th>
                <th className="border border-zinc-700 p-2 text-center w-24">Verification</th>
              </tr>
            </thead>
            <tbody>
              {displayRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-zinc-500 border border-zinc-700">
                    <p className="font-semibold text-zinc-700">
                      No evaluation records available for {selectedCourse}
                    </p>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      {filterLockedOnly
                        ? 'Ensure marks are entered and locked by the Coordinator in Module B (2_Course_Evaluation_Master).'
                        : 'No registrations exist for this course in the active cycle.'}
                    </p>
                  </td>
                </tr>
              ) : (
                displayRecords.map((rec: any, index: number) => {
                  const recId = rec.id || rec.Sub_ID || rec.subId || rec.submissionKey || `award-${index}`;
                  const enr = rec.Enrollment_No || rec.enrollmentNo || rec["Enrollment No"] || "-";
                  const name = rec.Candidate_Name || rec.candidateName || rec["Candidate Name"] || rec.studentName || "-";
                  const rawMarks = rec.Marks !== undefined && rec.Marks !== "" && rec.Marks !== null ? rec.Marks : (rec.marks !== undefined && rec.marks !== null ? rec.marks : null);
                  const numMarks = rawMarks !== null && rawMarks !== undefined && rawMarks !== "" && !isNaN(Number(rawMarks)) ? Number(rawMarks) : null;
                  const grade = rec.Grade || rec.grade || (numMarks !== null ? calculateIGNOUGrade(numMarks).grade : '-');
                  const marksWords = marksToWords(numMarks, wordsStyle);
                  const subKey = rec.Sub_ID || rec.subId || rec.submissionKey || rec.id || `SUB-${enr}-${selectedCourse}`;
                  const isLocked = Boolean(rec.isLocked || rec.Status === 'Locked' || rec.status === 'Locked' || rec.status === 'Marks Locked');

                  return (
                    <tr key={recId} className="border-b border-zinc-400 hover:bg-zinc-50/50">
                      <td className="border border-zinc-400 p-2 text-center font-mono text-zinc-700">
                        {index + 1}
                      </td>
                      <td className="border border-zinc-400 p-2 font-mono font-bold text-zinc-950 text-xs">
                        {enr}
                      </td>
                      <td className="border border-zinc-400 p-2 font-semibold text-zinc-900">
                        {name}
                      </td>
                      <td className="border border-zinc-400 p-2 text-center font-mono font-black text-sm text-zinc-950 bg-zinc-50/50">
                        {numMarks !== null ? numMarks : 'AB'}
                      </td>
                      <td className="border border-zinc-400 p-2 text-center font-bold">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[11px] ${
                            grade === 'A'
                              ? 'text-emerald-800'
                              : grade === 'B'
                              ? 'text-blue-800'
                              : grade === 'C'
                              ? 'text-amber-800'
                              : grade === 'D'
                              ? 'text-orange-800'
                              : 'text-rose-800'
                          } font-bold`}
                        >
                          {grade}
                        </span>
                      </td>
                      <td className="border border-zinc-400 p-2 font-mono text-xs font-semibold text-zinc-900">
                        {marksWords}
                      </td>
                      <td className="border border-zinc-400 p-2 font-mono text-[10px] text-zinc-600 truncate max-w-[140px]">
                        {subKey}
                      </td>
                      <td className="border border-zinc-400 p-2 text-center text-[10px] font-bold">
                        {isLocked ? (
                          <span className="text-purple-800 font-mono font-black">SEALED</span>
                        ) : (
                          <span className="text-amber-700 font-mono font-bold">DRAFT</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Aggregate Script Count Banner */}
        <div className="flex flex-wrap items-center justify-between border-t-2 border-b-2 border-zinc-900 py-2.5 px-3 text-xs bg-zinc-50 font-bold">
          <div>
            <span>TOTAL ASSIGNMENT SCRIPTS AWARDED: </span>
            <span className="font-mono text-sm text-indigo-950 ml-1">
              {displayRecords.length}
            </span>{' '}
            <span className="text-zinc-500 font-normal">
              ({displayRecords.length > 0 ? marksToWords(displayRecords.length) : 'Zero Only'})
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span>Pass (A-D): {displayRecords.filter((r: any) => {
              const rawM = r.Marks !== undefined && r.Marks !== "" && r.Marks !== null ? r.Marks : r.marks;
              const numM = rawM !== null && rawM !== undefined && rawM !== "" && !isNaN(Number(rawM)) ? Number(rawM) : null;
              const g = r.Grade || r.grade || (numM !== null ? calculateIGNOUGrade(numM).grade : '-');
              return g !== 'E' && g !== '-' && g !== '—';
            }).length}</span>
            <span>Failed (E): {displayRecords.filter((r: any) => {
              const rawM = r.Marks !== undefined && r.Marks !== "" && r.Marks !== null ? r.Marks : r.marks;
              const numM = rawM !== null && rawM !== undefined && rawM !== "" && !isNaN(Number(rawM)) ? Number(rawM) : null;
              const g = r.Grade || r.grade || (numM !== null ? calculateIGNOUGrade(numM).grade : '-');
              return g === 'E';
            }).length}</span>
            <span>Absent (AB): {displayRecords.filter((r: any) => {
              const rawM = r.Marks !== undefined && r.Marks !== "" && r.Marks !== null ? r.Marks : r.marks;
              return rawM === null || rawM === undefined || rawM === "" || String(rawM).toUpperCase() === 'AB';
            }).length}</span>
          </div>
        </div>

        {/* Statutory Formal Sign-Off Footer */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 text-xs">
          {/* Column 1: Academic Counsellor Undertaking */}
          <div className="border border-zinc-300 p-3 rounded-lg flex flex-col justify-between space-y-4">
            <div>
              <div className="text-[10px] font-bold uppercase text-zinc-500">
                1. Academic Evaluator / Approved Academic Counsellor
              </div>
              <p className="text-[10px] text-zinc-600 mt-1 leading-relaxed">
                Certified that the assignment responses have been evaluated by me strictly as per
                prescribed IGNOU evaluation parameters and marking keys.
              </p>
            </div>
            <div className="border-t border-dashed border-zinc-400 pt-2 text-center">
              <div className="font-semibold text-zinc-900">
                {activeEvaluatorName}
              </div>
              <div className="text-[10px] text-zinc-500 font-mono">
                {activeEvaluatorObj?.evaluatorCode ? `Code: ${activeEvaluatorObj.evaluatorCode}` : 'Approved IGNOU Academic Counsellor'}
              </div>
            </div>
          </div>

          {/* Column 2: Study Centre Verification & Seal */}
          <div className="border border-zinc-300 p-3 rounded-lg flex flex-col justify-between space-y-4">
            <div>
              <div className="text-[10px] font-bold uppercase text-zinc-500">
                2. Study Centre Verification & Seal
              </div>
              <p className="text-[10px] text-zinc-600 mt-1 leading-relaxed">
                Cross-verified with physical scripts & Intake Register. Transcribed verbatim into SED
                Master.
              </p>
            </div>
            <div className="border-t border-dashed border-zinc-400 pt-2 text-center">
              <div className="font-serif italic text-indigo-900 font-bold text-sm">
                {settings.coordinatorName || 'Dr. Sant Kumar Gupta'}
              </div>
              <div className="font-bold text-[11px] text-zinc-900">{settings.coordinatorDesignation || 'Coordinator, IGNOU SC-2033'}</div>
              <div className="text-[10px] font-mono text-zinc-600 font-semibold">
                SC-2033 (S.D. Jain Girls' College, Dimapur)
              </div>
            </div>
          </div>

          {/* Column 3: Regional Centre Inward Acknowledgment */}
          <div className="border border-zinc-300 p-3 rounded-lg flex flex-col justify-between space-y-4">
            <div>
              <div className="text-[10px] font-bold uppercase text-zinc-500">
                3. Regional Evaluation Inward
              </div>
              <p className="text-[10px] text-zinc-600 mt-1 leading-relaxed">
                Received in sealed envelope with intact institutional seal. Forwarded to SED Division
                for grade card update.
              </p>
            </div>
            <div className="border-t border-dashed border-zinc-400 pt-2 text-center">
              <div className="h-6"></div>
              <div className="font-bold text-[11px] text-zinc-900">
                Regional Director / AR (SED)
              </div>
              <div className="text-[10px] font-mono text-zinc-500">Date Stamp & Receipt No.</div>
            </div>
          </div>
        </div>

        {/* Bottom Dispatch Stamp Bar */}
        <div className="text-center text-[10px] text-zinc-500 border-t border-zinc-200 pt-2 font-mono">
          GENERATED BY IGNOU SC-2033 AUTOMATED SED ENGINE • CYCLE: {currentSession.toUpperCase()} • MEMO:{' '}
          {dispatchMemoNo} • DATE: {formatDate(dispatchDate)}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Module C Top Control Panel */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-indigo-100 text-indigo-800 text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                Stage 3
              </span>
              <span className="text-xs text-zinc-500 font-mono">
                Regional_Centre_SED_Award_Sheet_Generator
              </span>
              <span className="text-zinc-300">•</span>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                Cycle: {currentSession}
              </span>
            </div>
            <h2 className="text-xl font-black text-zinc-900 tracking-tight">
              Statutory 3-Part Regional Centre SED Award Sheet Generator
            </h2>
            <p className="text-xs text-zinc-600 mt-1 max-w-2xl">
              Generates tripartite dispatch award lists for IGNOU Student Evaluation Division (SED
              Original Copy, Regional Centre Duplicate, and Study Centre Office Copy) with marks in
              words and statutory coordinator certification.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              id="btn-download-sed-pdf"
              onClick={handleDownloadSedPdf}
              disabled={displayRecords.length === 0 || isGeneratingSedPdf}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              title="Download SED Award PDF via Google Sheets GENERATE_SED_PDF"
            >
              {isGeneratingSedPdf ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Generating SED PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Download SED Award PDF</span>
                </>
              )}
            </button>

            <button
              onClick={handleExportCSV}
              disabled={displayRecords.length === 0}
              className="px-3.5 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
              title="Export SED Tabulation Sheet to CSV"
            >
              <Download className="w-3.5 h-3.5 text-zinc-600" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => window.print()}
              disabled={displayRecords.length === 0}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Award Sheet</span>
            </button>
          </div>
        </div>

        {/* Filter & Configuration Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 mt-6 pt-5 border-t border-zinc-100">
          {/* Course Selector */}
          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
              Select Course Code
            </label>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs font-bold text-zinc-900 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {distinctCourses.map(([c, data]) => (
                <option key={c} value={c}>
                  {c} ({data.count} scripts • {data.lockedCount} locked)
                </option>
              ))}
            </select>
          </div>

          {/* Academic Counsellor Dynamic Selector */}
          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
              Academic Counsellor
            </label>
            <select
              value={activeEvaluatorName}
              onChange={(e) => setOverrideEvaluator(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs font-bold text-zinc-900 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              title="Dynamic Academic Counsellor from Course Ledger or Evaluator Master"
            >
              {detectedEvaluator !== 'Not Allotted' && (
                <option value={detectedEvaluator}>
                  {detectedEvaluator} (From Course Ledger)
                </option>
              )}
              <option value="Academic Evaluation Panel">Academic Evaluation Panel (Default)</option>
              {evaluators.map((ev) => {
                const val = `${ev.evaluatorName || ev.name} (${ev.evaluatorCode})`;
                return (
                  <option key={ev.evaluatorCode || ev.id} value={val}>
                    {ev.evaluatorName || ev.name} ({ev.evaluatorCode})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Tripartite Copy Selector */}
          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
              Statutory 3-Part Copy
            </label>
            <select
              value={selectedCopy}
              onChange={(e) => setSelectedCopy(e.target.value as TripartiteCopyType)}
              className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs font-bold text-zinc-900 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="SED_COPY">Part 1: SED Copy (Original Tabulation)</option>
              <option value="RC_COPY">Part 2: Evaluation Centre / RC Copy</option>
              <option value="SC_COPY">Part 3: Study Centre Office Record</option>
              <option value="ALL_THREE">Print Complete Set (All 3 Copies)</option>
            </select>
          </div>

          {/* Marks in Words Style */}
          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
              Marks in Words Style
            </label>
            <select
              value={wordsStyle}
              onChange={(e) => setWordsStyle(e.target.value as 'cardinal' | 'digits')}
              className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs font-medium text-zinc-900 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="cardinal">Standard: "Seventy-Four Only"</option>
              <option value="digits">Digit Style: "Seven Four Only"</option>
            </select>
          </div>

          {/* Dispatch Memo Number */}
          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
              Dispatch Memo Ref
            </label>
            <input
              type="text"
              value={dispatchMemoNo}
              onChange={(e) => setDispatchMemoNo(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-1.5 text-xs font-mono font-medium text-zinc-900 focus:ring-2 focus:ring-indigo-500"
              placeholder="Memo reference"
            />
          </div>

          {/* Dispatch Date */}
          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
              Dispatch Date
            </label>
            <input
              type="date"
              value={dispatchDate}
              onChange={(e) => setDispatchDate(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-1.5 text-xs font-mono text-zinc-900 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Secondary Filter & Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-zinc-100">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Locked vs All Toggle */}
            <label className="flex items-center gap-2 text-xs font-medium text-zinc-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={filterLockedOnly}
                onChange={(e) => setFilterLockedOnly(e.target.checked)}
                className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span>Statutory Filter: Include Verified & Locked Scripts Only</span>
            </label>

            {courseStats.unlocked > 0 && filterLockedOnly && (
              <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded flex items-center gap-1 font-medium">
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                <span>
                  {courseStats.unlocked} script(s) still unverified/unlocked (excluded from formal
                  award sheet)
                </span>
              </span>
            )}
          </div>

          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search enrolment / name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1 bg-zinc-50 border border-zinc-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Tripartite Sheet Display Container */}
      <div className="space-y-8">
        {selectedCopy === 'ALL_THREE' ? (
          <>
            {renderSingleSheet('SED_COPY')}
            {renderSingleSheet('RC_COPY')}
            {renderSingleSheet('SC_COPY')}
          </>
        ) : (
          renderSingleSheet(selectedCopy)
        )}
      </div>
    </div>
  );
};
