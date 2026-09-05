import React from 'react';
import {
  LayoutGrid,
  PlusCircle,
  FileText,
  AlertTriangle,
  BarChart3,
  Settings,
  Shield,
} from 'lucide-react';

interface SidebarProps {
  activeNav: string;
  setActiveNav: (nav: string) => void;
  onNewVerification?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeNav,
  setActiveNav,
  onNewVerification,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
    { id: 'new_verification', label: 'New Verification', icon: PlusCircle },
    { id: 'past_records', label: 'Past Records', icon: FileText },
    { id: 'watchlist', label: 'Watchlist', icon: AlertTriangle },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-60 shrink-0 bg-[#071A2F] text-slate-200 flex flex-col justify-between min-h-screen border-r border-[#0E2746] select-none z-30">
      {/* Top Branding Section */}
      <div>
        <div className="px-5 py-5 border-b border-[#0D243F]">
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

        {/* Navigation Items */}
        <nav className="px-3 py-4 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'new_verification' && onNewVerification) {
                    onNewVerification();
                  } else {
                    setActiveNav(item.id);
                  }
                }}
                className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 text-left ${
                  isActive
                    ? 'bg-[#1677E8] text-white shadow-sm font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-[#0D2644]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Area with Border Patrol Background Image & Motto */}
      <div className="relative overflow-hidden mt-auto">
        {/* Background Image Container with Gradient Fade */}
        <div className="relative w-full h-56">
          <img
            src="/images/border_patrol.jpg"
            alt="Border Patrol Silhouette"
            className="w-full h-full object-cover object-center opacity-40 mix-blend-luminosity"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#071A2F] via-[#071A2F]/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#071A2F] to-transparent h-10" />
        </div>

        {/* Bottom Text Motto and Tricolor Accent */}
        <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
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
