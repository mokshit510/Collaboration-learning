import React, { useState } from 'react';
import { X, Server, Radio, RefreshCw, CheckCircle2 } from 'lucide-react';
import { getDefaultApiBase, setCustomApiBase } from '../services/api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSessionId: string;
  onUpdateSessionId: (newId: string) => void;
  onRefreshSession: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentSessionId,
  onUpdateSessionId,
  onRefreshSession,
}) => {
  const [apiUrl, setApiUrl] = useState<string>(getDefaultApiBase());
  const [inputSessionId, setInputSessionId] = useState<string>(currentSessionId);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [testMessage, setTestMessage] = useState<string>('');

  if (!isOpen) return null;

  const handleSaveApi = () => {
    setCustomApiBase(apiUrl);
    if (inputSessionId.trim()) {
      onUpdateSessionId(inputSessionId.trim());
    }
    onRefreshSession();
    onClose();
  };

  const handleTestConnection = async () => {
    setTestStatus('testing');
    setTestMessage('Pinging server...');
    try {
      const cleanUrl = (apiUrl || '').trim().replace(/\/+$/, '');
      const testUrl = cleanUrl ? `${cleanUrl}/api/v1/session/current` : '/api/v1/session/current';
      const res = await fetch(testUrl);
      if (res.ok) {
        const json = await res.json();
        setTestStatus('success');
        setTestMessage(`Connected to PRAMAAN backend! Active: ${json.session?.sessionId || 'None'}`);
        if (json.session?.sessionId) {
          setInputSessionId(json.session.sessionId);
        }
      } else {
        setTestStatus('failed');
        setTestMessage(`Server returned HTTP ${res.status}`);
      }
    } catch (err: any) {
      setTestStatus('failed');
      setTestMessage(`Cannot connect: ${err.message || 'Network error'}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#111C44] border border-slate-700/80 rounded-2xl p-5 shadow-2xl text-slate-100 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold text-white">Companion Settings</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Backend Host Config */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">
            Backend Server Address
          </label>
          <div className="relative">
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="Default: /api (Vite HTTPS Proxy)"
              className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <p className="text-[10.5px] text-slate-400">
            Leave empty for automatic HTTPS proxy (recommended), or enter custom URL.
          </p>
        </div>

        {/* Session ID */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">
            Target Session ID
          </label>
          <input
            type="text"
            value={inputSessionId}
            onChange={(e) => setInputSessionId(e.target.value)}
            placeholder="PRM-YYYYMMDD-XXXX"
            className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 uppercase"
          />
        </div>

        {/* Test Result */}
        {testStatus !== 'idle' && (
          <div
            className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
              testStatus === 'success'
                ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
                : testStatus === 'failed'
                ? 'bg-rose-950/60 border border-rose-500/40 text-rose-300'
                : 'bg-blue-950/60 border border-blue-500/40 text-blue-300'
            }`}
          >
            {testStatus === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />}
            {testStatus === 'testing' && <RefreshCw className="w-4 h-4 shrink-0 animate-spin text-blue-400" />}
            <span className="text-[11px] leading-tight break-all">{testMessage}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testStatus === 'testing'}
            className="flex-1 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
          >
            <Radio className="w-3.5 h-3.5 text-blue-400" />
            <span>Test Ping</span>
          </button>

          <button
            type="button"
            onClick={handleSaveApi}
            className="flex-1 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-sm transition-colors"
          >
            Save & Connect
          </button>
        </div>
      </div>
    </div>
  );
};
