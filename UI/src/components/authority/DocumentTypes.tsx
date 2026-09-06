import React from 'react';
import type { DocumentTypeSegment } from '../../types/authority';

interface DocumentTypesProps {
  data: DocumentTypeSegment[];
}

export const DocumentTypes: React.FC<DocumentTypesProps> = ({ data }) => {
  // SVG Donut geometry
  const radius = 45;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius; // ~282.74

  const segmentsWithOffset = data.map((seg, index) => {
    const priorPercentage = data
      .slice(0, index)
      .reduce((sum, s) => sum + s.percentage, 0);
    const strokeDasharray = `${(seg.percentage / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((priorPercentage / 100) * circumference);
    return {
      ...seg,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-5 flex flex-col justify-between h-full">
      {/* Card Header */}
      <h3 className="text-sm font-bold text-slate-900 tracking-tight mb-3">
        Document Types
      </h3>

      {/* Donut + Legend */}
      <div className="flex items-center justify-between gap-4 my-auto">
        {/* SVG Donut */}
        <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
            {/* Background ring */}
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="transparent"
              stroke="#F1F5F9"
              strokeWidth={strokeWidth}
            />

            {/* Segments */}
            {segmentsWithOffset.map((seg) => (
              <circle
                key={seg.type}
                cx="60"
                cy="60"
                r={radius}
                fill="transparent"
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeDasharray={seg.strokeDasharray}
                strokeDashoffset={seg.strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-500 hover:opacity-90 cursor-pointer"
              />
            ))}
          </svg>

          {/* Inner Circle Cutout Icon */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Ratio
            </span>
            <span className="text-[10px] text-slate-400">
              ICAO Std
            </span>
          </div>
        </div>

        {/* Legend on the right */}
        <div className="flex-1 space-y-3 text-xs">
          {data.map((seg) => (
            <div key={seg.type} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: seg.color }}
                />
                <span className="text-slate-600 font-medium">{seg.type}</span>
              </div>
              <span className="font-bold text-slate-900">{seg.percentage}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Summary */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <span>Active Categories: 3</span>
        <span className="text-blue-600 font-semibold">Standard TD3/V</span>
      </div>
    </div>
  );
};
