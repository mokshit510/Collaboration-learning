import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { OcrField } from '../types';

interface OcrExtractionCardProps {
  fields: OcrField[];
}

export const OcrExtractionCard: React.FC<OcrExtractionCardProps> = ({ fields }) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-4">
      {/* Title */}
      <h3 className="text-[14px] font-bold text-slate-800 tracking-tight mb-3">
        2. OCR Extraction
      </h3>

      {/* Field List */}
      <div className="divide-y divide-slate-100">
        {fields.map((field) => (
          <div
            key={field.label}
            className="flex items-center justify-between py-1.5 px-0.5 hover:bg-slate-50/80 rounded transition-colors group"
            title={`Confidence: ${field.confidence}%`}
          >
            {/* Field Label */}
            <span className="text-[12px] font-medium text-slate-500 w-32 shrink-0">
              {field.label}
            </span>

            {/* Field Value */}
            <span className="text-[12px] font-bold text-slate-800 font-mono tracking-tight flex-1 px-2 text-left truncate">
              {field.value}
            </span>

            {/* Confidence + Verification Badge */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] font-mono text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                {field.confidence}%
              </span>
              <CheckCircle2 className="w-4 h-4 text-[#16A34A] fill-emerald-50 shrink-0" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
