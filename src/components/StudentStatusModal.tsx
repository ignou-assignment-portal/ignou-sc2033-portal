import React from 'react';
import {
  X,
  Printer,
  Copy,
  CheckCircle2,
  GraduationCap,
  Calendar,
  Layers,
  Phone,
  Mail,
  Building2,
  FileCheck2,
  Award,
  ShieldCheck,
  User,
  BookOpen,
} from 'lucide-react';
import { StudentRegistrationRecord, IntakeRecord } from '../types';
import { useApp } from '../context/AppContext';
import { formatDate } from '../utils/helpers';

interface StudentStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentRegistrationRecord | null;
  intakeSubmissions: IntakeRecord[];
}

export const StudentStatusModal: React.FC<StudentStatusModalProps> = ({
  isOpen,
  onClose,
  student,
  intakeSubmissions,
}) => {
  const { settings, showToast } = useApp();
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !student) return null;

  const handleCopyEnrollment = () => {
    navigator.clipboard.writeText(student.enrollmentNo);
    setCopied(true);
    showToast('Enrollment Number copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrintSlip = () => {
    window.print();
  };

  const isFresh = student.cadre === 'FRESH';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-300 overflow-hidden my-auto flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:m-0 print:w-full">
        
        {/* Modal Top Bar (Hidden in Print) */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
              <GraduationCap className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-sm text-white">
                Official Student Status Verification Slip
              </h3>
              <p className="text-[11px] text-slate-400">
                SC-2033 Institutional Database Verification Record
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintSlip}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-700 hover:bg-indigo-600 text-white rounded-lg text-xs font-bold transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Slip</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Verification Document */}
        <div className="p-6 overflow-y-auto space-y-5 text-slate-800 flex-1 print:p-0">
          
          {/* Institutional Header */}
          <div className="border-b-2 border-slate-900 pb-4 text-center space-y-1">
            <div className="text-[11px] font-bold tracking-widest text-slate-600 uppercase">
              Indira Gandhi National Open University
            </div>
            <h2 className="text-lg font-black text-slate-950 uppercase tracking-tight">
              Study Centre 2033 — Student Status Certificate
            </h2>
            <div className="text-xs text-slate-600 font-medium">
              {settings.institutionName || "S.D. Jain Girls' College, Dimapur"} • Regional Centre: {settings.regionalCentreCode || 'RC-20 Kohima'}
            </div>
          </div>

          {/* Status Badge Strip */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Record Status:</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wide border ${
                isFresh
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-purple-50 text-purple-800 border-purple-300'
              }`}>
                {isFresh ? 'Fresh Admission (1st Year)' : `Re-Registration (${student.academicYear || '2nd/3rd Year'})`}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-mono">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>Session: <strong>{student.session}</strong></span>
            </div>
          </div>

          {/* Core Student Information Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Candidate Name</span>
              <div className="font-bold text-sm text-slate-950">{student.studentName}</div>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Enrollment Number</span>
              <div className="flex items-center justify-between">
                <span className="font-mono font-black text-sm text-indigo-950 tracking-wider">
                  {student.enrollmentNo}
                </span>
                <button
                  type="button"
                  onClick={handleCopyEnrollment}
                  className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition print:hidden cursor-pointer"
                  title="Copy Enrollment"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Programme</span>
              <div className="font-bold text-sm text-slate-950">
                <span className="font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 mr-1.5">
                  {student.programmeCode}
                </span>
                <span>{student.programmeName || student.programmeCode}</span>
              </div>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Registered Cadre</span>
              <div className="font-semibold text-slate-900">
                {student.cadre === 'FRESH' ? '1st Year Fresh Entry' : `${student.academicYear || 'Higher'} Re-Registration`}
              </div>
            </div>
          </div>

          {/* Exact Contact Details from Master Sheet */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
            <div className="font-bold text-slate-900 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Contact Coordinates (Verbatim from Google Sheets)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="flex items-center gap-2 text-slate-700">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                <span>
                  Mobile: <strong className="font-mono text-slate-950">{student.studentPhone || 'Not Provided'}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-700 truncate">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="truncate">
                  Email: <strong className="font-mono text-slate-950">{student.studentEmail || 'Not Provided'}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Enrolled Courses */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <span>Enrolled Course Modules ({student.courseCodes?.length || 0}):</span>
              </span>
              <span className="text-[11px] font-normal text-slate-500">Official Course Curriculum</span>
            </div>
            <div className="flex flex-wrap gap-1.5 p-3 bg-white border border-slate-200 rounded-xl">
              {(student.courseCodes && student.courseCodes.length > 0) ? (
                student.courseCodes.map((code) => (
                  <span
                    key={code}
                    className="px-2.5 py-1 bg-indigo-50 text-indigo-900 border border-indigo-200 rounded-lg font-mono text-xs font-bold"
                  >
                    {code}
                  </span>
                ))
              ) : (
                <span className="text-slate-400 italic text-xs">No specific courses listed in admission roster</span>
              )}
            </div>
          </div>

          {/* Group (A) Assignment Operations History */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FileCheck2 className="w-4 h-4 text-emerald-600" />
                <span>Assignment Intake History (SC-2033 Counter Log):</span>
              </span>
              <span className="text-[11px] font-normal text-slate-500">
                {intakeSubmissions.length} Submission(s)
              </span>
            </div>

            {intakeSubmissions.length === 0 ? (
              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl text-xs text-amber-900">
                No physical assignment scripts logged yet for this candidate at Desk Counter 1.
              </div>
            ) : (
              <div className="space-y-2">
                {intakeSubmissions.map((sub) => (
                  <div
                    key={sub.id}
                    className="p-3 bg-white border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-950 flex items-center gap-2">
                        <span>Token: <code className="font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">{sub.tokenNo}</code></span>
                        <span>•</span>
                        <span>{formatDate(sub.submissionDate)}</span>
                        <span>•</span>
                        <span className="text-slate-500 font-normal">({sub.submissionMode || 'In-Person'})</span>
                      </div>
                      <div className="text-[11px] text-slate-600 mt-1">
                        Courses: <span className="font-mono font-semibold">{(sub.courseCodes || []).join(', ')}</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                      Logged in Sheet
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Institutional Stamp & Signature Block */}
          <div className="pt-6 border-t border-slate-200 flex items-end justify-between text-xs text-slate-600">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase">Verification Source</div>
              <div className="font-semibold text-slate-800">IGNOU SC-2033 Cloud Ledger</div>
              <div className="text-[10px] text-slate-500">Generated: {new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</div>
            </div>

            <div className="text-right">
              <div className="w-32 border-b border-slate-400 mb-1"></div>
              <div className="font-bold text-slate-900">Dr. Sant Kumar Gupta</div>
              <div className="text-[11px] text-slate-500">Coordinator, IGNOU SC-2033</div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0 print:hidden">
          <span className="text-[11px] text-slate-500">
            SC-2033 Master Database • Official Non-Financial Verification
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintSlip}
              className="px-3.5 py-2 bg-indigo-900 hover:bg-indigo-800 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
            >
              Print Slip
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
