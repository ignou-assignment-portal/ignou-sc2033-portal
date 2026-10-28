import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { AuditLogEntry, AuditActionType, AuditTargetCategory } from '../types';
import { formatDate, formatDateTime } from '../utils/helpers';
import {
  History as HistoryIcon,
  ShieldCheck,
  ShieldAlert,
  Search,
  Filter,
  Download,
  FileSpreadsheet,
  FileText,
  UserCheck,
  Lock,
  Unlock,
  Edit,
  Trash2,
  Calendar,
  Layers,
  ArrowUpDown,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  X,
  FileCheck2,
  ExternalLink,
  ChevronDown,
  Sparkles,
  Copy,
  Check,
} from 'lucide-react';

const CATEGORY_LABELS: Record<AuditTargetCategory, { label: string; color: string }> = {
  AUTHENTICATION: { label: 'Auth & Login', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  ASSIGNMENT_INTAKE: { label: 'Assignment Intake', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  MARKS_EVALUATION: { label: 'Marks & Evaluation', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  PACKETS_DISPATCH: { label: 'Packets & Dispatch', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  FINANCE_BILLS: { label: 'Remuneration & Bills', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  SYSTEM_SETTINGS: { label: 'System & Security', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  SESSION_MANAGEMENT: { label: 'Academic Cycle', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  SECURITY: { label: 'Security & Integrity', color: 'bg-rose-50 text-rose-800 border-rose-300' },
};

const ACTION_ICONS: Partial<Record<AuditActionType, React.ElementType>> = {
  USER_LOGIN: UserCheck,
  USER_LOGOUT: Lock,
  ROLE_SWITCH: ShieldCheck,
  PIN_CHANGED: Lock,
  INTAKE_CREATED: FileCheck2,
  INTAKE_UPDATED: Edit,
  INTAKE_DELETED: Trash2,
  INTAKE_REJECTED: ShieldAlert,
  INTAKE_DATE_CHANGED: Calendar,
  MARKS_UPDATED: Edit,
  MARKS_LOCKED: Lock,
  MARKS_UNLOCKED: Unlock,
  EVALUATOR_ALLOTTED: UserCheck,
  PACKET_CREATED: Layers,
  PACKET_UPDATED: Layers,
  BILL_GENERATED: FileSpreadsheet,
  BILL_SANCTIONED: ShieldCheck,
  SETTINGS_UPDATED: ShieldCheck,
  SESSION_ARCHIVED: HistoryIcon,
  SESSION_RESTORED: RefreshCw,
  SHEETS_SYNCED: RefreshCw,
};

export const AuditTrail: React.FC = () => {
  const {
    auditLogs,
    currentSession,
    isAdmin,
    userRole,
    clearAuditLogs,
    exportAuditLogsCSV,
    exportAuditLogsJSON,
    showToast,
    openSearchModal,
  } = useApp();

  // Guard: Forensic Audit Trail is strictly hidden & inaccessible to Desk officials
  if (!isAdmin || userRole === 'desk') {
    return (
      <div className="bg-white border border-rose-200 rounded-2xl p-8 sm:p-12 text-center max-w-lg mx-auto my-12 shadow-sm space-y-4 animate-in fade-in">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-2xs">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base sm:text-lg font-black text-zinc-900 tracking-tight">
            Institutional Audit Trail Restricted
          </h3>
          <p className="text-xs text-zinc-600 leading-relaxed max-w-md mx-auto">
            The <strong>Forensic Audit Trail</strong> is confidential and strictly hidden from Desk officials under IGNOU SC-2033 governance to preserve institutional accountability and tamper-resistance.
          </p>
        </div>
        <div className="pt-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-700 border border-zinc-200">
            <Lock className="w-3.5 h-3.5 text-zinc-500" />
            Requires Coordinator Authorization (PIN: 2033)
          </span>
        </div>
      </div>
    );
  }

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [sessionFilter, setSessionFilter] = useState<'CURRENT' | 'ALL'>('CURRENT');
  const [sortOrder, setSortOrder] = useState<'NEWEST' | 'OLDEST'>('NEWEST');
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Statistics
  const stats = useMemo(() => {
    const total = auditLogs.length;
    const logins = auditLogs.filter((l) => l.action === 'USER_LOGIN' || l.action === 'USER_LOGOUT').length;
    const modifications = auditLogs.filter(
      (l) =>
        l.action === 'INTAKE_UPDATED' ||
        l.action === 'INTAKE_DATE_CHANGED' ||
        l.action === 'MARKS_UPDATED' ||
        l.action === 'MARKS_LOCKED' ||
        l.action === 'INTAKE_DELETED'
    ).length;
    const adminActions = auditLogs.filter((l) => l.role === 'ADMIN').length;

    return { total, logins, modifications, adminActions };
  }, [auditLogs]);

  // Filtered entries
  const filteredLogs = useMemo(() => {
    let result = [...auditLogs];

    // Session filter
    if (sessionFilter === 'CURRENT') {
      result = result.filter(
        (log) => !log.session || log.session.toLowerCase() === currentSession.toLowerCase()
      );
    }

    // Category filter
    if (selectedCategory !== 'ALL') {
      result = result.filter((log) => log.category === selectedCategory);
    }

    // Role filter
    if (selectedRole !== 'ALL') {
      result = result.filter((log) => log.role === selectedRole);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((log) => {
        const textToMatch = [
          log.summary,
          log.actor,
          log.targetIdentifier,
          log.action,
          log.category,
          log.session,
          JSON.stringify(log.details || {}),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return textToMatch.includes(q);
      });
    }

    // Sort order
    result.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return sortOrder === 'NEWEST' ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [auditLogs, sessionFilter, currentSession, selectedCategory, selectedRole, searchQuery, sortOrder]);

  const handleCopyIdentifier = (idText: string) => {
    navigator.clipboard?.writeText(idText);
    setCopiedId(idText);
    showToast(`Copied identifier: ${idText}`, 'info');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearHistory = () => {
    if (!isAdmin) return;
    const confirmClear = window.confirm(
      'Are you sure you want to purge historical audit records? This action is strictly restricted to Centre Coordinators.'
    );
    if (confirmClear) {
      clearAuditLogs();
      showToast('Audit trail purged and archived cleanly.', 'info');
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* 1. Header & Authority Title Banner */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-950 text-white flex items-center justify-center font-bold shadow-xs">
                <HistoryIcon className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-zinc-900 leading-tight flex items-center gap-2">
                  <span>Institutional Audit Trail & Activity Log</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Accountability Oversight
                  </span>
                </h1>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Immutable tracking of staff logins, assignment intake edits, marks alterations, and statutory operations.
                </p>
              </div>
            </div>
          </div>

          {/* Action Export Buttons */}
          <div className="flex items-center flex-wrap gap-2">
            <button
              type="button"
              onClick={exportAuditLogsCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 hover:text-zinc-900 text-xs font-semibold transition shadow-2xs cursor-pointer"
              title="Download CSV report for statutory university audit"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export Audit CSV</span>
            </button>

            <button
              type="button"
              onClick={exportAuditLogsJSON}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 hover:text-zinc-900 text-xs font-semibold transition shadow-2xs cursor-pointer"
              title="Export complete forensic JSON log archive"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
              <span>Export JSON Log</span>
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={handleClearHistory}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition cursor-pointer"
                title="Purge logs (Coordinator privilege)"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span className="hidden sm:inline">Purge Logs</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. Key Forensic Overview Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5 pt-4 border-t border-zinc-100">
          <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl p-3">
            <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
              Total Logged Events
            </div>
            <div className="text-xl font-bold text-zinc-900 mt-1 flex items-center justify-between">
              <span>{stats.total}</span>
              <HistoryIcon className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="text-[11px] text-zinc-500 mt-0.5">
              Across system lifecycle
            </div>
          </div>

          <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl p-3">
            <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
              Terminal Logins Tracked
            </div>
            <div className="text-xl font-bold text-indigo-900 mt-1 flex items-center justify-between">
              <span>{stats.logins}</span>
              <UserCheck className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-[11px] text-zinc-500 mt-0.5">
              Staff & Coordinator sessions
            </div>
          </div>

          <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl p-3">
            <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
              Assignment Modifications
            </div>
            <div className="text-xl font-bold text-amber-900 mt-1 flex items-center justify-between">
              <span>{stats.modifications}</span>
              <Edit className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-[11px] text-zinc-500 mt-0.5">
              Dates, marks & student edits
            </div>
          </div>

          <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl p-3">
            <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
              Coordinator Actions
            </div>
            <div className="text-xl font-bold text-emerald-900 mt-1 flex items-center justify-between">
              <span>{stats.adminActions}</span>
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-[11px] text-zinc-500 mt-0.5">
              Privileged locks & sanctions
            </div>
          </div>
        </div>
      </div>

      {/* 3. Filter Bar & Controls */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Enrollment No, Student, Course Code, Staff Name, or Action..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs border border-zinc-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-zinc-50/50"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Session Scope Toggle */}
          <div className="flex items-center bg-zinc-100 p-1 rounded-xl border border-zinc-200 shrink-0">
            <button
              type="button"
              onClick={() => setSessionFilter('CURRENT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                sessionFilter === 'CURRENT'
                  ? 'bg-white text-indigo-900 shadow-2xs font-bold'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Current Cycle ({currentSession})
            </button>
            <button
              type="button"
              onClick={() => setSessionFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                sessionFilter === 'ALL'
                  ? 'bg-white text-indigo-900 shadow-2xs font-bold'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              All Academic Cycles
            </button>
          </div>
        </div>

        {/* Category Pills & Role Filters */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-100">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-zinc-400 font-semibold mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" />
              Category:
            </span>
            <button
              type="button"
              onClick={() => setSelectedCategory('ALL')}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                selectedCategory === 'ALL'
                  ? 'bg-zinc-900 text-white font-bold'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              All Events ({auditLogs.length})
            </button>
            {Object.entries(CATEGORY_LABELS).map(([catKey, catVal]) => {
              const count = auditLogs.filter((l) => l.category === catKey).length;
              return (
                <button
                  key={catKey}
                  type="button"
                  onClick={() => setSelectedCategory(catKey)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                    selectedCategory === catKey
                      ? 'bg-indigo-600 text-white font-bold shadow-2xs'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  {catVal.label} ({count})
                </button>
              );
            })}
          </div>

          {/* Right Filters: Actor Role & Sort */}
          <div className="flex items-center gap-2 text-xs">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-2.5 py-1.5 border border-zinc-300 rounded-lg bg-white text-zinc-700 font-medium cursor-pointer"
            >
              <option value="ALL">All Roles</option>
              <option value="ADMIN">Coordinator / Admin</option>
              <option value="OFFICIAL">Desk Official</option>
              <option value="SYSTEM">System Automations</option>
            </select>

            <button
              type="button"
              onClick={() => setSortOrder((prev) => (prev === 'NEWEST' ? 'OLDEST' : 'NEWEST'))}
              className="flex items-center gap-1 px-2.5 py-1.5 border border-zinc-300 rounded-lg bg-white text-zinc-700 font-medium hover:bg-zinc-50 cursor-pointer"
              title="Toggle sort chronological order"
            >
              <ArrowUpDown className="w-3 h-3 text-zinc-500" />
              <span>{sortOrder === 'NEWEST' ? 'Newest First' : 'Oldest First'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Audit Trail Table & Entries */}
      <div className="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs text-zinc-900">
              Audit Records
            </span>
            <span className="text-xs text-zinc-500">
              ({filteredLogs.length} matching {filteredLogs.length === 1 ? 'event' : 'events'})
            </span>
          </div>

          <div className="text-[11px] text-zinc-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Real-time local accountability ledger</span>
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 space-y-2">
            <HistoryIcon className="w-8 h-8 text-zinc-300 mx-auto" />
            <div className="font-bold text-sm text-zinc-800">No matching audit logs found</div>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Try adjusting your search query, switching from Current Cycle to All Cycles, or selecting another category.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-4 w-44">Date & Time</th>
                  <th className="py-2.5 px-3 w-36">Category</th>
                  <th className="py-2.5 px-3">Action & Summary</th>
                  <th className="py-2.5 px-3 w-48">Actor & Role</th>
                  <th className="py-2.5 px-3 w-32">Cycle</th>
                  <th className="py-2.5 px-4 text-right w-24">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredLogs.map((entry) => {
                  const Icon = ACTION_ICONS[entry.action] || HistoryIcon;
                  const catConfig = CATEGORY_LABELS[entry.category] || {
                    label: entry.category,
                    color: 'bg-zinc-100 text-zinc-700 border-zinc-200',
                  };

                  return (
                    <tr
                      key={entry.id}
                      className="hover:bg-zinc-50/80 transition group"
                    >
                      {/* Timestamp */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-mono text-zinc-900 font-semibold text-[11px]">
                          {formatDateTime(entry.timestamp)}
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          {formatDate(entry.timestamp)}
                        </div>
                      </td>

                      {/* Category Badge */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${catConfig.color}`}
                        >
                          <Icon className="w-3 h-3 shrink-0" />
                          <span>{catConfig.label}</span>
                        </span>
                      </td>

                      {/* Action & Summary */}
                      <td className="py-3 px-3">
                        <div className="text-zinc-900 font-medium leading-relaxed">
                          {entry.summary}
                        </div>

                        {entry.targetIdentifier && (
                          <div className="mt-1 flex items-center gap-1.5">
                            <span className="text-[10px] font-mono font-bold bg-zinc-100 text-zinc-700 px-1.5 py-0.5 rounded border border-zinc-200">
                              Target: {entry.targetIdentifier}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyIdentifier(entry.targetIdentifier!)}
                              className="text-zinc-400 hover:text-zinc-700 p-0.5 cursor-pointer"
                              title="Copy Target Identifier"
                            >
                              {copiedId === entry.targetIdentifier ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                            {/* If target looks like enrollment number, link to Student Search */}
                            {/^\d{9,10}$/.test(entry.targetIdentifier.trim()) && (
                              <button
                                type="button"
                                onClick={() => openSearchModal(entry.targetIdentifier)}
                                className="text-[10px] text-indigo-600 hover:underline flex items-center gap-0.5 ml-1 font-semibold cursor-pointer"
                              >
                                <span>Lookup Student</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Actor & Role */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-semibold text-zinc-900 text-xs">
                          {entry.actor}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              entry.role === 'ADMIN'
                                ? 'bg-indigo-600'
                                : entry.role === 'OFFICIAL'
                                ? 'bg-teal-600'
                                : 'bg-zinc-400'
                            }`}
                          />
                          <span className="text-[10px] text-zinc-500 font-medium">
                            {entry.role === 'ADMIN'
                              ? 'Coordinator / Admin'
                              : entry.role === 'OFFICIAL'
                              ? 'Desk Official'
                              : 'System Engine'}
                          </span>
                        </div>
                      </td>

                      {/* Session Cycle */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-mono text-xs text-zinc-700 font-semibold bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                          {entry.session || currentSession}
                        </span>
                      </td>

                      {/* Details Inspection Trigger */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedEntry(entry)}
                          className="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-900 bg-indigo-50/60 hover:bg-indigo-100 rounded-lg transition cursor-pointer flex items-center gap-1 ml-auto"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Inspection Modal for Forensic Details */}
      {selectedEntry && (
        <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-zinc-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-950 text-white flex items-center justify-center font-bold">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-zinc-900">
                    Audit Log Inspection & Verification
                  </h3>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    ID: {selectedEntry.id}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                className="text-zinc-400 hover:text-zinc-700 p-1 rounded-lg hover:bg-zinc-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Event Summary */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 font-medium">Action Type:</span>
                <span className="font-mono font-bold text-zinc-900">
                  {selectedEntry.action}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 font-medium">Timestamp:</span>
                <span className="font-mono text-zinc-900">
                  {new Date(selectedEntry.timestamp).toLocaleString('en-IN', {
                    dateStyle: 'full',
                    timeStyle: 'medium',
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 font-medium">Actor / Role:</span>
                <span className="font-semibold text-zinc-900">
                  {selectedEntry.actor} ({selectedEntry.role})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 font-medium">Academic Cycle:</span>
                <span className="font-mono font-bold text-indigo-700">
                  {selectedEntry.session}
                </span>
              </div>
              {selectedEntry.targetIdentifier && (
                <div className="flex items-center justify-between pt-1 border-t border-zinc-200">
                  <span className="text-zinc-500 font-medium">Target Identifier:</span>
                  <span className="font-mono font-bold text-zinc-900">
                    {selectedEntry.targetIdentifier}
                  </span>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1">
              <div className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider">
                Event Description
              </div>
              <div className="p-3 bg-white border border-zinc-200 rounded-xl text-xs text-zinc-800 leading-relaxed font-medium">
                {selectedEntry.summary}
              </div>
            </div>

            {/* Payload / Details JSON */}
            {selectedEntry.details && Object.keys(selectedEntry.details).length > 0 && (
              <div className="space-y-1">
                <div className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider">
                  Audit Payload & Parameter Diff
                </div>
                <pre className="p-3 bg-zinc-900 text-zinc-100 rounded-xl text-[11px] font-mono overflow-x-auto max-h-48 border border-zinc-800">
                  {JSON.stringify(selectedEntry.details, null, 2)}
                </pre>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
