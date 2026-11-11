import React from 'react';
import { AlertCircle, RefreshCw, X, ShieldCheck } from 'lucide-react';

interface SheetsSyncRetryModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  actionName?: 'push' | 'pull';
  onRetry: () => void;
  onDismiss: () => void;
  isRetrying?: boolean;
}

export const SheetsSyncRetryModal: React.FC<SheetsSyncRetryModalProps> = ({
  isOpen,
  title,
  message,
  actionName = 'push',
  onRetry,
  onDismiss,
  isRetrying = false,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sync-retry-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs transition-opacity"
    >
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-amber-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 id="sync-retry-title" className="text-sm font-bold text-slate-900">
                {title || 'Google Sheets Sync Delayed'}
              </h3>
              <p className="text-xs text-amber-800">Connection timeout or temporary network delay</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <p className="text-xs leading-relaxed text-slate-600">
            {message}
          </p>

          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-900 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-emerald-950">Local Data 100% Safe: </span>
              All your marks, candidate intakes, and evaluator allotments are securely saved in your browser storage. No data has been lost.
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onDismiss}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition shadow-2xs"
          >
            Keep Local & Dismiss
          </button>
          <button
            type="button"
            onClick={onRetry}
            disabled={isRetrying}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg transition shadow-sm disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
            <span>{isRetrying ? 'Retrying...' : actionName === 'push' ? 'Retry Push to Sheets' : 'Retry Pull from Sheets'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
