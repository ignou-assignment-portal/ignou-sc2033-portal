import React, { useState, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { calculateIGNOUGrade, formatDate, getIgnouGrade, isPracticalCourse, isDualComponentCourse } from '../utils/helpers';
import { CoordinatorPinChallengeModal } from './CoordinatorPinChallengeModal';
import {
  Award,
  BookOpen,
  Check,
  Search,
  Printer,
  FileCheck,
  Percent,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Lock,
  Unlock,
  Stamp,
  ShieldCheck,
  ShieldAlert,
  FlaskConical,
  Layers,
  Sparkles,
} from 'lucide-react';

export const MarksEntry: React.FC = () => {
  const {
    sessionIntakes,
    currentSession,
    updateMarks,
    updatePracticalMarks,
    settings,
    sessionCourseEvaluations,
    toggleLockMarks,
    saveOrUpdateMarksAndLock,
    showToast,
    isAdmin,
    canPerformOperation,
  } = useApp();

  // Coordinator PIN challenge state for marks locking
  const [pinChallenge, setPinChallenge] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    action: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    action: () => {},
  });

  // Extract all unique course codes submitted in the current session
  const activeCourseCodes = useMemo(() => {
    const codes = new Set<string>();
    sessionIntakes.forEach((r: any) => {
      const courses = r.courseCodes || r.courses || [];
      if (Array.isArray(courses)) {
        courses.forEach((c: any) => {
          if (c) codes.add(c.trim().toUpperCase());
        });
      }
    });
    sessionCourseEvaluations.forEach((ce: any) => {
      const code = ce.courseCode || ce.Course_Code;
      if (code) codes.add(code.trim().toUpperCase());
    });
    return Array.from(codes).filter(Boolean).sort();
  }, [sessionIntakes, sessionCourseEvaluations]);

  const [selectedCourse, setSelectedCourse] = useState<string>(() => {
    return activeCourseCodes[0] || '';
  });

  const [searchFilter, setSearchFilter] = useState('');
  const [isAwardListModalOpen, setIsAwardListModalOpen] = useState(false);

  // Auto-populate Course Selection in Stage 3 & Registers & Tracking:
  React.useEffect(() => {
    if (!selectedCourse && activeCourseCodes.length > 0) {
      setSelectedCourse(activeCourseCodes[0]);
    }
  }, [activeCourseCodes, selectedCourse]);

  // Students who submitted the selected course in current session
  const enrolledStudents = useMemo(() => {
    if (!selectedCourse) return [];
    return sessionIntakes.filter((r: any) => {
      const courses = r.courseCodes || r.courses || [];
      return (
        Array.isArray(courses) &&
        courses.map((c: string) => c.toUpperCase()).includes(selectedCourse.toUpperCase())
      );
    });
  }, [sessionIntakes, selectedCourse]);

  // Determine if course has Practical component
  const courseHasPractical = useMemo(() => {
    if (!selectedCourse) return false;
    if (isDualComponentCourse(selectedCourse) || isPracticalCourse(selectedCourse)) return true;
    return enrolledStudents.some((s: any) =>
      (s.practicalCourses || []).some(
        (c: string) => c.trim().toUpperCase() === selectedCourse.toUpperCase()
      )
    );
  }, [selectedCourse, enrolledStudents]);

  // Helper to get Assignment mark from intake or course evaluation ledger
  const getStudentAssignmentMark = useCallback(
    (student: any, courseCode: string): number | null => {
      const cleanCourse = courseCode.trim().toUpperCase();
      const directMark = student.marks?.[cleanCourse];
      if (directMark !== null && directMark !== undefined && directMark !== '') {
        return Number(directMark);
      }
      const matchingEval = sessionCourseEvaluations.find(
        (e: any) =>
          (e.enrollmentNo === student.enrollmentNo || e.Enrollment_No === student.enrollmentNo) &&
          (e.courseCode === cleanCourse || e.Course_Code === cleanCourse) &&
          (!e.componentType || e.componentType === 'Assignment' || !e.isPractical)
      );
      if (matchingEval) {
        if (matchingEval.assignmentMarks !== undefined && matchingEval.assignmentMarks !== null) {
          return Number(matchingEval.assignmentMarks);
        }
        const m =
          matchingEval.marks !== undefined && (matchingEval.marks as any) !== ''
            ? matchingEval.marks
            : (matchingEval as any).Marks;
        if (m !== undefined && m !== null && (m as any) !== '' && !isNaN(Number(m))) {
          return Number(m);
        }
      }
      return null;
    },
    [sessionCourseEvaluations]
  );

  // Helper to get Practical mark from intake or course evaluation ledger
  const getStudentPracticalMark = useCallback(
    (student: any, courseCode: string): number | null => {
      const cleanCourse = courseCode.trim().toUpperCase();
      const directPrac = student.practicalMarks?.[cleanCourse];
      if (directPrac !== null && directPrac !== undefined && directPrac !== '') {
        return Number(directPrac);
      }

      // Check evaluation record specifically marked as Practical
      const matchingPracEval = sessionCourseEvaluations.find(
        (e: any) =>
          (e.enrollmentNo === student.enrollmentNo || e.Enrollment_No === student.enrollmentNo) &&
          (e.courseCode === cleanCourse || e.Course_Code === cleanCourse) &&
          (e.componentType === 'Practical' || e.isPractical)
      );
      if (
        matchingPracEval &&
        matchingPracEval.marks !== undefined &&
        matchingPracEval.marks !== null &&
        (matchingPracEval.marks as any) !== ''
      ) {
        return Number(matchingPracEval.marks);
      }

      // Check practicalMarks field on any matching evaluation
      const anyMatchingEval = sessionCourseEvaluations.find(
        (e: any) =>
          (e.enrollmentNo === student.enrollmentNo || e.Enrollment_No === student.enrollmentNo) &&
          (e.courseCode === cleanCourse || e.Course_Code === cleanCourse)
      );
      if (
        anyMatchingEval &&
        anyMatchingEval.practicalMarks !== undefined &&
        anyMatchingEval.practicalMarks !== null &&
        (anyMatchingEval.practicalMarks as any) !== ''
      ) {
        return Number(anyMatchingEval.practicalMarks);
      }

      return null;
    },
    [sessionCourseEvaluations]
  );

  // Check locking state for Assignment
  const getAssignmentLockState = useCallback(
    (student: any, courseCode: string): { isLocked: boolean; lockedBy?: string; lockedAt?: string } => {
      const cleanCourse = courseCode.trim().toUpperCase();
      const matchingEval = sessionCourseEvaluations.find(
        (e: any) =>
          (e.enrollmentNo === student.enrollmentNo || e.Enrollment_No === student.enrollmentNo) &&
          (e.courseCode === cleanCourse || e.Course_Code === cleanCourse) &&
          (!e.componentType || e.componentType === 'Assignment' || !e.isPractical)
      );
      return {
        isLocked: !!matchingEval?.isLocked,
        lockedBy: matchingEval?.lockedBy || undefined,
        lockedAt: matchingEval?.lockedAt || undefined,
      };
    },
    [sessionCourseEvaluations]
  );

  // Check locking state for Practical
  const getPracticalLockState = useCallback(
    (student: any, courseCode: string): { isLocked: boolean; lockedBy?: string; lockedAt?: string } => {
      const cleanCourse = courseCode.trim().toUpperCase();
      const matchingPracEval = sessionCourseEvaluations.find(
        (e: any) =>
          (e.enrollmentNo === student.enrollmentNo || e.Enrollment_No === student.enrollmentNo) &&
          (e.courseCode === cleanCourse || e.Course_Code === cleanCourse) &&
          (e.componentType === 'Practical' || e.isPractical)
      );
      if (matchingPracEval) {
        return {
          isLocked: !!matchingPracEval.isLocked,
          lockedBy: matchingPracEval.lockedBy || undefined,
          lockedAt: matchingPracEval.lockedAt || undefined,
        };
      }
      const anyMatchingEval = sessionCourseEvaluations.find(
        (e: any) =>
          (e.enrollmentNo === student.enrollmentNo || e.Enrollment_No === student.enrollmentNo) &&
          (e.courseCode === cleanCourse || e.Course_Code === cleanCourse)
      );
      return {
        isLocked: !!anyMatchingEval?.isPracticalLocked,
        lockedBy: anyMatchingEval?.lockedBy || undefined,
        lockedAt: anyMatchingEval?.lockedAt || undefined,
      };
    },
    [sessionCourseEvaluations]
  );

  // Filtered by search query
  const filteredStudents = useMemo(() => {
    if (!searchFilter.trim()) return enrolledStudents;
    const q = searchFilter.toLowerCase().trim();
    return enrolledStudents.filter(
      (s) =>
        s.studentName.toLowerCase().includes(q) ||
        s.enrollmentNo.includes(q) ||
        s.tokenNo.toLowerCase().includes(q)
    );
  }, [enrolledStudents, searchFilter]);

  // Analytics for the selected course with separate Assignment and Practical metrics
  const stats = useMemo(() => {
    const total = enrolledStudents.length;
    let assignmentEvaluated = 0;
    let assignmentTotalMarks = 0;
    let assignmentPassed = 0;

    let practicalEvaluated = 0;
    let practicalTotalMarks = 0;
    let practicalPassed = 0;

    enrolledStudents.forEach((s) => {
      const asgnMark = getStudentAssignmentMark(s, selectedCourse);
      if (asgnMark !== null && asgnMark !== undefined) {
        assignmentEvaluated++;
        assignmentTotalMarks += asgnMark;
        if (asgnMark >= 40) assignmentPassed++;
      }

      const pracMark = getStudentPracticalMark(s, selectedCourse);
      if (pracMark !== null && pracMark !== undefined) {
        practicalEvaluated++;
        practicalTotalMarks += pracMark;
        if (pracMark >= 40) practicalPassed++;
      }
    });

    const asgnAverage =
      assignmentEvaluated > 0 ? (assignmentTotalMarks / assignmentEvaluated).toFixed(1) : '—';
    const asgnPassPercentage =
      assignmentEvaluated > 0 ? Math.round((assignmentPassed / assignmentEvaluated) * 100) : 0;

    const pracAverage =
      practicalEvaluated > 0 ? (practicalTotalMarks / practicalEvaluated).toFixed(1) : '—';
    const pracPassPercentage =
      practicalEvaluated > 0 ? Math.round((practicalPassed / practicalEvaluated) * 100) : 0;

    return {
      total,
      assignmentEvaluated,
      assignmentPending: total - assignmentEvaluated,
      assignmentAverage: asgnAverage,
      assignmentPassPercentage: asgnPassPercentage,
      practicalEvaluated,
      practicalPending: total - practicalEvaluated,
      practicalAverage: pracAverage,
      practicalPassPercentage: pracPassPercentage,
    };
  }, [enrolledStudents, selectedCourse, getStudentAssignmentMark, getStudentPracticalMark]);

  // Count of students with Assignment marks entered but not yet locked
  const asgnEvaluatedNotLockedCount = useMemo(() => {
    return enrolledStudents.filter((s) => {
      const mark = getStudentAssignmentMark(s, selectedCourse);
      const lock = getAssignmentLockState(s, selectedCourse);
      return mark !== null && mark !== undefined && !lock.isLocked;
    }).length;
  }, [enrolledStudents, selectedCourse, getStudentAssignmentMark, getAssignmentLockState]);

  // Count of students with Practical marks entered but not yet locked
  const pracEvaluatedNotLockedCount = useMemo(() => {
    return enrolledStudents.filter((s) => {
      const mark = getStudentPracticalMark(s, selectedCourse);
      const lock = getPracticalLockState(s, selectedCourse);
      return mark !== null && mark !== undefined && !lock.isLocked;
    }).length;
  }, [enrolledStudents, selectedCourse, getStudentPracticalMark, getPracticalLockState]);

  // Handlers for Input Changes
  const handleAssignmentMarkChange = (intakeId: string, valueStr: string) => {
    if (valueStr === '') {
      updateMarks(intakeId, selectedCourse, null, 'Assignment');
      return;
    }
    const val = parseInt(valueStr, 10);
    if (isNaN(val) || val < 0 || val > 100) return;
    updateMarks(intakeId, selectedCourse, val, 'Assignment');
  };

  const handlePracticalMarkChange = (intakeId: string, valueStr: string) => {
    if (valueStr === '') {
      updatePracticalMarks(intakeId, selectedCourse, null);
      return;
    }
    const val = parseInt(valueStr, 10);
    if (isNaN(val) || val < 0 || val > 100) return;
    updatePracticalMarks(intakeId, selectedCourse, val);
  };

  // Save & Lock action execution for specific component
  const executeSaveAndLock = async (
    student: (typeof enrolledStudents)[0],
    componentType: 'Assignment' | 'Practical',
    isLockAction: boolean,
    currentMark: number | null
  ) => {
    const isPrac = componentType === 'Practical';
    const matchingEval = sessionCourseEvaluations.find(
      (e: any) =>
        (e.enrollmentNo === student.enrollmentNo || e.Enrollment_No === student.enrollmentNo) &&
        (e.courseCode === selectedCourse || e.Course_Code === selectedCourse) &&
        (isPrac ? (e.componentType === 'Practical' || e.isPractical) : (!e.componentType || e.componentType === 'Assignment' || !e.isPractical))
    );

    const subSuffix = isPrac ? '_PRAC' : '';
    const row = matchingEval || {
      Sub_ID: `SUB_${student.enrollmentNo.trim()}_${selectedCourse.trim().toUpperCase()}${subSuffix}_${currentSession.replace(/\s+/g, '')}`,
      subId: `SUB_${student.enrollmentNo.trim()}_${selectedCourse.trim().toUpperCase()}${subSuffix}_${currentSession.replace(/\s+/g, '')}`,
      Enrollment_No: student.enrollmentNo,
      enrollmentNo: student.enrollmentNo,
      Course_Code: selectedCourse,
      courseCode: selectedCourse,
      tokenNo: student.tokenNo,
      studentName: student.studentName,
      programmeCode: student.programmeCode,
      session: currentSession,
      componentType,
      isPractical: isPrac,
      isLocked: isLockAction,
      intakeId: student.id,
    };

    await saveOrUpdateMarksAndLock(row, currentMark, isLockAction, componentType);
  };

  const handleSaveAndLock = async (
    student: (typeof enrolledStudents)[0],
    componentType: 'Assignment' | 'Practical',
    isLockAction: boolean
  ) => {
    const isPrac = componentType === 'Practical';
    const currentMark = isPrac
      ? getStudentPracticalMark(student, selectedCourse)
      : getStudentAssignmentMark(student, selectedCourse);

    if (currentMark === null || currentMark === undefined) {
      if (isLockAction) {
        alert(
          `Cannot lock ${componentType.toLowerCase()} mark: A valid numerical mark (0-100) must be recorded before locking.`
        );
        return;
      }
    }

    if (isLockAction) {
      const perm = canPerformOperation('marks_locking');
      if (!perm.allowed) {
        showToast('Marks locking is forbidden for your role.', 'error');
        return;
      }
      if (perm.requiresPin) {
        setPinChallenge({
          isOpen: true,
          title: `Coordinator Authorization: Lock Marks for ${student.enrollmentNo}`,
          description: `Locking continuous evaluation marks for course ${selectedCourse} requires Coordinator PIN authorization.`,
          action: () => executeSaveAndLock(student, componentType, isLockAction, currentMark),
        });
        return;
      }
    }

    await executeSaveAndLock(student, componentType, isLockAction, currentMark);
  };

  const handleSaveAndLockComponent = handleSaveAndLock;

  // Administrator Unlock action
  const handleUnlockComponent = async (
    student: (typeof enrolledStudents)[0],
    componentType: 'Assignment' | 'Practical'
  ) => {
    const perm = canPerformOperation('marks_locking');
    if (!perm.allowed) {
      showToast('Unlocking marks is forbidden for your role.', 'error');
      return;
    }

    const unlockAction = async () => {
      const isPrac = componentType === 'Practical';
      const currentMark = isPrac
        ? getStudentPracticalMark(student, selectedCourse)
        : getStudentAssignmentMark(student, selectedCourse);

      const matchingEval = sessionCourseEvaluations.find(
        (e: any) =>
          (e.enrollmentNo === student.enrollmentNo || e.Enrollment_No === student.enrollmentNo) &&
          (e.courseCode === selectedCourse || e.Course_Code === selectedCourse) &&
          (isPrac ? (e.componentType === 'Practical' || e.isPractical) : (!e.componentType || e.componentType === 'Assignment' || !e.isPractical))
      );

      const subSuffix = isPrac ? '_PRAC' : '';
      const row = matchingEval || {
        Sub_ID: `SUB_${student.enrollmentNo.trim()}_${selectedCourse.trim().toUpperCase()}${subSuffix}_${currentSession.replace(/\s+/g, '')}`,
        subId: `SUB_${student.enrollmentNo.trim()}_${selectedCourse.trim().toUpperCase()}${subSuffix}_${currentSession.replace(/\s+/g, '')}`,
        Enrollment_No: student.enrollmentNo,
        enrollmentNo: student.enrollmentNo,
        Course_Code: selectedCourse,
        courseCode: selectedCourse,
        tokenNo: student.tokenNo,
        studentName: student.studentName,
        programmeCode: student.programmeCode,
        session: currentSession,
        componentType,
        isPractical: isPrac,
        isLocked: false,
        intakeId: student.id,
      };

      await saveOrUpdateMarksAndLock(row, currentMark, false, componentType);
    };

    if (perm.requiresPin) {
      setPinChallenge({
        isOpen: true,
        title: `Coordinator Authorization: Unlock Marks for ${student.enrollmentNo}`,
        description: `Unlocking marks for ${selectedCourse} is coordinator-protected. Enter Coordinator PIN to authorize.`,
        action: unlockAction,
      });
      return;
    }

    await unlockAction();
  };

  // Batch lock actions
  const handleBatchLockAssignments = async () => {
    const toLock = enrolledStudents.filter((s) => {
      const mark = getStudentAssignmentMark(s, selectedCourse);
      const lock = getAssignmentLockState(s, selectedCourse);
      return mark !== null && mark !== undefined && !lock.isLocked;
    });

    if (toLock.length === 0) return;
    if (
      !window.confirm(
        `Save & Lock Assignment (TMA) marks for ${toLock.length} student(s) in course ${selectedCourse}?`
      )
    ) {
      return;
    }

    for (const student of toLock) {
      await handleSaveAndLockComponent(student, 'Assignment', true);
    }
  };

  const handleBatchLockPracticals = async () => {
    const toLock = enrolledStudents.filter((s) => {
      const mark = getStudentPracticalMark(s, selectedCourse);
      const lock = getPracticalLockState(s, selectedCourse);
      return mark !== null && mark !== undefined && !lock.isLocked;
    });

    if (toLock.length === 0) return;
    if (
      !window.confirm(
        `Save & Lock Practical (Lab) marks for ${toLock.length} student(s) in course ${selectedCourse}?`
      )
    ) {
      return;
    }

    for (const student of toLock) {
      await handleSaveAndLockComponent(student, 'Practical', true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base sm:text-lg font-bold text-zinc-900">
              Continuous Evaluation & Marks Award Entry
            </h2>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Dedicated marks entry for{' '}
            <strong className="text-zinc-800">Assignment (TMA)</strong> and{' '}
            <strong className="text-purple-900">Practical (Lab)</strong> components. Both are stored
            and reported separately in the data schema for academic cycle{' '}
            <strong className="text-zinc-800">{currentSession}</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleBatchLockAssignments}
            disabled={!selectedCourse || asgnEvaluatedNotLockedCount === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
            title="Lock evaluated Assignment marks for this course"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Lock Assignments ({asgnEvaluatedNotLockedCount})</span>
          </button>

          <button
            onClick={handleBatchLockPracticals}
            disabled={!selectedCourse || pracEvaluatedNotLockedCount === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
            title="Lock evaluated Practical marks for this course"
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span>Lock Practicals ({pracEvaluatedNotLockedCount})</span>
          </button>

          <button
            onClick={() => setIsAwardListModalOpen(true)}
            disabled={!selectedCourse || enrolledStudents.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Generate Official TE-Award Sheet</span>
          </button>
        </div>
      </div>

      {/* Course Selector Ribbon */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <span className="text-xs font-bold uppercase text-zinc-500 tracking-wider">
            Select Course Module for Marks Entry ({currentSession})
          </span>
          {courseHasPractical && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-200">
              <FlaskConical className="w-3 h-3 text-purple-700" />
              <span>Course includes Practical Component</span>
            </span>
          )}
        </div>

        {activeCourseCodes.length === 0 ? (
          <div className="text-xs text-zinc-400 py-4 text-center">
            No courses submitted yet in {currentSession}.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {activeCourseCodes.map((code) => {
              const count = sessionIntakes.filter((r: any) => {
                const courses = r.courseCodes || r.courses || [];
                return (
                  Array.isArray(courses) &&
                  courses.map((c: string) => c.toUpperCase()).includes(code.toUpperCase())
                );
              }).length;
              const isSelected = selectedCourse === code;
              const isDual = isDualComponentCourse(code);
              const isPrac = isPracticalCourse(code);

              return (
                <button
                  key={code}
                  onClick={() => setSelectedCourse(code)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition flex items-center gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-950 text-white shadow-xs'
                      : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200'
                  }`}
                >
                  <span>{code}</span>
                  {isDual && (
                    <span className="px-1 py-0.2 rounded text-[8px] bg-amber-400 text-amber-950 font-sans font-black">
                      TMA+PRAC
                    </span>
                  )}
                  {isPrac && !isDual && (
                    <span className="px-1 py-0.2 rounded text-[8px] bg-purple-400 text-purple-950 font-sans font-black">
                      PRAC
                    </span>
                  )}
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-sans ${
                      isSelected ? 'bg-indigo-700 text-white' : 'bg-zinc-200 text-zinc-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedCourse && (
        <>
          {/* Quick Metrics for Selected Course */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="bg-white p-3.5 rounded-xl border border-zinc-200 shadow-2xs">
              <span className="text-[10px] text-zinc-500 uppercase font-bold block">
                Total Enrolled Candidates
              </span>
              <span className="text-xl font-black text-zinc-900 mt-1 block">
                {stats.total}
              </span>
              <span className="text-[10px] text-zinc-400">Course: {selectedCourse}</span>
            </div>

            <div className="bg-amber-50/50 p-3.5 rounded-xl border border-amber-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-amber-800 uppercase font-bold block">
                  Assignment (TMA) Evaluated
                </span>
                <BookOpen className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <span className="text-xl font-black text-amber-950 mt-1 block">
                {stats.assignmentEvaluated}{' '}
                <span className="text-xs font-normal text-amber-700">/ {stats.assignmentPending} left</span>
              </span>
              <span className="text-[10px] text-amber-800 font-semibold">
                Class Avg: {stats.assignmentAverage} • Pass: {stats.assignmentPassPercentage}%
              </span>
            </div>

            <div className="bg-purple-50/50 p-3.5 rounded-xl border border-purple-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-purple-800 uppercase font-bold block">
                  Practical (Lab) Evaluated
                </span>
                <FlaskConical className="w-3.5 h-3.5 text-purple-600" />
              </div>
              <span className="text-xl font-black text-purple-950 mt-1 block">
                {stats.practicalEvaluated}{' '}
                <span className="text-xs font-normal text-purple-700">/ {stats.practicalPending} left</span>
              </span>
              <span className="text-[10px] text-purple-800 font-semibold">
                Class Avg: {stats.practicalAverage} • Pass: {stats.practicalPassPercentage}%
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-zinc-200 shadow-2xs">
              <span className="text-[10px] text-zinc-500 uppercase font-bold block">
                Course Pass Standard
              </span>
              <span className="text-xl font-black text-emerald-700 mt-1 block">
                ≥ 40%
              </span>
              <span className="text-[10px] text-zinc-500">IGNOU Criterion for TMA & Lab</span>
            </div>
          </div>

          {/* Student Marks Table with Side-by-Side Assignment and Practical Fields */}
          <div className="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-3 bg-zinc-50">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm text-indigo-950 px-2 py-0.5 bg-indigo-100 rounded">
                  {selectedCourse}
                </span>
                <span className="text-xs text-zinc-700 font-semibold">
                  Marks Award Register ({filteredStudents.length} Students)
                </span>
                <span className="text-[11px] text-zinc-500 hidden sm:inline">
                  • Separate TMA & Practical storage
                </span>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter student or enrollment..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left min-w-[900px]">
                <thead className="bg-zinc-100 text-zinc-700 font-semibold border-b border-zinc-200">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3 w-32">Enrollment</th>
                    <th className="py-2.5 px-3 min-w-[140px]">Student Name</th>
                    <th className="py-2.5 px-3 w-28">Token & Date</th>
                    {/* Dedicated Assignment (TMA) Marks Column */}
                    <th className="py-2.5 px-3 w-48 bg-amber-50/70 border-x border-amber-200 text-amber-950 font-bold">
                      <div className="flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-amber-700" />
                        <span>Assignment (TMA)</span>
                      </div>
                      <span className="text-[9px] font-normal text-amber-800 block">
                        Marks (0-100) & Grade
                      </span>
                    </th>
                    {/* Dedicated Practical (Lab) Marks Column */}
                    <th className="py-2.5 px-3 w-48 bg-purple-50/70 border-r border-purple-200 text-purple-950 font-bold">
                      <div className="flex items-center gap-1">
                        <FlaskConical className="w-3.5 h-3.5 text-purple-700" />
                        <span>Practical (Lab)</span>
                      </div>
                      <span className="text-[9px] font-normal text-purple-800 block">
                        Marks (0-100) & Grade
                      </span>
                    </th>
                    <th className="py-2.5 px-3 text-center w-36">Status & Verification</th>
                    <th className="py-2.5 px-3 text-center w-32">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-zinc-400">
                        No students found for course {selectedCourse}.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student, idx) => {
                      const asgnMark = getStudentAssignmentMark(student, selectedCourse);
                      const pracMark = getStudentPracticalMark(student, selectedCourse);

                      const asgnGradeInfo = calculateIGNOUGrade(asgnMark);
                      const pracGradeInfo = calculateIGNOUGrade(pracMark);

                      const asgnLock = getAssignmentLockState(student, selectedCourse);
                      const pracLock = getPracticalLockState(student, selectedCourse);

                      const hasStudentEnrolledPrac =
                        (student.practicalCourses || []).includes(selectedCourse) ||
                        courseHasPractical;

                      return (
                        <tr
                          key={student.id}
                          className={`hover:bg-zinc-50/80 transition ${
                            asgnLock.isLocked && pracLock.isLocked
                              ? 'bg-purple-50/20'
                              : asgnLock.isLocked
                              ? 'bg-amber-50/15'
                              : ''
                          }`}
                        >
                          <td className="py-3 px-3 font-mono text-zinc-400 text-center">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-zinc-900 text-xs">
                            <div>{student.enrollmentNo}</div>
                            <span className="px-1 py-0.2 rounded text-[9px] font-sans font-bold bg-zinc-100 text-zinc-600 border border-zinc-200">
                              {student.programmeCode}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-medium text-zinc-900">
                            <div>{student.studentName}</div>
                            <div className="text-[10px] text-zinc-400 truncate max-w-[150px]">
                              {student.studentPhone || student.studentEmail || 'Registered Learner'}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-zinc-600 font-mono text-[11px]">
                            <div className="font-bold text-zinc-800">{student.tokenNo}</div>
                            <div className="text-[10px] text-zinc-400">
                              {formatDate(student.submissionDate)}
                            </div>
                          </td>

                          {/* DEDICATED ASSIGNMENT (TMA) MARKS FIELD */}
                          <td className="py-3 px-3 bg-amber-50/30 border-x border-amber-200">
                            {asgnLock.isLocked ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 font-mono font-bold text-zinc-900 bg-white border border-amber-300 px-2.5 py-1 rounded-lg w-fit shadow-2xs">
                                  <Lock className="w-3 h-3 text-amber-700" />
                                  <span>{asgnMark !== null ? asgnMark : '—'}</span>
                                  <span className="text-[9px] text-zinc-400 font-normal">/100</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span
                                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${asgnGradeInfo.badgeClass}`}
                                  >
                                    Grade {asgnGradeInfo.grade}
                                  </span>
                                  <span className="text-[9px] text-emerald-800 font-bold">
                                    Locked
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    placeholder="0-100"
                                    value={asgnMark !== null && asgnMark !== undefined ? asgnMark : ''}
                                    onChange={(e) => handleAssignmentMarkChange(student.id, e.target.value)}
                                    onBlur={() => handleSaveAndLockComponent(student, 'Assignment', false)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        handleSaveAndLockComponent(student, 'Assignment', false);
                                      }
                                    }}
                                    className="w-18 px-2 py-1 font-mono text-xs font-bold border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden bg-white text-zinc-900 shadow-2xs"
                                    title="Assignment (TMA) mark (0-100)"
                                  />
                                  <span className="text-[10px] text-zinc-400 font-mono">/100</span>
                                </div>
                                {asgnMark !== null && asgnMark !== undefined && (
                                  <span
                                    className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${asgnGradeInfo.badgeClass}`}
                                  >
                                    Grade {asgnGradeInfo.grade} ({asgnGradeInfo.label})
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* DEDICATED PRACTICAL (LAB) MARKS FIELD */}
                          <td className="py-3 px-3 bg-purple-50/30 border-r border-purple-200">
                            {pracLock.isLocked ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 font-mono font-bold text-purple-950 bg-white border border-purple-300 px-2.5 py-1 rounded-lg w-fit shadow-2xs">
                                  <Lock className="w-3 h-3 text-purple-700" />
                                  <span>{pracMark !== null ? pracMark : '—'}</span>
                                  <span className="text-[9px] text-zinc-400 font-normal">/100</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span
                                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${pracGradeInfo.badgeClass}`}
                                  >
                                    Grade {pracGradeInfo.grade}
                                  </span>
                                  <span className="text-[9px] text-purple-800 font-bold">
                                    Locked
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    placeholder={hasStudentEnrolledPrac ? '0-100' : 'N/A'}
                                    value={pracMark !== null && pracMark !== undefined ? pracMark : ''}
                                    onChange={(e) => handlePracticalMarkChange(student.id, e.target.value)}
                                    onBlur={() => handleSaveAndLockComponent(student, 'Practical', false)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        handleSaveAndLockComponent(student, 'Practical', false);
                                      }
                                    }}
                                    className="w-18 px-2 py-1 font-mono text-xs font-bold border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-hidden bg-white text-zinc-900 shadow-2xs"
                                    title="Practical (Lab) mark (0-100)"
                                  />
                                  <span className="text-[10px] text-purple-700 font-mono">/100</span>
                                </div>
                                {pracMark !== null && pracMark !== undefined ? (
                                  <span
                                    className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${pracGradeInfo.badgeClass}`}
                                  >
                                    Grade {pracGradeInfo.grade} ({pracGradeInfo.label})
                                  </span>
                                ) : hasStudentEnrolledPrac ? (
                                  <span className="text-[9px] text-purple-600 font-medium italic block">
                                    Lab Record Entry
                                  </span>
                                ) : null}
                              </div>
                            )}
                          </td>

                          {/* STATUS & VERIFICATION SEALS */}
                          <td className="py-3 px-3 text-center">
                            <div className="space-y-1">
                              {asgnLock.isLocked && pracLock.isLocked ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-200">
                                  <Stamp className="w-3 h-3 text-purple-700" />
                                  <span>Both Sealed</span>
                                </span>
                              ) : asgnLock.isLocked ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                                  <CheckCircle2 className="w-3 h-3 text-amber-700" />
                                  <span>TMA Locked</span>
                                </span>
                              ) : pracLock.isLocked ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-200">
                                  <CheckCircle2 className="w-3 h-3 text-purple-700" />
                                  <span>Prac Locked</span>
                                </span>
                              ) : asgnMark !== null || pracMark !== null ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>Marks Drafted</span>
                                </span>
                              ) : (
                                <span className="text-zinc-400 text-[10px] italic">
                                  Awaiting Entry
                                </span>
                              )}
                            </div>
                          </td>

                          {/* ACTIONS COLUMN */}
                          <td className="py-3 px-3 text-center">
                            <div className="flex flex-col gap-1 items-center justify-center">
                              {/* Assignment Lock Button */}
                              {!asgnLock.isLocked ? (
                                <button
                                  onClick={() => handleSaveAndLockComponent(student, 'Assignment', true)}
                                  disabled={asgnMark === null || asgnMark === undefined}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition flex items-center gap-1 cursor-pointer ${
                                    asgnMark !== null
                                      ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-2xs'
                                      : 'bg-zinc-100 text-zinc-400 cursor-not-allowed opacity-60'
                                  }`}
                                  title="Lock Assignment (TMA) marks"
                                >
                                  <Lock className="w-2.5 h-2.5" />
                                  <span>Lock TMA</span>
                                </button>
                              ) : isAdmin ? (
                                <button
                                  onClick={() => handleUnlockComponent(student, 'Assignment')}
                                  className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition flex items-center gap-1 cursor-pointer"
                                  title="Admin: Unlock TMA marks"
                                >
                                  <Unlock className="w-2.5 h-2.5 text-rose-600" />
                                  <span>Unlock TMA</span>
                                </button>
                              ) : null}

                              {/* Practical Lock Button */}
                              {!pracLock.isLocked ? (
                                <button
                                  onClick={() => handleSaveAndLockComponent(student, 'Practical', true)}
                                  disabled={pracMark === null || pracMark === undefined}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition flex items-center gap-1 cursor-pointer ${
                                    pracMark !== null
                                      ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-2xs'
                                      : 'bg-zinc-100 text-zinc-400 cursor-not-allowed opacity-60'
                                  }`}
                                  title="Lock Practical (Lab) marks"
                                >
                                  <FlaskConical className="w-2.5 h-2.5" />
                                  <span>Lock Prac</span>
                                </button>
                              ) : isAdmin ? (
                                <button
                                  onClick={() => handleUnlockComponent(student, 'Practical')}
                                  className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition flex items-center gap-1 cursor-pointer"
                                  title="Admin: Unlock Practical marks"
                                >
                                  <Unlock className="w-2.5 h-2.5 text-rose-600" />
                                  <span>Unlock Prac</span>
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Official IGNOU TE-Award Sheet Printable Layout Modal */}
      {isAwardListModalOpen && (
        <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl border border-zinc-300 overflow-hidden my-auto print:m-0 print:border-none print:shadow-none print:w-full">
            {/* Modal Controls */}
            <div className="px-5 py-3 bg-zinc-900 text-white flex items-center justify-between print:hidden">
              <div className="font-semibold text-xs flex items-center gap-2">
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>
                  IGNOU TE-Award Sheet Preview ({selectedCourse}) — Assignment & Practical Separate
                  Format
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Award Sheet
                </button>
                <button
                  onClick={() => setIsAwardListModalOpen(false)}
                  className="px-2 py-1 text-zinc-400 hover:text-white text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Printable Award Sheet Body */}
            <div className="p-8 text-zinc-900 bg-white">
              {/* Sheet Header */}
              <div className="text-center border-b-2 border-zinc-900 pb-3">
                <div className="text-xs uppercase font-black tracking-widest text-zinc-800">
                  Indira Gandhi National Open University (IGNOU)
                </div>
                <div className="text-sm font-black text-zinc-900 uppercase mt-0.5">
                  Term-End Assignment & Practical Award List (TE-Format)
                </div>
                <div className="text-xs text-zinc-600 font-medium">
                  Study Centre: {settings.centreCode} ({settings.institutionName}) • Regional Centre:{' '}
                  {settings.regionalCentreCode}
                </div>
              </div>

              {/* Course & Session Info Bar */}
              <div className="grid grid-cols-4 gap-2 my-4 text-xs border border-zinc-300 p-2.5 rounded bg-zinc-50">
                <div>
                  <span className="text-zinc-500 font-bold block text-[10px] uppercase">
                    Course Code:
                  </span>
                  <span className="font-mono font-black text-sm text-zinc-900">
                    {selectedCourse}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 font-bold block text-[10px] uppercase">
                    Exam / Session:
                  </span>
                  <span className="font-bold text-zinc-900">{currentSession}</span>
                </div>
                <div>
                  <span className="text-zinc-500 font-bold block text-[10px] uppercase">
                    Max Marks:
                  </span>
                  <span className="font-bold text-zinc-900">
                    100 per component (Pass: 40)
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 font-bold block text-[10px] uppercase">
                    Total Candidates:
                  </span>
                  <span className="font-bold text-zinc-900">{enrolledStudents.length}</span>
                </div>
              </div>

              {/* Award Table with Separate Assignment and Practical Columns */}
              <table className="w-full text-xs border border-zinc-400 text-left">
                <thead className="bg-zinc-100 font-bold border-b border-zinc-400">
                  <tr>
                    <th className="py-2 px-2 border-r border-zinc-300 w-10 text-center">S.N.</th>
                    <th className="py-2 px-3 border-r border-zinc-300 w-28">Enrollment No.</th>
                    <th className="py-2 px-3 border-r border-zinc-300">Learner Name</th>
                    <th className="py-2 px-3 border-r border-zinc-300 text-center bg-amber-50/50 w-24">
                      TMA Marks
                    </th>
                    <th className="py-2 px-2 border-r border-zinc-300 text-center w-16">
                      TMA Grade
                    </th>
                    <th className="py-2 px-3 border-r border-zinc-300 text-center bg-purple-50/50 w-24">
                      Practical Marks
                    </th>
                    <th className="py-2 px-2 border-r border-zinc-300 text-center w-16">
                      Prac Grade
                    </th>
                    <th className="py-2 px-3 text-center w-32">Evaluator Sign</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-300">
                  {enrolledStudents.map((student, i) => {
                    const asgnM = getStudentAssignmentMark(student, selectedCourse);
                    const pracM = getStudentPracticalMark(student, selectedCourse);

                    const asgnG = asgnM !== null ? calculateIGNOUGrade(asgnM).grade : 'AB';
                    const pracG = pracM !== null ? calculateIGNOUGrade(pracM).grade : '—';

                    return (
                      <tr key={student.id}>
                        <td className="py-2 px-2 border-r border-zinc-300 text-center font-mono">
                          {i + 1}
                        </td>
                        <td className="py-2 px-3 border-r border-zinc-300 font-mono font-bold">
                          {student.enrollmentNo}
                        </td>
                        <td className="py-2 px-3 border-r border-zinc-300 font-medium">
                          {student.studentName}
                        </td>
                        <td className="py-2 px-3 border-r border-zinc-300 text-center font-mono font-bold text-sm bg-amber-50/20">
                          {asgnM !== null && asgnM !== undefined ? asgnM : 'AB'}
                        </td>
                        <td className="py-2 px-2 border-r border-zinc-300 text-center font-bold">
                          {asgnG}
                        </td>
                        <td className="py-2 px-3 border-r border-zinc-300 text-center font-mono font-bold text-sm bg-purple-50/20">
                          {pracM !== null && pracM !== undefined ? pracM : '—'}
                        </td>
                        <td className="py-2 px-2 border-r border-zinc-300 text-center font-bold">
                          {pracG}
                        </td>
                        <td className="py-2 px-3 border-zinc-300 text-center text-zinc-400">
                          ___________
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Evaluator Certification Footer */}
              <div className="mt-8 pt-4 border-t border-zinc-300 grid grid-cols-2 gap-8 text-xs">
                <div>
                  <div className="font-bold text-zinc-800">Evaluator Certification:</div>
                  <p className="text-[10px] text-zinc-600 mt-1 leading-relaxed">
                    Certified that all Assignment (TMA) scripts and Practical / Lab records received
                    under course {selectedCourse} have been evaluated by me strictly according to IGNOU
                    criteria. Assignment and Practical marks have been awarded and recorded separately.
                  </p>
                  <div className="mt-6">
                    <div className="w-48 border-b border-zinc-800 mb-1"></div>
                    <span className="font-bold">Signature of Approved Evaluator</span>
                  </div>
                </div>

                <div className="text-right flex flex-col justify-between">
                  <div>
                    <div className="font-bold text-zinc-800">Study Centre Verification:</div>
                    <div className="text-[10px] text-zinc-500 mt-1">
                      Verified and checked against counter receipts and primary intake register.
                    </div>
                  </div>
                  <div className="mt-6">
                    <div className="w-48 border-b border-zinc-800 mb-1 ml-auto"></div>
                    <span className="font-bold">
                      {settings.coordinatorName || 'Coordinator / PIC (SC-2033)'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-zinc-50 px-6 py-3 border-t border-zinc-200 text-right print:hidden">
              <button
                onClick={() => setIsAwardListModalOpen(false)}
                className="px-4 py-1.5 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
