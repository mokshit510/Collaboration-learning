import { useState } from 'react';
import { User, ShieldAlert, CheckCircle2, Smartphone, QrCode, X, ExternalLink, Wifi } from 'lucide-react';
import type { InvestigationStatus } from '../types';

interface HeaderProps {
  investigationStatus: InvestigationStatus;
  phoneConnected?: boolean;
  sessionId?: string;
}

export const Header: React.FC<HeaderProps> = ({
  investigationStatus,
  phoneConnected = false,
  sessionId = 'PRM-20260908-1832',
}) => {
  const [showQr, setShowQr] = useState(false);

  // Determine LAN IP or hostname for phone access
  const lanIp = '192.168.166.12';
  const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const phoneHost = currentHost !== 'localhost' && currentHost !== '127.0.0.1' ? currentHost : lanIp;
  const mobileUrl = `http://${phoneHost}:5174`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(mobileUrl)}`;

  return (
    <>
      <header className="bg-[#071A2F] border-b border-[#0D243F] text-white px-6 py-3.5 flex items-center justify-between shrink-0 select-none shadow-sm z-20">
        {/* Left Title & Subtitle */}
        <div>
          <h2 className="text-[17px] font-bold text-white tracking-normal leading-tight font-sans">
            AI-Powered Identity & Document Verification
          </h2>
          <p className="text-[12px] text-slate-400 font-normal tracking-wide">
            Secure Borders. Safer Tomorrow.
          </p>
        </div>

        {/* Right Side: Phone Status + Demo Environment Disclaimer + Inspector Badge */}
        <div className="flex items-center gap-4 lg:gap-6">
          {/* Phone Device & Mobile Session Status Area */}
          <button
            type="button"
            onClick={() => setShowQr(true)}
            className="hidden sm:flex items-center gap-2.5 bg-[#0F294A] hover:bg-[#153863] border border-[#1E426F] hover:border-blue-400/60 px-3 py-1.5 rounded-lg shadow-inner transition-all cursor-pointer text-left group"
            title="Click to view Phone QR Code & connection link"
          >
            <Smartphone className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
            <div className="leading-none text-left">
              <div className="text-[9.5px] uppercase font-bold text-slate-400 flex items-center gap-1">
                Phone Device
                <span className="text-[9px] text-blue-400/80 underline font-normal">QR</span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    phoneConnected ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-amber-400 animate-pulse'
                  }`}
                />
                <span className={`text-[11px] font-bold ${phoneConnected ? 'text-emerald-300' : 'text-amber-300'}`}>
                  {phoneConnected ? 'Connected' : 'Scan to Connect'}
                </span>
              </div>
            </div>
            <div className="w-px h-6 bg-[#1E426F]" />
            <div className="leading-none text-left">
              <div className="text-[9.5px] uppercase font-bold text-slate-400">Mobile Session</div>
              <div className="text-[11px] font-mono font-bold text-blue-300 mt-0.5">
                {sessionId}
              </div>
            </div>
            <QrCode className="w-4 h-4 text-blue-400/70 ml-0.5 group-hover:text-blue-300" />
          </button>
        {/* Status Indicator if Flagged */}
        {investigationStatus === 'flagged' && (
          <div className="flex items-center gap-2 bg-red-950/80 border border-red-500/60 px-3 py-1.5 rounded-md text-red-300 animate-pulse">
            <ShieldAlert className="w-4 h-4 text-red-400" />
            <span className="text-xs font-bold tracking-wide uppercase">
              Flagged for Investigation
            </span>
          </div>
        )}

        {investigationStatus === 'saved' && (
          <div className="flex items-center gap-2 bg-emerald-950/80 border border-emerald-500/60 px-3 py-1.5 rounded-md text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold tracking-wide uppercase">
              Record Archived
            </span>
          </div>
        )}

        {/* Demo Environment Badge (Prominently fulfilling user requirements) */}
        <div className="hidden lg:flex items-center gap-3 border-r border-[#153457] pr-6">
          <div className="w-7 h-7 rounded bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-300">
            {/* Ashoka Pillar icon representation */}
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
              <path d="M12 2L9 7h6l-3-5zm-5 6h10v2H7V8zm1 3h8v6H8v-6zm-2 7h12v2H6v-2z" />
            </svg>
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              <span className="text-[10px] font-bold tracking-wider text-amber-400 uppercase bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/30">
                Demo Environment
              </span>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
              Simulated Issuer Verification • Hackathon / Research Use Only
            </p>
          </div>
        </div>

        {/* Inspector Profile */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#122F52] border border-blue-500/40 flex items-center justify-center text-blue-300 shadow-inner">
            <User className="w-4 h-4" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-white">Inspector</div>
            <div className="text-[11px] text-slate-400">SSB Checkpoint A</div>
          </div>
        </div>
      </div>
      </header>

      {/* Connect Phone Companion QR Modal */}
      {showQr && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[#0B1E36] border border-[#1E426F] rounded-2xl p-6 max-w-sm w-full text-white shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setShowQr(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/80 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white leading-tight">Connect Phone Companion</h3>
                <p className="text-xs text-slate-400">Pair phone to send live NFC and face photos</p>
              </div>
            </div>

            {/* QR Code Display */}
            <div className="bg-white p-3.5 rounded-xl flex flex-col items-center justify-center my-3.5 shadow-inner">
              <img
                src={qrCodeUrl}
                alt="Scan to open PRAMAAN Mobile Companion"
                className="w-44 h-44 rounded-md"
              />
              <span className="text-[10.5px] text-slate-500 font-medium mt-1">Point phone camera to scan</span>
            </div>

            {/* URL Direct Access */}
            <div className="bg-[#071526] border border-[#153457] rounded-xl p-3 mb-3.5 text-center">
              <div className="text-[11px] text-slate-400 font-medium mb-1">Direct Phone Browser URL:</div>
              <a
                href={mobileUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-mono font-bold text-blue-400 hover:text-blue-300 flex items-center justify-center gap-1.5 break-all"
              >
                {mobileUrl}
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              </a>
            </div>

            {/* Instructions */}
            <div className="space-y-2 text-[11.5px] text-slate-300 bg-[#0E2745]/60 p-3 rounded-xl border border-blue-900/40">
              <div className="flex items-start gap-2">
                <Wifi className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span>Connect your phone to the same Wi-Fi network as this PC.</span>
              </div>
              <div className="flex items-start gap-2">
                <Smartphone className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Open your phone's browser (Chrome or Safari) and visit the URL above.</span>
              </div>
            </div>

            <div className="mt-3.5 pt-2.5 border-t border-slate-800/80 text-center">
              <span className="text-[11px] text-slate-400">Session ID: </span>
              <span className="text-[11px] font-mono font-bold text-blue-300">{sessionId}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
