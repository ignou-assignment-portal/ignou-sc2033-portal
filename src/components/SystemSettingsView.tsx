import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { RbacGovernanceSettings } from './RbacGovernanceSettings';
import { formatCurrency, formatDate, formatDateTime } from '../utils/helpers';
import { SessionArchiveRecord, SheetUserAccount } from '../types';
import {
  Settings,
  Building2,
  DollarSign,
  Calendar,
  Download,
  Upload,
  RotateCcw,
  ShieldCheck,
  ShieldAlert,
  Lock,
  KeyRound,
  UserCheck,
  Save,
  CheckCircle2,
  FileSpreadsheet,
  Archive,
  History as HistoryIcon,
  CalendarPlus,
  Trash2,
  Clock,
  AlertTriangle,
  Users,
  X,
  RefreshCw,
  Code,
  Copy,
  Plus,
  Pencil,
  UserPlus,
  HelpCircle,
  ExternalLink,
  Check,
} from 'lucide-react';
import { OFFICIAL_APPS_SCRIPT_CODE, SCRIPT_URL } from '../services/sheetsService';

export type SettingsTabId = 'centre' | 'sessions' | 'sheets' | 'security';

export const SystemSettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    isAdmin,
    currentSession,
    setSession,
    availableSessions,
    showToast,
    archives,
    createSessionArchive,
    deleteArchive,
    restoreArchive,
    downloadArchiveJSON,
    importArchiveJSON,
    auditLogs,
    exportAuditLogsCSV,
    exportAuditLogsJSON,
    connectionStatus,
    lastSheetSync,
    lastLatencyMs,
    customAppsScriptUrl,
    setCustomAppsScriptUrl,
    testCustomConnection,
    sheetUsers,
    saveSheetUser,
    deleteSheetUser,
    pullFromSheets,
    pushToSheets,
    isPullingSheets,
    isPushingSheets,
    requireEditingAuth,
    sessionIntakes,
    sessionCourseEvaluations,
  } = useApp();

  const [activeTab, setActiveTab] = useState<SettingsTabId>('centre');

  // Form State for Centre & Financials
  const [systemSettings, setSystemSettings] = useState(() => ({
    centreCode: settings.centreCode || 'SC-2033',
    centreName: settings.centreName || 'IGNOU Study Centre 2033',
    institutionName: settings.institutionName || "S.D. Jain Girls' College, Dimapur",
    hostInstitution: settings.hostInstitution || "S.D. Jain Girls' College, Dimapur",
    collegeName: settings.collegeName || "S.D. Jain Girls' College, Dimapur",
    regionalCentreCode: settings.regionalCentreCode || 'RC-20 Kohima',
    regionalCentre: settings.regionalCentre || 'RC-20 Kohima',
    coordinatorName: settings.coordinatorName || 'Dr. Sant K. Gupta',
    coordinatorContact: settings.coordinatorContact || '+91 9436013686 | sant.k.gupta@gmail.com',
    coordinatorPhone: settings.coordinatorPhone || '9436013686',
    coordinatorEmail: settings.coordinatorEmail || 'sant.k.gupta@gmail.com',
    coordinatorDesignation: settings.coordinatorDesignation || 'Coordinator, IGNOU SC-2033',
    remunerationRatePerScript: settings.remunerationRatePerScript || 25.0,
    remunerationRatePracticalPerScript: (settings as any).remunerationRatePracticalPerScript || 30.0,
    conveyanceAllowancePerPacket: settings.conveyanceAllowancePerPacket ?? 150.0,
  }));

  const [savedSuccess, setSavedSuccess] = useState(false);

  // New Academic Session Form
  const [newSessionName, setNewSessionName] = useState('');
  const [isAddingSession, setIsAddingSession] = useState(false);

  // Archival States
  const [selectedArchiveDetail, setSelectedArchiveDetail] = useState<SessionArchiveRecord | null>(null);
  const importFileInputRef = useRef<HTMLInputElement | null>(null);

  // Google Apps Script Connection Diagnostics
  const [isTestingScript, setIsTestingScript] = useState(false);
  const [scriptTestResult, setScriptTestResult] = useState<{
    status: 'success' | 'error' | null;
    message?: string;
    testedAt?: string;
  }>({ status: null });

  const [showScriptCode, setShowScriptCode] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);

  // Google Sheets Users Management Modal State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SheetUserAccount | null>(null);
  const [userForm, setUserForm] = useState({
    username: '',
    password: '',
    pin: '1001',
    fullName: '',
    email: '',
    role: 'desk' as 'admin' | 'desk',
    status: 'active' as 'active' | 'inactive',
  });

  const handleSaveCentreAndFinancials = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    const updated = {
      ...settings,
      ...systemSettings,
      centreCode: systemSettings.centreCode.trim(),
      regionalCentre: systemSettings.regionalCentre.trim(),
      regionalCentreCode: systemSettings.regionalCentre.trim(),
      hostInstitution: systemSettings.hostInstitution.trim(),
      institutionName: systemSettings.hostInstitution.trim(),
      collegeName: systemSettings.hostInstitution.trim(),
      coordinatorName: systemSettings.coordinatorName.trim(),
      coordinatorPhone: systemSettings.coordinatorPhone.trim(),
      coordinatorEmail: systemSettings.coordinatorEmail.trim(),
      coordinatorDesignation: systemSettings.coordinatorDesignation.trim(),
      coordinatorContact: `${systemSettings.coordinatorPhone.trim()} | ${systemSettings.coordinatorEmail.trim()}`,
      remunerationRatePerScript: Number(systemSettings.remunerationRatePerScript) || 25,
      remunerationRatePracticalPerScript: Number(systemSettings.remunerationRatePracticalPerScript) || 30,
      conveyanceAllowancePerPacket: Number(systemSettings.conveyanceAllowancePerPacket) || 150,
    };

    updateSettings(updated);
    setSavedSuccess(true);
    showToast('Centre details & remuneration rates updated successfully.', 'success');
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newSessionName.trim();
    if (!clean) return;
    if (availableSessions.includes(clean)) {
      showToast(`Session "${clean}" already exists.`, 'warning');
      return;
    }
    const updated = [...availableSessions, clean];
    updateSettings({ ...settings, availableSessions: updated });
    setSession(clean);
    setNewSessionName('');
    setIsAddingSession(false);
    showToast(`Session "${clean}" created and set as active.`, 'success');
  };

  const handleCreateSnapshot = () => {
    const desc = `Snapshot of ${currentSession} created on ${new Date().toLocaleDateString()}`;
    createSessionArchive({
      name: `${currentSession} Snapshot`,
      session: currentSession,
      notes: desc,
    });
    showToast(`Snapshot archive created for session ${currentSession}.`, 'success');
  };

  const handleImportArchiveFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const imported = importArchiveJSON(json);
        if (imported) {
          showToast(`Archive "${imported.name}" successfully imported.`, 'success');
        } else {
          showToast('Invalid archive structure.', 'error');
        }
      } catch {
        showToast('Failed to parse archive JSON file.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleTestConnection = async () => {
    setIsTestingScript(true);
    setScriptTestResult({ status: null });
    try {
      const res = await testCustomConnection();
      if (res.success && res.reachable) {
        setScriptTestResult({
          status: 'success',
          message: `Endpoint active & responsive. Latency: ${res.latencyMs}ms. Connected to sheets.`,
          testedAt: new Date().toLocaleTimeString(),
        });
        showToast('Google Sheets connection verified!', 'success');
      } else {
        setScriptTestResult({
          status: 'error',
          message: res.message || 'Connection unreachable. Check Apps Script deployment URL.',
          testedAt: new Date().toLocaleTimeString(),
        });
        showToast('Connection test failed. Check Apps Script URL.', 'error');
      }
    } catch (err: any) {
      setScriptTestResult({
        status: 'error',
        message: err.message || 'Network error pinging Google Sheets Web App.',
        testedAt: new Date().toLocaleTimeString(),
      });
      showToast('Error testing connection.', 'error');
    } finally {
      setIsTestingScript(false);
    }
  };

  const handleCopyUrl = () => {
    const url = customAppsScriptUrl || SCRIPT_URL;
    navigator.clipboard.writeText(url);
    setUrlCopied(true);
    showToast('Apps Script Web App URL copied to clipboard!', 'info');
    setTimeout(() => setUrlCopied(false), 2500);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(OFFICIAL_APPS_SCRIPT_CODE);
    setCodeCopied(true);
    showToast('Official Apps Script backend code copied!', 'info');
    setTimeout(() => setCodeCopied(false), 2500);
  };

  const handleOpenAddUser = () => {
    setEditingUser(null);
    setUserForm({
      username: '',
      password: '',
      pin: '1001',
      fullName: '',
      email: '',
      role: 'desk',
      status: 'active',
    });
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (user: SheetUserAccount) => {
    setEditingUser(user);
    setUserForm({
      username: user.username,
      password: user.password,
      pin: user.pin || (user.role === 'admin' ? '2033' : '1001'),
      fullName: user.fullName || '',
      email: user.email || '',
      role: user.role,
      status: user.status || 'active',
    });
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.username.trim() || !userForm.password.trim()) {
      showToast('Username and password are required', 'error');
      return;
    }
    const acc: SheetUserAccount = {
      username: userForm.username.trim(),
      password: userForm.password.trim(),
      pin: userForm.pin.trim() || (userForm.role === 'admin' ? '2033' : '1001'),
      role: userForm.role,
      fullName: userForm.fullName.trim() || userForm.username.trim(),
      email: userForm.email.trim(),
      status: userForm.status,
    };
    await saveSheetUser(acc);
    setIsUserModalOpen(false);
  };

  const handleDeleteUser = (username: string) => {
    requireEditingAuth(
      `Delete Staff Account: ${username}`,
      async () => {
        await deleteSheetUser(username);
        showToast(`Staff account "${username}" removed.`, 'info');
      },
      'Personal PIN or Master Passphrase verification required to delete staff accounts.'
    );
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base sm:text-lg font-bold text-zinc-900">
              System Settings & Institutional Governance
            </h2>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Study Centre 2033 • Dimapur • RC-20 Kohima
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono bg-zinc-100 text-zinc-700 px-3 py-1 rounded-full border border-zinc-200 flex items-center gap-1.5 font-bold">
            <span
              className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span>Active Session: <strong>{currentSession}</strong></span>
          </span>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center gap-2 font-semibold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>System configuration parameters saved successfully.</span>
        </div>
      )}

      {/* 4 Clean, Non-Overlapping Configuration Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-zinc-100/90 rounded-2xl border border-zinc-200 overflow-x-auto shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveTab('centre')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'centre'
              ? 'bg-white text-indigo-950 shadow-xs border border-zinc-200'
              : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/50'
          }`}
        >
          <Building2 className={`w-4 h-4 ${activeTab === 'centre' ? 'text-indigo-600' : 'text-zinc-500'}`} />
          <span>Centre & Financials</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sessions')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'sessions'
              ? 'bg-white text-indigo-950 shadow-xs border border-zinc-200'
              : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/50'
          }`}
        >
          <Calendar className={`w-4 h-4 ${activeTab === 'sessions' ? 'text-indigo-600' : 'text-zinc-500'}`} />
          <span>Sessions & Cycles</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sheets')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'sheets'
              ? 'bg-white text-indigo-950 shadow-xs border border-zinc-200'
              : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/50'
          }`}
        >
          <RefreshCw className={`w-4 h-4 ${activeTab === 'sheets' ? 'text-indigo-600' : 'text-zinc-500'}`} />
          <span>Google Sheets Connection</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            Two-Way
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'security'
              ? 'bg-white text-indigo-950 shadow-xs border border-zinc-200'
              : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/50'
          }`}
        >
          <ShieldCheck className={`w-4 h-4 ${activeTab === 'security' ? 'text-indigo-600' : 'text-zinc-500'}`} />
          <span>Security & Governance</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            PIN & RBAC
          </span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* TAB 1: CENTRE & FINANCIALS                                   */}
      {/* ============================================================ */}
      {activeTab === 'centre' && (
        <form onSubmit={handleSaveCentreAndFinancials} className="space-y-6 animate-in fade-in duration-200">
          {/* Centre Details */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2 font-bold text-sm text-zinc-900">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>Study Centre Profile</span>
              </div>
              <span className="text-[10px] font-mono bg-zinc-100 text-zinc-700 px-2.5 py-0.5 rounded-full border border-zinc-200 font-bold">
                IGNOU RC-20 Kohima
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Study Centre Code</label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={systemSettings.centreCode}
                  onChange={(e) => setSystemSettings({ ...systemSettings, centreCode: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg font-mono font-bold bg-zinc-50 disabled:opacity-75 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Regional Centre Code</label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={systemSettings.regionalCentre}
                  onChange={(e) => setSystemSettings({ ...systemSettings, regionalCentre: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg disabled:opacity-75 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-bold"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-zinc-700 mb-1">Host College / Institution Name</label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={systemSettings.hostInstitution}
                  onChange={(e) => setSystemSettings({ ...systemSettings, hostInstitution: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg disabled:opacity-75 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Coordinator Name</label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={systemSettings.coordinatorName}
                  onChange={(e) => setSystemSettings({ ...systemSettings, coordinatorName: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg disabled:opacity-75 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Coordinator Official Designation</label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={systemSettings.coordinatorDesignation}
                  onChange={(e) => setSystemSettings({ ...systemSettings, coordinatorDesignation: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg disabled:opacity-75 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Contact Phone</label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={systemSettings.coordinatorPhone}
                  onChange={(e) => setSystemSettings({ ...systemSettings, coordinatorPhone: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg font-mono disabled:opacity-75 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Contact Email</label>
                <input
                  type="email"
                  disabled={!isAdmin}
                  value={systemSettings.coordinatorEmail}
                  onChange={(e) => setSystemSettings({ ...systemSettings, coordinatorEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg font-mono disabled:opacity-75 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Financial Norms & Remuneration Rates */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2 font-bold text-sm text-zinc-900">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span>Statutory Remuneration & Financial Rates</span>
              </div>
              <span className="text-[10px] font-mono bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold">
                SED Norms
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Assignment Remuneration Rate / Script (₹)
                </label>
                <input
                  type="number"
                  step="0.50"
                  min="0"
                  disabled={!isAdmin}
                  value={systemSettings.remunerationRatePerScript}
                  onChange={(e) =>
                    setSystemSettings({ ...systemSettings, remunerationRatePerScript: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg font-bold disabled:opacity-75 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
                />
                <span className="text-[10px] text-zinc-500 mt-1 block">
                  Standard TMA evaluation rate (₹25.00)
                </span>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Practical Evaluation Rate / Script (₹)
                </label>
                <input
                  type="number"
                  step="0.50"
                  min="0"
                  disabled={!isAdmin}
                  value={systemSettings.remunerationRatePracticalPerScript}
                  onChange={(e) =>
                    setSystemSettings({ ...systemSettings, remunerationRatePracticalPerScript: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg font-bold disabled:opacity-75 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
                />
                <span className="text-[10px] text-zinc-500 mt-1 block">
                  Specialized practical evaluation rate (₹30.00)
                </span>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Conveyance Allowance / Packet (₹)
                </label>
                <input
                  type="number"
                  step="1.00"
                  min="0"
                  disabled={!isAdmin}
                  value={systemSettings.conveyanceAllowancePerPacket}
                  onChange={(e) =>
                    setSystemSettings({ ...systemSettings, conveyanceAllowancePerPacket: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg font-bold disabled:opacity-75 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
                />
                <span className="text-[10px] text-zinc-500 mt-1 block">
                  Conveyance grant per dispatched packet (₹150.00)
                </span>
              </div>
            </div>
          </div>

          {isAdmin && (
            <div className="flex items-center justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-md cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Centre &amp; Financial Changes</span>
              </button>
            </div>
          )}
        </form>
      )}

      {/* ============================================================ */}
      {/* TAB 2: SESSIONS & CYCLES                                     */}
      {/* ============================================================ */}
      {activeTab === 'sessions' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Active Session Switcher & Academic Cycle Manager */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-zinc-100 gap-2">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-bold text-sm sm:text-base text-zinc-900">
                    Academic Cycle &amp; Active Session Switcher
                  </h3>
                </div>
                <p className="text-xs text-zinc-500">
                  Switch the active operational cycle or add new admission terms. All desk intakes, packets, and marks filter by active session.
                </p>
              </div>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setIsAddingSession(!isAddingSession)}
                  className="px-3.5 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isAddingSession ? 'Cancel' : 'Add New Session'}</span>
                </button>
              )}
            </div>

            {/* Inline Add Session Form */}
            {isAddingSession && (
              <form onSubmit={handleCreateSession} className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-3 animate-in fade-in">
                <div className="font-bold text-xs text-indigo-950 flex items-center gap-1.5">
                  <CalendarPlus className="w-4 h-4 text-indigo-700" />
                  <span>Register New Academic Session</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="e.g. July 2026 or January 2027"
                    value={newSessionName}
                    onChange={(e) => setNewSessionName(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white border border-zinc-300 rounded-lg text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    Create &amp; Switch
                  </button>
                </div>
              </form>
            )}

            {/* Sessions Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {availableSessions.map((sess) => {
                const isActive = sess === currentSession;
                return (
                  <div
                    key={sess}
                    className={`p-3.5 rounded-xl border transition flex flex-col justify-between gap-3 ${
                      isActive
                        ? 'bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-500/20'
                        : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-xs text-zinc-900 flex items-center gap-1.5">
                          <span>{sess}</span>
                          {isActive && (
                            <span className="text-[10px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-zinc-500 mt-0.5">
                          {isActive ? 'Current working cycle' : 'Past / alternate cycle'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-zinc-200/60 pt-2 text-[11px]">
                      <span className="text-zinc-600 font-mono">
                        {isActive ? `${sessionIntakes.length} intakes` : 'Available'}
                      </span>
                      {!isActive && (
                        <button
                          type="button"
                          onClick={() => {
                            setSession(sess);
                            showToast(`Active session switched to ${sess}.`, 'success');
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-indigo-600 hover:text-white border border-zinc-300 rounded-lg text-[11px] font-bold text-zinc-700 transition cursor-pointer shadow-2xs"
                        >
                          Switch to {sess}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Session Archival & Zero Data Loss Backup */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-zinc-100 gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Archive className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-bold text-sm sm:text-base text-zinc-900">
                    Session Archival &amp; Database Snapshots
                  </h3>
                </div>
                <p className="text-xs text-zinc-500">
                  Safeguards candidate registrations, intakes, and evaluation marks with frozen snapshots.
                </p>
              </div>

              {isAdmin && (
                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={handleCreateSnapshot}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>Create Snapshot</span>
                  </button>

                  <label className="px-3.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-zinc-300 cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Import JSON</span>
                    <input
                      ref={importFileInputRef}
                      type="file"
                      accept=".json"
                      onChange={handleImportArchiveFile}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Archives List */}
            {archives.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-500 bg-zinc-50 rounded-xl border border-zinc-200">
                No session snapshots archived yet. Click "Create Snapshot" to freeze a verifiable backup of the current session.
              </div>
            ) : (
              <div className="border border-zinc-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 text-zinc-700 uppercase text-[10px] font-bold border-b border-zinc-200">
                    <tr>
                      <th className="py-2.5 px-3">Archive Title</th>
                      <th className="py-2.5 px-3">Session</th>
                      <th className="py-2.5 px-3">Archived At</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {archives.map((arc) => (
                      <tr key={arc.id} className="hover:bg-zinc-50/50">
                        <td className="py-2.5 px-3 font-semibold text-zinc-900">{arc.name}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-indigo-950">{arc.session}</td>
                        <td className="py-2.5 px-3 text-zinc-500">{formatDateTime(arc.archivedAt)}</td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => downloadArchiveJSON(arc)}
                              className="p-1.5 text-zinc-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                              title="Download JSON Backup"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => {
                                  requireEditingAuth(
                                    `Restore Snapshot: ${arc.name}`,
                                    () => {
                                      restoreArchive(arc.id);
                                      showToast(`Session ${arc.session} restored from archive.`, 'success');
                                    },
                                    'Restoring will overwrite current working tables with the snapshot.'
                                  );
                                }}
                                className="p-1.5 text-zinc-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                                title="Restore Snapshot"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: GOOGLE SHEETS CONNECTION & TWO-WAY SYNC               */}
      {/* ============================================================ */}
      {activeTab === 'sheets' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Web App Connection URL & Diagnostics */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-zinc-100 gap-2">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-bold text-sm sm:text-base text-zinc-900">
                    Google Sheets Web App Integration Endpoint
                  </h3>
                </div>
                <p className="text-xs text-zinc-500">
                  Connects the web application to your Google Spreadsheet via Google Apps Script Web App.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTestingScript}
                  className="px-3.5 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTestingScript ? 'animate-spin' : ''}`} />
                  <span>{isTestingScript ? 'Testing...' : 'Test Ping'}</span>
                </button>
              </div>
            </div>

            {/* URL Input with Copy Button */}
            <div className="space-y-1.5 text-xs">
              <label className="block font-semibold text-zinc-700">Apps Script Web App URL</label>
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  value={customAppsScriptUrl || SCRIPT_URL}
                  onChange={(e) => setCustomAppsScriptUrl(e.target.value.trim())}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="flex-1 px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl font-bold text-xs transition flex items-center gap-1 cursor-pointer border border-zinc-300"
                >
                  {urlCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{urlCopied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Test result banner */}
            {scriptTestResult.status && (
              <div
                className={`p-3 rounded-xl text-xs flex items-start gap-2 border animate-in fade-in ${
                  scriptTestResult.status === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    : 'bg-rose-50 border-rose-200 text-rose-950'
                }`}
              >
                {scriptTestResult.status === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold">{scriptTestResult.message}</div>
                  {scriptTestResult.testedAt && (
                    <div className="text-[10px] text-zinc-500 mt-0.5">Tested at {scriptTestResult.testedAt}</div>
                  )}
                </div>
              </div>
            )}

            {/* Simple & Reliable Two-Way Manual Sync Controls */}
            <div className="p-4 bg-indigo-50/70 border border-indigo-200/80 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-xs text-indigo-950 block">
                    Two-Way Bidirectional Synchronization Controls
                  </span>
                  <p className="text-[11px] text-indigo-900 mt-0.5">
                    Simple and reliable manual sync. Keeps your local data safe even during network delays.
                  </p>
                </div>
                <div className="text-[10.5px] font-mono text-zinc-600 text-right">
                  {lastSheetSync ? `Last synced: ${formatDateTime(lastSheetSync)}` : 'Ready to sync'}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => pullFromSheets(false)}
                  disabled={isPullingSheets || isPushingSheets}
                  className="py-2.5 px-4 bg-white hover:bg-zinc-50 border border-zinc-300 text-indigo-950 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 text-indigo-600 ${isPullingSheets ? 'animate-spin' : ''}`} />
                  <span>{isPullingSheets ? 'Pulling Data...' : '↓ Pull from Google Sheets'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => pushToSheets(false)}
                  disabled={isPullingSheets || isPushingSheets}
                  className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 text-white ${isPushingSheets ? 'animate-spin' : ''}`} />
                  <span>{isPushingSheets ? 'Pushing Data...' : '↑ Push to Google Sheets'}</span>
                </button>
              </div>
            </div>

            {/* Verified Tab Mappings */}
            <div className="space-y-2 text-xs">
              <span className="font-bold text-zinc-700 uppercase tracking-wider text-[10px] block">
                Verified Google Sheets Tab Architecture
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { name: 'Intake_Register', role: 'Candidate Submissions' },
                  { name: 'Course_Ledger', role: 'Scripts & Evaluations' },
                  { name: 'Evaluators_Master', role: 'Evaluator Directory' },
                  { name: 'Fresh_Admissions', role: 'Fresh Admissions Census' },
                  { name: 'Re_Registration', role: 'Re-Registration Census' },
                  { name: 'Users', role: 'Staff Auth & Personal PINs' },
                ].map((tab) => (
                  <div key={tab.name} className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl space-y-0.5">
                    <div className="font-mono font-bold text-zinc-900 text-[11px] flex items-center gap-1">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{tab.name}</span>
                    </div>
                    <div className="text-[10px] text-zinc-500">{tab.role}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Collapsible Apps Script Code Block */}
            <div className="pt-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setShowScriptCode(!showScriptCode)}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 cursor-pointer"
              >
                <Code className="w-4 h-4" />
                <span>{showScriptCode ? 'Hide Apps Script Code' : 'View Backend Apps Script Code (Google Sheets)'}</span>
              </button>

              {showScriptCode && (
                <div className="mt-3 p-3.5 bg-zinc-950 text-zinc-200 rounded-xl space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-800">
                    <span className="font-mono text-[11px] text-zinc-400">Code.gs (Apps Script)</span>
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-[11px] font-bold cursor-pointer transition flex items-center gap-1"
                    >
                      {codeCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{codeCopied ? 'Copied' : 'Copy Code'}</span>
                    </button>
                  </div>
                  <pre className="font-mono text-[10.5px] max-h-60 overflow-y-auto leading-relaxed text-zinc-300">
                    {OFFICIAL_APPS_SCRIPT_CODE}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 4: SECURITY & GOVERNANCE                                 */}
      {/* ============================================================ */}
      {activeTab === 'security' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Section 1: Google Sheets Users Directory & Personal PIN Management */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-zinc-100 gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-bold text-sm sm:text-base text-zinc-900">
                    Google Sheets Users &amp; Personal PIN Management
                  </h3>
                  <span className="text-[10px] font-mono bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                    'Users' Tab
                  </span>
                </div>
                <p className="text-xs text-zinc-500">
                  Staff credentials and personal PINs loaded from your connected Google Sheet (<code className="font-mono text-zinc-700 bg-zinc-100 px-1 py-0.5 rounded">Users</code> tab). Personal PINs authorize data editing and deletions.
                </p>
              </div>

              {isAdmin && (
                <button
                  type="button"
                  onClick={handleOpenAddUser}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer shrink-0"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Add Staff Account</span>
                </button>
              )}
            </div>

            {/* Users Table with PIN Column */}
            <div className="border border-zinc-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 text-zinc-700 uppercase text-[10px] font-bold border-b border-zinc-200">
                    <tr>
                      <th className="py-2.5 px-3">Username</th>
                      <th className="py-2.5 px-3">Full Name</th>
                      <th className="py-2.5 px-3">Assigned Role</th>
                      <th className="py-2.5 px-3">Security PIN</th>
                      <th className="py-2.5 px-3">Email Address</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {sheetUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-zinc-500">
                          No users loaded from Google Sheets Users tab. Click "Add Staff Account" to configure credentials.
                        </td>
                      </tr>
                    ) : (
                      sheetUsers.map((u) => {
                        const isCoord = u.role === 'admin';
                        const pinVal = u.pin || (isCoord ? '2033' : '1001');
                        return (
                          <tr key={u.username} className="hover:bg-zinc-50/50">
                            <td className="py-2.5 px-3 font-mono font-bold text-zinc-900">{u.username}</td>
                            <td className="py-2.5 px-3 font-semibold text-zinc-800">{u.fullName || '-'}</td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                                  isCoord
                                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                    : 'bg-teal-50 text-teal-700 border border-teal-200'
                                }`}
                              >
                                {isCoord ? 'Coordinator (Admin)' : 'Intake Desk Staff'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="font-mono font-bold bg-zinc-100 text-zinc-900 px-2 py-0.5 rounded border border-zinc-300">
                                {pinVal}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-zinc-600 font-mono text-[11px]">{u.email || '-'}</td>
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  u.status !== 'inactive'
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    : 'bg-zinc-100 text-zinc-500'
                                }`}
                              >
                                {u.status !== 'inactive' ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              {isAdmin && (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditUser(u)}
                                    className="p-1 text-zinc-600 hover:text-indigo-600 hover:bg-indigo-50 rounded transition cursor-pointer"
                                    title="Edit User & PIN"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteUser(u.username)}
                                    className="p-1 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                                    title="Delete User"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Note on Step-Up PIN and Master Override */}
            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl space-y-1 text-xs text-zinc-600">
              <div className="font-bold text-zinc-900 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
                <span>Security Gatekeeper Policy: Personal PINs &amp; Master Override</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Editing or deleting intakes, evaluator allotments, and entered marks strictly prompts for the staff member's personal PIN from the <code className="font-mono bg-white px-1 py-0.5 rounded border border-zinc-300">Users</code> tab. The Coordinator Master Passphrase (<code className="font-mono bg-white px-1 py-0.5 rounded border border-zinc-300">sc2033coordinator</code>) serves as an emergency override if staff forget their PIN.
              </p>
            </div>
          </div>

          {/* Section 2: Role-Based Access Control (RBAC) & Master Passphrase Governance */}
          <div className="space-y-4">
            <RbacGovernanceSettings />
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODALS                                                       */}
      {/* ============================================================ */}

      {/* GOOGLE SHEETS USER MODAL (WITH PIN) */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-zinc-200 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-zinc-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm">
                  {editingUser ? 'Edit Staff User Account & PIN' : 'Add New Staff User Account'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsUserModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Username (Login ID) *</label>
                <input
                  type="text"
                  required
                  disabled={!!editingUser}
                  value={userForm.username}
                  onChange={(e) =>
                    setUserForm({ ...userForm, username: e.target.value.toLowerCase().replace(/\s+/g, '_') })
                  }
                  placeholder="e.g. sant_gupta or desk_operator1"
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg font-mono font-bold bg-zinc-50 disabled:opacity-75 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Password *</label>
                <input
                  type="text"
                  required
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  placeholder="Enter login password"
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg font-mono focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Operational Security PIN (4 Digits) *
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={userForm.pin}
                  onChange={(e) => setUserForm({ ...userForm, pin: e.target.value.replace(/[^0-9]/g, '') })}
                  placeholder="e.g. 2033 (Coordinator) or 1001 (Desk)"
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-[10px] text-zinc-500 mt-0.5 block">
                  Required when editing or deleting intakes, allotments, and entered marks.
                </span>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={userForm.fullName}
                  onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
                  placeholder="e.g. Dr. Sant Kumar Gupta"
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  placeholder="e.g. sant.k.gupta@gmail.com"
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg font-mono focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Role</label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value as 'admin' | 'desk' })}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg font-bold bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="admin">Coordinator (Admin)</option>
                    <option value="desk">Intake Desk Staff</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Status</label>
                  <select
                    value={userForm.status}
                    onChange={(e) => setUserForm({ ...userForm, status: e.target.value as 'active' | 'inactive' })}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg font-bold bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition cursor-pointer shadow-xs"
                >
                  {editingUser ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
