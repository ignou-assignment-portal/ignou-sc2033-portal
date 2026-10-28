import React, { useEffect, useState } from 'react';
import { Download, Smartphone, Monitor, X, Check, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { InstitutionalSeal } from './InstitutionalSeal';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export interface PWAInstallButtonProps {
  variant?: 'compact' | 'full' | 'nav' | 'sidebar';
  className?: string;
  id?: string;
  isCollapsed?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'compact',
  className = '',
  id = 'btn-pwa-install',
  isCollapsed = false,
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [activeGuideTab, setActiveGuideTab] = useState<'mobile' | 'desktop'>('mobile');

  useEffect(() => {
    // Check if app is in standalone mode (already installed)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    // Detect iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isIOSDevice);
    if (!isIOSDevice && !/android/.test(ua)) {
      setActiveGuideTab('desktop');
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
    } else {
      // Show guided instructions modal for desktop dock & mobile home screens
      setShowGuideModal(true);
    }
  };

  // Styles based on variant
  const getButtonClasses = () => {
    if (variant === 'sidebar') {
      if (isCollapsed) {
        return 'w-full flex items-center justify-center p-2.5 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 border border-amber-300 text-amber-950 transition shadow-2xs cursor-pointer group';
      }
      return 'w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 border border-amber-300 text-amber-950 transition shadow-2xs cursor-pointer group';
    }
    if (variant === 'full') {
      return 'inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-xs border border-amber-500 transition cursor-pointer';
    }
    if (variant === 'nav') {
      return 'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 text-amber-950 border border-amber-300 transition shadow-2xs cursor-pointer group';
    }
    // Default compact
    return 'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 text-amber-950 border border-amber-300 transition shadow-2xs cursor-pointer group';
  };

  return (
    <>
      <button
        id={id}
        type="button"
        onClick={handleInstallClick}
        className={`${getButtonClasses()} ${className}`}
        title={
          isInstalled
            ? 'IGNOU SC-2033 App Guide (Offline Ready)'
            : 'Install IGNOU SC-2033 as an app on your mobile home screen or desktop dock'
        }
        aria-label={isInstalled ? 'App Guide' : 'Install App'}
      >
        {variant === 'sidebar' && isCollapsed ? (
          <div className="w-6 h-6 rounded-lg bg-amber-200/90 flex items-center justify-center text-amber-950 shrink-0 group-hover:scale-110 transition-transform shadow-2xs">
            <Download className="w-3.5 h-3.5" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-amber-200/90 flex items-center justify-center text-amber-950 shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                <Download className="w-3.5 h-3.5" />
              </div>
              <div className="text-left min-w-0">
                <div className="font-bold text-xs text-amber-950 truncate leading-tight">
                  {isInstalled ? 'App Guide' : 'Install App'}
                </div>
                {variant === 'sidebar' && (
                  <div className="text-[10px] text-amber-800/80 truncate font-medium">
                    {isInstalled ? 'Offline ready' : 'Home screen & dock'}
                  </div>
                )}
              </div>
            </div>
            {variant === 'sidebar' && (
              <span className="text-[10px] uppercase font-bold text-amber-800 bg-amber-200/70 border border-amber-300/60 px-1.5 py-0.5 rounded font-mono shrink-0 ml-1">
                PWA
              </span>
            )}
            {variant === 'compact' && (
              <span className="hidden xl:inline-block text-[9px] uppercase font-bold text-amber-800 bg-amber-200/60 border border-amber-300/40 px-1 py-0.2 rounded font-mono">
                PWA
              </span>
            )}
          </>
        )}
      </button>

      {/* Guided Installation Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 text-slate-900 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowGuideModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col items-center text-center">
              <InstitutionalSeal size="lg" className="mb-2 drop-shadow-xs" />
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-[10px] font-bold uppercase tracking-wider mb-1">
                <Sparkles className="w-3 h-3 text-amber-600" />
                <span>Progressive Web App (PWA)</span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Install IGNOU SC-2033 App
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                Install on your device home screen or desktop dock for instant offline access and a native full-screen experience.
              </p>

              {/* Device Tab Selector */}
              <div className="flex items-center justify-center gap-1.5 p-1 bg-slate-100 rounded-xl mt-4 w-full border border-slate-200 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveGuideTab('mobile')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition cursor-pointer ${
                    activeGuideTab === 'mobile'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Mobile Phone / Tablet</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveGuideTab('desktop')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition cursor-pointer ${
                    activeGuideTab === 'desktop'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Desktop / Laptop</span>
                </button>
              </div>

              {/* Instructions Content */}
              <div className="mt-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-left w-full space-y-2.5 text-xs text-slate-700">
                {activeGuideTab === 'mobile' ? (
                  isIOS ? (
                    <>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        iOS Safari Instructions:
                      </div>
                      <div className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-900 font-bold flex items-center justify-center shrink-0 text-[11px]">
                          1
                        </span>
                        <span>Tap the <strong>Share</strong> icon (square with arrow) at the bottom of Safari.</span>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-900 font-bold flex items-center justify-center shrink-0 text-[11px]">
                          2
                        </span>
                        <span>Scroll down in the share menu and tap <strong>Add to Home Screen</strong>.</span>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-900 font-bold flex items-center justify-center shrink-0 text-[11px]">
                          3
                        </span>
                        <span>Tap <strong>Add</strong> in the top-right corner to place the SC-2033 seal icon on your home screen.</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Android Chrome Instructions:
                      </div>
                      <div className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-900 font-bold flex items-center justify-center shrink-0 text-[11px]">
                          1
                        </span>
                        <span>Tap the <strong>Menu</strong> (three dots) in the top-right corner of Chrome.</span>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-900 font-bold flex items-center justify-center shrink-0 text-[11px]">
                          2
                        </span>
                        <span>Select <strong>Install App</strong> or <strong>Add to Home Screen</strong>.</span>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-900 font-bold flex items-center justify-center shrink-0 text-[11px]">
                          3
                        </span>
                        <span>Confirm installation to launch SC-2033 as an offline-ready standalone application.</span>
                      </div>
                    </>
                  )
                ) : (
                  <>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Chrome, Edge, or Safari on Mac / Windows:
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-900 font-bold flex items-center justify-center shrink-0 text-[11px]">
                        1
                      </span>
                      <span>Look for the <strong>Install icon</strong> (computer with down arrow) in your browser address bar.</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-900 font-bold flex items-center justify-center shrink-0 text-[11px]">
                        2
                      </span>
                      <span>Or click the browser menu (three dots) &rarr; <strong>Cast, save, and share</strong> &rarr; <strong>Install IGNOU SC-2033</strong>.</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-900 font-bold flex items-center justify-center shrink-0 text-[11px]">
                        3
                      </span>
                      <span>Click <strong>Install</strong> to pin the SC-2033 Academic Seal to your desktop taskbar or dock.</span>
                    </div>
                  </>
                )}
              </div>

              {/* Institutional Benefits Badge */}
              <div className="mt-3 grid grid-cols-2 gap-2 w-full text-[11px]">
                <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Works 100% Offline</span>
                </div>
                <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>Fast Dock Launch</span>
                </div>
              </div>

              {/* Download Blueprint Action Link */}
              <a
                href="/IGNOU_SC2033_Web_App_Blueprint.docx"
                download="IGNOU_SC2033_Web_App_Blueprint.docx"
                className="mt-3 w-full py-2 px-3 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-xl text-amber-950 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs"
                title="Download Official Operational System Blueprint (.docx)"
              >
                <Download className="w-3.5 h-3.5 text-amber-800 shrink-0" />
                <span>Download System Blueprint (.DOCX)</span>
              </a>

              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="mt-2 w-full py-2.5 bg-linear-to-r from-slate-900 to-indigo-950 hover:from-indigo-950 hover:to-indigo-900 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
