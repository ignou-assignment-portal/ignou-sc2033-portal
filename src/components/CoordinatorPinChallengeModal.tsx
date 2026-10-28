import React, { useState } from 'react';
import { ShieldCheck, Lock, X, AlertCircle, Sparkles, CheckCircle2, Eye, EyeOff, KeyRound } from 'lucide-react';
import { useApp } from '../context/AppContext';

export interface CoordinatorPinChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  actionTitle: string;
  actionDescription?: string;
}

export const CoordinatorPinChallengeModal: React.FC<CoordinatorPinChallengeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  actionTitle,
  actionDescription,
}) => {
  const { verifyCoordinatorStepUp, securityCredentials } = useApp();
  const [passphrase, setPassphrase] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const entered = passphrase.trim();
    if (!entered) {
      setError('Please enter the Coordinator Master Passphrase or PIN.');
      return;
    }

    setIsVerifying(true);
    const result = verifyCoordinatorStepUp(entered, actionTitle);
    setIsVerifying(false);

    if (result.success) {
      setPassphrase('');
      onSuccess();
      onClose();
    } else {
      setError(result.error || 'Access Denied: Invalid Coordinator Master Passphrase or PIN.');
      setPassphrase('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-zinc-300 overflow-hidden text-zinc-900">
        {/* Modal Top Header */}
        <div className="bg-linear-to-r from-zinc-950 via-indigo-950 to-zinc-900 p-5 text-white flex items-start justify-between gap-3 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-300 text-[10px] font-bold tracking-wider uppercase mb-1">
                <Sparkles className="w-3 h-3" />
                <span>Coordinator Protected Step-Up</span>
              </div>
              <h3 className="text-sm sm:text-base font-black tracking-tight text-white leading-tight">
                Master Authorization Required
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Action Context Box */}
          <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs space-y-1">
            <span className="text-[10px] uppercase font-bold text-zinc-500 block">
              Protected Operation:
            </span>
            <div className="font-bold text-zinc-900 text-sm">{actionTitle}</div>
            {actionDescription && (
              <p className="text-zinc-600 text-xs leading-relaxed">{actionDescription}</p>
            )}
          </div>

          <div className="text-xs text-zinc-600 leading-relaxed">
            Per IGNOU SC-2033 Statutory Governance, this sensitive operation requires instant Coordinator Step-Up Passphrase validation.
          </div>

          {/* Passphrase Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-zinc-800">
                Coordinator Master Passphrase / PIN:
              </label>
              <span className="text-[10px] text-zinc-400 font-mono">
                Default: sc2033coordinator (or 2033)
              </span>
            </div>

            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type={showPassphrase ? 'text' : 'password'}
                autoFocus
                value={passphrase}
                onChange={(e) => {
                  setPassphrase(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Enter Master Passphrase or PIN"
                className="w-full pl-10 pr-10 py-2.5 bg-white border border-zinc-300 rounded-xl text-sm font-mono tracking-wide focus:outline-hidden focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassphrase(!showPassphrase)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 cursor-pointer p-1"
                title={showPassphrase ? 'Hide' : 'Show'}
              >
                {showPassphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isVerifying}
              className="px-5 py-2 bg-indigo-950 hover:bg-indigo-900 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Authorize Action</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
