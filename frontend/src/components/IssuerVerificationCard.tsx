import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, Database, Check } from 'lucide-react';
import type { IssuerItem, SyntheticReferenceResult } from '../types';

interface IssuerVerificationCardProps {
  items: IssuerItem[];
  referenceComparison?: SyntheticReferenceResult;
  documentNumber?: string;
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

export const IssuerVerificationCard: React.FC<IssuerVerificationCardProps> = ({
  items,
  referenceComparison,
  documentNumber,
}) => {
  const displayItems = items.length > 0 ? items : DEFAULT_PLACEHOLDER_ISSUER_ITEMS;
  const isPrePipeline =
    !referenceComparison &&
    displayItems.every((i) => !i.status || i.status === '—' || i.status === '-');

  const refStatus = referenceComparison?.status;

  const getStatusBadge = () => {
    if (isPrePipeline) {
      return {
        label: 'Pending',
        className: 'bg-slate-100 text-slate-500 border-slate-200',
      };
    }

    if (refStatus === 'VERIFIED') {
      return {
        label: 'VERIFIED',
        className: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      };
    }
    if (refStatus === 'MISMATCH') {
      return {
        label: 'MISMATCH',
        className: 'text-red-700 bg-red-50 border-red-200',
      };
    }
    if (refStatus === 'EXPIRED') {
      return {
        label: 'EXPIRED',
        className: 'text-amber-700 bg-amber-50 border-amber-200',
      };
    }
    if (refStatus === 'BLACKLISTED') {
      return {
        label: 'BLACKLISTED',
        className: 'text-red-700 bg-red-50 border-red-200',
      };
    }
    if (refStatus === 'SUSPICIOUS') {
      return {
        label: 'SUSPICIOUS',
        className: 'text-amber-700 bg-amber-50 border-amber-200',
      };
    }
    if (refStatus === 'NOT_FOUND') {
      return {
        label: 'NOT FOUND',
        className: 'text-slate-600 bg-slate-100 border-slate-200',
      };
    }

    return {
      label: 'Simulated Registry',
      className: 'text-blue-700 bg-blue-50 border-blue-200',
    };
  };

  const badge = getStatusBadge();

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
          <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${badge.className}`}>
            {badge.label}
          </span>
        </div>

        <div className="text-[10.5px] text-slate-400 mb-2.5">
          Consular Database &amp; Reference Verification
        </div>

        {/* Post-Pipeline Supabase Reference Details */}
        {!isPrePipeline && referenceComparison && (
          <div className="mb-3 space-y-2">
            <div className="bg-slate-50/90 rounded-lg p-2.5 border border-slate-200/70 text-[11px] space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Source:</span>
                <span className="font-semibold text-slate-700">
                  {referenceComparison.source || 'Supabase Synthetic Reference Database'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Document Number:</span>
                <span className="font-mono font-bold text-slate-800">
                  {referenceComparison.documentNumber || documentNumber || '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Status:</span>
                <span
                  className={`font-bold uppercase ${
                    refStatus === 'VERIFIED'
                      ? 'text-emerald-600'
                      : refStatus === 'MISMATCH' || refStatus === 'BLACKLISTED'
                      ? 'text-red-600'
                      : refStatus === 'EXPIRED' || refStatus === 'SUSPICIOUS'
                      ? 'text-amber-600'
                      : 'text-slate-600'
                  }`}
                >
                  {refStatus || 'UNKNOWN'}
                </span>
              </div>
            </div>

            {/* Matched Fields */}
            {referenceComparison.matchedFields && referenceComparison.matchedFields.length > 0 && (
              <div>
                <div className="text-[10.5px] font-semibold text-slate-600 mb-1">Matched Fields:</div>
                <div className="flex flex-wrap gap-1">
                  {referenceComparison.matchedFields.map((field, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/70"
                    >
                      <Check className="w-2.5 h-2.5 text-emerald-600" />
                      {field}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Mismatched Fields */}
            {referenceComparison.mismatchedFields && referenceComparison.mismatchedFields.length > 0 && (
              <div className="p-2 rounded-lg bg-red-50 border border-red-200/80 text-[10.5px] space-y-1">
                <div className="font-bold text-red-700 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-red-600" />
                  Mismatched Fields:
                </div>
                {referenceComparison.mismatchedFields.map((m, idx) => (
                  <div key={idx} className="text-red-700 pl-3">
                    <span className="font-semibold">{m.label || m.field}:</span> Extracted{' '}
                    <span className="font-mono bg-red-100/80 px-1 py-0.2 rounded font-bold">
                      "{m.extractedValue || '—'}"
                    </span>{' '}
                    vs Ref{' '}
                    <span className="font-mono bg-white px-1 py-0.2 rounded font-bold border border-red-200">
                      "{m.referenceValue || '—'}"
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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
                statusLower.includes('hit found') ||
                statusLower.includes('mismatch'));

            const isWarning =
              !isPlaceholder &&
              (item.severity === 'WARNING' ||
                statusLower.includes('review') ||
                statusLower.includes('suspend') ||
                statusLower.includes('suspicious'));

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
