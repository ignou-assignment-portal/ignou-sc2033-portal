import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, X, RefreshCw, AlertCircle, CheckCircle2, ScanLine } from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
}) => {
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [scannerError, setScannerError] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [manualInput, setManualInput] = useState<string>('');
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isStoppingRef = useRef<boolean>(false);

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      return;
    }

    // Modal opened: enumerate video devices
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Prefer back camera or environment-facing camera if available
          const backCam = devices.find((d) =>
            d.label.toLowerCase().includes('back') ||
            d.label.toLowerCase().includes('rear') ||
            d.label.toLowerCase().includes('environment')
          );
          const defaultId = backCam ? backCam.id : devices[0].id;
          setSelectedCameraId(defaultId);
          startScanner(defaultId);
        } else {
          setScannerError('No camera found on this device. You can type or paste the code below.');
        }
      })
      .catch((err) => {
        console.warn('Camera enumeration error:', err);
        setScannerError(
          'Camera access not allowed or unavailable. Check browser permissions, or enter code manually.'
        );
      });

    return () => {
      stopScanner();
    };
  }, [isOpen]);

  const startScanner = async (cameraId: string) => {
    stopScanner();
    setScannerError('');
    setIsScanning(false);

    try {
      const html5QrCode = new Html5Qrcode('interactive-qr-scanner-region', {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.ITF,
        ],
        verbose: false,
      });

      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 260, height: 200 },
          aspectRatio: 1.333334,
        },
        (decodedText) => {
          handleDetected(decodedText);
        },
        () => {
          // Frame scan failures are expected when code not yet visible
        }
      );

      setIsScanning(true);
    } catch (err: any) {
      console.warn('Start scanner error:', err);
      setScannerError(
        typeof err === 'string'
          ? err
          : err?.message || 'Failed to start camera. Please ensure permissions are granted.'
      );
      setIsScanning(false);
    }
  };

  const stopScanner = () => {
    if (html5QrCodeRef.current && !isStoppingRef.current) {
      isStoppingRef.current = true;
      try {
        if (html5QrCodeRef.current.isScanning) {
          html5QrCodeRef.current
            .stop()
            .catch(() => {})
            .finally(() => {
              try {
                html5QrCodeRef.current?.clear();
              } catch {}
              html5QrCodeRef.current = null;
              isStoppingRef.current = false;
              setIsScanning(false);
            });
          return;
        }
      } catch {}
      try {
        html5QrCodeRef.current.clear();
      } catch {}
      html5QrCodeRef.current = null;
      isStoppingRef.current = false;
      setIsScanning(false);
    }
  };

  const handleDetected = (text: string) => {
    const clean = text.trim();
    if (!clean) return;
    stopScanner();
    onScanSuccess(clean);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      handleDetected(manualInput.trim());
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-zinc-200">
        {/* Header */}
        <div className="px-5 py-4 bg-zinc-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Barcode & QR Scanner</h3>
              <p className="text-[11px] text-zinc-400">
                Scan acknowledgment receipt barcode, QR, or token
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Viewport */}
        <div className="p-5 space-y-4">
          <div className="relative bg-zinc-950 rounded-xl overflow-hidden aspect-4/3 flex items-center justify-center border-2 border-indigo-500/40 shadow-inner">
            <div id="interactive-qr-scanner-region" className="w-full h-full" />
            
            {/* Guide overlay */}
            {isScanning && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                <div className="w-64 h-44 border-2 border-dashed border-indigo-400/80 rounded-xl relative flex items-center justify-center">
                  <div className="w-full h-0.5 bg-indigo-500 shadow-md shadow-indigo-500 animate-pulse" />
                  <div className="absolute bottom-2 text-[10px] font-bold uppercase tracking-wider text-white bg-black/60 px-2 py-0.5 rounded">
                    Align Barcode / QR Inside Frame
                  </div>
                </div>
              </div>
            )}

            {!isScanning && !scannerError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 gap-2 p-4 text-center">
                <ScanLine className="w-8 h-8 animate-pulse text-indigo-400" />
                <span className="text-xs">Initializing camera feed...</span>
              </div>
            )}
          </div>

          {/* Camera Selection & Switch */}
          {cameras.length > 1 && (
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-bold text-zinc-600 shrink-0">Camera:</label>
              <select
                value={selectedCameraId}
                onChange={(e) => {
                  setSelectedCameraId(e.target.value);
                  startScanner(e.target.value);
                }}
                className="w-full px-2.5 py-1.5 text-xs bg-zinc-50 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                {cameras.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label || `Camera ${c.id.slice(0, 5)}`}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => startScanner(selectedCameraId)}
                className="p-1.5 text-zinc-600 hover:text-indigo-600 hover:bg-zinc-100 rounded-lg transition"
                title="Restart Camera"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          )}

          {scannerError && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-xs text-amber-900">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Camera Notice: </span>
                {scannerError}
              </div>
            </div>
          )}

          {/* Manual Input Fallback */}
          <form onSubmit={handleManualSubmit} className="pt-2 border-t border-zinc-100">
            <label className="block text-[11px] font-bold text-zinc-700 mb-1">
              Or Type / Paste Barcode / Token / Enrollment:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. SC2033-JUL26-0001 or 2604740340"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs font-mono border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
              <button
                type="submit"
                disabled={!manualInput.trim()}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition cursor-pointer"
              >
                Lookup
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-zinc-50 border-t border-zinc-200 flex justify-between items-center text-xs">
          <span className="text-[11px] text-zinc-500">Study Centre SC-2033 Intake</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 bg-white border border-zinc-300 hover:bg-zinc-100 text-zinc-700 font-bold rounded-lg transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
