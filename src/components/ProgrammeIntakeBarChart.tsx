import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Users,
  FileText,
  TrendingUp,
  Layers,
  ArrowUpDown,
  Filter,
  Check,
  Info,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { IGNOU_PROGRAMMES } from '../data/ignouMasterData';
import { IntakeRecord } from '../types';

export interface ProgrammeIntakeData {
  code: string;
  name: string;
  totalIntakes: number;
  uniqueStudents: number;
  totalScripts: number;
  percentage: number;
  courses: { code: string; count: number }[];
  color: string;
}

export interface ProgrammeIntakeBarChartProps {
  intakes?: IntakeRecord[];
  currentSessionName?: string;
  onSelectProgramme?: (programmeCode: string | null) => void;
  selectedProgramme?: string | null;
  className?: string;
  compact?: boolean;
}

// Curated high-contrast accessible color palette for programmes
const PROGRAMME_COLORS = [
  { bg: 'bg-indigo-600', hover: 'hover:bg-indigo-700', text: 'text-indigo-600', light: 'bg-indigo-50 border-indigo-200' },
  { bg: 'bg-blue-600', hover: 'hover:bg-blue-700', text: 'text-blue-600', light: 'bg-blue-50 border-blue-200' },
  { bg: 'bg-teal-600', hover: 'hover:bg-teal-700', text: 'text-teal-600', light: 'bg-teal-50 border-teal-200' },
  { bg: 'bg-emerald-600', hover: 'hover:bg-emerald-700', text: 'text-emerald-600', light: 'bg-emerald-50 border-emerald-200' },
  { bg: 'bg-amber-600', hover: 'hover:bg-amber-700', text: 'text-amber-600', light: 'bg-amber-50 border-amber-200' },
  { bg: 'bg-rose-600', hover: 'hover:bg-rose-700', text: 'text-rose-600', light: 'bg-rose-50 border-rose-200' },
  { bg: 'bg-purple-600', hover: 'hover:bg-purple-700', text: 'text-purple-600', light: 'bg-purple-50 border-purple-200' },
  { bg: 'bg-cyan-600', hover: 'hover:bg-cyan-700', text: 'text-cyan-600', light: 'bg-cyan-50 border-cyan-200' },
];

export const ProgrammeIntakeBarChart: React.FC<ProgrammeIntakeBarChartProps> = ({
  intakes: propIntakes,
  currentSessionName,
  onSelectProgramme,
  selectedProgramme: propSelectedProgramme,
  className = '',
  compact = false,
}) => {
  const { currentSession, sessionIntakes, allIntakes, intakeRegister } = useApp();

  const [sessionScope, setSessionScope] = useState<'CURRENT' | 'ALL'>('CURRENT');
  const [chartOrientation, setChartOrientation] = useState<'VERTICAL' | 'HORIZONTAL'>('VERTICAL');
  const [sortBy, setSortBy] = useState<'COUNT' | 'ALPHA'>('COUNT');
  const [hoveredProg, setHoveredProg] = useState<ProgrammeIntakeData | null>(null);
  const [internalSelectedProg, setInternalSelectedProg] = useState<string | null>(null);

  const activeSelectedProg = propSelectedProgramme !== undefined ? propSelectedProgramme : internalSelectedProg;
  const activeSessionName = currentSessionName || currentSession;

  // Resolve source records based on props and session scope
  const activeRecords = useMemo(() => {
    if (propIntakes) {
      return propIntakes;
    }

    if (sessionScope === 'ALL') {
      if (allIntakes && allIntakes.length > 0) return allIntakes;
      if (intakeRegister && intakeRegister.length > 0) return intakeRegister;
      return sessionIntakes;
    }

    // Current session
    if (sessionIntakes && sessionIntakes.length > 0) return sessionIntakes;
    const fallbackList = intakeRegister && intakeRegister.length > 0 ? intakeRegister : allIntakes || [];
    return fallbackList.filter((r: any) => {
      const s = r.Session || r.session;
      return s && s.toLowerCase().trim() === activeSessionName.toLowerCase().trim();
    });
  }, [propIntakes, sessionScope, sessionIntakes, allIntakes, intakeRegister, activeSessionName]);

  // Aggregate student intakes per programme
  const programmeData = useMemo(() => {
    const map = new Map<
      string,
      {
        totalIntakes: number;
        enrollments: Set<string>;
        totalScripts: number;
        courseCounts: Map<string, number>;
      }
    >();

    activeRecords.forEach((record: any) => {
      if (!record) return;
      const rawProg =
        record.programmeCode ||
        record.Programme ||
        record.programme ||
        record['Programme'] ||
        'UNKNOWN';
      const progCode = String(rawProg).trim().toUpperCase();

      if (!map.has(progCode)) {
        map.set(progCode, {
          totalIntakes: 0,
          enrollments: new Set<string>(),
          totalScripts: 0,
          courseCounts: new Map<string, number>(),
        });
      }

      const item = map.get(progCode)!;
      item.totalIntakes += 1;

      const enr =
        record.enrollmentNo ||
        record.Enrollment_No ||
        record['Enrollment No'] ||
        record.studentId;
      if (enr) {
        item.enrollments.add(String(enr).trim());
      }

      const rawCourses = record.courseCodes || record.Courses || record.courses || [];
      const coursesArr: string[] = Array.isArray(rawCourses)
        ? rawCourses
        : typeof rawCourses === 'string'
        ? rawCourses.split(',').map((c) => c.trim().toUpperCase()).filter(Boolean)
        : [];

      item.totalScripts += coursesArr.length;
      coursesArr.forEach((c) => {
        const currentCount = item.courseCounts.get(c) || 0;
        item.courseCounts.set(c, currentCount + 1);
      });
    });

    const grandTotalIntakes = Array.from(map.values()).reduce(
      (sum, val) => sum + val.totalIntakes,
      0
    );

    const result: ProgrammeIntakeData[] = Array.from(map.entries()).map(
      ([code, val], index) => {
        const found = IGNOU_PROGRAMMES.find(
          (p) => p.code.toUpperCase() === code
        );
        const name = found ? found.name : `${code} Programme`;

        const coursesSorted = Array.from(val.courseCounts.entries())
          .map(([cCode, count]) => ({ code: cCode, count }))
          .sort((a, b) => b.count - a.count);

        const colorObj = PROGRAMME_COLORS[index % PROGRAMME_COLORS.length];

        return {
          code,
          name,
          totalIntakes: val.totalIntakes,
          uniqueStudents: val.enrollments.size,
          totalScripts: val.totalScripts,
          percentage:
            grandTotalIntakes > 0
              ? Math.round((val.totalIntakes / grandTotalIntakes) * 1000) / 10
              : 0,
          courses: coursesSorted,
          color: colorObj.bg,
        };
      }
    );

    // Sort according to selection
    if (sortBy === 'COUNT') {
      result.sort((a, b) => b.totalIntakes - a.totalIntakes || a.code.localeCompare(b.code));
    } else {
      result.sort((a, b) => a.code.localeCompare(b.code));
    }

    return result;
  }, [activeRecords, sortBy]);

  const grandTotal = useMemo(
    () => programmeData.reduce((sum, p) => sum + p.totalIntakes, 0),
    [programmeData]
  );
  const maxIntake = useMemo(
    () => Math.max(...programmeData.map((p) => p.totalIntakes), 1),
    [programmeData]
  );
  const topProgramme = useMemo(
    () => (programmeData.length > 0 ? programmeData[0] : null),
    [programmeData]
  );

  const handleBarClick = (code: string) => {
    const nextCode = activeSelectedProg === code ? null : code;
    if (onSelectProgramme) {
      onSelectProgramme(nextCode);
    } else {
      setInternalSelectedProg(nextCode);
    }
  };

  return (
    <div
      id="programme-intakes-bar-chart-widget"
      data-testid="programme-intakes-bar-chart"
      className={`bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden ${className}`}
    >
      {/* Widget Header */}
      <div className="p-4 sm:p-5 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-zinc-50/70 via-white to-zinc-50/70">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shrink-0">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-zinc-900 text-sm sm:text-base leading-tight">
                Intakes per Programme
              </h3>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                {grandTotal} {grandTotal === 1 ? 'Intake' : 'Intakes'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500">
              Student enrollment submissions visual breakdown across academic programmes
            </p>
          </div>
        </div>

        {/* Action Controls & Scope */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Session Scope Filter Button Group */}
          <div className="inline-flex p-0.5 bg-zinc-100 rounded-lg border border-zinc-200">
            <button
              type="button"
              onClick={() => setSessionScope('CURRENT')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                sessionScope === 'CURRENT'
                  ? 'bg-white text-zinc-900 shadow-2xs font-bold'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
              title={`Show intakes for ${activeSessionName}`}
            >
              {activeSessionName}
            </button>
            <button
              type="button"
              onClick={() => setSessionScope('ALL')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                sessionScope === 'ALL'
                  ? 'bg-white text-zinc-900 shadow-2xs font-bold'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
              title="Show intakes across all sessions"
            >
              All Sessions
            </button>
          </div>

          {/* Orientation & Sort Toggles */}
          <div className="hidden sm:flex items-center gap-1">
            <button
              type="button"
              onClick={() =>
                setChartOrientation((prev) =>
                  prev === 'VERTICAL' ? 'HORIZONTAL' : 'VERTICAL'
                )
              }
              className="p-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition cursor-pointer"
              title={
                chartOrientation === 'VERTICAL'
                  ? 'Switch to Horizontal Bars'
                  : 'Switch to Vertical Columns'
              }
              aria-label="Toggle chart orientation"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() =>
                setSortBy((prev) => (prev === 'COUNT' ? 'ALPHA' : 'COUNT'))
              }
              className="px-2 py-1 rounded-lg border border-zinc-200 text-[11px] font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition cursor-pointer"
              title={
                sortBy === 'COUNT'
                  ? 'Sorted by Intake Count (Highest First)'
                  : 'Sorted Alphabetically by Programme Code'
              }
            >
              {sortBy === 'COUNT' ? 'Top First' : 'A-Z'}
            </button>
          </div>
        </div>
      </div>

      {/* Widget Content */}
      <div className="p-4 sm:p-5">
        {programmeData.length === 0 ? (
          <div className="py-12 text-center text-zinc-400 text-xs">
            <BarChart3 className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
            <p className="font-semibold text-zinc-600">No Student Intakes Recorded</p>
            <p className="text-[11px] text-zinc-400 mt-1">
              There are currently no recorded intake transactions for{' '}
              {sessionScope === 'CURRENT' ? activeSessionName : 'the selected scope'}.
            </p>
          </div>
        ) : chartOrientation === 'VERTICAL' ? (
          /* ================= VERTICAL BAR CHART ================= */
          <div className="space-y-4">
            <div className="relative pt-6 pb-2">
              {/* Chart Grid Area */}
              <div className="h-44 sm:h-52 w-full flex items-end justify-between gap-2 sm:gap-4 px-2 sm:px-4 border-b border-zinc-200 relative">
                {/* Horizontal reference lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-40">
                  <div className="border-b border-dashed border-zinc-200 w-full flex justify-between text-[9px] text-zinc-400 pr-1">
                    <span>{maxIntake}</span>
                  </div>
                  <div className="border-b border-dashed border-zinc-200 w-full flex justify-between text-[9px] text-zinc-400 pr-1">
                    <span>{Math.round(maxIntake / 2)}</span>
                  </div>
                  <div className="border-b border-zinc-200 w-full flex justify-between text-[9px] text-zinc-400 pr-1">
                    <span>0</span>
                  </div>
                </div>

                {/* Bars */}
                {programmeData.map((item, idx) => {
                  const heightPercent = Math.max(
                    8,
                    Math.round((item.totalIntakes / maxIntake) * 100)
                  );
                  const isSelected = activeSelectedProg === item.code;
                  const isHovered = hoveredProg?.code === item.code;
                  const isTop = topProgramme?.code === item.code;

                  return (
                    <div
                      key={`bar-${item.code}`}
                      className="flex-1 flex flex-col items-center h-full justify-end group relative z-10 cursor-pointer"
                      onClick={() => handleBarClick(item.code)}
                      onMouseEnter={() => setHoveredProg(item)}
                      onMouseLeave={() => setHoveredProg(null)}
                    >
                      {/* Intake Count on Top of Bar */}
                      <span
                        className={`text-[11px] font-mono font-bold mb-1.5 transition-transform duration-150 ${
                          isSelected || isHovered
                            ? 'text-indigo-600 scale-110'
                            : isTop
                            ? 'text-zinc-900 font-extrabold'
                            : 'text-zinc-600'
                        }`}
                      >
                        {item.totalIntakes}
                      </span>

                      {/* Bar Column */}
                      <div className="w-full max-w-[48px] bg-zinc-100 rounded-t-lg overflow-hidden flex flex-col justify-end transition-all duration-200">
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className={`w-full rounded-t-lg transition-all duration-300 ${
                            isSelected
                              ? 'bg-indigo-600 ring-2 ring-indigo-400 ring-offset-1'
                              : isTop
                              ? 'bg-indigo-500 group-hover:bg-indigo-600 shadow-2xs'
                              : `${item.color} opacity-90 group-hover:opacity-100 group-hover:shadow-2xs`
                          }`}
                        />
                      </div>

                      {/* X-Axis Programme Code */}
                      <div className="mt-2 text-center">
                        <span
                          className={`block text-[11px] font-mono font-bold truncate max-w-[60px] ${
                            isSelected
                              ? 'text-indigo-700 underline font-black'
                              : 'text-zinc-800'
                          }`}
                          title={`${item.code} - ${item.name}`}
                        >
                          {item.code}
                        </span>
                        <span className="block text-[9px] text-zinc-400 font-medium">
                          {item.percentage}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Interactive Tooltip Card / Inspector */}
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 text-xs">
              {hoveredProg || activeSelectedProg ? (
                (() => {
                  const target =
                    hoveredProg ||
                    programmeData.find((p) => p.code === activeSelectedProg) ||
                    programmeData[0];
                  return (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                            {target.code}
                          </span>
                          <span className="font-bold text-zinc-900 text-xs truncate max-w-xs">
                            {target.name}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-1">
                          {target.totalIntakes} student intakes ({target.percentage}% of cycle total) across{' '}
                          {target.uniqueStudents} unique candidate{target.uniqueStudents === 1 ? '' : 's'}.
                        </p>
                      </div>

                      <div className="flex items-center gap-4 text-xs font-mono shrink-0">
                        <div className="text-right">
                          <span className="text-[10px] text-zinc-400 block font-sans">Scripts Volume</span>
                          <span className="font-bold text-zinc-800">{target.totalScripts} assignments</span>
                        </div>
                        {activeSelectedProg && (
                          <button
                            type="button"
                            onClick={() => handleBarClick(target.code)}
                            className="px-2 py-1 rounded bg-zinc-200 hover:bg-zinc-300 text-zinc-700 text-[11px] font-sans font-semibold cursor-pointer transition"
                          >
                            Clear Filter
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="flex items-center justify-between text-zinc-500 text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-indigo-500" />
                    Hover or click any bar above to inspect student candidate counts and course script details.
                  </span>
                  {topProgramme && (
                    <span className="font-mono text-zinc-700">
                      Highest: <strong className="text-indigo-600">{topProgramme.code}</strong> ({topProgramme.totalIntakes})
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ================= HORIZONTAL BAR CHART ================= */
          <div className="space-y-3">
            {programmeData.map((item) => {
              const widthPercent = Math.max(
                4,
                Math.round((item.totalIntakes / maxIntake) * 100)
              );
              const isSelected = activeSelectedProg === item.code;
              const isTop = topProgramme?.code === item.code;

              return (
                <div
                  key={`hbar-${item.code}`}
                  onClick={() => handleBarClick(item.code)}
                  className={`p-2.5 rounded-xl border transition cursor-pointer ${
                    isSelected
                      ? 'border-indigo-300 bg-indigo-50/50'
                      : 'border-zinc-100 hover:border-zinc-300 hover:bg-zinc-50/70'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-zinc-900 bg-zinc-100 px-1.5 py-0.5 rounded text-[11px]">
                        {item.code}
                      </span>
                      <span className="text-zinc-600 text-[11px] truncate max-w-[200px] sm:max-w-xs font-medium">
                        {item.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="font-bold text-zinc-900">
                        {item.totalIntakes} {item.totalIntakes === 1 ? 'intake' : 'intakes'}
                      </span>
                      <span className="text-[11px] text-zinc-400">({item.percentage}%)</span>
                    </div>
                  </div>

                  {/* Horizontal Bar Track */}
                  <div className="w-full bg-zinc-100 h-3 rounded-full overflow-hidden flex items-center">
                    <div
                      style={{ width: `${widthPercent}%` }}
                      className={`h-full rounded-full transition-all duration-300 ${
                        isSelected
                          ? 'bg-indigo-600'
                          : isTop
                          ? 'bg-indigo-500'
                          : `${item.color}`
                      }`}
                    />
                  </div>

                  {/* Quick Course Breakdown Pills */}
                  <div className="mt-1.5 flex items-center gap-3 text-[10px] text-zinc-500 font-mono">
                    <span>{item.uniqueStudents} unique student{item.uniqueStudents === 1 ? '' : 's'}</span>
                    <span>•</span>
                    <span>{item.totalScripts} course script{item.totalScripts === 1 ? '' : 's'}</span>
                    {item.courses.length > 0 && (
                      <>
                        <span>•</span>
                        <span className="truncate">
                          Courses: {item.courses.slice(0, 3).map((c) => c.code).join(', ')}
                          {item.courses.length > 3 ? ` +${item.courses.length - 3} more` : ''}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Widget Footer Metrics */}
        {programmeData.length > 0 && (
          <div className="mt-4 pt-3 border-t border-zinc-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="bg-zinc-50 rounded-xl p-2">
              <span className="text-[10px] text-zinc-400 font-medium block">Total Intakes</span>
              <span className="text-sm font-black text-zinc-900 font-mono">{grandTotal}</span>
            </div>
            <div className="bg-zinc-50 rounded-xl p-2">
              <span className="text-[10px] text-zinc-400 font-medium block">Active Programmes</span>
              <span className="text-sm font-black text-indigo-600 font-mono">{programmeData.length}</span>
            </div>
            <div className="bg-zinc-50 rounded-xl p-2">
              <span className="text-[10px] text-zinc-400 font-medium block">Top Programme</span>
              <span className="text-sm font-black text-emerald-600 font-mono">
                {topProgramme ? `${topProgramme.code} (${topProgramme.totalIntakes})` : '-'}
              </span>
            </div>
            <div className="bg-zinc-50 rounded-xl p-2">
              <span className="text-[10px] text-zinc-400 font-medium block">Avg / Programme</span>
              <span className="text-sm font-black text-zinc-700 font-mono">
                {programmeData.length > 0 ? (grandTotal / programmeData.length).toFixed(1) : '0'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgrammeIntakeBarChart;
