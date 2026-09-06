import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { VerificationTrendPoint } from '../../types/authority';

interface VerificationTrendsProps {
  data: VerificationTrendPoint[];
}

export const VerificationTrends: React.FC<VerificationTrendsProps> = ({ data }) => {
  const [selectedFilter, setSelectedFilter] = useState('Last 7 Days');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const filters = ['Last 7 Days', 'Last 14 Days', 'Last 30 Days'];

  // SVG dimensions
  const svgWidth = 520;
  const svgHeight = 180;
  const padding = { top: 20, right: 25, bottom: 30, left: 35 };

  const innerWidth = svgWidth - padding.left - padding.right;
  const innerHeight = svgHeight - padding.top - padding.bottom;

  const maxY = 200;
  const yTicks = [0, 50, 100, 150, 200];

  // Helper coordinate conversions
  const getX = (index: number) => {
    return padding.left + (index / (data.length - 1)) * innerWidth;
  };

  const getY = (val: number) => {
    return padding.top + innerHeight - (val / maxY) * innerHeight;
  };

  // Generate line paths
  const totalPath = data.reduce((acc, pt, i) => {
    const x = getX(i);
    const y = getY(pt.totalVerifications);
    return i === 0 ? `M ${x},${y}` : `${acc} L ${x},${y}`;
  }, '');

  const highRiskPath = data.reduce((acc, pt, i) => {
    const x = getX(i);
    const y = getY(pt.highRiskCases);
    return i === 0 ? `M ${x},${y}` : `${acc} L ${x},${y}`;
  }, '');

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-5 flex flex-col justify-between h-full">
      {/* Card Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-slate-900 tracking-tight">
          Verification Trends
        </h3>

        {/* Filter Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
          >
            <span>{selectedFilter}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {isFilterOpen && (
            <div className="absolute right-0 mt-1 w-32 bg-white border border-slate-200 rounded-lg shadow-lg z-30 py-1 text-xs">
              {filters.map((f) => (
                <button
                  key={f}
                  onClick={() => {
                    setSelectedFilter(f);
                    setIsFilterOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 ${
                    f === selectedFilter ? 'font-bold text-blue-600' : 'text-slate-700'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SVG Line Chart */}
      <div className="relative w-full overflow-x-auto select-none">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto min-w-[340px]"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Horizontal Grid Lines & Y-Axis Labels */}
          {yTicks.map((tick) => {
            const y = getY(tick);
            return (
              <g key={tick}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={svgWidth - padding.right}
                  y2={y}
                  stroke="#E2E8F0"
                  strokeWidth="1"
                  strokeDasharray={tick === 0 ? 'none' : '3 3'}
                />
                <text
                  x={padding.left - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  fill="#94A3B8"
                  fontSize="10"
                  fontFamily="Inter, sans-serif"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* X-Axis Dates */}
          {data.map((pt, i) => {
            const x = getX(i);
            return (
              <text
                key={pt.date + i}
                x={x}
                y={svgHeight - 10}
                textAnchor="middle"
                fill="#94A3B8"
                fontSize="9.5"
                fontFamily="Inter, sans-serif"
              >
                {pt.date}
              </text>
            );
          })}

          {/* Area fill for subtle aesthetic */}
          <path
            d={`${totalPath} L ${getX(data.length - 1)},${getY(0)} L ${getX(0)},${getY(0)} Z`}
            fill="rgba(37, 99, 235, 0.05)"
          />

          {/* High-Risk Line (Red) */}
          <path
            d={highRiskPath}
            fill="none"
            stroke="#EF4444"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Total Verifications Line (Blue) */}
          <path
            d={totalPath}
            fill="none"
            stroke="#2563EB"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Dots on points */}
          {data.map((pt, i) => {
            const x = getX(i);
            const yTotal = getY(pt.totalVerifications);
            const yRisk = getY(pt.highRiskCases);
            const isHovered = hoveredIndex === i;

            return (
              <g
                key={i}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Vertical hover guide bar */}
                {isHovered && (
                  <line
                    x1={x}
                    y1={padding.top}
                    x2={x}
                    y2={getY(0)}
                    stroke="#CBD5E1"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                )}

                {/* Total Dot */}
                <circle
                  cx={x}
                  cy={yTotal}
                  r={isHovered ? 5.5 : 3.5}
                  fill="#2563EB"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  className="transition-all duration-150"
                />

                {/* High Risk Dot */}
                <circle
                  cx={x}
                  cy={yRisk}
                  r={isHovered ? 5.5 : 3.5}
                  fill="#EF4444"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  className="transition-all duration-150"
                />
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredIndex !== null && data[hoveredIndex] && (
          <div
            className="absolute -top-1 pointer-events-none bg-slate-900 text-white text-[10px] rounded-lg px-2.5 py-1.5 shadow-xl border border-slate-700 z-20 flex flex-col gap-0.5"
            style={{
              left: `${(hoveredIndex / (data.length - 1)) * 75 + 12}%`,
              transform: 'translateX(-50%)',
            }}
          >
            <div className="font-bold text-slate-300 border-b border-slate-700 pb-0.5">
              {data[hoveredIndex].date}
            </div>
            <div className="flex items-center gap-1.5 text-blue-400">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span>Total: {data[hoveredIndex].totalVerifications}</span>
            </div>
            <div className="flex items-center gap-1.5 text-red-400">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <span>High-Risk: {data[hoveredIndex].highRiskCases}</span>
            </div>
          </div>
        )}
      </div>

      {/* Chart Legend */}
      <div className="flex items-center justify-center gap-6 pt-2 border-t border-slate-100 text-xs text-slate-600 font-medium">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
          <span>Total Verifications</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
          <span>High-Risk Cases</span>
        </div>
      </div>
    </div>
  );
};
