import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { IGNOU_PROGRAMMES } from '../data/ignouMasterData';
import { isPracticalCourse } from '../utils/helpers';
import {
  BarChart3,
  Users,
  FileCheck2,
  CheckCircle2,
  Clock,
  Layers,
  Filter,
  Download,
  Printer,
  Search,
  BookOpen,
  PieChart,
  ArrowUpDown,
  ChevronRight,
  Sparkles,
  FlaskConical,
} from 'lucide-react';
import { AssignmentIntakePrintModal } from './AssignmentIntakePrintModal';

export type MatrixGrouping = 'PROGRAMME' | 'COURSE' | 'OVERALL';

interface MatrixRow {
  sNo: number;
  key: string;
  programmeOrTitle: string;
  programmeCode: string;
  department?: string;
  candidatesCount: number;
  totalIntake: number;
  pendingCount: number;
  allottedCount: number;
  evaluatedCount: number;
  lockedCount: number;
  status: string;
  statusColor: string;
  enrolledCourses: { code: string; count: number; title?: string }[];
}

// Component filter type for Status Matrix
export type MatrixComponentFilter = 'TMA' | 'PRACTICAL' | 'ALL';

// Helper to safely extract course code strings from any record representation
const getRecordCourses = (r: any): string[] => {
  if (!r) return [];
  const raw = r.courseCodes || r.courses || r.Courses;
  if (Array.isArray(raw)) {
    return raw.map((c: any) => String(c || '').trim().toUpperCase()).filter(Boolean);
  }
  if (typeof raw === 'string') {
    return raw.split(',').map((c: string) => c.trim().toUpperCase()).filter(Boolean);
  }
  return [];
};

// Helper to filter courses by component type (TMA vs Practical vs All)
const getRecordFilteredCourses = (r: any, filter: MatrixComponentFilter): string[] => {
  const allCourses = getRecordCourses(r);
  if (filter === 'ALL') return allCourses;

  const pracCourses = new Set(
    (r.practicalCourses || []).map((c: string) => String(c).trim().toUpperCase())
  );
  const assignCourses = new Set(
    (r.assignmentCourses || []).map((c: string) => String(c).trim().toUpperCase())
  );

  return allCourses.filter((code) => {
    const isExplicitPrac = pracCourses.has(code);
    const isExplicitAssign = assignCourses.has(code);
    const isPracCourse = isPracticalCourse(code);

    if (filter === 'PRACTICAL') {
      if (isExplicitPrac) return true;
      if (!isExplicitAssign && isPracCourse) return true;
      return false;
    } else {
      // TMA (Assignment) - default for all students
      if (isExplicitAssign) return true;
      if (isExplicitPrac) return false;
      return !isPracCourse;
    }
  });
};

export const IntakeStatusMatrix: React.FC = () => {
  const { currentSession, sessionIntakes = [], sessionPackets = [] } = useApp();

  // Option in the beginning: TMA (All students default) vs Practical (Few students) vs All Components
  const [componentFilter, setComponentFilter] = useState<MatrixComponentFilter>('TMA');
  const [grouping, setGrouping] = useState<MatrixGrouping>('PROGRAMME');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  // Safe non-null session intakes list
  const safeSessionIntakes = useMemo(() => {
    return (sessionIntakes || []).filter((r): r is NonNullable<typeof r> => Boolean(r));
  }, [sessionIntakes]);

  // Intake records filtered by component (TMA vs Practical)
  const filteredSessionIntakes = useMemo(() => {
    if (componentFilter === 'ALL') return safeSessionIntakes;
    return safeSessionIntakes.filter((r) => getRecordFilteredCourses(r, componentFilter).length > 0);
  }, [safeSessionIntakes, componentFilter]);

  // Summary Metrics calculations based on selected component
  const totalCandidates = useMemo(() => {
    return new Set(
      filteredSessionIntakes.map((r) =>
        String(r?.enrollmentNo || (r as any)?.Enrollment_No || (r as any)?.studentId || '').trim()
      ).filter(Boolean)
    ).size;
  }, [filteredSessionIntakes]);

  const totalCourseScripts = useMemo(() => {
    return filteredSessionIntakes.reduce(
      (acc, r) => acc + getRecordFilteredCourses(r, componentFilter).length,
      0
    );
  }, [filteredSessionIntakes, componentFilter]);

  const totalAllotted = useMemo(() => {
    return (sessionPackets || [])
      .filter((p) => {
        if (!p || p.evaluatorId === null) return false;
        if (componentFilter === 'ALL') return true;
        const cCode = String(p.courseCode || '').trim().toUpperCase();
        const isPrac = isPracticalCourse(cCode);
        return componentFilter === 'PRACTICAL' ? isPrac : !isPrac;
      })
      .reduce((acc, p) => acc + (p.scriptCount || 0), 0);
  }, [sessionPackets, componentFilter]);

  const totalEvaluated = useMemo(() => {
    let evalCount = 0;
    filteredSessionIntakes.forEach((r) => {
      if (!r) return;
      const courses = getRecordFilteredCourses(r, componentFilter);
      courses.forEach((c) => {
        if (r.marks && r.marks[c] !== null && r.marks[c] !== undefined && !isNaN(Number(r.marks[c]))) {
          evalCount++;
        }
      });
    });
    // Check packets marked Evaluated as secondary check
    const packetEval = (sessionPackets || [])
      .filter((p) => {
        if (!p || (p.status !== 'Evaluated' && p.status !== 'Archived')) return false;
        if (componentFilter === 'ALL') return true;
        const cCode = String(p.courseCode || '').trim().toUpperCase();
        const isPrac = isPracticalCourse(cCode);
        return componentFilter === 'PRACTICAL' ? isPrac : !isPrac;
      })
      .reduce((acc, p) => acc + (p.scriptCount || 0), 0);
    return Math.max(evalCount, Math.min(packetEval, totalCourseScripts));
  }, [filteredSessionIntakes, sessionPackets, totalCourseScripts, componentFilter]);

  const totalLocked = useMemo(() => {
    let locked = 0;
    filteredSessionIntakes.forEach((r) => {
      if (!r) return;
      if (r.status === 'Marks Uploaded' || (r.status as any) === 'Locked' || (r as any).isLocked) {
        locked += getRecordFilteredCourses(r, componentFilter).length;
      }
    });
    return locked;
  }, [filteredSessionIntakes, componentFilter]);

  const pendingAllotment = useMemo(() => {
    return Math.max(0, totalCourseScripts - totalAllotted);
  }, [totalCourseScripts, totalAllotted]);

  const evaluatedPercentage = useMemo(() => {
    if (totalCourseScripts === 0) return '0.0%';
    return `${((totalEvaluated / totalCourseScripts) * 100).toFixed(1)}%`;
  }, [totalEvaluated, totalCourseScripts]);

  // Build matrix rows according to active grouping and componentFilter
  const matrixData = useMemo<MatrixRow[]>(() => {
    if (grouping === 'PROGRAMME') {
      // Group by Programme
      const progCodes = Array.from(
        new Set([
          ...filteredSessionIntakes.map((r) => String(r?.programmeCode || (r as any)?.Programme || '').trim().toUpperCase()).filter(Boolean),
          ...IGNOU_PROGRAMMES.map((p) => p.code.toUpperCase()),
        ])
      );

      const rows: MatrixRow[] = [];
      let sNo = 1;

      progCodes.forEach((pCode) => {
        const progMaster = IGNOU_PROGRAMMES.find((p) => p.code.toUpperCase() === pCode);
        const progIntakes = filteredSessionIntakes.filter(
          (r) => String(r?.programmeCode || (r as any)?.Programme || '').trim().toUpperCase() === pCode
        );
        const totalIntake = progIntakes.reduce(
          (acc, r) => acc + getRecordFilteredCourses(r, componentFilter).length,
          0
        );

        // Only show programmes with submissions or if no submissions at all, show master list
        if (totalIntake === 0 && filteredSessionIntakes.length > 0) return;

        const candidates = new Set(
          progIntakes.map((r) => String(r?.enrollmentNo || (r as any)?.Enrollment_No || '').trim()).filter(Boolean)
        ).size;

        // Allotted scripts
        const allotted = (sessionPackets || [])
          .filter((p) => {
            if (!p || String(p.programmeCode || '').toUpperCase() !== pCode || p.evaluatorId === null) return false;
            if (componentFilter === 'ALL') return true;
            const cCode = String(p.courseCode || '').trim().toUpperCase();
            const isPrac = isPracticalCourse(cCode);
            return componentFilter === 'PRACTICAL' ? isPrac : !isPrac;
          })
          .reduce((acc, p) => acc + (p.scriptCount || 0), 0);

        // Evaluated scripts
        let evaluated = 0;
        progIntakes.forEach((r) => {
          if (!r) return;
          const courses = getRecordFilteredCourses(r, componentFilter);
          courses.forEach((c) => {
            if (r.marks && r.marks[c] !== null && r.marks[c] !== undefined && !isNaN(Number(r.marks[c]))) {
              evaluated++;
            }
          });
        });

        // Locked scripts
        let locked = 0;
        progIntakes.forEach((r) => {
          if (!r) return;
          if (r.status === 'Marks Uploaded' || (r.status as any) === 'Locked' || (r as any).isLocked) {
            locked += getRecordFilteredCourses(r, componentFilter).length;
          }
        });

        const pending = Math.max(0, totalIntake - allotted);

        // Enrolled courses breakdown
        const courseCountMap: Record<string, number> = {};
        progIntakes.forEach((r) => {
          if (!r) return;
          const courses = getRecordFilteredCourses(r, componentFilter);
          courses.forEach((c) => {
            courseCountMap[c] = (courseCountMap[c] || 0) + 1;
          });
        });

        const enrolledCourses = Object.entries(courseCountMap).map(([code, count]) => {
          const cMaster = progMaster?.courses?.find((c) => (c?.code || '').toUpperCase() === (code || '').toUpperCase());
          return { code, count, title: cMaster?.title };
        });

        // Determine status
        let status = 'Intake Active';
        let statusColor = 'bg-blue-100 text-blue-800';

        if (totalIntake === 0) {
          status = 'No Submissions';
          statusColor = 'bg-zinc-100 text-zinc-500';
        } else if (locked >= totalIntake && totalIntake > 0) {
          status = 'Marks Uploaded';
          statusColor = 'bg-emerald-100 text-emerald-800';
        } else if (evaluated >= totalIntake && totalIntake > 0) {
          status = 'Evaluated (100%)';
          statusColor = 'bg-teal-100 text-teal-800';
        } else if (allotted >= totalIntake && totalIntake > 0) {
          status = 'Fully Allotted';
          statusColor = 'bg-indigo-100 text-indigo-800';
        } else if (allotted > 0) {
          status = 'Partially Allotted';
          statusColor = 'bg-amber-100 text-amber-800';
        }

        rows.push({
          sNo: sNo++,
          key: pCode,
          programmeOrTitle: `${pCode} — ${progMaster ? progMaster.name : 'Programme Master'}`,
          programmeCode: pCode,
          department: progMaster?.department,
          candidatesCount: candidates,
          totalIntake,
          pendingCount: pending,
          allottedCount: Math.min(allotted, totalIntake),
          evaluatedCount: Math.min(evaluated, totalIntake),
          lockedCount: Math.min(locked, totalIntake),
          status,
          statusColor,
          enrolledCourses,
        });
      });

      return rows;
    } else if (grouping === 'COURSE') {
      // Group by Course Code
      const courseMap: Record<
        string,
        {
          candidates: Set<string>;
          intakesCount: number;
          evaluatedCount: number;
          lockedCount: number;
          programmeCode: string;
        }
      > = {};

      filteredSessionIntakes.forEach((r) => {
        if (!r) return;
        const pCode = String(r?.programmeCode || (r as any)?.Programme || '').trim().toUpperCase();
        const courses = getRecordFilteredCourses(r, componentFilter);
        const enr = String(r?.enrollmentNo || (r as any)?.Enrollment_No || '').trim();
        courses.forEach((cCode) => {
          if (!courseMap[cCode]) {
            courseMap[cCode] = {
              candidates: new Set(),
              intakesCount: 0,
              evaluatedCount: 0,
              lockedCount: 0,
              programmeCode: pCode,
            };
          }
          if (enr) courseMap[cCode].candidates.add(enr);
          courseMap[cCode].intakesCount++;
          if (r.marks && r.marks[cCode] !== null && r.marks[cCode] !== undefined && !isNaN(Number(r.marks[cCode]))) {
            courseMap[cCode].evaluatedCount++;
          }
          if (r.status === 'Marks Uploaded' || (r.status as any) === 'Locked' || (r as any).isLocked) {
            courseMap[cCode].lockedCount++;
          }
        });
      });

      const rows: MatrixRow[] = [];
      let sNo = 1;

      Object.entries(courseMap).forEach(([cCode, stats]) => {
        // Look up course title in master catalog
        let title = '';
        IGNOU_PROGRAMMES.forEach((p) => {
          const c = p.courses?.find((item) => (item?.code || '').toUpperCase() === (cCode || '').toUpperCase());
          if (c) title = c.title;
        });

        // Check packet allotment
        const packet = (sessionPackets || []).find((p) => p && String(p.courseCode || '').toUpperCase() === cCode.toUpperCase());
        const allotted = packet && packet.evaluatorId ? (packet.scriptCount || 0) : 0;
        const pending = Math.max(0, stats.intakesCount - allotted);

        let status = 'Intake Open';
        let statusColor = 'bg-blue-100 text-blue-800';
        if (stats.lockedCount >= stats.intakesCount && stats.intakesCount > 0) {
          status = 'Marks Uploaded';
          statusColor = 'bg-emerald-100 text-emerald-800';
        } else if (stats.evaluatedCount >= stats.intakesCount && stats.intakesCount > 0) {
          status = 'Evaluated';
          statusColor = 'bg-teal-100 text-teal-800';
        } else if (allotted > 0) {
          status = 'Allotted in Packet';
          statusColor = 'bg-indigo-100 text-indigo-800';
        }

        const isPrac = isPracticalCourse(cCode);
        const compTag = isPrac ? ' [Practical]' : ' [TMA]';

        rows.push({
          sNo: sNo++,
          key: cCode,
          programmeOrTitle: `${cCode}${compTag}: ${title || 'Curriculum Course'} (${stats.programmeCode})`,
          programmeCode: stats.programmeCode,
          candidatesCount: stats.candidates.size,
          totalIntake: stats.intakesCount,
          pendingCount: pending,
          allottedCount: Math.min(allotted, stats.intakesCount),
          evaluatedCount: Math.min(stats.evaluatedCount, stats.intakesCount),
          lockedCount: Math.min(stats.lockedCount, stats.intakesCount),
          status,
          statusColor,
          enrolledCourses: [{ code: cCode, count: stats.intakesCount, title }],
        });
      });

      return rows;
    } else {
      // Overall Total (Single consolidated summary row + programme distribution)
      const allDistinctCourses: Record<string, number> = {};
      filteredSessionIntakes.forEach((r) => {
        if (!r) return;
        const courses = getRecordFilteredCourses(r, componentFilter);
        courses.forEach((c) => {
          allDistinctCourses[c] = (allDistinctCourses[c] || 0) + 1;
        });
      });

      const enrolledCourses = Object.entries(allDistinctCourses).map(([code, count]) => ({
        code,
        count,
      }));

      const filterLabel =
        componentFilter === 'TMA'
          ? 'TMA (ASSIGNMENTS ONLY)'
          : componentFilter === 'PRACTICAL'
          ? 'PRACTICAL (LAB / VIVA ONLY)'
          : 'ALL COMPONENTS (TMA + PRACTICAL)';

      return [
        {
          sNo: 1,
          key: 'ALL-OVERALL',
          programmeOrTitle: `ALL PROGRAMMES CONSOLIDATED • ${filterLabel} (Study Centre SC-2033 • ${currentSession})`,
          programmeCode: 'CENTRE-WIDE',
          department: 'Consolidated Academic Operations',
          candidatesCount: totalCandidates,
          totalIntake: totalCourseScripts,
          pendingCount: pendingAllotment,
          allottedCount: Math.min(totalAllotted, totalCourseScripts),
          evaluatedCount: totalEvaluated,
          lockedCount: totalLocked,
          status: `${evaluatedPercentage} Evaluated`,
          statusColor: 'bg-emerald-100 text-emerald-800',
          enrolledCourses,
        },
      ];
    }
  }, [
    grouping,
    componentFilter,
    filteredSessionIntakes,
    sessionPackets,
    totalCandidates,
    totalCourseScripts,
    totalAllotted,
    totalEvaluated,
    totalLocked,
    pendingAllotment,
    evaluatedPercentage,
    currentSession,
  ]);

  // Filtered by search query & status
  const filteredRows = useMemo(() => {
    return matrixData.filter((row) => {
      if (!row) return false;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        (row.programmeOrTitle && row.programmeOrTitle.toLowerCase().includes(q)) ||
        (row.programmeCode && row.programmeCode.toLowerCase().includes(q)) ||
        (Array.isArray(row.enrolledCourses) &&
          row.enrolledCourses.some((c) => c && c.code && c.code.toLowerCase().includes(q)));

      const matchesStatus =
        selectedStatusFilter === 'ALL' ||
        (selectedStatusFilter === 'PENDING' && row.pendingCount > 0) ||
        (selectedStatusFilter === 'ALLOTTED' && row.allottedCount > 0) ||
        (selectedStatusFilter === 'EVALUATED' && row.evaluatedCount > 0);

      return Boolean(matchesQuery && matchesStatus);
    });
  }, [matrixData, searchQuery, selectedStatusFilter]);

  // Export Matrix as CSV
  const handleExportCSV = () => {
    const headers = [
      'S.No',
      'Programme / Course',
      'Programme Code',
      'Candidates',
      'Assignment Intake (Total)',
      'Pending',
      'Allotted',
      'Evaluated',
      'Locked',
      'Status',
      'Enrolled Courses',
    ];

    const rows = filteredRows.map((r) => [
      r.sNo,
      `"${r.programmeOrTitle || ''}"`,
      r.programmeCode || '',
      r.candidatesCount || 0,
      r.totalIntake || 0,
      r.pendingCount || 0,
      r.allottedCount || 0,
      r.evaluatedCount || 0,
      r.lockedCount || 0,
      `"${r.status || ''}"`,
      `"${(r.enrolledCourses || []).map((c) => `${c?.code || ''} (${c?.count || 0})`).join(', ')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `IGNOU_SC2033_Intake_Matrix_${componentFilter}_${currentSession.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Component Mode Selector in the beginning: TMA (Assignment) vs Practical vs All */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-3 sm:p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${
              componentFilter === 'TMA'
                ? 'bg-indigo-50 text-indigo-700'
                : componentFilter === 'PRACTICAL'
                ? 'bg-purple-50 text-purple-700'
                : 'bg-zinc-100 text-zinc-800'
            }`}>
              {componentFilter === 'PRACTICAL' ? (
                <FlaskConical className="w-5 h-5 text-purple-700" />
              ) : (
                <FileCheck2 className="w-5 h-5 text-indigo-700" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black uppercase tracking-wider text-zinc-900">
                  Select Component (In the Beginning):
                </span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  componentFilter === 'TMA'
                    ? 'bg-indigo-100 text-indigo-900'
                    : componentFilter === 'PRACTICAL'
                    ? 'bg-purple-100 text-purple-900'
                    : 'bg-zinc-200 text-zinc-900'
                }`}>
                  {componentFilter === 'TMA'
                    ? 'Assignment (TMA) Active — All Students'
                    : componentFilter === 'PRACTICAL'
                    ? 'Practical (Lab/Viva) Active — Few Students'
                    : 'All Components Active (TMA + Practical)'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                All students submit their Assignment (TMA) only, while few students submit Practical. Select option to filter matrix counts and course status.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-zinc-100 p-1 rounded-xl border border-zinc-200 self-start sm:self-auto shadow-2xs">
            <button
              type="button"
              id="matrix-filter-tma-btn"
              onClick={() => setComponentFilter('TMA')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                componentFilter === 'TMA'
                  ? 'bg-indigo-600 text-white shadow-xs font-black'
                  : 'text-zinc-700 hover:text-zinc-950 hover:bg-zinc-200/60'
              }`}
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Assignment (TMA)</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                componentFilter === 'TMA' ? 'bg-indigo-700 text-white' : 'bg-zinc-200 text-zinc-700'
              }`}>
                All Students
              </span>
            </button>

            <button
              type="button"
              id="matrix-filter-practical-btn"
              onClick={() => setComponentFilter('PRACTICAL')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                componentFilter === 'PRACTICAL'
                  ? 'bg-purple-700 text-white shadow-xs font-black'
                  : 'text-purple-900 hover:text-purple-950 hover:bg-purple-100/60'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5 text-purple-300" />
              <span>Practical</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                componentFilter === 'PRACTICAL' ? 'bg-purple-800 text-white' : 'bg-purple-100 text-purple-800'
              }`}>
                Few Students
              </span>
            </button>

            <button
              type="button"
              id="matrix-filter-all-btn"
              onClick={() => setComponentFilter('ALL')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                componentFilter === 'ALL'
                  ? 'bg-zinc-900 text-white shadow-xs font-black'
                  : 'text-zinc-700 hover:text-zinc-950 hover:bg-zinc-200/60'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All Components</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Summary Cards on Top */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Candidates */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-zinc-500 font-semibold text-xs uppercase tracking-wider">
              Total Candidates
            </span>
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-700">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-zinc-950">
              {totalCandidates}
            </span>
            <span className="text-[11px] font-bold text-zinc-400">Enrolled Students</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">Unique learners with scripts in {currentSession}</p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600"></div>
        </div>

        {/* Card 2: Total Course Scripts */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-zinc-500 font-semibold text-xs uppercase tracking-wider">
              Total Course Scripts
            </span>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <FileCheck2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-zinc-950">
              {totalCourseScripts}
            </span>
            <span className="text-[11px] font-bold text-amber-800">Physical Scripts</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">Across all registered programmes</p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500"></div>
        </div>

        {/* Card 3: Evaluated % */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-zinc-500 font-semibold text-xs uppercase tracking-wider">
              Evaluated %
            </span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-950">
              {evaluatedPercentage}
            </span>
            <span className="text-[11px] font-bold text-zinc-500">
              ({totalEvaluated}/{totalCourseScripts})
            </span>
          </div>
          <div className="w-full bg-zinc-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-emerald-600 h-1.5 rounded-full transition-all duration-500"
              style={{
                width:
                  totalCourseScripts > 0
                    ? `${(totalEvaluated / totalCourseScripts) * 100}%`
                    : '0%',
              }}
            ></div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-600"></div>
        </div>

        {/* Card 4: Pending Allotment */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-zinc-500 font-semibold text-xs uppercase tracking-wider">
              Pending Allotment
            </span>
            <span className="p-2 rounded-xl bg-rose-50 text-rose-700">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-rose-950">
              {pendingAllotment}
            </span>
            <span className="text-[11px] font-bold text-zinc-400">Scripts Awaiting Packets</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">
            {totalAllotted} already dispatched to evaluators
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-rose-500"></div>
        </div>
      </div>

      {/* Analytics Tracking Table Container */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xs overflow-hidden">
        {/* Matrix Header & Controls Bar */}
        <div className="p-5 border-b border-zinc-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-700" />
              <h3 className="font-bold text-zinc-950 text-base">
                Assignment Status Analytics & Intake Matrix
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-900 uppercase">
                Real-Time Aggregated
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Live aggregated assignment intake matrix for academic cycle{' '}
              <strong className="text-zinc-900 font-bold">{currentSession}</strong>.
            </p>
          </div>

          {/* Grouping View Toggles: Programme-wise | Course-code wise | Overall Total */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center p-1 bg-zinc-100 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setGrouping('PROGRAMME')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  grouping === 'PROGRAMME'
                    ? 'bg-white text-zinc-950 shadow-xs font-black'
                    : 'text-zinc-600 hover:text-zinc-950'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-indigo-700" />
                <span>Programme-wise</span>
              </button>

              <button
                type="button"
                onClick={() => setGrouping('COURSE')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  grouping === 'COURSE'
                    ? 'bg-white text-zinc-950 shadow-xs font-black'
                    : 'text-zinc-600 hover:text-zinc-950'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-700" />
                <span>Course-code wise</span>
              </button>

              <button
                type="button"
                onClick={() => setGrouping('OVERALL')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  grouping === 'OVERALL'
                    ? 'bg-white text-zinc-950 shadow-xs font-black'
                    : 'text-zinc-600 hover:text-zinc-950'
                }`}
              >
                <PieChart className="w-3.5 h-3.5 text-emerald-700" />
                <span>Overall Total</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-1.5 rounded-xl border border-zinc-300 text-zinc-700 hover:bg-zinc-100 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Export Current Matrix as CSV"
            >
              <Download className="w-3.5 h-3.5 text-zinc-500" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              id="btn-print-intake-matrix-report"
              onClick={() => setIsPrintModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Print Programme-wise Assignment Intake Report for Regional Office (RC-20 Kohima)"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Report to Regional Office</span>
            </button>
          </div>
        </div>

        {/* Filter / Search Strip */}
        <div className="px-5 py-2.5 bg-zinc-50 border-b border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={
                grouping === 'COURSE'
                  ? 'Search course code (e.g. MEG-01, BPSC-131)...'
                  : 'Search programme (e.g. MEG, BAG, MPS)...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-zinc-500 font-medium">Status Filter:</span>
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="px-2.5 py-1 bg-white border border-zinc-300 rounded-lg text-xs font-medium focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Has Pending Allotment</option>
              <option value="ALLOTTED">Has Allotted Packets</option>
              <option value="EVALUATED">Has Evaluated Marks</option>
            </select>
          </div>
        </div>

        {/* The Comprehensive Tracking Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-100 text-zinc-700 uppercase text-[10px] font-bold border-b border-zinc-200">
              <tr>
                <th className="py-3 px-3 w-12 text-center">S.No</th>
                <th className="py-3 px-4 min-w-[200px]">Programme</th>
                <th className="py-3 px-3 text-center">Candidates</th>
                <th className="py-3 px-3 text-center">Assignment Intake (Total)</th>
                <th className="py-3 px-3 text-center text-rose-700">Pending</th>
                <th className="py-3 px-3 text-center text-indigo-700">Allotted</th>
                <th className="py-3 px-3 text-center text-emerald-700">Evaluated</th>
                <th className="py-3 px-3 text-center text-zinc-700">Locked</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 min-w-[240px]">Enrolled Courses</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-zinc-400">
                    No records found matching your filter criteria in session {currentSession}.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => (
                  <tr
                    key={`matrix-row-${row.key}-${idx}`}
                    className={`hover:bg-indigo-50/30 transition ${
                      row.key === 'ALL-OVERALL' ? 'bg-zinc-50 font-bold' : ''
                    }`}
                  >
                    <td className="py-3 px-3 text-center font-mono font-bold text-zinc-500">
                      {row.sNo}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-zinc-950">{row.programmeOrTitle}</div>
                      {row.department && (
                        <div className="text-[10px] text-zinc-500 font-sans">{row.department}</div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-zinc-900">
                      {row.candidatesCount}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-black text-amber-950 bg-amber-50/40">
                      {row.totalIntake}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-rose-700">
                      {row.pendingCount}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-indigo-900">
                      {row.allottedCount}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-emerald-700">
                      {row.evaluatedCount}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-zinc-700">
                      {row.lockedCount}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${row.statusColor}`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1 max-w-sm">
                        {row.enrolledCourses.length === 0 ? (
                          <span className="text-[10px] text-zinc-400 italic">None</span>
                        ) : (
                          row.enrolledCourses.map((c) => {
                            const isPractical = isPracticalCourse(c.code, c.title);
                            return (
                              <span
                                key={c.code}
                                className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold border inline-flex items-center gap-0.5 ${
                                  isPractical
                                    ? 'bg-purple-50 text-purple-950 border-purple-200'
                                    : 'bg-zinc-100 text-zinc-800 border-zinc-200'
                                }`}
                                title={
                                  c.title
                                    ? `${c.code}: ${c.title}${isPractical ? ' (Practical Course)' : ''}`
                                    : `${c.code}${isPractical ? ' (Practical Course)' : ''}`
                                }
                              >
                                {isPractical && <FlaskConical className="w-2.5 h-2.5 text-purple-600 shrink-0" />}
                                <span>{c.code}</span>
                                {isPractical && (
                                  <span className="text-[7.5px] font-sans font-semibold text-purple-700">
                                    (P)
                                  </span>
                                )}
                                <span className="text-indigo-800 font-sans font-normal ml-0.5">
                                  ({c.count})
                                </span>
                              </span>
                            );
                          })
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {/* Consolidated Footer Summary Row if more than 1 row */}
            {filteredRows.length > 1 && (
              <tfoot className="bg-zinc-100 font-bold border-t-2 border-zinc-300 text-zinc-900">
                <tr>
                  <td colSpan={2} className="py-3 px-4 text-left uppercase text-xs">
                    Filtered Total ({filteredRows.length} Rows)
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-bold">
                    {filteredRows.reduce((sum, r) => sum + r.candidatesCount, 0)}
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-black text-amber-950">
                    {filteredRows.reduce((sum, r) => sum + r.totalIntake, 0)}
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-bold text-rose-700">
                    {filteredRows.reduce((sum, r) => sum + r.pendingCount, 0)}
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-bold text-indigo-900">
                    {filteredRows.reduce((sum, r) => sum + r.allottedCount, 0)}
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-bold text-emerald-700">
                    {filteredRows.reduce((sum, r) => sum + r.evaluatedCount, 0)}
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-bold text-zinc-700">
                    {filteredRows.reduce((sum, r) => sum + r.lockedCount, 0)}
                  </td>
                  <td colSpan={2} className="py-3 px-4 text-right text-xs text-zinc-500">
                    <div className="flex items-center justify-end gap-3">
                      <span>Overall Completion: {evaluatedPercentage}</span>
                      <button
                        type="button"
                        onClick={() => setIsPrintModalOpen(true)}
                        className="px-2.5 py-1 rounded-lg bg-zinc-200 hover:bg-zinc-300 text-zinc-900 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        title="Print Programme-wise Report for Regional Office"
                      >
                        <Printer className="w-3 h-3 text-indigo-700" />
                        <span>Print Report</span>
                      </button>
                    </div>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Programme-wise Regional Office Print Report Modal */}
      <AssignmentIntakePrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
      />
    </div>
  );
};
