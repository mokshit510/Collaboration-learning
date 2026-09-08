import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, ShieldCheck } from 'lucide-react';
import type { ValidationItem } from '../types';

interface DocumentValidationCardProps {
  items: ValidationItem[];
}

const DEFAULT_PLACEHOLDER_ITEMS: ValidationItem[] = [
  { id: 'format', label: 'Document Format', status: '—', valid: true },
  { id: 'mrz', label: 'MRZ Consistency', status: '—', valid: true },
  { id: 'fields', label: 'Field Validations', status: '—', valid: true },
  { id: 'expiry', label: 'Expiry Check', status: '—', valid: true },
  { id: 'required', label: 'Required Fields', status: '—', valid: true },
];

export const DocumentValidationCard: React.FC<DocumentValidationCardProps> = ({ items }) => {
  const displayItems = items.length > 0 ? items : DEFAULT_PLACEHOLDER_ITEMS;
  const isPrePipeline = displayItems.every((i) => !i.status || i.status === '—' || i.status === '-');

  const failedCount = isPrePipeline
    ? 0
    : displayItems.filter(
        (i) => i.valid === false || i.severity === 'FAIL' || i.status.toLowerCase().includes('fail')
      ).length;

  const warningCount = isPrePipeline
    ? 0
    : displayItems.filter(
        (i) => i.severity === 'WARNING' || i.status.toLowerCase().includes('warn') || i.status.toLowerCase().includes('review')
      ).length;

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-4 flex flex-col justify-between">
      <div>
        {/* Title & Badge */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <h3 className="text-[14px] font-bold text-slate-800 tracking-tight">
              3. Document Validation
            </h3>
          </div>

          <span
            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
              isPrePipeline
                ? 'bg-slate-100 text-slate-500 border-slate-200'
                : failedCount > 0
                ? 'bg-red-50 text-red-700 border-red-200'
                : warningCount > 0
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
          >
            {isPrePipeline
              ? 'Pending'
              : failedCount > 0
              ? `${failedCount} Failed`
              : warningCount > 0
              ? `${warningCount} Warning`
              : 'All Rules Passed'}
          </span>
        </div>

        <div className="text-[10.5px] text-slate-400 mb-2.5">
          Field Formats, Chronology &amp; Temporal Rules
        </div>

        {/* Checklist Rows */}
        <div className="space-y-1.5">
          {displayItems.map((item) => {
            const isPlaceholder = !item.status || item.status === '—' || item.status === '-';

            const isFailed =
              !isPlaceholder &&
              (item.valid === false ||
                item.severity === 'FAIL' ||
                item.status.toLowerCase().includes('fail') ||
                item.status.toLowerCase().includes('expired'));

            const isWarning =
              !isPlaceholder &&
              (item.severity === 'WARNING' ||
                item.status.toLowerCase().includes('warn') ||
                item.status.toLowerCase().includes('review'));

            const isPass = !isPlaceholder && !isFailed && !isWarning;

            return (
              <div
                key={item.id}
                className="flex items-center justify-between py-1 px-1.5 hover:bg-slate-50 rounded transition-colors group cursor-default"
                title={item.detail || `${item.label}: ${item.status}`}
              >
                {/* Left: Icon & Label */}
                <div className="flex items-center gap-2 min-w-0">
                  {isPlaceholder && (
                    <span className="w-4 text-center text-slate-300 font-mono text-xs shrink-0 select-none">
                      —
                    </span>
                  )}
                  {isPass && <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />}
                  {isWarning && <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />}
                  {isFailed && <XCircle className="w-4 h-4 text-[#DC2626] shrink-0" />}

                  <span className="text-[11.5px] font-medium text-slate-700 truncate">
                    {item.label}
                  </span>
                </div>

                {/* Right: Status Text */}
                <span
                  className={`text-[11.5px] font-bold tracking-tight shrink-0 ${
                    isPlaceholder
                      ? 'text-slate-400 font-mono font-normal'
                      : isPass
                      ? 'text-[#16A34A]'
                      : isWarning
                      ? 'text-amber-600'
                      : 'text-[#DC2626]'
                  }`}
                >
                  {item.status || '—'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
