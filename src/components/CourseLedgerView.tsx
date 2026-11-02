import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { CoursePacket } from '../types';
import { formatDate, isPracticalCourse, isDualComponentCourse } from '../utils/helpers';
import {
  Layers,
  PackageCheck,
  Send,
  UserCheck,
  PlusCircle,
  Calendar,
  AlertCircle,
  ShieldAlert,
  Clock,
  CheckCircle2,
  FileSpreadsheet,
  Printer,
  Users,
} from 'lucide-react';
import { PacketDispatchSlipModal, ScriptEntry } from './PacketDispatchSlipModal';
import { normalizeSessionName } from '../services/sheetsService';

export const CourseLedgerView: React.FC = () => {
  const {
    currentSession,
    sessionIntakes,
    sessionCourseEvaluations,
    allIntakes,
    allCourseEvaluations,
    sessionPackets,
    evaluators,
    createPacket,
    updatePacket,
    isAdmin,
    reconcileIntakeAndCourseLedger,
    getCourseTitle,
  } = useApp();

  const [ledgerScope, setLedgerScope] = useState<'ALL' | 'SESSION'>('ALL');
  const [isPacketModalOpen, setIsPacketModalOpen] = useState(false);
  const [selectedCourseForPacket, setSelectedCourseForPacket] = useState('');
  const [selectedEvaluatorId, setSelectedEvaluatorId] = useState('');
  const [scriptCountInput, setScriptCountInput] = useState<number>(20);
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [packetNotes, setPacketNotes] = useState('');

  // Dispatch Slip Modal State
  const [isDispatchSlipOpen, setIsDispatchSlipOpen] = useState(false);
  const [selectedPacketForSlip, setSelectedPacketForSlip] = useState<CoursePacket | null>(null);
  const [slipScripts, setSlipScripts] = useState<ScriptEntry[]>([]);

  // Helper to extract exact candidate scripts received for a given course code
  const getCourseScripts = (courseCode: string): ScriptEntry[] => {
    if (!courseCode) return [];
    const normCode = courseCode.trim().toUpperCase();
    const evals = (allCourseEvaluations && allCourseEvaluations.length > 0 ? allCourseEvaluations : sessionCourseEvaluations);
    const matched = evals.filter((e) => {
      const code = (e.courseCode || (e as any).Course_Code || '').trim().toUpperCase();
      if (code !== normCode) return false;
      if (ledgerScope === 'ALL') return true;
      return normalizeSessionName(e.session || (e as any).Session) === normalizeSessionName(currentSession);
    });

    if (matched.length > 0) {
      return matched.map((e, idx) => ({
        sno: idx + 1,
        enrollmentNo: e.enrollmentNo || (e as any).Enrollment_No || '',
        studentName: e.studentName || (e as any).Candidate_Name || '',
        tokenNo: e.tokenNo || `SC2033-${e.enrollmentNo}`,
        submissionDate: e.submissionDate || e.receiptDate || '',
        marks: e.marks,
      }));
    }

    const activeIntakes = ledgerScope === 'ALL'
      ? (allIntakes && allIntakes.length > 0 ? allIntakes : sessionIntakes)
      : sessionIntakes;
    const fromIntakes: ScriptEntry[] = [];
    activeIntakes.forEach((it: any) => {
      const courses = (it.courseCodes || it.courses || []).map((c: string) => String(c).trim().toUpperCase());
      if (courses.includes(normCode)) {
        fromIntakes.push({
          sno: fromIntakes.length + 1,
          enrollmentNo: it.enrollmentNo,
          studentName: it.studentName || it.candidateName || '',
          tokenNo: it.tokenNo,
          submissionDate: it.submissionDate || it.receiptDate,
          marks: it.marks?.[normCode] ?? null,
        });
      }
    });
    return fromIntakes;
  };

  // Enrolled candidate scripts for the currently selected packet course
  const selectedCourseScripts = useMemo(() => {
    if (!selectedCourseForPacket) return [];
    return getCourseScripts(selectedCourseForPacket);
  }, [selectedCourseForPacket, allCourseEvaluations, sessionCourseEvaluations, allIntakes, sessionIntakes, ledgerScope, currentSession]);

  // Course aggregation summary based on selected ledgerScope
  const courseLedger = useMemo(() => {
    const activeIntakes = ledgerScope === 'ALL'
      ? (allIntakes && allIntakes.length > 0 ? allIntakes : sessionIntakes)
      : sessionIntakes;
    const activeEvaluations = ledgerScope === 'ALL'
      ? (allCourseEvaluations && allCourseEvaluations.length > 0 ? allCourseEvaluations : sessionCourseEvaluations)
      : sessionCourseEvaluations;

    const map = new Map<
      string,
      {
        courseCode: string;
        programmeCode: string;
        totalReceived: number;
        evaluated: number;
        pending: number;
        packetsFormed: CoursePacket[];
      }
    >();

    // Scan all intakes in selected scope
    activeIntakes.forEach((intake: any) => {
      const courses = intake.courseCodes || intake.courses || [];
      if (Array.isArray(courses)) {
        courses.forEach((rawCode: string) => {
          const code = rawCode.trim().toUpperCase();
          if (!code) return;
          if (!map.has(code)) {
            map.set(code, {
              courseCode: code,
              programmeCode: intake.programmeCode || intake.programme || 'MEG',
              totalReceived: 0,
              evaluated: 0,
              pending: 0,
              packetsFormed: [],
            });
          }
          const item = map.get(code)!;
          item.totalReceived++;
          const mark = intake.marks?.[code];
          const hasMark = mark !== null && mark !== undefined && mark !== '';
          if (hasMark) {
            item.evaluated++;
          } else {
            const matchingEval = activeEvaluations.find(
              (e: any) =>
                (e.enrollmentNo === intake.enrollmentNo || e.Enrollment_No === intake.enrollmentNo) &&
                (e.courseCode === code || e.Course_Code === code)
            );
            if (matchingEval && matchingEval.marks !== null && matchingEval.marks !== undefined) {
              item.evaluated++;
            } else {
              item.pending++;
            }
          }
        });
      }
    });

    // Also ensure every course in activeEvaluations is registered
    activeEvaluations.forEach((evalItem: any) => {
      const code = (evalItem.courseCode || evalItem.Course_Code || '').trim().toUpperCase();
      if (!code) return;
      if (!map.has(code)) {
        const hasMark = evalItem.marks !== '' && evalItem.marks !== undefined && evalItem.marks !== null;
        map.set(code, {
          courseCode: code,
          programmeCode: evalItem.programmeCode || evalItem.Programme || 'MEG',
          totalReceived: 1,
          evaluated: hasMark ? 1 : 0,
          pending: hasMark ? 0 : 1,
          packetsFormed: [],
        });
      }
    });

    // Attach packets for this session
    sessionPackets.forEach((pkt) => {
      if (map.has(pkt.courseCode)) {
        map.get(pkt.courseCode)!.packetsFormed.push(pkt);
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalReceived - a.totalReceived);
  }, [sessionIntakes, sessionCourseEvaluations, sessionPackets]);

  // Evaluator lookup helper
  const getEvaluatorInfo = (evId: string | null) => {
    if (!evId) return null;
    return evaluators.find((e) => e.id === evId);
  };

  const handleOpenPacketModal = (courseCode: string, suggestedCount: number) => {
    if (!isAdmin) return;
    setSelectedCourseForPacket(courseCode);

    // Auto-fill scripts in this packet as per actual scripts received
    const actualScripts = getCourseScripts(courseCode);
    const totalCount = actualScripts.length > 0 ? actualScripts.length : (suggestedCount > 0 ? suggestedCount : 1);
    setScriptCountInput(totalCount);

    // Auto-select eligible evaluator if any
    const eligible = evaluators.find((e) => e.eligibleCourses.includes(courseCode));
    setSelectedEvaluatorId(eligible?.id || '');

    // Default expected return date: 15 days from now
    const returnDate = new Date();
    returnDate.setDate(returnDate.getDate() + 15);
    setExpectedReturnDate(returnDate.toISOString().split('T')[0]);

    setIsPacketModalOpen(true);
  };

  const handleCreatePacketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseForPacket || scriptCountInput <= 0) return;

    const courseItem = courseLedger.find((c) => c.courseCode === selectedCourseForPacket);

    const createdPkt = createPacket({
      courseCode: selectedCourseForPacket,
      programmeCode: courseItem?.programmeCode || 'IGNOU',
      evaluatorId: selectedEvaluatorId || null,
      scriptCount: scriptCountInput,
      expectedReturnDate,
      notes: packetNotes.trim() || undefined,
    });

    // Automatically trigger the printable Dispatch Slip modal immediately
    const scriptsForSlip = getCourseScripts(selectedCourseForPacket);
    setSelectedPacketForSlip(createdPkt);
    setSlipScripts(scriptsForSlip);
    setIsDispatchSlipOpen(true);

    setIsPacketModalOpen(false);
    setSelectedCourseForPacket('');
    setSelectedEvaluatorId('');
    setPacketNotes('');
  };

  const handleUpdatePacketStatus = (packetId: string, status: CoursePacket['status']) => {
    updatePacket(packetId, {
      status,
      returnedDate: status === 'Evaluated' ? new Date().toISOString().split('T')[0] : null,
    });
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base sm:text-lg font-bold text-zinc-900">
              Course Assignment Ledger & Packet Dispatch
            </h2>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Aggregated course-wise ledger.
            {ledgerScope === 'ALL'
              ? ` Viewing all courses across cycles (${allCourseEvaluations.length || sessionCourseEvaluations.length} total scripts loaded).`
              : ` Isolated for session ${currentSession} (${sessionCourseEvaluations.length} scripts).`}
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Scope Switcher: All (208) vs Current Session */}
          <div className="flex items-center bg-zinc-100 p-0.5 rounded-lg border border-zinc-200">
            <button
              type="button"
              onClick={() => setLedgerScope('ALL')}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                ledgerScope === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
              title="Show all scripts across all cycles (e.g. all 208 scripts)"
            >
              All Courses ({allCourseEvaluations.length || sessionCourseEvaluations.length} Scripts)
            </button>
            <button
              type="button"
              onClick={() => setLedgerScope('SESSION')}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                ledgerScope === 'SESSION'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
              title={`Filter strictly for ${currentSession}`}
            >
              {currentSession} ({sessionCourseEvaluations.length})
            </button>
          </div>

          {/* Autonomous Data Governance: Reconcile Button */}
          <button
            type="button"
            onClick={() => reconcileIntakeAndCourseLedger()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs transition shadow-2xs cursor-pointer"
            title="Scan and verify all intake receipts vs course ledger rows, restoring any missing scripts automatically"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Reconcile & Restore Scripts</span>
          </button>

          {!isAdmin && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Read-Only</span>
            </div>
          )}
        </div>
      </div>

      {/* Course Aggregation Cards / Table */}
      <div className="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
          <div className="font-bold text-xs text-zinc-800 uppercase tracking-wider">
            Active Courses Ledger ({courseLedger.length} Distinct Courses)
          </div>
          <span className="text-[11px] text-zinc-500">
            Total Evaluated / Received Scripts:{' '}
            <strong className="text-zinc-900">
              {courseLedger.reduce((sum, c) => sum + c.totalReceived, 0)} Scripts
            </strong>
          </span>
        </div>

        <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          <table className="w-full text-xs text-left min-w-[760px]">
            <thead className="bg-zinc-100 text-zinc-700 font-semibold border-b border-zinc-200">
              <tr>
                <th className="py-3 px-4">Course Code</th>
                <th className="py-3 px-4">Prog</th>
                <th className="py-3 px-4 text-center">Scripts Received</th>
                <th className="py-3 px-4 text-center">Evaluated</th>
                <th className="py-3 px-4 text-center">Pending</th>
                <th className="py-3 px-4">Packets Dispatched</th>
                <th className="py-3 px-4 text-right">Coordinator Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {courseLedger.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-400">
                    No assignment scripts recorded in {currentSession}.
                  </td>
                </tr>
              ) : (
                courseLedger.map((course) => {
                  return (
                    <tr key={course.courseCode} className="hover:bg-zinc-50 transition">
                      <td className="py-3 px-4 font-mono font-bold text-sm text-indigo-950">
                        <div className="flex items-center gap-1.5">
                          <span>{course.courseCode}</span>
                          {isDualComponentCourse(course.courseCode) ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-sans font-bold bg-indigo-100 text-indigo-900 border border-indigo-200">
                              TMA + Practical
                            </span>
                          ) : isPracticalCourse(course.courseCode) ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-sans font-bold bg-purple-100 text-purple-900 border border-purple-200">
                              Practical
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-bold text-zinc-700">
                        {course.programmeCode}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-zinc-900">
                        {course.totalReceived}
                      </td>
                      <td className="py-3 px-4 text-center text-emerald-700 font-bold">
                        {course.evaluated}
                      </td>
                      <td className="py-3 px-4 text-center text-amber-700 font-bold">
                        {course.pending}
                      </td>
                      <td className="py-3 px-4">
                        {course.packetsFormed.length === 0 ? (
                          <span className="text-zinc-400 italic text-[11px]">No packets formed</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {course.packetsFormed.map((pkt) => {
                              const ev = getEvaluatorInfo(pkt.evaluatorId);
                              return (
                                <span
                                  key={pkt.id}
                                  className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-50 text-indigo-800 border border-indigo-200"
                                  title={`Status: ${pkt.status} | Assigned: ${ev ? ev.name : 'Unassigned'} (${pkt.scriptCount} scripts)`}
                                >
                                  {pkt.packetNumber} ({pkt.scriptCount})
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isAdmin ? (
                          <button
                            onClick={() => handleOpenPacketModal(course.courseCode, course.pending)}
                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1 shadow-2xs"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                            <span>Form Packet</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-zinc-400 italic">
                            Coordinator Only
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Course Packets Tracking Section */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 mb-4">
          <div className="flex items-center gap-2">
            <PackageCheck className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-zinc-900 text-sm">
              Session Packets Tracking ({currentSession})
            </h3>
          </div>
          <span className="text-xs text-zinc-500">
            {sessionPackets.length} Packets Generated
          </span>
        </div>

        {sessionPackets.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-400">
            No evaluation packets have been created for {currentSession} yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessionPackets.map((pkt) => {
              const ev = getEvaluatorInfo(pkt.evaluatorId);
              return (
                <div
                  key={pkt.id}
                  className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-3 text-xs"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono font-bold text-indigo-950 text-xs block">
                        {pkt.packetNumber}
                      </span>
                      <span className="text-[11px] text-zinc-500">
                        {pkt.programmeCode} • Course: <strong className="text-zinc-800">{pkt.courseCode}</strong>
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        pkt.status === 'Evaluated'
                          ? 'bg-emerald-100 text-emerald-800'
                          : pkt.status === 'Dispatched'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-zinc-200 text-zinc-700'
                      }`}
                    >
                      {pkt.status}
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-zinc-200 space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-zinc-500">Scripts Contained:</span>
                      <span className="font-bold text-zinc-900">{pkt.scriptCount} Scripts</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-zinc-500">Assigned Evaluator:</span>
                      <span className="font-semibold text-indigo-950">
                        {ev ? `${ev.name} (${ev.evaluatorCode})` : 'Unassigned'}
                      </span>
                    </div>
                    {pkt.expectedReturnDate && (
                      <div className="flex justify-between text-[11px]">
                        <span className="text-zinc-500">Expected Return:</span>
                        <span className="font-medium text-zinc-800">
                          {formatDate(pkt.expectedReturnDate)}
                        </span>
                      </div>
                    )}
                  </div>

                  {pkt.notes && (
                    <div className="text-[11px] text-zinc-500 italic bg-white/60 p-1.5 rounded border border-zinc-200/50">
                      {pkt.notes}
                    </div>
                  )}

                  {/* Packet actions: Print Slip & Status Toggles */}
                  <div className="pt-2 border-t border-zinc-200 flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPacketForSlip(pkt);
                        setSlipScripts(getCourseScripts(pkt.courseCode));
                        setIsDispatchSlipOpen(true);
                      }}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded text-[11px] font-bold transition inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
                      title="Print Official Packet Dispatch Slip"
                    >
                      <Printer className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>Print Dispatch Slip</span>
                    </button>

                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleUpdatePacketStatus(pkt.id, 'Dispatched')}
                          className={`px-2 py-1 rounded text-[10px] font-semibold transition ${
                            pkt.status === 'Dispatched'
                              ? 'bg-blue-600 text-white'
                              : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'
                          }`}
                        >
                          Dispatched
                        </button>
                        <button
                          onClick={() => handleUpdatePacketStatus(pkt.id, 'Evaluated')}
                          className={`px-2 py-1 rounded text-[10px] font-semibold transition ${
                            pkt.status === 'Evaluated'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'
                          }`}
                        >
                          Evaluated
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Packet Creation Modal (Admin Only) */}
      {isPacketModalOpen && (
        <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-zinc-200 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 shrink-0">
              <div className="flex items-center gap-2 font-bold text-zinc-900 text-sm">
                <PackageCheck className="w-4 h-4 text-indigo-600" />
                Form Evaluation Packet ({selectedCourseForPacket})
              </div>
              <button
                type="button"
                onClick={() => setIsPacketModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 text-xs font-bold p-1 rounded-md hover:bg-zinc-100 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePacketSubmit} className="mt-4 space-y-4 text-xs overflow-y-auto pr-1">
              {/* Course header banner */}
              <div className="p-3 bg-indigo-50/80 border border-indigo-200 rounded-xl space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">Course Code</span>
                    <span className="font-mono font-bold text-sm text-indigo-950 bg-white px-2 py-0.5 rounded border border-indigo-200 shadow-2xs">
                      {selectedCourseForPacket}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded border border-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    {selectedCourseScripts.length} Actual Scripts Received
                  </span>
                </div>
                <div className="text-xs font-semibold text-indigo-900">
                  {getCourseTitle(selectedCourseForPacket)}
                </div>
                <div className="text-[11px] text-indigo-700">
                  Packets group physical scripts together with an official award list sheet and printable dispatch docket.
                </div>
              </div>

              {/* Script count field */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-zinc-700">
                    Scripts in this Packet <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-zinc-500">
                    Auto-filled from received intake: <strong className="text-indigo-600">{selectedCourseScripts.length}</strong>
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={250}
                    value={scriptCountInput}
                    onChange={(e) => setScriptCountInput(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg font-bold text-sm text-zinc-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    required
                  />
                  {scriptCountInput !== selectedCourseScripts.length && selectedCourseScripts.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setScriptCountInput(selectedCourseScripts.length)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded border border-indigo-200 transition cursor-pointer"
                    >
                      Reset to {selectedCourseScripts.length}
                    </button>
                  )}
                </div>
              </div>

              {/* Itemized scripts preview */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 font-semibold text-zinc-700">
                    <Users className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Scripts in this Packet as Received ({selectedCourseScripts.length})</span>
                  </div>
                  <span className="text-[10px] text-zinc-400">Printed on dispatch slip docket</span>
                </div>

                {selectedCourseScripts.length === 0 ? (
                  <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg text-center text-zinc-500 text-[11px]">
                    No individual student scripts recorded in the intake ledger yet for {selectedCourseForPacket}.
                  </div>
                ) : (
                  <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white max-h-36 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead className="bg-zinc-50 sticky top-0 border-b border-zinc-200 text-zinc-600">
                        <tr>
                          <th className="py-1 px-2 font-bold w-8 text-center">#</th>
                          <th className="py-1 px-2 font-bold">Enrollment No</th>
                          <th className="py-1 px-2 font-bold">Candidate Name</th>
                          <th className="py-1 px-2 font-bold">Token / Receipt</th>
                          <th className="py-1 px-2 font-bold text-right">Status / Marks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 font-mono">
                        {selectedCourseScripts.map((s, idx) => (
                          <tr key={`${s.enrollmentNo}-${idx}`} className="hover:bg-zinc-50/80 transition-colors">
                            <td className="py-1 px-2 text-center text-zinc-400 font-sans">{idx + 1}</td>
                            <td className="py-1 px-2 font-bold text-zinc-800">{s.enrollmentNo}</td>
                            <td className="py-1 px-2 font-sans font-medium text-zinc-700 truncate max-w-[130px]">
                              {s.studentName || '—'}
                            </td>
                            <td className="py-1 px-2 text-[10px] text-zinc-500 truncate">
                              {s.tokenNo || (s.submissionDate ? formatDate(s.submissionDate) : '—')}
                            </td>
                            <td className="py-1 px-2 text-right font-sans">
                              {s.marks !== null && s.marks !== undefined ? (
                                <span className="text-emerald-700 font-bold">{s.marks}/100</span>
                              ) : (
                                <span className="text-amber-700 text-[10px] font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                  Pending
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Assign Approved Evaluator
                </label>
                <select
                  value={selectedEvaluatorId}
                  onChange={(e) => setSelectedEvaluatorId(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="">-- Unassigned (Form packet only) --</option>
                  {evaluators.map((ev) => {
                    const isEligible = ev.eligibleCourses.includes(selectedCourseForPacket);
                    return (
                      <option key={ev.id} value={ev.id}>
                        {ev.name} ({ev.evaluatorCode}) {isEligible ? '★ Approved for Course' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Expected Return Date
                </label>
                <input
                  type="date"
                  value={expectedReturnDate}
                  onChange={(e) => setExpectedReturnDate(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Dispatch Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cloth envelope dispatched by runner"
                  value={packetNotes}
                  onChange={(e) => setPacketNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                  <Printer className="w-3.5 h-3.5 text-indigo-600" />
                  Dispatch slip will open immediately for printing
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPacketModalOpen(false)}
                    className="px-3 py-1.5 text-zinc-600 hover:bg-zinc-100 rounded-lg font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <PackageCheck className="w-4 h-4" />
                    Create & Open Dispatch Slip
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Packet Dispatch Slip Modal */}
      <PacketDispatchSlipModal
        isOpen={isDispatchSlipOpen}
        onClose={() => {
          setIsDispatchSlipOpen(false);
          setSelectedPacketForSlip(null);
        }}
        packet={selectedPacketForSlip}
        evaluator={selectedPacketForSlip ? getEvaluatorInfo(selectedPacketForSlip.evaluatorId) : null}
        scripts={slipScripts}
      />
    </div>
  );
};
