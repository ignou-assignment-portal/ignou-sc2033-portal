import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { ShieldCheck, Lock, X, AlertCircle, Eye, EyeOff, KeyRound, Clock, ShieldAlert, Key, UserCheck, HelpCircle } from 'lucide-react';

export const EditingPinModal: React.FC = () => {
  const {
    editingAuthChallenge,
    closeEditingAuthChallenge,
    unlockEditingSession,
    currentRole,
    currentUserAccount,
    settings,
  } = useApp();

  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [useMasterOverride, setUseMasterOverride] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingAuthChallenge.isOpen) {
      setPin('');
      setError(null);
      setUseMasterOverride(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [editingAuthChallenge.isOpen]);

  if (!editingAuthChallenge.isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanInput = pin.trim();
    if (!cleanInput) {
      setError(
        useMasterOverride
          ? 'Please enter the Coordinator Master Passphrase.'
          : 'Please enter your 4-digit personal PIN (from Google Sheets Users tab).'
      );
      return;
    }

    setIsVerifying(true);
    const result = unlockEditingSession(cleanInput);
    setIsVerifying(false);

    if (result.success) {
      setPin('');
      const callback = editingAuthChallenge.actionCallback;
      closeEditingAuthChallenge();
      if (typeof callback === 'function') {
        callback();
      }
    } else {
      setError(
        result.error ||
          (useMasterOverride
            ? 'Invalid Coordinator Master Passphrase. Default: sc2033coordinator'
            : 'Invalid PIN. Please check your assigned PIN in Google Sheets Users tab or use Master Passphrase override.')
      );
      setPin('');
      inputRef.current?.focus();
    }
  };

  const isAdmin = currentRole === 'ADMIN';
  const userName = currentUserAccount?.fullName || currentUserAccount?.username || (isAdmin ? 'Coordinator' : 'Desk Official');

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div
        className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-zinc-300 overflow-hidden text-zinc-900"
        role="dialog"
        aria-modal="true"
        aria-labelledby="editing-pin-title"
      >
        {/* Modal Header */}
        <div className={`p-4 text-white flex items-start justify-between gap-3 border-b ${
          isAdmin
            ? 'bg-gradient-to-r from-zinc-950 via-indigo-950 to-zinc-900 border-zinc-800'
            : 'bg-gradient-to-r from-zinc-900 via-teal-950 to-zinc-900 border-zinc-800'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs border ${
              isAdmin
                ? 'bg-indigo-500/20 border-indigo-400/40 text-indigo-300'
                : 'bg-teal-500/20 border-teal-400/40 text-teal-300'
            }`}>
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="editing-pin-title" className="text-sm font-bold tracking-tight">
                  Security PIN Authorization
                </h3>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                  isAdmin ? 'bg-indigo-400/20 text-indigo-200' : 'bg-teal-400/20 text-teal-200'
                }`}>
                  {isAdmin ? 'Coordinator' : 'Desk Staff'}
                </span>
              </div>
              <p className="text-xs text-zinc-300 mt-0.5 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-zinc-400" />
                <span>Logged in as: <strong className="text-white">{userName}</strong></span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeEditingAuthChallenge}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
            aria-label="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {/* Action Being Authorized Box */}
          <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
              Action Requiring PIN Authorization
            </span>
            <div className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>{editingAuthChallenge.actionTitle || 'Data Modification'}</span>
            </div>
            {editingAuthChallenge.actionDescription && (
              <p className="text-[11px] text-zinc-600 leading-relaxed">
                {editingAuthChallenge.actionDescription}
              </p>
            )}
          </div>

          {/* 20-Minute Session Policy Notice */}
          <div className="p-3 bg-indigo-50/70 border border-indigo-200/80 rounded-xl flex items-start gap-2.5 text-xs text-indigo-950">
            <Clock className="w-4 h-4 text-indigo-700 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold block text-[11px]">20-Minute Continuous Editing Window</span>
              <p className="text-[11px] text-indigo-900 leading-relaxed">
                Verifying grants continuous editing & deletion access for <strong>20 minutes</strong> without repeated prompts.
              </p>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-900 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="font-semibold">{error}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="editing-pin-input" className="block text-xs font-bold text-zinc-700 uppercase tracking-wider">
                  {useMasterOverride
                    ? 'Coordinator Master Passphrase'
                    : `Personal Security PIN (${isAdmin ? 'Default: 2033' : 'Default: 1001'})`}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setUseMasterOverride(!useMasterOverride);
                    setPin('');
                    setError(null);
                    setTimeout(() => inputRef.current?.focus(), 50);
                  }}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer underline flex items-center gap-1"
                >
                  <Key className="w-3 h-3" />
                  <span>{useMasterOverride ? 'Use Personal PIN' : 'Forgot PIN? Master Override'}</span>
                </button>
              </div>

              <div className="relative">
                <input
                  id="editing-pin-input"
                  ref={inputRef}
                  type={showPin ? 'text' : 'password'}
                  inputMode={useMasterOverride ? 'text' : 'numeric'}
                  pattern={useMasterOverride ? undefined : '[0-9]*'}
                  maxLength={useMasterOverride ? 50 : 8}
                  placeholder={useMasterOverride ? 'Enter Coordinator Master Passphrase' : 'Enter 4-digit personal PIN'}
                  value={pin}
                  onChange={(e) => {
                    const val = useMasterOverride ? e.target.value : e.target.value.replace(/[^0-9]/g, '');
                    setPin(val);
                    if (error) setError(null);
                  }}
                  autoFocus
                  className="w-full px-3.5 py-2.5 bg-white border border-zinc-300 rounded-xl text-zinc-900 font-mono text-base tracking-widest text-center font-bold focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                />

                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-zinc-700 cursor-pointer"
                  title={showPin ? 'Hide Input' : 'Show Input'}
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <p className="text-[10.5px] text-zinc-500 mt-1.5 flex items-center gap-1">
                <HelpCircle className="w-3 h-3 text-zinc-400 shrink-0" />
                <span>
                  {useMasterOverride
                    ? 'Coordinator Master Passphrase authorizes edits if staff member forgets personal PIN.'
                    : 'Configured in Google Sheets "Users" tab PIN column for your account.'}
                </span>
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={closeEditingAuthChallenge}
                className="flex-1 py-2.5 px-3 rounded-xl border border-zinc-300 text-zinc-700 hover:bg-zinc-100 font-bold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isVerifying || !pin.trim()}
                className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs text-white shadow-md transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 ${
                  isAdmin
                    ? 'bg-indigo-600 hover:bg-indigo-700'
                    : 'bg-teal-600 hover:bg-teal-700'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Verify & Authorize</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
