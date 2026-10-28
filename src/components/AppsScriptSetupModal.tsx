import React, { useState } from 'react';
import {
  Code2,
  X,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  FileSpreadsheet,
  CheckCircle2,
  RefreshCw,
  HelpCircle,
  ChevronRight,
} from 'lucide-react';
import { OFFICIAL_APPS_SCRIPT_CODE } from '../services/sheetsService';
import { useApp } from '../context/AppContext';

interface AppsScriptSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AppsScriptSetupModal: React.FC<AppsScriptSetupModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    showToast,
    syncGoogleSheets,
    isSyncingSheets,
    customAppsScriptUrl,
    setCustomAppsScriptUrl,
    testCustomConnection,
  } = useApp();
  const [copied, setCopied] = useState<boolean>(false);
  const [activeStepTab, setActiveStepTab] = useState<'DEPLOY_STEPS' | 'SHEET_STRUCTURE' | 'URL_CONNECTOR' | 'CODE'>('DEPLOY_STEPS');
  const [inputUrl, setInputUrl] = useState<string>(customAppsScriptUrl || '');
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    reachable: boolean;
    latencyMs: number;
    message: string;
    sheets?: string[];
    totalIntakes?: number | null;
    totalCourseRows?: number | null;
  } | null>(null);

  if (!isOpen) return null;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(OFFICIAL_APPS_SCRIPT_CODE);
      setCopied(true);
      showToast('Master Google Apps Script (Code.gs) copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 3000);
    } catch {
      showToast('Please select and copy the code manually.', 'warning');
    }
  };

  const handleTestUrl = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testCustomConnection(inputUrl.trim());
      setTestResult(res);
      if (res.success) {
        showToast(`Connected! Response time: ${res.latencyMs}ms. ${res.sheets?.length || 0} tabs detected.`, 'success');
      } else {
        showToast(res.message, 'warning');
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        reachable: false,
        latencyMs: 0,
        message: err.message || 'Connection test failed',
      });
      showToast(err.message || 'Connection test failed', 'error');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveUrl = () => {
    setCustomAppsScriptUrl(inputUrl.trim());
    showToast('Custom Google Apps Script URL saved as active database endpoint!', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-300 overflow-hidden my-auto flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Code2 className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-white tracking-tight">
                  Google Sheets Database Setup (Code.gs)
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Jan 2024 – July 2026 Architecture
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Multi-tab database architecture with separate sheets for Fresh Admissions & Re-Registrations across January and July cycles
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="bg-slate-100 border-b border-slate-200 px-5 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setActiveStepTab('DEPLOY_STEPS')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                activeStepTab === 'DEPLOY_STEPS'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Step-by-Step Guide
            </button>
            <button
              type="button"
              onClick={() => setActiveStepTab('SHEET_STRUCTURE')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                activeStepTab === 'SHEET_STRUCTURE'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Database Map (2024–2026)
            </button>
            <button
              type="button"
              onClick={() => setActiveStepTab('URL_CONNECTOR')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                activeStepTab === 'URL_CONNECTOR'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Connect Web App URL
            </button>
            <button
              type="button"
              onClick={() => setActiveStepTab('CODE')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                activeStepTab === 'CODE'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              View Code.gs
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopyCode}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-xs transition cursor-pointer shrink-0"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied to Clipboard!' : 'Copy Code.gs'}</span>
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-xs text-slate-700 flex-1">

          {/* TAB 1: STEP-BY-STEP DEPLOYMENT GUIDE */}
          {activeStepTab === 'DEPLOY_STEPS' && (
            <div className="space-y-5">
              {/* Notice Banner */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-amber-950 text-xs">
                    How Google Sheets Updates Work
                  </div>
                  <p className="text-amber-900 leading-relaxed text-[11px]">
                    Google Apps Script runs inside your Google Spreadsheet. It exposes an official Web App endpoint (<code>/exec</code>) that this web application connects to. Whenever you add rows or new session tabs in Google Sheets, the script reads them live via <code>doGet()</code>.
                  </p>
                </div>
              </div>

              {/* Numbered Steps */}
              <div className="space-y-3">
                <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">1</span>
                  <span>Step-by-Step Instructions: Copy, Paste & Deploy in Google Sheets</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                    <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <span className="font-mono text-indigo-600">01.</span>
                      <span>Open Your Google Sheet</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Go to Google Drive and open your official IGNOU SC-2033 spreadsheet containing your intake records and admission tabs.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                    <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <span className="font-mono text-indigo-600">02.</span>
                      <span>Open Apps Script Editor</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      In the Google Sheets top menu bar, click <strong>Extensions</strong> &rarr; <strong>Apps Script</strong>. A new browser tab will open with the code editor.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                    <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <span className="font-mono text-indigo-600">03.</span>
                      <span>Paste Code into Code.gs</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      In the left files list, click <code>Code.gs</code>. Select all existing text (Ctrl+A / Cmd+A), delete it, and paste the copied script.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                    <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <span className="font-mono text-indigo-600">04.</span>
                      <span>Save the Script Project</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Click the <strong>Save project</strong> floppy disk icon in the Apps Script toolbar or press <strong>Ctrl+S</strong> / <strong>Cmd+S</strong>.
                    </p>
                  </div>

                  <div className="p-3.5 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-1.5 md:col-span-2">
                    <div className="font-bold text-indigo-950 text-xs flex items-center gap-1.5">
                      <span className="font-mono text-indigo-700">05.</span>
                      <span>Deploy / Update Deployment (Crucial Step)</span>
                    </div>
                    <div className="text-[11px] text-indigo-900 space-y-1 leading-relaxed">
                      <p>
                        Click the blue <strong>Deploy</strong> button in the top right corner of Apps Script:
                      </p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>
                          <strong>If updating an existing deployment:</strong> Select <strong>Manage deployments</strong> &rarr; Click the <strong>Pencil (Edit) icon</strong> &rarr; In the <strong>Version</strong> dropdown, choose <strong>New version</strong> &rarr; Click <strong>Deploy</strong>.
                        </li>
                        <li>
                          <strong>If creating a new deployment:</strong> Select <strong>New deployment</strong> &rarr; Click gear icon next to "Select type" &rarr; Choose <strong>Web app</strong>.
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                    <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <span className="font-mono text-indigo-600">06.</span>
                      <span>Execution Permissions</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Set <strong>Execute as:</strong> <code className="bg-slate-200 px-1 py-0.5 rounded">Me (your-email@gmail.com)</code>. Set <strong>Who has access:</strong> <code className="bg-slate-200 px-1 py-0.5 rounded">Anyone</code>.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                    <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <span className="font-mono text-indigo-600">07.</span>
                      <span>Authorize Google Account</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      If prompted, click <strong>Authorize access</strong>, select your Google account, click <strong>Advanced</strong>, then click <strong>Go to Untitled project (unsafe)</strong>, and click <strong>Allow</strong>.
                    </p>
                  </div>
                </div>

                {/* Verification Action */}
                <div className="pt-2 flex items-center justify-between p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <div className="space-y-0.5">
                    <div className="font-bold text-emerald-950 text-xs flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Ready to sync?</span>
                    </div>
                    <p className="text-[11px] text-emerald-800">
                      Once deployed in your Google Sheet, click the button to verify connection and pull fresh data.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => syncGoogleSheets(false)}
                    disabled={isSyncingSheets}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs shadow-xs transition cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSheets ? 'animate-spin' : ''}`} />
                    <span>{isSyncingSheets ? 'Syncing...' : 'Sync Now'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SHEET STRUCTURE MAP (Jan 2024 – July 2026) */}
          {activeStepTab === 'SHEET_STRUCTURE' && (
            <div className="space-y-5">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-900 text-sm">
                    Multi-Tab Architecture: 15 Standardized Sheets
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                    Auto-created by setupDatabaseFromJan2024()
                  </span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Each semester intake operates in its own dedicated sheet tab for audit integrity. The script automatically reads across all tabs matching <code>Fresh_*</code> and <code>ReReg_*</code> from 2024 through 2026+.
                </p>
              </div>

              {/* Grid of Tabs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* 2024 Sessions */}
                <div className="border border-slate-200 rounded-xl p-3.5 bg-white space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-bold text-xs text-slate-800">2024 Academic Sessions</span>
                    <span className="text-[10px] font-mono text-slate-400">4 Tabs</span>
                  </div>
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between p-1.5 rounded-lg bg-emerald-50 text-emerald-900 font-mono font-medium">
                      <span>Fresh_Jan_2024</span>
                      <span className="text-[10px] bg-emerald-200/60 px-1.5 py-0.2 rounded font-sans">Fresh (1st Yr)</span>
                    </div>
                    <div className="flex items-center justify-between p-1.5 rounded-lg bg-emerald-50 text-emerald-900 font-mono font-medium">
                      <span>Fresh_July_2024</span>
                      <span className="text-[10px] bg-emerald-200/60 px-1.5 py-0.2 rounded font-sans">Fresh (1st Yr)</span>
                    </div>
                    <div className="flex items-center justify-between p-1.5 rounded-lg bg-indigo-50 text-indigo-900 font-mono font-medium">
                      <span>ReReg_Jan_2024</span>
                      <span className="text-[10px] bg-indigo-200/60 px-1.5 py-0.2 rounded font-sans">Re-Reg (2nd/3rd Yr)</span>
                    </div>
                    <div className="flex items-center justify-between p-1.5 rounded-lg bg-indigo-50 text-indigo-900 font-mono font-medium">
                      <span>ReReg_July_2024</span>
                      <span className="text-[10px] bg-indigo-200/60 px-1.5 py-0.2 rounded font-sans">Re-Reg (2nd/3rd Yr)</span>
                    </div>
                  </div>
                </div>

                {/* 2025 Sessions */}
                <div className="border border-slate-200 rounded-xl p-3.5 bg-white space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-bold text-xs text-slate-800">2025 Academic Sessions</span>
                    <span className="text-[10px] font-mono text-slate-400">4 Tabs</span>
                  </div>
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between p-1.5 rounded-lg bg-emerald-50 text-emerald-900 font-mono font-medium">
                      <span>Fresh_Jan_2025</span>
                      <span className="text-[10px] bg-emerald-200/60 px-1.5 py-0.2 rounded font-sans">Fresh (1st Yr)</span>
                    </div>
                    <div className="flex items-center justify-between p-1.5 rounded-lg bg-emerald-50 text-emerald-900 font-mono font-medium">
                      <span>Fresh_July_2025</span>
                      <span className="text-[10px] bg-emerald-200/60 px-1.5 py-0.2 rounded font-sans">Fresh (1st Yr)</span>
                    </div>
                    <div className="flex items-center justify-between p-1.5 rounded-lg bg-indigo-50 text-indigo-900 font-mono font-medium">
                      <span>ReReg_Jan_2025</span>
                      <span className="text-[10px] bg-indigo-200/60 px-1.5 py-0.2 rounded font-sans">Re-Reg (2nd/3rd Yr)</span>
                    </div>
                    <div className="flex items-center justify-between p-1.5 rounded-lg bg-indigo-50 text-indigo-900 font-mono font-medium">
                      <span>ReReg_July_2025</span>
                      <span className="text-[10px] bg-indigo-200/60 px-1.5 py-0.2 rounded font-sans">Re-Reg (2nd/3rd Yr)</span>
                    </div>
                  </div>
                </div>

                {/* 2026 Sessions */}
                <div className="border border-slate-200 rounded-xl p-3.5 bg-white space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-bold text-xs text-slate-800">2026 Active Sessions</span>
                    <span className="text-[10px] font-mono text-emerald-600 font-bold">Current</span>
                  </div>
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between p-1.5 rounded-lg bg-emerald-50 text-emerald-900 font-mono font-medium">
                      <span>Fresh_Jan_2026</span>
                      <span className="text-[10px] bg-emerald-200/60 px-1.5 py-0.2 rounded font-sans">Fresh (1st Yr)</span>
                    </div>
                    <div className="flex items-center justify-between p-1.5 rounded-lg bg-emerald-50 text-emerald-900 font-mono font-medium">
                      <span>Fresh_July_2026</span>
                      <span className="text-[10px] bg-emerald-200/60 px-1.5 py-0.2 rounded font-sans">Fresh (1st Yr)</span>
                    </div>
                    <div className="flex items-center justify-between p-1.5 rounded-lg bg-indigo-50 text-indigo-900 font-mono font-medium">
                      <span>ReReg_Jan_2026</span>
                      <span className="text-[10px] bg-indigo-200/60 px-1.5 py-0.2 rounded font-sans">Re-Reg (2nd/3rd Yr)</span>
                    </div>
                    <div className="flex items-center justify-between p-1.5 rounded-lg bg-indigo-50 text-indigo-900 font-mono font-medium">
                      <span>ReReg_July_2026</span>
                      <span className="text-[10px] bg-indigo-200/60 px-1.5 py-0.2 rounded font-sans">Re-Reg (2nd/3rd Yr)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Core Operations Sheets */}
              <div className="border border-slate-200 rounded-xl p-3.5 bg-white space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="font-bold text-xs text-slate-800">Operational & Evaluation Tabs</span>
                  <span className="text-[10px] font-mono text-slate-400">Assignment Operations</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                  <div className="p-2 rounded-lg bg-slate-900 text-white font-mono flex items-center justify-between">
                    <span>Intake_Register</span>
                    <span className="text-[9px] uppercase tracking-wider text-slate-300 font-sans">Receipts</span>
                  </div>
                  <div className="p-2 rounded-lg bg-amber-900 text-white font-mono flex items-center justify-between">
                    <span>Course_Ledger</span>
                    <span className="text-[9px] uppercase tracking-wider text-amber-200 font-sans">Disaggregated</span>
                  </div>
                  <div className="p-2 rounded-lg bg-blue-900 text-white font-mono flex items-center justify-between">
                    <span>Evaluators_Master</span>
                    <span className="text-[9px] uppercase tracking-wider text-blue-200 font-sans">Directory</span>
                  </div>
                </div>
              </div>

              {/* Standard Headers Table */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
                <span className="font-bold text-slate-900 text-xs">Standard Registration Columns:</span>
                <div className="p-2.5 bg-white border border-slate-200 rounded-lg font-mono text-[11px] text-slate-700 leading-relaxed overflow-x-auto">
                  Enrollment_No · Candidate_Name · Mobile_No · Email_ID · Programme_Code · Academic_Year · Session · Course_Codes · Registration_Date · Fee_Ref · Status
                </div>
                <p className="text-[11px] text-slate-500">
                  Tip: Re-registration programme codes can include academic year suffixes (e.g. <code>MCOM 2</code>, <code>BAM 2</code>, <code>BAM 3</code>).
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: LIVE URL CONNECTOR & HEALTH CHECK */}
          {activeStepTab === 'URL_CONNECTOR' && (
            <div className="space-y-5">
              <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4">
                <div className="space-y-1">
                  <div className="font-bold text-slate-900 text-sm">
                    Connect New Google Spreadsheet Web App
                  </div>
                  <p className="text-slate-600 text-xs">
                    Paste your deployed Google Apps Script Web App URL below (must end with <code>/exec</code>). The system will test connectivity, verify multi-tab support, and save it as your active remote database.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-800">
                    Google Apps Script Web App URL:
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="url"
                      value={inputUrl}
                      onChange={(e) => setInputUrl(e.target.value)}
                      placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                      className="flex-1 px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={handleTestUrl}
                      disabled={isTesting || !inputUrl.trim()}
                      className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                      <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
                    </button>
                  </div>
                </div>

                {/* Test Result Display */}
                {testResult && (
                  <div className={`p-4 rounded-xl border text-xs space-y-2 animate-in fade-in ${
                    testResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}>
                    <div className="flex items-center justify-between font-bold">
                      <span className="flex items-center gap-1.5">
                        {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-amber-600" />}
                        <span>{testResult.success ? 'Connection Successful' : 'Connection Warning / Offline'}</span>
                      </span>
                      <span className="font-mono text-[11px] bg-white/70 px-2 py-0.5 rounded-full border border-black/10">
                        {testResult.latencyMs}ms latency
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      {testResult.message}
                    </p>

                    {testResult.sheets && testResult.sheets.length > 0 && (
                      <div className="pt-2 border-t border-black/10 space-y-1">
                        <span className="font-bold text-[11px]">Detected Sheets in Spreadsheet ({testResult.sheets.length}):</span>
                        <div className="flex flex-wrap gap-1 pt-1">
                          {testResult.sheets.map((s, idx) => (
                            <span key={idx} className="font-mono text-[10px] bg-white px-2 py-0.5 rounded border border-black/10">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Save & Reset Actions */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setInputUrl(OFFICIAL_APPS_SCRIPT_CODE ? "https://script.google.com/macros/s/AKfycbwb-LmuQ2TiUQEGmdWKZAKd9jB9hxeIESL4i-F0h-NwSba8BEbdTaqhato_9aWeXlxy/exec" : '');
                      setCustomAppsScriptUrl('');
                      showToast('Reset to default official Study Centre 2033 endpoint.', 'info');
                    }}
                    className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
                  >
                    Reset to Default SC-2033 URL
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveUrl}
                    disabled={!inputUrl.trim()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                  >
                    Save as Active Database Endpoint
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CODE.GS FULL SOURCE */}
          {activeStepTab === 'CODE' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 text-xs">Complete Drop-in Code.gs:</span>
                  <p className="text-[11px] text-slate-500">
                    Paste this entire file into Google Apps Script. It handles Assignment Intake Desk, Course Ledger auto-unpacking, and marks evaluation.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-xs transition cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy Script'}</span>
                </button>
              </div>

              <pre className="p-4 bg-slate-950 text-slate-100 rounded-xl font-mono text-[11px] leading-relaxed overflow-x-auto max-h-96 border border-slate-800 selection:bg-indigo-700">
                {OFFICIAL_APPS_SCRIPT_CODE}
              </pre>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Direct synchronized mode active for Assignment Intake & Course Ledger</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyCode}
              className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              {copied ? 'Copied!' : 'Copy Code.gs'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
            >
              Close Guide
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
