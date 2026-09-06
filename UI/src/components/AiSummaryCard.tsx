import React from 'react';
import { Sparkles } from 'lucide-react';

interface AiSummaryCardProps {
  summary: string;
}

export const AiSummaryCard: React.FC<AiSummaryCardProps> = ({ summary }) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-4 flex items-center gap-4 flex-1">
      {/* Left AI Sparkle Icon Badge */}
      <div className="w-10 h-10 rounded-xl bg-[#1677E8] text-white flex items-center justify-center shrink-0 shadow-xs">
        <Sparkles className="w-5 h-5 fill-white/20" />
      </div>

      {/* Summary Content */}
      <div className="leading-snug">
        <h4 className="text-[13px] font-bold text-slate-900 mb-0.5 font-sans">
          AI Summary
        </h4>
        <p className="text-[11.5px] text-slate-600 leading-relaxed">
          {summary}
        </p>
      </div>
    </div>
  );
};
