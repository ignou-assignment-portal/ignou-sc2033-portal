import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Evaluator } from '../types';
import { maskAccountNumber, maskPAN } from '../utils/helpers';
import {
  Users,
  RefreshCw,
  Plus,
  ShieldCheck,
  Building,
  Mail,
  Phone,
  CreditCard,
  CheckCircle2,
  FileSpreadsheet,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldAlert,
} from 'lucide-react';

export const EvaluatorDirectory: React.FC = () => {
  const {
    evaluators,
    addEvaluator,
    updateEvaluator,
    deleteEvaluator,
    isSyncingSheets,
    syncGoogleSheets,
    isSyncingEvaluators,
    syncEvaluatorsDirectory,
    lastSheetSync,
    isAdmin,
    currentRole,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('ALL');
  const [showFullBankDetails, setShowFullBankDetails] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form states for adding evaluator
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newDesignation, setNewDesignation] = useState('Associate Professor');
  const [newDepartment, setNewDepartment] = useState('');
  const [newCollege, setNewCollege] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newEligibleCourses, setNewEligibleCourses] = useState('');
  const [newBankName, setNewBankName] = useState('');
  const [newAccountNo, setNewAccountNo] = useState('');
  const [newIFSC, setNewIFSC] = useState('');
  const [newPAN, setNewPAN] = useState('');

  // Collect all unique eligible courses for filtering
  const allEligibleCourses = Array.from(
    new Set(evaluators.flatMap((e) => e.eligibleCourses))
  ).sort();

  const filteredEvaluators = evaluators.filter((ev) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      ev.name.toLowerCase().includes(q) ||
      ev.evaluatorCode.toLowerCase().includes(q) ||
      ev.department.toLowerCase().includes(q) ||
      ev.collegeInstitution.toLowerCase().includes(q) ||
      ev.eligibleCourses.some((c) => c.toLowerCase().includes(q));

    const matchesCourse =
      selectedCourseFilter === 'ALL' || ev.eligibleCourses.includes(selectedCourseFilter);

    return matchesSearch && matchesCourse;
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim()) return;

    const coursesArray = newEligibleCourses
      .split(',')
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean);

    addEvaluator({
      evaluatorCode: newCode.trim().toUpperCase(),
      name: newName.trim(),
      designation: newDesignation,
      department: newDepartment.trim() || 'Department of Humanities',
      collegeInstitution: newCollege.trim() || "S.D. Jain Girls' College, Dimapur",
      contactPhone: newPhone.trim() || '+91 98000 00000',
      email: newEmail.trim() || 'evaluator@sdjain.edu.in',
      eligibleCourses: coursesArray.length > 0 ? coursesArray : ['MEG-01'],
      bankName: newBankName.trim() || 'State Bank of India',
      accountNumber: newAccountNo.trim() || '30001234567',
      ifscCode: newIFSC.trim().toUpperCase() || 'SBIN0001000',
      panNumber: newPAN.trim().toUpperCase() || 'ABCDE1234F',
      status: 'Active',
    });

    setIsAddModalOpen(false);
    // Reset
    setNewCode('');
    setNewName('');
    setNewDepartment('');
    setNewCollege('');
    setNewPhone('');
    setNewEmail('');
    setNewEligibleCourses('');
    setNewBankName('');
    setNewAccountNo('');
    setNewIFSC('');
    setNewPAN('');
  };

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base sm:text-lg font-bold text-zinc-900">
              Evaluators Master Directory (Academic Counselors)
            </h2>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Official IGNOU-approved evaluators directory with course eligibility, institution credentials, and bank details.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Sync Evaluators Master Directory */}
          <button
            onClick={syncEvaluatorsDirectory}
            disabled={isSyncingEvaluators}
            id="sync-evaluators-master-btn"
            className="flex items-center gap-2 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-semibold transition shadow-2xs cursor-pointer disabled:opacity-50"
            title="Fetch latest approved evaluators from Evaluators_Master in Google Sheets"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingEvaluators ? 'animate-spin text-indigo-600' : 'text-indigo-600'}`} />
            <span>{isSyncingEvaluators ? 'Syncing Evaluators...' : 'Sync Evaluators Directory'}</span>
          </button>

          {/* Full Google Sheets Sync */}
          <button
            onClick={() => syncGoogleSheets()}
            disabled={isSyncingSheets}
            id="google-sheets-sync-btn"
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-semibold transition shadow-2xs cursor-pointer"
            title="Simulate synchronization with official IGNOU Google Sheets evaluator roster"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSheets ? 'animate-spin text-emerald-600' : ''}`} />
            <span>{isSyncingSheets ? 'Syncing Google Sheets...' : 'Sync All Sheets'}</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Evaluator</span>
            </button>
          )}
        </div>
      </div>

      {/* Sync Status bar & Search */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-2 text-zinc-600">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>
              Google Sheets Master Sync: <strong className="text-zinc-900">{lastSheetSync}</strong>
            </span>
            <span className="text-emerald-700 font-semibold text-[10px] bg-emerald-100 px-2 py-0.2 rounded-full">
              Live Verified
            </span>
          </div>

          <div className="flex items-center gap-3">
            {isAdmin ? (
              <button
                onClick={() => setShowFullBankDetails(!showFullBankDetails)}
                className="text-zinc-600 hover:text-zinc-900 text-xs font-medium flex items-center gap-1"
              >
                {showFullBankDetails ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showFullBankDetails ? 'Mask Bank Info' : 'Show Full Bank & PAN'}</span>
              </button>
            ) : (
              <span className="text-[11px] text-zinc-400 italic">
                Bank & PAN details masked for Desk Official role
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="sm:col-span-2">
            <input
              type="text"
              placeholder="Search by Name, Evaluator Code (EV-101), College, or Course..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          <div>
            <select
              value={selectedCourseFilter}
              onChange={(e) => setSelectedCourseFilter(e.target.value)}
              className="w-full px-3 py-1.5 border border-zinc-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              <option value="ALL">Filter by Eligible Course (All)</option>
              {allEligibleCourses.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Evaluator Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredEvaluators.map((evaluator) => {
          return (
            <div
              key={evaluator.id}
              className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-indigo-300 transition group"
            >
              <div>
                {/* Header: Code and Status */}
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-900 border border-indigo-200">
                      {evaluator.evaluatorCode}
                    </span>
                    <h3 className="font-bold text-zinc-900 text-sm mt-1.5 leading-tight">
                      {evaluator.name}
                    </h3>
                    <div className="text-[11px] text-zinc-500 mt-0.5 font-medium">
                      {evaluator.designation}
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      evaluator.status === 'Active'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-zinc-100 text-zinc-600'
                    }`}
                  >
                    {evaluator.status}
                  </span>
                </div>

                {/* Institution and Department */}
                <div className="mt-3 text-xs text-zinc-600 space-y-1 bg-zinc-50 p-2.5 rounded-xl border border-zinc-100">
                  <div className="flex items-center gap-1.5 text-zinc-800 font-medium">
                    <Building className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    <span className="truncate">{evaluator.collegeInstitution}</span>
                  </div>
                  <div className="text-[11px] text-zinc-500 pl-5">
                    {evaluator.department}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] pt-1 text-zinc-500 pl-5">
                    <span>{evaluator.contactPhone}</span>
                  </div>
                </div>

                {/* Eligible Courses Chips */}
                <div className="mt-3">
                  <div className="text-[10px] uppercase font-bold text-zinc-400 mb-1.5">
                    Eligible Course Codes ({evaluator.eligibleCourses.length}):
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {evaluator.eligibleCourses.map((code) => (
                      <span
                        key={code}
                        className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-white text-zinc-800 border border-zinc-300 shadow-2xs"
                      >
                        {code}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bank & Remuneration Details Section */}
              <div className="pt-3 border-t border-zinc-200/80 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-zinc-500">
                  <span className="flex items-center gap-1">
                    <CreditCard className="w-3 h-3 text-zinc-400" />
                    Bank Account:
                  </span>
                  <span className="font-mono font-semibold text-zinc-800">
                    {isAdmin && showFullBankDetails
                      ? (evaluator.bankAccountNo || evaluator.accountNumber)
                      : maskAccountNumber(evaluator.bankAccountNo || evaluator.accountNumber)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-zinc-500">
                  <span>Bank & IFSC:</span>
                  <span className="font-mono text-zinc-700">
                    {evaluator.bankName} ({evaluator.ifscCode})
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-zinc-500">
                  <span>PAN Card:</span>
                  <span className="font-mono font-semibold text-zinc-800">
                    {isAdmin && showFullBankDetails ? evaluator.panNumber : maskPAN(evaluator.panNumber)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Evaluator Modal (Admin Only) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-zinc-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-zinc-200">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2 font-bold text-zinc-900 text-sm">
                <Plus className="w-4 h-4 text-indigo-600" />
                Register New Approved Evaluator
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Evaluator Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. EV-107"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-1.5 border border-zinc-300 rounded-lg font-mono font-bold uppercase"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Dr. / Prof. Name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3 py-1.5 border border-zinc-300 rounded-lg font-semibold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Designation</label>
                  <input
                    type="text"
                    value={newDesignation}
                    onChange={(e) => setNewDesignation(e.target.value)}
                    className="w-full px-3 py-1.5 border border-zinc-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Institution / College</label>
                  <input
                    type="text"
                    placeholder="e.g. Ramjas College, DU"
                    value={newCollege}
                    onChange={(e) => setNewCollege(e.target.value)}
                    className="w-full px-3 py-1.5 border border-zinc-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Eligible Course Codes (Comma-Separated) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. MEG-01, MEG-02, BEGC-131"
                  value={newEligibleCourses}
                  onChange={(e) => setNewEligibleCourses(e.target.value)}
                  className="w-full px-3 py-1.5 border border-zinc-300 rounded-lg font-mono uppercase"
                  required
                />
              </div>

              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2">
                <div className="text-[10px] font-bold text-zinc-500 uppercase">Bank Remuneration Details</div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Bank Name (e.g. SBI)"
                    value={newBankName}
                    onChange={(e) => setNewBankName(e.target.value)}
                    className="w-full px-2.5 py-1 text-xs border border-zinc-300 rounded-md bg-white"
                  />
                  <input
                    type="text"
                    placeholder="Account Number"
                    value={newAccountNo}
                    onChange={(e) => setNewAccountNo(e.target.value)}
                    className="w-full px-2.5 py-1 text-xs border border-zinc-300 rounded-md bg-white font-mono"
                  />
                  <input
                    type="text"
                    placeholder="IFSC Code (e.g. SBIN0001067)"
                    value={newIFSC}
                    onChange={(e) => setNewIFSC(e.target.value.toUpperCase())}
                    className="w-full px-2.5 py-1 text-xs border border-zinc-300 rounded-md bg-white font-mono"
                  />
                  <input
                    type="text"
                    placeholder="PAN Card (e.g. ABCPM8945K)"
                    value={newPAN}
                    onChange={(e) => setNewPAN(e.target.value.toUpperCase())}
                    className="w-full px-2.5 py-1 text-xs border border-zinc-300 rounded-md bg-white font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 text-zinc-600 hover:bg-zinc-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-xs"
                >
                  Save Evaluator
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
