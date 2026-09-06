import React, { useState } from 'react';
import { ChevronDown, MapPin } from 'lucide-react';
import type { LocationVerification } from '../../types/authority';

interface LocationStatisticsProps {
  locations: LocationVerification[];
}

export const LocationStatistics: React.FC<LocationStatisticsProps> = ({ locations }) => {
  const [selectedRange, setSelectedRange] = useState('Last 7 Days');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [hoveredLocation, setHoveredLocation] = useState<string | null>(null);

  const ranges = ['Last 7 Days', 'Last 14 Days', 'Last 30 Days'];

  // Geographic checkpoints on the stylized map (SVG viewBox 0 0 300 320)
  const mapNodes = [
    { id: 'delhi', name: 'Delhi (IGI)', cx: 120, cy: 105, count: 412, isMajor: true },
    { id: 'mumbai', name: 'Mumbai', cx: 80, cy: 180, count: 286, isMajor: true },
    { id: 'kolkata', name: 'Kolkata', cx: 220, cy: 155, count: 148, isMajor: false },
    { id: 'hyderabad', name: 'Hyderabad', cx: 130, cy: 195, count: 64, isMajor: false },
    { id: 'bengaluru', name: 'Bengaluru', cx: 120, cy: 235, count: 76, isMajor: false },
    { id: 'chennai', name: 'Chennai', cx: 145, cy: 248, count: 98, isMajor: false },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-5 flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-slate-900 tracking-tight">
          Verifications by Location
        </h3>

        {/* Filter */}
        <div className="relative">
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
          >
            <span>{selectedRange}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {isFilterOpen && (
            <div className="absolute right-0 mt-1 w-32 bg-white border border-slate-200 rounded-lg shadow-lg z-30 py-1 text-xs">
              {ranges.map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setSelectedRange(r);
                    setIsFilterOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 ${
                    r === selectedRange ? 'font-bold text-blue-600' : 'text-slate-700'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Area: Stylized Map on Left, List on Right */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
        {/* Stylized India Silhouette Map with Glowing Checkpoints (7 cols) */}
        <div className="sm:col-span-6 relative flex items-center justify-center p-1">
          <svg
            viewBox="0 0 300 320"
            className="w-full max-h-[220px] drop-shadow-sm select-none"
          >
            <defs>
              <linearGradient id="indiaMapGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0B2342" />
                <stop offset="100%" stopColor="#071A2F" />
              </linearGradient>

              {/* Pulse glow filter */}
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Stylized India Subcontinent Polygon / Path */}
            <path
              d="M 125,25 
                 C 135,28 145,45 140,65
                 C 155,70 170,80 185,90
                 C 200,85 225,95 240,110
                 C 260,115 275,130 265,140
                 C 255,145 245,135 235,140
                 C 230,150 225,165 220,175
                 C 210,185 200,185 190,195
                 C 175,205 160,225 155,250
                 C 150,265 140,285 130,305
                 C 125,285 115,265 105,245
                 C 95,225 85,210 75,190
                 C 65,175 60,165 70,150
                 C 55,150 45,145 40,135
                 C 45,120 65,125 75,115
                 C 80,105 85,85 95,70
                 C 105,50 115,35 125,25 Z"
              fill="url(#indiaMapGrad)"
              stroke="#1E3A5F"
              strokeWidth="2"
              className="transition-all duration-300"
            />

            {/* Faint Internal Radar Connecting Network Lines */}
            <line x1="120" y1="105" x2="80" y2="180" stroke="#38BDF8" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
            <line x1="120" y1="105" x2="220" y2="155" stroke="#38BDF8" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
            <line x1="80" y1="180" x2="130" y2="195" stroke="#38BDF8" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
            <line x1="130" y1="195" x2="145" y2="248" stroke="#38BDF8" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
            <line x1="120" y1="235" x2="145" y2="248" stroke="#38BDF8" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
            <line x1="120" y1="105" x2="130" y2="195" stroke="#38BDF8" strokeWidth="1" strokeDasharray="3 3" opacity="0.3" />

            {/* Glowing Checkpoint Nodes */}
            {mapNodes.map((node) => {
              const isHovered = hoveredLocation === node.id;
              return (
                <g
                  key={node.id}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredLocation(node.id)}
                  onMouseLeave={() => setHoveredLocation(null)}
                >
                  {/* Outer Animated Pulse Wave */}
                  <circle
                    cx={node.cx}
                    cy={node.cy}
                    r={isHovered ? 14 : node.isMajor ? 10 : 7}
                    fill="#38BDF8"
                    opacity={isHovered ? 0.35 : 0.2}
                    className="animate-pulse"
                  />

                  {/* Node Dot */}
                  <circle
                    cx={node.cx}
                    cy={node.cy}
                    r={isHovered ? 6 : node.isMajor ? 4.5 : 3.5}
                    fill="#38BDF8"
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                    filter="url(#glow)"
                  />

                  {/* Tooltip text when hovered */}
                  {isHovered && (
                    <g>
                      <rect
                        x={node.cx - 35}
                        y={node.cy - 24}
                        width="70"
                        height="18"
                        rx="4"
                        fill="#0F172A"
                        stroke="#334155"
                        strokeWidth="1"
                      />
                      <text
                        x={node.cx}
                        y={node.cy - 12}
                        textAnchor="middle"
                        fill="#FFFFFF"
                        fontSize="9"
                        fontWeight="bold"
                        fontFamily="Inter, sans-serif"
                      >
                        {node.name.split(' ')[0]}: {node.count}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Location List on Right (6 cols) */}
        <div className="sm:col-span-6 space-y-2 text-xs">
          {locations.map((loc) => {
            const isHovered = hoveredLocation === loc.id;
            return (
              <div
                key={loc.id}
                onMouseEnter={() => setHoveredLocation(loc.id)}
                onMouseLeave={() => setHoveredLocation(null)}
                className={`flex items-center justify-between py-1 px-2 rounded-lg transition-colors cursor-pointer ${
                  isHovered ? 'bg-blue-50/70 font-semibold' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: loc.dotColor }}
                  />
                  <span className="text-slate-700 font-medium">{loc.name}</span>
                </div>
                <span className="font-bold text-slate-900">{loc.count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Subtle bottom note */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <span className="flex items-center gap-1">
          <MapPin className="w-3 h-3 text-blue-500" />
          <span>Major Air & Sea Checkpoints</span>
        </span>
        <span className="font-semibold text-slate-600">Total: 1,248</span>
      </div>
    </div>
  );
};
