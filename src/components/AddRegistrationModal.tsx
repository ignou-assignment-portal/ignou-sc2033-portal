import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { RegistrationCadre, AcademicYearLevel, StudentRegistrationRecord } from '../types';
import { getProgrammeDurationInfo, getAssignmentSubmissionEligibility, parseProgrammeWithYear } from '../utils/helpers';
import { getYearSpecificCourseCodes } from '../data/ignouComprehensiveCatalog';
import { X, UserPlus, BookOpen, GraduationCap, CheckCircle2, Clock, Check, Plus, Sparkles } from 'lucide-react';

interface AddRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCadre?: RegistrationCadre;
  initialEnrollmentNo?: string;
  initialProgrammeCode?: string;
}

export const AddRegistrationModal: React.FC<AddRegistrationModalProps> = ({
  isOpen,
  onClose,
  defaultCadre = 'FRESH',
  initialEnrollmentNo = '',
  initialProgrammeCode = '',
}) => {
  const {
    currentSession,
    availableSessions,
    allProgrammes,
    getProgrammeCourses,
    getCourseTitle,
    addStudentRegistration,
    showToast,
  } = useApp();

  const [cadre, setCadre] = useState<RegistrationCadre>(defaultCadre);
  const [programmeCode, setProgrammeCode] = useState(initialProgrammeCode || 'BAG');
  const durationInfo = useMemo(() => getProgrammeDurationInfo(programmeCode), [programmeCode]);

  const [academicYear, setAcademicYear] = useState<AcademicYearLevel>(
    defaultCadre === 'FRESH' ? '1st Year' : '2nd Year'
  );
  const [enrollmentNo, setEnrollmentNo] = useState(initialEnrollmentNo);
  const [studentName, setStudentName] = useState('');
  const [session, setSession] = useState(currentSession || 'July 2026');
  const [courseInput, setCourseInput] = useState('');
  const [studentPhone, setStudentPhone] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [feeReference, setFeeReference] = useState('');
  const [status, setStatus] = useState<'Confirmed' | 'Provisional'>('Confirmed');

  const programmeCourses = useMemo(() => {
    return getProgrammeCourses(programmeCode);
  }, [programmeCode, getProgrammeCourses]);

  const yearSpecificCourses = useMemo(() => {
    return getYearSpecificCourseCodes(programmeCode, academicYear);
  }, [programmeCode, academicYear]);

  const selectedCoursesList = useMemo(() => {
    return courseInput
      .split(/[,;\s]+/)
      .map((c) => c.trim().toUpperCase())
      .filter((c) => c.length >= 3);
  }, [courseInput]);

  const eligibility = useMemo(() => {
    return getAssignmentSubmissionEligibility(cadre, session, academicYear);
  }, [cadre, session, academicYear]);

  React.useEffect(() => {
    if (isOpen) {
      setCadre(defaultCadre);
      setAcademicYear(defaultCadre === 'FRESH' ? '1st Year' : '2nd Year');
      setEnrollmentNo(initialEnrollmentNo);
      if (initialProgrammeCode) setProgrammeCode(initialProgrammeCode);
      setStudentName('');
      setCourseInput('');
      setStudentPhone('');
      setStudentEmail('');
      setFeeReference('');
      setStatus('Confirmed');
    }
  }, [isOpen, defaultCadre, initialEnrollmentNo, initialProgrammeCode]);

  // Adjust academic year if programme changes to Master (which only has 2 years)
  React.useEffect(() => {
    if (durationInfo.level === 'Master' && academicYear === '3rd Year') {
      setAcademicYear('2nd Year');
    }
  }, [durationInfo, academicYear]);

  const toggleCourseInInput = (code: string) => {
    const clean = code.trim().toUpperCase();
    if (selectedCoursesList.includes(clean)) {
      const remaining = selectedCoursesList.filter((c) => c !== clean);
      setCourseInput(remaining.join(', '));
    } else {
      const updated = [...selectedCoursesList, clean];
      setCourseInput(updated.join(', '));
    }
  };

  const selectAllProgrammeCourses = () => {
    const codes = (yearSpecificCourses.length > 0 ? yearSpecificCourses : programmeCourses.map((c) => c.code.toUpperCase()));
    setCourseInput(codes.join(', '));
  };

  const autoFillYearSyllabus = () => {
    if (yearSpecificCourses.length > 0) {
      setCourseInput(yearSpecificCourses.join(', '));
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEnroll = enrollmentNo.trim().toUpperCase().replace(/[^0-9A-Z]/g, '');
    if (!cleanEnroll) {
      showToast('Please enter a valid Enrollment Number.', 'error');
      return;
    }
    if (!studentName.trim()) {
      showToast('Please enter Candidate Name.', 'error');
      return;
    }

    const coursesArray = selectedCoursesList;
    if (coursesArray.length === 0) {
      showToast('Please select or enter at least one registered course code.', 'error');
      return;
    }

    const sessionCycle: 'January' | 'July' = session.toLowerCase().includes('jan')
      ? 'January'
      : 'July';
    const yearMatch = session.match(/\d{4}/);
    const sessionYear = yearMatch ? parseInt(yearMatch[0], 10) : new Date().getFullYear();

    const selectedProg = allProgrammes.find((p) => p.code.toUpperCase() === programmeCode.toUpperCase());

    addStudentRegistration({
      cadre,
      academicYear,
      enrollmentNo: cleanEnroll,
      studentName: studentName.trim().toUpperCase(),
      programmeCode: programmeCode.toUpperCase(),
      programmeName: selectedProg?.name,
      session,
      sessionCycle,
      sessionYear,
      courseCodes: coursesArray,
      studentPhone: studentPhone.trim().replace(/\D/g, '').slice(0, 10),
      studentEmail: studentEmail.trim().toLowerCase(),
      registrationDate: new Date().toISOString().split('T')[0],
      status,
      feeReference: feeReference.trim(),
      studyCentreCode: '2033',
      regionalCentreCode: 'RC-20',
    });

    showToast(
      `Candidate ${studentName.toUpperCase()} (${cleanEnroll}) registered in ${cadre === 'FRESH' ? 'Fresh Admission' : 'Re-Registration'} for ${session}. Registered courses: ${coursesArray.join(', ')}`,
      'success'
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-300 overflow-hidden my-auto">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shrink-0">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black tracking-tight text-white">
                New Student Registration Entry
              </h2>
              <p className="text-[11px] text-slate-400">
                Register candidate for Fresh Admission (1st Year) or Re-Registration (2nd/3rd Year)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Cadre & Academic Year Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Registration Cadre <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setCadre('FRESH');
                    setAcademicYear('1st Year');
                  }}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                    cadre === 'FRESH'
                      ? 'bg-white text-indigo-950 shadow-2xs border border-indigo-300'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Fresh (1st Yr)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCadre('RE_REGISTRATION');
                    setAcademicYear('2nd Year');
                  }}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                    cadre === 'RE_REGISTRATION'
                      ? 'bg-white text-indigo-950 shadow-2xs border border-indigo-300'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Re-Reg (Yr 2/3)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Academic Year Level <span className="text-rose-500">*</span>
              </label>
              <select
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value as AcademicYearLevel)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-900"
              >
                {cadre === 'FRESH' ? (
                  <option value="1st Year">1st Year (Fresh Admission)</option>
                ) : durationInfo.level === 'Master' ? (
                  <option value="2nd Year">2nd Year (Re-Registration - Master Degree)</option>
                ) : (
                  <>
                    <option value="2nd Year">2nd Year (Re-Registration)</option>
                    <option value="3rd Year">3rd Year (Re-Registration - Final Year)</option>
                    <option value="Semester">Semester-wise Programme</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Academic Cycle & Eligibility Banner */}
          <div className="p-3 bg-indigo-50/90 border border-indigo-200 rounded-xl text-xs text-indigo-950 flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div className="font-extrabold text-indigo-950 flex items-center gap-2">
                <span>{durationInfo.description}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 bg-indigo-200 text-indigo-900 rounded font-bold">
                  {durationInfo.level === 'Master' ? '2-Year Cycle' : '3-Year Cycle'}
                </span>
              </div>
              <div className="text-[11px] text-indigo-800">
                {eligibility.description}
              </div>
            </div>
          </div>

          {/* Student Identifiers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Enrollment Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={10}
                value={enrollmentNo}
                onChange={(e) => setEnrollmentNo(e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 2401928371 (9 or 10 digits)"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs font-bold text-slate-900 uppercase focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Candidate Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="e.g. Aarav Sharma"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 uppercase focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Programme & Session */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Programme Code <span className="text-rose-500">*</span>
              </label>
              <select
                value={programmeCode}
                onChange={(e) => setProgrammeCode(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900"
              >
                {allProgrammes.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.code} - {p.name} ({p.level})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Admission / Re-Reg Session <span className="text-rose-500">*</span>
              </label>
              <select
                value={session}
                onChange={(e) => setSession(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900"
              >
                <option value="July 2026">July 2026</option>
                <option value="January 2026">January 2026</option>
                <option value="July 2025">July 2025</option>
                <option value="January 2025">January 2025</option>
                <option value="July 2024">July 2024</option>
                <option value="January 2024">January 2024</option>
                {availableSessions
                  .filter((s) => !['July 2026', 'January 2026', 'July 2025', 'January 2025', 'July 2024', 'January 2024'].includes(s))
                  .map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Registered Courses Taken */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-800">
                Registered Course Codes Taken <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                {yearSpecificCourses.length > 0 && (
                  <button
                    type="button"
                    onClick={autoFillYearSyllabus}
                    className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300 flex items-center gap-1 cursor-pointer transition"
                    title={`Fill course codes specifically for ${programmeCode} ${academicYear}`}
                  >
                    <Sparkles className="w-3 h-3 text-emerald-600" />
                    <span>Fill {academicYear} Syllabus ({yearSpecificCourses.length})</span>
                  </button>
                )}
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                  {selectedCoursesList.length} courses entered
                </span>
              </div>
            </div>
            <input
              type="text"
              required
              value={courseInput}
              onChange={(e) => setCourseInput(e.target.value)}
              placeholder="e.g. BRL-101, BRL-102, BRL-103 or MCO-01, MCO-03, MCO-04"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs text-slate-900 uppercase focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              These registered courses will automatically be read by the Intake Desk when the candidate submits their assignments.
            </p>

            {/* Quick Catalog Suggestions for Programme */}
            {programmeCourses.length > 0 && (
              <div className="mt-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-600 font-semibold">
                  <span>Quick select courses for {programmeCode} ({programmeCourses.length} in catalog):</span>
                  <div className="flex items-center gap-2">
                    {yearSpecificCourses.length > 0 && (
                      <button
                        type="button"
                        onClick={autoFillYearSyllabus}
                        className="text-emerald-700 hover:text-emerald-900 font-bold cursor-pointer underline text-[11px]"
                      >
                        {academicYear} Only ({yearSpecificCourses.length})
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={selectAllProgrammeCourses}
                      className="text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer underline text-[11px]"
                    >
                      Select All
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1 bg-white rounded border border-slate-200">
                  {programmeCourses.map((c) => {
                    const isSel = selectedCoursesList.includes(c.code.toUpperCase());
                    return (
                      <button
                        type="button"
                        key={c.code}
                        onClick={() => toggleCourseInInput(c.code)}
                        className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold flex items-center gap-1 cursor-pointer transition ${
                          isSel
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-indigo-50 border border-slate-200'
                        }`}
                        title={c.title}
                      >
                        {isSel ? <Check className="w-3 h-3 text-white" /> : <Plus className="w-3 h-3 text-slate-400" />}
                        <span>{c.code}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Contact Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Mobile Contact Phone</label>
              <input
                type="tel"
                value={studentPhone}
                onChange={(e) => setStudentPhone(e.target.value)}
                placeholder="e.g. 9436013686"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Student Email Address</label>
              <input
                type="email"
                value={studentEmail}
                onChange={(e) => setStudentEmail(e.target.value)}
                placeholder="e.g. student@gmail.com"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save Student Registration</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
