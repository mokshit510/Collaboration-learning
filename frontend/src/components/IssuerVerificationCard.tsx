import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, Database } from 'lucide-react';
import type { IssuerItem } from '../types';

interface IssuerVerificationCardProps {
  items: IssuerItem[];
}

const DEFAULT_PLACEHOLDER_ISSUER_ITEMS: IssuerItem[] = [
  {
    id: 'db_lookup',
    label: 'Passport No. in Database',
    status: '—',
    valid: true,
    detail: 'Awaiting pipeline execution',
  },
  {
    id: 'status',
    label: 'Status',
    status: '—',
    valid: true,
    detail: 'Awaiting pipeline execution',
  },
  {
    id: 'blacklist',
    label: 'Blacklist Check',
    status: '—',
    valid: true,
    detail: 'Awaiting pipeline execution',
  },
  {
    id: 'issuer_match',
    label: 'Issuer Match',
    status: '—',
    valid: true,
    detail: 'Awaiting pipeline execution',
  },
];

export const IssuerVerificationCard: React.FC<IssuerVerificationCardProps> = ({ items }) => {
  const displayItems = items.length > 0 ? items : DEFAULT_PLACEHOLDER_ISSUER_ITEMS;
  const isPrePipeline = displayItems.every((i) => !i.status || i.status === '—' || i.status === '-');

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-4 flex flex-col justify-between">
      <div>
        {/* Title with Prominent Simulated Badge */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Database className="w-4 h-4 text-blue-600" />
            <h3 className="text-[14px] font-bold text-slate-800 tracking-tight">
              4. Issuer Verification <span className="text-slate-500 font-semibold">(Simulated)</span>
            </h3>
          </div>
          <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
            isPrePipeline
              ? 'bg-slate-100 text-slate-500 border-slate-200'
              : 'text-blue-700 bg-blue-50 border-blue-200'
          }`}>
            {isPrePipeline ? 'Pending' : 'Simulated Registry'}
          </span>
        </div>

        <div className="text-[10.5px] text-slate-400 mb-2.5">
          Consular Database &amp; Digital Signature Verification
        </div>

        {/* Status Rows */}
        <div className="space-y-1.5">
          {displayItems.map((item) => {
            const isPlaceholder = !item.status || item.status === '—' || item.status === '-';
            const statusLower = (item.status || '').toLowerCase();
            const isFailed =
              !isPlaceholder &&
              (item.valid === false ||
                item.severity === 'FAIL' ||
                statusLower.includes('revoked') ||
                statusLower.includes('expired') ||
                statusLower.includes('flagged') ||
                statusLower.includes('not found') ||
                statusLower.includes('hit found'));

            const isWarning =
              !isPlaceholder &&
              (item.severity === 'WARNING' ||
                statusLower.includes('review') ||
                statusLower.includes('suspend'));

            const isPass = !isPlaceholder && !isFailed && !isWarning;

            return (
              <div
                key={item.id}
                className="flex items-center justify-between py-1 px-1.5 hover:bg-slate-50 rounded transition-colors group cursor-default"
                title={item.detail || `${item.label}: ${item.status}`}
              >
                {/* Left: Icon + Label */}
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

      {/* Mandatory User Requirement: Clear Simulated Disclaimer */}
      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[10px] text-slate-400">
        <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="truncate">Demo issuer data — not a live government database</span>
      </div>
    </div>
  );
};
