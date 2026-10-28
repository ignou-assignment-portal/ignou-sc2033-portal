import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { QrCode, ExternalLink, Check, Copy } from 'lucide-react';

export interface ReceiptQRCodeProps {
  tokenNo: string;
  enrollmentNo: string;
  studentName?: string;
  programmeCode?: string;
  session?: string;
  submissionDate?: string;
  courseCodes?: string[];
  size?: number;
  className?: string;
  showCaption?: boolean;
}

export const ReceiptQRCode: React.FC<ReceiptQRCodeProps> = ({
  tokenNo,
  enrollmentNo,
  studentName = '',
  programmeCode = '',
  session = '',
  submissionDate = '',
  courseCodes = [],
  size = 76,
  className = '',
  showCaption = true,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Compute canonical verification URL
  const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : '';
  const verificationUrl = `${origin}/?verify=${encodeURIComponent(tokenNo.trim())}`;

  useEffect(() => {
    if (!tokenNo) return;

    let isMounted = true;
    QRCode.toDataURL(
      verificationUrl,
      {
        width: size * 2, // 2x for sharp Retina/print rendering
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'M',
      },
      (err, url) => {
        if (!err && isMounted && url) {
          setQrDataUrl(url);
        } else if (err) {
          console.error('Failed to generate receipt QR code:', err);
        }
      }
    );

    return () => {
      isMounted = false;
    };
  }, [verificationUrl, size, tokenNo]);

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!verificationUrl) return;
    navigator.clipboard.writeText(verificationUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleTestVerify = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window !== 'undefined') {
      window.open(verificationUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className={`inline-flex flex-col items-center select-none ${className}`}>
      {/* QR Code Container */}
      <div className="relative group p-1 bg-white border border-zinc-300 rounded shadow-2xs">
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt={`Verification QR Code for Receipt ${tokenNo}`}
            width={size}
            height={size}
            className="block print:w-16 print:h-16 image-rendering-pixelated"
          />
        ) : (
          <div
            style={{ width: `${size}px`, height: `${size}px` }}
            className="flex items-center justify-center bg-zinc-50 border border-dashed border-zinc-300 rounded"
          >
            <QrCode className="w-6 h-6 text-zinc-400 animate-pulse" />
          </div>
        )}

        {/* Hover Quick Actions (Hidden in Print) */}
        <div className="absolute inset-0 bg-zinc-950/80 rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 print:hidden">
          <button
            type="button"
            onClick={handleCopyLink}
            className="p-1.5 bg-white text-zinc-800 rounded hover:bg-zinc-100 transition shadow-xs cursor-pointer"
            title={copied ? 'Verification URL Copied!' : 'Copy Verification URL'}
            aria-label="Copy Verification URL"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={handleTestVerify}
            className="p-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-500 transition shadow-xs cursor-pointer"
            title="Open Digital Verification in New Tab"
            aria-label="Test Verification"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Caption & Instructions */}
      {showCaption && (
        <div className="text-center mt-0.5">
          <span className="block font-mono text-[8px] print:text-[6.5px] font-bold text-zinc-700 tracking-wider uppercase leading-tight">
            Scan to Verify
          </span>
          <span className="block text-[7.5px] print:text-[6px] text-zinc-500 leading-none">
            Mobile Camera
          </span>
        </div>
      )}
    </div>
  );
};
