import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { CourseEvaluationRecord, IntakeRecord, Evaluator, FullDatabaseBackup } from '../types';
import {
  Database,
  Search,
  Filter,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  Layers,
  Users,
  FileText,
  FileSpreadsheet,
  RotateCcw,
  SlidersHorizontal,
  ChevronDown,
} from 'lucide-react';
import { formatDate } from '../utils/helpers';

type SubTab = 'evaluations' | 'intakes' | 'evaluators' | 'diagnostics';

export const DatabaseRecordEditor: React.FC = () => {
  const {
    currentSession,
    availableSessions,
    allCourseEvaluations,
    sessionCourseEvaluations,
    allIntakes,
    sessionIntakes,
    evaluators,
    updateCourseLedgerInline,
    deleteCourseEvaluationDirect,
    batchUpdateCourseEvaluations,
    updateIntakeInline,
    deleteIntakeRecordDirect,
    manualInjectRecord,
    reconcileIntakeAndCourseLedger,
    lastDiscrepancyReport,
    exportFullDatabaseJSON,
    importFullDatabaseJSON,
    resetSessionData,
    showToast,
    isAdmin,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<SubTab>('evaluations');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSession, setSelectedSession] = useState<string>(currentSession || 'July 2026');
  const [componentFilter, setComponentFilter] = useState<'ALL' | 'Assignment' | 'Practical'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Selected row IDs for batch actions
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [batchEvaluator, setBatchEvaluator] = useState<string>('');

  // Edit Course Evaluation Modal
  const [editingEval, setEditingEval] = useState<CourseEvaluationRecord | null>(null);
  const [evalForm, setEvalForm] = useState({
    marks: '',
    status: 'Pending Allotment',
    allottedEvaluator: 'Unallotted',
    isLocked: false,
    remarks: '',
  });

  // Edit Intake Modal
  const [editingIntake, setEditingIntake] = useState<IntakeRecord | null>(null);
  const [intakeForm, setIntakeForm] = useState({
    studentName: '',
    enrollmentNo: '',
    studentPhone: '',
    programmeCode: '',
    coursesStr: '',
    submissionDate: '',
    submissionMode: 'In-Person (Desk)',
  });

  // New Script Modal
  const [isAddScriptModalOpen, setIsAddScriptModalOpen] = useState(false);
  const [newScriptForm, setNewScriptForm] = useState({
    enrollmentNo: '',
    studentName: '',
    programmeCode: 'MEG',
    courseCode: '',
    componentType: 'Assignment' as 'Assignment' | 'Practical',
    marks: '',
    status: 'Pending Allotment',
    allottedEvaluator: 'Unallotted',
  });

  // File input ref for JSON restore
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Raw course evaluations with robust fallback
  const rawEvals = (allCourseEvaluations && allCourseEvaluations.length > 0) ? allCourseEvaluations : sessionCourseEvaluations;

  // Filtered Course Evaluations
  const filteredEvaluations = useMemo(() => {
    return rawEvals.filter((row) => {
      const sess = row.session || (row as any).Session || '';
      if (selectedSession !== 'ALL' && sess.trim().toLowerCase() !== selectedSession.trim().toLowerCase()) {
        return false;
      }
      if (componentFilter !== 'ALL') {
        const isPrac = Boolean(row.isPractical || row.componentType === 'Practical');
        if (componentFilter === 'Practical' && !isPrac) return false;
        if (componentFilter === 'Assignment' && isPrac) return false;
      }
      if (statusFilter !== 'ALL') {
        const curStatus = (row.status || (row as any).Status || '').toLowerCase();
        if (curStatus !== statusFilter.toLowerCase()) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const enr = (row.enrollmentNo || (row as any).Enrollment_No || '').toLowerCase();
        const name = (row.studentName || (row as any).Candidate_Name || '').toLowerCase();
        const code = (row.courseCode || (row as any).Course_Code || '').toLowerCase();
        const ev = (row.allottedEvaluator || (row as any).Allotted_Evaluator || '').toLowerCase();
        return enr.includes(q) || name.includes(q) || code.includes(q) || ev.includes(q);
      }
      return true;
    });
  }, [rawEvals, selectedSession, componentFilter, statusFilter, searchQuery]);

  // Filtered Intake Records
  const filteredIntakes = useMemo(() => {
    return (allIntakes && allIntakes.length > 0 ? allIntakes : sessionIntakes).filter((row) => {
      const sess = row.session || (row as any).Session || '';
      if (selectedSession !== 'ALL' && sess.trim().toLowerCase() !== selectedSession.trim().toLowerCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const enr = (row.enrollmentNo || (row as any).Enrollment_No || '').toLowerCase();
        const name = (row.studentName || (row as any).Candidate_Name || '').toLowerCase();
        const tok = (row.tokenNo || '').toLowerCase();
        const courses = (row.courseCodes || []).join(' ').toLowerCase();
        return enr.includes(q) || name.includes(q) || tok.includes(q) || courses.includes(q);
      }
      return true;
    });
  }, [allIntakes, sessionIntakes, selectedSession, searchQuery]);

  // Handle open edit for evaluation
  const handleOpenEditEval = (row: CourseEvaluationRecord) => {
    setEditingEval(row);
    setEvalForm({
      marks: row.marks !== null && row.marks !== undefined ? String(row.marks) : '',
      status: row.status || (row as any).Status || 'Pending Allotment',
      allottedEvaluator: row.allottedEvaluator || (row as any).Allotted_Evaluator || 'Unallotted',
      isLocked: Boolean(row.isLocked),
      remarks: row.remarks || '',
    });
  };

  const handleSaveEval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEval) return;
    const numMarks = evalForm.marks !== '' ? Number(evalForm.marks) : null;
    await updateCourseLedgerInline(editingEval.subId || editingEval.id, {
      marks: numMarks,
      status: evalForm.status as any,
      allottedEvaluator: evalForm.allottedEvaluator,
      isLocked: evalForm.isLocked,
      remarks: evalForm.remarks,
    });
    setEditingEval(null);
  };

  // Handle open edit for intake
  const handleOpenEditIntake = (row: IntakeRecord) => {
    setEditingIntake(row);
    setIntakeForm({
      studentName: row.studentName || (row as any).Candidate_Name || '',
      enrollmentNo: row.enrollmentNo || '',
      studentPhone: row.studentPhone || '',
      programmeCode: row.programmeCode || '',
      coursesStr: (row.courseCodes || []).join(', '),
      submissionDate: row.submissionDate || '',
      submissionMode: row.submissionMode || 'In-Person (Desk)',
    });
  };

  const handleSaveIntake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIntake) return;
    const courses = intakeForm.coursesStr
      .split(',')
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean);

    await updateIntakeInline(editingIntake.id, {
      studentName: intakeForm.studentName,
      enrollmentNo: intakeForm.enrollmentNo,
      studentPhone: intakeForm.studentPhone,
      programmeCode: intakeForm.programmeCode,
      courseCodes: courses,
      submissionDate: intakeForm.submissionDate,
      submissionMode: intakeForm.submissionMode as any,
    });
    setEditingIntake(null);
  };

  // Handle batch evaluator allotment
  const handleBatchAllot = async () => {
    if (selectedRowIds.length === 0 || !batchEvaluator) return;
    await batchUpdateCourseEvaluations(selectedRowIds, {
      allottedEvaluator: batchEvaluator,
      status: 'Allotted',
    });
    setSelectedRowIds([]);
    setBatchEvaluator('');
  };

  // Handle batch lock
  const handleBatchLock = async (lockState: boolean) => {
    if (selectedRowIds.length === 0) return;
    await batchUpdateCourseEvaluations(selectedRowIds, {
      isLocked: lockState,
      status: lockState ? 'Marks Locked' : 'Evaluated',
    });
    setSelectedRowIds([]);
  };

  // Handle create direct script
  const handleCreateScript = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScriptForm.enrollmentNo || !newScriptForm.courseCode) {
      showToast('Enrollment Number and Course Code are required.', 'error');
      return;
    }
    const cleanCourse = newScriptForm.courseCode.trim().toUpperCase();
    const cleanEnr = newScriptForm.enrollmentNo.trim().toUpperCase();
    const isPrac = newScriptForm.componentType === 'Practical';
    const subSuffix = isPrac ? '_PRAC' : '';
    const sess = selectedSession !== 'ALL' ? selectedSession : currentSession;
    const subId = `SUB_${cleanEnr}_${cleanCourse}${subSuffix}_${sess.replace(/\s+/g, '')}`;

    const newRow: CourseEvaluationRecord = {
      id: subId,
      subId,
      submissionKey: subId,
      tokenNo: `MANUAL-${Date.now().toString().slice(-4)}`,
      enrollmentNo: cleanEnr,
      studentName: newScriptForm.studentName.trim() || 'Direct Entry Student',
      candidateName: newScriptForm.studentName.trim() || 'Direct Entry Student',
      programmeCode: newScriptForm.programmeCode.trim().toUpperCase(),
      courseCode: cleanCourse,
      session: sess,
      componentType: newScriptForm.componentType,
      isPractical: isPrac,
      marks: newScriptForm.marks !== '' ? Number(newScriptForm.marks) : null,
      grade: null,
      gradeLabel: null,
      status: newScriptForm.status as any,
      isLocked: false,
      lockedAt: null,
      lockedBy: null,
      submissionDate: new Date().toISOString().split('T')[0],
      submissionMode: 'In-Person (Desk)',
      evaluatorId: null,
      allottedEvaluator: newScriptForm.allottedEvaluator,
      allottedDate: newScriptForm.allottedEvaluator !== 'Unallotted' ? new Date().toISOString().split('T')[0] : null,
      updatedAt: new Date().toISOString(),
    };

    await manualInjectRecord('evaluation', newRow);
    setIsAddScriptModalOpen(false);
    setNewScriptForm({
      enrollmentNo: '',
      studentName: '',
      programmeCode: 'MEG',
      courseCode: '',
      componentType: 'Assignment',
      marks: '',
      status: 'Pending Allotment',
      allottedEvaluator: 'Unallotted',
    });
  };

  // Handle JSON file upload
  const handleJSONFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (!parsed.data) {
          showToast('Invalid backup file: Missing "data" payload.', 'error');
          return;
        }
        const confirmRestore = window.confirm(
          `Are you sure you want to restore this backup? It contains records from ${parsed.exportedAt || 'previous backup'}.`
        );
        if (confirmRestore) {
          const res = await importFullDatabaseJSON(parsed);
          if (res.success) {
            showToast('Database restore completed.', 'success');
          } else {
            showToast(res.message, 'error');
          }
        }
      } catch (err: any) {
        showToast(`Failed to parse JSON file: ${err.message}`, 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const selectAllRows = () => {
    if (selectedRowIds.length === filteredEvaluations.length) {
      setSelectedRowIds([]);
    } else {
      setSelectedRowIds(filteredEvaluations.map((r) => r.id));
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Banner / Explanation */}
      <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Database className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold tracking-tight">Database & Record Management Suite</h2>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Full self-service administration of Study Centre 2033 records. Add, edit marks, re-allot evaluators, delete records, or run self-healing synchronization directly without requiring external code fixes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportFullDatabaseJSON}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold rounded-lg border border-slate-700 transition shadow-xs cursor-pointer"
            title="Download complete database state to JSON file"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            Backup JSON
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold rounded-lg border border-slate-700 transition shadow-xs cursor-pointer"
            title="Restore database state from a JSON backup file"
          >
            <Upload className="w-4 h-4 text-indigo-400" />
            Restore JSON
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleJSONFileSelected}
            accept=".json,application/json"
            className="hidden"
          />
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => { setActiveSubTab('evaluations'); setSelectedRowIds([]); }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'evaluations'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            Course Evaluations ({rawEvals.length})
          </button>
          <button
            type="button"
            onClick={() => { setActiveSubTab('intakes'); setSelectedRowIds([]); }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'intakes'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-teal-600" />
            Intake Receipts ({allIntakes.length > 0 ? allIntakes.length : sessionIntakes.length})
          </button>
          <button
            type="button"
            onClick={() => { setActiveSubTab('evaluators'); setSelectedRowIds([]); }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'evaluators'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-amber-600" />
            Evaluators ({evaluators.length})
          </button>
          <button
            type="button"
            onClick={() => { setActiveSubTab('diagnostics'); setSelectedRowIds([]); }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'diagnostics'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5 text-purple-600" />
            Self-Healing & Diagnostics
          </button>
        </div>

        {/* Global Session Filter for the editor */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">Session Filter:</span>
          <select
            value={selectedSession}
            onChange={(e) => setSelectedSession(e.target.value)}
            className="px-2.5 py-1 bg-white border border-slate-300 rounded-md text-xs font-medium text-slate-800 shadow-2xs focus:ring-1 focus:ring-slate-900"
          >
            <option value="ALL">All Academic Sessions</option>
            {availableSessions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* SUB-TAB 1: COURSE EVALUATIONS EDITOR */}
      {activeSubTab === 'evaluations' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200">
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by student, enrollment, or course..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <select
                value={componentFilter}
                onChange={(e) => setComponentFilter(e.target.value as any)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700"
              >
                <option value="ALL">All Components</option>
                <option value="Assignment">Assignment (TMA)</option>
                <option value="Practical">Practical Lab</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700"
              >
                <option value="ALL">All Statuses</option>
                <option value="pending allotment">Pending Allotment</option>
                <option value="allotted">Allotted</option>
                <option value="evaluated">Evaluated</option>
                <option value="marks locked">Marks Locked</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAddScriptModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-md shadow-2xs transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Script Direct
              </button>
            </div>
          </div>

          {/* Batch Actions Toolbar */}
          {selectedRowIds.length > 0 && (
            <div className="bg-indigo-50 border border-indigo-200 p-2.5 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-indigo-900 font-semibold">
                <span>{selectedRowIds.length} script(s) selected</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={batchEvaluator}
                  onChange={(e) => setBatchEvaluator(e.target.value)}
                  className="px-2.5 py-1 bg-white border border-indigo-300 rounded text-xs text-slate-800"
                >
                  <option value="">Select Evaluator to Allot...</option>
                  {evaluators.map((ev) => (
                    <option key={ev.id} value={ev.name}>{ev.name} ({ev.evaluatorCode})</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleBatchAllot}
                  disabled={!batchEvaluator}
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded font-medium cursor-pointer"
                >
                  Apply Allotment
                </button>

                <button
                  type="button"
                  onClick={() => handleBatchLock(true)}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-medium flex items-center gap-1 cursor-pointer"
                >
                  <Lock className="w-3 h-3" /> Lock Marks
                </button>

                <button
                  type="button"
                  onClick={() => handleBatchLock(false)}
                  className="px-2.5 py-1 bg-slate-600 hover:bg-slate-700 text-white rounded font-medium flex items-center gap-1 cursor-pointer"
                >
                  <Unlock className="w-3 h-3" /> Unlock Marks
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRowIds([])}
                  className="px-2 py-1 text-slate-600 hover:text-slate-900 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Records Table */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto max-h-[560px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-3 w-8">
                      <input
                        type="checkbox"
                        checked={selectedRowIds.length === filteredEvaluations.length && filteredEvaluations.length > 0}
                        onChange={selectAllRows}
                        className="rounded border-slate-300"
                      />
                    </th>
                    <th className="p-3">Course</th>
                    <th className="p-3">Student / Enrollment</th>
                    <th className="p-3">Prog</th>
                    <th className="p-3">Component</th>
                    <th className="p-3">Allotted Faculty</th>
                    <th className="p-3 text-center">Marks</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-xs">
                  {filteredEvaluations.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400 font-sans">
                        No course evaluation records match the current filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredEvaluations.map((row) => {
                      const isSelected = selectedRowIds.includes(row.id);
                      const isPrac = Boolean(row.isPractical || row.componentType === 'Practical');
                      const enr = row.enrollmentNo || (row as any).Enrollment_No;
                      const cand = row.studentName || (row as any).Candidate_Name;
                      const code = row.courseCode || (row as any).Course_Code;
                      const prog = row.programmeCode || (row as any).Programme;
                      const evaluator = row.allottedEvaluator || (row as any).Allotted_Evaluator || 'Unallotted';
                      const marksVal = row.marks !== null && row.marks !== undefined ? row.marks : '-';

                      return (
                        <tr
                          key={row.id || row.subId}
                          className={`hover:bg-slate-50 transition ${
                            isSelected ? 'bg-indigo-50/50' : ''
                          }`}
                        >
                          <td className="p-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedRowIds((prev) => [...prev, row.id]);
                                } else {
                                  setSelectedRowIds((prev) => prev.filter((id) => id !== row.id));
                                }
                              }}
                              className="rounded border-slate-300"
                            />
                          </td>
                          <td className="p-3 font-bold text-slate-900">{code}</td>
                          <td className="p-3 font-sans">
                            <div className="font-semibold text-slate-800">{cand}</div>
                            <div className="text-[11px] font-mono text-slate-500">{enr}</div>
                          </td>
                          <td className="p-3">{prog}</td>
                          <td className="p-3 font-sans">
                            <span className={`text-[11px] font-medium ${isPrac ? 'text-amber-700' : 'text-slate-600'}`}>
                              {isPrac ? 'Practical' : 'Assignment'}
                            </span>
                          </td>
                          <td className="p-3 font-sans text-slate-700 truncate max-w-[140px]">
                            {evaluator}
                          </td>
                          <td className="p-3 text-center font-bold">
                            {marksVal !== '-' ? (
                              <span className="text-emerald-700">{marksVal}</span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="p-3 font-sans">
                            <span className="text-[11px] text-slate-600">
                              {row.status || 'Pending'}
                            </span>
                            {row.isLocked && <Lock className="w-3 h-3 text-amber-600 inline ml-1" />}
                          </td>
                          <td className="p-3 text-right font-sans">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenEditEval(row)}
                                className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded cursor-pointer"
                                title="Edit Marks & Faculty Allotment"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(`Delete script ${code} for ${cand}?`)) {
                                    deleteCourseEvaluationDirect(row.subId || row.id);
                                  }
                                }}
                                className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded cursor-pointer"
                                title="Delete Script Row"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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

            <div className="bg-slate-50 p-2.5 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
              <span>Showing {filteredEvaluations.length} of {rawEvals.length} total scripts</span>
              <span>Selected Session: {selectedSession}</span>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: INTAKE RECEIPTS EDITOR */}
      {activeSubTab === 'intakes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by token, candidate name, or enrollment..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
              />
            </div>
            <div className="text-xs text-slate-500">
              Total Receipts: <strong>{filteredIntakes.length}</strong>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto max-h-[560px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-3">Token No</th>
                    <th className="p-3">Enrollment</th>
                    <th className="p-3">Candidate Name</th>
                    <th className="p-3">Prog</th>
                    <th className="p-3">Submitted Courses</th>
                    <th className="p-3">Receipt Date</th>
                    <th className="p-3">Mode</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredIntakes.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        No intake records match the current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredIntakes.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-mono font-bold text-slate-900">{row.tokenNo}</td>
                        <td className="p-3 font-mono text-slate-700">{row.enrollmentNo}</td>
                        <td className="p-3 font-medium text-slate-800">{row.studentName}</td>
                        <td className="p-3 font-mono">{row.programmeCode}</td>
                        <td className="p-3 font-mono text-[11px] text-slate-600 max-w-xs truncate">
                          {(row.courseCodes || []).join(', ')}
                        </td>
                        <td className="p-3 text-slate-600">{row.submissionDate}</td>
                        <td className="p-3 text-slate-600">{row.submissionMode || 'Desk'}</td>
                        <td className="p-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditIntake(row)}
                              className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded cursor-pointer"
                              title="Edit Intake Details"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Delete Intake ${row.tokenNo} for ${row.studentName}? Linked course evaluations will also be removed.`)) {
                                  deleteIntakeRecordDirect(row.id, true);
                                }
                              }}
                              className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded cursor-pointer"
                              title="Delete Intake Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: EVALUATORS DIRECTORY */}
      {activeSubTab === 'evaluators' && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto max-h-[560px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-3">Code</th>
                    <th className="p-3">Faculty Name</th>
                    <th className="p-3">Designation / College</th>
                    <th className="p-3">Phone</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Approved Courses</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {evaluators.map((ev) => (
                    <tr key={ev.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-mono font-bold text-slate-900">{ev.evaluatorCode}</td>
                      <td className="p-3 font-semibold text-slate-800">{ev.name}</td>
                      <td className="p-3 text-slate-600">
                        <div>{ev.designation}</div>
                        <div className="text-[11px] text-slate-400">{ev.collegeInstitution}</div>
                      </td>
                      <td className="p-3 font-mono text-slate-600">{ev.contactPhone || '-'}</td>
                      <td className="p-3 text-slate-600">{ev.email || '-'}</td>
                      <td className="p-3 font-mono text-[11px] text-slate-600 max-w-xs truncate">
                        {(ev.eligibleCourses || []).join(', ')}
                      </td>
                      <td className="p-3">
                        <span className={`text-[11px] font-medium ${ev.status === 'Active' ? 'text-emerald-700' : 'text-slate-500'}`}>
                          {ev.status || 'Active'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: SELF-HEALING DIAGNOSTICS & BACKUP */}
      {activeSubTab === 'diagnostics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Intake <-> Evaluation Parity */}
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <RefreshCw className="w-4 h-4 text-indigo-600" />
              <h3>Force Synchronize & Parity Check</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Scans all intake records against the Course Evaluation Ledger. Automatically unpacks any missing course scripts and repairs orphaned records without touching existing marks.
            </p>
            {lastDiscrepancyReport && (
              <div className="bg-slate-50 p-3 rounded border border-slate-200 text-xs space-y-1 font-mono">
                <div>Intakes Audited: <strong>{lastDiscrepancyReport.totalIntakes}</strong></div>
                <div>Course Scripts Tally: <strong>{lastDiscrepancyReport.totalCourseEvaluations}</strong></div>
                <div>Restored / Fixed: <strong>{lastDiscrepancyReport.fixedCount}</strong></div>
                <div className="text-[11px] text-slate-500">Last run: {formatDate(lastDiscrepancyReport.lastReconciledAt || '')}</div>
              </div>
            )}
            <button
              type="button"
              onClick={() => reconcileIntakeAndCourseLedger(false)}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-md shadow-2xs transition cursor-pointer"
            >
              Run Full Parity Audit Now
            </button>
          </div>

          {/* Card 2: Complete JSON State Backup */}
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <Download className="w-4 h-4 text-emerald-600" />
              <h3>Complete JSON Backup & Restore</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Export the entire system state (intakes, course evaluations, evaluators, packets, bills, and settings) into a portable JSON snapshot. Restore it anytime.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={exportFullDatabaseJSON}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md shadow-2xs transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Download JSON Backup
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-md shadow-2xs transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                Restore from JSON
              </button>
            </div>
          </div>

          {/* Card 3: Session Data Reset */}
          <div className="bg-white p-5 rounded-lg border border-rose-200 shadow-2xs space-y-3 md:col-span-2">
            <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <h3>Selective Session Data Cleanup</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Remove all student receipts, evaluations, and packets for a specific academic cycle without wiping your study centre configuration or faculty directory.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Are you absolutely sure you want to clear all records for cycle "${currentSession}"?`)) {
                    resetSessionData(currentSession);
                  }
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-md shadow-2xs transition cursor-pointer"
              >
                Clear Records for "{currentSession}" Only
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT EVALUATION MODAL */}
      {editingEval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Edit Script: {editingEval.courseCode}</h3>
                <p className="text-[11px] text-slate-300 font-mono">{editingEval.studentName} ({editingEval.enrollmentNo})</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingEval(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEval} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Marks (0 - 100)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={evalForm.marks}
                  onChange={(e) => setEvalForm({ ...evalForm, marks: e.target.value })}
                  placeholder="Enter evaluated marks..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Evaluation Status</label>
                <select
                  value={evalForm.status}
                  onChange={(e) => setEvalForm({ ...evalForm, status: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-900"
                >
                  <option value="Pending Allotment">Pending Allotment</option>
                  <option value="Allotted">Allotted</option>
                  <option value="Evaluated">Evaluated</option>
                  <option value="Marks Locked">Marks Locked</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Allotted Evaluator</label>
                <select
                  value={evalForm.allottedEvaluator}
                  onChange={(e) => setEvalForm({ ...evalForm, allottedEvaluator: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-900"
                >
                  <option value="Unallotted">Unallotted</option>
                  {evaluators.map((ev) => (
                    <option key={ev.id} value={ev.name}>{ev.name} ({ev.evaluatorCode})</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="lockCheckbox"
                  checked={evalForm.isLocked}
                  onChange={(e) => setEvalForm({ ...evalForm, isLocked: e.target.checked })}
                  className="rounded border-slate-300"
                />
                <label htmlFor="lockCheckbox" className="text-slate-800 font-medium">
                  Lock Marks against further modification
                </label>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Remarks</label>
                <input
                  type="text"
                  value={evalForm.remarks}
                  onChange={(e) => setEvalForm({ ...evalForm, remarks: e.target.value })}
                  placeholder="Optional evaluator notes..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingEval(null)}
                  className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded-md font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md font-semibold cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT INTAKE MODAL */}
      {editingIntake && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Edit Intake Receipt</h3>
                <p className="text-[11px] text-slate-300 font-mono">{editingIntake.tokenNo}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingIntake(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveIntake} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Candidate Name</label>
                <input
                  type="text"
                  value={intakeForm.studentName}
                  onChange={(e) => setIntakeForm({ ...intakeForm, studentName: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Enrollment Number</label>
                <input
                  type="text"
                  value={intakeForm.enrollmentNo}
                  onChange={(e) => setIntakeForm({ ...intakeForm, enrollmentNo: e.target.value.toUpperCase() })}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Programme Code</label>
                <input
                  type="text"
                  value={intakeForm.programmeCode}
                  onChange={(e) => setIntakeForm({ ...intakeForm, programmeCode: e.target.value.toUpperCase() })}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Submitted Course Codes (comma-separated)</label>
                <input
                  type="text"
                  value={intakeForm.coursesStr}
                  onChange={(e) => setIntakeForm({ ...intakeForm, coursesStr: e.target.value })}
                  required
                  placeholder="e.g. MEG-01, MEG-02, MEG-03"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Submission Date</label>
                <input
                  type="date"
                  value={intakeForm.submissionDate}
                  onChange={(e) => setIntakeForm({ ...intakeForm, submissionDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingIntake(null)}
                  className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded-md font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md font-semibold cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD SCRIPT DIRECT MODAL */}
      {isAddScriptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="font-bold text-sm">Add Course Evaluation Script Directly</h3>
              <button
                type="button"
                onClick={() => setIsAddScriptModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateScript} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Enrollment Number *</label>
                <input
                  type="text"
                  value={newScriptForm.enrollmentNo}
                  onChange={(e) => setNewScriptForm({ ...newScriptForm, enrollmentNo: e.target.value.toUpperCase() })}
                  required
                  placeholder="e.g. 2350198421"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Student Name</label>
                <input
                  type="text"
                  value={newScriptForm.studentName}
                  onChange={(e) => setNewScriptForm({ ...newScriptForm, studentName: e.target.value })}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Programme Code *</label>
                  <input
                    type="text"
                    value={newScriptForm.programmeCode}
                    onChange={(e) => setNewScriptForm({ ...newScriptForm, programmeCode: e.target.value.toUpperCase() })}
                    required
                    placeholder="e.g. MEG"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Course Code *</label>
                  <input
                    type="text"
                    value={newScriptForm.courseCode}
                    onChange={(e) => setNewScriptForm({ ...newScriptForm, courseCode: e.target.value.toUpperCase() })}
                    required
                    placeholder="e.g. MEG-01"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Component Type</label>
                  <select
                    value={newScriptForm.componentType}
                    onChange={(e) => setNewScriptForm({ ...newScriptForm, componentType: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                  >
                    <option value="Assignment">Assignment (TMA)</option>
                    <option value="Practical">Practical Lab</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Initial Marks (Optional)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newScriptForm.marks}
                    onChange={(e) => setNewScriptForm({ ...newScriptForm, marks: e.target.value })}
                    placeholder="0-100"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Allotted Faculty</label>
                <select
                  value={newScriptForm.allottedEvaluator}
                  onChange={(e) => setNewScriptForm({ ...newScriptForm, allottedEvaluator: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                >
                  <option value="Unallotted">Unallotted</option>
                  {evaluators.map((ev) => (
                    <option key={ev.id} value={ev.name}>{ev.name} ({ev.evaluatorCode})</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddScriptModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded-md font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md font-semibold cursor-pointer"
                >
                  Create Script
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
