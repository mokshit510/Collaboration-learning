import React from 'react';
import { AlertCircle, ArrowRight } from 'lucide-react';
import type { DocumentData } from '../types';

interface RiskAssessmentCardProps {
  data: DocumentData;
  onOpenReport: () => void;
}

export const RiskAssessmentCard: React.FC<RiskAssessmentCardProps> = ({
  data,
  onOpenReport,
}) => {
  // Semi-circular gauge parameters
  const radius = 46;
  const circumference = Math.PI * radius; // 180-degree semi-circle
  const progressPercent = Math.min(Math.max(data.riskScore, 0), 100);
  const strokeDashoffset = circumference - (circumference * progressPercent) / 100;

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-4 flex flex-col justify-between">
      {/* Title */}
      <h3 className="text-[14px] font-bold text-slate-800 tracking-tight mb-2">
        7. Risk Assessment
      </h3>

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

              {/* Foreground Danger Risk Arc */}
              <path
                d="M 14 62 A 46 46 0 0 1 106 62"
                fill="none"
                stroke={data.riskScore > 60 ? '#EF4444' : data.riskScore > 30 ? '#F59E0B' : '#16A34A'}
                strokeWidth="11"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>

            {/* Centered Score */}
            <div className="absolute bottom-1 flex flex-col items-center justify-center">
              <div className="text-[28px] font-extrabold text-slate-900 leading-none font-mono tracking-tight">
                {data.riskScore}
              </div>
              <div className="text-[11px] font-semibold text-slate-400 mt-0.5">
                / 100
              </div>
            </div>
          </div>
        </div>

        {/* Right: High Risk Notification Callout */}
        <div className="col-span-12 sm:col-span-7 bg-[#FEF2F2] border border-red-200/80 rounded-xl p-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded-full bg-[#DC2626] flex items-center justify-center text-white shrink-0 shadow-2xs">
                <AlertCircle className="w-3.5 h-3.5" />
              </div>
              <span className="text-[13px] font-extrabold tracking-wide text-[#DC2626]">
                {data.riskLevel}
              </span>
            </div>

            <p className="text-[10.5px] text-slate-600 leading-snug">
              {data.riskDescription}
            </p>
          </div>

          {/* Action Button: View Detailed Report */}
          <button
            onClick={onOpenReport}
            className="mt-2.5 w-full py-1.5 px-2.5 bg-white hover:bg-red-50 border border-red-200 rounded-lg text-xs font-bold text-red-600 hover:text-red-700 flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
          >
            <span>View Detailed Report</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
