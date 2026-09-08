import React from 'react';
import { AlertCircle, ArrowRight, ShieldCheck, CheckCircle2, Shield } from 'lucide-react';
import type { DocumentData, PipelineStepStatus, RiskResult } from '../types';

interface RiskAssessmentCardProps {
  data: DocumentData;
  riskResult?: RiskResult | null;
  stepStatus?: PipelineStepStatus;
  onOpenReport: () => void;
}

export const RiskAssessmentCard: React.FC<RiskAssessmentCardProps> = ({
  data: _data,
  riskResult,
  stepStatus,
  onOpenReport,
}) => {
  const hasRun =
    (stepStatus === 'COMPLETED' || stepStatus === 'WARNING' || stepStatus === 'FAILED') &&
    riskResult !== null &&
    riskResult !== undefined;

  const score = hasRun ? riskResult.score : 0;
  const level = hasRun
    ? riskResult.level === 'HIGH'
      ? 'HIGH RISK'
      : riskResult.level === 'MEDIUM'
      ? 'MEDIUM RISK'
      : 'LOW RISK'
    : 'Awaiting pipeline execution';
  const description = hasRun
    ? riskResult.explanation
    : 'Run the verification pipeline to calculate risk';

  const isHigh = hasRun && riskResult.level === 'HIGH';
  const isMed = hasRun && riskResult.level === 'MEDIUM';

  // Semi-circular gauge parameters
  const radius = 46;
  const circumference = Math.PI * radius; // 180-degree semi-circle
  const progressPercent = hasRun ? Math.min(Math.max(score, 0), 100) : 0;
  const strokeDashoffset = circumference - (circumference * progressPercent) / 100;

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-4 flex flex-col justify-between">
      {/* Title */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[14px] font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span>7. Risk Assessment</span>
        </h3>
        {!hasRun && (
          <span className="text-[9.5px] font-mono font-bold px-2 py-0.5 rounded border text-slate-500 bg-slate-100 border-slate-200">
            Awaiting Pipeline
          </span>
        )}
      </div>

      <div className="text-[10.5px] text-slate-400 mb-2.5">
        Automated Multi-Vector Risk Calculation • Forensic Evidence Graph Fusion
      </div>

      {/* Main Row: Gauge & Alert Box */}
      <div className="grid grid-cols-12 gap-3 items-center">
        {/* Left: Semi-circular Gauge */}
        <div className="col-span-12 sm:col-span-5 flex flex-col items-center justify-center relative">
          <div className="relative w-36 h-24 flex items-center justify-center overflow-hidden">
            <svg viewBox="0 0 120 70" className="w-full h-full">
              {/* Background Track Arc */}
              <path
                d="M 14 62 A 46 46 0 0 1 106 62"
                fill="none"
                stroke="#E2E8F0"
                strokeWidth="11"
                strokeLinecap="round"
              />

              {/* Foreground Danger Risk Arc (Only rendered if pipeline has run) */}
              {hasRun && (
                <path
                  d="M 14 62 A 46 46 0 0 1 106 62"
                  fill="none"
                  stroke={score > 60 ? '#EF4444' : score > 30 ? '#F59E0B' : '#16A34A'}
                  strokeWidth="11"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              )}
            </svg>

            {/* Centered Score */}
            <div className="absolute bottom-1 flex flex-col items-center justify-center">
              <div
                className={`text-[28px] font-extrabold leading-none font-mono tracking-tight ${
                  hasRun
                    ? score > 60
                      ? 'text-red-600'
                      : score > 30
                      ? 'text-amber-600'
                      : 'text-emerald-600'
                    : 'text-slate-300'
                }`}
              >
                {hasRun ? score : '—'}
              </div>
              <div className="text-[11px] font-semibold text-slate-400 mt-0.5">
                / 100
              </div>
            </div>
          </div>
        </div>

        {/* Right: Risk Notification Callout OR Empty State */}
        {hasRun ? (
          <div
            className={`col-span-12 sm:col-span-7 border rounded-xl p-3 flex flex-col justify-between ${
              isHigh
                ? 'bg-[#FEF2F2] border-red-200/80'
                : isMed
                ? 'bg-amber-50 border-amber-200/80'
                : 'bg-emerald-50 border-emerald-200/80'
            }`}
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-white shrink-0 shadow-2xs ${
                    isHigh
                      ? 'bg-[#DC2626]'
                      : isMed
                      ? 'bg-amber-500'
                      : 'bg-emerald-600'
                  }`}
                >
                  {isHigh || isMed ? (
                    <AlertCircle className="w-3.5 h-3.5" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                </div>
                <span
                  className={`text-[13px] font-extrabold tracking-wide ${
                    isHigh
                      ? 'text-[#DC2626]'
                      : isMed
                      ? 'text-amber-700'
                      : 'text-emerald-700'
                  }`}
                >
                  {level}
                </span>
              </div>

              <p className="text-[10.5px] text-slate-600 leading-snug">
                {description}
              </p>
            </div>

            {/* Action Button: View Detailed Report */}
            <button
              onClick={onOpenReport}
              className={`mt-2.5 w-full py-1.5 px-2.5 bg-white border rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer ${
                isHigh
                  ? 'hover:bg-red-50 border-red-200 text-red-600 hover:text-red-700'
                  : isMed
                  ? 'hover:bg-amber-50 border-amber-200 text-amber-700 hover:text-amber-800'
                  : 'hover:bg-emerald-50 border-emerald-200 text-emerald-700 hover:text-emerald-800'
              }`}
            >
              <span>View Detailed Report</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="col-span-12 sm:col-span-7 bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                  <Shield className="w-3 h-3" />
                </div>
                <span className="text-[12.5px] font-bold text-slate-700">
                  Awaiting pipeline execution
                </span>
              </div>

              <p className="text-[10.5px] text-slate-500 leading-snug mt-1">
                Run the verification pipeline to calculate risk.
              </p>
            </div>

            <button
              onClick={onOpenReport}
              className="mt-2.5 w-full py-1.5 px-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            >
              <span>View Forensic Dossier</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RiskAssessmentCard;
