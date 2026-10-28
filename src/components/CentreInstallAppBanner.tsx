import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  Download,
  Smartphone,
  Monitor,
  QrCode,
  CheckCircle2,
  Sparkles,
  X,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Zap,
  WifiOff,
} from 'lucide-react';
import { InstitutionalSeal } from './InstitutionalSeal';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const CentreInstallAppBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [activeGuideTab, setActiveGuideTab] = useState<'mobile' | 'desktop'>('mobile');

  const appUrl = typeof window !== 'undefined' ? window.location.origin : '';

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

  // Generate QR Code for Mobile Handoff
  useEffect(() => {
    if (!appUrl) return;

    QRCode.toDataURL(
      appUrl,
      {
        width: 320,
        margin: 1,
        color: {
          dark: '#0F172A',
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'M',
      },
      (err, url) => {
        if (!err && url) {
          setQrDataUrl(url);
        }
      }
    );
  }, [appUrl]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
    } else {
      setShowGuideModal(true);
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(appUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <>
      <div
        id="centre-config-install-app-banner"
        className="relative overflow-hidden rounded-2xl border border-amber-300/80 bg-gradient-to-br from-amber-50/90 via-orange-50/50 to-indigo-50/50 p-5 sm:p-6 shadow-xs"
      >
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
          {/* Left Column: Branding, Title, and Description */}
          <div className="flex items-start gap-3.5 max-w-2xl">
            <div className="w-12 h-12 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-900 shrink-0 shadow-2xs">
              <Download className="w-6 h-6 text-amber-900" />
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-950 border border-amber-300 font-mono">
                  Progressive Web App (PWA)
                </span>
                {isInstalled ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                    <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                    Installed (Running Standalone)
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-900 border border-indigo-200">
                    Desktop & Mobile Ready
                  </span>
                )}
              </div>

              <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Install IGNOU SC-2033 Terminal Application
              </h3>

              <p className="text-xs text-slate-600 leading-relaxed">
                Add this application to your desktop taskbar or mobile device home screen. Enjoy full-screen native execution, zero browser URL bar overhead, and reliable 100% offline front-counter performance.
              </p>
            </div>
          </div>

          {/* Right Column: Interactive Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto shrink-0">
            <button
              id="btn-centre-install-app-primary"
              type="button"
              onClick={handleInstallClick}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold text-xs shadow-xs border border-amber-600/40 transition cursor-pointer"
              title="Install SC-2033 on this device"
            >
              <Download className="w-4 h-4 text-slate-950" />
              <span>{isInstalled ? 'Launch Guide & Offline Tips' : 'Install App on This Device'}</span>
            </button>

            <button
              id="btn-centre-toggle-qr"
              type="button"
              onClick={() => setShowQRCode((prev) => !prev)}
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                showQRCode
                  ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-2xs'
              }`}
              title="Toggle Mobile QR Code for phone installation"
            >
              <QrCode className="w-4 h-4 text-indigo-600" />
              <span>{showQRCode ? 'Hide Mobile QR' : 'Mobile QR Code'}</span>
            </button>

            <button
              id="btn-centre-open-guide-modal"
              type="button"
              onClick={() => setShowGuideModal(true)}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition shadow-2xs cursor-pointer"
              title="View step-by-step setup instructions"
            >
              <Monitor className="w-4 h-4 text-slate-600" />
              <span>Setup Guide</span>
            </button>
          </div>
        </div>

        {/* Expandable Mobile Handoff QR Code Box */}
        {showQRCode && (
          <div className="mt-4 pt-4 border-t border-amber-200/80 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-4 bg-white/95 rounded-xl border border-amber-200 shadow-xs flex flex-col sm:flex-row items-center gap-5">
              {qrDataUrl && (
                <div className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-2xs shrink-0 flex flex-col items-center">
                  <img
                    src={qrDataUrl}
                    alt="Mobile Install QR Code"
                    className="w-32 h-32 object-contain"
                  />
                  <span className="text-[10px] font-mono text-slate-500 mt-1 font-semibold">
                    Scan with Phone Camera
                  </span>
                </div>
              )}

              <div className="space-y-2 text-left">
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                  <Smartphone className="w-4 h-4 text-indigo-600" />
                  <span>Instant Mobile Phone & Tablet Handoff</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed max-w-lg">
                  Point any smartphone camera (iPhone Safari or Android Chrome) at this QR code to open IGNOU SC-2033 immediately on the device. Then tap <strong>Share &rarr; Add to Home Screen</strong> (iOS) or <strong>Install</strong> (Android).
                </p>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    readOnly
                    value={appUrl}
                    className="text-xs font-mono bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 max-w-xs truncate select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition cursor-pointer"
                  >
                    {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedUrl ? 'Copied' : 'Copy URL'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Feature Badges Grid */}
        <div className="mt-4 pt-3.5 border-t border-amber-200/60 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs text-slate-700">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-white/70 border border-amber-200/70">
            <WifiOff className="w-4 h-4 text-amber-700 shrink-0" />
            <div>
              <span className="font-bold text-slate-900 block leading-tight">100% Offline Resilience</span>
              <span className="text-[11px] text-slate-500">Service worker caches critical registers</span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-lg bg-white/70 border border-amber-200/70">
            <Zap className="w-4 h-4 text-indigo-700 shrink-0" />
            <div>
              <span className="font-bold text-slate-900 block leading-tight">Instant Dock Launch</span>
              <span className="text-[11px] text-slate-500">Pins to macOS Dock or Windows Taskbar</span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-lg bg-white/70 border border-amber-200/70">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
            <div>
              <span className="font-bold text-slate-900 block leading-tight">Terminal Kiosk View</span>
              <span className="text-[11px] text-slate-500">Full-screen display without browser clutter</span>
            </div>
          </div>
        </div>
      </div>

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
