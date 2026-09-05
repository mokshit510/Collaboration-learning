import React from 'react';
import type { DocumentData } from '../types';

interface PassportDocumentViewProps {
  data: DocumentData;
  showTamperOverlay?: boolean;
  compact?: boolean;
}

export const PassportDocumentView: React.FC<PassportDocumentViewProps> = ({
  data,
  showTamperOverlay = false,
  compact = false,
}) => {
  return (
    <div
      className={`relative w-full overflow-hidden rounded-md border border-slate-300/80 bg-[#e8edf2] shadow-inner select-none font-mono ${
        compact ? 'text-[9px]' : 'text-[11px]'
      }`}
      style={{
        aspectRatio: '1.42 / 1',
        backgroundImage: `
          radial-gradient(circle at 65% 50%, rgba(200, 220, 240, 0.45) 0%, transparent 60%),
          repeating-linear-gradient(45deg, rgba(160, 190, 225, 0.08) 0px, rgba(160, 190, 225, 0.08) 2px, transparent 2px, transparent 6px),
          repeating-linear-gradient(-45deg, rgba(160, 190, 225, 0.08) 0px, rgba(160, 190, 225, 0.08) 2px, transparent 2px, transparent 6px)
        `,
        backgroundColor: '#e6edf4',
      }}
    >
      {/* Background Ashoka Lion Emblem Watermark */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.14]">
        <svg viewBox="0 0 200 240" className="h-[75%] w-auto fill-[#0B213A]">
          <path d="M100 10 C80 10, 60 25, 60 45 C60 65, 80 80, 100 80 C120 80, 140 65, 140 45 C140 25, 120 10, 100 10 Z M70 85 L130 85 L135 150 L65 150 Z M50 160 L150 160 L155 190 L45 190 Z M30 200 L170 200 L160 220 L40 220 Z" />
        </svg>
      </div>

      {/* Security Guilloche Wave Border Lines */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <svg width="100%" height="100%">
          <defs>
            <pattern id="guilloche" width="40" height="20" patternUnits="userSpaceOnUse">
              <path d="M 0,10 Q 10,0 20,10 T 40,10" fill="none" stroke="#2563EB" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#guilloche)" />
        </svg>
      </div>

      {/* Passport Content Container */}
      <div className="relative z-10 flex flex-col justify-between h-full p-2 sm:p-2.5">
        {/* Top Header */}
        <div className="text-center border-b border-slate-300/70 pb-1">
          <div className="text-[10px] sm:text-[11px] font-semibold text-slate-700 tracking-wider font-sans">
            भारत गणराज्य <span className="font-bold tracking-widest text-[#071A2F]">REPUBLIC OF INDIA</span>
          </div>
        </div>

        {/* Middle Section: Photo & Data Fields */}
        <div className="flex gap-2 sm:gap-3 my-auto items-stretch">
          {/* Left Photo Area */}
          <div className="relative shrink-0 flex flex-col items-center">
            <div
              className={`relative overflow-hidden rounded border border-slate-400/90 shadow-sm bg-slate-200 ${
                compact ? 'w-16 h-20' : 'w-20 sm:w-24 h-24 sm:h-28'
              }`}
            >
              <img
                src={data.photoUrl}
                alt="Document Portrait"
                className="w-full h-full object-cover object-top"
              />
              
              {/* Tamper Overlay on Photo if enabled */}
              {showTamperOverlay && (
                <div className="absolute inset-0 border-2 border-emerald-500/80 bg-emerald-500/10 pointer-events-none">
                  <span className="absolute top-0.5 left-0.5 bg-emerald-600 text-[7px] text-white px-1 py-0.2 rounded font-sans font-bold">
                    BIOMETRIC VIZ
                  </span>
                </div>
              )}
            </div>

            {/* Signature below photo */}
            <div className="mt-1 text-center">
              <span
                className="text-[11px] sm:text-[13px] text-slate-800 tracking-tight font-serif italic font-bold"
                style={{ fontFamily: "'Brush Script MT', 'Dancing Script', cursive, sans-serif" }}
              >
                {data.holderName.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
              </span>
            </div>
          </div>

          {/* Right Data Grid */}
          <div className="flex-1 grid grid-cols-3 gap-x-2 gap-y-1 text-slate-800 leading-tight">
            {/* Row 1 */}
            <div>
              <span className="block text-[8px] text-slate-500 uppercase tracking-tight">Type</span>
              <span className="font-bold font-mono text-[10px] sm:text-[11px]">P</span>
            </div>
            <div>
              <span className="block text-[8px] text-slate-500 uppercase tracking-tight">Country Code</span>
              <span className="font-bold font-mono text-[10px] sm:text-[11px]">{data.countryCode}</span>
            </div>
            <div>
              <span className="block text-[8px] text-slate-500 uppercase tracking-tight">Passport No.</span>
              <span className="font-bold font-mono text-[10px] sm:text-[11px] tracking-wide text-slate-950">
                {data.documentNumber}
              </span>
            </div>

            {/* Row 2: Surname */}
            <div className="col-span-3 border-t border-slate-300/40 pt-0.5">
              <span className="block text-[8px] text-slate-500 uppercase tracking-tight">Surname</span>
              <span className="font-bold font-mono text-[10px] sm:text-[12px] text-slate-900">
                {data.surname}
              </span>
            </div>

            {/* Row 3: Given Name */}
            <div className="col-span-3">
              <span className="block text-[8px] text-slate-500 uppercase tracking-tight">Given Name</span>
              <span className="font-bold font-mono text-[10px] sm:text-[12px] text-slate-900">
                {data.givenName}
              </span>
            </div>

            {/* Row 4: Nationality & DOB */}
            <div className="col-span-1">
              <span className="block text-[8px] text-slate-500 uppercase tracking-tight">Nationality</span>
              <span className="font-bold font-mono text-[9px] sm:text-[10px]">{data.nationality}</span>
            </div>
            <div className="col-span-2 relative">
              <span className="block text-[8px] text-slate-500 uppercase tracking-tight">Date of Birth</span>
              <div
                className={`inline-block ${
                  showTamperOverlay
                    ? 'border-2 border-red-500 bg-red-500/15 px-1 rounded ring-2 ring-red-400/50'
                    : ''
                }`}
              >
                <span className="font-bold font-mono text-[9px] sm:text-[10.5px] text-slate-950">
                  {data.dob}
                </span>
                {showTamperOverlay && (
                  <span className="ml-1 text-[7px] font-sans font-bold text-red-600 bg-white px-0.5 rounded border border-red-400">
                    ANOMALY
                  </span>
                )}
              </div>
            </div>

            {/* Row 5: Sex & Place of Birth */}
            <div>
              <span className="block text-[8px] text-slate-500 uppercase tracking-tight">Sex</span>
              <span className="font-bold font-mono text-[9px] sm:text-[10px]">{data.gender[0]}</span>
            </div>
            <div className="col-span-2">
              <span className="block text-[8px] text-slate-500 uppercase tracking-tight">Place of Birth</span>
              <span className="font-bold font-mono text-[9px] sm:text-[10.5px]">{data.placeOfBirth}</span>
            </div>

            {/* Row 6: Issue & Expiry */}
            <div>
              <span className="block text-[8px] text-slate-500 uppercase tracking-tight">Date of Issue</span>
              <span className="font-bold font-mono text-[9px] sm:text-[10px]">{data.issueDate}</span>
            </div>
            <div className="col-span-2 relative">
              <span className="block text-[8px] text-slate-500 uppercase tracking-tight">Date of Expiry</span>
              <div
                className={`inline-block ${
                  showTamperOverlay
                    ? 'border-2 border-red-500 bg-red-500/15 px-1 rounded ring-2 ring-red-400/50'
                    : ''
                }`}
              >
                <span className="font-bold font-mono text-[9px] sm:text-[10.5px] text-slate-950">
                  {data.expiryDate}
                </span>
                {showTamperOverlay && (
                  <span className="ml-1 text-[7px] font-sans font-bold text-red-600 bg-white px-0.5 rounded border border-red-400">
                    INCONSISTENCY
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom MRZ Strip (ICAO Document 9303) */}
        <div className="mt-1 pt-1 border-t border-slate-300/80 bg-white/40 -mx-2 -mb-2 px-2 py-1">
          <div className="font-mono text-[8px] sm:text-[9.5px] tracking-tight leading-none text-slate-900 font-bold whitespace-nowrap overflow-hidden">
            {data.mrzLine1}
          </div>
          <div className="font-mono text-[8px] sm:text-[9.5px] tracking-tight leading-none text-slate-900 font-bold whitespace-nowrap overflow-hidden mt-0.5">
            {data.mrzLine2}
          </div>
        </div>
      </div>
    </div>
  );
};
