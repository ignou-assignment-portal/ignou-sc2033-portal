import React, { useState, useMemo } from 'react';
import { CourseEvaluationRecord, StatusTransitionEntry } from '../types';
import { formatDate } from '../utils/helpers';
import {
  X,
  History,
  Stamp,
  Lock,
  Unlock,
  UserCheck,
  UserX,
  CheckCircle2,
  FileText,
  Clock,
  ShieldCheck,
  User,
  Copy,
  Check,
  ArrowRight,
  ArrowUpDown,
  Download,
  AlertCircle
} from 'lucide-react';

interface StatusHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: CourseEvaluationRecord | null;
  history: StatusTransitionEntry[];
}

export const StatusHistoryModal: React.FC<StatusHistoryModalProps> = ({
  isOpen,
  onClose,
  record,
  history,
}) => {
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [copied, setCopied] = useState(false);

  // Keyboard shortcut: close on ESC
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const sortedHistory = useMemo(() => {
    const list = [...history];
    list.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });
    return list;
  }, [history, sortOrder]);

  if (!isOpen || !record) return null;

  const formatIST = (isoString?: string) => {
    if (!isoString) return '—';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return isoString;
      return new Intl.DateTimeFormat('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'medium',
        timeZone: 'Asia/Kolkata',
      }).format(date);
    } catch {
      return isoString;
    }
  };

  const getActionConfig = (action: string) => {
    switch (action) {
      case 'MARKS_LOCKED':
        return {
          label: 'Official Verification Seal Applied',
          icon: Stamp,
          iconBg: 'bg-purple-100 text-purple-700 border-purple-200',
          badgeClass: 'bg-purple-50 text-purple-800 border-purple-200',
        };
      case 'MARKS_UNLOCKED':
        return {
          label: 'Marks Unlocked by Coordinator',
          icon: Unlock,
          iconBg: 'bg-rose-100 text-rose-700 border-rose-200',
          badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
        };
      case 'MARKS_ENTERED':
        return {
          label: 'Evaluation Marks Recorded',
          icon: CheckCircle2,
          iconBg: 'bg-emerald-100 text-emerald-700 border-emerald-200',
          badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        };
      case 'MARKS_UPDATED':
        return {
          label: 'Marks Score Updated',
          icon: CheckCircle2,
          iconBg: 'bg-teal-100 text-teal-700 border-teal-200',
          badgeClass: 'bg-teal-50 text-teal-800 border-teal-200',
        };
      case 'EVALUATOR_ALLOTTED':
        return {
          label: 'Academic Counsellor Allotted',
          icon: UserCheck,
          iconBg: 'bg-blue-100 text-blue-700 border-blue-200',
          badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
        };
      case 'EVALUATOR_CHANGED':
        return {
          label: 'Academic Counsellor Reassigned',
          icon: UserCheck,
          iconBg: 'bg-indigo-100 text-indigo-700 border-indigo-200',
          badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
        };
      case 'EVALUATOR_UNALLOTTED':
        return {
          label: 'Evaluator Allotment Revoked',
          icon: UserX,
          iconBg: 'bg-amber-100 text-amber-700 border-amber-200',
          badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
        };
      case 'INTAKE_REGISTERED':
      default:
        return {
          label: 'Assignment Script Intake Registered',
          icon: FileText,
          iconBg: 'bg-zinc-100 text-zinc-700 border-zinc-200',
          badgeClass: 'bg-zinc-50 text-zinc-800 border-zinc-200',
        };
    }
  };

  const handleCopyLog = () => {
    const lines = [
      `IGNOU STUDY CENTRE SC-2033 - SCRIPT STATUS AUDIT TRAIL`,
      `======================================================`,
      `Submission Key : ${record.submissionKey || record.id}`,
      `Enrollment No  : ${record.enrollmentNo}`,
      `Candidate Name : ${record.studentName || record.candidateName || '—'}`,
      `Course Code    : ${record.courseCode} (${record.programmeCode})`,
      `Session        : ${record.session}`,
      `Current Status : ${record.isLocked ? 'LOCKED & VERIFIED' : record.status}`,
      `Marks Awarded  : ${record.marks !== null ? `${record.marks}/100 (Grade ${record.grade || '—'})` : 'Pending'}`,
      `Evaluator      : ${record.Allotted_Evaluator || record.evaluatorName || 'Unallotted'}`,
      `======================================================`,
      `LIFECYCLE TRANSITION HISTORY (${sortedHistory.length} Milestones):`,
      ...sortedHistory.map((item, index) => {
        const time = formatIST(item.timestamp);
        return [
          `[#${index + 1}] ${time}`,
          `Action    : ${item.action}`,
          `Transition: ${item.previousStatus || '—'} -> ${item.newStatus}`,
          `Actor     : ${item.userName} (${item.userRole}) [ID: ${item.userId}]`,
          `Details   : ${item.details}`,
          item.marks !== undefined && item.marks !== null ? `Marks: ${item.marks} | Grade: ${item.grade || '—'}` : '',
          item.evaluatorName ? `Evaluator: ${item.evaluatorName}` : '',
          `------------------------------------------------------`
        ].filter(Boolean).join('\n');
      }),
    ];

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleExportJSON = () => {
    const data = {
      record,
      history: sortedHistory,
      exportedAt: new Date().toISOString(),
      centreCode: 'SC-2033',
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `StatusHistory_${record.enrollmentNo}_${record.courseCode}_${record.session.replace(/\s+/g, '')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isLocked = Boolean(record.isLocked || record.status === 'Marks Locked');
  const numericMarks = record.marks !== null && record.marks !== undefined ? Number(record.marks) : null;
  const evaluatorDisplay = record.Allotted_Evaluator || record.evaluatorName || 'Unallotted';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="status-history-title"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 shadow-2xs">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="status-history-title" className="text-base font-bold text-zinc-900">
                  Script Lifecycle & Status History
                </h3>
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-zinc-200/80 text-zinc-700">
                  IGNOU SC-2033
                </span>
              </div>
              <p className="text-xs text-zinc-500 font-mono mt-0.5">
                Key: <span className="font-semibold text-zinc-800">{record.submissionKey || record.id}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 bg-white hover:bg-zinc-100 border border-zinc-200 rounded-lg transition cursor-pointer shadow-2xs"
              title="Toggle sort direction"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500" />
              <span>{sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 rounded-lg transition cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Candidate & Script Details Header Card */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-zinc-50 to-indigo-50/30 border-b border-zinc-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider">Candidate</span>
            <span className="font-bold text-zinc-900 text-sm block truncate">
              {record.studentName || record.candidateName || '—'}
            </span>
            <span className="font-mono text-zinc-600 text-[11px]">Enr: {record.enrollmentNo}</span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider">Course & Prog</span>
            <span className="font-bold text-indigo-900 text-sm block">
              {record.courseCode}
            </span>
            <span className="text-zinc-600 text-[11px] font-medium">{record.programmeCode} • {record.session}</span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider">Academic Counsellor</span>
            <span className="font-semibold text-zinc-800 block truncate" title={evaluatorDisplay}>
              {evaluatorDisplay}
            </span>
            <span className="text-[11px] text-zinc-500 font-mono">
              {record.allottedDate ? `Allotted: ${formatDate(record.allottedDate)}` : 'Awaiting allotment'}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider">Current Status</span>
            <div className="mt-0.5">
              {isLocked ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-900 border border-purple-200">
                  <Stamp className="w-3 h-3 text-purple-700" />
                  <span>LOCKED & SEALED</span>
                </span>
              ) : (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold border ${
                    record.status === 'Evaluated' || numericMarks !== null
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : record.status === 'Allotted' || (evaluatorDisplay && evaluatorDisplay !== 'Unallotted')
                      ? 'bg-blue-50 text-blue-800 border-blue-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  <span>{record.status || 'Pending Allotment'}</span>
                </span>
              )}
            </div>
            {numericMarks !== null && (
              <span className="text-[11px] font-bold text-zinc-700 block mt-0.5">
                Marks: {numericMarks}/100 ({record.grade || '—'})
              </span>
            )}
          </div>
        </div>

        {/* Main Timeline Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-zinc-700">
              Audit Trail Milestones ({sortedHistory.length})
            </span>
            <span className="text-[11px] text-zinc-400">
              Records synced with local storage & Google Sheets
            </span>
          </div>

          {sortedHistory.length === 0 ? (
            <div className="text-center py-12 px-4 border border-dashed border-zinc-200 rounded-xl bg-zinc-50/50">
              <AlertCircle className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-zinc-700">No transition history recorded yet</p>
              <p className="text-xs text-zinc-500 mt-1">
                Any upcoming evaluator allotment, marks entry, or lock actions will automatically register here.
              </p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-zinc-200">
              {sortedHistory.map((item, index) => {
                const config = getActionConfig(item.action);
                const ActionIcon = config.icon;
                const formattedTime = formatIST(item.timestamp);
                const isAdminActor = item.userRole === 'ADMIN' || item.userId?.includes('coord');

                return (
                  <div key={item.id || index} className="relative group">
                    {/* Timeline Node Icon */}
                    <div
                      className={`absolute -left-6 top-1.5 w-6 h-6 rounded-full border flex items-center justify-center shadow-2xs z-10 ${config.iconBg}`}
                    >
                      <ActionIcon className="w-3 h-3" />
                    </div>

                    {/* Milestone Card */}
                    <div className="bg-white border border-zinc-200 rounded-xl p-3.5 shadow-2xs transition hover:border-zinc-300">
                      {/* Top Row: Milestone Title & Timestamp */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded border ${config.badgeClass}`}>
                            {config.label}
                          </span>
                          <span className="text-[10px] font-mono text-zinc-400">
                            #{sortedHistory.length - (sortOrder === 'desc' ? index : sortedHistory.length - 1 - index)}
                          </span>
                        </div>
                        <div className="text-xs font-mono text-zinc-500 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-zinc-400" />
                          <span>{formattedTime}</span>
                        </div>
                      </div>

                      {/* State Transition Flow */}
                      {item.previousStatus && item.previousStatus !== item.newStatus && (
                        <div className="flex items-center gap-1.5 mt-2 text-xs">
                          <span className="font-medium text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded">
                            {item.previousStatus}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
                          <span className="font-bold text-zinc-800 bg-zinc-100 px-2 py-0.5 rounded">
                            {item.newStatus}
                          </span>
                        </div>
                      )}

                      {/* Narrative Description */}
                      <p className="text-xs text-zinc-700 mt-2 font-medium leading-relaxed">
                        {item.details}
                      </p>

                      {/* Context Chips (Marks, Evaluator) */}
                      {(item.marks !== undefined && item.marks !== null || item.evaluatorName) && (
                        <div className="flex flex-wrap items-center gap-2 mt-2.5 pt-2 border-t border-zinc-100">
                          {item.marks !== undefined && item.marks !== null && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Marks: {item.marks}/100 {item.grade ? `(Grade ${item.grade})` : ''}</span>
                            </span>
                          )}
                          {item.evaluatorName && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                              <User className="w-3 h-3 text-blue-600" />
                              <span>Evaluator: {item.evaluatorName}{item.evaluatorCode ? ` (${item.evaluatorCode})` : ''}</span>
                            </span>
                          )}
                        </div>
                      )}

                      {/* Actor & User ID Footer */}
                      <div className="mt-2.5 pt-2 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-500">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-zinc-400" />
                          <span className="font-semibold text-zinc-800">{item.userName}</span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase tracking-wider ${
                              isAdminActor
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : 'bg-zinc-100 text-zinc-700 border-zinc-200'
                            }`}
                          >
                            {item.userRole || 'STAFF'}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-zinc-400">
                          Actor ID: <span className="text-zinc-600 font-medium">{item.userId || 'system'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="px-5 py-3 border-t border-zinc-200 bg-zinc-50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLog}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-300 rounded-lg text-xs font-bold transition cursor-pointer shadow-2xs"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied to Clipboard</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Copy Audit Trail</span>
                </>
              )}
            </button>

            <button
              onClick={handleExportJSON}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-300 rounded-lg text-xs font-bold transition cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-zinc-500" />
              <span>Export JSON</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-2xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
