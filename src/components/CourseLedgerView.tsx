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
} from 'lucide-react';

export const CourseLedgerView: React.FC = () => {
  const {
    currentSession,
    sessionIntakes,
    sessionCourseEvaluations,
    sessionPackets,
    evaluators,
    createPacket,
    updatePacket,
    isAdmin,
  } = useApp();

  const [isPacketModalOpen, setIsPacketModalOpen] = useState(false);
  const [selectedCourseForPacket, setSelectedCourseForPacket] = useState('');
  const [selectedEvaluatorId, setSelectedEvaluatorId] = useState('');
  const [scriptCountInput, setScriptCountInput] = useState<number>(20);
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [packetNotes, setPacketNotes] = useState('');

  // Course aggregation summary for active session
  const courseLedger = useMemo(() => {
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

    // Scan all intakes in this session
    sessionIntakes.forEach((intake: any) => {
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
            const matchingEval = sessionCourseEvaluations.find(
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

    // Also ensure every course in sessionCourseEvaluations is registered
    sessionCourseEvaluations.forEach((evalItem: any) => {
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
    setScriptCountInput(suggestedCount > 0 ? suggestedCount : 20);

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

    createPacket({
      courseCode: selectedCourseForPacket,
      programmeCode: courseItem?.programmeCode || 'IGNOU',
      evaluatorId: selectedEvaluatorId || null,
      scriptCount: scriptCountInput,
      expectedReturnDate,
      notes: packetNotes.trim() || undefined,
    });

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
            Aggregated course-wise ledger for session <strong className="text-zinc-800">{currentSession}</strong>. Form packets, assign approved academic counselors, and monitor return turnaround.
          </p>
        </div>

        {!isAdmin && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Read-Only: Packet formation restricted to Coordinator (Admin).</span>
          </div>
        )}
      </div>

      {/* Course Aggregation Cards / Table */}
      <div className="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
          <div className="font-bold text-xs text-zinc-800 uppercase tracking-wider">
            Active Courses Ledger ({courseLedger.length} Courses in {currentSession})
          </div>
          <span className="text-[11px] text-zinc-500">
            Total Session Scripts:{' '}
            <strong className="text-zinc-900">
              {courseLedger.reduce((sum, c) => sum + c.totalReceived, 0)}
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

                  {/* Packet status toggle for admin */}
                  {isAdmin && (
                    <div className="pt-2 border-t border-zinc-200 flex items-center justify-between">
                      <span className="text-[10px] text-zinc-500 font-bold uppercase">Change Status:</span>
                      <div className="flex gap-1">
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
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Packet Creation Modal (Admin Only) */}
      {isPacketModalOpen && (
        <div className="fixed inset-0 bg-zinc-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-zinc-200">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2 font-bold text-zinc-900 text-sm">
                <PackageCheck className="w-4 h-4 text-indigo-600" />
                Form Evaluation Packet ({selectedCourseForPacket})
              </div>
              <button
                onClick={() => setIsPacketModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePacketSubmit} className="mt-4 space-y-4 text-xs">
              <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-lg">
                <span className="font-semibold text-indigo-900">Course Code: </span>
                <span className="font-mono font-bold text-indigo-950">{selectedCourseForPacket}</span>
                <div className="text-[11px] text-indigo-700 mt-0.5">
                  Packets group physical scripts together with an official award list sheet.
                </div>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Scripts in this Packet <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={scriptCountInput}
                  onChange={(e) => setScriptCountInput(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-1.5 border border-zinc-300 rounded-lg font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Assign Approved Evaluator
                </label>
                <select
                  value={selectedEvaluatorId}
                  onChange={(e) => setSelectedEvaluatorId(e.target.value)}
                  className="w-full px-3 py-1.5 border border-zinc-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
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
                  className="w-full px-3 py-1.5 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
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
                  className="w-full px-3 py-1.5 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-zinc-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPacketModalOpen(false)}
                  className="px-3 py-1.5 text-zinc-600 hover:bg-zinc-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-xs"
                >
                  Create & Dispatch Packet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
