import React from 'react';
import { CheckCircle2, Info } from 'lucide-react';
import type { IssuerItem } from '../types';

interface IssuerVerificationCardProps {
  items: IssuerItem[];
}

export const IssuerVerificationCard: React.FC<IssuerVerificationCardProps> = ({ items }) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-4 flex flex-col justify-between">
      <div>
        {/* Title with Simulated Badge */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[14px] font-bold text-slate-800 tracking-tight">
            4. Issuer Verification <span className="text-slate-500 font-semibold">(Simulated)</span>
          </h3>
          <span className="text-[9px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
            Simulated Data
          </span>
        </div>

        {/* Status Rows */}
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between py-1 px-1 hover:bg-slate-50 rounded transition-colors group cursor-default"
              title={item.detail}
            >
              {/* Left: Icon + Label */}
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
                <span className="text-[12px] font-medium text-slate-700">
                  {item.label}
                </span>
              </div>

              {/* Right: Status Text */}
              <span className="text-[12px] font-bold text-[#16A34A] tracking-tight">
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Subdued Bottom Disclaimer */}
      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[10px] text-slate-400">
        <Info className="w-3 h-3 text-slate-400 shrink-0" />
        <span className="truncate">Demo issuer data — not a live government database</span>
      </div>
    </div>
  );
};
