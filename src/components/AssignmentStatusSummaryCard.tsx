import React, { useState, useMemo } from 'react';
import { useApp, norm } from '../context/AppContext';
import { formatDate, formatDateTime } from '../utils/helpers';
import {
  Clock,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  Eye,
  RefreshCw,
  FileText,
  ChevronRight,
  X,
  Activity,
  Layers,
  Search,
  BookOpen,
  Filter,
} from 'lucide-react';

interface AssignmentStatusSummaryCardProps {
  onSelectSubView?: (view: 'REGISTER' | 'SUBMISSIONS_REGISTER' | 'RECEIPTS') => void;
}

type ModalTab = 'PENDING' | 'VERIFIED' | 'REJECTED';

export const AssignmentStatusSummaryCard: React.FC<AssignmentStatusSummaryCardProps> = ({
  onSelectSubView,
}) => {
  const {
    currentSession,
    sessionIntakes,
    sessionCourseEvaluations,
    auditLogs,
  } = useApp();

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<ModalTab>('PENDING');
  const [modalSearchQuery, setModalSearchQuery] = useState('');

  // 1. Total Assignment Scripts Received in Session
  const totalReceivedScripts = useMemo(() => {
    if (sessionCourseEvaluations.length > 0) {
      return sessionCourseEvaluations.length;
    }
    return sessionIntakes.reduce((sum, r) => sum + (r.courseCodes ? r.courseCodes.length : 0), 0);
  }, [sessionCourseEvaluations, sessionIntakes]);

  // 2. Verified Assignments (Evaluations that are Locked / Verified in statutory award sheets)
  const verifiedAssignmentsList = useMemo(() => {
    return sessionCourseEvaluations.filter((rec) => rec.isLocked || rec.status === 'Marks Locked');
  }, [sessionCourseEvaluations]);

  const verifiedCount = verifiedAssignmentsList.length;

  // 3. Pending Assignments (Scripts received awaiting evaluation or verification lock)
  const pendingAssignmentsList = useMemo(() => {
    return sessionCourseEvaluations.filter((rec) => !rec.isLocked && rec.status !== 'Marks Locked');
  }, [sessionCourseEvaluations]);

  const pendingCount = sessionCourseEvaluations.length > 0
    ? pendingAssignmentsList.length
    : Math.max(0, totalReceivedScripts - verifiedCount);

  // Sub-breakdowns of pending
  const pendingUnallottedCount = useMemo(() => {
    return sessionCourseEvaluations.filter(
      (e) => !e.isLocked && (!e.evaluatorId || e.status === 'Pending Allotment')
    ).length;
  }, [sessionCourseEvaluations]);

  const pendingUnderEvalCount = useMemo(() => {
    return sessionCourseEvaluations.filter(
      (e) => !e.isLocked && (e.evaluatorId || e.status === 'Allotted' || e.status === 'Evaluated')
    ).length;
  }, [sessionCourseEvaluations]);

  // 4. Rejected Assignments (Integrity rule violations, rejected intake attempts, disqualified scripts)
  const rejectedLogsList = useMemo(() => {
    return auditLogs.filter((log) => {
      const isCurrentSession = !log.session || norm(log.session) === norm(currentSession);
      const isRejectedAction =
        (log.action as string) === 'INTAKE_REJECTED' ||
        log.status === 'FAILED' ||
        (log.status as any) === 'FAILURE' ||
        (log.summary && log.summary.toLowerCase().includes('reject')) ||
        (log.summary && log.summary.toLowerCase().includes('violation'));
      return isCurrentSession && isRejectedAction;
    });
  }, [auditLogs, currentSession]);

  const rejectedCount = rejectedLogsList.length;

  // Total transactions / pipeline aggregate for percentage calculation
  const totalPipelineCount = totalReceivedScripts + rejectedCount;

  const verifiedPercent = totalReceivedScripts > 0
    ? Math.round((verifiedCount / totalReceivedScripts) * 100)
    : 0;

  const pendingPercent = totalReceivedScripts > 0
    ? Math.round((pendingCount / totalReceivedScripts) * 100)
    : 0;

  const handleOpenModal = (tab: ModalTab) => {
    setActiveModalTab(tab);
    setModalSearchQuery('');
    setIsDetailModalOpen(true);
  };

  // Filtered lists for the Inspection Modal
  const filteredPending = useMemo(() => {
    const q = modalSearchQuery.toLowerCase().trim();
    if (!q) return pendingAssignmentsList;
    return pendingAssignmentsList.filter(
      (item) =>
        (item.enrollmentNo || '').toLowerCase().includes(q) ||
        (item.studentName || '').toLowerCase().includes(q) ||
        (item.courseCode || '').toLowerCase().includes(q) ||
        (item.programmeCode || '').toLowerCase().includes(q) ||
        (item.evaluatorName && item.evaluatorName.toLowerCase().includes(q))
    );
  }, [pendingAssignmentsList, modalSearchQuery]);

  const filteredVerified = useMemo(() => {
    const q = modalSearchQuery.toLowerCase().trim();
    if (!q) return verifiedAssignmentsList;
    return verifiedAssignmentsList.filter(
      (item) =>
        (item.enrollmentNo || '').toLowerCase().includes(q) ||
        (item.studentName || '').toLowerCase().includes(q) ||
        (item.courseCode || '').toLowerCase().includes(q) ||
        (item.programmeCode || '').toLowerCase().includes(q) ||
        (item.lockedBy && item.lockedBy.toLowerCase().includes(q))
    );
  }, [verifiedAssignmentsList, modalSearchQuery]);

  const filteredRejected = useMemo(() => {
    const q = modalSearchQuery.toLowerCase().trim();
    if (!q) return rejectedLogsList;
    return rejectedLogsList.filter((log) => {
      const summary = (log.summary || '').toLowerCase();
      const target = (log.targetIdentifier || '').toLowerCase();
      const actor = (log.actor || '').toLowerCase();
      const detailsStr = JSON.stringify(log.details || '').toLowerCase();
      return (
        summary.includes(q) ||
        target.includes(q) ||
        actor.includes(q) ||
        detailsStr.includes(q)
      );
    });
  }, [rejectedLogsList, modalSearchQuery]);

  return (
    <>
      <div
        id="assignment-operational-oversight-card"
        data-testid="assignment-operational-oversight-card"
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden transition-all duration-200"
      >
        {/* Top Header Row with Cycle & Status Badges */}
        <div className="px-4 py-3 bg-gradient-to-r from-zinc-50 via-zinc-100/70 to-zinc-50 dark:from-zinc-900/90 dark:via-zinc-800/60 dark:to-zinc-900/90 border-b border-zinc-200/80 dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-1.5 rounded-lg bg-indigo-600/10 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
                  Assignment Operations & Intake Oversight
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Real-Time
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Statutory tracking across Pending, Verified, and Rejected scripts for{' '}
                <strong className="text-zinc-800 dark:text-zinc-200 font-semibold">
                  {currentSession}
                </strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <div className="text-right text-[11px] font-medium text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-800/80 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 shadow-2xs">
              Total Scripts:{' '}
              <span className="font-mono font-bold text-zinc-900 dark:text-white">
                {totalReceivedScripts}
              </span>
            </div>
          </div>
        </div>

        {/* Visual Progress / Pipeline Proportional Bar */}
        <div className="px-4 pt-3 pb-1">
          <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 mb-1.5 font-medium">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span>Pending ({pendingPercent}%)</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span>Verified ({verifiedPercent}%)</span>
              </span>
              {rejectedCount > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                  <span>Rejected ({rejectedCount} blocked)</span>
                </span>
              )}
            </div>
            <span className="font-mono text-[10px] text-zinc-400 dark:text-zinc-500">
              {verifiedCount} of {totalReceivedScripts} scripts finalized
            </span>
          </div>

          <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex shadow-inner">
            <div
              style={{
                width: totalReceivedScripts > 0 ? `${(pendingCount / totalReceivedScripts) * 100}%` : '0%',
              }}
              className="bg-amber-500 transition-all duration-500"
              title={`Pending Evaluation / Verification: ${pendingCount}`}
            />
            <div
              style={{
                width: totalReceivedScripts > 0 ? `${(verifiedCount / totalReceivedScripts) * 100}%` : '0%',
              }}
              className="bg-emerald-500 transition-all duration-500"
              title={`Verified & Locked: ${verifiedCount}`}
            />
          </div>
        </div>

        {/* The 3 Real-Time Count Cards */}
        <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* 1. PENDING ASSIGNMENTS */}
          <div
            id="oversight-pending-card"
            data-testid="oversight-pending-card"
            onClick={() => handleOpenModal('PENDING')}
            className="group relative rounded-xl border border-amber-200 dark:border-amber-900/60 bg-gradient-to-b from-amber-50/70 to-amber-100/40 dark:from-amber-950/20 dark:to-amber-900/10 p-3.5 transition-all duration-150 hover:shadow-md hover:border-amber-300 dark:hover:border-amber-800 cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-200/80 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200 border border-amber-300/60 dark:border-amber-700/60">
                  <Clock className="w-3 h-3" />
                  Pending
                </span>
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 group-hover:translate-x-0.5 transition-transform flex items-center">
                  Inspect <ChevronRight className="w-3 h-3 ml-0.5" />
                </span>
              </div>

              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl sm:text-4xl font-black font-mono text-amber-800 dark:text-amber-300 tracking-tight">
                  {pendingCount}
                </span>
                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                  Scripts
                </span>
              </div>

              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-1 line-clamp-2 leading-tight">
                Scripts received at desk awaiting evaluator allotment or marks verification.
              </p>
            </div>

            <div className="mt-3 pt-2.5 border-t border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between text-[10px] text-amber-900 dark:text-amber-300/80 font-medium">
              <span>{pendingUnallottedCount} Unallotted</span>
              <span className="text-amber-300 dark:text-amber-700">•</span>
              <span>{pendingUnderEvalCount} In Evaluation</span>
            </div>
          </div>

          {/* 2. VERIFIED ASSIGNMENTS */}
          <div
            id="oversight-verified-card"
            data-testid="oversight-verified-card"
            onClick={() => handleOpenModal('VERIFIED')}
            className="group relative rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-gradient-to-b from-emerald-50/70 to-emerald-100/40 dark:from-emerald-950/20 dark:to-emerald-900/10 p-3.5 transition-all duration-150 hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-800 cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-200/80 text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-200 border border-emerald-300/60 dark:border-emerald-700/60">
                  <ShieldCheck className="w-3 h-3" />
                  Verified
                </span>
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 group-hover:translate-x-0.5 transition-transform flex items-center">
                  Inspect <ChevronRight className="w-3 h-3 ml-0.5" />
                </span>
              </div>

              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl sm:text-4xl font-black font-mono text-emerald-800 dark:text-emerald-300 tracking-tight">
                  {verifiedCount}
                </span>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  Scripts
                </span>
              </div>

              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-1 line-clamp-2 leading-tight">
                Marks audited, verified, and locked by Study Centre Coordinator.
              </p>
            </div>

            <div className="mt-3 pt-2.5 border-t border-emerald-200/60 dark:border-emerald-900/40 flex items-center justify-between text-[10px] text-emerald-900 dark:text-emerald-300/80 font-medium">
              <span>{verifiedPercent}% Verification Rate</span>
              <span className="text-emerald-300 dark:text-emerald-700">•</span>
              <span>SED Compliant</span>
            </div>
          </div>

          {/* 3. REJECTED ASSIGNMENTS */}
          <div
            id="oversight-rejected-card"
            data-testid="oversight-rejected-card"
            onClick={() => handleOpenModal('REJECTED')}
            className="group relative rounded-xl border border-rose-200 dark:border-rose-900/60 bg-gradient-to-b from-rose-50/70 to-rose-100/40 dark:from-rose-950/20 dark:to-rose-900/10 p-3.5 transition-all duration-150 hover:shadow-md hover:border-rose-300 dark:hover:border-rose-800 cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-200/80 text-rose-900 dark:bg-rose-900/60 dark:text-rose-200 border border-rose-300/60 dark:border-rose-700/60">
                  <ShieldAlert className="w-3 h-3" />
                  Rejected
                </span>
                <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 group-hover:translate-x-0.5 transition-transform flex items-center">
                  Inspect Logs <ChevronRight className="w-3 h-3 ml-0.5" />
                </span>
              </div>

              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl sm:text-4xl font-black font-mono text-rose-800 dark:text-rose-300 tracking-tight">
                  {rejectedCount}
                </span>
                <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                  Attempt{rejectedCount === 1 ? '' : 's'}
                </span>
              </div>

              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-1 line-clamp-2 leading-tight">
                Statutory integrity rule rejections (Rule 1, 2, 3 or duplicate scripts blocked).
              </p>
            </div>

            <div className="mt-3 pt-2.5 border-t border-rose-200/60 dark:border-rose-900/40 flex items-center justify-between text-[10px] text-rose-900 dark:text-rose-300/80 font-medium">
              <span>{rejectedCount === 0 ? 'Zero Violations' : 'Integrity Preserved'}</span>
              <span className="text-rose-300 dark:text-rose-700">•</span>
              <span>Audit Logged</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detail / Inspection Modal */}
      {isDetailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3 bg-zinc-50 dark:bg-zinc-800/50">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-xl ${
                    activeModalTab === 'PENDING'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      : activeModalTab === 'VERIFIED'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                  }`}
                >
                  {activeModalTab === 'PENDING' && <Clock className="w-5 h-5" />}
                  {activeModalTab === 'VERIFIED' && <ShieldCheck className="w-5 h-5" />}
                  {activeModalTab === 'REJECTED' && <ShieldAlert className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-zinc-900 dark:text-zinc-100">
                    {activeModalTab === 'PENDING' && 'Pending Assignments Ledger'}
                    {activeModalTab === 'VERIFIED' && 'Verified & Locked Assignments'}
                    {activeModalTab === 'REJECTED' && 'Rejected Assignment Intake Logs'}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Cycle: <strong className="text-zinc-700 dark:text-zinc-200">{currentSession}</strong> • IGNOU SC-2033
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Sub-Tabs & Search Filter */}
            <div className="p-3 sm:p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl w-full sm:w-auto text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveModalTab('PENDING')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                    activeModalTab === 'PENDING'
                      ? 'bg-amber-500 text-white shadow-xs font-bold'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Pending ({pendingCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModalTab('VERIFIED')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                    activeModalTab === 'VERIFIED'
                      ? 'bg-emerald-600 text-white shadow-xs font-bold'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Verified ({verifiedCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModalTab('REJECTED')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                    activeModalTab === 'REJECTED'
                      ? 'bg-rose-600 text-white shadow-xs font-bold'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Rejected ({rejectedCount})</span>
                </button>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={modalSearchQuery}
                  onChange={(e) => setModalSearchQuery(e.target.value)}
                  placeholder="Filter student or course..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Modal Body / Tab Content */}
            <div className="flex-1 overflow-y-auto p-4 max-h-[60vh]">
              {/* TAB 1: PENDING ASSIGNMENTS */}
              {activeModalTab === 'PENDING' && (
                <div className="space-y-2.5">
                  {filteredPending.length === 0 ? (
                    <div className="text-center py-10 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
                      <Clock className="w-8 h-8 mx-auto text-zinc-400 mb-2" />
                      <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                        No pending assignments found
                      </p>
                      <p className="text-xs text-zinc-500">
                        All received scripts have either been verified or no scripts match your search.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                      {filteredPending.map((item) => (
                        <div
                          key={item.id}
                          className="p-3 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-850 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition text-xs"
                        >
                          <div className="flex items-start gap-3">
                            <span className="px-2 py-1 rounded-md font-mono font-bold text-[11px] bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800 shrink-0">
                              {item.courseCode}
                            </span>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-zinc-900 dark:text-zinc-100">
                                  {item.studentName}
                                </span>
                                <span className="font-mono text-zinc-500 dark:text-zinc-400 text-[11px]">
                                  ({item.enrollmentNo})
                                </span>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                                  {item.programmeCode}
                                </span>
                              </div>
                              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 flex items-center gap-2 flex-wrap">
                                <span>Token: <strong className="font-mono text-zinc-700 dark:text-zinc-300">{item.tokenNo}</strong></span>
                                <span>•</span>
                                <span>Date: {formatDate(item.submissionDate)}</span>
                                {item.evaluatorName && (
                                  <>
                                    <span>•</span>
                                    <span>Evaluator: <strong className="text-zinc-700 dark:text-zinc-300">{item.evaluatorName}</strong></span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                item.evaluatorId
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                  : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                              }`}
                            >
                              {item.status || (item.evaluatorId ? 'Allotted' : 'Pending Allotment')}
                            </span>
                            {item.marks !== null && item.marks !== undefined && (
                              <span className="font-mono font-bold text-amber-700 dark:text-amber-400">
                                Marks: {item.marks} (Unverified)
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: VERIFIED ASSIGNMENTS */}
              {activeModalTab === 'VERIFIED' && (
                <div className="space-y-2.5">
                  {filteredVerified.length === 0 ? (
                    <div className="text-center py-10 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
                      <ShieldCheck className="w-8 h-8 mx-auto text-zinc-400 mb-2" />
                      <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                        No verified assignments found
                      </p>
                      <p className="text-xs text-zinc-500">
                        Scripts must be evaluated and have marks locked by the Coordinator to be verified.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                      {filteredVerified.map((item) => (
                        <div
                          key={item.id}
                          className="p-3 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-850 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition text-xs"
                        >
                          <div className="flex items-start gap-3">
                            <span className="px-2 py-1 rounded-md font-mono font-bold text-[11px] bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 shrink-0">
                              {item.courseCode}
                            </span>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-zinc-900 dark:text-zinc-100">
                                  {item.studentName}
                                </span>
                                <span className="font-mono text-zinc-500 dark:text-zinc-400 text-[11px]">
                                  ({item.enrollmentNo})
                                </span>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                                  {item.programmeCode}
                                </span>
                              </div>
                              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 flex items-center gap-2 flex-wrap">
                                <span>Token: <strong className="font-mono text-zinc-700 dark:text-zinc-300">{item.tokenNo}</strong></span>
                                <span>•</span>
                                <span>Evaluator: {item.evaluatorName || item.evaluatorCode || 'Official Evaluator'}</span>
                                {item.lockedBy && (
                                  <>
                                    <span>•</span>
                                    <span>Locked by: <strong className="text-zinc-700 dark:text-zinc-300">{item.lockedBy}</strong></span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                            <div className="text-right">
                              <div className="font-mono font-black text-sm text-emerald-700 dark:text-emerald-400">
                                {item.marks} / 100
                              </div>
                              <div className="text-[10px] font-bold text-zinc-500">
                                Grade: {item.grade || '—'}
                              </div>
                            </div>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                              <ShieldCheck className="w-3 h-3" />
                              VERIFIED
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: REJECTED ASSIGNMENTS */}
              {activeModalTab === 'REJECTED' && (
                <div className="space-y-2.5">
                  {filteredRejected.length === 0 ? (
                    <div className="text-center py-10 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
                      <ShieldCheck className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                      <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                        Zero Statutory Rejections Recorded
                      </p>
                      <p className="text-xs text-zinc-500">
                        All intake attempts strictly met statutory validation constraints.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                      {filteredRejected.map((log) => (
                        <div
                          key={log.id}
                          className="p-3.5 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-850 flex flex-col gap-2 transition text-xs"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                <ShieldAlert className="w-3 h-3" />
                                INTAKE REJECTED
                              </span>
                              <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                                {log.targetIdentifier || 'Intake Validation'}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-zinc-400">
                              {formatDateTime(log.timestamp)}
                            </span>
                          </div>

                          <p className="text-xs text-rose-700 dark:text-rose-300 font-semibold bg-rose-50/80 dark:bg-rose-950/40 p-2 rounded-lg border border-rose-200/60 dark:border-rose-900/40">
                            {log.summary}
                          </p>

                          {log.details && (
                            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/60 p-2 rounded-lg font-mono text-[10px] flex items-center justify-between flex-wrap gap-2">
                              <span>Actor: <strong className="text-zinc-700 dark:text-zinc-300">{log.actor}</strong></span>
                              {log.details.rule && (
                                <span>Rule: <strong className="text-zinc-700 dark:text-zinc-300">{log.details.rule}</strong></span>
                              )}
                              {log.details.courses && (
                                <span>Attempted Courses: <strong className="text-zinc-700 dark:text-zinc-300">{Array.isArray(log.details.courses) ? log.details.courses.join(', ') : log.details.courses}</strong></span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 sm:p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 flex items-center justify-between text-xs">
              <span className="text-zinc-500 text-[11px]">
                Showing {activeModalTab === 'PENDING' ? filteredPending.length : activeModalTab === 'VERIFIED' ? filteredVerified.length : filteredRejected.length} entries
              </span>
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs transition cursor-pointer shadow-xs"
              >
                Close Oversight
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
