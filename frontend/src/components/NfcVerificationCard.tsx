import React from 'react';
import { Smartphone, Wifi, CheckCircle2, AlertTriangle, ShieldCheck, Radio } from 'lucide-react';
import type { NfcResult, PipelineStepStatus } from '../types';

interface NfcVerificationCardProps {
  nfcResult?: NfcResult | null;
  stepStatus: PipelineStepStatus;
  phoneConnected: boolean;
  sessionId: string;
  onSimulateNfc?: (tampered?: boolean) => void;
}

export const NfcVerificationCard: React.FC<NfcVerificationCardProps> = ({
  nfcResult,
  stepStatus,
  phoneConnected,
  sessionId,
  onSimulateNfc,
}) => {
  const isWaiting = stepStatus === 'PROCESSING' && !nfcResult;
  const isCompleted = Boolean(nfcResult);
  const isMismatch = nfcResult?.readStatus === 'MISMATCH' || nfcResult?.status === 'WARNING';
  const payload = nfcResult?.nfcPayload;

  // Mask document ID (e.g., T1234567 -> T123****7)
  const maskDocId = (id?: string) => {
    if (!id || id.length < 5) return id || '••••••••';
    return id.substring(0, 4) + '****' + id.slice(-1);
  };

  return (
    <div
      className={`bg-white rounded-xl border transition-all duration-300 shadow-xs p-4 flex flex-col justify-between ${
        isWaiting
          ? 'border-blue-400 ring-2 ring-blue-100/80 bg-gradient-to-b from-blue-50/20 to-white'
          : isMismatch
          ? 'border-amber-300/80 bg-amber-50/10'
          : 'border-slate-200/90'
      }`}
    >
      <div>
        {/* Card Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Smartphone className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-[14px] font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
              <span>3. NFC Input</span>
              <span className="text-blue-600 font-semibold text-xs">(From Phone)</span>
            </h3>
          </div>

          {/* Top Status Pill */}
          <div>
            {isWaiting ? (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full animate-pulse">
                <Radio className="w-3 h-3 text-blue-600 animate-ping" />
                <span>WAITING FOR NFC DATA</span>
              </span>
            ) : isCompleted ? (
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  isMismatch
                    ? 'text-amber-700 bg-amber-50 border-amber-300'
                    : 'text-emerald-700 bg-emerald-50 border-emerald-300'
                }`}
              >
                {isMismatch ? (
                  <>
                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                    <span>NFC MISMATCH DETECTED</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>NFC CREDENTIAL RECEIVED</span>
                  </>
                )}
              </span>
            ) : (
              <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                STAGE 3 GATE
              </span>
            )}
          </div>
        </div>

        {/* Sub-label */}
        <div className="text-[11px] text-slate-400 mb-3 flex items-center justify-between">
          <span>Encrypted Contactless Chip Cross-Verification</span>
          <span className="text-[9.5px] font-mono text-slate-400">PRAMAAN NFC Reader</span>
        </div>

        {/* Connection & Session Bar */}
        <div className="flex items-center justify-between text-[11px] bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">PHONE DEVICE:</span>
            <div className="flex items-center gap-1 font-bold">
              <span
                className={`w-2 h-2 rounded-full ${
                  phoneConnected ? 'bg-emerald-500 shadow-xs shadow-emerald-500/50' : 'bg-slate-400'
                }`}
              />
              <span className={phoneConnected ? 'text-emerald-700' : 'text-slate-500'}>
                {phoneConnected ? 'Connected' : 'Waiting'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-slate-600">
            <span className="text-slate-400 text-[10px] uppercase font-semibold">Mobile Session:</span>
            <span className="font-mono font-bold text-slate-800 text-[11px] bg-white px-1.5 py-0.5 rounded border border-slate-200">
              {sessionId || 'PRM-20260908-1832'}
            </span>
          </div>
        </div>

        {/* WAITING STATE DISPLAY */}
        {isWaiting && (
          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-blue-100/80 border border-blue-200 flex items-center justify-center text-blue-600 shadow-inner">
              <Wifi className="w-6 h-6 animate-pulse" />
            </div>

            <div>
              <p className="text-xs font-bold text-slate-900">
                Waiting for input from mobile device
              </p>
              <p className="text-[11px] text-blue-700 font-medium mt-0.5">
                Scan the document's NFC credential using the PRAMAAN NFC Reader.
              </p>
              <p className="text-[10px] text-slate-500 mt-1">
                The pipeline will automatically resume after valid NFC data is received via{' '}
                <code className="bg-blue-100/80 text-blue-800 px-1 py-0.2 rounded font-mono text-[9.5px]">
                  POST /api/v1/nfc/verify
                </code>
              </p>
            </div>

            {/* Local Demonstration / Testing Fallback Buttons */}
            {onSimulateNfc && (
              <div className="pt-2 border-t border-blue-200/80 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => onSimulateNfc(false)}
                  className="px-2.5 py-1 text-[10.5px] font-semibold text-blue-700 bg-white hover:bg-blue-50 border border-blue-300 rounded shadow-2xs cursor-pointer transition-colors"
                >
                  ⚡ Simulate NFC (Clean)
                </button>
                <button
                  type="button"
                  onClick={() => onSimulateNfc(true)}
                  className="px-2.5 py-1 text-[10.5px] font-semibold text-amber-700 bg-white hover:bg-amber-50 border border-amber-300 rounded shadow-2xs cursor-pointer transition-colors"
                >
                  ⚡ Simulate NFC (DOB Mismatch)
                </button>
              </div>
            )}
          </div>
        )}

        {/* RECEIVED STATE DISPLAY */}
        {isCompleted && payload && (
          <div className="space-y-2.5">
            {/* Main Result Banner */}
            <div
              className={`p-3 rounded-lg border flex items-start gap-2.5 ${
                isMismatch
                  ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                  : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
              }`}
            >
              {isMismatch ? (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              )}
              <div className="text-[11px] leading-tight">
                <div className="font-bold flex items-center gap-2">
                  <span>{isMismatch ? 'NFC CROSS-VERIFICATION MISMATCH' : 'NFC CREDENTIAL VERIFIED'}</span>
                  <span className="text-[9.5px] font-mono px-1 rounded bg-white/70 border border-slate-300/60">
                    ID: {maskDocId(payload.documentId)}
                  </span>
                </div>
                <p className="mt-1 text-slate-700 leading-snug">{nfcResult?.explanation}</p>
              </div>
            </div>

            {/* Extracted Credential Fields Table */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 text-[11px]">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">CHIP HOLDER</span>
                  <span className="font-bold text-slate-800 font-mono text-[11px]">
                    {payload.name}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">CHIP DOB</span>
                  <span
                    className={`font-bold font-mono text-[11px] flex items-center gap-1.5 ${
                      !nfcResult?.crossVerification.dobMatch ? 'text-red-600' : 'text-slate-800'
                    }`}
                  >
                    {payload.dob}
                    {!nfcResult?.crossVerification.dobMatch ? (
                      <span className="text-[9px] bg-red-100 text-red-700 px-1 rounded border border-red-200">
                        MISMATCH
                      </span>
                    ) : (
                      <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1 rounded border border-emerald-200">
                        MATCH
                      </span>
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">NATIONALITY</span>
                  <span className="font-semibold text-slate-800 font-mono text-[11px]">
                    {payload.nationality}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">CHIP EXPIRY</span>
                  <span className="font-semibold text-slate-800 font-mono text-[11px]">
                    {payload.expiry}
                  </span>
                </div>
              </div>

              {/* Cryptographic Hash */}
              <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                <span className="text-slate-500 font-medium">Signed Hash:</span>
                <span className="font-mono text-slate-600 truncate max-w-[210px]" title={payload.integrityHash}>
                  {payload.integrityHash.substring(0, 24)}...
                </span>
              </div>
            </div>
          </div>
        )}

        {/* NOT STARTED / PENDING STATE */}
        {!isWaiting && !isCompleted && (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center">
            <p className="text-xs font-medium text-slate-500">
              Awaiting Stage 2 OCR Completion
            </p>
            <p className="text-[10.5px] text-slate-400 mt-1">
              The pipeline will automatically gate here for mobile NFC reader credential input.
            </p>
          </div>
        )}
      </div>

      {/* Footer Disclaimer Label */}
      <div className="mt-3 pt-2 border-t border-slate-100 text-[9.5px] text-slate-400 flex items-center justify-between">
        <span className="font-semibold uppercase tracking-wider">NFC Prototype Credential</span>
        <span>Simulated / Research Demo</span>
      </div>
    </div>
  );
};

export default NfcVerificationCard;
