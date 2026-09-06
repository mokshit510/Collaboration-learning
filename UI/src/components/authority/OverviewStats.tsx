import React from 'react';
import { FileText, AlertTriangle, Users, ShieldCheck, ArrowUp } from 'lucide-react';
import type { AuthorityStats } from '../../types/authority';

interface OverviewStatsProps {
  stats: AuthorityStats;
}

export const OverviewStats: React.FC<OverviewStatsProps> = ({ stats }) => {
  const cards = [
    {
      id: 'total',
      label: 'Total Verifications',
      value: stats.totalVerifications.formatted,
      trend: stats.totalVerifications.trend,
      trendPeriod: stats.totalVerifications.trendPeriod,
      icon: FileText,
      iconBg: 'bg-blue-50 text-blue-600 border-blue-100',
      trendColor: 'text-emerald-600',
    },
    {
      id: 'high_risk',
      label: 'High-Risk Cases',
      value: stats.highRiskCases.formatted,
      trend: stats.highRiskCases.trend,
      trendPeriod: stats.highRiskCases.trendPeriod,
      icon: AlertTriangle,
      iconBg: 'bg-red-50 text-red-500 border-red-100',
      trendColor: 'text-red-600',
    },
    {
      id: 'investigators',
      label: 'Active Investigators',
      value: stats.activeInvestigators.formatted,
      trend: stats.activeInvestigators.trend,
      trendPeriod: stats.activeInvestigators.trendPeriod,
      icon: Users,
      iconBg: 'bg-blue-50 text-blue-600 border-blue-100',
      trendColor: 'text-emerald-600',
    },
    {
      id: 'cleared',
      label: 'Cleared Documents',
      value: stats.clearedDocuments.formatted,
      trend: stats.clearedDocuments.trend,
      trendPeriod: stats.clearedDocuments.trendPeriod,
      icon: ShieldCheck,
      iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      trendColor: 'text-emerald-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-4 flex items-center gap-4 transition-all duration-150 hover:shadow-md hover:border-slate-300"
          >
            {/* Icon Container */}
            <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${card.iconBg}`}>
              <Icon className="w-6 h-6" />
            </div>

            {/* Metrics */}
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-slate-900 leading-tight">
                  {card.value}
                </span>
                <span className={`inline-flex items-center text-xs font-semibold ${card.trendColor}`}>
                  <ArrowUp className="w-3 h-3 mr-0.5 stroke-[2.5]" />
                  {card.trend}%
                </span>
              </div>
              <div className="text-xs text-slate-500 font-medium truncate mt-0.5">
                {card.label}
              </div>
              <div className="text-[10px] text-slate-400">
                {card.trendPeriod}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
