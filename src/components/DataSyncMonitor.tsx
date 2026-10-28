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
} from 'lucide-react';

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
  } = useApp();

  const [isRetryingAll, setIsRetryingAll] = useState(false);
  const [retryingItemId, setRetryingItemId] = useState<string | null>(null);

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
    </>
  );
};
