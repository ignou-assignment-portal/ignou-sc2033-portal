import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { AuditLogEntry } from '../types';
import {
  Activity,
  UserPlus,
  FileCheck2,
  Edit3,
  Lock,
  Unlock,
  UserCheck,
  Package,
  FileSpreadsheet,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Clock,
  X,
  History,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';

interface RecentActivityProps {
  onViewAllActivity?: () => void;
  compact?: boolean;
}

function getRelativeTime(timestamp: string): string {
  try {
    const diffMs = Date.now() - new Date(timestamp).getTime();
    if (isNaN(diffMs)) return '—';
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 45) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(timestamp).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
    });
  } catch {
    return '—';
  }
}

function getOperationMeta(entry: AuditLogEntry): {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  label: string;
} {
  const action: string = String(entry.action || '');
  const cat: string = String(entry.category || '');

  if (action === 'INTAKE_CREATED' || action === 'REGISTER_STUDENT' || action === 'ADD_REGISTRATION') {
    return {
      icon: UserPlus,
      iconBg: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
      iconColor: 'text-emerald-700',
      label: 'Student Intake / Reg',
    };
  }

  if (action === 'MARKS_UPDATED') {
    return {
      icon: Edit3,
      iconBg: 'bg-amber-50 text-amber-700 border border-amber-200/60',
      iconColor: 'text-amber-700',
      label: 'Marks Entry',
    };
  }

  if (action === 'MARKS_LOCKED') {
    return {
      icon: Lock,
      iconBg: 'bg-indigo-50 text-indigo-700 border border-indigo-200/60',
      iconColor: 'text-indigo-700',
      label: 'Marks Locked',
    };
  }

  if (action === 'MARKS_UNLOCKED') {
    return {
      icon: Unlock,
      iconBg: 'bg-orange-50 text-orange-700 border border-orange-200/60',
      iconColor: 'text-orange-700',
      label: 'Marks Unlocked',
    };
  }

  if (action === 'EVALUATOR_ALLOTTED') {
    return {
      icon: UserCheck,
      iconBg: 'bg-blue-50 text-blue-700 border border-blue-200/60',
      iconColor: 'text-blue-700',
      label: 'Evaluator Allotted',
    };
  }

  if (action === 'PACKET_CREATED' || action === 'PACKET_UPDATED') {
    return {
      icon: Package,
      iconBg: 'bg-sky-50 text-sky-700 border border-sky-200/60',
      iconColor: 'text-sky-700',
      label: 'Packet Dispatch',
    };
  }

  if (action === 'BILL_GENERATED' || action === 'BILL_SANCTIONED') {
    return {
      icon: FileSpreadsheet,
      iconBg: 'bg-purple-50 text-purple-700 border border-purple-200/60',
      iconColor: 'text-purple-700',
      label: 'Remuneration Bill',
    };
  }

  if (action === 'INTAKE_REJECTED') {
    return {
      icon: ShieldAlert,
      iconBg: 'bg-rose-50 text-rose-700 border border-rose-200/60',
      iconColor: 'text-rose-700',
      label: 'Intake Rejected',
    };
  }

  if (action === 'ROLE_SWITCH' || action === 'USER_LOGIN' || cat === 'AUTHENTICATION') {
    return {
      icon: ShieldCheck,
      iconBg: 'bg-slate-100 text-slate-700 border border-slate-200',
      iconColor: 'text-slate-700',
      label: 'Access & Role',
    };
  }

  // Fallback by category
  if (cat === 'ASSIGNMENT_INTAKE') {
    return {
      icon: FileCheck2,
      iconBg: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
      iconColor: 'text-emerald-700',
      label: 'Intake Desk',
    };
  }

  return {
    icon: History,
    iconBg: 'bg-zinc-100 text-zinc-700 border border-zinc-200',
    iconColor: 'text-zinc-700',
    label: action.replace(/_/g, ' ') || 'Operation',
  };
}

export const RecentActivity: React.FC<RecentActivityProps> = ({
  onViewAllActivity,
  compact = false,
}) => {
  const { auditLogs } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Take the last 5 operations
  const recentLogs = useMemo(() => {
    return (auditLogs || []).slice(0, 5);
  }, [auditLogs]);

  // Click outside to close
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleEscKey);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen]);

  const latestStatus = recentLogs[0]?.status || 'SUCCESS';

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {/* Trigger Button in Header */}
      <button
        id="recent-activity-header-btn"
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-200 transition shadow-2xs cursor-pointer select-none ${
          isOpen
            ? 'bg-indigo-50 border-indigo-300 text-indigo-950 ring-2 ring-indigo-200'
            : 'bg-slate-50 hover:bg-slate-100 text-slate-800 hover:text-slate-950'
        }`}
        title="View last 5 operations and live system audit status"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <div className="relative flex items-center justify-center">
          <Activity className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span
            className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${
              latestStatus === 'SUCCESS'
                ? 'bg-emerald-500 animate-pulse'
                : latestStatus === 'WARNING'
                ? 'bg-amber-500'
                : 'bg-rose-500'
            }`}
          />
        </div>

        <div className="text-left hidden lg:block leading-tight">
          <div className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">
            Activity
          </div>
          <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
            <span>Last 5 Ops</span>
          </div>
        </div>

        <span className="lg:hidden text-xs font-semibold text-slate-800">
          Activity
        </span>
      </button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Recent Operations Log"
          className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 text-slate-900"
        >
          {/* Header */}
          <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-600/40 border border-indigo-400/30 flex items-center justify-center">
                <Activity className="w-4 h-4 text-amber-300" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white tracking-tight leading-none">
                  Recent Activity
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Last 5 system audit operations
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-700/50">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded transition cursor-pointer"
                aria-label="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* List of 5 operations */}
          <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
            {recentLogs.length === 0 ? (
              <div className="py-8 px-4 text-center">
                <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">No operations recorded yet</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Intake registrations and marks entries will appear here in real time.
                </p>
              </div>
            ) : (
              recentLogs.map((entry, index) => {
                const meta = getOperationMeta(entry);
                const IconComponent = meta.icon;
                const relTime = getRelativeTime(entry.timestamp);

                return (
                  <div
                    key={entry.id || `recent-${index}`}
                    className="p-3 hover:bg-slate-50 transition flex items-start gap-3"
                  >
                    {/* Operation Icon */}
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${meta.iconBg}`}
                      title={meta.label}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-1">
                        <span className="text-[11px] font-bold text-slate-900 truncate">
                          {meta.label}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 shrink-0">
                          {relTime}
                        </span>
                      </div>

                      <p className="text-xs text-slate-700 line-clamp-2 mt-0.5 font-normal leading-snug">
                        {entry.summary}
                      </p>

                      <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                        {entry.targetIdentifier && (
                          <span className="font-mono font-medium text-indigo-700 bg-indigo-50/70 px-1.5 py-0.2 rounded border border-indigo-100">
                            {entry.targetIdentifier}
                          </span>
                        )}
                        <span className="truncate">By: {entry.actor || 'System'}</span>
                        <span className="text-slate-300">•</span>
                        <span className="font-mono text-slate-400">{entry.session}</span>
                      </div>
                    </div>

                    {/* Status Dot */}
                    <div className="shrink-0 pt-1" title={`Status: ${entry.status}`}>
                      {entry.status === 'SUCCESS' && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      )}
                      {entry.status === 'WARNING' && (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      )}
                      {entry.status === 'FAILED' && (
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer with shortcut to Full Audit Trail */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <span className="text-[10px] text-slate-500 font-medium">
              SC-2033 Audit Engine
            </span>

            {onViewAllActivity && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onViewAllActivity();
                }}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
              >
                <span>View Full Audit Trail</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
