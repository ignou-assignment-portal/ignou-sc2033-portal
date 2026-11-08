import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { SCRIPT_URL } from '../services/sheetsService';
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  WifiOff,
  Database,
  ArrowRight,
  Clock,
  Layers,
  Activity,
  Trash2,
  Play,
  RotateCcw,
  X,
  ExternalLink,
  ShieldCheck,
  FileSpreadsheet,
  UserCheck,
  KeyRound,
  Search,
  Code,
  Copy,
  Check,
  FileDown,
  ShieldAlert,
} from 'lucide-react';
import {
  verifyCourseLedgerIntakeConsistency,
  exportDiagnosticReportJSON,
} from '../utils/diagnosticConsistencyUtility';
import { DiagnosticConsistencyReport } from '../types';

export const DataSyncMonitor: React.FC = () => {
  const {
    connectionStatus,
    isSyncingSheets,
    isCheckingIntegrity,
    lastLatencyMs,
    lastSheetSync,
    pendingSyncQueue,
    integrityReport,
    checkDataIntegrity,
    retryPendingQueue,
    retrySingleQueueItem,
    removeQueueItem,
    clearAllQueueItems,
    syncGoogleSheets,
    purgeOldDemoDataAndSyncLive,
    isSyncDrawerOpen,
    setIsSyncDrawerOpen,
    toggleSyncDrawer,
    evaluatorSyncLogs,
    resyncAllEvaluatorsToSheets,
    clearEvaluatorSyncLogs,
    allIntakes,
    allCourseEvaluations,
    evaluators,
    packets,
    currentSession,
    showToast,
  } = useApp();

  const [isRetryingAll, setIsRetryingAll] = useState(false);
  const [retryingItemId, setRetryingItemId] = useState<string | null>(null);
  const [isResyncingEvaluators, setIsResyncingEvaluators] = useState(false);
  const [syncLogFilter, setSyncLogFilter] = useState('');
  const [consistencyReport, setConsistencyReport] = useState<DiagnosticConsistencyReport | null>(null);
  const [isAuditingConsistency, setIsAuditingConsistency] = useState(false);
  const [showAppsScriptModal, setShowAppsScriptModal] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSyncDrawerOpen) {
        setIsSyncDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSyncDrawerOpen, setIsSyncDrawerOpen]);

  // Run initial parity check when drawer opens if report not yet available
  useEffect(() => {
    if (isSyncDrawerOpen && !integrityReport && !isCheckingIntegrity) {
      checkDataIntegrity();
    }
  }, [isSyncDrawerOpen, integrityReport, isCheckingIntegrity, checkDataIntegrity]);

  const handleRetryAll = async () => {
    setIsRetryingAll(true);
    try {
      await retryPendingQueue(true);
    } finally {
      setIsRetryingAll(false);
    }
  };

  const handleRetrySingle = async (id: string) => {
    setRetryingItemId(id);
    try {
      await retrySingleQueueItem(id);
    } finally {
      setRetryingItemId(null);
    }
  };

  const handleResyncAllEvaluators = async () => {
    setIsResyncingEvaluators(true);
    try {
      await resyncAllEvaluatorsToSheets();
      runDiagnosticConsistencyAudit();
    } finally {
      setIsResyncingEvaluators(false);
    }
  };

  const runDiagnosticConsistencyAudit = () => {
    setIsAuditingConsistency(true);
    try {
      const rep = verifyCourseLedgerIntakeConsistency({
        intakes: allIntakes || [],
        courseEvaluations: allCourseEvaluations || [],
        evaluators: evaluators || [],
        packets: packets || [],
        targetSession: currentSession,
      });
      setConsistencyReport(rep);
      if (rep.evaluatorDiscrepanciesCount > 0) {
        showToast?.(`Detected ${rep.evaluatorDiscrepanciesCount} evaluator discrepancies between Intake & Course Ledger`, 'warning');
      } else {
        showToast?.('Intake vs Course Ledger consistency verified successfully', 'success');
      }
    } finally {
      setIsAuditingConsistency(false);
    }
  };

  useEffect(() => {
    if (isSyncDrawerOpen && !consistencyReport && !isAuditingConsistency) {
      runDiagnosticConsistencyAudit();
    }
  }, [isSyncDrawerOpen]);

  const handleDownloadReport = () => {
    if (!consistencyReport) return;
    exportDiagnosticReportJSON(consistencyReport);
  };

  const appsScriptCodeSnippet = `/**
 * IGNOU SC-2033 Course_Ledger Evaluator Allotment Patch
 * Paste into Google Sheets > Extensions > Apps Script (Code.gs)
 * Corrects Column 10 (Allotted_Evaluator) and Column 11 (Evaluator_Code) writeback
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(15000);
  try {
    var contents = e.postData.contents;
    var request = JSON.parse(contents);
    var action = request.action;
    var payload = request.payload;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (action === "ALLOT_EVALUATOR" || action === "BATCH_ALLOT_EVALUATOR" || action === "UPDATE_MARKS") {
      var ledger = ss.getSheetByName("Course_Ledger") || ss.getSheetByName("2_Course_Evaluation_Master");
      if (!ledger) return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Course_Ledger not found" }));
      
      var data = ledger.getDataRange().getValues();
      var headers = data[0];
      var colMap = {};
      for (var c = 0; c < headers.length; c++) {
        colMap[String(headers[c] || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "")] = c + 1;
      }
      
      var subIdCol = colMap["subid"] || colMap["assignmentid"] || 1;
      var enrCol = colMap["enrollmentno"] || colMap["enrollment"] || 3;
      var courseCol = colMap["coursecode"] || colMap["course"] || 8;
      var evalCol = colMap["allottedevaluator"] || colMap["evaluator"] || colMap["academiccounsellor"] || 10;
      var evalCodeCol = colMap["evaluatorcode"] || colMap["evalcode"] || 11;
      var marksCol = colMap["marks"] || 12;
      var gradeCol = colMap["grade"] || 13;
      var statusCol = colMap["status"] || 14;
      
      var items = (action === "BATCH_ALLOT_EVALUATOR" && Array.isArray(payload.assignments)) ? payload.assignments : [payload];
      var updated = 0;
      
      var cleanEnr = function(v) { return String(v || "").replace(/^['"]+/, "").replace(/\\s+/g, "").toUpperCase(); };
      var cleanCourse = function(v) { return String(v || "").replace(/\\s*[\\[\\(].*?[\\]\\)]/g, "").replace(/[^A-Za-z0-9]/g, "").toUpperCase(); };
      
      for (var p = 0; p < items.length; p++) {
        var it = items[p];
        var tSubId = String(it.subId || it.assignmentId || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
        var tEnr = cleanEnr(it.enrollmentNo);
        var tCourse = cleanCourse(it.courseCode);
        var evalName = it.evaluator || it.Allotted_Evaluator || it.evaluatorName || "";
        var evalCode = it.evaluatorCode || "";
        
        for (var r = 1; r < data.length; r++) {
          var rSubId = String(data[r][subIdCol - 1] || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
          var rEnr = cleanEnr(data[r][enrCol - 1]);
          var rCourse = cleanCourse(data[r][courseCol - 1]);
          
          if ((tSubId && rSubId === tSubId) || (tEnr && tCourse && rEnr === tEnr && rCourse === tCourse)) {
            if (action === "UPDATE_MARKS") {
              if (marksCol > 0) ledger.getRange(r + 1, marksCol).setValue(it.marks !== undefined ? it.marks : "");
              if (gradeCol > 0) ledger.getRange(r + 1, gradeCol).setValue(it.grade || "");
              if (statusCol > 0) ledger.getRange(r + 1, statusCol).setValue("Marks Locked");
            } else {
              if (evalCol > 0) ledger.getRange(r + 1, evalCol).setValue(evalName || "Allotted");
              if (evalCodeCol > 0 && evalCode) ledger.getRange(r + 1, evalCodeCol).setValue(evalCode);
              if (statusCol > 0) ledger.getRange(r + 1, statusCol).setValue(evalName && evalName !== "Unallotted" ? "Allotted" : "Pending Allotment");
            }
            updated++;
            break;
          }
        }
      }
      SpreadsheetApp.flush();
      return ContentService.createTextOutput(JSON.stringify({ status: "success", updated: updated }));
    }
  } finally {
    lock.releaseLock();
  }
}`;

  const handleCopyScript = () => {
    navigator.clipboard.writeText(appsScriptCodeSnippet);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  const filteredLogs = (evaluatorSyncLogs || []).filter((entry) => {
    if (!syncLogFilter.trim()) return true;
    const q = syncLogFilter.toLowerCase();
    return (
      (entry.assignmentId && entry.assignmentId.toLowerCase().includes(q)) ||
      (entry.subId && entry.subId.toLowerCase().includes(q)) ||
      (entry.enrollmentNo && entry.enrollmentNo.toLowerCase().includes(q)) ||
      (entry.courseCode && entry.courseCode.toLowerCase().includes(q)) ||
      (entry.evaluatorName && entry.evaluatorName.toLowerCase().includes(q)) ||
      (entry.evaluatorCode && entry.evaluatorCode.toLowerCase().includes(q)) ||
      (entry.source && entry.source.toLowerCase().includes(q)) ||
      (entry.action && entry.action.toLowerCase().includes(q))
    );
  });

  const getStatusDot = () => {
    if (connectionStatus === 'offline') {
      return <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />;
    }
    if (connectionStatus === 'syncing') {
      return <RefreshCw className="w-3 h-3 text-indigo-600 animate-spin" />;
    }
    if (connectionStatus === 'queued') {
      return <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />;
    }
    if (connectionStatus === 'error') {
      return <span className="w-2 h-2 rounded-full bg-rose-500" />;
    }
    return <span className="w-2 h-2 rounded-full bg-emerald-500" />;
  };

  const getStatusLabel = () => {
    if (connectionStatus === 'offline') return 'Offline';
    if (connectionStatus === 'syncing') return 'Syncing...';
    if (connectionStatus === 'queued') return `${pendingSyncQueue.length} Queued`;
    if (connectionStatus === 'error') return 'Sync Issue';
    return 'Connected';
  };

  return (
    <>
      {/* 1. Persistent Top Header Widget */}
      <button
        id="data-sync-monitor-widget"
        type="button"
        onClick={toggleSyncDrawer}
        className={`group relative flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs transition cursor-pointer select-none shadow-2xs ${
          connectionStatus === 'offline'
            ? 'bg-rose-50 border-rose-300 text-rose-900 hover:bg-rose-100'
            : connectionStatus === 'queued'
            ? 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
            : connectionStatus === 'error'
            ? 'bg-rose-50 border-rose-200 text-rose-900 hover:bg-rose-100'
            : 'bg-white border-zinc-300 text-zinc-800 hover:bg-zinc-50 hover:border-zinc-400'
        }`}
        title="Google Sheets Data Sync Monitor & Remote Parity (Click to expand)"
        aria-label="Open Data Sync Monitor"
      >
        <div className="flex items-center gap-1.5 font-medium">
          {getStatusDot()}
          <span className="font-semibold text-zinc-900 tracking-tight">{getStatusLabel()}</span>
        </div>

        {/* Latency and Sync metadata unboxed with zero-pill discipline */}
        <div className="hidden sm:flex items-center gap-1 text-[11px] text-zinc-500 font-mono tabular-nums">
          <span>·</span>
          {lastLatencyMs !== null && (
            <span className="text-emerald-700 font-semibold">{lastLatencyMs}ms</span>
          )}
          {lastLatencyMs !== null && <span>·</span>}
          <span className="truncate max-w-[110px] text-zinc-600">
            {lastSheetSync ? lastSheetSync.split(' ')[0] : 'Live'}
          </span>
        </div>

        {/* Pending count alert badge if any */}
        {pendingSyncQueue.length > 0 && (
          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold font-mono bg-amber-500 text-white shadow-2xs">
            {pendingSyncQueue.length}
          </span>
        )}
      </button>

      {/* 2. Expandable Slide-Out Detailed Drawer */}
      {isSyncDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-zinc-950/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsSyncDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Container */}
          <div className="fixed inset-y-0 right-0 max-w-xl w-full bg-white shadow-2xl flex flex-col border-l border-zinc-200 animate-in slide-in-from-right duration-250">
            {/* Drawer Header */}
            <div className="px-5 py-4 border-b border-zinc-200 bg-zinc-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-zinc-800 rounded-lg text-emerald-400 border border-zinc-700">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                    Google Sheets Data Sync Monitor
                    <span className="px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider bg-zinc-800 border border-zinc-700 text-zinc-300 rounded">
                      SC-2033
                    </span>
                  </h2>
                  <p className="text-xs text-zinc-400 font-normal">
                    Real-time connectivity, master parity audit, and IndexedDB offline queue
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsSyncDrawerOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition cursor-pointer"
                aria-label="Close Sync Drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 text-zinc-800">
              {/* Telemetry Overview Card */}
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                      Live Connection Telemetry
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {getStatusDot()}
                    <span className="text-xs font-semibold text-zinc-900">{getStatusLabel()}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 text-xs">
                  <div>
                    <div className="text-[11px] text-zinc-500">Roundtrip Latency</div>
                    <div className="font-mono tabular-nums font-bold text-zinc-900 text-sm mt-0.5">
                      {lastLatencyMs !== null ? `${lastLatencyMs} ms` : '—'}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] text-zinc-500">Offline Queue</div>
                    <div className="font-mono tabular-nums font-bold text-zinc-900 text-sm mt-0.5">
                      {pendingSyncQueue.length} item{pendingSyncQueue.length === 1 ? '' : 's'}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] text-zinc-500">Last Master Sync</div>
                    <div className="font-mono text-zinc-800 text-[11px] mt-0.5 truncate" title={lastSheetSync}>
                      {lastSheetSync || 'Not synced'}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] text-zinc-500">Engine Store</div>
                    <div className="font-mono text-zinc-800 text-[11px] mt-0.5">
                      IndexedDB
                    </div>
                  </div>
                </div>

                {/* Endpoint metadata */}
                <div className="mt-3 pt-3 border-t border-zinc-200/80 flex items-center justify-between text-[11px] text-zinc-500">
                  <span className="truncate max-w-[340px]" title={SCRIPT_URL}>
                    Endpoint: <span className="font-mono text-zinc-700">{SCRIPT_URL.substring(0, 48)}...</span>
                  </span>
                  <a
                    href={SCRIPT_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium ml-2 shrink-0"
                  >
                    <span>Script Web App</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Master Sheet Parity Matrix */}
              <div className="border border-zinc-200 rounded-xl overflow-hidden">
                <div className="bg-zinc-100/70 px-4 py-3 border-b border-zinc-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-700" />
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-800">
                      Master Sheet Data Parity Matrix
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => checkDataIntegrity()}
                    disabled={isCheckingIntegrity}
                    className="flex items-center gap-1 text-xs font-medium text-indigo-700 hover:text-indigo-900 disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCheckingIntegrity ? 'animate-spin' : ''}`} />
                    <span>{isCheckingIntegrity ? 'Auditing...' : 'Audit Now'}</span>
                  </button>
                </div>

                <div className="p-4 space-y-3">
                  <p className="text-xs text-zinc-600">
                    Live verification comparing local client state with the master Google Apps Script data store.
                  </p>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-200 text-zinc-500 text-[11px] uppercase tracking-wider font-semibold">
                          <th className="py-2 pr-3">Register / Table</th>
                          <th className="py-2 px-3 text-right">Local State</th>
                          <th className="py-2 px-3 text-right">Master Sheet</th>
                          <th className="py-2 px-3 text-right">Variance</th>
                          <th className="py-2 pl-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 font-mono">
                        {integrityReport?.entities?.map((entity) => (
                          <tr key={entity.key} className="hover:bg-zinc-50/50">
                            <td className="py-2.5 pr-3 font-sans font-medium text-zinc-900">
                              {entity.name}
                            </td>
                            <td className="py-2.5 px-3 text-right tabular-nums text-zinc-800">
                              {entity.localCount}
                            </td>
                            <td className="py-2.5 px-3 text-right tabular-nums text-zinc-800">
                              {entity.remoteCount}
                            </td>
                            <td className={`py-2.5 px-3 text-right tabular-nums font-semibold ${
                              entity.diff === 0 ? 'text-zinc-400' : 'text-amber-600'
                            }`}>
                              {entity.diff > 0 ? `+${entity.diff}` : entity.diff}
                            </td>
                            <td className="py-2.5 pl-3 text-right font-sans">
                              {entity.status === 'match' ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  In Sync
                                </span>
                              ) : entity.status === 'mismatch' ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                  Variance
                                </span>
                              ) : (
                                <span className="text-[11px] text-zinc-400">Pending</span>
                              )}
                            </td>
                          </tr>
                        )) || (
                          <tr>
                            <td colSpan={5} className="py-4 text-center text-zinc-500 font-sans">
                              {isCheckingIntegrity ? 'Auditing master sheet parity...' : 'Click "Audit Now" to verify parity.'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {integrityReport && (
                    <div className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
                      integrityReport.status === 'in_sync'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : integrityReport.status === 'discrepancy'
                        ? 'bg-amber-50 border-amber-200 text-amber-900'
                        : 'bg-zinc-100 border-zinc-200 text-zinc-800'
                    }`}>
                      {integrityReport.status === 'in_sync' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      )}
                      <span className="font-medium">{integrityReport.summary}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* CourseLedger vs Intake Register Consistency & Evaluator Discrepancy Diagnostic */}
              <div className="border border-zinc-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="bg-zinc-100/70 px-4 py-3 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-indigo-700" />
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-800">
                      Intake vs CourseLedger Consistency Diagnostic
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={runDiagnosticConsistencyAudit}
                      disabled={isAuditingConsistency}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 cursor-pointer shadow-2xs"
                      title="Run relational consistency audit between Intake Register and Course Ledger"
                    >
                      <RefreshCw className={`w-3 h-3 ${isAuditingConsistency ? 'animate-spin' : ''}`} />
                      <span>{isAuditingConsistency ? 'Auditing...' : 'Run Audit'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowAppsScriptModal(true)}
                      className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-zinc-200 hover:bg-zinc-300 text-zinc-800 rounded-lg transition cursor-pointer"
                      title="View & copy patched Google Apps Script code for Google Sheets"
                    >
                      <Code className="w-3.5 h-3.5" />
                      <span>Apps Script Patch</span>
                    </button>

                    {consistencyReport && (
                      <button
                        type="button"
                        onClick={handleDownloadReport}
                        className="p-1 text-zinc-500 hover:text-zinc-800 transition cursor-pointer"
                        title="Download Diagnostic Report as JSON"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    <div className="p-2.5 bg-zinc-50 rounded-lg border border-zinc-200">
                      <div className="text-[10px] uppercase font-semibold text-zinc-500">Intake Scripts</div>
                      <div className="text-base font-black font-mono text-zinc-900">
                        {consistencyReport?.expectedScriptsFromIntakes ?? '—'}
                      </div>
                    </div>
                    <div className="p-2.5 bg-zinc-50 rounded-lg border border-zinc-200">
                      <div className="text-[10px] uppercase font-semibold text-zinc-500">Ledger Records</div>
                      <div className="text-base font-black font-mono text-zinc-900">
                        {consistencyReport?.totalCourseLedgerScripts ?? '—'}
                      </div>
                    </div>
                    <div className={`p-2.5 rounded-lg border ${
                      (consistencyReport?.evaluatorDiscrepanciesCount || 0) > 0
                        ? 'bg-rose-50 border-rose-200 text-rose-900'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    }`}>
                      <div className="text-[10px] uppercase font-semibold">Evaluator Discrepancies</div>
                      <div className="text-base font-black font-mono">
                        {consistencyReport?.evaluatorDiscrepanciesCount ?? '0'}
                      </div>
                    </div>
                    <div className="p-2.5 bg-zinc-50 rounded-lg border border-zinc-200">
                      <div className="text-[10px] uppercase font-semibold text-zinc-500">Relational Parity</div>
                      <div className="text-base font-black font-mono text-indigo-700">
                        {consistencyReport
                          ? `${consistencyReport.expectedScriptsFromIntakes > 0 ? Math.round((consistencyReport.matchedScriptsCount / consistencyReport.expectedScriptsFromIntakes) * 100) : 100}%`
                          : '—'}
                      </div>
                    </div>
                  </div>

                  {/* Evaluator Discrepancy Highlight Alert */}
                  {consistencyReport && consistencyReport.evaluatorDiscrepanciesCount > 0 ? (
                    <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs space-y-2 text-amber-950">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 font-bold">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Evaluator Discrepancies Detected ({consistencyReport.evaluatorDiscrepanciesCount})</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleResyncAllEvaluators}
                          disabled={isResyncingEvaluators}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition disabled:opacity-50 cursor-pointer shadow-2xs"
                        >
                          <RefreshCw className={`w-3 h-3 ${isResyncingEvaluators ? 'animate-spin' : ''}`} />
                          <span>{isResyncingEvaluators ? 'Re-Syncing...' : 'Fix & Sync All to Sheets'}</span>
                        </button>
                      </div>
                      <p className="text-[11px] text-amber-800">
                        Evaluator allotments in Course Packets / Evaluation Master are not recorded or match Column 10 in Course_Ledger. Click above to synchronize all allotted academic counsellors.
                      </p>

                      {/* Discrepancy Table */}
                      <div className="max-h-48 overflow-y-auto rounded border border-amber-200 bg-white">
                        <table className="w-full text-left text-[11px]">
                          <thead className="bg-amber-100/60 text-amber-900 border-b border-amber-200 font-semibold sticky top-0">
                            <tr>
                              <th className="p-1.5">Candidate</th>
                              <th className="p-1.5">Course</th>
                              <th className="p-1.5">Expected Evaluator</th>
                              <th className="p-1.5">Course Ledger Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-amber-100">
                            {consistencyReport.discrepancies
                              .filter((d) => d.discrepancyType === 'EVALUATOR_DISCREPANCY')
                              .slice(0, 15)
                              .map((item, idx) => (
                                <tr key={idx} className="hover:bg-amber-50/50">
                                  <td className="p-1.5 font-mono">
                                    <div className="font-bold text-zinc-900">{item.enrollmentNo}</div>
                                    <div className="text-[10px] text-zinc-500 truncate max-w-[120px]">{item.candidateName}</div>
                                  </td>
                                  <td className="p-1.5 font-mono font-bold text-indigo-700">{item.courseCode}</td>
                                  <td className="p-1.5 text-zinc-900 font-medium">{item.expectedEvaluator || 'Unallotted'}</td>
                                  <td className="p-1.5 text-rose-700 font-medium">{item.courseLedgerEvaluator || 'Blank / Missing'}</td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : consistencyReport ? (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs flex items-center gap-2 text-emerald-900">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-medium">
                        Complete Evaluator Parity: All {consistencyReport.matchedScriptsCount} scripts in Course Ledger have synchronized evaluator allotments.
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* IndexedDB Pending Outgoing Queue */}
              <div className="border border-zinc-200 rounded-xl overflow-hidden">
                <div className="bg-zinc-100/70 px-4 py-3 border-b border-zinc-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-800">
                      Pending Outgoing Queue ({pendingSyncQueue.length})
                    </span>
                  </div>

                  {pendingSyncQueue.length > 0 && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleRetryAll}
                        disabled={isRetryingAll}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 cursor-pointer shadow-2xs"
                      >
                        <Play className={`w-3 h-3 ${isRetryingAll ? 'animate-spin' : ''}`} />
                        <span>{isRetryingAll ? 'Retrying...' : 'Retry All'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={clearAllQueueItems}
                        className="p-1 text-zinc-400 hover:text-rose-600 transition cursor-pointer"
                        title="Clear entire pending queue"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="p-4">
                  {pendingSyncQueue.length === 0 ? (
                    <div className="py-6 text-center text-zinc-500 space-y-1.5">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                      <div className="text-xs font-semibold text-zinc-800">All Changes Synchronized</div>
                      <p className="text-[11px] text-zinc-500 max-w-sm mx-auto">
                        No pending mutations in IndexedDB. Any offline changes or network retries will appear here automatically with exponential backoff.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {pendingSyncQueue.map((item) => (
                        <div
                          key={item.id}
                          className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg text-xs space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${
                                  item.type === 'ADD_INTAKE'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : item.type === 'EDIT_INTAKE'
                                    ? 'bg-blue-100 text-blue-800'
                                    : item.type === 'DELETE_INTAKE'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-purple-100 text-purple-800'
                                }`}>
                                  {item.type}
                                </span>
                                <span className="font-semibold text-zinc-900">{item.summary}</span>
                              </div>
                              <div className="text-[11px] text-zinc-500 font-mono mt-1 flex items-center gap-2">
                                <span>Created: {new Date(item.createdAt).toLocaleTimeString()}</span>
                                <span>·</span>
                                <span>Attempts: {item.attempts}/5</span>
                                {item.status === 'retrying' && (
                                  <span className="text-indigo-600 font-semibold">Retrying...</span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleRetrySingle(item.id)}
                                disabled={retryingItemId === item.id}
                                className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition cursor-pointer"
                                title="Retry mutation now"
                              >
                                <RotateCcw className={`w-3.5 h-3.5 ${retryingItemId === item.id ? 'animate-spin' : ''}`} />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeQueueItem(item.id)}
                                className="p-1.5 text-zinc-400 hover:text-rose-600 rounded transition cursor-pointer"
                                title="Discard mutation"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {item.lastError && (
                            <div className="text-[11px] text-rose-600 font-mono bg-rose-50 px-2 py-1 rounded border border-rose-200">
                              Error: {item.lastError}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Evaluator & Canonical Key Sync Flow Audit */}
              <div className="border border-zinc-200 rounded-xl overflow-hidden">
                <div className="bg-zinc-100/70 px-4 py-3 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-indigo-700" />
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-800">
                      Evaluator & Key Sync Audit ({evaluatorSyncLogs.length})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleResyncAllEvaluators}
                      disabled={isResyncingEvaluators}
                      className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 cursor-pointer shadow-2xs"
                      title="Bulk push all currently allotted evaluators from local Course Ledger to Google Sheets"
                    >
                      <RefreshCw className={`w-3 h-3 ${isResyncingEvaluators ? 'animate-spin' : ''}`} />
                      <span>{isResyncingEvaluators ? 'Re-Syncing...' : 'Re-Sync All to Sheet'}</span>
                    </button>

                    {evaluatorSyncLogs.length > 0 && (
                      <button
                        type="button"
                        onClick={clearEvaluatorSyncLogs}
                        className="p-1 text-zinc-400 hover:text-rose-600 transition cursor-pointer"
                        title="Clear sync audit logs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-zinc-600">
                      Live audit tracking bidirectional evaluator allotments, canonical key resolution, and Google Sheets writebacks.
                    </p>
                  </div>

                  {/* Filter box if entries exist */}
                  {evaluatorSyncLogs.length > 0 && (
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={syncLogFilter}
                        onChange={(e) => setSyncLogFilter(e.target.value)}
                        placeholder="Filter by Student, Course, Evaluator or Key..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-hidden focus:border-indigo-500 focus:bg-white transition"
                      />
                    </div>
                  )}

                  {evaluatorSyncLogs.length === 0 ? (
                    <div className="py-6 text-center text-zinc-500 space-y-1.5">
                      <UserCheck className="w-8 h-8 text-zinc-300 mx-auto" />
                      <div className="text-xs font-semibold text-zinc-700">No Evaluator Sync Events Yet</div>
                      <p className="text-[11px] text-zinc-500 max-w-sm mx-auto">
                        Evaluator allotments from Course Packets or Evaluation Master will be tracked here in real-time with full key resolution and writeback status.
                      </p>
                    </div>
                  ) : filteredLogs.length === 0 ? (
                    <div className="py-4 text-center text-zinc-400 text-xs">
                      No events matching &ldquo;{syncLogFilter}&rdquo;
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {filteredLogs.slice(0, 50).map((log) => (
                        <div
                          key={log.id}
                          className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs space-y-1.5 hover:border-zinc-300 transition"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${
                                  log.action === 'ALLOT'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : log.action === 'UNALLOT'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-indigo-100 text-indigo-800'
                                }`}
                              >
                                {log.action}
                              </span>
                              <span className="text-[11px] font-medium text-zinc-600 bg-white px-1.5 py-0.5 rounded border border-zinc-200">
                                {log.source}
                              </span>
                              <span className="font-semibold text-zinc-900">
                                {log.evaluatorName || 'Unallotted'}
                              </span>
                            </div>

                            <span
                              className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded shrink-0 ${
                                log.status === 'SUCCESS'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : log.status === 'ERROR' || log.status === 'FAILED'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-blue-50 text-blue-700 border border-blue-200'
                              }`}
                            >
                              {log.status}
                            </span>
                          </div>

                          <div className="text-[11px] text-zinc-600 font-mono grid grid-cols-1 sm:grid-cols-2 gap-1 pt-0.5">
                            <div className="truncate flex items-center gap-1" title={log.assignmentId}>
                              <KeyRound className="w-3 h-3 text-zinc-400 shrink-0" />
                              <span className="text-zinc-500">Key:</span>
                              <span className="font-semibold text-zinc-800">{log.assignmentId}</span>
                            </div>
                            <div className="truncate text-zinc-500">
                              {log.enrollmentNo && log.courseCode ? (
                                <span>
                                  Enr: <strong className="text-zinc-800">{log.enrollmentNo}</strong> ·{' '}
                                  <strong className="text-indigo-700">{log.courseCode}</strong>
                                </span>
                              ) : (
                                <span>Time: {new Date(log.timestamp).toLocaleTimeString()}</span>
                              )}
                            </div>
                          </div>

                          {log.details && (
                            <div className="text-[11px] text-zinc-500 pt-1 border-t border-zinc-200/60">
                              {log.details}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Drawer Action Toolbar */}
            <div className="px-5 py-3.5 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between gap-3">
              <div className="text-[11px] text-zinc-500 font-mono">
                Auto-retry exponential backoff: <span className="font-semibold text-zinc-700">1s–60s</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => purgeOldDemoDataAndSyncLive()}
                  disabled={isSyncingSheets}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition cursor-pointer disabled:opacity-50 shadow-2xs"
                  title="Purge legacy demo data and force fresh sync strictly from connected Google Sheet"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Demo & Sync Live</span>
                </button>
                <button
                  type="button"
                  onClick={() => syncGoogleSheets(false)}
                  disabled={isSyncingSheets}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition cursor-pointer disabled:opacity-50 shadow-2xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSheets ? 'animate-spin' : ''}`} />
                  <span>{isSyncingSheets ? 'Pulling Data...' : 'Pull Latest Data'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsSyncDrawerOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-100 transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Patched Apps Script Code Modal */}
      {showAppsScriptModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-zinc-200 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-200 bg-zinc-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Code className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Google Apps Script Evaluator Allotment Patch</h3>
                  <p className="text-[11px] text-zinc-400">Maps Allotted_Evaluator directly to Column 10 in Course_Ledger</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAppsScriptModal(false)}
                className="p-1 text-zinc-400 hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-amber-950">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                  Why is this patch needed for Google Sheets?
                </p>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Your Google Sheet has 17 columns with <strong>Column 9 as Component_Type</strong> and <strong>Column 10 as Allotted_Evaluator</strong>. The legacy script previously wrote to column 9, leaving Column 10 unpopulated. Copy this corrected handler into your spreadsheet&apos;s Apps Script editor.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-700">Google Apps Script (Code.gs):</span>
                  <button
                    type="button"
                    onClick={handleCopyScript}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition shadow-2xs cursor-pointer"
                  >
                    {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedScript ? 'Copied to Clipboard!' : 'Copy Code'}</span>
                  </button>
                </div>

                <pre className="p-3 bg-zinc-900 text-emerald-400 rounded-lg text-[11px] font-mono overflow-x-auto max-h-72 border border-zinc-800">
                  {appsScriptCodeSnippet}
                </pre>
              </div>

              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg text-xs space-y-1.5 text-zinc-700">
                <p className="font-bold text-zinc-900">How to deploy in 30 seconds:</p>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-zinc-600">
                  <li>Open your Google Sheet &gt; <strong>Extensions &gt; Apps Script</strong>.</li>
                  <li>Paste this function into your <code className="bg-zinc-200 px-1 rounded">Code.gs</code> file.</li>
                  <li>Click <strong>Deploy &gt; Manage deployments &gt; Edit &gt; New version &gt; Deploy</strong>.</li>
                </ol>
              </div>
            </div>

            <div className="px-5 py-3 bg-zinc-50 border-t border-zinc-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAppsScriptModal(false)}
                className="px-4 py-1.5 text-xs font-medium text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-100 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
