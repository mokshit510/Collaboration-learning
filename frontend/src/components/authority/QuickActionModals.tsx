import React, { useState } from 'react';
import { X, UserPlus, ShieldAlert, FileDown, Settings } from 'lucide-react';

interface QuickActionModalProps {
  type: 'add_investigator' | 'manage_watchlist' | 'generate_report' | 'system_settings' | null;
  onClose: () => void;
  onSuccessToast?: (msg: string) => void;
}

export const QuickActionModals: React.FC<QuickActionModalProps> = ({
  type,
  onClose,
  onSuccessToast,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    checkpoint: 'Delhi (IGI)',
    clearanceLevel: 'Level 2',
    watchlistId: '',
    watchlistReason: '',
    reportRange: 'Last 7 Days',
    reportFormat: 'PDF',
  });

  if (!type) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (type === 'add_investigator') {
      onSuccessToast?.(`Investigator ${formData.name || 'New Officer'} commissioned to ${formData.checkpoint}.`);
    } else if (type === 'manage_watchlist') {
      onSuccessToast?.(`Entry added to National Security Watchlist.`);
    } else if (type === 'generate_report') {
      onSuccessToast?.(`PRAMAAN Executive Summary generated (${formData.reportFormat}).`);
    } else {
      onSuccessToast?.(`Authority system configurations updated.`);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden text-slate-800 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-[#071A2F] text-white p-5 flex items-center justify-between border-b border-[#0D243F]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-400/40 flex items-center justify-center text-cyan-300">
              {type === 'add_investigator' && <UserPlus className="w-5 h-5" />}
              {type === 'manage_watchlist' && <ShieldAlert className="w-5 h-5" />}
              {type === 'generate_report' && <FileDown className="w-5 h-5" />}
              {type === 'system_settings' && <Settings className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {type === 'add_investigator' && 'Commission New Investigator'}
                {type === 'manage_watchlist' && 'National Watchlist Entry'}
                {type === 'generate_report' && 'Generate Verification Report'}
                {type === 'system_settings' && 'Authority System Settings'}
              </h3>
              <p className="text-xs text-slate-400">PRAMAAN Authority Console (Simulated)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {type === 'add_investigator' && (
            <>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Officer Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Suresh Kumar"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assigned Checkpoint</label>
                <select
                  value={formData.checkpoint}
                  onChange={(e) => setFormData({ ...formData, checkpoint: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option>Delhi (IGI) Airport — Terminal 3</option>
                  <option>Mumbai International Airport</option>
                  <option>Kolkata Immigration Hub</option>
                  <option>Chennai Seaport Terminal</option>
                  <option>Bengaluru Border Post</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Security Clearance</label>
                <select
                  value={formData.clearanceLevel}
                  onChange={(e) => setFormData({ ...formData, clearanceLevel: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option>Level 1 — Primary Screener</option>
                  <option>Level 2 — Senior Inspector</option>
                  <option>Level 3 — Forensic Specialist</option>
                </select>
              </div>
            </>
          )}

          {type === 'manage_watchlist' && (
            <>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Document / Passport Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Z9923841"
                  value={formData.watchlistId}
                  onChange={(e) => setFormData({ ...formData, watchlistId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono uppercase"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Alert Category</label>
                <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option>Document Tampering Recidivism</option>
                  <option>Interpol Red Notice</option>
                  <option>Visa Overstay / Revocation</option>
                  <option>Identity Theft Suspect</option>
                </select>
              </div>
            </>
          )}

          {type === 'generate_report' && (
            <>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reporting Period</label>
                <select
                  value={formData.reportRange}
                  onChange={(e) => setFormData({ ...formData, reportRange: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option>Last 24 Hours</option>
                  <option>Last 7 Days (Default)</option>
                  <option>Last 30 Days</option>
                  <option>Fiscal Year-to-Date</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Export Format</label>
                <div className="flex gap-3 mt-1">
                  {['PDF', 'Excel (CSV)', 'Forensic JSON'].map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setFormData({ ...formData, reportFormat: fmt })}
                      className={`flex-1 py-2 rounded-lg border text-xs font-semibold ${
                        formData.reportFormat === fmt
                          ? 'bg-blue-50 border-blue-500 text-blue-700'
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {type === 'system_settings' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <div className="font-semibold text-slate-900">Automated Forensic Escalation</div>
                  <div className="text-[11px] text-slate-500">Auto-flag cases with risk score &gt; 80</div>
                </div>
                <input type="checkbox" defaultChecked className="w-4 h-4 accent-blue-600" />
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <div className="font-semibold text-slate-900">Real-Time Checkpoint Sync</div>
                  <div className="text-[11px] text-slate-500">Push live alerts to border officer terminals</div>
                </div>
                <input type="checkbox" defaultChecked className="w-4 h-4 accent-blue-600" />
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
            >
              Confirm Action
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
