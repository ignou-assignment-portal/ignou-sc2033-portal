import React, { useState, useEffect, useMemo } from 'react';
import { useApp, norm } from '../context/AppContext';
import { formatDate, formatDateTime, isPracticalCourse } from '../utils/helpers';
import {
  Printer,
  X,
  CheckCircle2,
  ShieldCheck,
  FileCheck,
  Building2,
  ClipboardCheck,
  Calendar,
  Pencil,
  Trash2,
} from 'lucide-react';
import { EditIntakeModal } from './EditIntakeModal';
import { IntakeRecord } from '../types';

export const RegistrationReceiptModal: React.FC = () => {
  const {
    selectedRegistrationReceipt,
    closeRegistrationReceiptModal,
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
    selectedRegistrationReceipt?.submissionDate ||
    selectedRegistrationReceipt?.receiptDate ||
    (selectedRegistrationReceipt as any)?.Submission_Date ||
    selectedRegistrationReceipt?.issuedAt
  );

  const [currentReceiptDate, setCurrentReceiptDate] = useState(receiptDateVal);

  useEffect(() => {
    setCurrentReceiptDate(receiptDateVal);
  }, [receiptDateVal]);

  // Find programme details from dynamic registry
  const progInfo = allProgrammes.find(
    (p) => p.code === selectedRegistrationReceipt?.programmeCode
  );

  // Safely extract registered courses array from any record representation
  const rawRegCourses =
    selectedRegistrationReceipt?.registeredCourses ||
    (selectedRegistrationReceipt as any)?.courseCodes ||
    (selectedRegistrationReceipt as any)?.courses ||
    (selectedRegistrationReceipt as any)?.Courses ||
    [];
  const safeRegisteredCourses: string[] = Array.isArray(rawRegCourses)
    ? rawRegCourses
    : typeof rawRegCourses === 'string'
    ? rawRegCourses.split(',').map((c: string) => c.trim()).filter(Boolean)
    : [];

  const matchingIntakeRecord: IntakeRecord | null = useMemo(() => {
    if (!selectedRegistrationReceipt) return null;
    const found = allIntakes.find(
      (i) =>
        i.id === selectedRegistrationReceipt.id ||
        i.id === (selectedRegistrationReceipt as any).intakeId ||
        i.tokenNo === selectedRegistrationReceipt.receiptNumber ||
        i.tokenNo === (selectedRegistrationReceipt as any).tokenNo ||
        (selectedRegistrationReceipt.studentId && i.enrollmentNo.trim() === selectedRegistrationReceipt.studentId.trim())
    );
    if (found) {
      return {
        ...found,
        submissionDate: currentReceiptDate || found.submissionDate,
      };
    }

    return {
      id: selectedRegistrationReceipt.id || (selectedRegistrationReceipt as any).intakeId || selectedRegistrationReceipt.receiptNumber || `REG-${Date.now()}`,
      tokenNo: selectedRegistrationReceipt.receiptNumber || (selectedRegistrationReceipt as any).tokenNo || 'INT-ACK',
      enrollmentNo: selectedRegistrationReceipt.studentId || '',
      studentName: selectedRegistrationReceipt.studentName || '',
      studentPhone: selectedRegistrationReceipt.studentPhone || '',
      studentEmail: selectedRegistrationReceipt.studentEmail || '',
      programmeCode: selectedRegistrationReceipt.programmeCode || '',
      courseCodes: safeRegisteredCourses,
      session: selectedRegistrationReceipt.session || '',
      submissionDate: currentReceiptDate,
      submissionMode: (selectedRegistrationReceipt as any).submissionMode || 'In-Person (Desk)',
      status: 'Received',
      registeredBy: selectedRegistrationReceipt.issuedBy || 'Desk Official',
      createdAt: selectedRegistrationReceipt.issuedAt || new Date().toISOString(),
      marks: {},
    } as unknown as IntakeRecord;
  }, [selectedRegistrationReceipt, allIntakes, currentReceiptDate, safeRegisteredCourses]);

  if (!selectedRegistrationReceipt) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setCurrentReceiptDate(newDate);
    if (newDate) {
      await updateIntakeDate(selectedRegistrationReceipt.id || selectedRegistrationReceipt.receiptNumber, newDate);
      showToast(`Registration receipt date updated to ${formatDate(newDate)} across all linked records.`, 'success');
    }
  };

  const handleEditClick = () => {
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = () => {
    if (!selectedRegistrationReceipt) return;
    const candName = selectedRegistrationReceipt.studentName || 'Candidate';
    const enr = selectedRegistrationReceipt.studentId || '-';
    const activeSession = selectedRegistrationReceipt.session;
    const targetId = (selectedRegistrationReceipt as any).intakeId || selectedRegistrationReceipt.id || selectedRegistrationReceipt.receiptNumber;

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
        (ce.intakeId === targetId || ce.enrollmentNo.trim() === String(enr).trim()) &&
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
      deleteIntakeRecord(targetId);
      closeRegistrationReceiptModal();
      showToast(`Intake record for ${candName} (${enr}) deleted successfully.`, 'success');
    }
  };

  return (
    <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-zinc-300 overflow-hidden my-auto print:m-0 print:border-none print:shadow-none print:w-full">
        {/* Modal Action Bar (Hidden on print) */}
        <div className="px-5 py-3 bg-zinc-900 text-white flex flex-wrap items-center justify-between gap-2.5 print:hidden">
          <div className="flex items-center gap-2.5 text-sm font-semibold">
            <span className="p-1 rounded-md bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </span>
            <div>
              <span className="font-bold">Student Assignment Intake Acknowledgment</span>
              <span className="text-xs text-zinc-400 ml-2 hidden sm:inline">
                Zero-Fee Statutory Submission Receipt
              </span>
            </div>
          </div>
          <div className="flex items-center flex-wrap gap-2">
            {/* Quick Date Selector */}
            <div className="flex items-center gap-1.5 bg-zinc-800 border border-zinc-700 px-2.5 py-1 rounded-lg text-xs">
              <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <label htmlFor="reg-receipt-date-picker" className="text-[11px] text-zinc-300 font-medium">
                Date:
              </label>
              <input
                id="reg-receipt-date-picker"
                type="date"
                value={currentReceiptDate}
                onChange={handleDateChange}
                max="2099-12-31"
                className="bg-zinc-950 border border-zinc-700 text-white text-xs px-2 py-0.5 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-hidden cursor-pointer font-mono"
                title="Select receipt intake date"
              />
              <button
                type="button"
                onClick={async () => {
                  const d = new Date();
                  d.setDate(d.getDate() - 1);
                  const yesterday = d.toISOString().split('T')[0];
                  setCurrentReceiptDate(yesterday);
                  await updateIntakeDate(selectedRegistrationReceipt.id || selectedRegistrationReceipt.receiptNumber, yesterday);
                  showToast(`Registration receipt date updated to yesterday (${formatDate(yesterday)}).`, 'success');
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
                  await updateIntakeDate(selectedRegistrationReceipt.id || selectedRegistrationReceipt.receiptNumber, today);
                  showToast(`Registration receipt date updated to today (${formatDate(today)}).`, 'success');
                }}
                className="text-[10px] text-indigo-300 hover:text-white underline cursor-pointer ml-1"
                title="Set receipt date to today"
              >
                Today
              </button>
            </div>

            {/* Instant Edit Intake Button for Operators */}
            <button
              id="reg-receipt-edit-btn"
              type="button"
              onClick={handleEditClick}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 hover:border-zinc-500 text-xs font-semibold rounded-lg transition shadow-xs cursor-pointer"
              title="Edit student details, courses, or submission date"
            >
              <Pencil className="w-3.5 h-3.5 text-indigo-400" />
              <span>Edit</span>
            </button>

            {/* Delete Intake Button - Requires PIN 2033 */}
            <button
              id="reg-receipt-delete-btn"
              type="button"
              onClick={handleDeleteClick}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800 hover:border-rose-700 text-xs font-semibold rounded-lg transition shadow-xs cursor-pointer"
              title="Delete intake mistake (Requires Coordinator PIN 2033)"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Delete</span>
            </button>

            <button
              onClick={handlePrint}
              id="print-registration-receipt-btn"
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print 1-Page Receipt</span>
            </button>
            <button
              onClick={closeRegistrationReceiptModal}
              className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Canvas */}
        <div className="p-4 sm:p-6 print:p-1 text-zinc-900 bg-white" id="printable-registration-receipt">
          {/* Institutional Top Header */}
          <div className="text-center border-b-2 border-zinc-900 pb-2 print:pb-1">
            <div className="flex items-center justify-center gap-2 text-xs print:text-[8px] tracking-widest font-black uppercase text-zinc-700">
              <Building2 className="w-4 h-4 text-indigo-900 print:hidden inline" />
              <span>Indira Gandhi National Open University (IGNOU)</span>
            </div>
            <h2 className="text-base sm:text-xl print:text-xs font-black tracking-tight text-zinc-950 mt-0.5">
              STUDY CENTRE - {settings.centreCode}
            </h2>
            <div className="text-xs print:text-[8.5px] text-zinc-600 font-medium">
              {settings.institutionName} • Regional Centre: {settings.regionalCentreCode}
            </div>
            <div className="inline-block mt-1 print:mt-0.5 px-3 py-0.5 print:py-0 rounded-full border border-zinc-900 text-[10px] print:text-[8px] font-black tracking-wider uppercase bg-zinc-100">
              {((selectedRegistrationReceipt.practicalCourses || []).length > 0 && !(selectedRegistrationReceipt.assignmentCourses || []).length)
                ? 'STUDENT COURSE PRACTICAL INTAKE ACKNOWLEDGMENT RECEIPT'
                : ((selectedRegistrationReceipt.practicalCourses || []).length > 0)
                ? 'STUDENT COURSE ASSIGNMENT & PRACTICAL INTAKE ACKNOWLEDGMENT RECEIPT'
                : 'STUDENT COURSE ASSIGNMENT INTAKE ACKNOWLEDGMENT RECEIPT'}
            </div>
          </div>

          {/* Receipt Header Grid */}
          <div className="mt-2 print:mt-1 p-2 print:p-1 bg-zinc-50 border border-zinc-300 rounded-lg grid grid-cols-1 sm:grid-cols-3 gap-2 print:gap-1 text-xs print:text-[9px]">
            <div>
              <span className="text-zinc-500 font-semibold block text-[9px] print:text-[7.5px] uppercase">Receipt Number</span>
              <span className="font-mono font-black text-xs print:text-[10px] text-indigo-950 tracking-wider">
                {selectedRegistrationReceipt.receiptNumber}
              </span>
            </div>
            <div>
              <span className="text-zinc-500 font-semibold block text-[9px] print:text-[7.5px] uppercase">Academic Session</span>
              <span className="font-bold text-zinc-900 text-xs print:text-[9.5px]">
                {selectedRegistrationReceipt.session}
              </span>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 font-semibold block text-[9px] print:text-[7.5px] uppercase">
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

          {/* Student Profile Grid */}
          <div className="mt-2 print:mt-1 border border-zinc-200 rounded-lg p-2 print:p-1 bg-zinc-50/50">
            <h3 className="text-[10px] print:text-[8px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
              Candidate Identification Details
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 print:gap-1 text-xs print:text-[9px]">
              <div>
                <span className="text-zinc-500 text-[9px] print:text-[7.5px] uppercase block font-semibold">Enrolment Number</span>
                <span className="text-xs print:text-[10px] font-mono font-black text-zinc-900 tracking-wider">
                  {selectedRegistrationReceipt.studentId}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 text-[9px] print:text-[7.5px] uppercase block font-semibold">Candidate Full Name</span>
                <span className="text-xs print:text-[9.5px] font-bold text-zinc-900 truncate block">
                  {selectedRegistrationReceipt.studentName}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 text-[9px] print:text-[7.5px] uppercase block font-semibold">Programme Code</span>
                <span className="text-xs print:text-[9.5px] font-bold text-zinc-900 truncate block">
                  {selectedRegistrationReceipt.programmeCode} {progInfo ? `— ${progInfo.name}` : ''}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 text-[9px] print:text-[7.5px] uppercase block font-semibold">Contact Mobile</span>
                <span className="text-xs print:text-[9.5px] font-medium text-zinc-800">
                  {selectedRegistrationReceipt.studentPhone || 'Not Provided'}
                </span>
              </div>
            </div>
          </div>

          {/* Enrolled Courses Submitted for the Session */}
          <div className="mt-2 print:mt-1">
            <div className="flex items-center justify-between mb-0.5">
              <h3 className="text-xs print:text-[8.5px] font-black uppercase tracking-wider text-zinc-800 flex items-center gap-1.5">
                <FileCheck className="w-3 h-3 text-indigo-700" />
                <span>Enrolled Assignment Courses Received ({selectedRegistrationReceipt.session})</span>
              </h3>
              <span className="text-xs print:text-[8px] font-semibold text-zinc-600">
                Total Received Courses: <strong>{safeRegisteredCourses.length}</strong>
              </span>
            </div>

            <div className="border border-zinc-300 rounded overflow-hidden">
              <table className="w-full text-xs print:text-[8.5px] text-left">
                <thead className="bg-zinc-100 text-zinc-700 font-bold border-b border-zinc-300 uppercase text-[9px] print:text-[7.5px]">
                  <tr>
                    <th className="py-1 print:py-0.5 px-2 print:px-1.5 w-10 text-center">#</th>
                    <th className="py-1 print:py-0.5 px-2 print:px-1.5 w-24">Course Code</th>
                    <th className="py-1 print:py-0.5 px-2 print:px-1.5">Course Title</th>
                    <th className="py-1 print:py-0.5 px-2 print:px-1.5 w-16 text-center">Credits</th>
                    <th className="py-1 print:py-0.5 px-2 print:px-1.5 w-32 text-right">Intake Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {safeRegisteredCourses.map((code, idx) => {
                    const cInfo = getCourseInfo(code, selectedRegistrationReceipt.programmeCode);
                    const title = cInfo?.title || getCourseTitle(code, selectedRegistrationReceipt.programmeCode) || 'Curriculum Course Module';
                    const credits = cInfo?.credits || 6;
                    return (
                      <tr key={code} className="hover:bg-zinc-50/50">
                        <td className="py-1 print:py-0.5 px-2 print:px-1.5 text-center text-zinc-500 font-mono font-medium">{idx + 1}</td>
                        <td className="py-1 print:py-0.5 px-2 print:px-1.5 font-mono font-black text-indigo-950">
                          <div className="flex items-center gap-1">
                            <span>{code}</span>
                            {(() => {
                              const isPracInReceipt = (selectedRegistrationReceipt.practicalCourses || []).includes(code);
                              const isAsgnInReceipt = (selectedRegistrationReceipt.assignmentCourses || []).includes(code);
                              const isPracByRule = isPracticalCourse(code, title);

                              if (isPracInReceipt && isAsgnInReceipt) {
                                return (
                                  <span className="text-[8px] print:text-[6.5px] px-1 py-0 rounded bg-indigo-100 text-indigo-900 font-sans font-bold border border-indigo-200">
                                    TMA + Practical
                                  </span>
                                );
                              }
                              if (isPracInReceipt) {
                                return (
                                  <span className="text-[8px] print:text-[6.5px] px-1 py-0 rounded bg-purple-100 text-purple-800 font-sans font-bold border border-purple-200">
                                    Practical
                                  </span>
                                );
                              }
                              if (isAsgnInReceipt) {
                                return (
                                  <span className="text-[8px] print:text-[6.5px] px-1 py-0 rounded bg-zinc-100 text-zinc-700 font-sans font-medium border border-zinc-200">
                                    TMA
                                  </span>
                                );
                              }
                              if (isPracByRule) {
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
                        <td className="py-1 print:py-0.5 px-2 print:px-1.5 text-zinc-800 font-medium truncate max-w-[240px]">
                          {title}
                        </td>
                        <td className="py-1 print:py-0.5 px-2 print:px-1.5 text-center font-semibold text-zinc-700">
                          {credits}
                        </td>
                        <td className="py-1 print:py-0.5 px-2 print:px-1.5 text-right">
                          <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] print:text-[7.5px] font-bold bg-emerald-100 text-emerald-800">
                            {(() => {
                              const isPracInReceipt = (selectedRegistrationReceipt.practicalCourses || []).includes(code);
                              const isAsgnInReceipt = (selectedRegistrationReceipt.assignmentCourses || []).includes(code);
                              if (isPracInReceipt && isAsgnInReceipt) {
                                return 'Script & Lab Record Received';
                              }
                              if (isPracInReceipt) {
                                return 'Lab Record / Practical Received';
                              }
                              if (isAsgnInReceipt) {
                                return 'Physical Script Received';
                              }
                              if (isPracticalCourse(code, title)) {
                                return 'Lab Record / Practical Received';
                              }
                              return 'Physical Script Received';
                            })()}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Institutional Counter Verification Details */}
          <div className="mt-2 print:mt-1 border border-zinc-300 rounded-lg p-2 print:p-1 bg-zinc-50">
            <h3 className="text-[10px] print:text-[8px] font-black uppercase tracking-wider text-zinc-800 flex items-center gap-1 mb-1">
              <ClipboardCheck className="w-3 h-3 text-indigo-700" />
              <span>Counter Desk Verification Record</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 print:gap-1 text-xs print:text-[8.5px] bg-white p-2 print:p-1 rounded border border-zinc-200">
              <div>
                <span className="text-zinc-500 text-[9px] print:text-[7px] uppercase font-bold block">Intake Desk Official</span>
                <span className="font-semibold text-zinc-900">
                  {selectedRegistrationReceipt.issuedBy}
                </span>
                <span className="text-[9px] print:text-[7px] text-zinc-500 block">SC-{settings.centreCode} Desk</span>
              </div>
              <div>
                <span className="text-zinc-500 text-[9px] print:text-[7px] uppercase font-bold block">Receipt / Intake Date</span>
                <span className="font-bold text-zinc-900 font-mono">
                  {formatDate(currentReceiptDate || receiptDateVal)}
                </span>
                <span className="text-[9px] print:text-[7px] text-emerald-700 font-bold block">Verified in Primary Register</span>
              </div>
              <div>
                <span className="text-zinc-500 text-[9px] print:text-[7px] uppercase font-bold block">Financial Nature</span>
                <span className="font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 inline-block text-[10px] print:text-[8px]">
                  Zero-Fee Intake
                </span>
                <span className="text-[9px] print:text-[7px] text-zinc-500 block">Strictly Non-Financial at Counter</span>
              </div>
              <div>
                <span className="text-zinc-500 text-[9px] print:text-[7px] uppercase font-bold block">Desk Remarks / Notes</span>
                <span className="text-zinc-700 italic truncate block">
                  {selectedRegistrationReceipt.remarks || 'Physical handwritten assignment scripts verified and stamped.'}
                </span>
              </div>
            </div>
          </div>

          {/* Institutional Statutory Declarations */}
          <div className="mt-1.5 print:mt-1 p-2 print:p-1 bg-amber-50/60 border border-amber-200/80 rounded-lg text-[10px] print:text-[8px] text-amber-900 space-y-0.5">
            <div className="font-bold uppercase tracking-wider flex items-center gap-1 text-amber-950">
              <ShieldCheck className="w-3 h-3 text-amber-700 inline" />
              <span>Important Instructions for Student</span>
            </div>
            <p>
              1. Retain this official computer-generated acknowledgment receipt until assignment grades appear on your official IGNOU Grade Card.
            </p>
            <p>
              2. Submitting handwritten assignments for each course is mandatory before appearing in Term-End Examinations (TEE). Minimum passing marks is 40% (Grade D).
            </p>
            <p>
              3. For any discrepancies or marks query, quote Receipt Number <strong className="font-mono text-amber-950">{selectedRegistrationReceipt.receiptNumber}</strong> at Study Centre {settings.centreCode}.
            </p>
          </div>

          {/* Dual Signature & Seal Blocks (NO Dr. Sant Kumar Gupta on stamp) */}
          <div className="mt-2.5 print:mt-1.5 pt-2 print:pt-1 border-t border-dashed border-zinc-300 grid grid-cols-2 gap-4 text-xs print:text-[9px] items-end">
            <div className="text-center">
              <div className="w-3/4 mx-auto border-t border-zinc-500 pt-1 text-zinc-600 font-medium text-[10px] print:text-[8px]">
                Candidate / Student Signature
              </div>
              <div className="text-[8px] print:text-[7px] text-zinc-400 mt-0.5">
                (I certify that the assignments submitted are my original handwritten work)
              </div>
            </div>

            <div className="text-center relative">
              {/* Study Centre Official Stamp without personal name */}
              <div className="inline-block border-2 border-indigo-900 text-indigo-900 rounded px-2.5 py-0.5 text-[8px] print:text-[7px] font-black uppercase tracking-wider rotate-[-2deg] bg-indigo-50/60 leading-tight mb-1">
                IGNOU STUDY CENTRE {settings.centreCode}
                <br />
                <span className="text-[7.5px] print:text-[6.5px] font-bold text-indigo-800">VERIFIED & RECEIVED</span>
                <br />
                <span className="text-[6.5px] print:text-[5.5px] text-indigo-700 font-mono">Date: {formatDate(currentReceiptDate || receiptDateVal)}</span>
              </div>
              <div className="w-3/4 mx-auto border-t border-zinc-900 pt-0.5 text-zinc-900 font-bold text-[10px] print:text-[8.5px]">
                Coordinator / Authorised Official
              </div>
              <div className="text-[8px] print:text-[7px] text-zinc-500 mt-0.5">
                {settings.coordinatorDesignation || 'Coordinator, IGNOU SC-2033'} • {settings.institutionName}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer (Hidden on print) */}
        <div className="px-6 py-3 bg-zinc-100 border-t border-zinc-200 flex items-center justify-between print:hidden text-xs text-zinc-500">
          <span>Official Registration Receipt stored in register: <strong>{selectedRegistrationReceipt.receiptNumber}</strong></span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleEditClick}
              className="px-3.5 py-1.5 rounded-lg border border-zinc-300 text-zinc-700 hover:bg-zinc-200 font-semibold transition flex items-center gap-1.5 cursor-pointer"
              title="Edit student details, courses, or date"
            >
              <Pencil className="w-3.5 h-3.5 text-indigo-600" />
              <span>Edit Receipt</span>
            </button>
            <button
              type="button"
              onClick={handleDeleteClick}
              className="px-3.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold transition flex items-center gap-1.5 cursor-pointer"
              title="Delete intake entry (Requires Coordinator PIN 2033)"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Delete Receipt</span>
            </button>
            <button
              onClick={closeRegistrationReceiptModal}
              className="px-4 py-1.5 rounded-lg border border-zinc-300 text-zinc-700 hover:bg-zinc-200 font-medium transition cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
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
