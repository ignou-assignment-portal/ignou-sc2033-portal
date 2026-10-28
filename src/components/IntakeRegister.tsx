import React, { useState, useMemo } from 'react';
import { useApp, norm } from '../context/AppContext';
import { IntakeStatus, SubmissionMode } from '../types';
import { formatDate, calculateIGNOUGrade, isPracticalCourse } from '../utils/helpers';
import {
  Search,
  Filter,
  Download,
  Printer,
  Trash2,
  FlaskConical,
  Edit2,
  Pencil,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  FileSpreadsheet,
  Award,
  ChevronRight,
  ShieldAlert,
  Calendar,
  X,
} from 'lucide-react';
import { EditIntakeModal } from './EditIntakeModal';

export const IntakeRegister: React.FC = () => {
  const {
    currentSession,
    sessionIntakes,
    allIntakes,
    intakeRegister,
    allCourseEvaluations,
    updateIntakeRecord,
    deleteIntakeRecord,
    updateIntakeDate,
    openReceiptModal,
    isAdmin,
    verifyAndSetAdminRole,
    showToast,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedMode, setSelectedMode] = useState<string>('ALL');
  const [selectedProgramme, setSelectedProgramme] = useState<string>('ALL');
  const [selectedComponentFilter, setSelectedComponentFilter] = useState<'ALL' | 'TMA' | 'PRACTICAL'>('ALL');
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [quickDateModalRecord, setQuickDateModalRecord] = useState<any | null>(null);
  const [quickDateValue, setQuickDateValue] = useState<string>('');

  const normalizeDateInput = (val?: any): string => {
    if (!val) return new Date().toISOString().split('T')[0];
    const str = String(val).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    if (str.includes('T')) return str.split('T')[0];
    const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (dmyMatch) {
      const [, d, m, y] = dmyMatch;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
    return new Date().toISOString().split('T')[0];
  };

  const handleEditClick = (record: any) => {
    setEditingRecord(record);
  };

  const handleQuickDateClick = (record: any) => {
    const initialDate = normalizeDateInput(
      record.submissionDate ||
      record.receiptDate ||
      record.Submission_Date ||
      record.Timestamp ||
      record.createdAt
    );
    setQuickDateValue(initialDate);
    setQuickDateModalRecord(record);
  };

  const handleQuickDateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickDateModalRecord || !quickDateValue) return;
    const targetId = quickDateModalRecord.id || quickDateModalRecord.tokenNo;
    await updateIntakeDate(targetId, quickDateValue);
    showToast(`Submission date updated to ${formatDate(quickDateValue)} across all linked records.`, 'success');
    setQuickDateModalRecord(null);
  };

  const handleDeleteClick = (record: any) => {
    const candName = record.Candidate_Name || record.candidateName || record["Candidate Name"] || record.studentName || '-';
    const enr = record.Enrollment_No || record.enrollmentNo || record["Enrollment No"] || '-';
    const activeSession = record.Session || record.session || currentSession;

    // 1. Access Guard: Require Coordinator Mode (PIN 2033) for Delete actions
    if (!isAdmin) {
      const enteredPin = window.prompt('Coordinator PIN Required: Enter PIN 2033 to authorize deletion of intake records:');
      if (!enteredPin) return;
      if (enteredPin.trim() === '2033') {
        const authorized = verifyAndSetAdminRole('2033');
        if (!authorized) {
          showToast('Coordinator PIN verification failed.', 'error');
          return;
        }
      } else {
        showToast('Unauthorized: Incorrect Coordinator PIN.', 'error');
        return;
      }
    }

    // 2. Check if any course for this student in courseLedger has status === "Locked" or isLocked
    const isAnyCourseLocked = allCourseEvaluations.some(
      (ce) =>
        (ce.intakeId === record.id || ce.enrollmentNo.trim() === String(enr).trim()) &&
        norm(ce.session) === norm(activeSession) &&
        (ce.isLocked || (ce.status as any) === 'Locked' || ce.status === 'Marks Locked')
    );

    if (isAnyCourseLocked) {
      showToast('Cannot delete intake. Marks have already been locked for one or more courses.', 'error');
      return;
    }

    // 3. Confirmation dialog allowing users to delete mistakes made during intake
    const confirmed = window.confirm(
      `Delete Intake Entry?\n\nAre you sure you want to delete intake record for ${candName} (${enr})?\n\nThis will completely purge the intake record and cascade cleanup across Course Ledger, Receipts, and Submissions.`
    );

    if (confirmed) {
      deleteIntakeRecord(record.id);
      showToast(`Intake record for ${candName} (${enr}) deleted successfully.`, 'success');
    }
  };

  const normalizeSession = (s: any) => norm(s);
  const sessionRecords = useMemo(() => {
    return sessionIntakes;
  }, [sessionIntakes]);

  // Filtered records supporting both snake_case and camelCase keys
  const filteredRecords = useMemo(() => {
    return sessionRecords.filter((row: any) => {
      const q = searchQuery.toLowerCase().trim();
      const enrollment = String(row.Enrollment_No || row.enrollmentNo || row["Enrollment No"] || "");
      const candidate = String(row.Candidate_Name || row.candidateName || row["Candidate Name"] || row.studentName || "");
      const contact = String(row.Contact || row.contact || row["Contact Number"] || row.studentPhone || "");
      const programme = String(row.Programme || row.programme || row.programmeCode || "");
      const token = String(row.Token_No || row.tokenNo || row.token || row.id || "");
      const rawCourses = row.Courses || row.courses || row.courseCodes || [];
      const coursesStr = Array.isArray(rawCourses) ? rawCourses.join(", ") : String(rawCourses || "");

      const matchesQuery =
        !q ||
        token.toLowerCase().includes(q) ||
        enrollment.toLowerCase().includes(q) ||
        candidate.toLowerCase().includes(q) ||
        programme.toLowerCase().includes(q) ||
        coursesStr.toLowerCase().includes(q) ||
        contact.toLowerCase().includes(q);

      const status = row.status || row.Status || 'Received';
      const mode = row.submissionMode || row.mode || row['Submission Mode'] || 'In-Person (Desk)';

      const matchesStatus = selectedStatus === 'ALL' || status === selectedStatus;
      const matchesMode = selectedMode === 'ALL' || mode === selectedMode;
      const matchesProgramme = selectedProgramme === 'ALL' || programme === selectedProgramme;

      let matchesComponent = true;
      if (selectedComponentFilter !== 'ALL') {
        const pracList: string[] = (row.practicalCourses || []).map((c: any) => String(c).trim().toUpperCase());
        const asgnList: string[] = (row.assignmentCourses || []).map((c: any) => String(c).trim().toUpperCase());
        const rowCourses: string[] = Array.isArray(rawCourses)
          ? rawCourses.map((c: any) => String(c).replace(/\s*[\(\[](Practical|TMA|P|Asgn)[\)\]]\s*/gi, '').trim().toUpperCase())
          : String(rawCourses || '').split(',').map((c) => c.replace(/\s*[\(\[](Practical|TMA|P|Asgn)[\)\]]\s*/gi, '').trim().toUpperCase()).filter(Boolean);

        const hasPracticalCourse =
          pracList.length > 0 ||
          row.componentType === 'Practical' ||
          row.Component === 'Practical' ||
          row.isPractical === true ||
          rowCourses.some((c) => pracList.includes(c) || isPracticalCourse(c));

        const hasAssignmentCourse =
          asgnList.length > 0 ||
          row.componentType === 'Assignment' ||
          row.Component === 'Assignment' ||
          rowCourses.some((c) => asgnList.includes(c) || !isPracticalCourse(c));

        if (selectedComponentFilter === 'PRACTICAL') {
          matchesComponent = Boolean(hasPracticalCourse);
        } else if (selectedComponentFilter === 'TMA') {
          matchesComponent = Boolean(hasAssignmentCourse);
        }
      }

      return matchesQuery && matchesStatus && matchesMode && matchesProgramme && matchesComponent;
    });
  }, [sessionRecords, searchQuery, selectedStatus, selectedMode, selectedProgramme, selectedComponentFilter]);

  // Unique programmes in this session
  const sessionProgrammes = useMemo(() => {
    return Array.from(
      new Set(
        sessionRecords
          .map((r: any) => r.Programme || r.programme || r.programmeCode)
          .filter(Boolean)
      )
    );
  }, [sessionRecords]);

  // Counts across other sessions to demonstrate isolation
  const otherSessionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const list = (intakeRegister && intakeRegister.length > 0) ? intakeRegister : allIntakes;
    list.forEach((r: any) => {
      const rowSession = (r.Session || r.session || '').toString().trim();
      if (normalizeSession(rowSession) !== normalizeSession(currentSession)) {
        counts[rowSession] = (counts[rowSession] || 0) + 1;
      }
    });
    return counts;
  }, [intakeRegister, allIntakes, currentSession]);

  const handleStatusChange = (id: string, newStatus: IntakeStatus) => {
    updateIntakeRecord(id, { status: newStatus });
  };

  const handleExportCSV = () => {
    const headers = [
      'Token No',
      'Session',
      'Enrollment No',
      'Student Name',
      'Programme',
      'Component',
      'Course Codes',
      'Submission Date',
      'Submission Mode',
      'Status',
      'Marks',
      'Registered By',
    ];

    const rows = filteredRecords.map((r: any) => {
      const isPrac = (r.practicalCourses || []).length > 0;
      const isAsgn = (r.assignmentCourses || []).length > 0;
      const compLabel = isPrac && isAsgn ? 'TMA + Practical' : isPrac ? 'Practical' : 'Assignment (TMA)';
      const rawCourses = r.Courses || r.courses || r.courseCodes || [];
      const coursesStr = Array.isArray(rawCourses) ? rawCourses.join(', ') : String(rawCourses);

      return [
        r.tokenNo || r.Token_No,
        r.session || r.Session,
        `'${r.enrollmentNo || r.Enrollment_No}`, // escape for excel
        `"${r.studentName || r.Candidate_Name}"`,
        r.programmeCode || r.Programme,
        compLabel,
        `"${coursesStr}"`,
        r.submissionDate || r.receiptDate || r.Submission_Date,
        r.submissionMode || r.mode || 'In-Person (Desk)',
        r.status || r.Status || 'Received',
        `"${Object.entries(r.marks || {}).map(([c, m]) => `${c}:${m ?? 'NA'}`).join(', ')}"`,
        r.registeredBy || r.Official || 'Desk Official',
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `IGNOU_SC2033_IntakeRegister_${currentSession.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      {/* Session Isolation Banner */}
      <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-zinc-900 flex items-center gap-2">
              <span>Intake Register (Strict Session Isolated)</span>
              <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[10px] font-mono">
                {currentSession}
              </span>
            </div>
            <p className="text-zinc-500 mt-0.5">
              Displaying records exclusively for <strong className="text-zinc-700">{currentSession}</strong> ({sessionIntakes.length} total).
              {Object.keys(otherSessionCounts).length > 0 && (
                <span className="text-zinc-400 ml-1">
                  (Other cycles: {Object.entries(otherSessionCounts).map(([s, count]) => `${s}: ${count}`).join(' | ')})
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg font-semibold transition border border-zinc-300 shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Register (.CSV)</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search Enrollment, Name, Token, Course..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-1.5 border border-zinc-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              <option value="ALL">All Statuses</option>
              <option value="Received">Received at Counter</option>
              <option value="In Packet">In Packet</option>
              <option value="Under Evaluation">Under Evaluation</option>
              <option value="Evaluated">Evaluated</option>
              <option value="Marks Uploaded">Marks Uploaded</option>
            </select>
          </div>

          {/* Programme Filter */}
          <div>
            <select
              value={selectedProgramme}
              onChange={(e) => setSelectedProgramme(e.target.value)}
              className="w-full px-3 py-1.5 border border-zinc-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              <option value="ALL">All Programmes</option>
              {sessionProgrammes.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Submission Mode Filter */}
          <div>
            <select
              value={selectedMode}
              onChange={(e) => setSelectedMode(e.target.value)}
              className="w-full px-3 py-1.5 border border-zinc-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              <option value="ALL">All Submission Modes</option>
              <option value="In-Person (Desk)">In-Person (Desk)</option>
              <option value="Speed Post">Speed Post</option>
              <option value="Registered Post">Registered Post</option>
              <option value="Courier">Courier</option>
            </select>
          </div>
        </div>

        {/* Component Category Selector: All vs TMA vs Practical */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-100">
          <div className="flex items-center gap-1.5 bg-zinc-100 p-1 rounded-xl text-xs font-bold shadow-2xs">
            <span className="text-[11px] text-zinc-500 font-semibold px-2">Component:</span>
            <button
              type="button"
              onClick={() => setSelectedComponentFilter('ALL')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                selectedComponentFilter === 'ALL'
                  ? 'bg-zinc-950 text-white shadow-xs font-black'
                  : 'text-zinc-600 hover:text-zinc-950'
              }`}
            >
              All Intake ({sessionRecords.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedComponentFilter('TMA')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                selectedComponentFilter === 'TMA'
                  ? 'bg-indigo-600 text-white shadow-xs font-black'
                  : 'text-zinc-600 hover:text-zinc-950'
              }`}
            >
              <span>Assignment (TMA)</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedComponentFilter('PRACTICAL')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                selectedComponentFilter === 'PRACTICAL'
                  ? 'bg-purple-700 text-white shadow-xs font-black'
                  : 'text-purple-900 hover:text-purple-950'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>Practical (Lab)</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span>
              Showing <strong className="text-zinc-800">{filteredRecords.length}</strong> of{' '}
              <strong className="text-zinc-800">{sessionRecords.length}</strong> in {currentSession}
            </span>
            {(searchQuery || selectedStatus !== 'ALL' || selectedMode !== 'ALL' || selectedProgramme !== 'ALL' || selectedComponentFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedStatus('ALL');
                  setSelectedMode('ALL');
                  setSelectedProgramme('ALL');
                  setSelectedComponentFilter('ALL');
                }}
                className="text-indigo-600 hover:text-indigo-800 font-medium ml-2 cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Card View (screens < 768px) */}
      <div className="block md:hidden space-y-3">
        {filteredRecords.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-xl border border-zinc-200 text-zinc-400 text-sm">
            No assignment submissions match your criteria in {currentSession}.
          </div>
        ) : (
          filteredRecords.map((row: any, idx: number) => {
            const enrollment = row.Enrollment_No || row.enrollmentNo || row["Enrollment No"] || "-";
            const candidateName = row.Candidate_Name || row.candidateName || row["Candidate Name"] || row.studentName || "-";
            const contact = row.Contact || row.contact || row["Contact Number"] || row.studentPhone || "";
            const programme = row.Programme || row.programme || row.programmeCode || "-";
            const rawCourses = row.Courses || row.courses || row.courseCodes || [];
            const coursesStr = Array.isArray(rawCourses) ? rawCourses.join(", ") : String(rawCourses || "-");
            const timestamp = row.submissionDate || row.receiptDate || (row.Timestamp ? String(row.Timestamp).split('T')[0] : (row.createdAt || "-"));
            const official = row.Official || row.handledBy || row.official || row.issuedBy || "-";
            const token = row.Token_No || row.tokenNo || row.id || "";
            const status = row.status || row.Status || 'Received';

            return (
              <div
                key={`mobile-intake-${row.id || token || enrollment}-${idx}`}
                style={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '10px',
                }}
                className="shadow-xs"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>{enrollment}</span>
                  <span style={{ fontSize: '11px', background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px' }}>{programme}</span>
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>{candidateName}</div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }} className="flex flex-wrap items-center gap-1">
                  <span>Courses:</span>
                  {(Array.isArray(rawCourses) ? rawCourses : String(rawCourses || '').split(',').map((c: string) => c.trim()).filter(Boolean)).map((c: string) => {
                    const isPracInRec = ((row as any).practicalCourses || []).includes(c);
                    const isAsgnInRec = ((row as any).assignmentCourses || []).includes(c);
                    const isPractical = isPracInRec || (!isAsgnInRec && isPracticalCourse(c));
                    const isDual = isPracInRec && isAsgnInRec;

                    return (
                      <span
                        key={c}
                        className={`font-mono text-[10px] font-bold px-1 py-0.2 rounded border inline-flex items-center gap-0.5 ${
                          isDual ? 'bg-indigo-50 text-indigo-900 border-indigo-200' : isPractical ? 'bg-purple-50 text-purple-900 border-purple-200' : 'bg-zinc-50 text-zinc-700 border-zinc-200'
                        }`}
                      >
                        {isPractical && <FlaskConical className="w-2.5 h-2.5 text-purple-600" />}
                        <span>{c}</span>
                        {isDual ? (
                          <span className="text-[8px] text-indigo-700 font-sans font-bold">(TMA+P)</span>
                        ) : isPractical ? (
                          <span className="text-[8px] text-purple-700 font-sans font-semibold">(P)</span>
                        ) : (
                          <span className="text-[8px] text-zinc-400 font-sans">(TMA)</span>
                        )}
                      </span>
                    );
                  })}
                </div>
                {contact && contact !== '-' && (
                  <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>Ph: {contact}</div>
                )}
                <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{timestamp}</span>
                  <span>By: {official}</span>
                </div>
                {/* Action Row */}
                <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-zinc-100">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    status === 'Evaluated'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : status === 'Under Evaluation'
                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                      : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
                  }`}>
                    {status}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditClick(row)}
                      className="px-2 py-1 text-xs font-semibold text-zinc-700 bg-zinc-100 hover:bg-indigo-50 hover:text-indigo-700 rounded-md border border-zinc-200"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteClick(row)}
                      className="px-2 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-600 hover:text-white rounded-md border border-rose-200"
                      title="Delete Intake Mistake"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => openReceiptModal(row)}
                      className="p-1 text-zinc-500 hover:text-indigo-600 rounded-md hover:bg-indigo-50"
                      title="Print Slip"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Main Register Table (Desktop >= 768px) */}
      <div className="hidden md:block bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          <table className="w-full text-xs text-left min-w-[760px]">
            <thead className="bg-zinc-100/80 text-zinc-700 font-semibold border-b border-zinc-200">
              <tr>
                <th className="py-3 px-4">Token / Date</th>
                <th className="py-3 px-4">Student & Enrollment</th>
                <th className="py-3 px-4">Prog</th>
                <th className="py-3 px-4">Courses Submitted</th>
                <th className="py-3 px-4">Mode</th>
                <th className="py-3 px-4">Assignment Status</th>
                <th className="py-3 px-4">Marks Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-400">
                    No assignment submissions match your criteria in {currentSession}.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record: any, idx: number) => {
                  const enrollment = record.Enrollment_No || record.enrollmentNo || record["Enrollment No"] || "-";
                  const studentName = record.Candidate_Name || record.candidateName || record["Candidate Name"] || record.studentName || "-";
                  const contact = record.Contact || record.contact || record["Contact Number"] || record.studentPhone || "";
                  const programmeCode = record.Programme || record.programme || record.programmeCode || "-";
                  const rawCourses = record.Courses || record.courses || record.courseCodes || [];
                  const courseCodes: string[] = Array.isArray(rawCourses)
                    ? rawCourses
                    : String(rawCourses || "").split(',').map((c: string) => c.trim()).filter(Boolean);
                  const tokenNo = record.Token_No || record.tokenNo || record.id || "-";
                  const subDate = record.submissionDate || record.receiptDate || (record.Timestamp ? String(record.Timestamp).split('T')[0] : (record.createdAt ? String(record.createdAt).split('T')[0] : "-"));
                  const mode = record.submissionMode || record.mode || 'In-Person (Desk)';
                  const status = record.status || record.Status || 'Received';
                  const marks = record.marks || {};

                  const marksEntries = Object.entries(marks);
                  const marksCount = marksEntries.filter(([_, m]) => m !== null).length;
                  const allMarksEntered = marksCount > 0 && marksCount === courseCodes.length;

                  return (
                    <tr key={`intake-row-${record.id || tokenNo || enrollment}-${idx}`} className="hover:bg-zinc-50 transition">
                      {/* Token & Date */}
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-indigo-950 text-xs">
                          {tokenNo}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleQuickDateClick(record)}
                          className="text-[11px] text-zinc-500 hover:text-indigo-600 font-medium mt-0.5 flex items-center gap-1 group cursor-pointer transition text-left"
                          title="Click to modify intake submission date"
                        >
                          <Calendar className="w-3 h-3 text-zinc-400 group-hover:text-indigo-500 shrink-0" />
                          <span className="group-hover:underline">{formatDate(subDate)}</span>
                        </button>
                      </td>

                      {/* Student Info */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-zinc-900">
                          {studentName}
                        </div>
                        <div className="font-mono text-zinc-500 text-[11px]">
                          Enr: {enrollment}
                        </div>
                        {contact && (
                          <div className="text-[10px] text-zinc-400">
                            {contact}
                          </div>
                        )}
                      </td>

                      {/* Programme */}
                      <td className="py-3 px-4">
                        <span className="font-bold text-zinc-800 bg-zinc-100 px-2 py-0.5 rounded text-[11px]">
                          {programmeCode}
                        </span>
                      </td>

                      {/* Courses */}
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {courseCodes.map((code: string) => {
                            const mark = marks[code];
                            const isPracInRec = ((record as any).practicalCourses || []).includes(code);
                            const isAsgnInRec = ((record as any).assignmentCourses || []).includes(code);
                            const isPractical = isPracInRec || (!isAsgnInRec && isPracticalCourse(code));
                            const isDual = isPracInRec && isAsgnInRec;

                            return (
                              <span
                                key={code}
                                className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border inline-flex items-center gap-0.5 ${
                                  mark !== null && mark !== undefined
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : isDual
                                    ? 'bg-indigo-50 text-indigo-900 border-indigo-200'
                                    : isPractical
                                    ? 'bg-purple-50 text-purple-900 border-purple-200'
                                    : 'bg-zinc-50 text-zinc-700 border-zinc-200'
                                }`}
                                title={
                                  mark !== null
                                    ? `Marks: ${mark}/100${isPractical ? ' (Practical Course)' : ''}`
                                    : isDual
                                    ? 'Dual Component: Assignment + Practical'
                                    : isPractical
                                    ? 'Practical / Lab Course'
                                    : 'Theory Assignment Course'
                                }
                              >
                                {isPractical && <FlaskConical className="w-2.5 h-2.5 text-purple-600 shrink-0" />}
                                <span>{code}</span>
                                {isDual ? (
                                  <span className="text-[8px] font-sans font-bold text-indigo-700 ml-0.5">
                                    (TMA+P)
                                  </span>
                                ) : isPractical ? (
                                  <span className="text-[8px] font-sans font-semibold text-purple-700 ml-0.5">
                                    (P)
                                  </span>
                                ) : (
                                  <span className="text-[8px] font-sans font-normal text-zinc-400 ml-0.5">
                                    (TMA)
                                  </span>
                                )}
                                {mark !== null && (
                                  <span className="ml-1 text-emerald-700">({mark})</span>
                                )}
                              </span>
                            );
                          })}
                        </div>
                      </td>

                      {/* Mode */}
                      <td className="py-3 px-4">
                        <span className="text-zinc-700 text-[11px] block font-medium">
                          {mode}
                        </span>
                        {record.consignmentNo && (
                          <span className="font-mono text-[10px] text-zinc-500 block">
                            {record.consignmentNo}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <select
                          value={status}
                          onChange={(e) => handleStatusChange(record.id, e.target.value as IntakeStatus)}
                          className={`text-[11px] font-semibold rounded-lg px-2 py-1 border transition focus:outline-hidden ${
                            status === 'Evaluated'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : status === 'Under Evaluation'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : status === 'In Packet'
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : status === 'Marks Uploaded'
                              ? 'bg-purple-50 text-purple-800 border-purple-200'
                              : 'bg-zinc-100 text-zinc-700 border-zinc-200'
                          }`}
                        >
                          <option value="Received">Received</option>
                          <option value="In Packet">In Packet</option>
                          <option value="Under Evaluation">Under Evaluation</option>
                          <option value="Evaluated">Evaluated</option>
                          <option value="Marks Uploaded">Marks Uploaded</option>
                        </select>
                      </td>

                      {/* Marks Award Status */}
                      <td className="py-3 px-4">
                        <div className="text-[11px]">
                          {allMarksEntered ? (
                            <span className="text-emerald-700 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              All Awarded ({marksCount}/{courseCodes.length})
                            </span>
                          ) : marksCount > 0 ? (
                            <span className="text-amber-700 font-medium">
                              Partial ({marksCount}/{courseCodes.length})
                            </span>
                          ) : (
                            <span className="text-zinc-400">Pending Evaluation</span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Edit Button */}
                          <button
                            id={`edit-btn-${record.id}`}
                            onClick={() => handleEditClick(record)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:text-indigo-700 bg-zinc-100 hover:bg-indigo-50 border border-zinc-200 hover:border-indigo-300 rounded-lg transition shadow-2xs cursor-pointer"
                            title="Edit Intake Receipt"
                          >
                            <Pencil className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Edit</span>
                          </button>

                          {/* Delete Button (Allowed for fixing intake mistakes) */}
                          <button
                            id={`delete-btn-${record.id}`}
                            onClick={() => handleDeleteClick(record)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 hover:border-rose-600 rounded-lg transition shadow-2xs cursor-pointer"
                            title="Delete Intake Mistake (Cascades cleanup to Course Ledger & Receipts)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>

                          {/* Print / View Acknowledgment Slip */}
                          <button
                            id={`print-slip-${record.id}`}
                            onClick={() => openReceiptModal(record)}
                            className="p-1.5 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                            title="Print / View Official Acknowledgment Slip"
                          >
                            <Printer className="w-3.5 h-3.5" />
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
      </div>

      {/* Edit Intake Receipt Modal */}
      <EditIntakeModal
        isOpen={!!editingRecord}
        record={editingRecord}
        onClose={() => setEditingRecord(null)}
      />

      {/* Quick Intake Date Modification Modal */}
      {quickDateModalRecord && (
        <div
          id="quick-date-modal-backdrop"
          className="fixed inset-0 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setQuickDateModalRecord(null);
          }}
        >
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-zinc-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900 text-sm">
                    Modify Intake Submission Date
                  </h3>
                  <p className="text-[11px] text-zinc-500">
                    Token:{' '}
                    <strong className="font-mono text-zinc-700">
                      {quickDateModalRecord.tokenNo || quickDateModalRecord.Token_No || quickDateModalRecord.id}
                    </strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuickDateModalRecord(null)}
                className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickDateSubmit} className="p-5 space-y-4">
              <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200 text-xs space-y-1">
                <div>
                  <span className="text-zinc-500">Candidate: </span>
                  <strong className="text-zinc-900">
                    {quickDateModalRecord.candidateName || quickDateModalRecord.studentName || quickDateModalRecord.Candidate_Name || '-'}
                  </strong>
                </div>
                <div>
                  <span className="text-zinc-500">Enrollment: </span>
                  <strong className="font-mono text-zinc-900">
                    {quickDateModalRecord.enrollmentNo || quickDateModalRecord.Enrollment_No || '-'}
                  </strong>
                  <span className="text-zinc-400 mx-1.5">•</span>
                  <span className="text-zinc-500">Programme: </span>
                  <strong className="text-zinc-900">
                    {quickDateModalRecord.programmeCode || quickDateModalRecord.Programme || '-'}
                  </strong>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="quick-intake-date-input" className="block text-xs font-bold text-zinc-700">
                    New Submission Date <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() - 1);
                        setQuickDateValue(d.toISOString().split('T')[0]);
                      }}
                      className="text-[10px] text-zinc-600 hover:text-zinc-900 font-semibold cursor-pointer"
                    >
                      Yesterday
                    </button>
                    <span className="text-zinc-300">•</span>
                    <button
                      type="button"
                      onClick={() => setQuickDateValue(new Date().toISOString().split('T')[0])}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                    >
                      Today
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <Calendar className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                  <input
                    id="quick-intake-date-input"
                    type="date"
                    value={quickDateValue}
                    onChange={(e) => setQuickDateValue(e.target.value)}
                    required
                    max="2099-12-31"
                    className="w-full pl-9 pr-3 py-2 text-xs font-bold border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white"
                  />
                </div>
                <div className="flex items-center justify-between mt-1 text-[11px] text-zinc-500">
                  <span>Selected: <strong className="text-zinc-800">{formatDate(quickDateValue)}</strong></span>
                </div>
              </div>

              <div className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-2.5 leading-relaxed">
                <strong>Synchronized Update:</strong> Updating this date will immediately update this intake slip, Stage 2 course evaluation records, and official printable receipt acknowledgment slips.
              </div>

              <div className="pt-2 border-t border-zinc-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setQuickDateModalRecord(null)}
                  className="px-3.5 py-1.5 text-xs text-zinc-600 hover:bg-zinc-100 rounded-lg font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Update Submission Date</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
