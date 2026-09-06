import React, { useState } from 'react';
import type { HighRiskCase } from '../../types/authority';
import { CaseDetailModal } from './CaseDetailModal';

interface HighRiskCasesProps {
  cases: HighRiskCase[];
  onViewAll?: () => void;
}

export const HighRiskCases: React.FC<HighRiskCasesProps> = ({ cases, onViewAll }) => {
  const [selectedCase, setSelectedCase] = useState<HighRiskCase | null>(null);

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-5 flex flex-col justify-between h-full">
        {/* Table Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">
            Recent High-Risk Cases
          </h3>
          <button
            onClick={onViewAll}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1"
          >
            <span>View All</span>
            <span>→</span>
          </button>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                <th className="pb-3 font-semibold w-20">#</th>
                <th className="pb-3 font-semibold">Name</th>
                <th className="pb-3 font-semibold">Document Type</th>
                <th className="pb-3 font-semibold text-center">Risk Score</th>
                <th className="pb-3 font-semibold">Reason</th>
                <th className="pb-3 font-semibold text-center">Status</th>
                <th className="pb-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cases.map((item) => {
                const isFlagged = item.status === 'Flagged';
                return (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/80 transition-colors duration-100 group"
                  >
                    {/* ID */}
                    <td className="py-3 font-mono font-medium text-slate-600">
                      {item.id}
                    </td>

                    {/* Name */}
                    <td className="py-3 font-semibold text-slate-900">
                      {item.name}
                    </td>

                    {/* Document Type */}
                    <td className="py-3 text-slate-600 font-medium">
                      {item.documentType}
                    </td>

                    {/* Risk Score Pill */}
                    <td className="py-3 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-red-50 text-red-600 font-bold border border-red-200/70 text-[11px]">
                        {item.riskScore}
                      </span>
                    </td>

                    {/* Reason */}
                    <td className="py-3 text-slate-700 font-medium truncate max-w-[150px]">
                      {item.reason}
                    </td>

                    {/* Status Pill */}
                    <td className="py-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full font-semibold text-[11px] ${
                          isFlagged
                            ? 'bg-red-50 text-red-600 border border-red-200/80'
                            : 'bg-amber-50 text-amber-700 border border-amber-200/80'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>

                    {/* Action Button */}
                    <td className="py-3 text-right">
                      <button
                        onClick={() => setSelectedCase(item)}
                        className="px-3 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 font-semibold text-xs transition-colors shadow-2xs"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Case Details Modal */}
      <CaseDetailModal
        isOpen={selectedCase !== null}
        onClose={() => setSelectedCase(null)}
        caseItem={selectedCase}
      />
    </>
  );
};
