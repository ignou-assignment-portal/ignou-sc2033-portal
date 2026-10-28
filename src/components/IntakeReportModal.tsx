import React, { useState, useMemo } from 'react';
import {
  X,
  FileDown,
  Printer,
  FileText,
  Search,
  Filter,
  CheckCircle2,
  Building2,
  Users,
  Layers,
  BookOpen,
  Calendar,
  Sparkles,
  Download,
} from 'lucide-react';
import { IntakeRecord } from '../types';
import { formatDate } from '../utils/helpers';
import { downloadStudentIntakePDF } from '../services/pdfReportGenerator';

export interface IntakeReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionName: string;
  records: IntakeRecord[];
}

export const IntakeReportModal: React.FC<IntakeReportModalProps> = ({
  isOpen,
  onClose,
  sessionName,
  records,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProgFilter, setSelectedProgFilter] = useState('ALL');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Available programmes
  const availableProgrammes = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      const p = (r.programmeCode || (r as any).Programme || '').trim().toUpperCase();
      if (p) set.add(p);
    });
    return Array.from(set).sort();
  }, [records]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const prog = (r.programmeCode || (r as any).Programme || '').trim().toUpperCase();
      if (selectedProgFilter !== 'ALL' && prog !== selectedProgFilter) {
        return false;
      }

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const token = (r.tokenNo || '').toLowerCase();
      const enr = (r.enrollmentNo || '').toLowerCase();
      const name = (r.studentName || '').toLowerCase();
      const courses = (r.courseCodes || []).join(' ').toLowerCase();

      return (
        token.includes(q) ||
        enr.includes(q) ||
        name.includes(q) ||
        prog.toLowerCase().includes(q) ||
        courses.includes(q)
      );
    });
  }, [records, selectedProgFilter, searchQuery]);

  // Overall metrics
  const totalIntakes = records.length;
  const uniqueStudents = new Set(
    records.map((r) => (r.enrollmentNo || (r as any).Enrollment_No || '').trim())
  ).size;
  const totalScripts = records.reduce((sum, r) => {
    const courses = r.courseCodes || (r as any).Courses || [];
    return sum + (Array.isArray(courses) ? courses.length : String(courses).split(',').length);
  }, 0);

  const handleDownload = () => {
    setIsDownloading(true);
    setDownloadSuccess(false);
    try {
      downloadStudentIntakePDF(sessionName, filteredRecords, {
        programmeFilter: selectedProgFilter !== 'ALL' ? selectedProgFilter : null,
      });
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3500);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div
      id="intake-report-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="intake-report-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="intake-report-title"
        className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
      >
        {/* Modal Controls Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-50/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3
                  id="intake-report-title"
                  className="font-bold text-zinc-900 text-sm sm:text-base leading-tight"
                >
                  Student Intake Summary Report
                </h3>
                <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                  {sessionName}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Official compiled session report template • PDF Download & Print Ready
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Download PDF Button */}
            <button
              type="button"
              id="btn-download-pdf-summary"
              data-testid="btn-download-pdf"
              onClick={handleDownload}
              disabled={isDownloading || filteredRecords.length === 0}
              className={`px-4 py-2 font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer ${
                downloadSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-98'
              }`}
            >
              {downloadSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>PDF Downloaded!</span>
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4" />
                  <span>Download PDF Summary</span>
                </>
              )}
            </button>

            <button
              type="button"
              id="btn-print-report-summary"
              onClick={handlePrint}
              className="px-3.5 py-2 font-semibold text-xs rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Printer className="w-4 h-4 text-zinc-500" />
              <span>Print</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              id="btn-close-intake-report"
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 transition cursor-pointer"
              aria-label="Close report"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="px-4 py-3 border-b border-zinc-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search name, enrollment, course..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <select
              value={selectedProgFilter}
              onChange={(e) => setSelectedProgFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-zinc-200 rounded-lg bg-white font-medium text-zinc-700 cursor-pointer"
            >
              <option value="ALL">All Programmes ({availableProgrammes.length})</option>
              {availableProgrammes.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="text-[11px] text-zinc-500 flex items-center gap-3">
            <span>
              Showing <strong className="text-zinc-800">{filteredRecords.length}</strong> of{' '}
              <strong className="text-zinc-800">{totalIntakes}</strong> records
            </span>
            <span>•</span>
            <span>
              <strong className="text-zinc-800">{uniqueStudents}</strong> unique candidates
            </span>
            <span>•</span>
            <span>
              <strong className="text-zinc-800">{totalScripts}</strong> total scripts
            </span>
          </div>
        </div>

        {/* Modal Scrollable Report Template View */}
        <div className="p-4 sm:p-8 overflow-y-auto bg-zinc-100/60 font-sans space-y-6">
          {/* Printable Report Canvas */}
          <div
            id="printable-intake-summary-report"
            className="bg-white rounded-xl shadow-xs border border-zinc-200 p-6 sm:p-8 max-w-4xl mx-auto space-y-6 text-zinc-800"
          >
            {/* Official Report Header */}
            <div className="border-b-2 border-indigo-900 pb-4 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <div className="text-xs font-mono font-bold tracking-wider text-indigo-900 uppercase">
                  Indira Gandhi National Open University (IGNOU)
                </div>
                <h1 className="text-lg sm:text-xl font-black text-zinc-900 tracking-tight mt-0.5">
                  STUDENT INTAKE & ASSIGNMENT SUBMISSION REPORT
                </h1>
                <div className="text-xs text-zinc-600 mt-1">
                  Study Centre SC-2033 • S.D. Jain Girls' College, Dimapur • Regional Centre Kohima (RC-20)
                </div>
              </div>

              <div className="text-right text-xs shrink-0 font-mono space-y-0.5 bg-zinc-50 p-2.5 rounded-lg border border-zinc-200">
                <div>
                  <strong>Session:</strong> {sessionName}
                </div>
                <div>
                  <strong>Date:</strong> {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
                <div className="text-[10px] text-zinc-500">
                  Ref: SC2033/ASGN/{sessionName.replace(/\s+/g, '')}
                </div>
              </div>
            </div>

            {/* Metrics Highlights */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200">
                <span className="text-[10px] uppercase font-bold text-zinc-500 block">Total Intakes</span>
                <span className="text-lg font-black text-zinc-900 font-mono">{filteredRecords.length}</span>
              </div>
              <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200">
                <span className="text-[10px] uppercase font-bold text-zinc-500 block">Unique Candidates</span>
                <span className="text-lg font-black text-indigo-700 font-mono">{uniqueStudents}</span>
              </div>
              <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200">
                <span className="text-[10px] uppercase font-bold text-zinc-500 block">Assignment Scripts</span>
                <span className="text-lg font-black text-emerald-700 font-mono">{totalScripts}</span>
              </div>
              <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200">
                <span className="text-[10px] uppercase font-bold text-zinc-500 block">Programmes Covered</span>
                <span className="text-lg font-black text-zinc-700 font-mono">{availableProgrammes.length}</span>
              </div>
            </div>

            {/* Student Data Table Roster */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-zinc-900 uppercase tracking-wide">
                Comprehensive Student Intake Roster ({sessionName})
              </div>

              <div className="border border-zinc-200 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-900 text-white text-[11px] font-semibold">
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      <th className="py-2.5 px-3">Token No</th>
                      <th className="py-2.5 px-3">Enrollment No</th>
                      <th className="py-2.5 px-3">Candidate Name</th>
                      <th className="py-2.5 px-2 text-center">Prog</th>
                      <th className="py-2.5 px-3">Submitted Courses</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Mode</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 font-normal">
                    {filteredRecords.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-zinc-400 text-xs">
                          No student records found matching the active filter.
                        </td>
                      </tr>
                    ) : (
                      filteredRecords.map((r, idx) => {
                        const rawCourses = r.courseCodes || (r as any).Courses || [];
                        const coursesArr = Array.isArray(rawCourses)
                          ? rawCourses
                          : String(rawCourses).split(',').map((c) => c.trim());
                        const prog = r.programmeCode || (r as any).Programme || '-';
                        const token = r.tokenNo || r.receiptNumber || r.id || '-';
                        const enr = r.enrollmentNo || (r as any).Enrollment_No || '-';
                        const name = r.studentName || (r as any).Candidate_Name || '-';
                        const date = r.submissionDate ? formatDate(r.submissionDate) : '-';
                        const mode = r.submissionMode || 'In-Person (Desk)';

                        return (
                          <tr
                            key={`report-row-${token}-${idx}`}
                            className={idx % 2 === 0 ? 'bg-white' : 'bg-zinc-50/70'}
                          >
                            <td className="py-2 px-3 text-center text-zinc-400 font-mono text-[10px]">
                              {idx + 1}
                            </td>
                            <td className="py-2 px-3 font-mono font-bold text-indigo-950 text-[11px]">
                              {token}
                            </td>
                            <td className="py-2 px-3 font-mono font-bold text-zinc-900 text-[11px]">
                              {enr}
                            </td>
                            <td className="py-2 px-3 font-semibold text-zinc-900">
                              {name}
                            </td>
                            <td className="py-2 px-2 text-center font-bold text-indigo-700 font-mono">
                              {prog}
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex flex-wrap gap-1">
                                {coursesArr.map((c) => (
                                  <span
                                    key={c}
                                    className="px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-800 border border-zinc-200 font-mono text-[10px] font-semibold"
                                  >
                                    {c}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="py-2 px-3 text-zinc-600 text-[11px]">
                              {date}
                            </td>
                            <td className="py-2 px-3 text-zinc-500 text-[10px]">
                              {mode}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Official Certification & Signature Footers */}
            <div className="pt-6 border-t border-zinc-200 text-xs space-y-8">
              <p className="italic text-zinc-500 text-[11px] leading-relaxed">
                Certification: Certified that all assignment intake entries detailed above have been physically verified
                against authentic TMA/CMA scripts deposited at the Assignment Intake Counter of IGNOU Study Centre 2033, Dimapur.
              </p>

              <div className="grid grid-cols-3 gap-6 pt-4 text-center text-[11px]">
                <div className="space-y-1">
                  <div className="w-32 border-b border-zinc-400 mx-auto mb-2"></div>
                  <div className="font-bold text-zinc-800">Dealing Assistant</div>
                  <div className="text-zinc-500 text-[10px]">Assignment Intake Counter</div>
                </div>

                <div className="space-y-1">
                  <div className="w-32 border-b border-zinc-400 mx-auto mb-2"></div>
                  <div className="font-bold text-zinc-800">Assistant Coordinator</div>
                  <div className="text-zinc-500 text-[10px]">Examinations & Evaluation</div>
                </div>

                <div className="space-y-1">
                  <div className="w-32 border-b border-zinc-400 mx-auto mb-2"></div>
                  <div className="font-bold text-zinc-800">Centre Coordinator</div>
                  <div className="text-zinc-500 text-[10px]">IGNOU Study Centre 2033</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between text-xs shrink-0">
          <span className="text-zinc-500 text-[11px]">
            Ready to export as vector PDF document with official letterhead, tables, and signature blocks.
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer transition shadow-2xs flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF ({filteredRecords.length} Records)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntakeReportModal;
