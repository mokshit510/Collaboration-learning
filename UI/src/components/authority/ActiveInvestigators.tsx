import React from 'react';
import type { InvestigatorRecord } from '../../types/authority';

interface ActiveInvestigatorsProps {
  investigators: InvestigatorRecord[];
  onViewAll?: () => void;
}

export const ActiveInvestigators: React.FC<ActiveInvestigatorsProps> = ({
  investigators,
  onViewAll,
}) => {
  // Avatar colors for initials
  const avatarColors: Record<string, string> = {
    'INV-001': 'bg-emerald-100 text-emerald-800 border-emerald-300',
    'INV-002': 'bg-blue-100 text-blue-800 border-blue-300',
    'INV-003': 'bg-purple-100 text-purple-800 border-purple-300',
    'INV-004': 'bg-amber-100 text-amber-800 border-amber-300',
  };

  const getStatusBadge = (status: InvestigatorRecord['status']) => {
    switch (status) {
      case 'Online':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Online
          </span>
        );
      case 'Away':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Away
          </span>
        );
      case 'Offline':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium text-slate-500 bg-slate-100 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Offline
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-5 flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-slate-900 tracking-tight">
          Active Investigators
        </h3>
        <button
          onClick={onViewAll}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1"
        >
          <span>View All</span>
          <span>→</span>
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700">
          <thead>
            <tr className="border-b border-slate-100 text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
              <th className="pb-3 font-semibold">Name</th>
              <th className="pb-3 font-semibold">ID</th>
              <th className="pb-3 font-semibold">Checkpoint</th>
              <th className="pb-3 font-semibold text-center">Verifications</th>
              <th className="pb-3 font-semibold">Last Active</th>
              <th className="pb-3 font-semibold text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {investigators.map((inv) => {
              const initials = inv.name
                .split(' ')
                .map((n) => n[0])
                .join('');
              const colorClass = avatarColors[inv.id] || 'bg-slate-100 text-slate-800';

              return (
                <tr
                  key={inv.id}
                  className="hover:bg-slate-50/80 transition-colors duration-100"
                >
                  {/* Name with Avatar */}
                  <td className="py-2.5 font-semibold text-slate-900">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] border shrink-0 ${colorClass}`}
                      >
                        {initials}
                      </div>
                      <span className="truncate">{inv.name}</span>
                    </div>
                  </td>

                  {/* ID */}
                  <td className="py-2.5 font-mono text-slate-500 font-medium">
                    {inv.id}
                  </td>

                  {/* Checkpoint */}
                  <td className="py-2.5 text-slate-600 font-medium truncate max-w-[120px]">
                    {inv.checkpoint}
                  </td>

                  {/* Verifications Count */}
                  <td className="py-2.5 text-center font-bold text-slate-900">
                    {inv.verifications}
                  </td>

                  {/* Last Active */}
                  <td className="py-2.5 text-slate-500">
                    {inv.lastActive}
                  </td>

                  {/* Status Badge */}
                  <td className="py-2.5 text-right">
                    {getStatusBadge(inv.status)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
