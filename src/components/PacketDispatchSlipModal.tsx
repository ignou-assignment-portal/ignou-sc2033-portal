import React from 'react';
import { CoursePacket, Evaluator } from '../types';
import { useApp } from '../context/AppContext';
import { formatDate } from '../utils/helpers';
import {
  Printer,
  X,
  PackageCheck,
  Calendar,
  UserCheck,
  FileText,
  Building2,
  CheckCircle2,
  Clock,
  Layers,
} from 'lucide-react';
import { InstitutionalSeal } from './InstitutionalSeal';

export interface ScriptEntry {
  sno: number;
  enrollmentNo: string;
  studentName: string;
  tokenNo?: string;
  submissionDate?: string;
  marks?: number | null;
}

interface PacketDispatchSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  packet: CoursePacket | null;
  evaluator: Evaluator | null;
  scripts: ScriptEntry[];
}

export const PacketDispatchSlipModal: React.FC<PacketDispatchSlipModalProps> = ({
  isOpen,
  onClose,
  packet,
  evaluator,
  scripts,
}) => {
  const { settings, currentSession, getCourseTitle } = useApp();

  if (!isOpen || !packet) return null;

  const handlePrint = () => {
    window.print();
  };

  const courseTitle = getCourseTitle(packet.courseCode, packet.programmeCode);
  const dispatchDateStr = packet.assignedDate ? formatDate(packet.assignedDate) : formatDate(new Date().toISOString());
  const returnDateStr = packet.expectedReturnDate ? formatDate(packet.expectedReturnDate) : 'Within 15 Days';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      {/* Print stylesheet */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 10mm;
          }
          body * {
            visibility: hidden !important;
          }
          #printable-dispatch-slip, #printable-dispatch-slip * {
            visibility: visible !important;
          }
          #printable-dispatch-slip {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: #0f172a !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Modal Container */}
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full my-auto overflow-hidden animate-in fade-in duration-200 flex flex-col max-h-[92vh]">
        {/* Modal Top Control Bar (Hidden on print) */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between no-print shrink-0">
          <div className="flex items-center gap-2.5">
            <PackageCheck className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-sm font-bold tracking-tight">
                Evaluation Packet Dispatch Docket ({packet.packetNumber})
              </h2>
              <p className="text-[11px] text-slate-300">
                Official docket slip to attach to physical script packet / envelope for evaluation.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Slip</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Document Body */}
        <div className="overflow-y-auto p-4 sm:p-8 flex-1 bg-slate-50/50">
          <div
            id="printable-dispatch-slip"
            className="bg-white border border-slate-300 rounded-xl p-6 sm:p-8 shadow-sm text-slate-900 space-y-5"
          >
            {/* 1. INSTITUTIONAL HEADER */}
            <div className="border-b-2 border-slate-900 pb-4">
              <div className="flex items-center justify-between gap-4">
                <div className="w-16 h-16 shrink-0 flex items-center justify-center">
                  <InstitutionalSeal size="md" />
                </div>

                <div className="text-center flex-1">
                  <div className="text-lg sm:text-xl font-black tracking-tight text-slate-950 uppercase font-serif">
                    Indira Gandhi National Open University
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-slate-800 uppercase mt-0.5">
                    IGNOU Study Centre SC-2033
                  </div>
                  <div className="text-[11px] text-slate-600">
                    {settings.institutionName || "S.D. Jain Girls' College, Dimapur - 797112, Nagaland"}
                  </div>
                  <div className="text-[11px] font-medium text-slate-500">
                    Regional Centre: {settings.regionalCentreCode || "RC-20 Kohima"} • Academic Session: <strong className="text-slate-900">{packet.session || currentSession}</strong>
                  </div>
                </div>

                <div className="w-16 shrink-0 text-right">
                  <div className="inline-block border border-slate-400 bg-slate-50 px-2 py-1 rounded text-center">
                    <span className="block text-[9px] uppercase tracking-wider text-slate-500 font-bold">Exam Cell</span>
                    <span className="block text-xs font-mono font-black text-slate-900">SC-2033</span>
                  </div>
                </div>
              </div>

              {/* Title Bar */}
              <div className="mt-3 text-center bg-slate-900 text-white py-1.5 px-3 rounded-md">
                <h1 className="text-xs sm:text-sm font-black uppercase tracking-wider">
                  Evaluation Packet Dispatch Memo & Envelope Docket Slip
                </h1>
              </div>
            </div>

            {/* 2. DOCKET & PACKET METADATA GRID */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs">
              <div>
                <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Packet Docket No.</span>
                <span className="font-mono font-black text-sm text-indigo-950">{packet.packetNumber}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Course Code</span>
                <span className="font-mono font-black text-sm text-slate-900">{packet.courseCode}</span>
                {courseTitle && (
                  <span className="block text-[10px] text-slate-600 truncate">{courseTitle}</span>
                )}
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Programme</span>
                <span className="font-bold text-sm text-slate-900">{packet.programmeCode}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Enclosed Scripts</span>
                <span className="font-mono font-black text-sm text-emerald-800">
                  {packet.scriptCount} Physical Scripts
                </span>
              </div>

              <div>
                <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Dispatch Date</span>
                <span className="font-medium text-slate-800">{dispatchDateStr}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Expected Return Date</span>
                <span className="font-bold text-rose-700">{returnDateStr}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Packet Status</span>
                <span className="font-semibold text-slate-800">{packet.status}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Dispatched Under</span>
                <span className="text-slate-700">{packet.notes || 'Cloth / Sealed Envelope'}</span>
              </div>
            </div>

            {/* 3. ASSIGNED ACADEMIC COUNSELLOR / EVALUATOR PROFILE */}
            <div className="border border-slate-200 rounded-lg p-3.5 bg-white text-xs space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1 flex items-center justify-between">
                <span>Allotted Academic Counsellor / Evaluator Details</span>
                {evaluator && (
                  <span className="font-mono text-indigo-700">{evaluator.evaluatorCode}</span>
                )}
              </div>

              {evaluator ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <div>
                    <span className="text-slate-500 text-[10px] block">Evaluator Name:</span>
                    <strong className="text-slate-900 text-xs">{evaluator.name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Designation & Institution:</span>
                    <span className="text-slate-800">{evaluator.designation || 'Academic Counsellor'}, {evaluator.collegeInstitution}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Contact Phone & Email:</span>
                    <span className="font-mono text-slate-800">{evaluator.contactPhone || '-'} • {evaluator.email || '-'}</span>
                  </div>
                </div>
              ) : (
                <div className="text-slate-500 italic py-1">
                  No evaluator currently assigned. Packet formed for internal storage and subsequent allotment.
                </div>
              )}
            </div>

            {/* 4. ITEMIZED ENCLOSED STUDENT SCRIPTS TABLE */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Enclosed Assignment Scripts Register ({scripts.length} Received Candidates)
                </h3>
                <span className="text-[11px] text-slate-500 italic">
                  Evaluator: Enter awarded marks out of 100 in the designated column
                </span>
              </div>

              <div className="border border-slate-300 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 text-[11px]">
                    <tr>
                      <th className="p-2 text-center w-10 border-r border-slate-300">S.No.</th>
                      <th className="p-2 border-r border-slate-300">Enrollment No.</th>
                      <th className="p-2 border-r border-slate-300">Candidate Name</th>
                      <th className="p-2 border-r border-slate-300">Intake Token / Receipt</th>
                      <th className="p-2 border-r border-slate-300 text-center w-24">Receipt Date</th>
                      <th className="p-2 border-r border-slate-300 text-center w-28 bg-amber-50/70 text-amber-950">
                        Marks (100)
                      </th>
                      <th className="p-2">Evaluator Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono text-xs">
                    {scripts.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-4 text-center text-slate-400 font-sans italic">
                          No specific candidate scripts mapped. Standard batch count: {packet.scriptCount} scripts.
                        </td>
                      </tr>
                    ) : (
                      scripts.map((row, idx) => (
                        <tr key={row.enrollmentNo || idx} className="hover:bg-slate-50">
                          <td className="p-2 text-center font-bold text-slate-500 border-r border-slate-300">
                            {idx + 1}
                          </td>
                          <td className="p-2 font-black text-slate-900 border-r border-slate-300">
                            {row.enrollmentNo}
                          </td>
                          <td className="p-2 font-sans font-semibold text-slate-800 border-r border-slate-300">
                            {row.studentName}
                          </td>
                          <td className="p-2 text-slate-600 border-r border-slate-300 text-[11px]">
                            {row.tokenNo || '-'}
                          </td>
                          <td className="p-2 text-center text-slate-600 border-r border-slate-300 text-[11px]">
                            {row.submissionDate ? formatDate(row.submissionDate) : '-'}
                          </td>
                          <td className="p-2 text-center font-bold text-slate-900 border-r border-slate-300 bg-amber-50/30">
                            {row.marks !== null && row.marks !== undefined ? (
                              <span className="text-emerald-700">{row.marks}</span>
                            ) : (
                              <span className="text-slate-300 font-normal">_______</span>
                            )}
                          </td>
                          <td className="p-2 font-sans text-slate-500 text-[11px]">
                            <span className="text-slate-300">____________________</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 5. STATUTORY EVALUATOR GUIDELINES */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-[11px] text-slate-700 space-y-1">
              <span className="font-bold text-slate-900 uppercase block tracking-wider">
                Guidelines for Academic Counsellor / Evaluator:
              </span>
              <ul className="list-disc list-inside space-y-0.5 text-slate-600 leading-relaxed">
                <li>1. Check that the number of physical scripts in this packet corresponds exactly to the count listed above ({packet.scriptCount} scripts).</li>
                <li>2. Evaluate assignments strictly in accordance with IGNOU scheme and guidelines. Red ink must be used for marking.</li>
                <li>3. Record awarded marks clearly on the cover page of each assignment script as well as on the official IGNOU SED Award Sheet.</li>
                <li>4. Return the evaluated scripts along with completed and signed award lists to the Study Centre on or before <strong className="text-slate-900">{returnDateStr}</strong>.</li>
              </ul>
            </div>

            {/* 6. STATUTORY SIGNATURE & CERTIFICATION BLOCKS */}
            <div className="grid grid-cols-3 gap-6 pt-6 text-xs text-center border-t border-slate-300">
              <div className="space-y-1">
                <div className="h-12 flex items-end justify-center">
                  <span className="font-serif italic text-slate-400 text-xs">Dispatch Verified</span>
                </div>
                <div className="border-t border-slate-400 pt-1">
                  <strong className="block text-slate-900">Study Centre Official</strong>
                  <span className="text-[10px] text-slate-500 block">Packet Handover & Dispatch</span>
                  <span className="text-[10px] text-slate-500 block">Date: {dispatchDateStr}</span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="h-12 flex items-end justify-center">
                  <span className="font-serif italic text-slate-400 text-xs">Receipt Acknowledged</span>
                </div>
                <div className="border-t border-slate-400 pt-1">
                  <strong className="block text-slate-900">
                    {evaluator ? evaluator.name : 'Academic Counsellor'}
                  </strong>
                  <span className="text-[10px] text-slate-500 block">Signature & Date of Receipt</span>
                  <span className="text-[10px] text-slate-500 block">Contact: {evaluator?.contactPhone || '—'}</span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="h-12 flex items-end justify-center">
                  <span className="font-serif italic text-slate-400 text-xs">Official Seal & Stamp</span>
                </div>
                <div className="border-t border-slate-400 pt-1">
                  <strong className="block text-slate-900">
                    {settings.coordinatorName || 'Dr. Sant K. Gupta'}
                  </strong>
                  <span className="text-[10px] text-slate-500 block">Coordinator, IGNOU SC-2033</span>
                  <span className="text-[10px] text-slate-500 block">S.D. Jain Girls' College, Dimapur</span>
                </div>
              </div>
            </div>

            {/* Footer watermark note */}
            <div className="text-[9px] text-slate-400 text-center font-mono border-t border-slate-100 pt-2">
              IGNOU SC-2033 Examination Management System • Packet Reference: {packet.packetNumber} • Printed on: {new Date().toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
