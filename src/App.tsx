import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Header } from './components/Header';
import { Sidebar, TabType } from './components/Sidebar';
import { IntakeDesk } from './components/IntakeDesk';
import { CourseSubmissionsTracker } from './components/CourseSubmissionsTracker';
import { IntakeRegister } from './components/IntakeRegister';
import { MarksEntry } from './components/MarksEntry';
import { CourseLedgerView } from './components/CourseLedgerView';
import { CourseEvaluationMaster } from './components/CourseEvaluationMaster';
import { RegionalCentreSEDAwardSheet } from './components/RegionalCentreSEDAwardSheet';
import { EvaluatorDirectory } from './components/EvaluatorDirectory';
import { RemunerationBilling } from './components/RemunerationBilling';
import { SystemSettingsView } from './components/SystemSettingsView';
import { AuditTrail } from './components/AuditTrail';
import { IntegrityAuditView } from './components/IntegrityAuditView';
import { ReceiptModal } from './components/ReceiptModal';
import { RegistrationReceiptModal } from './components/RegistrationReceiptModal';
import { StudentSearchModal } from './components/StudentSearchModal';
import { AdminPinModal } from './components/AdminPinModal';
import { GatekeeperLockScreen } from './components/GatekeeperLockScreen';
import { StudyCentreHomePage } from './components/StudyCentreHomePage';
import { QuickActionBar } from './components/QuickActionBar';
import { Toast } from './components/Toast';

interface DashboardContentProps {
  onViewHome: () => void;
}

const DashboardContent: React.FC<DashboardContentProps> = ({ onViewHome }) => {
  const [activeTab, setActiveTab] = useState<TabType>('INTAKE_DESK');
  const {
    currentSession,
    isAdmin,
    isUrlLockedDeskMode,
    userRole,
    settings,
    fetchAllData,
    isContentFullWidth,
  } = useApp();

  // Automatic Sync on Startup & Login (PC & Mobile)
  useEffect(() => {
    fetchAllData();
  }, []);

  // Ensure restricted tabs are redirected in desk mode (Allow only INTAKE_DESK & EVALUATION_MASTER)
  useEffect(() => {
    if (!isAdmin || userRole === 'desk' || isUrlLockedDeskMode) {
      if (activeTab !== 'INTAKE_DESK' && activeTab !== 'EVALUATION_MASTER') {
        setActiveTab('INTAKE_DESK');
      }
    }
  }, [userRole, isUrlLockedDeskMode, isAdmin, activeTab]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      {/* Institutional Top Header */}
      <Header onViewHome={onViewHome} />

      {/* Main Layout: Collapsible & Hideable Left Sidebar + Responsive Workspace */}
      <div className="flex flex-1 relative">
        {/* Left Sidebar (260px expanded, 72px collapsed rail, or smooth burger hide) */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onViewHome={onViewHome} />

        {/* Workspace Content Area */}
        <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
          {/* Counter Productivity Quick Action Bar */}
          <QuickActionBar activeTab={activeTab} setActiveTab={setActiveTab} />

          <main className={`flex-1 w-full mx-auto p-3 sm:p-5 space-y-5 transition-all duration-200 ${
            isContentFullWidth ? 'max-w-none px-4 sm:px-6' : 'max-w-7xl px-4 sm:p-6'
          }`}>
            <ErrorBoundary fallbackTitle="Workspace Desk Encountered an Issue">
              {activeTab === 'INTAKE_DESK' && <IntakeDesk />}
              {activeTab === 'EVALUATION_MASTER' && <CourseEvaluationMaster />}
              {isAdmin && activeTab === 'SUBMISSIONS_TRACKER' && <CourseSubmissionsTracker />}
              {isAdmin && activeTab === 'INTAKE_REGISTER' && <IntakeRegister />}
              {isAdmin && activeTab === 'SED_AWARD_SHEETS' && <RegionalCentreSEDAwardSheet />}
              {isAdmin && activeTab === 'MARKS_ENTRY' && <MarksEntry />}
              {isAdmin && activeTab === 'COURSE_LEDGER' && <CourseLedgerView />}
              {isAdmin && activeTab === 'EVALUATORS' && <EvaluatorDirectory />}
              {isAdmin && activeTab === 'REMUNERATION' && <RemunerationBilling />}
              {isAdmin && activeTab === 'INTEGRITY_AUDIT' && <IntegrityAuditView />}
              {isAdmin && activeTab === 'AUDIT_TRAIL' && <AuditTrail />}
              {isAdmin && activeTab === 'SETTINGS' && <SystemSettingsView />}
            </ErrorBoundary>
          </main>

          {/* Institutional Footer */}
          <footer className="bg-white border-t border-zinc-200 py-4 px-6 text-xs text-zinc-500 mt-auto">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="font-bold text-zinc-800">IGNOU SC-2033</span>
                <span>•</span>
                <span>Assignment Operations & Evaluation Cell</span>
                <span>•</span>
                <span className="text-zinc-600 font-mono">Isolated Cycle: {currentSession}</span>
              </div>

              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${isAdmin ? 'bg-indigo-600' : 'bg-teal-600'}`}></span>
                  Active Role:{' '}
                  <strong className="text-zinc-800">
                    {isUrlLockedDeskMode
                      ? 'Desk Official (Enforced via URL ?mode=desk / ?role=official)'
                      : isAdmin
                      ? 'Administrator (Coordinator)'
                      : 'Desk Official'}
                  </strong>
                </span>
                <span>•</span>
                <span>{settings.regionalCentreCode}</span>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
};

type AppViewMode = 'home' | 'gatekeeper' | 'dashboard';

const MainApp: React.FC = () => {
  const { isAuthenticated, toastMessage, toastType, hideToast } = useApp();

  // Route & view mode state
  const [viewMode, setViewMode] = useState<AppViewMode>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const page = (params.get('page') || params.get('view') || '').toLowerCase();
      if (page === 'gatekeeper' || page === 'login') return 'gatekeeper';
      if (page === 'home') return 'home';
      // If ?mode=desk or ?role=official, check auth or go to gatekeeper
      const mode = (params.get('mode') || params.get('role') || '').toLowerCase();
      if (mode === 'desk' || mode === 'official') {
        const isAuth = sessionStorage.getItem('ignou_sc2033_auth') === 'true';
        return isAuth ? 'dashboard' : 'gatekeeper';
      }
    }
    const isAuth = typeof window !== 'undefined' && sessionStorage.getItem('ignou_sc2033_auth') === 'true';
    if (isAuth) return 'dashboard';
    return 'home';
  });

  // Keep viewMode synced with authentication state
  useEffect(() => {
    if (isAuthenticated) {
      setViewMode('dashboard');
    } else if (viewMode === 'dashboard') {
      setViewMode('home');
    }
  }, [isAuthenticated]);

  return (
    <>
      {/* 1. Study Centre Home Page (Default Landing View) */}
      {viewMode === 'home' && (
        <StudyCentreHomePage
          onOpenGatekeeper={() => {
            if (isAuthenticated) {
              setViewMode('dashboard');
            } else {
              setViewMode('gatekeeper');
            }
          }}
        />
      )}

      {/* 2. Terminal Security Gatekeeper (Authentication View) */}
      {viewMode === 'gatekeeper' && (
        <GatekeeperLockScreen
          onBackToHome={() => setViewMode('home')}
        />
      )}

      {/* 3. Operations Workspace (Authenticated Staff View) */}
      {viewMode === 'dashboard' && isAuthenticated && (
        <DashboardContent
          onViewHome={() => setViewMode('home')}
        />
      )}

      {/* Fallback if unauthenticated and somehow on dashboard view */}
      {viewMode === 'dashboard' && !isAuthenticated && (
        <StudyCentreHomePage
          onOpenGatekeeper={() => setViewMode('gatekeeper')}
        />
      )}

      {/* Global Modals accessible from both Home Page (e.g. Student Search) & Workspace */}
      <ReceiptModal />
      <RegistrationReceiptModal />
      <StudentSearchModal />
      <AdminPinModal />

      {/* Global Toast Notification */}
      <Toast message={toastMessage} type={toastType} onClose={hideToast} />
    </>
  );
};

export default function App() {
  return (
    <ErrorBoundary fallbackTitle="IGNOU Study Centre Portal Encountered an Issue">
      <AppProvider>
        <MainApp />
      </AppProvider>
    </ErrorBoundary>
  );
}
