import React, { useState, useEffect, useMemo } from 'react';
import { useApp, norm } from '../context/AppContext';
import { formatDate, formatDateTime, isPracticalCourse } from '../utils/helpers';
import { Printer, X, CheckCircle2, AlertTriangle, Calendar, FlaskConical, Pencil, Trash2, QrCode } from 'lucide-react';
import { EditIntakeModal } from './EditIntakeModal';
import { IntakeRecord } from '../types';
import { InstitutionalSeal } from './InstitutionalSeal';
import { ReceiptQRCode } from './ReceiptQRCode';

export const ReceiptModal: React.FC = () => {
  const {
    selectedReceiptRecord,
    closeReceiptModal,
    updateIntakeDate,
    deleteIntakeRecord,
    allIntakes,
    allCourseEvaluations,
    isAdmin,
    verifyAndSetAdminRole,
    showToast,
    settings,
    allProgrammes,
    getCourseInfo,
    getCourseTitle,
  } = useApp();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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

  const receiptDateVal = normalizeDateInput(
    selectedReceiptRecord?.submissionDate ||
    (selectedReceiptRecord as any)?.receiptDate ||
    (selectedReceiptRecord as any)?.Submission_Date ||
    selectedReceiptRecord?.Timestamp ||
    selectedReceiptRecord?.createdAt
  );

  const [currentReceiptDate, setCurrentReceiptDate] = useState(receiptDateVal);

  useEffect(() => {
    setCurrentReceiptDate(receiptDateVal);
  }, [receiptDateVal]);

  // Programme info from dynamic registry
  const progInfo = allProgrammes.find((p) => p.code === selectedReceiptRecord?.programmeCode);

  // Safely extract course codes array from any record shape (courseCodes, courses, Courses)
  const rawRecordCourses =
    selectedReceiptRecord?.courseCodes ||
    (selectedReceiptRecord as any)?.courses ||
    (selectedReceiptRecord as any)?.Courses ||
    [];
  const safeCourseCodes: string[] = Array.isArray(rawRecordCourses)
    ? rawRecordCourses
    : typeof rawRecordCourses === 'string'
    ? rawRecordCourses.split(',').map((c: string) => c.trim()).filter(Boolean)
    : [];

  const matchingIntakeRecord: IntakeRecord | null = useMemo(() => {
    if (!selectedReceiptRecord) return null;
    const found = allIntakes.find(
      (i) =>
        i.id === selectedReceiptRecord.id ||
        i.tokenNo === selectedReceiptRecord.tokenNo ||
        (selectedReceiptRecord.enrollmentNo && i.enrollmentNo.trim() === selectedReceiptRecord.enrollmentNo.trim())
    );
    if (found) {
      return {
        ...found,
        submissionDate: currentReceiptDate || found.submissionDate,
      };
    }

    return {
      id: selectedReceiptRecord.id || selectedReceiptRecord.tokenNo || `REC-${Date.now()}`,
      tokenNo: selectedReceiptRecord.tokenNo || 'INT-ACK',
      enrollmentNo: selectedReceiptRecord.enrollmentNo || '',
      studentName: selectedReceiptRecord.studentName || (selectedReceiptRecord as any).candidateName || '',
      studentPhone: selectedReceiptRecord.studentPhone || (selectedReceiptRecord as any).contact || '',
      studentEmail: selectedReceiptRecord.studentEmail || '',
      programmeCode: selectedReceiptRecord.programmeCode || '',
      courseCodes: safeCourseCodes,
      session: selectedReceiptRecord.session || '',
      submissionDate: currentReceiptDate,
      submissionMode: selectedReceiptRecord.submissionMode || 'In-Person (Desk)',
      status: selectedReceiptRecord.status || 'Received',
      registeredBy: (selectedReceiptRecord as any).registeredBy || (selectedReceiptRecord as any).receivedBy || 'Desk Official',
      createdAt: selectedReceiptRecord.createdAt || new Date().toISOString(),
      marks: (selectedReceiptRecord as any).marks || {},
    } as unknown as IntakeRecord;
  }, [selectedReceiptRecord, allIntakes, currentReceiptDate, safeCourseCodes]);

  if (!selectedReceiptRecord) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setCurrentReceiptDate(newDate);
    if (newDate) {
      await updateIntakeDate(selectedReceiptRecord.id || selectedReceiptRecord.tokenNo, newDate);
      showToast(`Receipt intake date updated to ${formatDate(newDate)} across all linked records.`, 'success');
    }
  };

  const handleEditClick = () => {
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = () => {
    if (!selectedReceiptRecord) return;
    const candName = selectedReceiptRecord.studentName || (selectedReceiptRecord as any).candidateName || 'Candidate';
    const enr = selectedReceiptRecord.enrollmentNo || '-';
    const activeSession = selectedReceiptRecord.session;

    // 1. Operator vs Coordinator check: Require PIN 2033 for deletion
    if (!isAdmin) {
      const enteredPin = window.prompt('Coordinator PIN Required: Enter PIN 2033 to authorize deletion of intake records:');
      if (!enteredPin) return;
      if (enteredPin.trim() === '2033') {
        const authorized = verifyAndSetAdminRole('2033');
        if (!authorized) {
          showToast('Coordinator PIN verification failed.', 'error');
          return;
        }
      } else {
        showToast('Unauthorized: Incorrect Coordinator PIN.', 'error');
        return;
      }
    }

    // 2. Lock check: cannot delete if marks are locked
    const isAnyCourseLocked = allCourseEvaluations.some(
      (ce) =>
        (ce.intakeId === selectedReceiptRecord.id || ce.enrollmentNo.trim() === String(enr).trim()) &&
        (!activeSession || norm(ce.session) === norm(activeSession)) &&
        (ce.isLocked || (ce.status as any) === 'Locked' || ce.status === 'Marks Locked')
    );

    if (isAnyCourseLocked) {
      showToast('Cannot delete intake. Marks have already been locked for one or more courses.', 'error');
      return;
    }

    // 3. Confirm deletion
    const confirmed = window.confirm(
      `Delete Intake Receipt?\n\nAre you sure you want to delete intake record for ${candName} (${enr})?\n\nThis will completely purge the intake record and cascade cleanup across Course Ledger, Receipts, and Submissions.`
    );

    if (confirmed) {
      deleteIntakeRecord(selectedReceiptRecord.id || selectedReceiptRecord.tokenNo);
      closeReceiptModal();
      showToast(`Intake record for ${candName} (${enr}) deleted successfully.`, 'success');
    }
  };

  // Simulated barcode stripes pattern
  const barcodePattern = [
    3, 1, 2, 1, 4, 1, 2, 3, 1, 2, 1, 3, 2, 4, 1, 2, 1, 3, 1, 4, 2, 1, 3, 2, 1, 2, 4, 1, 3, 1, 2, 3, 1, 4
  ];

  return (
    <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-zinc-300 overflow-hidden my-auto print:m-0 print:border-none print:shadow-none print:w-full print:rounded-none">
        {/* Modal Action Bar (Hidden on print) */}
        <div className="px-5 py-3 bg-zinc-900 text-white flex flex-wrap items-center justify-between gap-2.5 print:hidden">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="truncate">Official Assignment Submission Acknowledgment</span>
          </div>
          <div className="flex items-center flex-wrap gap-2">
            {/* Quick Date Selector */}
            <div className="flex items-center gap-1.5 bg-zinc-800 border border-zinc-700 px-2.5 py-1 rounded-lg text-xs">
              <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <label htmlFor="modal-receipt-date-picker" className="text-[11px] text-zinc-300 font-medium">
                Date:
              </label>
              <input
                id="modal-receipt-date-picker"
                type="date"
                value={currentReceiptDate}
                onChange={handleDateChange}
                max="2099-12-31"
                className="bg-zinc-950 border border-zinc-700 text-white text-xs px-2 py-0.5 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-hidden cursor-pointer font-mono"
                title="Select or edit receipt intake date"
              />
              <button
                type="button"
                onClick={async () => {
                  const d = new Date();
                  d.setDate(d.getDate() - 1);
                  const yesterday = d.toISOString().split('T')[0];
                  setCurrentReceiptDate(yesterday);
                  await updateIntakeDate(selectedReceiptRecord.id || selectedReceiptRecord.tokenNo, yesterday);
                  showToast(`Receipt intake date updated to yesterday (${formatDate(yesterday)}).`, 'success');
                }}
                className="text-[10px] text-zinc-400 hover:text-white underline cursor-pointer ml-1"
                title="Set receipt date to yesterday"
              >
                Yesterday
              </button>
              <button
                type="button"
                onClick={async () => {
                  const today = new Date().toISOString().split('T')[0];
                  setCurrentReceiptDate(today);
                  await updateIntakeDate(selectedReceiptRecord.id || selectedReceiptRecord.tokenNo, today);
                  showToast(`Receipt intake date updated to today (${formatDate(today)}).`, 'success');
                }}
                className="text-[10px] text-indigo-300 hover:text-white underline cursor-pointer ml-1"
                title="Set receipt date to today"
              >
                Today
              </button>
            </div>

            {/* Instant Edit Intake Button for Operators */}
            <button
              id="receipt-edit-btn"
              type="button"
              onClick={handleEditClick}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 hover:border-zinc-500 text-xs font-semibold rounded-lg transition shadow-xs cursor-pointer"
              title="Edit student details, courses, or submission date"
            >
              <Pencil className="w-3.5 h-3.5 text-indigo-400" />
              <span>Edit</span>
            </button>

            {/* Verify Online Deep-Link Button */}
            <button
              type="button"
              onClick={() => {
                const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : '';
                const url = `${origin}/?verify=${encodeURIComponent(selectedReceiptRecord.tokenNo.trim())}`;
                window.open(url, '_blank', 'noopener,noreferrer');
              }}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/70 hover:bg-emerald-900 text-emerald-200 border border-emerald-800 text-xs font-semibold rounded-lg transition shadow-xs cursor-pointer"
              title="Open student verification page directly as scanned via QR"
            >
              <QrCode className="w-3.5 h-3.5 text-emerald-400" />
              <span>Verify Online</span>
            </button>

            {/* Delete Intake Button - Requires PIN 2033 */}
            <button
              id="receipt-delete-btn"
              type="button"
              onClick={handleDeleteClick}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800 hover:border-rose-700 text-xs font-semibold rounded-lg transition shadow-xs cursor-pointer"
              title="Delete intake mistake (Requires Coordinator PIN 2033)"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Delete</span>
            </button>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              id="print-receipt-btn"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Acknowledgment</span>
            </button>

            {/* Close Button */}
            <button
              onClick={closeReceiptModal}
              className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Body */}
        <div className="p-4 sm:p-6 print:p-1 text-zinc-900 bg-white" id="printable-receipt">
          {/* Institutional Header */}
          <div className="text-center border-b-2 border-zinc-900 pb-2 print:pb-1">
            <div className="flex items-center justify-center gap-2 mb-1">
              <InstitutionalSeal size="sm" className="w-6 h-6 print:w-5 print:h-5 shrink-0" />
              <h1 className="text-xs sm:text-sm print:text-[11px] font-black tracking-tight text-zinc-950 uppercase">
                INDIRA GANDHI NATIONAL OPEN UNIVERSITY - STUDY CENTRE SC-2033
              </h1>
            </div>
            <div className="text-[11px] print:text-[8.5px] text-zinc-600 font-medium mt-0.5 print:mt-0">
              {settings.institutionName} • Regional Centre: {settings.regionalCentreCode}
            </div>
            <div className="inline-block mt-1 print:mt-0.5 px-3 py-0.5 print:py-0 rounded-full border border-zinc-900 text-[10px] print:text-[8px] font-black tracking-wider uppercase bg-zinc-100">
              {((selectedReceiptRecord as any).practicalCourses?.length > 0 && !(selectedReceiptRecord as any).assignmentCourses?.length)
                ? 'OFFICIAL STUDENT PRACTICAL SUBMISSION ACKNOWLEDGMENT RECEIPT'
                : ((selectedReceiptRecord as any).practicalCourses?.length > 0)
                ? 'OFFICIAL STUDENT ASSIGNMENT & PRACTICAL SUBMISSION ACKNOWLEDGMENT RECEIPT'
                : 'OFFICIAL STUDENT ASSIGNMENT SUBMISSION ACKNOWLEDGMENT RECEIPT'}
            </div>
          </div>

          {/* Session cycle, timestamp, submission counter ID */}
          <div className="mt-2 print:mt-1 p-2 print:p-1 bg-zinc-50 border border-zinc-300 rounded-lg grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs print:text-[9px]">
            <div>
              <span className="text-zinc-500 font-bold block text-[9px] print:text-[7.5px] uppercase">Token / Receipt No.</span>
              <span className="font-mono font-black text-xs print:text-[10px] text-indigo-950 tracking-wider">
                {selectedReceiptRecord.tokenNo}
              </span>
            </div>
            <div>
              <span className="text-zinc-500 font-bold block text-[9px] print:text-[7.5px] uppercase">Session Cycle</span>
              <span className="font-bold text-zinc-900">{selectedReceiptRecord.session}</span>
            </div>
            <div>
              <span className="text-zinc-500 font-bold block text-[9px] print:text-[7.5px] uppercase">Submission Counter ID</span>
              <span className="font-mono font-bold text-zinc-800">COUNTER-01 (Intake Desk)</span>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 font-bold block text-[9px] print:text-[7.5px] uppercase">
                  Intake Receipt Date
                </span>
                <span className="print:hidden text-[8px] text-indigo-600 font-bold uppercase tracking-wider">
                  (Editable)
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="font-bold text-zinc-900 text-xs print:text-[9.5px]">
                  {formatDate(currentReceiptDate || receiptDateVal)}
                </span>
                <input
                  type="date"
                  value={currentReceiptDate}
                  onChange={handleDateChange}
                  max="2099-12-31"
                  className="print:hidden text-[10px] font-mono border border-zinc-300 rounded px-1 py-0.2 bg-zinc-50 text-zinc-800 cursor-pointer focus:ring-1 focus:ring-indigo-500"
                  title="Change date of this receipt"
                />
              </div>
            </div>
          </div>

          {/* Barcode & Digital QR Code Verification Tracking Strip */}
          <div className="mt-1.5 print:mt-1 p-2 print:p-1 bg-white border border-zinc-300 rounded-lg flex items-center justify-between gap-3">
            {/* Linear Barcode */}
            <div className="flex flex-col items-start sm:items-center">
              <span className="text-[8px] print:text-[6.5px] text-zinc-500 font-bold uppercase tracking-wider mb-0.5">
                Physical Token Barcode
              </span>
              <div className="h-6 print:h-4.5 flex items-end gap-[1.5px] px-2 py-0.5 bg-zinc-50 border border-zinc-200 rounded">
                {barcodePattern.map((width, idx) => (
                  <div
                    key={idx}
                    className={`bg-zinc-950 ${idx % 2 === 0 ? 'h-full' : 'h-3/4'}`}
                    style={{ width: `${width * 1.2}px` }}
                  />
                ))}
              </div>
              <span className="font-mono text-[9px] print:text-[7.5px] text-zinc-700 font-bold tracking-widest mt-0.5">
                *{selectedReceiptRecord.tokenNo}*
              </span>
            </div>

            {/* Verification Status Center Badge */}
            <div className="hidden sm:flex flex-col items-center text-center px-1">
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-300 text-emerald-800 text-[10px] print:text-[8px] font-bold">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>Verified & Digitally Stamped</span>
              </div>
              <div className="text-[9.5px] print:text-[7.5px] text-zinc-500 font-mono mt-0.5">
                Enrol: {selectedReceiptRecord.enrollmentNo} • Prog: {selectedReceiptRecord.programmeCode}
              </div>
              <span className="text-[8px] print:text-[6.5px] text-zinc-400 mt-0.5 print:hidden">
                Scan QR to verify live on mobile
              </span>
            </div>

            {/* Unique 2D Mobile Verification QR Code */}
            <ReceiptQRCode
              tokenNo={selectedReceiptRecord.tokenNo}
              enrollmentNo={selectedReceiptRecord.enrollmentNo}
              studentName={selectedReceiptRecord.studentName}
              programmeCode={selectedReceiptRecord.programmeCode}
              session={selectedReceiptRecord.session}
              submissionDate={currentReceiptDate || receiptDateVal}
              courseCodes={safeCourseCodes}
              size={66}
            />
          </div>

          {/* Student Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 print:gap-1 mt-1.5 print:mt-1 text-xs print:text-[9px] border border-zinc-200 rounded-lg p-2 print:p-1 bg-zinc-50/60">
            <div>
              <div className="text-zinc-500 text-[9px] print:text-[7.5px] uppercase font-bold">Enrollment Number</div>
              <div className="text-xs print:text-[10px] font-mono font-black text-zinc-900 tracking-wider">
                {selectedReceiptRecord.enrollmentNo}
              </div>
            </div>
            <div>
              <div className="text-zinc-500 text-[9px] print:text-[7.5px] uppercase font-bold">Candidate Name</div>
              <div className="text-[11px] print:text-[9px] font-bold text-zinc-900 truncate">
                {selectedReceiptRecord.studentName}
              </div>
            </div>
            <div>
              <div className="text-zinc-500 text-[9px] print:text-[7.5px] uppercase font-bold">Contact Number</div>
              <div className="text-[11px] print:text-[9px] font-medium text-zinc-800">
                {selectedReceiptRecord.studentPhone || 'Not Provided'}
              </div>
            </div>
            <div>
              <div className="text-zinc-500 text-[9px] print:text-[7.5px] uppercase font-bold">Enrolled Programme</div>
              <div className="font-bold text-zinc-900 text-[11px] print:text-[9px] truncate">
                {selectedReceiptRecord.programmeCode} {progInfo ? `(${progInfo.name})` : ''}
              </div>
            </div>
          </div>

          {/* Submission Mode & Tracking */}
          <div className="mt-1 print:mt-0.5 text-xs print:text-[8.5px] flex items-center justify-between px-2 py-0.5 bg-zinc-100 rounded border border-zinc-200">
            <span className="text-zinc-700">
              <strong>Submission Mode: </strong>
              {selectedReceiptRecord.submissionMode}
              {selectedReceiptRecord.consignmentNo && (
                <span className="font-mono ml-2 text-indigo-900">
                  [Consignment/Speed Post: {selectedReceiptRecord.consignmentNo}]
                </span>
              )}
            </span>
            <span className="text-[10px] print:text-[8px] font-semibold text-emerald-800">
              Status: Verified at Desk
            </span>
          </div>

          {/* Bulleted / Structured Table of Registered Course Codes */}
          <div className="mt-1.5 print:mt-1">
            <div className="text-[11px] print:text-[8.5px] font-black text-zinc-900 mb-0.5 flex items-center justify-between uppercase tracking-wider">
              <span>
                REGISTERED {((selectedReceiptRecord as any).practicalCourses?.length > 0 && !(selectedReceiptRecord as any).assignmentCourses?.length) ? 'PRACTICAL' : ((selectedReceiptRecord as any).practicalCourses?.length > 0) ? 'COURSE (TMA & PRACTICAL)' : 'ASSIGNMENT (TMA)'} CODES ({safeCourseCodes.length} Course{safeCourseCodes.length === 1 ? '' : 's'})
              </span>
              <span className="text-[10px] print:text-[8px] font-semibold text-zinc-500 lowercase">
                session: {selectedReceiptRecord.session}
              </span>
            </div>
            <table className="w-full text-xs print:text-[8.5px] border border-zinc-300 rounded overflow-hidden">
              <thead className="bg-zinc-100 text-zinc-800 font-bold border-b border-zinc-300 uppercase text-[9px] print:text-[7.5px]">
                <tr>
                  <th className="py-1 print:py-0.5 px-2 print:px-1.5 text-left w-10 border-r border-zinc-300">S.No.</th>
                  <th className="py-1 print:py-0.5 px-2 print:px-1.5 text-left w-24 border-r border-zinc-300">Course Code</th>
                  <th className="py-1 print:py-0.5 px-2 print:px-1.5 text-left border-r border-zinc-300">Course Title</th>
                  <th className="py-1 print:py-0.5 px-2 print:px-1.5 text-center w-14 border-r border-zinc-300">Credits</th>
                  <th className="py-1 print:py-0.5 px-2 print:px-1.5 text-right">Physical Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {safeCourseCodes.map((code, index) => {
                  const cInfo = getCourseInfo(code, selectedReceiptRecord.programmeCode);
                  const title = cInfo?.title || getCourseTitle(code, selectedReceiptRecord.programmeCode) || 'Course Curriculum Module';
                  const credits = cInfo?.credits || 6;
                  return (
                    <tr key={code} className="hover:bg-zinc-50">
                      <td className="py-1 print:py-0.5 px-2 print:px-1.5 font-medium text-zinc-600 border-r border-zinc-200">
                        {index + 1}.
                      </td>
                      <td className="py-1 print:py-0.5 px-2 print:px-1.5 font-bold text-indigo-950 font-mono border-r border-zinc-200">
                        <div className="flex items-center gap-1">
                          <span>{code}</span>
                          {(() => {
                            const isPracInRecord = ((selectedReceiptRecord as any).practicalCourses || []).includes(code);
                            const isAsgnInRecord = ((selectedReceiptRecord as any).assignmentCourses || []).includes(code);
                            const isPrac = isPracInRecord || (!isAsgnInRecord && isPracticalCourse(code, title));
                            const isAsgn = isAsgnInRecord || (!isPracInRecord && !isPracticalCourse(code, title));
                            if (isPrac && isAsgn) {
                              return (
                                <span className="text-[8px] print:text-[6.5px] px-1 py-0 rounded bg-indigo-100 text-indigo-900 font-sans font-bold border border-indigo-200">
                                  TMA + Practical
                                </span>
                              );
                            }
                            if (isPrac) {
                              return (
                                <span className="text-[8px] print:text-[6.5px] px-1 py-0 rounded bg-purple-100 text-purple-800 font-sans font-bold border border-purple-200">
                                  Practical
                                </span>
                              );
                            }
                            return (
                              <span className="text-[8px] print:text-[6.5px] px-1 py-0 rounded bg-zinc-100 text-zinc-700 font-sans font-medium border border-zinc-200">
                                TMA
                              </span>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="py-1 print:py-0.5 px-2 print:px-1.5 text-zinc-800 border-r border-zinc-200 truncate max-w-[240px]">
                        {title}
                      </td>
                      <td className="py-1 print:py-0.5 px-2 print:px-1.5 text-center text-zinc-700 font-semibold border-r border-zinc-200">
                        {credits}
                      </td>
                      <td className="py-1 print:py-0.5 px-2 print:px-1.5 text-right text-emerald-800 font-bold text-[10px] print:text-[8px]">
                        ✓ Physical Script Received
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {selectedReceiptRecord.remarks && (
            <div className="mt-1 text-[10px] print:text-[8px] text-zinc-600 bg-zinc-50 p-1.5 print:p-1 rounded border border-zinc-200">
              <span className="font-bold text-zinc-800">Desk Verification Remarks: </span>
              {selectedReceiptRecord.remarks}
            </div>
          )}

          {/* Important Notices for the Learner */}
          <div className="mt-1.5 print:mt-1 p-2 print:p-1 rounded-lg border border-amber-200 bg-amber-50/70 text-[10px] print:text-[8px] text-amber-900">
            <div className="font-bold flex items-center gap-1 text-amber-950 mb-0.5">
              <AlertTriangle className="w-3 h-3 print:w-2.5 print:h-2.5 text-amber-700 shrink-0" />
              <span>IMPORTANT STATUTORY INSTRUCTIONS FOR THE LEARNER:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 print:space-y-0 text-amber-950 leading-tight">
              <li>Retain this official computer-generated acknowledgment slip until assignment marks reflect on your IGNOU Grade Card.</li>
              <li>Assignments carry 30% weightage in continuous evaluation. Minimum passing mark is 40% (Grade D).</li>
              <li>In case of discrepancy, produce this original token receipt at Study Centre 2033 coordinator desk.</li>
            </ul>
          </div>

          {/* Sign-off: Receiving Desk Official & Official Study Centre Stamp (NO personal name) */}
          <div className="mt-2.5 print:mt-1.5 pt-2 print:pt-1 border-t border-dashed border-zinc-300 grid grid-cols-3 gap-2 text-xs print:text-[9px] items-end">
            <div>
              <div className="text-zinc-500 text-[9px] print:text-[7.5px] uppercase font-bold">Counter Received By</div>
              <div className="font-bold text-zinc-900 text-xs print:text-[10px] mt-0.5">
                {(selectedReceiptRecord as any).registeredBy || (selectedReceiptRecord as any).receivedBy || 'Desk Official'}
              </div>
              <div className="text-[9px] print:text-[7.5px] text-zinc-500">{settings.institutionName || "S.D. Jain Girls' College, Dimapur"} ({settings.centreCode})</div>
            </div>

            <div className="text-center relative">
              {/* Official Study Centre Stamp without any personal name */}
              <div className="w-32 h-11 print:w-28 print:h-9 mx-auto border-2 border-indigo-900 text-indigo-900 rounded p-0.5 flex flex-col items-center justify-center text-[8px] print:text-[7px] font-black uppercase tracking-wider rotate-[-2deg] bg-indigo-50/40">
                <span>IGNOU STUDY CENTRE {settings.centreCode}</span>
                <span className="text-[7.5px] print:text-[6.5px] font-bold text-indigo-800">VERIFIED & RECEIVED</span>
                <span className="text-[6.5px] print:text-[5.5px] text-indigo-600 font-mono">{formatDate(currentReceiptDate || receiptDateVal)}</span>
              </div>
              <div className="text-[8px] print:text-[7.5px] font-bold text-zinc-700 mt-0.5">Study Centre Official Stamp</div>
            </div>

            <div className="text-right">
              <div className="w-28 ml-auto border-b border-zinc-900 mb-0.5"></div>
              <div className="font-black text-zinc-950 text-xs print:text-[9.5px]">Coordinator / Authorised Official</div>
              <div className="text-[8px] print:text-[7px] text-zinc-500">{settings.coordinatorDesignation || 'Coordinator, IGNOU SC-2033'}</div>
            </div>
          </div>
        </div>

        {/* Modal Footer (Hidden on print) */}
        <div className="bg-zinc-50 border-t border-zinc-200 px-6 py-3 flex items-center justify-between text-xs text-zinc-500 print:hidden">
          <span>Official Institutional Record • Token: <strong>{selectedReceiptRecord.tokenNo}</strong></span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleEditClick}
              className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-300 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
              title="Edit student details, courses, or date"
            >
              <Pencil className="w-3.5 h-3.5 text-indigo-600" />
              <span>Edit Receipt</span>
            </button>
            <button
              type="button"
              onClick={handleDeleteClick}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
              title="Delete intake entry (Requires Coordinator PIN 2033)"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Delete Receipt</span>
            </button>
            <button
              onClick={closeReceiptModal}
              className="px-3.5 py-1.5 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 rounded-lg text-xs font-semibold transition cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print 1-Page Receipt</span>
            </button>
          </div>
        </div>
      </div>

      {/* Embedded Edit Intake Modal */}
      <EditIntakeModal
        isOpen={isEditModalOpen}
        record={matchingIntakeRecord}
        onClose={() => setIsEditModalOpen(false)}
      />
    </div>
  );
};

