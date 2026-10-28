import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { ShieldAlert, X, KeyRound, AlertTriangle, Eye, EyeOff, ShieldCheck } from 'lucide-react';

export const AdminPinModal: React.FC = () => {
  const {
    isAdminPinModalOpen,
    closeAdminPinModal,
    verifyAndSetAdminRole,
    adminPinError,
  } = useApp();

  const [inputVal, setInputVal] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAdminPinModalOpen) {
      setInputVal('');
      setLocalError(null);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isAdminPinModalOpen]);

  if (!isAdminPinModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = inputVal.trim();
    if (!cleanInput) {
      setLocalError('Please enter Coordinator Master Passphrase or 4-digit PIN.');
      return;
    }

    const success = verifyAndSetAdminRole(cleanInput);
    if (!success) {
      setInputVal('');
      setLocalError('Invalid Coordinator credentials. Access denied. Reverting to Desk Official role.');
      inputRef.current?.focus();
    }
  };

  const errorMessage = localError || adminPinError;

  return (
    <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div
        id="admin-pin-modal"
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-950 text-amber-300 flex items-center justify-center shadow-xs">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-zinc-900 leading-tight">
                Coordinator Security Verification
              </h3>
              <p className="text-[11px] text-zinc-500">Master Passphrase Gate for SC-2033 Role Elevation</p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeAdminPinModal}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition cursor-pointer"
            title="Cancel and remain Desk Official"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Security Notice */}
        <div className="mt-4 p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs text-indigo-950 flex items-start gap-2.5">
          <KeyRound className="w-4 h-4 text-indigo-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Privileged Operational Role</span>
            <p className="text-[11px] text-indigo-900 mt-0.5 leading-normal">
              Switching to <strong>Administrator (Coordinator)</strong> persona allows evaluator remuneration billing, sanction approvals, rate overrides, and marks locking.
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-center gap-2 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold text-[11px]">{errorMessage}</span>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider">
                Coordinator Master Passphrase / PIN
              </label>
              <span className="text-[10px] text-zinc-500 font-mono">
                Default: sc2033coordinator (or 2033)
              </span>
            </div>

            <div className="relative">
              <input
                ref={inputRef}
                id="admin-pin-input"
                type={showInput ? 'text' : 'password'}
                value={inputVal}
                onChange={(e) => {
                  setLocalError(null);
                  setInputVal(e.target.value);
                }}
                placeholder="Enter passphrase or PIN"
                className="w-full pr-10 pl-3 py-2.5 bg-zinc-50 border border-indigo-950/30 focus:border-indigo-600 rounded-xl text-zinc-900 font-mono text-sm tracking-wide focus:outline-hidden focus:ring-2 focus:ring-indigo-100 transition shadow-inner"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowInput(!showInput)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 cursor-pointer p-1"
                title={showInput ? 'Hide' : 'Show'}
              >
                {showInput ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-zinc-500 mt-1.5">
              Accepts Coordinator Master Passphrase or legacy 4-digit PIN (`2033`).
            </p>
          </div>

          {/* Quick Keypad Simulation for 4-digit numeric PINs */}
          <div className="border border-zinc-200 rounded-xl p-2.5 bg-zinc-50/60">
            <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1 text-center">
              Quick Numeric Keypad (for 4-digit PIN: 2033)
            </span>
            <div className="grid grid-cols-3 gap-1.5 max-w-[200px] mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    setLocalError(null);
                    if (k === 'C') {
                      setInputVal('');
                    } else if (k === '⌫') {
                      setInputVal((prev) => prev.slice(0, -1));
                    } else {
                      setInputVal((prev) => prev + k);
                    }
                  }}
                  className={`py-1.5 rounded-lg text-xs font-mono font-bold border transition cursor-pointer ${
                    k === 'C'
                      ? 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                      : k === '⌫'
                      ? 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                      : 'bg-white hover:bg-zinc-100 text-zinc-800 border-zinc-200'
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>

          {/* Modal Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200">
            <button
              type="button"
              onClick={closeAdminPinModal}
              className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition cursor-pointer"
            >
              Cancel (Stay Official)
            </button>
            <button
              type="submit"
              disabled={!inputVal.trim()}
              id="submit-admin-pin-btn"
              className={`px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
                inputVal.trim()
                  ? 'bg-indigo-950 hover:bg-indigo-900 text-white'
                  : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verify & Unlock</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
