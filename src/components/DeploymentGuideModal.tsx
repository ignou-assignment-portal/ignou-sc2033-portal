import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  Copy,
  ExternalLink,
  Github,
  Cloud,
  FileCode2,
  Terminal,
  Activity,
  Layers,
  Database,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  FileText,
  Download,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SCRIPT_URL } from '../services/sheetsService';

interface DeploymentGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeploymentGuideModal: React.FC<DeploymentGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { currentSession, studentRegistrations, evaluators, showToast } = useApp();

  const [activeTab, setActiveTab] = useState<'git-vercel' | 'sheets-check' | 'configs'>('git-vercel');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Live Sheet Backend Diagnostic State
  const [isPinging, setIsPinging] = useState(false);
  const [pingResult, setPingResult] = useState<{
    success: boolean;
    latencyMs: number;
    registrationsCount: number;
    evaluatorsCount: number;
    status: string;
    tabs?: string[];
  } | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const copyToClipboard = (text: string, key: string, label?: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast(label ? `${label} copied to clipboard!` : 'Copied to clipboard!', 'info');
    setTimeout(() => {
      setCopiedKey(null);
    }, 2500);
  };

  const handleTestBackendConnection = async () => {
    setIsPinging(true);
    const startTime = performance.now();
    try {
      // Test proxy or direct
      const res = await fetch(`/api/sheets?action=doGet&t=${Date.now()}`);
      const latencyMs = Math.round(performance.now() - startTime);
      if (res.ok) {
        const data = await res.json();
        const regs = Array.isArray(data.studentRegistrations) ? data.studentRegistrations.length : 0;
        const evals = Array.isArray(data.evaluatorsMaster) ? data.evaluatorsMaster.length : 0;
        const tabs = data.studentRegistrations
          ? Array.from(new Set(data.studentRegistrations.map((r: any) => r.sheetTab || r.cadre).filter(Boolean)))
          : [];
        setPingResult({
          success: true,
          latencyMs,
          registrationsCount: regs,
          evaluatorsCount: evals,
          status: 'Connected & Operational',
          tabs: tabs as string[],
        });
        showToast(`Google Sheets backend operational! (${latencyMs}ms, ${regs} records)`, 'success');
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - startTime);
      setPingResult({
        success: false,
        latencyMs,
        registrationsCount: studentRegistrations.length,
        evaluatorsCount: evaluators.length,
        status: `Proxy ping failed (${err.message || 'Network issue'}). Using client cached state.`,
      });
      showToast('Backend diagnostic test returned warning. Check Apps Script URL.', 'warning');
    } finally {
      setIsPinging(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="deployment-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 id="deployment-modal-title" className="text-base font-bold text-white flex items-center gap-2">
                <span>GitHub & Vercel Cloud Deployment Hub</span>
                <span className="text-[10px] font-mono font-bold bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-full border border-indigo-400/30">
                  SC-2033
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                Deploy your live web application to Vercel with GitHub version control and Google Sheets as the cloud database
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Close dialog (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 sm:px-6 bg-slate-100 border-b border-slate-200 flex items-center gap-2 pt-2.5 overflow-x-auto scrollbar-none shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('git-vercel')}
            className={`px-3.5 py-2 text-xs font-bold rounded-t-lg transition flex items-center gap-1.5 cursor-pointer border-t-2 ${
              activeTab === 'git-vercel'
                ? 'bg-white text-indigo-950 border-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/60'
            }`}
          >
            <Github className="w-3.5 h-3.5 text-slate-700" />
            <span>GitHub & Vercel Steps</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sheets-check')}
            className={`px-3.5 py-2 text-xs font-bold rounded-t-lg transition flex items-center gap-1.5 cursor-pointer border-t-2 ${
              activeTab === 'sheets-check'
                ? 'bg-white text-indigo-950 border-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/60'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span>Google Sheets Live Health</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('configs')}
            className={`px-3.5 py-2 text-xs font-bold rounded-t-lg transition flex items-center gap-1.5 cursor-pointer border-t-2 ${
              activeTab === 'configs'
                ? 'bg-white text-indigo-950 border-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/60'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Deployment Config Files</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'git-vercel' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Step 1: Git Push */}
              <div className="border border-slate-200 rounded-xl p-4 sm:p-5 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-900 text-white font-bold text-xs flex items-center justify-center">
                      1
                    </span>
                    <h4 className="text-sm font-bold text-slate-900">
                      Push Project to GitHub
                    </h4>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">Terminal (bash)</span>
                </div>
                <p className="text-xs text-slate-600">
                  Run these commands in your project folder to push the codebase to your GitHub repository:
                </p>
                <div className="relative bg-slate-900 text-slate-100 rounded-lg p-3 font-mono text-xs overflow-x-auto shadow-inner">
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        `git init\ngit add .\ngit commit -m "feat: deploy IGNOU SC-2033 portal to Vercel"\ngit branch -M main\ngit remote add origin https://github.com/YOUR_USERNAME/ignou-sc2033-portal.git\ngit push -u origin main`,
                        'git-commands',
                        'Git commands'
                      )
                    }
                    className="absolute top-2.5 right-2.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[11px] font-sans font-semibold flex items-center gap-1 cursor-pointer transition shadow-2xs"
                  >
                    {copiedKey === 'git-commands' ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Commands</span>
                      </>
                    )}
                  </button>
                  <pre className="text-emerald-400 leading-relaxed pr-24">
{`git init
git add .
git commit -m "feat: deploy IGNOU SC-2033 portal to Vercel"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/ignou-sc2033-portal.git
git push -u origin main`}
                  </pre>
                </div>
              </div>

              {/* Step 2: Vercel Settings */}
              <div className="border border-slate-200 rounded-xl p-4 sm:p-5 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-900 text-white font-bold text-xs flex items-center justify-center">
                      2
                    </span>
                    <h4 className="text-sm font-bold text-slate-900">
                      Import into Vercel & Project Settings
                    </h4>
                  </div>
                  <a
                    href="https://vercel.com/new"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 inline-flex items-center gap-1"
                  >
                    <span>Open Vercel Dashboard</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-xs text-slate-600">
                  On Vercel, click <strong>&ldquo;Add New...&rdquo; $\rightarrow$ Project</strong>, select your GitHub repo, and confirm these presets:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Framework Preset</span>
                    <p className="font-bold font-mono text-slate-900">Vite</p>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Build Command</span>
                    <p className="font-bold font-mono text-slate-900">npm run build</p>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Output Directory</span>
                    <p className="font-bold font-mono text-slate-900">dist</p>
                  </div>
                </div>
              </div>

              {/* Step 3: Environment Variables */}
              <div className="border border-slate-200 rounded-xl p-4 sm:p-5 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-900 text-white font-bold text-xs flex items-center justify-center">
                      3
                    </span>
                    <h4 className="text-sm font-bold text-slate-900">
                      Vercel Environment Variables
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        `GOOGLE_APPS_SCRIPT_URL=${SCRIPT_URL}\nVITE_GOOGLE_APPS_SCRIPT_URL=${SCRIPT_URL}\nVITE_DIRECT_SHEETS=false\nVITE_CENTRE_CODE=SC-2033\nVITE_COORDINATOR_NAME=Dr. Sant Kumar Gupta`,
                        'env-vars-copy',
                        'Environment variables'
                      )
                    }
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer transition shadow-2xs"
                  >
                    {copiedKey === 'env-vars-copy' ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Copied Key-Pairs</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy All Key-Pairs</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-600">
                  Under Vercel Project <strong>Settings $\rightarrow$ Environment Variables</strong>, add these variables:
                </p>
                <div className="space-y-2 text-xs font-mono">
                  <div className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between gap-2">
                    <div className="truncate">
                      <span className="text-indigo-900 font-bold">GOOGLE_APPS_SCRIPT_URL</span>
                      <span className="text-slate-400 mx-1">=</span>
                      <span className="text-slate-700 truncate">{SCRIPT_URL}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(SCRIPT_URL, 'url-copy-1', 'Apps Script URL')}
                      className="text-slate-400 hover:text-slate-700 p-1 shrink-0"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between gap-2">
                    <div className="truncate">
                      <span className="text-indigo-900 font-bold">VITE_GOOGLE_APPS_SCRIPT_URL</span>
                      <span className="text-slate-400 mx-1">=</span>
                      <span className="text-slate-700 truncate">{SCRIPT_URL}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(SCRIPT_URL, 'url-copy-2', 'Apps Script URL')}
                      className="text-slate-400 hover:text-slate-700 p-1 shrink-0"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between gap-2">
                    <div className="truncate">
                      <span className="text-indigo-900 font-bold">VITE_DIRECT_SHEETS</span>
                      <span className="text-slate-400 mx-1">=</span>
                      <span className="text-slate-700">false</span>
                      <span className="text-[11px] text-slate-400 ml-2 font-sans">(Uses Vercel Serverless Proxy /api/sheets)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sheets-check' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Test Backend Connection Card */}
              <div className="p-4 sm:p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Live Google Apps Script Endpoint Verification
                    </h4>
                    <p className="text-xs text-slate-500 font-mono mt-0.5 truncate max-w-xl">
                      {SCRIPT_URL}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleTestBackendConnection}
                    disabled={isPinging}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin' : ''}`} />
                    <span>{isPinging ? 'Testing Connection...' : 'Ping Live Backend'}</span>
                  </button>
                </div>

                {pingResult && (
                  <div className={`p-3.5 rounded-lg border text-xs space-y-2 animate-in fade-in ${
                    pingResult.success
                      ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                      : 'bg-amber-50/80 border-amber-300 text-amber-950'
                  }`}>
                    <div className="flex items-center justify-between font-bold">
                      <div className="flex items-center gap-2">
                        {pingResult.success ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-amber-600" />
                        )}
                        <span>{pingResult.status}</span>
                      </div>
                      <span className="font-mono text-[11px] bg-white/80 px-2 py-0.5 rounded border">
                        {pingResult.latencyMs} ms
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-emerald-200/50">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Admissions Loaded</span>
                        <strong className="text-sm font-mono">{pingResult.registrationsCount} students</strong>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Evaluators Master</span>
                        <strong className="text-sm font-mono">{pingResult.evaluatorsCount} counsellors</strong>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Active Cohorts</span>
                        <span className="text-[11px] font-semibold truncate block">
                          {pingResult.tabs?.length ? `${pingResult.tabs.length} tabs` : 'Jan & July Cycles'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Apps Script Publishing Checklist */}
              <div className="border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-700" />
                  <span>Google Apps Script Permissions Checklist</span>
                </h4>
                <div className="space-y-2 text-xs text-slate-700">
                  <div className="flex items-start gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-900">Execute as: Me (your Google account)</strong>
                      <p className="text-slate-500 text-[11px]">Allows incoming API calls from Vercel to access your spreadsheet without individual OAuth prompts.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-900">Who has access: Anyone</strong>
                      <p className="text-slate-500 text-[11px]">Crucial requirement so Vercel edge functions and student query terminals can fetch records without receiving 401/403 errors.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'configs' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <p className="text-xs text-slate-600">
                These configuration files are already generated and committed in your codebase root for Vercel:
              </p>

              {/* vercel.json preview */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-slate-800">vercel.json</span>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        `{\n  "version": 2,\n  "framework": "vite",\n  "buildCommand": "npm run build",\n  "outputDirectory": "dist",\n  "rewrites": [\n    {\n      "source": "/api/sheets",\n      "destination": "/api/sheets.js"\n    },\n    {\n      "source": "/api/(.*)",\n      "destination": "/api/$1"\n    },\n    {\n      "source": "/(.*)",\n      "destination": "/index.html"\n    }\n  ]\n}`,
                        'copy-vercel-json',
                        'vercel.json'
                      )
                    }
                    className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy JSON</span>
                  </button>
                </div>
                <pre className="p-3 bg-slate-900 text-slate-100 text-[11px] font-mono overflow-x-auto leading-relaxed">
{`{
  "version": 2,
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/api/sheets", "destination": "/api/sheets.js" },
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}`}
                </pre>
              </div>

              {/* api/sheets.js preview */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-slate-800">api/sheets.js (Vercel Serverless Proxy)</span>
                  <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Ready in repository
                  </span>
                </div>
                <div className="p-3 bg-slate-50 text-slate-700 text-xs font-mono">
                  Node.js serverless handler forwarding GET/POST calls to Google Apps Script, managing CORS, and following 302 redirects.
                </div>
              </div>

              {/* README_DEPLOYMENT.md notice */}
              <div className="p-3.5 bg-indigo-50/80 border border-indigo-200 rounded-xl text-xs text-indigo-950 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-700 shrink-0" />
                  <span>Comprehensive step-by-step documentation saved in <strong>README_DEPLOYMENT.md</strong></span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500 font-mono">
            Vercel Preset: <strong className="text-slate-800">Vite React SPA</strong> · Database: <strong className="text-slate-800">Google Sheets</strong>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-2xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
