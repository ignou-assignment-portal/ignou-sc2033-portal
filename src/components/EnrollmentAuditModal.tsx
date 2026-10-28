import React from 'react';
import {
  X,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Users,
  Hash,
  BookOpen,
  Layers,
  Calendar,
  ExternalLink,
  Printer,
  Edit3,
} from 'lucide-react';
import { IntakeRecord } from '../types';
import { formatDate } from '../utils/helpers';

export interface DuplicateEnrollmentGroup {
  enrollmentNo: string;
  studentName: string;
  programmeCodes: string[];
  records: IntakeRecord[];
  isProgrammeConflict: boolean; // Rule 1
  duplicateCourses: string[]; // Rule 3
  isSupplementaryMultiCourse: boolean; // Rule 2 valid
}

export interface EnrollmentAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionName: string;
  duplicateGroups: DuplicateEnrollmentGroup[];
  totalIntakes: number;
  totalUniqueEnrollments: number;
  onInspectRecord?: (record: IntakeRecord) => void;
  onEditRecord?: (record: IntakeRecord) => void;
}

export const EnrollmentAuditModal: React.FC<EnrollmentAuditModalProps> = ({
  isOpen,
  onClose,
  sessionName,
  duplicateGroups,
  totalIntakes,
  totalUniqueEnrollments,
  onInspectRecord,
  onEditRecord,
}) => {
  if (!isOpen) return null;

  const conflictGroups = duplicateGroups.filter(
    (g) => g.isProgrammeConflict || g.duplicateCourses.length > 0
  );
  const supplementaryGroups = duplicateGroups.filter(
    (g) => g.isSupplementaryMultiCourse
  );
  const hasConflicts = conflictGroups.length > 0;
  const hasSupplementaryOnly = duplicateGroups.length > 0 && !hasConflicts;
  const hasAnyGroups = duplicateGroups.length > 0;
  const duplicateRecordsCount = duplicateGroups.reduce(
    (sum, g) => sum + g.records.length,
    0
  );

  return (
    <div
      id="enrollment-audit-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="enrollment-audit-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="enrollment-audit-title"
        className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 flex items-center justify-between gap-3 bg-zinc-50/80">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                hasConflicts
                  ? 'bg-rose-100 text-rose-700 border border-rose-300'
                  : hasSupplementaryOnly
                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                  : 'bg-emerald-100 text-emerald-700 border border-emerald-300'
              }`}
            >
              {hasConflicts ? (
                <ShieldAlert className="w-5 h-5" />
              ) : (
                <ShieldCheck className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3
                  id="enrollment-audit-title"
                  className="font-bold text-zinc-900 text-sm sm:text-base leading-tight"
                >
                  Enrollment Uniqueness & Multi-Course Audit
                </h3>
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-200 text-zinc-800">
                  {sessionName}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Scanning all intake records in active session: Same enrollment & programme allowed when course codes differ
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            id="close-enrollment-audit-btn"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
              <span className="text-[10px] text-zinc-400 font-medium block">Total Intakes</span>
              <span className="text-base font-black text-zinc-900 font-mono">
                {totalIntakes}
              </span>
            </div>
            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
              <span className="text-[10px] text-zinc-400 font-medium block">Unique Enrollments</span>
              <span className="text-base font-black text-indigo-600 font-mono">
                {totalUniqueEnrollments}
              </span>
            </div>
            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
              <span className="text-[10px] text-zinc-400 font-medium block">Rule Conflicts</span>
              <span
                className={`text-base font-black font-mono ${
                  hasConflicts ? 'text-rose-600' : 'text-emerald-600'
                }`}
              >
                {conflictGroups.length}
              </span>
            </div>
            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
              <span className="text-[10px] text-zinc-400 font-medium block">Supplementary Intakes</span>
              <span
                className={`text-xs font-bold block mt-1 ${
                  hasConflicts
                    ? 'text-rose-700'
                    : hasSupplementaryOnly
                    ? 'text-blue-700'
                    : 'text-emerald-700'
                }`}
              >
                {hasConflicts
                  ? `${conflictGroups.length} Conflict(s)`
                  : hasSupplementaryOnly
                  ? `${supplementaryGroups.length} Valid (Different Courses)`
                  : '100% Unique'}
              </span>
            </div>
          </div>

          {/* Result Alert Banner */}
          {!hasAnyGroups ? (
            <div
              id="enrollment-audit-clean-banner"
              className="p-4 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-950 flex items-start gap-3"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-sm text-emerald-900">
                  All Enrollment Numbers Are Unique
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  No enrollment number has been submitted more than once across all{' '}
                  <strong className="font-mono font-bold text-emerald-950">{totalIntakes}</strong> intake
                  records in active session <strong className="font-bold">{sessionName}</strong>. Every student has exactly one unique intake transaction.
                </p>
              </div>
            </div>
          ) : hasSupplementaryOnly ? (
            <div
              id="enrollment-audit-supplementary-banner"
              className="p-4 rounded-xl border border-blue-300 bg-blue-50 text-blue-950 flex items-start gap-3"
            >
              <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-sm text-blue-900">
                  All Multi-Course Intakes Are Valid: Course Codes Differ
                </div>
                <p className="text-xs text-blue-800 leading-relaxed">
                  Found <strong className="font-mono font-black">{supplementaryGroups.length}</strong> candidate(s) with multiple intake receipts ({duplicateRecordsCount} total receipts) under the same programme with differing course codes. Under IGNOU rules, adding an intake for the same student, name, and programme is <strong className="font-bold">fully allowed</strong> when course codes differ.
                </p>
              </div>
            </div>
          ) : (
            <div
              id="enrollment-audit-conflict-banner"
              className="p-4 rounded-xl border border-rose-300 bg-rose-50 text-rose-950 flex items-start gap-3"
            >
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-sm text-rose-900">
                  Duplicate Enrollment Conflicts Found in {sessionName}
                </div>
                <p className="text-xs text-rose-800 leading-relaxed">
                  Found <strong className="font-mono font-black">{conflictGroups.length}</strong> enrollment number conflict(s) with overlapping courses or programme mismatch. Review each group below for IGNOU integrity rules.
                </p>
              </div>
            </div>
          )}

          {/* Duplicate Groups List */}
          {hasAnyGroups && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-zinc-800 flex items-center justify-between">
                <span>Detailed Duplicate Enrollment Breakdown:</span>
                <span className="text-[11px] text-zinc-500 font-normal">
                  Rule 1 (Programme Scope) • Rule 2 (Supplementary Intake) • Rule 3 (Duplicate Courses)
                </span>
              </div>

              {duplicateGroups.map((group, gIdx) => {
                return (
                  <div
                    key={`audit-dup-${group.enrollmentNo}-${gIdx}`}
                    className="p-4 rounded-xl border border-zinc-200 bg-white shadow-2xs space-y-3"
                  >
                    {/* Group Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-zinc-100">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-sm text-zinc-950 bg-zinc-100 px-2.5 py-0.5 rounded-lg border border-zinc-200">
                          {group.enrollmentNo}
                        </span>
                        <span className="font-bold text-zinc-800 text-xs">
                          {group.studentName}
                        </span>
                        <span className="text-[11px] text-zinc-500 font-mono">
                          ({group.records.length} intakes)
                        </span>
                      </div>

                      {/* Rule Classification Tag */}
                      <div>
                        {group.isProgrammeConflict ? (
                          <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-900 border border-rose-300 font-bold text-[10px]">
                            Rule 1 Violation: Programme Scope Conflict
                          </span>
                        ) : group.duplicateCourses.length > 0 ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[10px]">
                            Rule 3 Violation: Repeated Course ({group.duplicateCourses.join(', ')})
                          </span>
                        ) : group.isSupplementaryMultiCourse ? (
                          <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-900 border border-blue-300 font-bold text-[10px]">
                            Rule 2 Valid: Supplementary Course Intake
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-900 border border-rose-300 font-bold text-[10px]">
                            Duplicate Entry
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Records List under this enrollment */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {group.records.map((r, rIdx) => {
                        const prog =
                          r.programmeCode ||
                          (r as any).Programme ||
                          (r as any).programme ||
                          '-';
                        const courses = r.courseCodes || (r as any).Courses || [];
                        const coursesArr = Array.isArray(courses)
                          ? courses
                          : String(courses).split(',').map((c) => c.trim());
                        const token = r.tokenNo || r.id;

                        return (
                          <div
                            key={`record-${r.id}-${rIdx}`}
                            className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200 text-[11px] space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-indigo-950">
                                {token}
                              </span>
                              <span className="text-zinc-500">
                                {r.submissionDate ? formatDate(r.submissionDate) : '-'}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 text-zinc-700">
                              <BookOpen className="w-3 h-3 text-zinc-400" />
                              <strong className="font-mono">{prog}</strong>
                              <span>•</span>
                              <span>{coursesArr.length} course{coursesArr.length === 1 ? '' : 's'}:</span>
                              <span className="font-mono text-zinc-900 font-semibold truncate">
                                {coursesArr.join(', ')}
                              </span>
                            </div>

                            <div className="flex items-center justify-between pt-1 border-t border-zinc-200/60 text-[10px]">
                              <span className="text-zinc-500">{r.submissionMode}</span>
                              <div className="flex items-center gap-1">
                                {onInspectRecord && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onClose();
                                      onInspectRecord(r);
                                    }}
                                    className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                                  >
                                    Inspect Slip
                                  </button>
                                )}
                                {onEditRecord && (
                                  <>
                                    <span>·</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onClose();
                                        onEditRecord(r);
                                      }}
                                      className="text-zinc-700 hover:text-zinc-950 font-semibold cursor-pointer"
                                    >
                                      Edit
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between text-xs">
          <span className="text-zinc-500 text-[11px]">
            IGNOU Counter Intake Integrity Standards (SC-2033)
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-bold cursor-pointer transition shadow-2xs"
          >
            Close Audit
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnrollmentAuditModal;
