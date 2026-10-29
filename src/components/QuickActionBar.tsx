import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { TabType } from './Sidebar';
import {
  UserPlus,
  Search,
  Receipt,
  FileCheck2,
  Clock,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Calendar,
} from 'lucide-react';
import { formatDate } from '../utils/helpers';
import { IntakeRecord } from '../types';

interface QuickActionBarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export const QuickActionBar: React.FC<QuickActionBarProps> = ({
  activeTab,
  setActiveTab,
}) => {
  const {
    sessionIntakes,
    sessionCourseEvaluations,
    currentSession,
    openReceiptModal,
    openSearchModal,
    setIsSyncDrawerOpen,
    isSyncingSheets,
    syncStatus,
    isAdmin,
  } = useApp();

  // Compute Today's Date String
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Compute Intakes processed today
  const todayIntakesCount = useMemo(() => {
    return sessionIntakes.filter((i) => {
      const d = (i.submissionDate || i.createdAt || '').slice(0, 10);
      return d === todayStr;
    }).length;
  }, [sessionIntakes, todayStr]);

  // Compute Pending Evaluations in current cycle
  const pendingEvalsCount = useMemo(() => {
    return sessionCourseEvaluations.filter(
      (e) => !e.isLocked && (e.marks === null || e.marks === undefined)
    ).length;
  }, [sessionCourseEvaluations]);

  // Extract recent 4 intakes for the fast desk strip
  const recentIntakes = useMemo(() => {
    return [...sessionIntakes]
      .sort((a, b) => {
        const timeA = new Date(a.createdAt || a.submissionDate || 0).getTime();
        const timeB = new Date(b.createdAt || b.submissionDate || 0).getTime();
        return timeB - timeA;
      })
      .slice(0, 4);
  }, [sessionIntakes]);

  const handleNewIntakeClick = () => {
    setActiveTab('INTAKE_DESK');
    // Ensure focus shifts to student enrollment input if available
    setTimeout(() => {
      const input = document.getElementById('enrollmentNo') as HTMLInputElement | null;
      if (input) {
        input.focus();
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  return (
    <div
      id="counter-quick-action-bar"
      className="bg-white border-b border-slate-200/90 px-3 sm:px-6 py-2.5 shadow-2xs transition-colors"
    >
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5">
        {/* Left Actions: New Intake Button & Search Shortcut */}
        <div className="flex items-center flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={handleNewIntakeClick}
            id="quick-action-new-intake"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer ${
              activeTab === 'INTAKE_DESK'
                ? 'bg-indigo-900 text-white ring-2 ring-indigo-500/30'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
            title="Start new student intake submission registration"
          >
            <UserPlus className="w-3.5 h-3.5 shrink-0" />
            <span>+ New Intake</span>
          </button>

          <button
            type="button"
            onClick={() => openSearchModal()}
            id="quick-action-search"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 text-slate-700 text-xs font-semibold transition cursor-pointer shadow-2xs group"
            title="Search student by enrollment number, name, or course (Ctrl+K)"
          >
            <Search className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-600 shrink-0" />
            <span>Search Student</span>
            <kbd className="hidden sm:inline px-1.5 py-0.2 text-[10px] font-mono bg-white text-slate-500 rounded border border-slate-200">
              Ctrl+K
            </kbd>
          </button>

          {/* Quick Counter Metrics */}
          <div className="hidden xl:flex items-center gap-1.5 pl-2 border-l border-slate-200 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-medium">
              <Clock className="w-3 h-3 text-slate-500" />
              <span>Today:</span>
              <strong className="font-mono text-indigo-900">{todayIntakesCount}</strong>
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 font-medium border border-amber-200/60">
              <span>Pending Eval:</span>
              <strong className="font-mono">{pendingEvalsCount}</strong>
            </span>
          </div>
        </div>

        {/* Center / Right Section: Recent Counter Intakes Strip */}
        <div className="flex items-center justify-between lg:justify-end gap-2 min-w-0 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0 mr-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span className="hidden sm:inline">Recent Intakes:</span>
          </div>

          {recentIntakes.length === 0 ? (
            <span className="text-xs text-slate-400 italic px-2">No intakes yet in this session</span>
          ) : (
            <div className="flex items-center gap-1.5 min-w-0">
              {recentIntakes.map((intake) => {
                const coursesCount = (intake.courseCodes || []).length;
                return (
                  <button
                    key={intake.id || intake.tokenNo}
                    type="button"
                    onClick={() => openReceiptModal(intake)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200/80 bg-slate-50/70 hover:bg-indigo-50/80 hover:border-indigo-200 hover:text-indigo-950 text-slate-700 text-xs transition cursor-pointer shrink-0 shadow-2xs group"
                    title={`Click to view/print receipt for ${intake.studentName} (${intake.enrollmentNo})`}
                  >
                    <Receipt className="w-3 h-3 text-slate-400 group-hover:text-indigo-600 shrink-0" />
                    <span className="font-mono font-bold text-slate-900 text-[11px]">
                      {intake.tokenNo || intake.enrollmentNo}
                    </span>
                    <span className="font-medium text-slate-600 truncate max-w-[85px] sm:max-w-[110px]">
                      {intake.studentName}
                    </span>
                    <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-white border border-slate-200 text-slate-500">
                      {coursesCount} crs
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Google Sheets Sync Telemetry Launcher (Coordinator / Admin Only) */}
          {isAdmin && (
            <div className="pl-2 border-l border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => setIsSyncDrawerOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition cursor-pointer shadow-2xs"
                title="Open Google Sheets Telemetry & Cloud Sync Monitor"
              >
                <RefreshCw
                  className={`w-3 h-3 text-emerald-600 shrink-0 ${
                    isSyncingSheets ? 'animate-spin' : ''
                  }`}
                />
                <span className="hidden md:inline font-mono text-[11px]">Sync Monitor</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
