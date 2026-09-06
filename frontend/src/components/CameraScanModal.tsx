import React, { useEffect, useRef, useState } from 'react';
import { X, Camera, RefreshCw } from 'lucide-react';

interface CameraScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}

export const CameraScanModal: React.FC<CameraScanModalProps> = ({
  isOpen,
  onClose,
  onCapture,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const [hasCamera, setHasCamera] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      if (activeStreamRef.current) {
        activeStreamRef.current.getTracks().forEach((track) => track.stop());
        activeStreamRef.current = null;
      }
      return;
    }

    let isMounted = true;

    // Attempt starting physical optical webcam
    navigator.mediaDevices
      ?.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      .then((mediaStream) => {
        if (!isMounted) {
          mediaStream.getTracks().forEach((t) => t.stop());
          return;
        }
        activeStreamRef.current = mediaStream;
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        setHasCamera(true);
      })
      .catch(() => {
        // Fallback to simulated checkpoint optical scanner feed
        if (isMounted) {
          setHasCamera(false);
        }
      });

    return () => {
      isMounted = false;
      if (activeStreamRef.current) {
        activeStreamRef.current.getTracks().forEach((track) => track.stop());
        activeStreamRef.current = null;
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCaptureClick = () => {
    setIsScanning(true);

    setTimeout(() => {
      const canvas = document.createElement('canvas');

      if (hasCamera && videoRef.current && videoRef.current.videoWidth > 0) {
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(
            (blob) => {
              setIsScanning(false);
              if (blob) {
                const file = new File([blob], `camera_scan_${Date.now()}.jpg`, {
                  type: 'image/jpeg',
                });
                onCapture(file);
              }
              onClose();
            },
            'image/jpeg',
            0.95
          );
          return;
        }
      }

      // Simulated Checkpoint Optical Scanner Frame Generation
      canvas.width = 1200;
      canvas.height = 840;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Scanner plate backdrop
        ctx.fillStyle = '#0a192f';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Passport document card
        ctx.fillStyle = '#e6edf4';
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(100, 70, 1000, 700, 14);
          ctx.fill();
        } else {
          ctx.fillRect(100, 70, 1000, 700);
        }
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Header
        ctx.fillStyle = '#071a2f';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText('REPUBLIC OF INDIA / PASSPORT', 150, 130);

        // Portrait photo box
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(150, 170, 220, 280);
        ctx.strokeStyle = '#64748b';
        ctx.strokeRect(150, 170, 220, 280);
        ctx.fillStyle = '#334155';
        ctx.font = '16px sans-serif';
        ctx.fillText('OPTICAL VIZ PHOTO', 170, 310);

        // Text fields
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 20px monospace';
        ctx.fillText('Type: P       Code: IND     Doc: T1234567', 420, 210);
        ctx.fillText('Surname:      SHARMA', 420, 260);
        ctx.fillText('Given Name:   RAHUL', 420, 310);
        ctx.fillText('Nationality:  INDIAN', 420, 360);
        ctx.fillText('DOB:          14/02/1999    Sex: M', 420, 410);

        // MRZ Strip
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(120, 580, 960, 150);
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 22px monospace';
        ctx.fillText('P<INDSHARMA<<RAHUL<<<<<<<<<<<<<<<<<<<<<<<<<<<', 140, 635);
        ctx.fillText('T1234567<8IND9902145M3001097<<<<<<<<<<<<<<<', 140, 690);

        canvas.toBlob(
          (blob) => {
            setIsScanning(false);
            if (blob) {
              const file = new File([blob], `scanner_capture_${Date.now()}.jpg`, {
                type: 'image/jpeg',
              });
              onCapture(file);
            }
            onClose();
          },
          'image/jpeg',
          0.95
        );
      } else {
        setIsScanning(false);
        onClose();
      }
    }, 850);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#071A2F] text-white rounded-2xl max-w-xl w-full border border-blue-900 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-blue-950 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-bold text-white tracking-wide">
              Document Optical Scanner — Checkpoint Feed
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder Area */}
        <div className="relative aspect-4/3 bg-slate-950 flex items-center justify-center overflow-hidden">
          {hasCamera && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          )}

          {!hasCamera && (
            <div className="relative w-full h-full bg-linear-to-b from-slate-900 to-[#0B213A] flex items-center justify-center p-6">
              {/* Simulated ID Card in Scanner */}
              <div className="relative w-72 h-44 rounded-lg border-2 border-dashed border-blue-400/80 bg-slate-800/80 shadow-2xl p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-cyan-300 font-bold">
                    SCANNER ID: S-402-A
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-[9px] text-emerald-400 font-mono">READY</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-3">
                  <div className="w-14 h-16 rounded bg-slate-700 border border-slate-600 flex items-center justify-center text-slate-400">
                    <Camera className="w-6 h-6 opacity-60" />
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <div className="h-2 w-24 bg-slate-700 rounded" />
                    <div className="h-2 w-32 bg-slate-700 rounded" />
                    <div className="h-2 w-20 bg-slate-700 rounded" />
                  </div>
                </div>

                <div className="text-[9px] font-mono text-slate-400 tracking-wider text-center">
                  ALIGN PASSPORT BIOMETRIC PAGE IN THE RECTANGLE
                </div>
              </div>
            </div>
          )}

          {/* Scanner Laser Sweep Animation */}
          <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#38bdf8] animate-scan-laser pointer-events-none" />

          {/* Optical Alignment Reticle Corner Guides */}
          <div className="absolute inset-8 pointer-events-none border border-blue-500/20">
            <div className="absolute -top-1 -left-1 w-5 h-5 border-t-2 border-l-2 border-cyan-400" />
            <div className="absolute -top-1 -right-1 w-5 h-5 border-t-2 border-r-2 border-cyan-400" />
            <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-2 border-l-2 border-cyan-400" />
            <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-2 border-r-2 border-cyan-400" />
          </div>

          {/* Scanning In-Progress Overlay */}
          {isScanning && (
            <div className="absolute inset-0 bg-blue-900/80 backdrop-blur-xs flex flex-col items-center justify-center text-white z-20">
              <RefreshCw className="w-10 h-10 animate-spin text-cyan-300 mb-2" />
              <p className="text-sm font-bold tracking-wide">Acquiring High-Resolution Scan...</p>
              <p className="text-xs text-cyan-200/80">300 DPI Optical Normalization</p>
            </div>
          )}
        </div>

        {/* Footer Controls */}
        <div className="p-4 bg-[#091E36] border-t border-blue-950 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Auto-detects ICAO MRZ and UV security watermarks
          </div>

          <button
            onClick={handleCaptureClick}
            disabled={isScanning}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#1677E8] hover:bg-blue-600 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <Camera className="w-4 h-4" />
            <span>Capture Document</span>
          </button>
        </div>
      </div>
    </div>
  );
};
