import React from 'react';
import { AlertTriangle, User, ShieldAlert, CheckCircle2 } from 'lucide-react';
import type { SystemActivityItem } from '../../types/authority';

interface SystemActivityProps {
  activities: SystemActivityItem[];
  onViewAll?: () => void;
}

export const SystemActivity: React.FC<SystemActivityProps> = ({ activities, onViewAll }) => {
  const getIconConfig = (type: SystemActivityItem['type']) => {
    switch (type) {
      case 'alert':
        return {
          icon: AlertTriangle,
          bg: 'bg-red-50 text-red-500 border-red-100',
        };
      case 'user':
        return {
          icon: User,
          bg: 'bg-blue-50 text-blue-600 border-blue-100',
        };
      case 'warning':
        return {
          icon: ShieldAlert,
          bg: 'bg-amber-50 text-amber-600 border-amber-100',
        };
      case 'success':
      default:
        return {
          icon: CheckCircle2,
          bg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        };
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-5 flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-slate-900 tracking-tight">
          System Activity
        </h3>
        <button
          onClick={onViewAll}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1"
        >
          <span>View All</span>
          <span>→</span>
        </button>
      </div>

      {/* Activity Timeline List */}
      <div className="divide-y divide-slate-100 text-xs">
        {activities.map((item) => {
          const { icon: Icon, bg } = getIconConfig(item.type);
          return (
            <div
              key={item.id}
              className="py-2.5 flex items-start justify-between gap-3 hover:bg-slate-50/70 px-1.5 rounded-lg transition-colors"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${bg}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900 leading-tight">
                    {item.title}
                  </div>
                  <div className="text-slate-500 text-[11px] truncate mt-0.5">
                    {item.subtitle}
                  </div>
                </div>
              </div>
              <span className="text-[11px] text-slate-400 shrink-0 font-normal">
                {item.timestamp}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
