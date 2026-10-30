import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  Search,
  X,
  User,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Award,
  Layers,
  Phone,
  Mail,
  FileText,
  Printer,
  ChevronRight,
  GraduationCap,
  Sparkles,
  UserCheck,
  School,
  Hash,
  AlertCircle,
} from 'lucide-react';
import { formatDate, marksToWords } from '../utils/helpers';
import { IntakeRecord } from '../types';

interface StudentProfile {
  enrollmentNo: string;
  studentName: string;
  studentPhone?: string;
  programmeCode: string;
  sessions: Set<string>;
  intakeRecords: IntakeRecord[];
}

export const StudentSearchModal: React.FC = () => {
  const {
    isSearchModalOpen,
    closeSearchModal,
    searchInitialQuery,
    searchMode,
    setSearchMode,
    allIntakes,
    allCourseEvaluations,
    studentRegistrations,
    openReceiptModal,
    currentSession,
    evaluators,
  } = useApp();

  const [query, setQuery] = useState(searchInitialQuery || '');
  const [selectedStudentKey, setSelectedStudentKey] = useState<string | null>(null);
  const [filterSession, setFilterSession] = useState<'current' | 'all'>('all');
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync initial query and focus when modal opens
  useEffect(() => {
    if (isSearchModalOpen) {
      setQuery(searchInitialQuery || '');
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isSearchModalOpen, searchInitialQuery]);

  // Aggregate student profiles from intakes, course evaluations, and student registrations
  const studentsMap = useMemo(() => {
    const map = new Map<string, StudentProfile>();

    // 1. Index from Fresh Admissions & Re-Registrations
    studentRegistrations.forEach((reg) => {
      const enr = reg.enrollmentNo.trim();
      if (!map.has(enr)) {
        map.set(enr, {
          enrollmentNo: enr,
          studentName: reg.studentName,
          studentPhone: reg.studentPhone,
          programmeCode: reg.programmeCode,
          sessions: new Set<string>([reg.session]),
          intakeRecords: [],
        });
      } else {
        const item = map.get(enr)!;
        if (!item.studentPhone && reg.studentPhone) item.studentPhone = reg.studentPhone;
        item.sessions.add(reg.session);
      }
    });

    // 2. Index from intakes
    allIntakes.forEach((rec) => {
      const enr = rec.enrollmentNo.trim();
      const existing = map.get(enr) || {
        enrollmentNo: enr,
        studentName: rec.studentName,
        studentPhone: rec.studentPhone,
        programmeCode: rec.programmeCode,
        sessions: new Set<string>(),
        intakeRecords: [],
      };
      existing.studentName = rec.studentName || existing.studentName;
      if (rec.studentPhone) existing.studentPhone = rec.studentPhone;
      existing.programmeCode = rec.programmeCode || existing.programmeCode;
      existing.sessions.add(rec.session);
      existing.intakeRecords.push(rec);
      map.set(enr, existing);
    });

    // 3. Index from course evaluations
    allCourseEvaluations.forEach((evalRec) => {
      const enr = evalRec.enrollmentNo.trim();
      if (!map.has(enr)) {
        map.set(enr, {
          enrollmentNo: enr,
          studentName: evalRec.studentName,
          studentPhone: '',
          programmeCode: evalRec.programmeCode,
          sessions: new Set<string>([evalRec.session]),
          intakeRecords: [],
        });
      } else {
        map.get(enr)!.sessions.add(evalRec.session);
      }
    });

    return map;
  }, [allIntakes, allCourseEvaluations, studentRegistrations]);

  // Filtered student list based on search term
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    const allStudents: StudentProfile[] = Array.from(studentsMap.values());

    if (!q) {
      return allStudents
        .filter((s) => (filterSession === 'current' ? s.sessions.has(currentSession) : true))
        .slice(0, 15);
    }

    return allStudents
      .filter((s) => {
        if (filterSession === 'current' && !s.sessions.has(currentSession)) {
          return false;
        }

        // Search in Enrollment No
        if (s.enrollmentNo.toLowerCase().includes(q)) return true;

        // Search in Student Name
        if (s.studentName.toLowerCase().includes(q)) return true;

        // Search in Programme Code
        if (s.programmeCode.toLowerCase().includes(q)) return true;

        // Search in Registration records (course codes)
        const regs = studentRegistrations.filter((r) => r.enrollmentNo.trim() === s.enrollmentNo);
        if (regs.some((r) => r.courseCodes.some((c) => c.toLowerCase().includes(q)))) return true;

        // Search in Course evaluations
        const studentEvals = allCourseEvaluations.filter(
          (e) => e.enrollmentNo.trim() === s.enrollmentNo
        );
        if (studentEvals.some((e) => e.courseCode.toLowerCase().includes(q))) return true;

        // Search in Intake records (token or course)
        const studentIntakes = s.intakeRecords;
        if (
          studentIntakes.some((i) =>
            i.tokenNo.toLowerCase().includes(q) ||
            i.courseCodes.some((c) => c.toLowerCase().includes(q))
          )
        ) {
          return true;
        }

        return false;
      })
      .slice(0, 30);
  }, [query, studentsMap, filterSession, currentSession, allCourseEvaluations, studentRegistrations]);

  // Set default selected student if none selected or if query changes
  useEffect(() => {
    if (searchResults.length > 0) {
      if (!selectedStudentKey || !searchResults.some((s) => s.enrollmentNo === selectedStudentKey)) {
        setSelectedStudentKey(searchResults[0].enrollmentNo);
      }
    } else {
      setSelectedStudentKey(null);
    }
  }, [searchResults, selectedStudentKey]);

  // Active student object
  const activeStudent = useMemo(() => {
    if (!selectedStudentKey) return null;
    return studentsMap.get(selectedStudentKey) || null;
  }, [selectedStudentKey, studentsMap]);

  // Registration records for active student
  const activeStudentRegistrations = useMemo(() => {
    if (!selectedStudentKey) return [];
    return studentRegistrations.filter((r) => r.enrollmentNo.trim() === selectedStudentKey);
  }, [selectedStudentKey, studentRegistrations]);

  // Course Evaluation records for active student
  const activeStudentEvaluations = useMemo(() => {
    if (!selectedStudentKey) return [];
    return allCourseEvaluations
      .filter((e) => e.enrollmentNo.trim() === selectedStudentKey)
      .sort((a, b) => a.courseCode.localeCompare(b.courseCode));
  }, [selectedStudentKey, allCourseEvaluations]);

  // Intake records for active student
  const activeStudentIntakes = useMemo(() => {
    if (!activeStudent) return [];
    return activeStudent.intakeRecords;
  }, [activeStudent]);

  if (!isSearchModalOpen) return null;

  const isRegMode = searchMode === 'REGISTRATION';

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Search Header */}
        <div className="p-4 sm:p-5 bg-zinc-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-sm shrink-0 ${
                isRegMode ? 'bg-indigo-600' : 'bg-emerald-600'
              }`}
            >
              {isRegMode ? <GraduationCap className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-zinc-100">
                  {isRegMode ? 'Student Registration Status Lookup' : 'Assignment Intake & Evaluation Status'}
                </h2>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-400 border border-zinc-700">
                  Ctrl + K
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                {isRegMode
                  ? 'Verify student admission cadre, enrolled semester courses, and registration cycle'
                  : 'Track submitted assignment receipts, tokens, evaluator allotment, and marks'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {/* Mode Switching Toggle Tabs */}
            <div className="flex items-center bg-zinc-800 p-1 rounded-xl border border-zinc-700 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setSearchMode('REGISTRATION')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                  isRegMode
                    ? 'bg-indigo-600 text-white font-bold shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>1. Registration Status</span>
              </button>
              <button
                type="button"
                onClick={() => setSearchMode('INTAKE')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                  !isRegMode
                    ? 'bg-emerald-600 text-white font-bold shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>2. Assignment Intake</span>
              </button>
            </div>

            <button
              onClick={closeSearchModal}
              className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center transition cursor-pointer"
              title="Close Search Modal (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Input Bar with Filter Chips */}
        <div className="p-4 bg-zinc-50 border-b border-zinc-200 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                isRegMode
                  ? 'Search Registration by Student Enrolment No (e.g. 2350198421), Name, or Programme...'
                  : 'Search Assignment Intake by Enrolment No, Course Code (e.g. MEG-01), or Token...'
              }
              className="w-full pl-10 pr-10 py-2.5 bg-white border border-zinc-300 rounded-xl text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-400 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-2xs"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 text-xs font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Chips */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-zinc-500 uppercase">Cycle Filter:</span>
              <button
                onClick={() => setFilterSession('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  filterSession === 'all'
                    ? 'bg-zinc-900 text-white'
                    : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                }`}
              >
                All Cycles
              </button>
              <button
                onClick={() => setFilterSession('current')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  filterSession === 'current'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                }`}
              >
                Active Cycle ({currentSession})
              </button>
            </div>

            <div className="text-[11px] text-zinc-500 font-medium">
              Found <strong className="text-zinc-800">{searchResults.length}</strong> student match(es)
            </div>
          </div>
        </div>

        {/* Main Content Area: Split View (List + Details Dossier) */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[440px]">
          {/* Left Column: Results List */}
          <div className="md:col-span-5 border-r border-zinc-200 overflow-y-auto divide-y divide-zinc-100 max-h-[55vh] md:max-h-none">
            {searchResults.length === 0 ? (
              <div className="p-8 text-center text-zinc-400 space-y-2">
                <User className="w-8 h-8 mx-auto text-zinc-300" />
                <p className="text-xs font-semibold text-zinc-600">No students found matching "{query}"</p>
                <p className="text-[11px] text-zinc-400">
                  Try searching with an 8 to 10 digit Enrolment Number or partial student name.
                </p>
              </div>
            ) : (
              searchResults.map((stu) => {
                const isSelected = selectedStudentKey === stu.enrollmentNo;
                const regRecords = studentRegistrations.filter((r) => r.enrollmentNo.trim() === stu.enrollmentNo);
                const evalRecords = allCourseEvaluations.filter(
                  (e) => e.enrollmentNo.trim() === stu.enrollmentNo
                );
                const evaluatedCount = evalRecords.filter((e) => e.marks !== null).length;
                const lockedCount = evalRecords.filter((e) => e.isLocked).length;

                return (
                  <div
                    key={stu.enrollmentNo}
                    onClick={() => setSelectedStudentKey(stu.enrollmentNo)}
                    className={`p-3.5 transition cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? isRegMode
                          ? 'bg-indigo-50/90 border-l-4 border-indigo-600'
                          : 'bg-emerald-50/90 border-l-4 border-emerald-600'
                        : 'hover:bg-zinc-50'
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-zinc-900 truncate">
                          {stu.enrollmentNo}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-zinc-200 text-zinc-700">
                          {stu.programmeCode}
                        </span>
                      </div>
                      <div className="font-semibold text-xs text-zinc-800 truncate">
                        {stu.studentName}
                      </div>

                      {/* Mode-Specific Status Tag */}
                      {isRegMode ? (
                        <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                          {regRecords.length > 0 ? (
                            <span className="font-semibold text-indigo-700">
                              {regRecords[0].cadre === 'FRESH'
                                ? 'Fresh Admission'
                                : `Re-Reg (${regRecords[0].academicYear})`}
                              {' • '}{regRecords[0].courseCodes.length} Registered Courses
                            </span>
                          ) : (
                            <span className="text-zinc-500">Intake Desk Admitted</span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                          <span>{evalRecords.length} courses</span>
                          <span>•</span>
                          <span
                            className={
                              lockedCount > 0
                                ? 'text-purple-700 font-bold'
                                : evaluatedCount > 0
                                ? 'text-emerald-700 font-semibold'
                                : 'text-zinc-500'
                            }
                          >
                            {lockedCount > 0
                              ? `${lockedCount} Locked & Verified`
                              : evaluatedCount > 0
                              ? `${evaluatedCount} Evaluated`
                              : 'Intake Registered'}
                          </span>
                        </div>
                      )}
                    </div>

                    <ChevronRight
                      className={`w-4 h-4 shrink-0 transition ${
                        isSelected
                          ? isRegMode
                            ? 'text-indigo-600 translate-x-0.5'
                            : 'text-emerald-600 translate-x-0.5'
                          : 'text-zinc-300'
                      }`}
                    />
                  </div>
                );
              })
            )}
          </div>

          {/* Right Column: Detailed Student Status Card / Dossier */}
          <div className="md:col-span-7 bg-zinc-50/40 p-4 sm:p-6 overflow-y-auto max-h-[55vh] md:max-h-none space-y-5">
            {activeStudent ? (
              <>
                {/* Dossier Header Card */}
                <div className="bg-white border border-zinc-200 rounded-xl p-4 sm:p-5 shadow-2xs space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${
                            isRegMode
                              ? 'bg-indigo-100 text-indigo-900 border-indigo-200'
                              : 'bg-emerald-100 text-emerald-900 border-emerald-200'
                          }`}
                        >
                          {activeStudent.programmeCode}
                        </span>
                        <h3 className="text-base font-bold text-zinc-900">
                          {activeStudent.studentName}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-mono font-bold text-xs text-zinc-700">
                          Enrolment No: {activeStudent.enrollmentNo}
                        </span>
                        {activeStudent.studentPhone && (
                          <>
                            <span className="text-zinc-300">•</span>
                            <span className="text-xs text-zinc-500 flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {activeStudent.studentPhone}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Receipt Action Button */}
                    {activeStudentIntakes.length > 0 && (
                      <button
                        onClick={() => {
                          closeSearchModal();
                          openReceiptModal(activeStudentIntakes[0]);
                        }}
                        className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        title="Print Student Acknowledgment Receipt"
                      >
                        <Printer className="w-3.5 h-3.5 text-zinc-600" />
                        <span>Print Receipt</span>
                      </button>
                    )}
                  </div>

                  {/* Sessions & Token metadata */}
                  <div className="flex flex-wrap gap-3 pt-3 border-t border-zinc-100 text-xs">
                    <div>
                      <span className="text-[10px] text-zinc-400 uppercase font-bold block">
                        Registered Cycle(s)
                      </span>
                      <div className="flex gap-1.5 mt-0.5">
                        {Array.from(activeStudent.sessions).map((sess) => (
                          <span
                            key={sess}
                            className="font-mono text-[11px] font-semibold text-zinc-700 bg-zinc-100 px-1.5 py-0.5 rounded"
                          >
                            {sess}
                          </span>
                        ))}
                      </div>
                    </div>

                    {activeStudentIntakes[0]?.tokenNo && (
                      <div>
                        <span className="text-[10px] text-zinc-400 uppercase font-bold block">
                          Latest Intake Token
                        </span>
                        <span className="font-mono text-[11px] font-bold text-indigo-900 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded block mt-0.5">
                          {activeStudentIntakes[0].tokenNo}
                        </span>
                      </div>
                    )}

                    {activeStudentIntakes[0]?.submissionDate && (
                      <div>
                        <span className="text-[10px] text-zinc-400 uppercase font-bold block">
                          Submission Date
                        </span>
                        <span className="text-[11px] text-zinc-700 font-medium block mt-0.5">
                          {formatDate(activeStudentIntakes[0].submissionDate)} (
                          {activeStudentIntakes[0].submissionMode})
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* MODE 1: REGISTRATION STATUS VIEW */}
                {isRegMode ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Student Registration & Admission Details</span>
                      </h4>
                      <span className="text-[11px] text-zinc-400 font-medium">
                        {activeStudentRegistrations.length} Registration Record(s)
                      </span>
                    </div>

                    {activeStudentRegistrations.length === 0 ? (
                      <div className="bg-white border border-zinc-200 rounded-xl p-4 text-center text-xs text-zinc-500 space-y-1">
                        <AlertCircle className="w-5 h-5 mx-auto text-amber-500" />
                        <p className="font-semibold text-zinc-700">No Admission / Re-Registration File on Record</p>
                        <p className="text-[11px] text-zinc-400">
                          Student was registered directly at Intake Desk.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {activeStudentRegistrations.map((reg) => (
                          <div
                            key={reg.id}
                            className="bg-white border border-zinc-200 rounded-xl p-4 shadow-2xs space-y-3"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-2">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">
                                  {reg.cadre === 'FRESH' ? 'Fresh Admission' : 'Re-Registration'}
                                </span>
                                <span className="font-mono text-xs font-bold text-zinc-800">
                                  {reg.academicYear} • Cycle {reg.session}
                                </span>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  reg.status === 'Confirmed'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {reg.status}
                              </span>
                            </div>

                            {/* Enrolled Curriculum Courses */}
                            <div>
                              <span className="text-[10px] text-zinc-400 uppercase font-bold block mb-1">
                                Enrolled Curriculum Courses:
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {reg.courseCodes.map((c) => (
                                  <span
                                    key={c}
                                    className="font-mono text-xs font-bold bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded text-zinc-800"
                                  >
                                    {c}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Metadata Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-zinc-50 p-2.5 rounded-lg text-xs">
                              <div>
                                <span className="text-[10px] text-zinc-400 font-bold uppercase block">
                                  Registration Date
                                </span>
                                <span className="font-medium text-zinc-800">
                                  {formatDate(reg.registrationDate)}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] text-zinc-400 font-bold uppercase block">
                                  Study Centre
                                </span>
                                <span className="font-mono font-medium text-zinc-800">
                                  SC-{reg.studyCentreCode || '2033'} (RC-{reg.regionalCentreCode || '07'})
                                </span>
                              </div>
                              {reg.feeReference && (
                                <div>
                                  <span className="text-[10px] text-zinc-400 font-bold uppercase block">
                                    Fee Reference
                                  </span>
                                  <span className="font-mono text-zinc-800 text-[11px] truncate block">
                                    {reg.feeReference}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Linked Assignment Submissions Summary for Complete History */}
                    <div className="pt-2 border-t border-zinc-200 space-y-2">
                      <div className="text-xs font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-zinc-500" />
                        <span>Submitted Assignment Intake History ({activeStudentIntakes.length} token(s))</span>
                      </div>
                      {activeStudentIntakes.length === 0 ? (
                        <p className="text-xs text-zinc-400 italic">No assignment submissions recorded yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {activeStudentIntakes.map((intake) => (
                            <div
                              key={intake.id || intake.tokenNo}
                              className="bg-white border border-zinc-200 rounded-lg p-2.5 flex items-center justify-between text-xs"
                            >
                              <div>
                                <div className="font-mono font-bold text-zinc-900">{intake.tokenNo}</div>
                                <div className="text-[11px] text-zinc-500">
                                  {intake.courseCodes.join(', ')} • {formatDate(intake.submissionDate)}
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  closeSearchModal();
                                  openReceiptModal(intake);
                                }}
                                className="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded font-semibold text-xs transition cursor-pointer"
                              >
                                View Receipt
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* MODE 2: ASSIGNMENT INTAKE STATUS VIEW */
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Assignment Scripts & Evaluation Status</span>
                      </h4>
                      <span className="text-[11px] text-zinc-400 font-medium">
                        {activeStudentEvaluations.length} Course Record(s)
                      </span>
                    </div>

                    {activeStudentEvaluations.length === 0 ? (
                      <div className="bg-white border border-zinc-200 rounded-xl p-4 text-center text-xs text-zinc-500">
                        No unpackaged course evaluation records found for this student.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {activeStudentEvaluations.map((evalRec) => {
                          const evaluatorObj = evaluators.find((e) => e.id === evalRec.evaluatorId);

                          let stepLabel = 'Intake Desk Registered';
                          let stepColor = 'bg-blue-100 text-blue-800 border-blue-200';

                          if (evalRec.isLocked) {
                            stepLabel = 'Locked & Verified (Institutional Seal)';
                            stepColor = 'bg-purple-100 text-purple-800 border-purple-300 font-bold';
                          } else if (evalRec.marks !== null) {
                            stepLabel = 'Evaluated (Marks Awarded)';
                            stepColor = 'bg-emerald-100 text-emerald-800 border-emerald-200 font-semibold';
                          } else if (evalRec.evaluatorId) {
                            stepLabel = 'Allotted to Academic Counsellor';
                            stepColor = 'bg-amber-100 text-amber-800 border-amber-200';
                          }

                          return (
                            <div
                              key={evalRec.id}
                              className="bg-white border border-zinc-200 rounded-xl p-3.5 shadow-2xs space-y-2.5 transition hover:border-zinc-300"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-black text-xs text-zinc-950 px-2 py-0.5 bg-zinc-100 border border-zinc-200 rounded">
                                    {evalRec.courseCode}
                                  </span>
                                  <span className="text-xs text-zinc-500 font-mono">
                                    Cycle: {evalRec.session}
                                  </span>
                                </div>

                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] border inline-flex items-center gap-1 ${stepColor}`}
                                >
                                  {evalRec.isLocked && <ShieldCheck className="w-3 h-3 text-purple-700" />}
                                  {evalRec.marks !== null && !evalRec.isLocked && (
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  )}
                                  <span>{stepLabel}</span>
                                </span>
                              </div>

                              {/* Details Grid */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-zinc-50/70 p-2.5 rounded-lg text-xs">
                                <div>
                                  <span className="text-[10px] text-zinc-400 font-bold uppercase block">
                                    Academic Evaluator
                                  </span>
                                  <div className="font-semibold text-zinc-900 mt-0.5 truncate">
                                    {evaluatorObj?.name || evalRec.evaluatorName || 'Pending Allotment'}
                                  </div>
                                  <div className="text-[10px] text-zinc-500 font-mono">
                                    {evaluatorObj?.evaluatorCode || 'Not Assigned'}
                                  </div>
                                </div>

                                <div>
                                  <span className="text-[10px] text-zinc-400 font-bold uppercase block">
                                    Awarded Score & Grade
                                  </span>
                                  <div className="flex items-baseline gap-1.5 mt-0.5">
                                    <span className="font-mono font-black text-sm text-zinc-950">
                                      {evalRec.marks !== null ? `${evalRec.marks} / 100` : 'Pending'}
                                    </span>
                                    {evalRec.grade !== '-' && (
                                      <span
                                        className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
                                          evalRec.grade === 'A'
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : evalRec.grade === 'B'
                                            ? 'bg-blue-100 text-blue-800'
                                            : evalRec.grade === 'C'
                                            ? 'bg-amber-100 text-amber-800'
                                            : evalRec.grade === 'D'
                                            ? 'bg-orange-100 text-orange-800'
                                            : 'bg-rose-100 text-rose-800'
                                        }`}
                                      >
                                        Grade {evalRec.grade}
                                      </span>
                                    )}
                                  </div>
                                  {evalRec.marks !== null && (
                                    <div className="text-[10px] text-zinc-500 font-mono">
                                      {marksToWords(evalRec.marks)}
                                    </div>
                                  )}
                                </div>

                                <div>
                                  <span className="text-[10px] text-zinc-400 font-bold uppercase block">
                                    Deterministic Key
                                  </span>
                                  <div
                                    className="font-mono text-[10px] text-zinc-600 mt-0.5 truncate"
                                    title={evalRec.submissionKey}
                                  >
                                    {evalRec.submissionKey}
                                  </div>
                                  <div className="text-[10px] text-zinc-400">
                                    {evalRec.isLocked ? 'Locked by Coordinator' : 'Editable Draft'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-center p-8 text-zinc-400">
                <div>
                  <Search className="w-8 h-8 mx-auto text-zinc-300 mb-2" />
                  <p className="text-xs font-semibold text-zinc-600">
                    Select a student from the list to view complete {isRegMode ? 'registration dossier' : 'evaluation lifecycle'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 bg-zinc-100 border-t border-zinc-200 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Study Centre 2033 Central Verification Database</span>
          </div>
          <button
            onClick={closeSearchModal}
            className="px-4 py-1.5 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            Close (Esc)
          </button>
        </div>
      </div>
    </div>
  );
};
