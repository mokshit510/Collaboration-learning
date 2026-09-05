import React from 'react';
import { User, ShieldAlert, CheckCircle2 } from 'lucide-react';
import type { InvestigationStatus } from '../types';

interface HeaderProps {
  investigationStatus: InvestigationStatus;
}

export const Header: React.FC<HeaderProps> = ({ investigationStatus }) => {
  return (
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

      {/* Right Side: Demo Environment Disclaimer + Inspector Badge */}
      <div className="flex items-center gap-6">
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
  );
};
