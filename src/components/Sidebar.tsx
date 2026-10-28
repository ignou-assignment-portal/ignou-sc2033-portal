import React from 'react';
import { useApp } from '../context/AppContext';
import {
  UserPlus,
  TableProperties,
  Award,
  Layers,
  Users,
  Receipt,
  Settings,
  Lock,
  FileCheck2,
  BookOpenCheck,
  ChevronsLeft,
  ChevronsRight,
  X,
  Search,
  Home,
  History as HistoryIcon,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import { InstitutionalSeal } from './InstitutionalSeal';

export type TabType =
  | 'INTAKE_DESK'
  | 'SUBMISSIONS_TRACKER'
  | 'INTAKE_REGISTER'
  | 'EVALUATION_MASTER'
  | 'SED_AWARD_SHEETS'
  | 'MARKS_ENTRY'
  | 'COURSE_LEDGER'
  | 'EVALUATORS'
  | 'REMUNERATION'
  | 'INTEGRITY_AUDIT'
  | 'AUDIT_TRAIL'
  | 'SETTINGS';

export interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onViewHome?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onViewHome,
}) => {
  const {
    isAdmin,
    isUrlLockedDeskMode,
    userRole,
    openSearchModal,
    sessionIntakes,
    sessionAssignmentSubmissions,
    sessionCourseEvaluations,
    sessionPackets,
    evaluators,
    settings,
    isSidebarHidden,
    setIsSidebarHidden,
    isSidebarCollapsed,
    toggleSidebarCollapsed,
    syncGoogleSheets,
    isSyncingSheets,
    syncStatus,
  } = useApp();

  // Guard against navigating to unauthorized tabs in Desk Official mode (Allow only Stages 1 & 2)
  React.useEffect(() => {
    if (!isAdmin || userRole === 'desk' || isUrlLockedDeskMode) {
      if (activeTab !== 'INTAKE_DESK' && activeTab !== 'EVALUATION_MASTER') {
        setActiveTab('INTAKE_DESK');
      }
    }
  }, [userRole, isUrlLockedDeskMode, isAdmin, activeTab, setActiveTab]);

  // Dynamic calculations for stage counters
  const intakeCount = sessionIntakes.length;
  const evalCount = sessionCourseEvaluations.length;
  const lockedEvalCount = sessionCourseEvaluations.filter((e) => e.isLocked).length;
  const gradedEvalCount = sessionCourseEvaluations.filter(
    (e) => typeof e.marks === 'number'
  ).length;
  const subCount = sessionAssignmentSubmissions.length;
  const packetCount = sessionPackets.length;
  const evalDirectoryCount = evaluators.length;

  // 4 Core Statutory Examination Stages
  const statutoryStages = [
    {
      id: 'INTAKE_DESK' as TabType,
      stepNumber: 1,
      stageTag: 'Stage 1',
      label: 'Student Intake & Desk',
      sublabel: 'Physical receipts & token log',
      icon: UserPlus,
      badge: intakeCount > 0 ? `${intakeCount}` : 'Ready',
      badgeColor: 'bg-indigo-50 text-indigo-900 border-indigo-200',
    },
    {
      id: 'EVALUATION_MASTER' as TabType,
      stepNumber: 2,
      stageTag: 'Stage 2',
      label: 'Evaluation Master',
      sublabel: 'Faculty allotment & grading',
      icon: BookOpenCheck,
      badge: evalCount > 0 ? `${evalCount}` : null,
      badgeColor: 'bg-amber-50 text-amber-900 border-amber-200',
    },
    {
      id: 'SED_AWARD_SHEETS' as TabType,
      stepNumber: 3,
      stageTag: 'Stage 3',
      label: 'SED Award Sheets',
      sublabel: '3-Part regional gazette sheets',
      icon: Award,
      badge: lockedEvalCount > 0 ? `${lockedEvalCount} Locked` : '3-Part',
      badgeColor: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    },
    {
      id: 'REMUNERATION' as TabType,
      stepNumber: 4,
      stageTag: 'Stage 4',
      label: 'Remuneration & Claims',
      sublabel: 'Billing & bank dispatches',
      icon: Receipt,
      adminOnly: false,
      badge: isAdmin ? `₹${settings.remunerationRatePerScript.toFixed(2)}` : 'PIN Req.',
      badgeColor: isAdmin
        ? 'bg-purple-50 text-purple-900 border-purple-200'
        : 'bg-amber-50 text-amber-900 border-amber-200',
    },
  ];

  // Secondary Operational Registers (Accessible to Desk & Coordinator)
  const secondaryRegisters = [
    {
      id: 'SUBMISSIONS_TRACKER' as TabType,
      label: 'Submissions Tracker',
      icon: FileCheck2,
      badge: subCount > 0 ? `${subCount}` : null,
      badgeColor: 'bg-slate-100 text-slate-800 border-slate-200',
    },
    {
      id: 'INTAKE_REGISTER' as TabType,
      label: 'Intake Master Register',
      icon: TableProperties,
      badge: intakeCount > 0 ? `${intakeCount}` : null,
      badgeColor: 'bg-slate-100 text-slate-800 border-slate-200',
    },
    {
      id: 'MARKS_ENTRY' as TabType,
      label: 'Marks & Awards View',
      icon: Award,
      badge: gradedEvalCount > 0 ? `${gradedEvalCount}` : null,
      badgeColor: 'bg-blue-50 text-blue-900 border-blue-200',
    },
    {
      id: 'COURSE_LEDGER' as TabType,
      label: 'Course Packets & Ledger',
      icon: Layers,
      badge: packetCount > 0 ? `${packetCount}` : null,
      badgeColor: 'bg-slate-100 text-slate-800 border-slate-200',
    },
    {
      id: 'EVALUATORS' as TabType,
      label: 'Evaluator Directory',
      icon: Users,
      badge: evalDirectoryCount > 0 ? `${evalDirectoryCount}` : null,
      badgeColor: 'bg-slate-100 text-slate-800 border-slate-200',
    },
  ];

  // Administration & Audit Sections (Strictly Protected for Coordinator / Admin)
  const adminSections = [
    {
      id: 'INTEGRITY_AUDIT' as TabType,
      label: 'Integrity Audit',
      icon: ShieldCheck,
      adminOnly: true,
      badge: 'Audit',
      badgeColor: 'bg-indigo-50 text-indigo-900 border-indigo-200',
    },
    {
      id: 'AUDIT_TRAIL' as TabType,
      label: 'Forensic Audit Trail',
      icon: HistoryIcon,
      adminOnly: true,
      badge: 'Admin Only',
      badgeColor: 'bg-indigo-50 text-indigo-900 border-indigo-200',
    },
    {
      id: 'SETTINGS' as TabType,
      label: 'Centre Configuration',
      icon: Settings,
      adminOnly: true,
      badge: 'Admin',
      badgeColor: 'bg-indigo-50 text-indigo-900 border-indigo-200',
    },
  ];

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {!isSidebarHidden && (
        <div
          onClick={() => setIsSidebarHidden(true)}
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-40 md:hidden transition-opacity duration-300 cursor-pointer pointer-events-auto"
          aria-hidden="true"
        />
      )}

      {/* Main Collapsible & Hideable Sidebar Container */}
      <aside
        id="app-left-sidebar"
        className={`fixed md:sticky top-0 md:top-[73px] h-screen md:h-[calc(100vh-73px)] z-50 md:z-20 bg-white border-r border-slate-200 flex flex-col shrink-0 shadow-2xs transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? 'w-[72px]' : 'w-[260px]'
        } ${
          isSidebarHidden
            ? '-translate-x-full pointer-events-none md:-translate-x-0 md:-ml-[260px] md:opacity-0 md:pointer-events-none'
            : 'translate-x-0 pointer-events-auto md:ml-0 md:opacity-100'
        }`}
      >
        {/* Sidebar Header Toolbar */}
        <div className="p-3 border-b border-slate-200 flex items-center justify-between gap-2 bg-slate-50/80">
          {!isSidebarCollapsed ? (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <InstitutionalSeal size="sm" className="shrink-0" />
              <div className="truncate">
                <div className="text-xs font-black text-slate-900 tracking-tight truncate">
                  EXAMINATION MENU
                </div>
                <div className="text-[10px] text-slate-500 truncate font-mono">
                  Study Centre SC-2033
                </div>
              </div>
            </div>
          ) : (
            <div className="mx-auto flex items-center justify-center py-0.5">
              <InstitutionalSeal size="sm" />
            </div>
          )}

          {/* Action Buttons: Collapse toggle on desktop & Close button on mobile */}
          <div className="flex items-center gap-1">
            <button
              id="sidebar-collapse-btn"
              type="button"
              onClick={toggleSidebarCollapsed}
              className="hidden md:flex p-1.5 rounded-lg text-slate-500 hover:text-slate-950 hover:bg-slate-200/70 transition cursor-pointer"
              title={isSidebarCollapsed ? 'Expand Menu (260px)' : 'Shrink to Icon-Only Rail (72px)'}
              aria-label="Collapse or Expand Sidebar"
            >
              {isSidebarCollapsed ? (
                <ChevronsRight className="w-4 h-4 text-indigo-700" />
              ) : (
                <ChevronsLeft className="w-4 h-4 text-slate-600" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsSidebarHidden(true)}
              className="md:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-950 hover:bg-slate-200 transition cursor-pointer"
              title="Close Drawer"
            >
              <X className="w-4 h-4 text-slate-700" />
            </button>
          </div>
        </div>

        {/* Scrollable Navigation Items */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-2.5 space-y-4 divide-y divide-slate-100">
          {/* Public Study Centre Home Shortcut */}
          {onViewHome && (
            <div className="pb-1">
              <button
                type="button"
                onClick={onViewHome}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-indigo-950 hover:bg-slate-100 border border-slate-200 transition cursor-pointer shadow-2xs group"
                title="View Study Centre Public Home Page"
              >
                <Home className="w-4 h-4 text-indigo-700 group-hover:scale-110 transition shrink-0" />
                {!isSidebarCollapsed && (
                  <div className="text-left flex-1 truncate">
                    <span className="truncate block font-semibold">Study Centre Home</span>
                    <span className="text-[10px] text-slate-400 font-normal block truncate">
                      Public Portal Landing
                    </span>
                  </div>
                )}
              </button>
            </div>
          )}

          {/* SECTION 1: GUIDED 4-STAGE STATUTORY EXAMINATION PIPELINE */}
          <div className="pt-2">
            {!isSidebarCollapsed && (
              <div className="px-2 pb-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Examination Pipeline</span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                  4 Stages
                </span>
              </div>
            )}

            <div className="relative space-y-1">
              {/* Vertical Progress Line Connector behind step indicators */}
              {!isSidebarCollapsed && (
                <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-slate-200/80 -z-0" />
              )}

              {statutoryStages
                .filter((stage) => {
                  if (!isAdmin || userRole === 'desk' || isUrlLockedDeskMode) {
                    return stage.id === 'INTAKE_DESK' || stage.id === 'EVALUATION_MASTER';
                  }
                  return true;
                })
                .map((stage) => {
                  const Icon = stage.icon;
                  const isActive = activeTab === stage.id;
                  const isRestricted = stage.adminOnly && !isAdmin;

                  return (
                    <button
                      key={stage.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(stage.id);
                        if (window.innerWidth < 768) {
                          setIsSidebarHidden(true);
                        }
                      }}
                      className={`group w-full flex items-center rounded-xl transition-all cursor-pointer relative z-10 ${
                        isSidebarCollapsed
                          ? 'justify-center p-3'
                          : 'px-2.5 py-2 justify-between'
                      } ${
                        isActive
                          ? 'bg-indigo-950 text-white shadow-xs font-bold ring-1 ring-indigo-900'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950 font-medium'
                      }`}
                      title={stage.label}
                    >
                      {/* Active Indicator Bar */}
                      {isActive && !isSidebarCollapsed && (
                        <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-amber-400" />
                      )}

                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Step Circle Badge */}
                        {!isSidebarCollapsed ? (
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 transition-colors ${
                              isActive
                                ? 'bg-amber-400 text-indigo-950 ring-2 ring-indigo-800'
                                : 'bg-slate-100 text-slate-600 border border-slate-300 group-hover:border-indigo-400 group-hover:text-indigo-900 group-hover:bg-white'
                            }`}
                          >
                            {stage.stepNumber}
                          </div>
                        ) : (
                          <Icon
                            className={`w-4 h-4 shrink-0 transition-colors ${
                              isActive
                                ? 'text-amber-300'
                                : 'text-slate-500 group-hover:text-indigo-600'
                            }`}
                          />
                        )}

                        {!isSidebarCollapsed && (
                          <div className="text-left truncate">
                            <div className="text-xs truncate font-bold leading-tight flex items-center gap-1.5">
                              <span>{stage.label}</span>
                              <span
                                className={`text-[9px] uppercase font-bold tracking-wider leading-none px-1 py-0.2 rounded ${
                                  isActive
                                    ? 'bg-indigo-800 text-indigo-100'
                                    : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {stage.stageTag}
                              </span>
                            </div>
                            <div
                              className={`text-[10px] truncate leading-tight mt-0.5 ${
                                isActive ? 'text-indigo-200' : 'text-slate-400'
                              }`}
                            >
                              {stage.sublabel}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Dynamic Badge Counter */}
                      {!isSidebarCollapsed && (
                        <div className="flex items-center gap-1 shrink-0 ml-1">
                          {isRestricted ? (
                            <span className="flex items-center text-[10px] bg-amber-50 text-amber-900 px-1.5 py-0.2 rounded font-bold border border-amber-200">
                              <Lock className="w-2.5 h-2.5 mr-0.5 text-amber-700" />
                              Admin
                            </span>
                          ) : (
                            stage.badge && (
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold border ${
                                  isActive
                                    ? 'bg-white/20 text-white border-white/30'
                                    : stage.badgeColor || 'bg-slate-100 text-slate-700 border-slate-200'
                                }`}
                              >
                                {stage.badge}
                              </span>
                            )
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
            </div>
          </div>

          {/* SECTION 2: OPERATIONAL REGISTERS & TRACKING (Coordinator / Admin Only) */}
          {isAdmin && (
            <div className="pt-2">
              {!isSidebarCollapsed && (
                <div className="px-2 pb-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Registers & Tracking</span>
                </div>
              )}

              <div className="space-y-1">
                {secondaryRegisters.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(item.id);
                        if (window.innerWidth < 768) {
                          setIsSidebarHidden(true);
                        }
                      }}
                      className={`group w-full flex items-center rounded-xl transition-all cursor-pointer relative ${
                        isSidebarCollapsed
                          ? 'justify-center p-3'
                          : 'px-3 py-2 justify-between'
                      } ${
                        isActive
                          ? 'bg-slate-900 text-white shadow-xs font-bold'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950 font-medium'
                      }`}
                      title={item.label}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-colors ${
                            isActive
                              ? 'text-amber-300'
                              : 'text-slate-500 group-hover:text-indigo-600'
                          }`}
                        />
                        {!isSidebarCollapsed && (
                          <span className="text-xs truncate">{item.label}</span>
                        )}
                      </div>

                      {!isSidebarCollapsed && item.badge && (
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold border ${
                            isActive
                              ? 'bg-white/20 text-white border-white/30'
                              : item.badgeColor
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION 3: MANAGEMENT, AUDIT & CONFIGURATION (Protected for Coordinator / Admin) */}
          {isAdmin && (
            <div className="pt-2">
              {!isSidebarCollapsed && (
                <div className="px-2 pb-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Governance & Audit</span>
                </div>
              )}

              <div className="space-y-1">
                {adminSections.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  const isRestricted = item.adminOnly && !isAdmin;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(item.id);
                        if (window.innerWidth < 768) {
                          setIsSidebarHidden(true);
                        }
                      }}
                      className={`group w-full flex items-center rounded-xl transition-all cursor-pointer relative ${
                        isSidebarCollapsed
                          ? 'justify-center p-3'
                          : 'px-3 py-2 justify-between'
                      } ${
                        isActive
                          ? 'bg-slate-900 text-white shadow-xs font-bold'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950 font-medium'
                      }`}
                      title={item.label}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-colors ${
                            isActive
                              ? 'text-amber-300'
                              : 'text-slate-500 group-hover:text-indigo-600'
                          }`}
                        />
                        {!isSidebarCollapsed && (
                          <span className="text-xs truncate">{item.label}</span>
                        )}
                      </div>

                      {!isSidebarCollapsed && (
                        <div className="flex items-center gap-1.5 shrink-0 ml-1">
                          {isRestricted ? (
                            <span className="flex items-center text-[10px] bg-amber-50 text-amber-900 px-1.5 py-0.2 rounded font-bold border border-amber-200">
                              <Lock className="w-2.5 h-2.5 mr-0.5 text-amber-700" />
                              Admin
                            </span>
                          ) : (
                            item.badge && (
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold border ${
                                  isActive
                                    ? 'bg-white/20 text-white border-white/30'
                                    : item.badgeColor
                                }`}
                              >
                                {item.badge}
                              </span>
                            )
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Mobile Google Sheets Sync Button */}
        <div className="md:hidden px-3 pb-2 pt-1 border-t border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={() => syncGoogleSheets(false)}
            disabled={isSyncingSheets}
            style={{ touchAction: 'manipulation' }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <span
              className={`w-2 h-2 rounded-full bg-white ${
                isSyncingSheets ? 'animate-ping' : ''
              }`}
            />
            <span>
              {syncStatus || (isSyncingSheets ? 'Syncing...' : 'Sync Google Sheets')}
            </span>
          </button>
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-500">
          {!isSidebarCollapsed ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] font-semibold">
                <span>Active Cycle:</span>
                <span className="font-mono text-slate-800 font-bold">
                  {settings.defaultSession}
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span>Role Mode:</span>
                <span
                  className={`font-bold ${
                    isUrlLockedDeskMode
                      ? 'text-teal-700 font-mono'
                      : isAdmin
                      ? 'text-indigo-700'
                      : 'text-teal-700'
                  }`}
                >
                  {isUrlLockedDeskMode
                    ? 'Desk Official (URL Locked)'
                    : isAdmin
                    ? 'Coordinator (Admin)'
                    : 'Desk Official'}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <span
                className={`w-2 h-2 rounded-full inline-block ${
                  isAdmin ? 'bg-indigo-600' : 'bg-teal-600'
                }`}
                title={isAdmin ? 'Administrator Mode' : 'Desk Official Mode'}
              />
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
