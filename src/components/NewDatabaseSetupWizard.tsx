import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  ALL_SCHEMAS,
  downloadCsvTemplate,
  downloadAllTemplates,
  generateTailoredAppsScript,
  SheetSchema,
} from '../utils/sheetTemplateGenerator';
import {
  verifyDatabaseSchemaDetailed,
  DetailedDatabaseVerificationReport,
  setSessionScriptUrl,
  setCustomScriptUrl,
  getSessionScriptUrl,
  SCRIPT_URL,
} from '../services/sheetsService';
import {
  FileSpreadsheet,
  Download,
  Copy,
  Check,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  X,
  Layers,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Sparkles,
  Database,
  ShieldCheck,
  Activity,
  Code2,
  Calendar,
  Eye,
  Info,
} from 'lucide-react';
import { SheetDataEntryGuideModal } from './SheetDataEntryGuideModal';

interface NewDatabaseSetupWizardProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSession?: string;
  onActivated?: (session: string, url: string) => void;
}

type WizardStep = 1 | 2 | 3 | 4 | 5;

export const NewDatabaseSetupWizard: React.FC<NewDatabaseSetupWizardProps> = ({
  isOpen,
  onClose,
  defaultSession,
  onActivated,
}) => {
  const {
    currentSession,
    availableSessions,
    addSession,
    setSession,
    showToast,
    logAuditEvent,
    syncGoogleSheets,
  } = useApp();

  const [step, setStep] = useState<WizardStep>(1);
  const [selectedSession, setSelectedSession] = useState(defaultSession || currentSession || 'July 2026');
  const [newSessionInput, setNewSessionInput] = useState('');
  const [isMultiSessionMode, setIsMultiSessionMode] = useState(true);
  const [webAppUrl, setWebAppUrl] = useState('');
  const [hasCopiedCode, setHasCopiedCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationReport, setVerificationReport] = useState<DetailedDatabaseVerificationReport | null>(null);
  const [seedDataOption, setSeedDataOption] = useState<'clean' | 'seed'>('clean');
  const [activeSchemaPreview, setActiveSchemaPreview] = useState<SheetSchema | null>(null);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const existingUrl = getSessionScriptUrl(selectedSession);
      if (existingUrl) {
        setWebAppUrl(existingUrl);
      } else {
        setWebAppUrl(SCRIPT_URL);
      }
    }
  }, [isOpen, selectedSession]);

  if (!isOpen) return null;

  const handleCopyCode = async () => {
    const code = generateTailoredAppsScript(selectedSession);
    try {
      await navigator.clipboard.writeText(code);
      setHasCopiedCode(true);
      showToast('Google Apps Script code copied to clipboard!', 'success');
      setTimeout(() => setHasCopiedCode(false), 2500);
    } catch {
      showToast('Failed to copy code. Please select and copy manually.', 'warning');
    }
  };

  const handleRunVerification = async () => {
    const cleanUrl = webAppUrl.trim();
    if (!cleanUrl) {
      showToast('Please enter your deployed Google Apps Script Web App URL.', 'error');
      return;
    }

    setIsVerifying(true);
    setVerificationReport(null);
    try {
      const report = await verifyDatabaseSchemaDetailed(cleanUrl, selectedSession);
      setVerificationReport(report);
      if (report.success && report.reachable) {
        showToast('Connection verified successfully!', 'success');
      } else {
        showToast(`Verification issue: ${report.message}`, 'warning');
      }
    } catch (err: any) {
      showToast(`Connection failed: ${err.message}`, 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleFinalActivation = async () => {
    const cleanUrl = webAppUrl.trim();
    if (!cleanUrl) {
      showToast('Web App URL is required to activate database.', 'error');
      return;
    }

    if (isMultiSessionMode) {
      setSessionScriptUrl(selectedSession, cleanUrl);
    }
    setCustomScriptUrl(cleanUrl);

    if (selectedSession !== currentSession) {
      setSession(selectedSession);
    }

    logAuditEvent({
      action: 'SETTINGS_UPDATED',
      category: 'SYSTEM_SETTINGS',
      actor: 'Coordinator Office',
      role: 'ADMIN',
      session: selectedSession,
      summary: `Fresh Google Sheets database activated for session ${selectedSession}`,
      status: 'SUCCESS',
      details: {
        session: selectedSession,
        multiSession: isMultiSessionMode,
        urlPreview: cleanUrl.substring(0, 45) + '...',
      },
    });

    showToast(`Google Sheets Database activated for ${selectedSession}!`, 'success');
    if (onActivated) {
      onActivated(selectedSession, cleanUrl);
    }
    // Trigger sync
    syncGoogleSheets(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] shadow-2xl border border-zinc-200 overflow-hidden flex flex-col text-zinc-900">
        {/* Wizard Header */}
        <div className="bg-linear-to-r from-zinc-950 via-indigo-950 to-zinc-900 p-5 sm:p-6 text-white border-b border-zinc-800 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-xs">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/10 text-amber-300 text-[10px] font-bold tracking-wider uppercase mb-1">
                  <Sparkles className="w-3 h-3" />
                  <span>IGNOU SC-2033 Cloud Setup</span>
                </div>
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  Fresh Google Sheets Database Setup Wizard
                </h2>
                <p className="text-xs text-zinc-300 mt-0.5">
                  Deploy a dedicated database spreadsheet with live multi-session routing and schema validation.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stepper Progress Bar */}
          <div className="grid grid-cols-5 gap-2 mt-5 pt-4 border-t border-zinc-800/80 text-[11px]">
            {[
              { num: 1, label: 'Session' },
              { num: 2, label: 'Templates' },
              { num: 3, label: 'Apps Script' },
              { num: 4, label: 'Verification' },
              { num: 5, label: 'Activate' },
            ].map((s) => (
              <button
                key={s.num}
                type="button"
                onClick={() => setStep(s.num as WizardStep)}
                className={`flex items-center gap-2 py-1.5 px-2 rounded-xl font-bold transition text-left cursor-pointer ${
                  step === s.num
                    ? 'bg-amber-400 text-zinc-950 shadow-xs'
                    : step > s.num
                    ? 'bg-zinc-800/80 text-emerald-400 hover:bg-zinc-800'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-mono shrink-0 ${
                    step === s.num
                      ? 'bg-zinc-950 text-amber-400'
                      : step > s.num
                      ? 'bg-emerald-950 text-emerald-400'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {step > s.num ? '✓' : s.num}
                </span>
                <span className="truncate hidden sm:inline">{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Wizard Scrollable Content Body */}
        <div className="p-5 sm:p-7 overflow-y-auto space-y-6 flex-1 text-sm">
          {/* STEP 1: Academic Session & Multi-Session Mode */}
          {step === 1 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div>
                <h3 className="text-base font-black text-zinc-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  <span>Step 1: Choose Academic Session & Database Isolation</span>
                </h3>
                <p className="text-xs text-zinc-500 mt-1">
                  Each session can maintain its own isolated Google Spreadsheet to prevent mixing student intakes across exam cycles.
                </p>
              </div>

              {/* Session Selector */}
              <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 sm:p-5 space-y-3">
                <label className="block text-xs font-bold text-zinc-800 uppercase tracking-wider">
                  Target Academic Session:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {availableSessions.map((sess) => (
                    <button
                      key={sess}
                      type="button"
                      onClick={() => setSelectedSession(sess)}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition text-left cursor-pointer flex items-center justify-between ${
                        selectedSession === sess
                          ? 'bg-indigo-950 text-white border-indigo-950 shadow-sm'
                          : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-300'
                      }`}
                    >
                      <span>{sess}</span>
                      {selectedSession === sess && <Check className="w-4 h-4 text-amber-400" />}
                    </button>
                  ))}
                </div>

                {/* Add new session input */}
                <div className="pt-2 flex items-center gap-2">
                  <input
                    type="text"
                    value={newSessionInput}
                    onChange={(e) => setNewSessionInput(e.target.value)}
                    placeholder="Or enter new session (e.g. January 2027)"
                    className="flex-1 px-3 py-2 bg-white border border-zinc-300 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-600"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newSessionInput.trim()) {
                        addSession(newSessionInput.trim());
                        setSelectedSession(newSessionInput.trim());
                        setNewSessionInput('');
                        showToast(`Session ${newSessionInput.trim()} created!`, 'success');
                      }
                    }}
                    className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Add Session
                  </button>
                </div>
              </div>

              {/* Architecture Choice */}
              <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 sm:p-5 space-y-3">
                <span className="block text-xs font-bold text-zinc-800 uppercase tracking-wider">
                  Workbook Isolation Architecture:
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div
                    onClick={() => setIsMultiSessionMode(true)}
                    className={`p-4 rounded-xl border-2 transition cursor-pointer space-y-2 ${
                      isMultiSessionMode
                        ? 'bg-indigo-50/60 border-indigo-600 shadow-xs'
                        : 'bg-white border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-indigo-950 flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-indigo-600" />
                        <span>Dedicated Sheet per Session (Recommended)</span>
                      </span>
                      {isMultiSessionMode && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                    </div>
                    <p className="text-[11px] text-zinc-600 leading-relaxed">
                      Creates a fresh, unpolluted spreadsheet specifically for <strong>{selectedSession}</strong>. Eliminates cross-session data confusion while sharing the central Evaluators Master.
                    </p>
                  </div>

                  <div
                    onClick={() => setIsMultiSessionMode(false)}
                    className={`p-4 rounded-xl border-2 transition cursor-pointer space-y-2 ${
                      !isMultiSessionMode
                        ? 'bg-indigo-50/60 border-indigo-600 shadow-xs'
                        : 'bg-white border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-zinc-900 flex items-center gap-1.5">
                        <Database className="w-4 h-4 text-zinc-600" />
                        <span>Single Multi-Cycle Shared Workbook</span>
                      </span>
                      {!isMultiSessionMode && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                    </div>
                    <p className="text-[11px] text-zinc-600 leading-relaxed">
                      All cycles write to the same spreadsheet with a <code>Session</code> column filter. Best if your centre preserves all multi-year intakes in one single master sheet.
                    </p>
                  </div>
                </div>
              </div>
              {/* Future Session Note */}
              <div className="p-3.5 bg-amber-50/80 border border-amber-200/90 rounded-2xl flex items-start gap-2.5 text-xs text-amber-950">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold">Future Academic Session Auto-Discovery:</span>
                  <p className="text-[11.5px] text-amber-900 leading-relaxed">
                    You can add any future session (e.g. <em>January 2027</em>, <em>July 2027</em>) directly in your Google Sheets tabs or via the input above. The web app automatically detects and activates newly added sessions without needing code updates.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Spreadsheet Creation & 1-Click Template Downloads */}
          {step === 2 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-black text-zinc-900 flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                    <span>Step 2: Create Spreadsheet & Set Up 5 Tabs</span>
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Create a new Google Sheet, name the 5 tabs, and import or copy the header templates.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsGuideModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-400 hover:bg-amber-500 text-zinc-950 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>How to Write Data (Guide & Converter)</span>
                  </button>

                  <a
                    href="https://sheets.new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open sheets.new</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => downloadAllTemplates(selectedSession)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-950 hover:bg-indigo-900 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download All 5 CSVs</span>
                  </button>
                </div>
              </div>

              {/* Step checklist callout */}
              <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl text-xs space-y-1.5">
                <span className="font-bold text-indigo-950 block">Quick Spreadsheet Setup Instructions:</span>
                <ol className="list-decimal pl-4 space-y-1 text-indigo-900 text-[11.5px] leading-relaxed">
                  <li>Click <strong>Open sheets.new</strong> to create a new blank Google Sheet.</li>
                  <li>Name your spreadsheet: <code>IGNOU_SC2033_{selectedSession.replace(/\s+/g, '_')}_Database</code>.</li>
                  <li>Create 5 tabs at the bottom and name them <strong>exactly</strong> as shown below: <code>Intake_Register</code>, <code>Course_Ledger</code>, <code>Evaluators_Master</code>, <code>Fresh_Admissions</code>, and <code>Re_Registrations</code> (or import the downloaded CSVs into each tab).</li>
                  <li><code>Fresh_Admissions</code> tracks newly enrolled students per cycle, while <code>Re_Registrations</code> tracks continuing semester enrolments. Pre-configured for all cycles from Jan 2024 to Jan 2026.</li>
                </ol>
              </div>

              {/* 5 Tabs Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {ALL_SCHEMAS.map((sch) => (
                  <div
                    key={sch.id}
                    className="p-4 rounded-2xl border border-zinc-200 bg-white hover:border-zinc-300 transition space-y-2.5 shadow-2xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between pb-1.5 border-b border-zinc-100">
                        <span className="font-bold text-xs text-zinc-900 font-mono flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: sch.accentColor }}
                          />
                          <span>{sch.title}</span>
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-100 text-zinc-600 border border-zinc-200">
                          {sch.columns.length} Cols
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-1.5 leading-relaxed">
                        {sch.description}
                      </p>
                    </div>

                    <div className="pt-2 flex items-center justify-between border-t border-zinc-100 text-xs">
                      <button
                        type="button"
                        onClick={() => setActiveSchemaPreview(sch)}
                        className="text-indigo-600 hover:text-indigo-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Columns</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => downloadCsvTemplate(sch, selectedSession, true)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg text-[11px] font-bold transition cursor-pointer"
                      >
                        <Download className="w-3 h-3 text-zinc-500" />
                        <span>CSV Template</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: Google Apps Script Generator */}
          {step === 3 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-black text-zinc-900 flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-indigo-600" />
                    <span>Step 3: Deploy Google Apps Script Engine</span>
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Paste this tailored script into your spreadsheet to enable instant sync, intake logging, and marks locking.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-950 hover:bg-indigo-900 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  {hasCopiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{hasCopiedCode ? 'Copied to Clipboard!' : 'Copy Apps Script Code'}</span>
                </button>
              </div>

              {/* Deployment Instructions Box */}
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs space-y-2 text-zinc-900">
                <span className="font-bold text-amber-950 block">4 Quick Steps to Deploy:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11.5px]">
                  <div className="p-2.5 bg-white rounded-xl border border-amber-200">
                    <strong>1. Open Script Editor:</strong> Inside your Google Sheet, click <strong>Extensions</strong> → <strong>Apps Script</strong>.
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-amber-200">
                    <strong>2. Paste Script:</strong> Delete any code in <code>Code.gs</code> and paste the copied code below.
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-amber-200">
                    <strong>3. New Deployment:</strong> Click <strong>Deploy</strong> → <strong>New deployment</strong> → Select type <strong>Web app</strong>.
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-amber-200">
                    <strong>4. Access Setting:</strong> Set <em>Who has access</em> to <strong>Anyone</strong>, click <em>Deploy</em>, and copy the Web App URL!
                  </div>
                </div>
              </div>

              {/* Code Preview Block */}
              <div className="bg-zinc-950 rounded-2xl p-4 border border-zinc-800 text-zinc-200 font-mono text-xs max-h-80 overflow-y-auto space-y-2 shadow-inner">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800 text-zinc-400 text-[10px]">
                  <span>Code.gs — Session: {selectedSession}</span>
                  <span>JavaScript / Google Apps Script</span>
                </div>
                <pre className="text-[11px] leading-relaxed whitespace-pre-wrap">
                  {generateTailoredAppsScript(selectedSession)}
                </pre>
              </div>
            </div>
          )}

          {/* STEP 4: Live Schema Verification & Diagnostic Tester */}
          {step === 4 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div>
                <h3 className="text-base font-black text-zinc-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-600" />
                  <span>Step 4: Live Connection & Schema Verification</span>
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Paste your deployed Google Apps Script Web App URL and run an automated diagnostic ping.
                </p>
              </div>

              {/* URL Input Box */}
              <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 sm:p-5 space-y-3">
                <label className="block text-xs font-bold text-zinc-800">
                  Google Apps Script Web App URL:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={webAppUrl}
                    onChange={(e) => setWebAppUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                    className="flex-1 px-3.5 py-2.5 bg-white border border-zinc-300 rounded-xl text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-indigo-600"
                  />
                  <button
                    type="button"
                    onClick={handleRunVerification}
                    disabled={isVerifying || !webAppUrl.trim()}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
                    <span>{isVerifying ? 'Verifying...' : 'Test Connection'}</span>
                  </button>
                </div>
                <span className="text-[10px] text-zinc-400 block">
                  Must end in <code>/exec</code> and have access set to <em>Anyone</em>.
                </span>
              </div>

              {/* Diagnostic Results Card */}
              {verificationReport && (
                <div className={`p-5 rounded-2xl border space-y-4 animate-in fade-in ${
                  verificationReport.reachable
                    ? 'bg-emerald-50/70 border-emerald-300'
                    : 'bg-rose-50/70 border-rose-300'
                }`}>
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-200/60">
                    <div className="flex items-center gap-2 font-bold text-xs">
                      {verificationReport.reachable ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-rose-600" />
                      )}
                      <span className={verificationReport.reachable ? 'text-emerald-950 font-black' : 'text-rose-950 font-black'}>
                        {verificationReport.reachable ? 'Database Online & Reachable' : 'Connection Failed'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span className="text-zinc-600">Latency:</span>
                      <span className="font-bold px-2 py-0.5 rounded-full bg-white border border-zinc-200">
                        {verificationReport.latencyMs}ms
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-700 leading-relaxed">
                    {verificationReport.message}
                  </p>

                  {/* Tabs breakdown */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {verificationReport.tabsStatus.map((tab) => (
                      <div
                        key={tab.tabKey}
                        className="p-3 bg-white rounded-xl border border-zinc-200 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              tab.exists ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          />
                          <span className="font-mono font-bold text-zinc-800">{tab.expectedTitle}</span>
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            tab.exists
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {tab.exists ? (tab.itemCount > 0 ? `${tab.itemCount} rows` : 'Found (Empty)') : 'Tab Missing'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 5: Activation & Data Seeding */}
          {step === 5 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div>
                <h3 className="text-base font-black text-zinc-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Step 5: Activate Database for {selectedSession}</span>
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Review configuration and bind the new Google Sheets cloud database to your live operations.
                </p>
              </div>

              {/* Review Summary Card */}
              <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-xs space-y-2.5">
                <span className="font-bold text-zinc-900 block uppercase tracking-wider text-[11px]">
                  Database Activation Summary:
                </span>
                <div className="grid grid-cols-2 gap-3 text-[11.5px]">
                  <div className="p-2.5 bg-white rounded-xl border border-zinc-200">
                    <span className="text-zinc-500 block text-[10px]">Academic Session:</span>
                    <strong className="text-zinc-900 text-sm">{selectedSession}</strong>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-zinc-200">
                    <span className="text-zinc-500 block text-[10px]">Architecture Mode:</span>
                    <strong className="text-zinc-900 text-sm">
                      {isMultiSessionMode ? 'Dedicated Session Sheet' : 'Universal Shared Sheet'}
                    </strong>
                  </div>
                </div>

                <div className="p-2.5 bg-white rounded-xl border border-zinc-200 font-mono text-[11px] truncate text-zinc-700">
                  <span className="text-zinc-400 block text-[10px]">Web App Endpoint:</span>
                  {webAppUrl || 'No custom URL set'}
                </div>
              </div>

              {/* Seed vs Clean Options */}
              <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-xs space-y-2">
                <span className="font-bold text-zinc-900 block">Initial Data State:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSeedDataOption('clean')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                      seedDataOption === 'clean'
                        ? 'bg-emerald-50 border-emerald-600 text-emerald-950 font-bold'
                        : 'bg-white border-zinc-200 text-zinc-700'
                    }`}
                  >
                    <span className="block text-xs">Fresh Clean Slate</span>
                    <span className="text-[10px] text-zinc-500 font-normal block mt-0.5">
                      Start with 0 student records. Ready for new walk-ins and fresh uploads.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSeedDataOption('seed')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                      seedDataOption === 'seed'
                        ? 'bg-indigo-50 border-indigo-600 text-indigo-950 font-bold'
                        : 'bg-white border-zinc-200 text-zinc-700'
                    }`}
                  >
                    <span className="block text-xs">Preserve Active Workspace</span>
                    <span className="text-[10px] text-zinc-500 font-normal block mt-0.5">
                      Sync current active browser cache records directly to the new Google Sheet.
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Navigation */}
        <div className="bg-zinc-50 px-5 sm:px-7 py-4 border-t border-zinc-200 flex items-center justify-between shrink-0">
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as WizardStep)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-zinc-100 text-zinc-700 rounded-xl text-xs font-bold border border-zinc-200 transition cursor-pointer shadow-2xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step < 5 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s + 1) as WizardStep)}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-indigo-950 hover:bg-indigo-900 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinalActivation}
                disabled={!webAppUrl.trim()}
                className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-md"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Activate Google Sheets Database</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Schema Columns Preview Modal */}
      {activeSchemaPreview && (
        <div className="fixed inset-0 z-60 bg-zinc-950/70 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-zinc-200 overflow-hidden text-zinc-900 flex flex-col max-h-[85vh]">
            <div className="p-4 bg-zinc-950 text-white flex items-center justify-between border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-sm font-mono">{activeSchemaPreview.title}</span>
                <span className="text-[11px] text-zinc-400">({activeSchemaPreview.columns.length} columns)</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveSchemaPreview(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 flex-1 text-xs">
              <p className="text-zinc-600">{activeSchemaPreview.description}</p>
              <div className="border border-zinc-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-100 border-b border-zinc-200 text-[10px] font-bold uppercase text-zinc-600">
                    <tr>
                      <th className="p-2">#</th>
                      <th className="p-2">Column Header</th>
                      <th className="p-2">Description</th>
                      <th className="p-2">Example</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {activeSchemaPreview.columns.map((col, idx) => (
                      <tr key={col.key} className="hover:bg-zinc-50">
                        <td className="p-2 text-zinc-400 font-mono text-[10px]">{idx + 1}</td>
                        <td className="p-2 font-mono font-bold text-zinc-900">{col.key}</td>
                        <td className="p-2 text-zinc-600">{col.description}</td>
                        <td className="p-2 text-zinc-500 font-mono text-[11px]">{col.example}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-3 bg-zinc-50 border-t border-zinc-200 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveSchemaPreview(null)}
                className="px-4 py-1.5 bg-zinc-900 text-white rounded-xl text-xs font-bold"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
