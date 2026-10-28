import React from 'react';
import { CheckCircle, Info, AlertTriangle, X } from 'lucide-react';

export interface ToastProps {
  message: string | null;
  type?: 'success' | 'info' | 'warning' | 'error';
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'success', onClose }) => {
  if (!message) return null;

  const isSuccess = type === 'success';
  const isError = type === 'error';
  const isWarning = type === 'warning';

  return (
    <div
      id="global-toast-notification"
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-[9999] max-w-md animate-in fade-in slide-in-from-bottom-5 duration-200"
    >
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl backdrop-blur-sm transition-all ${
          isSuccess
            ? 'bg-emerald-900/95 border-emerald-700 text-white shadow-emerald-950/20'
            : isError
            ? 'bg-rose-900/95 border-rose-700 text-white shadow-rose-950/20'
            : isWarning
            ? 'bg-amber-900/95 border-amber-700 text-white shadow-amber-950/20'
            : 'bg-zinc-900/95 border-zinc-700 text-white shadow-zinc-950/20'
        }`}
      >
        <div className="shrink-0">
          {isSuccess && <CheckCircle className="w-5 h-5 text-emerald-300" />}
          {isError && <AlertTriangle className="w-5 h-5 text-rose-300" />}
          {isWarning && <AlertTriangle className="w-5 h-5 text-amber-300" />}
          {!isSuccess && !isError && !isWarning && <Info className="w-5 h-5 text-sky-300" />}
        </div>

        <div className="flex-1 text-xs font-semibold leading-snug tracking-tight">
          {message}
        </div>

        <button
          id="toast-dismiss-btn"
          onClick={onClose}
          aria-label="Close notification"
          className="shrink-0 p-1 hover:bg-white/20 rounded-md transition cursor-pointer text-white/80 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
