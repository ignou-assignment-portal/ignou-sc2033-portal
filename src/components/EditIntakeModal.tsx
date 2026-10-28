import React, { useState, useEffect, useMemo } from 'react';
import { IntakeRecord } from '../types';
import { useApp } from '../context/AppContext';
import { formatDate } from '../utils/helpers';
import { IGNOU_PROGRAMMES } from '../data/ignouMasterData';
import {
  X,
  Edit3,
  Save,
  BookOpen,
  User,
  Phone,
  Hash,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Lock,
  Layers,
  ShieldCheck,
  ShieldAlert,
  FlaskConical,
  FileCheck,
} from 'lucide-react';
import { runBackgroundDataEntryValidation } from '../services/dataEntryValidationService';

const normalizeDateInput = (val?: any): string => {
  if (!val) return new Date().toISOString().split('T')[0];
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  if (str.includes('T')) return str.split('T')[0];
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return new Date().toISOString().split('T')[0];
};

interface EditIntakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: IntakeRecord | null;
}

export const EditIntakeModal: React.FC<EditIntakeModalProps> = ({
  isOpen,
  onClose,
  record,
}) => {
  const {
    editIntakeEntry,
    updateIntakeDate,
    currentSession,
    allCourseEvaluations,
    validateIntake,
    getRegisteredProgrammeForEnrollment,
  } = useApp();

  const [originalEnrollmentNo, setOriginalEnrollmentNo] = useState('');
  const [enrollmentNo, setEnrollmentNo] = useState('');
  const [candidateName, setCandidateName] = useState('');
  const [contact, setContact] = useState('');
  const [programme, setProgramme] = useState('');
  const [coursesInput, setCoursesInput] = useState('');
  const [submissionDate, setSubmissionDate] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live Rule 1 scope check during edit
  const registeredProg = useMemo(() => {
    if (!enrollmentNo.trim() || enrollmentNo.trim().length < 5) return null;
    return getRegisteredProgrammeForEnrollment(enrollmentNo, record?.id);
  }, [enrollmentNo, record?.id, getRegisteredProgrammeForEnrollment]);

  const isProgrammeConflict = Boolean(
    registeredProg &&
    programme &&
    registeredProg.toUpperCase() !== programme.trim().toUpperCase()
  );

  // Populate form fields whenever record changes
  useEffect(() => {
    if (record) {
      setOriginalEnrollmentNo(record.enrollmentNo);
      setEnrollmentNo(record.enrollmentNo);
      setCandidateName(record.studentName || '');
      setContact(record.studentPhone || '');
      setProgramme(record.programmeCode || '');
      setCoursesInput(record.courseCodes ? record.courseCodes.join(', ') : '');
      const recAny = record as any;
      const initialDate = normalizeDateInput(
        record.submissionDate ||
        recAny.receiptDate ||
        recAny.Submission_Date ||
        recAny.Timestamp ||
        recAny.createdAt
      );
      setSubmissionDate(initialDate);
      setFormError(null);
    }
  }, [record]);

  // Parse comma-separated courses into clean array of uppercase codes
  const parsedCourses = useMemo(() => {
    if (!coursesInput) return [];
    return Array.from(
      new Set(
        coursesInput
          .split(',')
          .map((c) => c.trim().toUpperCase())
          .filter(Boolean)
      )
    );
  }, [coursesInput]);

  // Check which existing courses for this student are already locked
  const lockedCourseCodes = useMemo(() => {
    if (!record) return [];
    const activeSession = record.session || currentSession;
    return allCourseEvaluations
      .filter(
        (ce) =>
          (ce.intakeId === record.id || ce.enrollmentNo.trim() === record.enrollmentNo.trim()) &&
          ce.session.trim().toLowerCase() === activeSession.trim().toLowerCase() &&
          (ce.isLocked || (ce.status as any) === 'Locked' || ce.status === 'Marks Locked')
      )
      .map((ce) => ce.courseCode.toUpperCase());
  }, [record, currentSession, allCourseEvaluations]);

  // Real-time Background Data Entry Validation Service for Edits:
  // Validates enrollment numbers, candidate names, phone, programme, dates before pushing to Google Sheets
  const realtimeValidation = useMemo(() => {
    return runBackgroundDataEntryValidation(
      {
        enrollmentNo,
        studentName: candidateName,
        studentPhone: contact,
        programmeCode: programme,
        courseCodes: parsedCourses,
        submissionDate,
        session: record?.session || currentSession,
      },
      {
        existingEvaluations: allCourseEvaluations,
        currentIntakeId: record?.id,
        currentSession: record?.session || currentSession,
      }
    );
  }, [
    enrollmentNo,
    candidateName,
    contact,
    programme,
    parsedCourses,
    submissionDate,
    record,
    currentSession,
    allCourseEvaluations,
  ]);

  if (!isOpen || !record) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Pre-Push Background Validation Check
    if (!realtimeValidation.isValid) {
      const primaryErr = realtimeValidation.errors[0] || 'Data entry validation failed. Please correct errors before saving.';
      setFormError(primaryErr);
      return;
    }

    const cleanEnr = enrollmentNo.trim();
    const cleanName = candidateName.trim();
    const cleanContact = contact.trim();
    const cleanProg = programme.trim().toUpperCase();

    if (!cleanEnr) {
      setFormError('Please enter a valid Enrollment Number.');
      return;
    }

    if (cleanEnr.length < 7 || cleanEnr.length > 12) {
      setFormError('Enrollment Number is typically 9 or 10 digits.');
      return;
    }

    if (!cleanName) {
      setFormError('Please enter Student / Candidate Name.');
      return;
    }

    if (cleanContact && cleanContact.length !== 10) {
      setFormError("Contact number must be exactly 10 digits.");
      return;
    }

    if (!cleanProg) {
      setFormError('Please enter or select a Programme code (e.g., MEG, BAG, MPS).');
      return;
    }

    if (parsedCourses.length === 0) {
      setFormError('Please enter at least one Course Code (e.g. MEG01, MEG02).');
      return;
    }

    if (parsedCourses.length > 20) {
      setFormError('Maximum 20 courses can be registered in a single intake receipt.');
      return;
    }

    // Check if any course that was already locked is being removed
    const removedLockedCourses = lockedCourseCodes.filter((c) => !parsedCourses.includes(c));
    if (removedLockedCourses.length > 0) {
      setFormError(
        `Cannot remove locked course(s): ${removedLockedCourses.join(', ')}. Marks have already been locked by Coordinator.`
      );
      return;
    }

    // Strict Enforcement of Rule 1, Rule 2, and Rule 3 via Validation Engine
    const validation = validateIntake({
      enrollmentNo: cleanEnr,
      programmeCode: cleanProg,
      courseCodes: parsedCourses,
      session: record.session || currentSession,
      currentIntakeId: record.id,
    });

    if (!validation.valid) {
      setFormError(validation.reason);
      return;
    }

    try {
      setIsSubmitting(true);
      // Perform optimistic state update & dispatch POST EDIT_INTAKE via AppContext
      await editIntakeEntry({
        id: record.id,
        originalEnrollmentNo: originalEnrollmentNo.trim(),
        enrollmentNo: cleanEnr,
        candidateName: cleanName,
        contact: cleanContact,
        programme: cleanProg,
        courses: parsedCourses,
        session: record.session || currentSession,
        submissionDate: submissionDate.trim(),
      });

      if (submissionDate.trim()) {
        await updateIntakeDate(record.id || record.tokenNo, submissionDate.trim());
      }

      setIsSubmitting(false);
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setFormError(err?.message || 'Failed to update intake receipt.');
    }
  };

  return (
    <div
      id="edit-intake-modal-backdrop"
      className="fixed inset-0 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="edit-intake-modal"
        className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-zinc-900 text-sm sm:text-base flex items-center gap-2">
                <span>Edit Intake Receipt</span>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200">
                  {record.tokenNo}
                </span>
              </h3>
              <p className="text-[11px] text-zinc-500">
                Update student identity or course registrations for session{' '}
                <strong className="text-zinc-700">{record.session || currentSession}</strong>.
              </p>
            </div>
          </div>

          <button
            id="edit-intake-close-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {formError && (
            <div
              id="edit-intake-error"
              className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>{formError}</div>
            </div>
          )}

          {/* Original Enrollment Info Badge */}
          <div className="p-2.5 bg-zinc-100 rounded-xl flex items-center justify-between text-xs text-zinc-600">
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4 text-zinc-500" />
              <span>Original Enrollment ID:</span>
              <strong className="font-mono text-zinc-900">{originalEnrollmentNo}</strong>
            </div>
            <span className="text-[10px] text-zinc-500">
              Receipt Token: <span className="font-mono">{record.tokenNo}</span>
            </span>
          </div>

          {/* Rule 1 Conflict Banner */}
          {isProgrammeConflict && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-900 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold text-rose-950">Rule 1 Scope Conflict:</strong> Enrollment Number{' '}
                <strong className="font-mono text-rose-950">{enrollmentNo}</strong> is registered under Programme{' '}
                <strong className="font-mono text-rose-950">{registeredProg}</strong>. In IGNOU, an enrollment number cannot exist in a different programme.
              </div>
            </div>
          )}

          {/* Grid: Enrollment Number & Student Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="edit-enrollment-input"
                className="block text-xs font-bold text-zinc-700 mb-1"
              >
                Enrollment Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Hash className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                <input
                  id="edit-enrollment-input"
                  type="text"
                  maxLength={10}
                  value={enrollmentNo}
                  onChange={(e) => setEnrollmentNo(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g., 2401928371"
                  required
                  className={`w-full pl-9 pr-3 py-2 text-xs font-mono font-bold border rounded-lg focus:outline-hidden transition ${
                    enrollmentNo.trim().length === 0
                      ? 'border-zinc-300 focus:ring-2 focus:ring-indigo-500'
                      : realtimeValidation.fields.enrollmentNo.valid
                      ? 'border-emerald-400 bg-emerald-50/20 focus:ring-2 focus:ring-emerald-500 text-emerald-950'
                      : 'border-rose-400 bg-rose-50/25 focus:ring-2 focus:ring-rose-500 text-rose-950'
                  }`}
                />
              </div>
              {enrollmentNo.trim().length > 0 && (
                <div
                  className={`mt-1.5 px-2 py-0.5 rounded text-[10.5px] font-semibold flex items-center gap-1.5 transition animate-in fade-in ${
                    realtimeValidation.fields.enrollmentNo.valid
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                      : 'bg-rose-50 text-rose-800 border border-rose-300'
                  }`}
                >
                  {realtimeValidation.fields.enrollmentNo.valid ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  )}
                  <span>{realtimeValidation.fields.enrollmentNo.message}</span>
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="edit-student-name-input"
                className="block text-xs font-bold text-zinc-700 mb-1"
              >
                Candidate Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                <input
                  id="edit-student-name-input"
                  type="text"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  placeholder="Full student name"
                  required
                  className={`w-full pl-9 pr-3 py-2 text-xs font-semibold border rounded-lg focus:outline-hidden transition ${
                    candidateName.trim().length === 0
                      ? 'border-zinc-300 focus:ring-2 focus:ring-indigo-500'
                      : realtimeValidation.fields.studentName.valid
                      ? 'border-emerald-400 bg-emerald-50/20 focus:ring-2 focus:ring-emerald-500 text-emerald-950'
                      : 'border-rose-400 bg-rose-50/25 focus:ring-2 focus:ring-rose-500 text-rose-950'
                  }`}
                />
              </div>
              {candidateName.trim().length > 0 && (
                <div
                  className={`mt-1.5 px-2 py-0.5 rounded text-[10.5px] font-semibold flex items-center gap-1.5 transition animate-in fade-in ${
                    realtimeValidation.fields.studentName.valid
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-300'
                  }`}
                >
                  {realtimeValidation.fields.studentName.valid ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  )}
                  <span>{realtimeValidation.fields.studentName.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* Grid: Contact Number, Programme & Intake Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="edit-contact-input"
                className="block text-xs font-bold text-zinc-700 mb-1"
              >
                Contact / Mobile Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                <input
                  id="edit-contact-input"
                  type="tel"
                  maxLength={10}
                  pattern="[6-9][0-9]{9}"
                  value={contact}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setContact(val);
                  }}
                  onInput={(e: any) => {
                    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
                  }}
                  placeholder="10-digit mobile (e.g. 9436013686)"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="edit-programme-input"
                className="block text-xs font-bold text-zinc-700 mb-1"
              >
                Programme Code <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <BookOpen className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                <input
                  id="edit-programme-input"
                  type="text"
                  value={programme}
                  onChange={(e) => setProgramme(e.target.value.toUpperCase())}
                  placeholder="e.g., MEG, BAG, MPS"
                  required
                  className="w-full pl-9 pr-3 py-2 text-xs font-mono font-bold uppercase border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="edit-intake-date-input"
                  className="block text-xs font-bold text-zinc-700"
                >
                  Intake / Receipt Date <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() - 1);
                      setSubmissionDate(d.toISOString().split('T')[0]);
                    }}
                    className="text-[10px] text-zinc-500 hover:text-zinc-800 font-medium cursor-pointer"
                    title="Set to yesterday"
                  >
                    Yesterday
                  </button>
                  <span className="text-zinc-300">•</span>
                  <button
                    type="button"
                    onClick={() => setSubmissionDate(new Date().toISOString().split('T')[0])}
                    className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                    title="Set to today"
                  >
                    Today
                  </button>
                </div>
              </div>
              <div className="relative">
                <Calendar className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                <input
                  id="edit-intake-date-input"
                  type="date"
                  value={submissionDate}
                  onChange={(e) => setSubmissionDate(e.target.value)}
                  required
                  max="2099-12-31"
                  className="w-full pl-9 pr-3 py-2 text-xs font-bold border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white"
                />
              </div>
              <span className="text-[10px] text-zinc-500 mt-0.5 block truncate">
                {formatDate(submissionDate)}
              </span>
            </div>
          </div>

          {/* Courses Field (Comma-separated) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="edit-courses-input"
                className="block text-xs font-bold text-zinc-700"
              >
                Registered Courses (Comma-separated){' '}
                <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] text-zinc-500">
                {parsedCourses.length} course{parsedCourses.length === 1 ? '' : 's'} recognized
              </span>
            </div>

            <input
              id="edit-courses-input"
              type="text"
              value={coursesInput}
              onChange={(e) => setCoursesInput(e.target.value)}
              placeholder="e.g. MEG01, MEG02, MEG03, MEG04"
              required
              className="w-full px-3 py-2 text-xs font-mono border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
            <p className="text-[10px] text-zinc-500 mt-1">
              Separate course codes with commas. Multiple courses allowed per student intake.
            </p>

            {/* Real-time recognized course chips */}
            {parsedCourses.length > 0 && (
              <div className="mt-2.5 p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2">
                <div className="text-[10px] uppercase font-bold text-zinc-500 mb-1 flex items-center justify-between">
                  <span>Recognized Course List:</span>
                  {lockedCourseCodes.length > 0 && (
                    <span className="text-amber-800 font-semibold flex items-center gap-1 text-[10px]">
                      <Lock className="w-3 h-3 text-amber-700" />
                      {lockedCourseCodes.length} course(s) locked
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {parsedCourses.map((c) => {
                    const isLocked = lockedCourseCodes.includes(c);
                    const isPrac = realtimeValidation.separated.practicalCourses.includes(c);
                    return (
                      <span
                        key={c}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-bold border ${
                          isLocked
                            ? 'bg-amber-100 text-amber-950 border-amber-300'
                            : isPrac
                            ? 'bg-purple-100 text-purple-950 border-purple-300'
                            : 'bg-amber-50 text-amber-950 border-amber-300'
                        }`}
                      >
                        {isLocked && <Lock className="w-3 h-3 text-amber-700" />}
                        {isPrac && <FlaskConical className="w-3 h-3 text-purple-600" />}
                        {!isLocked && !isPrac && <FileCheck className="w-3 h-3 text-amber-600" />}
                        {c}
                        <span className="text-[9px] font-sans font-semibold">
                          {isLocked ? '(Locked)' : isPrac ? '(Practical)' : '(TMA)'}
                        </span>
                      </span>
                    );
                  })}
                </div>

                {/* Strict TMA vs Practical Separation Gate */}
                <div className="pt-2 border-t border-zinc-200 grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded bg-amber-50/70 border border-amber-200">
                    <div className="text-[10px] font-bold text-amber-900 flex items-center gap-1">
                      <FileCheck className="w-3 h-3 text-amber-600" />
                      <span>Assignment (TMA): {realtimeValidation.separated.assignmentCourses.length}</span>
                    </div>
                    <div className="text-[10.5px] font-mono text-amber-950 mt-0.5 truncate">
                      {realtimeValidation.separated.assignmentCourses.join(', ') || 'None'}
                    </div>
                  </div>
                  <div className="p-2 rounded bg-purple-50/70 border border-purple-200">
                    <div className="text-[10px] font-bold text-purple-900 flex items-center gap-1">
                      <FlaskConical className="w-3 h-3 text-purple-600" />
                      <span>Practical: {realtimeValidation.separated.practicalCourses.length}</span>
                    </div>
                    <div className="text-[10.5px] font-mono text-purple-950 mt-0.5 truncate">
                      {realtimeValidation.separated.practicalCourses.join(', ') || 'None'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Pre-Push Background Validation Card */}
          <div
            id="edit-background-validation-card"
            className={`p-3 rounded-xl border transition-all ${
              realtimeValidation.isValid
                ? 'bg-emerald-50/90 border-emerald-300 shadow-xs'
                : 'bg-rose-50/90 border-rose-300 shadow-xs'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {realtimeValidation.isValid ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <div className={`text-xs font-bold ${realtimeValidation.isValid ? 'text-emerald-950' : 'text-rose-950'}`}>
                  {realtimeValidation.isValid
                    ? '✓ Pre-Push Validation Passed: Safe to Sync with Google Sheets'
                    : `⚠️ Pre-Push Validation Blocked (${realtimeValidation.errors.length} Issue${realtimeValidation.errors.length === 1 ? '' : 's'})`}
                </div>
                <p className={`text-[11px] mt-0.5 ${realtimeValidation.isValid ? 'text-emerald-800' : 'text-rose-800'}`}>
                  {realtimeValidation.isValid
                    ? 'TMA and Practical courses strictly separated. Format ready for Google Sheets dispatch.'
                    : realtimeValidation.errors.join('; ')}
                </p>
              </div>
            </div>
          </div>

          {/* Sync & Persistence Guarantee Note */}
          <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl text-[11px] text-indigo-900 space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>Optimistic State & Google Sheets Sync</span>
            </div>
            <p className="text-[10px] text-indigo-800 leading-relaxed">
              Submitting updates both the <strong>Intake Register</strong> and the individual course rows in <strong>Course Ledger</strong>.
              A dispatch with action <code className="bg-white/80 px-1 py-0.2 rounded font-mono">EDIT_INTAKE</code> is sent to the Google Apps Script backend.
            </p>
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-zinc-200 flex items-center justify-end gap-2.5">
            <button
              id="edit-intake-cancel-btn"
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-zinc-300 text-zinc-700 hover:bg-zinc-100 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="edit-intake-save-btn"
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Saving & Syncing...' : 'Save & Sync Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
