import React, { useState, useRef, useEffect } from 'react';
import { Bell, ChevronDown, LogOut, ExternalLink, ShieldCheck } from 'lucide-react';

interface AuthorityHeaderProps {
  onSwitchToInvestigator?: () => void;
}

export const AuthorityHeader: React.FC<AuthorityHeaderProps> = ({ onSwitchToInvestigator }) => {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close popovers on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const notifications = [
    { id: 1, title: 'Flagged Document Alert', desc: 'Case #PR-8421 flagged at Delhi Checkpoint (92 Risk)', time: '5m ago', unread: true },
    { id: 2, title: 'Investigator Check-in', desc: 'Vikram Singh (INV-002) logged in at Mumbai Terminal', time: '12m ago', unread: true },
    { id: 3, title: 'Watchlist Synchronization', desc: 'National border biometric database sync completed', time: '1h ago', unread: false },
    { id: 4, title: 'System Security Report', desc: 'Weekly automated security audit clean (0 vulnerabilities)', time: '3h ago', unread: false },
  ];

  return (
    <header className="bg-[#071A2F] border-b border-[#0D243F] text-white px-7 py-3 flex items-center justify-between shrink-0 select-none shadow-sm z-20">
      {/* Left Title & Subtitle */}
      <div>
        <h2 className="text-[17px] font-bold text-white tracking-normal leading-tight font-sans">
          AI-Powered Identity & Document Verification
        </h2>
        <p className="text-[12px] text-slate-400 font-normal tracking-wide">
          Secure Borders. Safer Tomorrow.
        </p>
      </div>

      {/* Right Side: Notification Bell & Admin Profile */}
      <div className="flex items-center gap-5">
        {/* Notification Bell with Badge */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative p-2 rounded-lg text-slate-300 hover:text-white hover:bg-[#0E2849] transition-colors focus:outline-none"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-600 rounded-full border-2 border-[#071A2F]">
              5
            </span>
          </button>

          {/* Notifications Dropdown Popover */}
          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-[#0A223E] border border-[#143B66] rounded-xl shadow-2xl overflow-hidden z-50 text-slate-200">
              <div className="px-4 py-3 border-b border-[#143B66] flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-white">System Notifications</span>
                <span className="text-[11px] bg-red-600/80 text-white font-semibold px-2 py-0.5 rounded-full">5 New</span>
              </div>
              <div className="divide-y divide-[#143B66]/60 max-h-72 overflow-y-auto">
                {notifications.map((n) => (
                  <div key={n.id} className="p-3 hover:bg-[#103056] transition-colors cursor-pointer text-xs">
                    <div className="flex items-center justify-between font-semibold text-white">
                      <span>{n.title}</span>
                      <span className="text-[10px] text-slate-400 font-normal">{n.time}</span>
                    </div>
                    <p className="text-slate-300 text-[11px] mt-0.5 leading-snug">{n.desc}</p>
                  </div>
                ))}
              </div>
              <div className="p-2 border-t border-[#143B66] text-center bg-[#071B33]">
                <button
                  onClick={() => setIsNotifOpen(false)}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
                >
                  Mark all as read
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Admin Profile Area */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-lg hover:bg-[#0E2849] transition-colors text-left focus:outline-none"
          >
            {/* Avatar Image with Online Status */}
            <div className="relative">
              <img
                src="/images/admin_mehta.jpg"
                alt="R. Mehta"
                className="w-10 h-10 rounded-full object-cover border-2 border-blue-400/50 shadow-sm"
                onError={(e) => {
                  // Fallback to SVG if image loading has issues
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#071A2F]" />
            </div>

            {/* Name & Title */}
            <div className="leading-tight hidden sm:block">
              <div className="text-[13px] font-bold text-white">R. Mehta</div>
              <div className="text-[11px] text-slate-400 font-medium">System Administrator</div>
            </div>

            {/* Down Chevron */}
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-150 ${isProfileOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Profile Dropdown Menu */}
          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-[#0A223E] border border-[#143B66] rounded-xl shadow-2xl overflow-hidden z-50 text-slate-200">
              <div className="p-3 border-b border-[#143B66]">
                <p className="text-xs font-bold text-white">R. Mehta (Admin)</p>
                <p className="text-[11px] text-slate-400">r.mehta@pramaan.gov.demo</p>
                <div className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-400 font-semibold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Authority Clearance Level 4</span>
                </div>
              </div>

              <div className="p-1 space-y-0.5 text-xs">
                {onSwitchToInvestigator && (
                  <button
                    onClick={() => {
                      setIsProfileOpen(false);
                      onSwitchToInvestigator();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#133A64] text-cyan-300 font-medium text-left transition-colors"
                  >
                    <span>Switch to Investigator View</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
                <div className="px-3 py-2 text-[11px] text-slate-400">
                  Checkpoint: HQ Command Center
                </div>
              </div>

              <div className="p-2 border-t border-[#143B66] bg-[#071B33]">
                <button
                  onClick={() => setIsProfileOpen(false)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Session Active (Demo Mode)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
