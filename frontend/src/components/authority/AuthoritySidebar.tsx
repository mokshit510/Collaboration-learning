import React from 'react';
import {
  LayoutGrid,
  FileText,
  AlertTriangle,
  Users,
  ShieldAlert,
  BarChart3,
  ClipboardList,
  Settings,
  Shield,
} from 'lucide-react';
import type { AuthorityNavId } from '../../types/authority';

interface AuthoritySidebarProps {
  activeNav: AuthorityNavId;
  setActiveNav: (nav: AuthorityNavId) => void;
  onSwitchToInvestigator?: () => void;
}

export const AuthoritySidebar: React.FC<AuthoritySidebarProps> = ({
  activeNav,
  setActiveNav,
  onSwitchToInvestigator,
}) => {
  const navItems: { id: AuthorityNavId; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid },
    { id: 'verification_records', label: 'Verification Records', icon: FileText },
    { id: 'high_risk_cases', label: 'High-Risk Cases', icon: AlertTriangle },
    { id: 'investigators', label: 'Investigators', icon: Users },
    { id: 'watchlist_management', label: 'Watchlist Management', icon: ShieldAlert },
    { id: 'analytics_reports', label: 'Analytics & Reports', icon: BarChart3 },
    { id: 'audit_logs', label: 'Audit Logs', icon: ClipboardList },
    { id: 'system_settings', label: 'System Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 shrink-0 bg-[#071A2F] text-slate-200 flex flex-col justify-between min-h-screen border-r border-[#0E2746] select-none z-30">
      {/* Top Branding & Admin Section */}
      <div>
        {/* PRAMAAN Brand Header */}
        <div className="px-5 py-4 border-b border-[#0D243F]">
          <div className="flex items-center gap-3">
            {/* Custom Shield Logo */}
            <div className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 shadow-md border border-blue-400/40">
              <Shield className="w-6 h-6 text-white" />
              <div className="absolute w-2.5 h-2.5 rounded-full bg-cyan-400 blur-[2px] opacity-80" />
            </div>

            <div>
              <h1 className="text-[19px] font-extrabold tracking-wider text-white leading-tight font-sans">
                PRAMAAN
              </h1>
              <p className="text-[9px] font-medium tracking-widest text-cyan-300/80 uppercase">
                Trust Beyond Doubt
              </p>
            </div>
          </div>
        </div>

        {/* Authority Portal Sub-Banner Card */}
        <div className="p-3">
          <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-[#0B2544] border border-[#143964] shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-[#1677E8] flex items-center justify-center text-white shadow-inner">
              <Shield className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-white tracking-tight leading-tight">
                Authority Portal
              </div>
              <div className="text-[11px] text-slate-400 font-normal leading-tight">
                Admin Dashboard
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="px-3 py-1 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveNav(item.id)}
                className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 text-left ${
                  isActive
                    ? 'bg-[#1677E8] text-white shadow-sm font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-[#0D2644]'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Area: Switch Portal Quick Button & Border Patrol Silhouette */}
      <div className="relative overflow-hidden mt-auto">
        {/* Quick Portal Switcher */}
        {onSwitchToInvestigator && (
          <div className="px-3 pb-2 relative z-20">
            <button
              onClick={onSwitchToInvestigator}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#0E2C4F] hover:bg-[#143B66] text-xs font-semibold text-cyan-300 border border-cyan-500/30 transition-colors shadow-sm"
              title="Open the Investigator / Checkpoint Officer Dashboard"
            >
              <span>Switch to Investigator Portal →</span>
            </button>
          </div>
        )}

        {/* Background Image Container with Gradient Fade */}
        <div className="relative w-full h-44">
          <img
            src="/images/border_patrol.jpg"
            alt="Border Patrol Silhouette"
            className="w-full h-full object-cover object-center opacity-35 mix-blend-luminosity"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#071A2F] via-[#071A2F]/85 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#071A2F] to-transparent h-8" />
        </div>

        {/* Bottom Text Motto and Tricolor Accent */}
        <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
          <div className="space-y-0.5">
            <div className="text-[11px] font-bold tracking-wider text-slate-200">
              SECURE PEOPLE
            </div>
            <div className="text-[11px] font-bold tracking-wider text-slate-200">
              SECURE BORDERS
            </div>
            <div className="text-[11px] font-extrabold tracking-wider text-white">
              STRONGER INDIA
            </div>
          </div>

          {/* Indian Tricolor Bar */}
          <div className="flex h-1 w-14 mt-2.5 rounded-full overflow-hidden shadow-sm">
            <div className="w-1/3 bg-[#FF9933]" />
            <div className="w-1/3 bg-white" />
            <div className="w-1/3 bg-[#138808]" />
          </div>
        </div>
      </div>
    </aside>
  );
};
