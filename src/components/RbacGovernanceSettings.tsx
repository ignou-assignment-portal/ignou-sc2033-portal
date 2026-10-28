import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { RbacOperation, RbacAccessLevel, RbacPolicy } from '../types';
import {
  ShieldCheck,
  ShieldAlert,
  Shield,
  Lock,
  KeyRound,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Save,
  Check,
  Eye,
  EyeOff,
  SlidersHorizontal,
} from 'lucide-react';

export const RbacGovernanceSettings: React.FC = () => {
  const {
    rbacConfig,
    updateRbacConfig,
    resetRbacToDefaults,
    securityPins,
    updateSecurityPins,
    securityCredentials,
    updateSecurityCredentials,
    settings,
    isAdmin,
    showToast,
    logAuditEvent,
    currentSession,
  } = useApp();

  const [deskPinInput, setDeskPinInput] = useState(securityPins.deskPin || '1001');
  const [adminPinInput, setAdminPinInput] = useState(securityPins.adminPin || settings.adminPin || '2033');
  const [staffUsernameInput, setStaffUsernameInput] = useState(securityCredentials.staffAccount.username || 'desk_official');
  const [staffPasswordInput, setStaffPasswordInput] = useState(securityCredentials.staffAccount.password || 'sc2033desk');
  const [coordinatorUsernameInput, setCoordinatorUsernameInput] = useState(securityCredentials.coordinatorAccount.username || 'coordinator');
  const [masterPassphraseInput, setMasterPassphraseInput] = useState(securityCredentials.coordinatorAccount.masterPassphrase || 'sc2033coordinator');
  const [showPins, setShowPins] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Categories for grouping
  const categories: Array<{ id: RbacPolicy['category']; title: string; badge: string }> = [
    { id: 'Intake', title: 'Stage 1: Student Intake Operations', badge: 'Front Counter' },
    { id: 'Evaluation', title: 'Stage 2 & 3: Evaluation, Marks & Award Sheets', badge: 'Continuous Evaluation' },
    { id: 'Finance', title: 'Stage 4: Remuneration Claims & Billing', badge: 'F&AD Finance' },
    { id: 'Administration', title: 'Institutional Governance & Configuration', badge: 'Coordinator Office' },
  ];

  const handleLevelChange = (op: RbacOperation, level: RbacAccessLevel) => {
    if (!isAdmin) {
      showToast('Modification restricted: Requires Coordinator Authority.', 'error');
      return;
    }

    const currentPolicies = { ...rbacConfig.policies };
    if (currentPolicies[op]) {
      currentPolicies[op] = {
        ...currentPolicies[op],
        desk: level,
      };
      updateRbacConfig({ policies: currentPolicies });
      setHasUnsavedChanges(true);
      showToast(`Permission updated: ${currentPolicies[op].label} set to ${level}`, 'success');

      logAuditEvent({
        action: 'SETTINGS_UPDATED',
        category: 'SECURITY',
        actor: `${settings.coordinatorName || 'Coordinator'} (Admin)`,
        role: 'ADMIN',
        session: currentSession,
        summary: `RBAC permission modified for ${op} -> ${level}`,
        details: { operation: op, newLevel: level },
        status: 'SUCCESS',
      });
    }
  };

  const handleApplyPreset = (presetName: 'STRICT_STATUTORY' | 'FLEXIBLE_COUNTER' | 'STRICT_LOCKOUT') => {
    if (!isAdmin) {
      showToast('Modification restricted: Requires Coordinator Authority.', 'error');
      return;
    }

    const updated = { ...rbacConfig.policies };

    if (presetName === 'STRICT_STATUTORY') {
      // Desk handles intake; marks locking and bills remain coordinator-protected with PIN
      updated.intake_registration = { ...updated.intake_registration, desk: 'ALLOWED' };
      updated.intake_edit_delete = { ...updated.intake_edit_delete, desk: 'PIN_REQUIRED' };
      updated.marks_entry = { ...updated.marks_entry, desk: 'ALLOWED' };
      updated.marks_locking = { ...updated.marks_locking, desk: 'PIN_REQUIRED' };
      updated.packets_dispatch = { ...updated.packets_dispatch, desk: 'ALLOWED' };
      updated.remuneration_billing = { ...updated.remuneration_billing, desk: 'PIN_REQUIRED' };
      updated.sed_award_sheets = { ...updated.sed_award_sheets, desk: 'ALLOWED' };
      updated.evaluators_directory = { ...updated.evaluators_directory, desk: 'ALLOWED' };
      updated.system_settings = { ...updated.system_settings, desk: 'FORBIDDEN' };
      updated.forensic_audit_trail = { ...updated.forensic_audit_trail, desk: 'FORBIDDEN' };

      updateRbacConfig({
        requireCoordinatorPinForMarksLock: true,
        requireCoordinatorPinForBilling: true,
        policies: updated,
      });
      showToast('Applied "Statutory Strict" RBAC Profile: Marks locking & bills are coordinator-protected.', 'success');
    } else if (presetName === 'FLEXIBLE_COUNTER') {
      // Flexible examination counter
      updated.intake_registration = { ...updated.intake_registration, desk: 'ALLOWED' };
      updated.intake_edit_delete = { ...updated.intake_edit_delete, desk: 'ALLOWED' };
      updated.marks_entry = { ...updated.marks_entry, desk: 'ALLOWED' };
      updated.marks_locking = { ...updated.marks_locking, desk: 'PIN_REQUIRED' };
      updated.packets_dispatch = { ...updated.packets_dispatch, desk: 'ALLOWED' };
      updated.remuneration_billing = { ...updated.remuneration_billing, desk: 'PIN_REQUIRED' };
      updated.sed_award_sheets = { ...updated.sed_award_sheets, desk: 'ALLOWED' };
      updated.evaluators_directory = { ...updated.evaluators_directory, desk: 'ALLOWED' };
      updated.system_settings = { ...updated.system_settings, desk: 'FORBIDDEN' };
      updated.forensic_audit_trail = { ...updated.forensic_audit_trail, desk: 'FORBIDDEN' };

      updateRbacConfig({
        requireCoordinatorPinForMarksLock: true,
        requireCoordinatorPinForBilling: true,
        policies: updated,
      });
      showToast('Applied "Flexible Examination Counter" RBAC Profile.', 'success');
    } else if (presetName === 'STRICT_LOCKOUT') {
      // Desk only records intake; all evaluations & finances locked to coordinator
      updated.intake_registration = { ...updated.intake_registration, desk: 'ALLOWED' };
      updated.intake_edit_delete = { ...updated.intake_edit_delete, desk: 'FORBIDDEN' };
      updated.marks_entry = { ...updated.marks_entry, desk: 'FORBIDDEN' };
      updated.marks_locking = { ...updated.marks_locking, desk: 'FORBIDDEN' };
      updated.packets_dispatch = { ...updated.packets_dispatch, desk: 'FORBIDDEN' };
      updated.remuneration_billing = { ...updated.remuneration_billing, desk: 'FORBIDDEN' };
      updated.sed_award_sheets = { ...updated.sed_award_sheets, desk: 'FORBIDDEN' };
      updated.evaluators_directory = { ...updated.evaluators_directory, desk: 'FORBIDDEN' };
      updated.system_settings = { ...updated.system_settings, desk: 'FORBIDDEN' };
      updated.forensic_audit_trail = { ...updated.forensic_audit_trail, desk: 'FORBIDDEN' };

      updateRbacConfig({
        requireCoordinatorPinForMarksLock: true,
        requireCoordinatorPinForBilling: true,
        policies: updated,
      });
      showToast('Applied "Intake Desk Only" RBAC Lockout Profile.', 'success');
    }
  };

  const handleSavePins = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showToast('Security credential modification requires Coordinator Authority.', 'error');
      return;
    }

    const cleanDesk = deskPinInput.trim() || '1001';
    const cleanAdmin = adminPinInput.trim() || '2033';
    const cleanStaffUser = staffUsernameInput.trim() || 'desk_official';
    const cleanStaffPass = staffPasswordInput.trim() || 'sc2033desk';
    const cleanCoordUser = coordinatorUsernameInput.trim() || 'coordinator';
    const cleanCoordPass = masterPassphraseInput.trim() || 'sc2033coordinator';

    updateSecurityCredentials({
      staffAccount: {
        ...securityCredentials.staffAccount,
        username: cleanStaffUser,
        password: cleanStaffPass,
      },
      coordinatorAccount: {
        ...securityCredentials.coordinatorAccount,
        username: cleanCoordUser,
        masterPassphrase: cleanCoordPass,
      },
    });

    updateSecurityPins({ deskPin: cleanDesk, adminPin: cleanAdmin });
    showToast('Terminal credentials, Master Passphrase, and PINs saved.', 'success');
    setHasUnsavedChanges(false);

    logAuditEvent({
      action: 'SECURITY_CREDENTIALS_UPDATED',
      category: 'SECURITY',
      actor: `${settings.coordinatorName || 'Coordinator'} (Admin)`,
      role: 'ADMIN',
      session: currentSession,
      summary: `Security access credentials and Master Passphrase updated by Coordinator`,
      status: 'SUCCESS',
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Governance & Role Definition Banner */}
      <div className="bg-linear-to-r from-zinc-950 via-indigo-950 to-zinc-900 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-zinc-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/10 text-amber-300 text-[10px] font-bold tracking-wider uppercase mb-1">
                <Sparkles className="w-3 h-3" />
                <span>IGNOU SC-2033 Statutory Policy</span>
              </div>
              <h3 className="text-base sm:text-lg font-black tracking-tight text-white leading-tight">
                Role-Based Access Control & Governance
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              RBAC Engine: Active
            </span>
          </div>
        </div>

        <p className="text-xs text-zinc-300 leading-relaxed max-w-3xl">
          Desk officials handle front-counter intake registrations and script receiving, while master marks locking, remuneration claims, and governance remain strictly Coordinator-protected.
        </p>

        {/* Institutional Roles Comparison Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-zinc-800 text-xs">
          {/* Desk Official Card */}
          <div className="p-3.5 bg-zinc-900/80 rounded-xl border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-zinc-100">
                <UserCheck className="w-4 h-4 text-indigo-400" />
                <span>Desk Official Role (`desk`)</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-800">
                User: {securityCredentials?.staffAccount?.username || 'desk_official'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Authorized for rapid student walk-in intake registrations, physical script acknowledgment slips, and course packet creation. High-risk actions prompt for Coordinator Master Step-Up Passphrase.
            </p>
          </div>

          {/* Coordinator Card */}
          <div className="p-3.5 bg-zinc-900/80 rounded-xl border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-amber-300">
                <Shield className="w-4 h-4 text-amber-400" />
                <span>Centre Coordinator Role (`admin`)</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950/80 text-amber-300 border border-amber-800">
                Master Passphrase Protected
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Retains statutory finalization authority: Marks locking, practical evaluation sign-offs, faculty remuneration vouchers, cloud synchronization, and forensic audit trail inspection.
            </p>
          </div>
        </div>

        {/* Forensic Audit Trail Privacy Policy Badge */}
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed text-[11.5px]">
            <strong>Audit Trail Governance:</strong> The <strong>Forensic Audit Trail</strong> is completely hidden and inaccessible to Desk officials to protect confidential institutional logs and prevent operational tampering.
          </div>
        </div>
      </div>

      {/* 2. Security Profile Presets Bar */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-zinc-600">
            <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
            <span>Quick Security Profiles</span>
          </div>
          <span className="text-[11px] text-zinc-400">Click to apply standard IGNOU security presets</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={() => handleApplyPreset('STRICT_STATUTORY')}
            className="p-3 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-left transition cursor-pointer group shadow-2xs"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-xs text-indigo-950">Statutory Strict</span>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-600 text-white">Recommended</span>
            </div>
            <p className="text-[11px] text-zinc-600 leading-tight">
              Desk handles intake; marks locking and remuneration bills require Coordinator PIN override.
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleApplyPreset('FLEXIBLE_COUNTER')}
            className="p-3 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-left transition cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-xs text-zinc-900">Flexible Counter</span>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-zinc-200 text-zinc-700">Open Intake</span>
            </div>
            <p className="text-[11px] text-zinc-600 leading-tight">
              Desk can enter marks; marks locking and bills remain coordinator-protected.
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleApplyPreset('STRICT_LOCKOUT')}
            className="p-3 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-left transition cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-xs text-zinc-900">Intake Desk Only</span>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800">Restricted</span>
            </div>
            <p className="text-[11px] text-zinc-600 leading-tight">
              Desk can only issue receipts; all grading and financial tools restricted to Coordinator.
            </p>
          </button>
        </div>
      </div>

      {/* 3. Granular Operations Permissions Matrix */}
      <div className="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-3 bg-zinc-50/60">
          <div>
            <h4 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>Granular Permissions Matrix</span>
            </h4>
            <p className="text-xs text-zinc-500 mt-0.5">
              Define operational authorization levels for Desk Officials vs Coordinator.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              resetRbacToDefaults();
              showToast('RBAC policies reset to statutory defaults.', 'info');
            }}
            className="px-3 py-1.5 rounded-lg border border-zinc-300 hover:bg-zinc-100 text-zinc-700 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
        </div>

        {/* Matrix Table */}
        <div className="divide-y divide-zinc-200">
          {categories.map((cat) => {
            const catOperations = (Object.keys(rbacConfig.policies) as RbacOperation[]).filter(
              (op) => rbacConfig.policies[op]?.category === cat.id
            );

            if (catOperations.length === 0) return null;

            return (
              <div key={cat.id} className="p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-zinc-900 uppercase tracking-tight">{cat.title}</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200 font-semibold">
                    {cat.badge}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {catOperations.map((opKey) => {
                    const policy = rbacConfig.policies[opKey];
                    if (!policy) return null;

                    const deskLevel = policy.desk;

                    return (
                      <div
                        key={opKey}
                        className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-zinc-300 transition"
                      >
                        {/* Operation Details */}
                        <div className="space-y-0.5 flex-1 pr-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-zinc-900">{policy.label}</span>
                            {opKey === 'marks_locking' && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                Coordinator Protected
                              </span>
                            )}
                            {opKey === 'remuneration_billing' && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                Coordinator Protected
                              </span>
                            )}
                            {opKey === 'forensic_audit_trail' && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-900 border border-rose-300">
                                Hidden for Desk
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-500">{policy.description}</p>
                        </div>

                        {/* Role Authority Controls */}
                        <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                          {/* Desk Access Selector */}
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] font-bold uppercase text-zinc-500 mb-1">
                              Desk Official Access
                            </span>
                            <div className="inline-flex rounded-lg border border-zinc-200 p-0.5 bg-white shadow-2xs">
                              <button
                                type="button"
                                onClick={() => handleLevelChange(opKey, 'ALLOWED')}
                                className={`px-2 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                                  deskLevel === 'ALLOWED'
                                    ? 'bg-emerald-600 text-white shadow-2xs'
                                    : 'text-zinc-600 hover:text-zinc-950'
                                }`}
                                title="Allowed directly without PIN"
                              >
                                Allowed
                              </button>
                              <button
                                type="button"
                                onClick={() => handleLevelChange(opKey, 'PIN_REQUIRED')}
                                className={`px-2 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                                  deskLevel === 'PIN_REQUIRED'
                                    ? 'bg-amber-500 text-white shadow-2xs'
                                    : 'text-zinc-600 hover:text-zinc-950'
                                }`}
                                title="Requires Coordinator PIN challenge"
                              >
                                PIN Req.
                              </button>
                              <button
                                type="button"
                                onClick={() => handleLevelChange(opKey, 'FORBIDDEN')}
                                className={`px-2 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                                  deskLevel === 'FORBIDDEN'
                                    ? 'bg-rose-600 text-white shadow-2xs'
                                    : 'text-zinc-600 hover:text-zinc-950'
                                }`}
                                title="Forbidden for desk official"
                              >
                                Forbidden
                              </button>
                            </div>
                          </div>

                          {/* Coordinator Authority Badge */}
                          <div className="flex flex-col items-end pl-2 border-l border-zinc-200">
                            <span className="text-[10px] font-bold uppercase text-zinc-500 mb-1">
                              Coordinator
                            </span>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 text-[11px] font-bold">
                              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                              <span>Full Authority</span>
                            </span>
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
      </div>

      {/* 4. Security Credentials & Master Passphrase Governance Card */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2 font-bold text-sm text-zinc-900">
            <KeyRound className="w-4 h-4 text-indigo-600" />
            <span>Terminal Security Credentials & Master Passphrase</span>
          </div>
          <button
            type="button"
            onClick={() => setShowPins(!showPins)}
            className="text-xs text-zinc-500 hover:text-zinc-800 flex items-center gap-1 cursor-pointer font-medium"
          >
            {showPins ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{showPins ? 'Hide Secrets' : 'Reveal Passphrases'}</span>
          </button>
        </div>

        <form onSubmit={handleSavePins} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Desk Staff Credentials */}
            <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2">
              <label className="block text-xs font-bold text-zinc-800">
                Staff Counter Account (Intake Desk):
              </label>
              <div className="space-y-1.5">
                <input
                  type="text"
                  value={staffUsernameInput}
                  onChange={(e) => setStaffUsernameInput(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs font-mono text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-600"
                  placeholder="Username: desk_official"
                />
                <input
                  type={showPins ? 'text' : 'password'}
                  value={staffPasswordInput}
                  onChange={(e) => setStaffPasswordInput(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs font-mono text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-600"
                  placeholder="Password: sc2033desk"
                />
                <input
                  type={showPins ? 'text' : 'password'}
                  maxLength={6}
                  value={deskPinInput}
                  onChange={(e) => setDeskPinInput(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs font-mono font-bold tracking-widest text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-600"
                  placeholder="PIN: 1001"
                />
              </div>
              <span className="text-[10px] text-zinc-500 block">
                Counter staff credentials & quick PIN shortcut (`1001`).
              </span>
            </div>

            {/* Coordinator Admin Master Credentials */}
            <div className="p-3.5 bg-amber-50/50 border border-amber-200 rounded-xl space-y-2">
              <label className="block text-xs font-bold text-amber-950 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-amber-600" />
                <span>Coordinator Master Passphrase (Protected):</span>
              </label>
              <div className="space-y-1.5">
                <input
                  type="text"
                  value={coordinatorUsernameInput}
                  onChange={(e) => setCoordinatorUsernameInput(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-mono text-amber-950 focus:outline-hidden focus:ring-2 focus:ring-amber-600"
                  placeholder="Coordinator ID: coordinator"
                />
                <input
                  type={showPins ? 'text' : 'password'}
                  value={masterPassphraseInput}
                  onChange={(e) => setMasterPassphraseInput(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-mono text-amber-950 focus:outline-hidden focus:ring-2 focus:ring-amber-600"
                  placeholder="Master Passphrase: sc2033coordinator"
                />
                <input
                  type={showPins ? 'text' : 'password'}
                  maxLength={6}
                  value={adminPinInput}
                  onChange={(e) => setAdminPinInput(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-mono font-bold tracking-widest text-amber-950 focus:outline-hidden focus:ring-2 focus:ring-amber-600"
                  placeholder="PIN: 2033"
                />
              </div>
              <span className="text-[10px] text-amber-800 block">
                Required for marks locking, remuneration bills, settings, and step-up challenges.
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-zinc-500 font-medium">
              Last Policy Update: <strong>{rbacConfig.lastUpdated ? new Date(rbacConfig.lastUpdated).toLocaleString() : 'System Default'}</strong>
            </span>

            <button
              type="submit"
              className="px-4 py-2 bg-indigo-950 hover:bg-indigo-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Security Credentials & Passphrase</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
