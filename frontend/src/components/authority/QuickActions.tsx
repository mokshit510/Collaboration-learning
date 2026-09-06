import React, { useState } from 'react';
import { UserPlus, ShieldAlert, FileDown, Settings } from 'lucide-react';
import { QuickActionModals } from './QuickActionModals';

interface QuickActionsProps {
  onTriggerToast?: (msg: string) => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ onTriggerToast }) => {
  const [activeModal, setActiveModal] = useState<
    'add_investigator' | 'manage_watchlist' | 'generate_report' | 'system_settings' | null
  >(null);

  const actions = [
    {
      id: 'add_investigator' as const,
      label: 'Add Investigator',
      icon: UserPlus,
    },
    {
      id: 'manage_watchlist' as const,
      label: 'Manage Watchlist',
      icon: ShieldAlert,
    },
    {
      id: 'generate_report' as const,
      label: 'Generate Report',
      icon: FileDown,
    },
    {
      id: 'system_settings' as const,
      label: 'System Settings',
      icon: Settings,
    },
  ];

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-5 flex flex-col justify-between h-full">
        {/* Header */}
        <h3 className="text-sm font-bold text-slate-900 tracking-tight mb-3">
          Quick Actions
        </h3>

        {/* 4 Action Buttons */}
        <div className="space-y-2.5 flex-1 flex flex-col justify-center">
          {actions.map((act) => {
            const Icon = act.icon;
            return (
              <button
                key={act.id}
                onClick={() => setActiveModal(act.id)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-50/70 hover:bg-blue-100/80 text-blue-700 border border-blue-200/80 text-xs font-semibold transition-all duration-150 shadow-2xs hover:shadow-sm text-left group cursor-pointer"
              >
                <div className="w-6 h-6 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="font-semibold text-slate-800 group-hover:text-blue-900 truncate">
                  {act.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Modal */}
      <QuickActionModals
        type={activeModal}
        onClose={() => setActiveModal(null)}
        onSuccessToast={onTriggerToast}
      />
    </>
  );
};
