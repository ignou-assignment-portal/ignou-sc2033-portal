import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { IGNOU_PROGRAMMES } from '../data/ignouMasterData';
import { SubmissionStatusType, SubmissionMode, AssignmentSubmission } from '../types';
import { formatDate, formatDateTime } from '../utils/helpers';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  ArrowUpDown,
  Download,
  UserCheck,
  UserX,
  Plus,
  Shield,
  Layers,
  AlertCircle,
  FileText,
  UserPlus,
  X,
  GraduationCap,
  Check,
  Sparkles,
  ChevronRight,
  RefreshCw,
  FileCheck2,
  FlaskConical,
} from 'lucide-react';

export const CourseSubmissionsTracker: React.FC = () => {
  const {
    currentSession,
    sessionAssignmentSubmissions,
    updateSubmissionStatus,
    batchUpdateSubmissionStatus,
    recordStudentAssignmentSubmissions,
    currentRole,
    isAdmin,
    settings,
  } = useApp();

  // Mode: Track by Programme vs Track by Course
  const [trackerMode, setTrackerMode] = useState<'PROGRAMME' | 'COURSE'>('PROGRAMME');

  // Component filter: ALL vs Assignment (TMA) vs Practical
  const [componentFilter, setComponentFilter] = useState<'ALL' | 'Assignment' | 'Practical'>('ALL');

  // ==========================================
  // PROGRAMME-LEVEL TRACKING STATE & DATA
  // ==========================================
  // Find all distinct programmes active in the session directly from validated session submissions
  const activeProgrammeCodes = useMemo(() => {
    const progs = Array.from(
      new Set(sessionAssignmentSubmissions.map((s) => s.programmeCode).filter(Boolean))
    );
    return progs.sort();
  }, [sessionAssignmentSubmissions]);

  const [selectedProgramme, setSelectedProgramme] = useState<string>(() => {
    return activeProgrammeCodes[0] || '';
  });

  // Programme search & status filter
  const [progSearchQuery, setProgSearchQuery] = useState('');
  const [progStatusFilter, setProgStatusFilter] = useState<'ALL' | 'COMPLETED' | 'PARTIAL' | 'PENDING'>('ALL');

  // Find programme details from master
  const selectedProgDetails = useMemo(() => {
    const found = IGNOU_PROGRAMMES.find((p) => p.code === selectedProgramme);
    if (found) return found;
    return {
      code: selectedProgramme,
      name: `${selectedProgramme} Academic Programme`,
      level: 'Degree / Diploma',
      courses: [],
    };
  }, [selectedProgramme]);

  // All submissions for this specific programme in current session (respecting componentFilter)
  const programmeSubmissions = useMemo(() => {
    return sessionAssignmentSubmissions.filter((s) => {
      if (s.programmeCode !== selectedProgramme) return false;
      if (componentFilter === 'Assignment') {
        return !s.isPractical && s.componentType !== 'Practical';
      }
      if (componentFilter === 'Practical') {
        return Boolean(s.isPractical || s.componentType === 'Practical');
      }
      return true;
    });
  }, [sessionAssignmentSubmissions, selectedProgramme, componentFilter]);

  // Group programme submissions by student
  const programmeStudents = useMemo(() => {
    const studentMap = new Map<
      string,
      {
        studentId: string;
        studentName: string;
        programmeCode: string;
        courses: {
          submissionId: string;
          courseCode: string;
          status: SubmissionStatusType;
          submissionDate?: string;
          submissionMode?: SubmissionMode;
        }[];
      }
    >();

    programmeSubmissions.forEach((sub) => {
      if (!studentMap.has(sub.studentId)) {
        studentMap.set(sub.studentId, {
          studentId: sub.studentId,
          studentName: sub.studentName,
          programmeCode: sub.programmeCode,
          courses: [],
        });
      }
      studentMap.get(sub.studentId)!.courses.push({
        submissionId: sub.id,
        courseCode: sub.courseCode,
        status: sub.status,
        submissionDate: sub.submissionDate,
        submissionMode: sub.submissionMode,
      });
    });

    return Array.from(studentMap.values());
  }, [programmeSubmissions]);

  // Filtered programme students
  const filteredProgrammeStudents = useMemo(() => {
    return programmeStudents.filter((st) => {
      const q = progSearchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        st.studentId.toLowerCase().includes(q) ||
        st.studentName.toLowerCase().includes(q) ||
        st.courses.some((c) => c.courseCode.toLowerCase().includes(q));

      const submittedCount = st.courses.filter((c) => c.status === 'submitted').length;
      const totalCourses = st.courses.length;

      let matchesStatus = true;
      if (progStatusFilter === 'COMPLETED') {
        matchesStatus = submittedCount === totalCourses && totalCourses > 0;
      } else if (progStatusFilter === 'PARTIAL') {
        matchesStatus = submittedCount > 0 && submittedCount < totalCourses;
      } else if (progStatusFilter === 'PENDING') {
        matchesStatus = submittedCount === 0;
      }

      return matchesSearch && matchesStatus;
    });
  }, [programmeStudents, progSearchQuery, progStatusFilter]);

  // Programme-level metrics
  const progMetrics = useMemo(() => {
    const totalStudents = programmeStudents.length;
    const totalScripts = programmeSubmissions.length;
    const submittedScripts = programmeSubmissions.filter((s) => s.status === 'submitted').length;
    const pendingScripts = totalScripts - submittedScripts;
    const completionRate = totalScripts > 0 ? Math.round((submittedScripts / totalScripts) * 100) : 0;
    const fullySubmittedStudents = programmeStudents.filter(
      (st) => st.courses.every((c) => c.status === 'submitted') && st.courses.length > 0
    ).length;

    return {
      totalStudents,
      totalScripts,
      submittedScripts,
      pendingScripts,
      completionRate,
      fullySubmittedStudents,
    };
  }, [programmeStudents, programmeSubmissions]);

  // ==========================================
  // COURSE-LEVEL TRACKING STATE & DATA
  // ==========================================
  // Find all distinct courses currently registered in the active session directly from validated session submissions
  const activeCourseCodes = useMemo(() => {
    const codes = Array.from(
      new Set(sessionAssignmentSubmissions.map((s) => s.courseCode).filter(Boolean))
    );
    return codes.sort();
  }, [sessionAssignmentSubmissions]);

  // Selected Course
  const [selectedCourse, setSelectedCourse] = useState<string>(() => {
    return activeCourseCodes[0] || '';
  });

  // Auto-populate Course Selection in Stage 3 & Registers & Tracking:
  React.useEffect(() => {
    if (!selectedCourse && activeCourseCodes.length > 0) {
      setSelectedCourse(activeCourseCodes[0]);
    }
  }, [activeCourseCodes, selectedCourse]);

  React.useEffect(() => {
    if (!selectedProgramme && activeProgrammeCodes.length > 0) {
      setSelectedProgramme(activeProgrammeCodes[0]);
    }
  }, [activeProgrammeCodes, selectedProgramme]);

  // Course Filter by Programme
  const [courseProgFilter, setCourseProgFilter] = useState<string>('ALL');

  // Search & Filter in Course mode
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'submitted' | 'not submitted'>('ALL');
  const [selectedSubmissions, setSelectedSubmissions] = useState<string[]>([]);

  // Submission Edit Modal
  const [editingSubmission, setEditingSubmission] = useState<{
    id: string;
    studentName: string;
    studentId: string;
    status: SubmissionStatusType;
    submissionDate: string;
    submissionMode: SubmissionMode;
    consignmentNo: string;
    remarks: string;
  } | null>(null);

  // Quick Add Student to Course Modal
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [newStudentId, setNewStudentId] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [newProgramme, setNewProgramme] = useState('');
  const [newInitialStatus, setNewInitialStatus] = useState<SubmissionStatusType>('not submitted');

  // Find course title and credits from catalog
  const courseDetails = useMemo(() => {
    for (const prog of IGNOU_PROGRAMMES) {
      const found = prog.courses.find((c) => c.code === selectedCourse);
      if (found) {
        return {
          title: found.title,
          credits: found.credits,
          programme: prog.code,
          programmeName: prog.name,
        };
      }
    }
    return {
      title: 'Curriculum Course Module',
      credits: 6,
      programme: selectedCourse.split('-')[0] || 'GEN',
      programmeName: 'IGNOU Academic Programme',
    };
  }, [selectedCourse]);

  // All submissions for this specific course in current session (respecting componentFilter)
  const courseSubmissions = useMemo(() => {
    return sessionAssignmentSubmissions.filter((s) => {
      if (s.courseCode !== selectedCourse) return false;
      if (componentFilter === 'Assignment') {
        return !s.isPractical && s.componentType !== 'Practical';
      }
      if (componentFilter === 'Practical') {
        return Boolean(s.isPractical || s.componentType === 'Practical');
      }
      return true;
    });
  }, [sessionAssignmentSubmissions, selectedCourse, componentFilter]);

  // Filtered by search, status, and programme
  const filteredSubmissions = useMemo(() => {
    return courseSubmissions.filter((s) => {
      const matchesSearch =
        s.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.programmeCode.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
      const matchesProg = courseProgFilter === 'ALL' || s.programmeCode === courseProgFilter;

      return matchesSearch && matchesStatus && matchesProg;
    });
  }, [courseSubmissions, searchQuery, statusFilter, courseProgFilter]);

  // Course Statistics
  const totalCount = courseSubmissions.length;
  const submittedCount = courseSubmissions.filter((s) => s.status === 'submitted').length;
  const notSubmittedCount = totalCount - submittedCount;
  const submissionRate = totalCount > 0 ? Math.round((submittedCount / totalCount) * 100) : 0;

  // Multi-select handlers for course table
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedSubmissions(filteredSubmissions.map((s) => s.id));
    } else {
      setSelectedSubmissions([]);
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedSubmissions((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Quick toggle single course submission status
  const handleQuickToggleStatus = (subId: string, currentStatus: SubmissionStatusType) => {
    const nextStatus: SubmissionStatusType = currentStatus === 'submitted' ? 'not submitted' : 'submitted';
    updateSubmissionStatus(subId, nextStatus, {
      submissionDate: nextStatus === 'submitted' ? new Date().toISOString().split('T')[0] : undefined,
      submissionMode: nextStatus === 'submitted' ? 'In-Person (Desk)' : undefined,
    });
  };

  // Batch updates in course view
  const handleBatchMarkSubmitted = () => {
    if (selectedSubmissions.length === 0) return;
    batchUpdateSubmissionStatus(selectedSubmissions, 'submitted');
    setSelectedSubmissions([]);
  };

  const handleBatchMarkNotSubmitted = () => {
    if (selectedSubmissions.length === 0) return;
    batchUpdateSubmissionStatus(selectedSubmissions, 'not submitted');
    setSelectedSubmissions([]);
  };

  // Quick Action for a whole student in Programme View: Mark all registered courses as submitted
  const handleMarkAllSubmittedForStudent = (student: (typeof programmeStudents)[0]) => {
    const unsubmittedIds = student.courses
      .filter((c) => c.status === 'not submitted')
      .map((c) => c.submissionId);
    if (unsubmittedIds.length > 0) {
      batchUpdateSubmissionStatus(unsubmittedIds, 'submitted');
    }
  };

  // Save submission details edit
  const handleSaveEditSubmission = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubmission) return;

    updateSubmissionStatus(editingSubmission.id, editingSubmission.status, {
      submissionDate: editingSubmission.submissionDate,
      submissionMode: editingSubmission.submissionMode,
      consignmentNo: editingSubmission.consignmentNo,
      remarks: editingSubmission.remarks,
    });

    setEditingSubmission(null);
  };

  // Handle adding new student to this course
  const handleAddNewStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentId.trim() || !newStudentName.trim()) {
      alert('Student ID and Name are required.');
      return;
    }
    if (!/^\d{9,10}$/.test(newStudentId.trim())) {
      alert('IGNOU Enrollment Number must be 9 or 10 numeric digits.');
      return;
    }

    recordStudentAssignmentSubmissions({
      studentId: newStudentId.trim(),
      studentName: newStudentName.trim(),
      programmeCode: newProgramme || courseDetails.programme,
      courseCodes: [selectedCourse],
      session: currentSession,
      initialStatus: newInitialStatus,
      submissionDate: newInitialStatus === 'submitted' ? new Date().toISOString().split('T')[0] : undefined,
      submissionMode: 'In-Person (Desk)',
    });

    setNewStudentId('');
    setNewStudentName('');
    setIsAddStudentOpen(false);
  };

  // Export Programme CSV
  const handleExportProgrammeCSV = () => {
    const headers = [
      'EnrolmentNo',
      'StudentName',
      'Programme',
      'RegisteredCourses',
      'TotalCourses',
      'SubmittedCount',
      'PendingCount',
      'CompletionRate',
      'StatusBreakdown',
      'AcademicSession',
    ];

    const rows = filteredProgrammeStudents.map((st) => {
      const submittedCnt = st.courses.filter((c) => c.status === 'submitted').length;
      const totalCnt = st.courses.length;
      const rate = totalCnt > 0 ? Math.round((submittedCnt / totalCnt) * 100) : 0;
      const courseListStr = st.courses.map((c) => `${c.courseCode} (${c.status})`).join('; ');

      return [
        `"${st.studentId}"`,
        `"${st.studentName}"`,
        `"${st.programmeCode}"`,
        `"${st.courses.map((c) => c.courseCode).join(', ')}"`,
        totalCnt,
        submittedCnt,
        totalCnt - submittedCnt,
        `"${rate}%"`,
        `"${courseListStr}"`,
        `"${currentSession}"`,
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `IGNOU_${selectedProgramme}_${currentSession.replace(/\s+/g, '_')}_Programme_Submissions.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Course CSV
  const handleExportCourseCSV = () => {
    const headers = [
      'StudentID',
      'StudentName',
      'Programme',
      'CourseCode',
      'AcademicSession',
      'SubmissionStatus',
      'SubmissionDate',
      'SubmissionMode',
      'ConsignmentNumber',
      'Remarks',
      'LastUpdatedBy',
    ];

    const rows = filteredSubmissions.map((s) => [
      `"${s.studentId}"`,
      `"${s.studentName}"`,
      `"${s.programmeCode}"`,
      `"${s.courseCode}"`,
      `"${s.session}"`,
      `"${s.status}"`,
      `"${s.submissionDate || ''}"`,
      `"${s.submissionMode || ''}"`,
      `"${s.consignmentNo || ''}"`,
      `"${s.remarks || ''}"`,
      `"${s.updatedBy || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `IGNOU_${selectedCourse}_${currentSession.replace(/\s+/g, '_')}_Course_Submissions.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Notice */}
      <div className="bg-gradient-to-r from-teal-950 via-zinc-900 to-indigo-950 text-white p-5 rounded-2xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-teal-400 text-zinc-950 uppercase tracking-wide">
              Official Submissions Tracker
            </span>
            <span className="text-xs text-zinc-300">
              Active Cycle: <strong className="text-white">{currentSession}</strong>
            </span>
            <span className="text-xs text-zinc-400 hidden sm:inline">•</span>
            <span className="text-xs text-teal-300 font-mono hidden sm:inline">
              Programme & Course Synchronization
            </span>
          </div>
          <h2 className="text-lg font-bold mt-1">
            Assignment Submission Status Tracker (Programme & Course Matrix)
          </h2>
          <p className="text-xs text-zinc-300 mt-0.5 max-w-2xl">
            Track student handwritten assignment submission status (<span className="text-emerald-300 font-semibold">submitted</span> vs <span className="text-amber-300 font-semibold">not submitted</span>) by entire academic programme cohort or drilled down to individual course codes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {trackerMode === 'COURSE' ? (
            <>
              <button
                onClick={() => setIsAddStudentOpen(true)}
                id="register-course-student-btn"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-zinc-950 text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Enroll Student</span>
              </button>
              <button
                onClick={handleExportCourseCSV}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/15 transition cursor-pointer"
                title="Export Course CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </>
          ) : (
            <button
              onClick={handleExportProgrammeCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-zinc-950 text-xs font-bold transition shadow-xs cursor-pointer"
              title="Export Full Programme Roster CSV"
            >
              <Download className="w-4 h-4" />
              <span>Export Programme CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* Primary Toggle: Track by Programme vs Track by Course + Component Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-zinc-200/80 p-1 rounded-xl max-w-fit text-xs font-bold shadow-2xs">
            <button
              type="button"
              id="track-by-programme-btn"
              onClick={() => setTrackerMode('PROGRAMME')}
              className={`px-4 py-2 rounded-lg transition flex items-center gap-2 cursor-pointer ${
                trackerMode === 'PROGRAMME'
                  ? 'bg-white text-zinc-950 shadow-xs font-bold'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <GraduationCap className="w-4 h-4 text-indigo-600" />
              <span>Track by Programme</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 text-indigo-800 font-bold font-mono">
                {activeProgrammeCodes.length}
              </span>
            </button>

            <button
              type="button"
              id="track-by-course-btn"
              onClick={() => setTrackerMode('COURSE')}
              className={`px-4 py-2 rounded-lg transition flex items-center gap-2 cursor-pointer ${
                trackerMode === 'COURSE'
                  ? 'bg-white text-zinc-950 shadow-xs font-bold'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <BookOpen className="w-4 h-4 text-teal-600" />
              <span>Track by Course</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-teal-100 text-teal-800 font-bold font-mono">
                {activeCourseCodes.length}
              </span>
            </button>
          </div>

          {/* Component Filter Toggle: All vs TMA vs Practical */}
          <div className="flex items-center bg-zinc-200/80 p-1 rounded-xl text-xs font-bold shadow-2xs">
            <button
              type="button"
              onClick={() => setComponentFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                componentFilter === 'ALL'
                  ? 'bg-zinc-950 text-white shadow-xs font-black'
                  : 'text-zinc-600 hover:text-zinc-950'
              }`}
              title="View all submissions (TMA + Practical)"
            >
              <span>All Submissions</span>
            </button>

            <button
              type="button"
              onClick={() => setComponentFilter('Assignment')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                componentFilter === 'Assignment'
                  ? 'bg-indigo-600 text-white shadow-xs font-black'
                  : 'text-zinc-600 hover:text-zinc-950'
              }`}
              title="Filter by Theory Assignment (TMA) - Submitted by all students"
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>TMA (Assignment)</span>
            </button>

            <button
              type="button"
              onClick={() => setComponentFilter('Practical')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                componentFilter === 'Practical'
                  ? 'bg-purple-700 text-white shadow-xs font-black'
                  : 'text-purple-900 hover:text-purple-950'
              }`}
              title="Filter by Practical (Lab / Viva / Project) - Submitted by few students"
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>Practical</span>
            </button>
          </div>
        </div>

        <div className="text-xs text-zinc-500 flex items-center gap-2">
          <span>Active View:</span>
          <span className="font-bold text-zinc-900">
            {trackerMode === 'PROGRAMME'
              ? `Programme Cohort: ${selectedProgramme}`
              : `Course Module: ${selectedCourse}`}
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: TRACK BY PROGRAMME (Cohort Roster & Multi-Course Status)          */}
      {/* ========================================================================= */}
      {trackerMode === 'PROGRAMME' && (
        <div className="space-y-6">
          {/* Programme Quick Selector Ribbon */}
          <div className="bg-white rounded-2xl p-5 border border-zinc-200 shadow-2xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-zinc-100">
              <div className="flex-1 max-w-md">
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                  Select Programme to Track
                </label>
                <div className="relative">
                  <select
                    value={selectedProgramme}
                    onChange={(e) => setSelectedProgramme(e.target.value)}
                    id="programme-selector-dropdown"
                    className="w-full pl-3 pr-10 py-2.5 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-bold text-zinc-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition cursor-pointer"
                  >
                    {activeProgrammeCodes.map((code) => {
                      const progSubs = sessionAssignmentSubmissions.filter((s) => s.programmeCode === code);
                      const subCnt = progSubs.filter((s) => s.status === 'submitted').length;
                      return (
                        <option key={code} value={code}>
                          {code} — ({subCnt}/{progSubs.length} scripts submitted)
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Selected Programme Meta Card */}
              <div className="flex items-center gap-3 bg-indigo-50/70 border border-indigo-200 rounded-xl px-4 py-2.5">
                <div className="w-10 h-10 rounded-lg bg-indigo-900 text-white flex items-center justify-center font-bold text-base shadow-2xs">
                  <GraduationCap className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <div className="text-xs text-indigo-700 font-semibold uppercase">
                    {selectedProgDetails.level} • IGNOU SC-2033
                  </div>
                  <div className="text-sm font-bold text-zinc-900">{selectedProgDetails.name}</div>
                </div>
              </div>
            </div>

            {/* Quick 1-Click Pills for Active Programmes */}
            <div>
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block mb-1.5">
                Quick Select Active Programmes:
              </span>
              <div className="flex flex-wrap gap-2">
                {activeProgrammeCodes.map((code) => {
                  const progSubs = sessionAssignmentSubmissions.filter((s) => s.programmeCode === code);
                  const subCnt = progSubs.filter((s) => s.status === 'submitted').length;
                  const isSelected = selectedProgramme === code;

                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setSelectedProgramme(code)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-2 border ${
                        isSelected
                          ? 'bg-indigo-950 text-white border-indigo-950 shadow-xs font-bold'
                          : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-zinc-200'
                      }`}
                    >
                      <span className="font-mono font-black">{code}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                          isSelected ? 'bg-amber-400 text-zinc-950 font-bold' : 'bg-zinc-200 text-zinc-700'
                        }`}
                      >
                        {subCnt}/{progSubs.length}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4 Metric Summary Blocks for Selected Programme */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
                <div className="flex items-center justify-between text-zinc-500 text-xs font-bold uppercase">
                  <span>Enrolled Candidates</span>
                  <Layers className="w-4 h-4 text-zinc-400" />
                </div>
                <div className="text-2xl font-black text-zinc-900 mt-1">{progMetrics.totalStudents}</div>
                <div className="text-[11px] text-zinc-500 mt-1">Students enrolled in {selectedProgramme}</div>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
                <div className="flex items-center justify-between text-emerald-800 text-xs font-bold uppercase">
                  <span>Submitted Scripts</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-black text-emerald-950 mt-1">
                  {progMetrics.submittedScripts}
                </div>
                <div className="text-[11px] text-emerald-700 mt-1">
                  {progMetrics.completionRate}% of {progMetrics.totalScripts} total scripts
                </div>
              </div>

              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200">
                <div className="flex items-center justify-between text-amber-800 text-xs font-bold uppercase">
                  <span>Pending Submissions</span>
                  <Clock className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-2xl font-black text-amber-950 mt-1">{progMetrics.pendingScripts}</div>
                <div className="text-[11px] text-amber-700 mt-1">Awaiting physical submission</div>
              </div>

              <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200">
                <div className="flex items-center justify-between text-indigo-800 text-xs font-bold uppercase">
                  <span>Fully Completed Students</span>
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="text-2xl font-black text-indigo-950 mt-1">
                  {progMetrics.fullySubmittedStudents}
                </div>
                <div className="text-[11px] text-indigo-700 mt-1">All registered courses submitted</div>
              </div>
            </div>
          </div>

          {/* Programme Students Cohort Table */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xs overflow-hidden">
            {/* Table Search & Filter Bar */}
            <div className="p-4 sm:p-5 border-b border-zinc-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-zinc-50/50">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Filter by Enrolment No, Student Name, or Course Code..."
                  value={progSearchQuery}
                  onChange={(e) => setProgSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-zinc-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center bg-white border border-zinc-300 rounded-xl p-1 text-xs">
                  <span className="text-zinc-400 text-[10px] font-bold px-2 uppercase">Status:</span>
                  {(['ALL', 'COMPLETED', 'PARTIAL', 'PENDING'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setProgStatusFilter(mode)}
                      className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer text-[11px] ${
                        progStatusFilter === mode
                          ? 'bg-zinc-900 text-white shadow-2xs'
                          : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Students Table */}
            <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead className="bg-zinc-50 text-zinc-600 uppercase text-[10px] font-bold border-b border-zinc-200">
                  <tr>
                    <th className="py-3 px-4">Enrolment No</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Registered Courses & 1-Click Toggle</th>
                    <th className="py-3 px-4 text-center">Progress</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {filteredProgrammeStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-zinc-400">
                        No students found matching your criteria in programme{' '}
                        <strong className="text-zinc-800 font-mono">{selectedProgramme}</strong>.
                      </td>
                    </tr>
                  ) : (
                    filteredProgrammeStudents.map((st) => {
                      const submittedCourses = st.courses.filter((c) => c.status === 'submitted');
                      const totalCourses = st.courses.length;
                      const isComplete = submittedCourses.length === totalCourses && totalCourses > 0;
                      const isPending = submittedCourses.length === 0;

                      return (
                        <tr key={st.studentId} className="hover:bg-zinc-50/80 transition">
                          <td className="py-3 px-4 font-mono font-bold text-indigo-950 text-xs">
                            {st.studentId}
                          </td>
                          <td className="py-3 px-4 font-semibold text-zinc-900">
                            {st.studentName}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1.5 items-center">
                              {st.courses.map((course) => {
                                const isSub = course.status === 'submitted';
                                return (
                                  <button
                                    key={course.submissionId}
                                    type="button"
                                    onClick={() =>
                                      handleQuickToggleStatus(course.submissionId, course.status)
                                    }
                                    className={`px-2 py-1 rounded-md text-[11px] font-mono font-bold flex items-center gap-1 transition cursor-pointer border shadow-2xs ${
                                      isSub
                                        ? 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
                                        : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                                    }`}
                                    title={`Click to toggle ${course.courseCode} status (Currently: ${course.status})`}
                                  >
                                    <span>{course.courseCode}</span>
                                    {isSub ? (
                                      <Check className="w-3 h-3 text-emerald-600" />
                                    ) : (
                                      <Clock className="w-3 h-3 text-amber-600" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                            <span className="text-[10px] text-zinc-400 mt-1 block">
                              Click any course pill to immediately toggle submission status
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="font-bold text-xs text-zinc-800">
                              {submittedCourses.length} / {totalCourses}
                            </div>
                            <div className="w-16 bg-zinc-200 h-1.5 rounded-full mx-auto mt-1 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  isComplete ? 'bg-emerald-500' : 'bg-indigo-600'
                                }`}
                                style={{
                                  width: `${
                                    totalCourses > 0
                                      ? (submittedCourses.length / totalCourses) * 100
                                      : 0
                                  }%`,
                                }}
                              />
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isComplete ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Completed</span>
                              </span>
                            ) : isPending ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                <Clock className="w-3 h-3 text-amber-600" />
                                <span>Pending</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                                <span>Partial</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {!isComplete && (
                              <button
                                type="button"
                                onClick={() => handleMarkAllSubmittedForStudent(st)}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 transition cursor-pointer"
                                title="Mark all registered courses as submitted for this student"
                              >
                                Mark All
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Programme Table Footer */}
            <div className="px-5 py-3 bg-zinc-50 border-t border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-zinc-500">
              <div>
                Showing <strong className="text-zinc-800">{filteredProgrammeStudents.length}</strong> of{' '}
                <strong className="text-zinc-800">{programmeStudents.length}</strong> students in programme{' '}
                <strong className="font-mono text-zinc-900">{selectedProgramme}</strong>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  {progMetrics.submittedScripts} Scripts Received
                </span>
                <span className="flex items-center gap-1 text-amber-700 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  {progMetrics.pendingScripts} Pending
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: TRACK BY COURSE (Individual Course Script Rosters & Edits)        */}
      {/* ========================================================================= */}
      {trackerMode === 'COURSE' && (
        <div className="space-y-6">
          {/* Course Selector & Key Metrics */}
          <div className="bg-white rounded-2xl p-5 border border-zinc-200 shadow-2xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-zinc-100">
              {/* Course dropdown picker */}
              <div className="flex-1 max-w-md">
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                  Select Course Module to Track
                </label>
                <div className="relative">
                  <select
                    value={selectedCourse}
                    onChange={(e) => {
                      setSelectedCourse(e.target.value);
                      setSelectedSubmissions([]);
                    }}
                    id="course-selector-dropdown"
                    className="w-full pl-3 pr-10 py-2.5 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-bold text-zinc-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition cursor-pointer"
                  >
                    {activeCourseCodes.map((code) => {
                      const subList = sessionAssignmentSubmissions.filter((s) => s.courseCode === code);
                      const subCount = subList.filter((s) => s.status === 'submitted').length;
                      return (
                        <option key={code} value={code}>
                          {code} — ({subCount}/{subList.length} submitted)
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Selected Course Info Badge */}
              <div className="flex items-center gap-3 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-base">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-zinc-500 font-semibold uppercase">
                    {courseDetails.programme} • {courseDetails.credits} Credits
                  </div>
                  <div className="text-sm font-bold text-zinc-900">{courseDetails.title}</div>
                </div>
              </div>
            </div>

            {/* 3 Metric Summary Blocks */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
                <div className="flex items-center justify-between text-zinc-500 text-xs font-bold uppercase">
                  <span>Total Registered</span>
                  <Layers className="w-4 h-4 text-zinc-400" />
                </div>
                <div className="text-2xl font-black text-zinc-900 mt-1">{totalCount}</div>
                <div className="text-[11px] text-zinc-500 mt-1">Students enrolled in {selectedCourse}</div>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
                <div className="flex items-center justify-between text-emerald-800 text-xs font-bold uppercase">
                  <span>Submitted</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-black text-emerald-950 mt-1">
                  {submittedCount}
                </div>
                <div className="text-[11px] text-emerald-700 mt-1">
                  {submissionRate}% completion rate
                </div>
              </div>

              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200">
                <div className="flex items-center justify-between text-amber-800 text-xs font-bold uppercase">
                  <span>Not Submitted</span>
                  <Clock className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-2xl font-black text-amber-950 mt-1">{notSubmittedCount}</div>
                <div className="text-[11px] text-amber-700 mt-1">Pending physical submission</div>
              </div>
            </div>
          </div>

          {/* Submissions Table & Actions */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xs overflow-hidden">
            {/* Table Search & Batch Actions Bar */}
            <div className="p-4 sm:p-5 border-b border-zinc-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-zinc-50/50">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Filter by Student ID, Name, or Programme..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-zinc-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Programme Filter Dropdown */}
                <select
                  value={courseProgFilter}
                  onChange={(e) => setCourseProgFilter(e.target.value)}
                  className="px-2.5 py-1.5 border border-zinc-300 rounded-xl text-xs bg-white font-medium focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ALL">All Programmes</option>
                  {activeProgrammeCodes.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>

                <div className="flex items-center bg-white border border-zinc-300 rounded-xl p-1 text-xs">
                  <span className="text-zinc-400 text-[10px] font-bold px-2 uppercase">Status:</span>
                  {(['ALL', 'submitted', 'not submitted'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setStatusFilter(mode)}
                      className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer text-[11px] ${
                        statusFilter === mode
                          ? 'bg-zinc-900 text-white shadow-2xs'
                          : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                    >
                      {mode === 'ALL' ? 'All' : mode === 'submitted' ? 'Submitted' : 'Pending'}
                    </button>
                  ))}
                </div>

                {/* Batch Action Buttons */}
                {selectedSubmissions.length > 0 && (
                  <div className="flex items-center gap-1.5 animate-in fade-in">
                    <button
                      onClick={handleBatchMarkSubmitted}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1 cursor-pointer"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Mark Submitted ({selectedSubmissions.length})</span>
                    </button>
                    <button
                      onClick={handleBatchMarkNotSubmitted}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1 cursor-pointer"
                    >
                      <UserX className="w-3.5 h-3.5" />
                      <span>Mark Not Submitted</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Submissions Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 text-zinc-600 uppercase text-[10px] font-bold border-b border-zinc-200">
                  <tr>
                    <th className="py-3 px-4 w-10">
                      <input
                        type="checkbox"
                        checked={
                          filteredSubmissions.length > 0 &&
                          selectedSubmissions.length === filteredSubmissions.length
                        }
                        onChange={handleSelectAll}
                        className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-4">Student ID (Enrolment)</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Programme</th>
                    <th className="py-3 px-4">Course</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Submission Details</th>
                    <th className="py-3 px-4">Last Updated</th>
                    <th className="py-3 px-4 text-right">Quick Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {filteredSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-zinc-400">
                        No submissions recorded for course{' '}
                        <strong className="text-zinc-800 font-mono">{selectedCourse}</strong>.
                      </td>
                    </tr>
                  ) : (
                    filteredSubmissions.map((sub) => {
                      const isSubmitted = sub.status === 'submitted';
                      const isSelected = selectedSubmissions.includes(sub.id);

                      return (
                        <tr
                          key={sub.id}
                          className={`hover:bg-zinc-50/80 transition ${
                            isSelected ? 'bg-indigo-50/40' : ''
                          }`}
                        >
                          <td className="py-3 px-4">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectOne(sub.id)}
                              className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-indigo-950">
                            {sub.studentId}
                          </td>
                          <td className="py-3 px-4 font-semibold text-zinc-900">
                            {sub.studentName}
                          </td>
                          <td className="py-3 px-4 font-semibold text-zinc-600">
                            <span className="px-1.5 py-0.5 bg-zinc-100 rounded text-zinc-800 font-mono font-bold">
                              {sub.programmeCode}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-zinc-800">
                            <div className="flex items-center gap-1.5">
                              <span>{sub.courseCode}</span>
                              {sub.componentType === 'Practical' || sub.isPractical ? (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-100 text-purple-900 border border-purple-200 font-sans font-bold">
                                  Practical
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-100 text-zinc-700 border border-zinc-200 font-sans font-medium">
                                  TMA
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isSubmitted ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Submitted</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                <Clock className="w-3 h-3 text-amber-600" />
                                <span>Not Submitted</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-zinc-700">
                            {isSubmitted ? (
                              <div>
                                <div className="font-semibold text-zinc-900">
                                  {sub.submissionDate ? formatDate(sub.submissionDate) : 'Date recorded'}
                                </div>
                                <div className="text-[11px] text-zinc-500">
                                  {sub.submissionMode || 'Desk Intake'}
                                  {sub.consignmentNo ? ` • Track: ${sub.consignmentNo}` : ''}
                                </div>
                              </div>
                            ) : (
                              <span className="text-zinc-400 italic text-[11px]">
                                Awaiting physical script
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-zinc-600 text-[11px]">
                            <div>{sub.updatedBy}</div>
                            <div className="text-zinc-400 font-mono text-[10px]">
                              {formatDateTime(sub.updatedAt)}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => handleQuickToggleStatus(sub.id, sub.status)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                                  isSubmitted
                                    ? 'bg-amber-100 hover:bg-amber-200 text-amber-900'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                                }`}
                                title={isSubmitted ? 'Change to Not Submitted' : 'Mark as Submitted'}
                              >
                                {isSubmitted ? 'Mark Not Submitted' : 'Mark Submitted'}
                              </button>
                              <button
                                onClick={() =>
                                  setEditingSubmission({
                                    id: sub.id,
                                    studentName: sub.studentName,
                                    studentId: sub.studentId,
                                    status: sub.status,
                                    submissionDate:
                                      sub.submissionDate || new Date().toISOString().split('T')[0],
                                    submissionMode: sub.submissionMode || 'In-Person (Desk)',
                                    consignmentNo: sub.consignmentNo || '',
                                    remarks: sub.remarks || '',
                                  })
                                }
                                className="p-1 text-zinc-400 hover:text-zinc-700 rounded hover:bg-zinc-100 transition cursor-pointer"
                                title="Edit Submission Details"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Course Table Footer */}
            <div className="px-5 py-3 bg-zinc-50 border-t border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-zinc-500">
              <div>
                Showing <strong className="text-zinc-800">{filteredSubmissions.length}</strong> of{' '}
                <strong className="text-zinc-800">{courseSubmissions.length}</strong> students in course{' '}
                <strong className="font-mono text-zinc-900">{selectedCourse}</strong>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  {submittedCount} Submitted
                </span>
                <span className="flex items-center gap-1 text-amber-700 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  {notSubmittedCount} Not Submitted
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Submission Details Modal */}
      {editingSubmission && (
        <div className="fixed inset-0 bg-zinc-950/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-zinc-200">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
              <h3 className="font-bold text-sm text-zinc-900">
                Update Course Submission Status
              </h3>
              <button
                onClick={() => setEditingSubmission(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditSubmission} className="mt-4 space-y-4 text-xs">
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 grid grid-cols-2 gap-2">
                <div>
                  <span className="text-zinc-500 text-[10px] uppercase font-bold block">Student</span>
                  <span className="font-bold text-zinc-900">{editingSubmission.studentName}</span>
                </div>
                <div>
                  <span className="text-zinc-500 text-[10px] uppercase font-bold block">Enrollment No.</span>
                  <span className="font-mono font-bold text-indigo-950">{editingSubmission.studentId}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-zinc-500 text-[10px] uppercase font-bold block">Course & Session</span>
                  <span className="font-bold text-zinc-800">{selectedCourse} • {currentSession}</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Submission Status</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setEditingSubmission({ ...editingSubmission, status: 'submitted' })
                    }
                    className={`py-2 px-3 rounded-xl font-bold border text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      editingSubmission.status === 'submitted'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900'
                        : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Submitted</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingSubmission({ ...editingSubmission, status: 'not submitted' })
                    }
                    className={`py-2 px-3 rounded-xl font-bold border text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      editingSubmission.status === 'not submitted'
                        ? 'bg-amber-50 border-amber-500 text-amber-900'
                        : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Not Submitted</span>
                  </button>
                </div>
              </div>

              {editingSubmission.status === 'submitted' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-zinc-700 mb-1">Submission Date</label>
                      <input
                        type="date"
                        value={editingSubmission.submissionDate}
                        onChange={(e) =>
                          setEditingSubmission({ ...editingSubmission, submissionDate: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-zinc-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-zinc-700 mb-1">Submission Mode</label>
                      <select
                        value={editingSubmission.submissionMode}
                        onChange={(e) =>
                          setEditingSubmission({
                            ...editingSubmission,
                            submissionMode: e.target.value as SubmissionMode,
                          })
                        }
                        className="w-full px-3 py-2 border border-zinc-300 rounded-lg bg-white"
                      >
                        <option value="In-Person (Desk)">In-Person (Physical Desk)</option>
                        <option value="Speed Post">Speed Post (India Post)</option>
                        <option value="Registered Post">Registered Post</option>
                        <option value="Courier">Courier / Dispatch</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-zinc-700 mb-1">
                      Consignment / Tracking Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ED948120394IN"
                      value={editingSubmission.consignmentNo}
                      onChange={(e) =>
                        setEditingSubmission({ ...editingSubmission, consignmentNo: e.target.value })
                      }
                      className="w-full px-3 py-2 font-mono border border-zinc-300 rounded-lg"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Physical script verified by counter official"
                  value={editingSubmission.remarks}
                  onChange={(e) =>
                    setEditingSubmission({ ...editingSubmission, remarks: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setEditingSubmission(null)}
                  className="px-4 py-2 text-zinc-600 hover:bg-zinc-100 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xs"
                >
                  Save Submission
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Add Student Modal */}
      {isAddStudentOpen && (
        <div className="fixed inset-0 bg-zinc-950/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-zinc-200">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
              <h3 className="font-bold text-sm text-zinc-900">
                Enroll Student in {selectedCourse}
              </h3>
              <button
                onClick={() => setIsAddStudentOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddNewStudent} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  IGNOU Enrollment No. <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={10}
                  placeholder="9 or 10 numeric digits"
                  value={newStudentId}
                  onChange={(e) => setNewStudentId(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3 py-2 font-mono font-bold border border-zinc-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Candidate Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Student name"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Programme Code
                </label>
                <input
                  type="text"
                  placeholder={`Default: ${courseDetails.programme}`}
                  value={newProgramme}
                  onChange={(e) => setNewProgramme(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 font-mono uppercase border border-zinc-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Initial Status</label>
                <select
                  value={newInitialStatus}
                  onChange={(e) => setNewInitialStatus(e.target.value as SubmissionStatusType)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg bg-white"
                >
                  <option value="not submitted">Not Submitted (Pending)</option>
                  <option value="submitted">Submitted (Received at Desk)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsAddStudentOpen(false)}
                  className="px-4 py-2 text-zinc-600 hover:bg-zinc-100 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold shadow-xs"
                >
                  Confirm Enrollment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
