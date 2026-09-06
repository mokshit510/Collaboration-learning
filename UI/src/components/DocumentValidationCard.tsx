import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { ValidationItem } from '../types';

interface DocumentValidationCardProps {
  items: ValidationItem[];
}

export const DocumentValidationCard: React.FC<DocumentValidationCardProps> = ({ items }) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-4">
      {/* Title */}
      <h3 className="text-[14px] font-bold text-slate-800 tracking-tight mb-3">
        3. Document Validation
      </h3>

      {/* Checklist Rows */}
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between py-1 px-1 hover:bg-slate-50 rounded transition-colors group cursor-default"
            title={item.detail}
          >
            {/* Left: Icon & Label */}
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
              <span className="text-[12px] font-medium text-slate-700">
                {item.label}
              </span>
            </div>

            {/* Right: Status Pill */}
            <span className="text-[12px] font-bold text-[#16A34A] tracking-tight">
              {item.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
