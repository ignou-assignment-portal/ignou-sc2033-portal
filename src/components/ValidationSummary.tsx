import React from 'react';
import { CheckCircle2, AlertCircle, X, Hash, BookOpen, Layers } from 'lucide-react';

export interface ValidationSummaryProps {
  status?: 'Success' | 'Rejected' | 'Error' | string;
  reason?: string;
  rule?: string;
  action?: string;
  cleanData?: {
    tokenNo?: string;
    enrollmentNo?: string;
    studentName?: string;
    programmeCode?: string;
    courseCodes?: string[];
    [key: string]: any;
  };
  onClose?: () => void;
  onDismiss?: () => void;
  onClear?: () => void;
  result?: {
    status?: 'Success' | 'Rejected' | 'Error' | string;
    reason?: string;
    rule?: string;
    action?: string;
    cleanData?: any;
    [key: string]: any;
  } | null;
}

/**
 * ValidationSummary Component:
 * Accepts `status` ('Success' | 'Rejected') and `reason` props.
 * Conditionally renders a green success checkmark or a red error alert box
 * to provide immediate feedback after submission attempts.
 */
export const ValidationSummary: React.FC<ValidationSummaryProps> = ({
  status: propStatus,
  reason: propReason,
  rule: propRule,
  action: propAction,
  cleanData: propCleanData,
  result,
  onClose,
  onDismiss,
  onClear,
}) => {
  const rawStatus = propStatus || result?.status;
  const reason = propReason || result?.reason;
  const rule = propRule || result?.rule;
  const action = propAction || result?.action;
  const cleanData = propCleanData || result?.cleanData;

  if (!rawStatus) return null;

  const normalized = String(rawStatus).trim().toLowerCase();
  const isSuccess = normalized === 'success';
  const handleDismiss = onClose || onDismiss || onClear;

  const rawCourses = cleanData?.courseCodes || cleanData?.courses || cleanData?.Courses;
  const coursesStr = Array.isArray(rawCourses)
    ? rawCourses.map((c) => String(c || '').trim()).filter(Boolean).join(', ')
    : typeof rawCourses === 'string'
    ? rawCourses
    : '';

  const displayReason = typeof reason === 'string'
    ? reason
    : (reason as any)?.message
    ? String((reason as any).message)
    : reason
    ? String(reason)
    : '';

  if (isSuccess) {
    return (
      <div
        id="validation-summary-success"
        data-testid="validation-summary-success"
        role="alert"
        aria-live="polite"
        className="rounded-xl border border-green-300 bg-green-50 text-green-950 p-4 shadow-xs transition-all duration-200"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            {/* Green Success Checkmark */}
            <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-green-700 text-white tracking-wider">
                  Success
                </span>
                <span className="text-xs font-bold text-green-900">
                  {action ? `Action: ${action} • Integrity Verified` : 'Data Integrity Verified'}
                </span>
                {cleanData?.tokenNo && (
                  <span className="px-2 py-0.5 rounded-md bg-green-100 text-green-900 border border-green-300 font-mono text-[11px] font-bold">
                    {cleanData.tokenNo}
                  </span>
                )}
              </div>

              <p className="text-xs text-green-800 font-medium leading-relaxed">
                {displayReason || 'Intake submission passed all institutional validation rules successfully.'}
              </p>

              {cleanData && (
                <div className="flex items-center gap-3 pt-1.5 flex-wrap text-[11px] text-green-800/80 font-mono">
                  {cleanData.enrollmentNo && (
                    <span className="flex items-center gap-1">
                      <Hash className="w-3 h-3 text-green-600" />
                      <strong>Enr:</strong> {cleanData.enrollmentNo}
                    </span>
                  )}
                  {cleanData.programmeCode && (
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3 h-3 text-green-600" />
                      <strong>Prog:</strong> {cleanData.programmeCode}
                    </span>
                  )}
                  {coursesStr && (
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3 text-green-600" />
                      <strong>Courses:</strong> {coursesStr}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {handleDismiss && (
            <button
              type="button"
              onClick={handleDismiss}
              id="validation-summary-close-btn"
              data-testid="validation-summary-close-btn"
              className="p-1 text-green-700 hover:text-green-950 hover:bg-green-100 rounded-lg transition cursor-pointer"
              title="Dismiss notification"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Red Error Alert Box for Rejected / Error
  return (
    <div
      id="validation-summary-error"
      data-testid="validation-summary-error"
      role="alert"
      aria-live="assertive"
      className="rounded-xl border border-red-300 bg-red-50 text-red-950 p-4 shadow-xs transition-all duration-200"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {/* Red Error Alert Box Icon */}
          <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <AlertCircle className="w-5 h-5" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-red-700 text-white tracking-wider">
                Rejected
              </span>
              {rule ? (
                <span className="text-xs font-bold text-red-900 uppercase tracking-wide">
                  Broken Rule: {rule}
                </span>
              ) : (
                <span className="text-xs font-bold text-red-900">
                  Validation Error Detected
                </span>
              )}
            </div>

            <p id="validation-summary-reason" className="text-xs text-red-800 font-semibold leading-relaxed">
              {displayReason || 'The submitted intake record violated data integrity constraints and was rejected.'}
            </p>
          </div>
        </div>

        {handleDismiss && (
          <button
            type="button"
            onClick={handleDismiss}
            id="validation-summary-close-btn"
            data-testid="validation-summary-close-btn"
            className="p-1 text-red-600 hover:text-red-950 hover:bg-red-100 rounded-lg transition cursor-pointer"
            title="Dismiss error alert"
            aria-label="Dismiss error alert"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default ValidationSummary;
