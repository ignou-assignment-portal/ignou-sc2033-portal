import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ThemeSelector } from './ThemeSelector';
import { InstitutionalSeal } from './InstitutionalSeal';
import {
  Lock,
  ShieldAlert,
  UserCheck,
  KeyRound,
  AlertCircle,
  Building2,
  Eye,
  EyeOff,
  Sparkles,
  ArrowLeft,
  Home,
  Clock,
  User,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';

interface GatekeeperLockScreenProps {
  onBackToHome?: () => void;
}

export const GatekeeperLockScreen: React.FC<GatekeeperLockScreenProps> = ({ onBackToHome }) => {
  const {
    handleLogin,
    settings,
    securityCredentials,
    lockoutState,
    resetLockout,
    sheetUsers,
  } = useApp();

  const [selectedRole, setSelectedRole] = useState<'desk' | 'admin'>('desk');
  const [username, setUsername] = useState('desk_official');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);

  // Synchronize default username when switching roles
  const handleRoleChange = (role: 'desk' | 'admin') => {
    setSelectedRole(role);
    setErrorMessage(null);
    setPassword('');
    if (role === 'desk') {
      setUsername(securityCredentials?.staffAccount?.username || 'desk_official');
    } else {
      setUsername(securityCredentials?.coordinatorAccount?.username || 'coordinator');
    }
  };

  // Cooldown countdown timer when locked out
  useEffect(() => {
    if (!lockoutState?.isLocked || !lockoutState?.lockoutUntil) {
      setSecondsRemaining(0);
      return;
    }

    const updateCountdown = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.ceil((lockoutState.lockoutUntil! - now) / 1000));
      setSecondsRemaining(diff);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [lockoutState?.isLocked, lockoutState?.lockoutUntil]);

  const isLockedOut = Boolean(lockoutState?.isLocked && secondsRemaining > 0);

  const formatCountdown = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (isLockedOut) {
      setErrorMessage(`Terminal is locked out. Please wait ${secondsRemaining}s before trying again.`);
      return;
    }

    if (!username.trim()) {
      setErrorMessage(selectedRole === 'desk' ? 'Please enter Staff Username.' : 'Please enter Coordinator ID.');
      return;
    }

    if (!password.trim()) {
      setErrorMessage(selectedRole === 'desk' ? 'Please enter Desk Staff Password.' : 'Please enter Coordinator Master Passphrase.');
      return;
    }

    setIsSubmitting(true);
    const success = handleLogin(selectedRole, username.trim(), password.trim());
    setIsSubmitting(false);

    if (!success) {
      const currentAttempts = (lockoutState?.failedAttempts || 0) + 1;
      const maxAttempts = securityCredentials?.maxFailedAttempts || 5;

      if (currentAttempts >= maxAttempts) {
        setErrorMessage(
          `Security Lockout Triggered: ${maxAttempts} consecutive failed attempts. Terminal is temporarily frozen for ${securityCredentials?.lockoutDurationMinutes || 3} minutes.`
        );
      } else {
        const remaining = maxAttempts - currentAttempts;
        setErrorMessage(
          `Authentication Denied: Invalid credentials for ${selectedRole === 'desk' ? 'Desk Official' : 'Coordinator'}. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining before security freeze.`
        );
      }
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-zinc-950 via-zinc-900 to-indigo-950 flex flex-col items-center justify-center p-4 sm:p-6 text-zinc-100 selection:bg-indigo-500 selection:text-white">
      {/* Subtle background glow effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-500 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-500 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md">
        {/* Top Navigation & Theme Selector */}
        <div className="mb-3 flex items-center justify-between gap-2">
          {onBackToHome ? (
            <button
              type="button"
              onClick={onBackToHome}
              className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/80 px-3 py-1.5 rounded-xl transition cursor-pointer shadow-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <Home className="w-3.5 h-3.5 text-amber-400" />
              <span>Back to Study Centre Home</span>
            </button>
          ) : (
            <span className="text-[11px] text-zinc-500 font-mono">SC-2033 Terminal</span>
          )}

          <ThemeSelector variant="dropdown" />
        </div>

        {/* Institutional Crest Card */}
        <div className="bg-zinc-900/90 border border-zinc-700/80 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden">
          {/* Top Header Banner */}
          <div className="bg-linear-to-r from-zinc-900 via-indigo-950 to-zinc-900 p-6 text-center border-b border-zinc-800">
            <div className="flex flex-col items-center justify-center mb-3">
              <InstitutionalSeal size="lg" className="mb-2.5 drop-shadow-md hover:scale-105 transition-transform duration-200" />
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-bold tracking-widest uppercase">
                <Sparkles className="w-3.5 h-3.5" />
                <span>INDIRA GANDHI NATIONAL OPEN UNIVERSITY</span>
              </div>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center justify-center gap-2">
              Assignment Operations Portal
            </h1>

            <p className="text-xs text-zinc-300 font-medium mt-1">
              Study Centre SC-2033 | S.D. Jain Girls&apos; College, Dimapur
            </p>
            <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
              Regional Centre: {settings.regionalCentreCode || 'RC-20 Kohima'}
            </p>
          </div>

          {/* Form Content */}
          <div className="p-6 sm:p-8 space-y-5">
            <div className="text-center">
              <h2 className="text-base font-bold text-zinc-100 flex items-center justify-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" />
                Terminal Security Gatekeeper
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Multi-tier staff authentication & Master Passphrase protection.
              </p>
            </div>

            {/* Lockout Warning Banner */}
            {isLockedOut && (
              <div
                id="terminal-lockout-banner"
                className="p-4 bg-rose-950/90 border-2 border-rose-600 rounded-2xl text-rose-100 text-xs space-y-2 animate-in fade-in"
              >
                <div className="flex items-center gap-2.5 font-bold text-rose-300 text-sm">
                  <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
                  <span>Security Lockout In Progress</span>
                </div>
                <p className="text-xs text-rose-200 leading-relaxed">
                  Too many consecutive failed authentication attempts were detected. Terminal access is frozen to safeguard institutional records.
                </p>
                <div className="flex items-center justify-between pt-1 text-xs border-t border-rose-800/80">
                  <span className="flex items-center gap-1.5 text-rose-300 font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Cooldown remaining:</span>
                  </span>
                  <span className="font-mono text-base font-black text-amber-300 tracking-wider">
                    {formatCountdown(secondsRemaining)}
                  </span>
                </div>
              </div>
            )}

            {/* Error Banner */}
            {errorMessage && !isLockedOut && (
              <div
                id="gatekeeper-error-banner"
                className="p-3.5 bg-rose-950/80 border border-rose-600/70 rounded-2xl text-rose-200 text-xs flex items-start gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200"
              >
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{errorMessage}</span>
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-4">
              {/* Role Selector Pill Toggle */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-2">
                  Select Operating Role
                </label>
                <div className="grid grid-cols-2 gap-2 bg-zinc-950 p-1.5 rounded-2xl border border-zinc-800">
                  <button
                    id="role-select-desk"
                    type="button"
                    onClick={() => handleRoleChange('desk')}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                      selectedRole === 'desk'
                        ? 'bg-teal-600 text-white shadow-md'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                    }`}
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Staff Counter</span>
                  </button>

                  <button
                    id="role-select-admin"
                    type="button"
                    onClick={() => handleRoleChange('admin')}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                      selectedRole === 'admin'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                    }`}
                  >
                    <ShieldAlert className="w-4 h-4" />
                    <span>Coordinator</span>
                  </button>
                </div>
                <div className="text-[11px] text-zinc-400 mt-1.5 px-1">
                  {selectedRole === 'desk' ? (
                    <span className="text-teal-400 font-medium">
                      ✓ Front Counter: Student Intake, Script Receiving & Search
                    </span>
                  ) : (
                    <span className="text-indigo-400 font-medium">
                      ✓ Master Authority: Marks Locking, Remuneration & Settings
                    </span>
                  )}
                </div>
              </div>

              {/* Username / ID Input */}
              <div>
                <label
                  htmlFor="terminal-username-input"
                  className="block text-xs font-semibold text-zinc-300 mb-1.5"
                >
                  {selectedRole === 'desk' ? 'Staff Username' : 'Coordinator ID'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="terminal-username-input"
                    type="text"
                    disabled={isLockedOut}
                    placeholder={selectedRole === 'desk' ? 'e.g. desk_official' : 'e.g. coordinator'}
                    value={username}
                    list="sheet-users-list"
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-zinc-950 border border-zinc-700 rounded-xl text-white font-mono text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition disabled:opacity-50"
                  />
                  <datalist id="sheet-users-list">
                    {sheetUsers.map((u) => (
                      <option key={u.username} value={u.username}>
                        {u.fullName ? `${u.fullName} (${u.role.toUpperCase()})` : u.role.toUpperCase()}
                      </option>
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Password / Master Passphrase Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="terminal-password-input"
                    className="block text-xs font-semibold text-zinc-300"
                  >
                    {selectedRole === 'desk' ? 'Staff Password' : 'Coordinator Master Passphrase'}
                  </label>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    {selectedRole === 'desk' ? 'Pass or PIN' : 'Passphrase'}
                  </span>
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                    <KeyRound className="w-4 h-4" />
                  </div>

                  <input
                    id="terminal-password-input"
                    type={showPassword ? 'text' : 'password'}
                    disabled={isLockedOut}
                    placeholder={selectedRole === 'desk' ? 'Enter staff password or PIN' : 'Enter Master Passphrase or PIN'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    autoFocus
                    className="w-full pl-10 pr-11 py-2.5 bg-zinc-950 border border-zinc-700 rounded-xl text-white font-mono text-sm tracking-wide focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition disabled:opacity-50"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-zinc-200 cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Unlock Terminal Action Button */}
              <button
                id="btn-unlock-terminal"
                type="submit"
                disabled={isSubmitting || isLockedOut}
                className={`w-full py-3.5 px-4 font-bold text-sm rounded-xl shadow-lg transition cursor-pointer flex items-center justify-center gap-2 ${
                  isLockedOut
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
                    : selectedRole === 'desk'
                    ? 'bg-linear-to-r from-teal-600 to-teal-700 hover:from-teal-500 hover:to-teal-600 text-white shadow-teal-500/20'
                    : 'bg-linear-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white shadow-indigo-500/25'
                }`}
              >
                <Lock className="w-4 h-4 text-amber-300" />
                <span>
                  {isLockedOut
                    ? `Locked (${formatCountdown(secondsRemaining)})`
                    : `Authenticate & Unlock ${selectedRole === 'desk' ? 'Staff Desk' : 'Master Portal'}`}
                </span>
              </button>
            </form>

            {/* Inactivity & Lockout Security Policy Notice */}
            <div className="p-3 bg-zinc-950/60 border border-zinc-800/80 rounded-2xl text-center space-y-1">
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Inactivity auto-locks after <strong>{securityCredentials?.inactivityTimeoutMinutes || 20} min</strong>. 5 consecutive failed attempts lock the terminal for <strong>{securityCredentials?.lockoutDurationMinutes || 3} min</strong>.
              </p>
            </div>

            {onBackToHome && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={onBackToHome}
                  className="w-full py-2.5 px-3 rounded-xl border border-zinc-800 hover:border-zinc-700 bg-zinc-950/50 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Home className="w-3.5 h-3.5 text-amber-400" />
                  <span>Return to Study Centre Home Page</span>
                </button>
              </div>
            )}
          </div>

          {/* Institutional Footer Seal */}
          <div className="bg-zinc-950 px-6 py-3 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500">
            <span className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-zinc-400" />
              <span>IGNOU SC-2033 Portal</span>
            </span>
            <span className="font-medium text-zinc-400">
              Coordinator: Dr. Sant K. Gupta
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
