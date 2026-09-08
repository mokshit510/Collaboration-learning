import React from 'react';
import { Shield, Settings, Wifi, WifiOff } from 'lucide-react';

interface HeaderProps {
  connected: boolean;
  sessionId: string;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  connected,
  sessionId,
  onOpenSettings,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#0B132B]/95 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-sm">
          <Shield className="w-4.5 h-4.5" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-black tracking-wider text-white">PRAMAAN</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400 bg-blue-500/10 border border-blue-500/30 px-1.5 py-0.2 rounded">
              Companion
            </span>
          </div>
          <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
            <span>SESS:</span>
            <span className="text-slate-200 font-semibold">{sessionId}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
            connected
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}
        >
          {connected ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50" />
              <Wifi className="w-3 h-3" />
              <span className="text-[10.5px]">Connected</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              <WifiOff className="w-3 h-3" />
              <span className="text-[10.5px]">Offline</span>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={onOpenSettings}
          className="p-1.5 rounded-lg bg-slate-800/80 border border-slate-700 hover:bg-slate-700 text-slate-300 transition-colors"
          title="Connection Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
