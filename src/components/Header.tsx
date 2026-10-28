import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  ShieldAlert,
  UserCheck,
  Calendar,
  ChevronDown,
  PlusCircle,
  Search,
  Menu,
  Lock,
  Home,
} from 'lucide-react';
import { InstitutionalSeal } from './InstitutionalSeal';

interface HeaderProps {
  onViewHome?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onViewHome }) => {
  const {
    currentSession,
    setSession,
    availableSessions,
    addSession,
    setRole,
    isAdmin,
    isUrlLockedDeskMode,
    setIsAuthenticated,
    settings,
    openSearchModal,
    isSidebarHidden,
    toggleSidebarHidden,
    isHeaderCompact,
  } = useApp();

  const [isSessionDropdownOpen, setIsSessionDropdownOpen] = useState(false);
  const [isNewSessionModalOpen, setIsNewSessionModalOpen] = useState(false);
  const [newSessionInput, setNewSessionInput] = useState('');

  const handleAddSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionInput.trim()) return;
    addSession(newSessionInput.trim());
    setNewSessionInput('');
    setIsNewSessionModalOpen(false);
    setIsSessionDropdownOpen(false);
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs transition-all duration-200">
      {/* Top institution bar (can be collapsed to preserve vertical screen real estate) */}
      {!isHeaderCompact && (
        <div className="bg-slate-950 text-slate-100 text-xs px-4 py-1.5 flex flex-wrap items-center justify-between border-b border-slate-800 transition-all duration-200">
          <div className="flex items-center gap-2">
            <span className="font-bold tracking-wider text-amber-400">IGNOU</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-300 font-medium truncate max-w-[200px] sm:max-w-none">
              INDIRA GANDHI NATIONAL OPEN UNIVERSITY
            </span>
            <span className="hidden sm:inline text-slate-600">•</span>
            <span className="hidden sm:inline text-slate-400">
              Regional Centre: {settings.regionalCentreCode}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="text-amber-400 font-bold">SC-2033</span>
              <span className="text-slate-600">·</span>
              <span>Study Centre Operations Portal</span>
            </div>
            <span className="text-slate-600 hidden md:inline">|</span>
            <span className="text-slate-400 hidden md:inline">
              Coordinator: {settings.coordinatorName}
            </span>
          </div>
        </div>
      )}

      {/* Main executive header bar */}
      <div
        className={`px-3 sm:px-5 flex items-center justify-between gap-3 transition-all duration-200 ${
          isHeaderCompact ? 'py-1.5' : 'py-2.5'
        }`}
      >
        {/* Zone 1: Branding */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            id="sidebar-burger-btn"
            type="button"
            onClick={toggleSidebarHidden}
            className="p-1.5 rounded-lg text-slate-700 hover:text-slate-950 hover:bg-slate-100 border border-slate-200 transition shadow-2xs cursor-pointer flex items-center justify-center shrink-0"
            title={isSidebarHidden ? 'Show Left Navigation Drawer' : 'Hide Left Navigation Drawer'}
            aria-label="Toggle Navigation Sidebar"
          >
            <Menu className="w-4 h-4 text-indigo-950" />
          </button>

          <InstitutionalSeal
            size={isHeaderCompact ? 'xs' : 'sm'}
            className="hover:scale-105 transition-transform duration-200"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1
                className={`font-black text-slate-900 leading-tight transition-all whitespace-nowrap tracking-tight ${
                  isHeaderCompact ? 'text-sm' : 'text-base'
                }`}
              >
                Assignment Operations Cell
              </h1>
              <span className="px-1.5 py-0.2 text-[10px] font-semibold font-mono bg-slate-100 text-slate-700 border border-slate-200 rounded shrink-0">
                SC-2033
              </span>
            </div>
            {!isHeaderCompact && (
              <p className="text-[11px] text-slate-500 font-normal truncate max-w-xs sm:max-w-md hidden sm:block">
                {settings.institutionName}
              </p>
            )}
          </div>
        </div>

        {/* Zone 2: Global Student Search */}
        <div className="flex-1 max-w-md mx-2 hidden md:block">
          <button
            id="global-student-search-btn"
            type="button"
            onClick={() => openSearchModal()}
            className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-slate-300 text-slate-600 hover:text-slate-950 text-xs font-medium transition shadow-2xs cursor-pointer group"
            title="Instant Student Status & Evaluation Lookup (Ctrl+K)"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-indigo-600 group-hover:scale-110 transition shrink-0" />
              <span>Search student enrollment, name, or course...</span>
            </div>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white text-slate-500 rounded border border-slate-200 shadow-2xs">
              Ctrl+K
            </kbd>
          </button>
        </div>

        {/* Mobile Search Button (Compact) */}
        <button
          type="button"
          onClick={() => openSearchModal()}
          className="md:hidden p-2 rounded-lg border border-zinc-300 bg-white text-zinc-700 hover:text-zinc-950 hover:bg-zinc-50 transition shadow-2xs cursor-pointer"
          title="Search Student Records (Ctrl+K)"
          aria-label="Search Student Records"
        >
          <Search className="w-4 h-4 text-indigo-600" />
        </button>

        {/* Zone 3: Academic Cycle & Executive Profile / Role */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Academic Session Selector */}
          <div className="relative">
            <button
              id="session-selector-btn"
              onClick={() => setIsSessionDropdownOpen(!isSessionDropdownOpen)}
              className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-900 text-xs font-medium transition shadow-2xs cursor-pointer"
              title="Filter application by academic admission/exam cycle"
            >
              <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <div className="text-left">
                <div className="text-[9px] text-slate-500 uppercase tracking-wider font-bold leading-none">
                  Cycle
                </div>
                <div className="font-semibold text-slate-900 flex items-center gap-1.5 mt-0.5">
                  <span className="font-mono">{currentSession}</span>
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 ml-0.5" />
            </button>

            {isSessionDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-60 bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-50 animate-in fade-in slide-in-from-top-1">
                <div className="px-2 py-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100 mb-1">
                  Select Cycle (Isolated Data)
                </div>
                <div className="space-y-1">
                  {availableSessions.map((session) => (
                    <button
                      key={session}
                      onClick={() => {
                        setSession(session);
                        setIsSessionDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition ${
                        currentSession === session
                          ? 'bg-indigo-50 text-indigo-900 font-semibold border border-indigo-200'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            currentSession === session ? 'bg-indigo-600' : 'bg-slate-300'
                          }`}
                        />
                        <span className="font-mono">{session}</span>
                      </span>
                      {currentSession === session && (
                        <span className="text-[10px] bg-indigo-200/60 text-indigo-800 px-1.5 py-0.5 rounded font-bold">
                          Active
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                <div className="border-t border-slate-100 mt-2 pt-2">
                  <button
                    onClick={() => {
                      setIsSessionDropdownOpen(false);
                      setIsNewSessionModalOpen(true);
                    }}
                    className="w-full text-left px-2 py-1.5 text-xs text-indigo-600 hover:bg-indigo-50 rounded-lg flex items-center gap-1.5 font-medium transition cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    Add New Academic Cycle
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* RBAC Role Switcher Toggle */}
          {isUrlLockedDeskMode ? (
            <div
              id="role-desk-locked-badge"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-teal-50 border border-teal-300 text-teal-900 text-xs font-semibold shadow-2xs"
              title="Terminal Locked in Desk Official Mode"
            >
              <Lock className="w-3.5 h-3.5 text-teal-700 shrink-0" />
              <span className="hidden sm:inline">Desk Official</span>
            </div>
          ) : (
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                id="role-btn-official"
                type="button"
                onClick={() => setRole('OFFICIAL')}
                className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                  !isAdmin
                    ? 'bg-white text-teal-800 shadow-2xs border border-teal-300'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Switch to Desk Official Mode"
              >
                <UserCheck className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span className="hidden sm:inline">Desk</span>
              </button>

              <button
                id="role-btn-admin"
                type="button"
                onClick={() => setRole('ADMIN')}
                className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                  isAdmin
                    ? 'bg-indigo-950 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Switch to Coordinator (Admin) Mode (PIN: 2033)"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span className="hidden sm:inline">Coordinator</span>
              </button>
            </div>
          )}

          {/* Return to Study Centre Home Page */}
          {onViewHome && (
            <button
              id="btn-header-view-home"
              type="button"
              onClick={onViewHome}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-950 border border-slate-200 rounded-lg text-xs font-semibold transition cursor-pointer shadow-2xs"
              title="View Public Study Centre Home Page"
            >
              <Home className="w-3.5 h-3.5 text-indigo-700" />
              <span className="hidden lg:inline">Centre Home</span>
            </button>
          )}

          {/* Lock / Sign Out Button */}
          <button
            id="btn-lock-signout"
            type="button"
            onClick={() => {
              sessionStorage.removeItem("ignou_sc2033_auth");
              sessionStorage.removeItem("ignou_sc2033_role");
              setIsAuthenticated(false);
              onViewHome?.();
            }}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 rounded-lg text-xs font-semibold transition shadow-xs cursor-pointer"
            title="Lock terminal and end session"
          >
            <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>

      {/* New Academic Cycle Modal */}
      {isNewSessionModalOpen && (
        <div className="fixed inset-0 bg-zinc-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-zinc-200">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2 text-zinc-900 font-bold text-base">
                <Calendar className="w-4 h-4 text-indigo-600" />
                Initialize New Academic Cycle
              </div>
              <button
                onClick={() => setIsNewSessionModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddSession} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Session Name (IGNOU Format)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Jan 2028 or July 2028"
                  value={newSessionInput}
                  onChange={(e) => setNewSessionInput(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                  autoFocus
                  required
                />
                <p className="text-[11px] text-zinc-500 mt-1">
                  A fresh isolated workspace will be created. Submissions, packets, and bills from previous cycles will remain strictly separated.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewSessionModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-100 rounded-lg font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-xs cursor-pointer"
                >
                  Create & Switch Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
