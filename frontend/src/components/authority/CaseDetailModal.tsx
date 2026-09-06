import React from 'react';
import { X, ShieldAlert, User, MapPin, FileText, AlertTriangle } from 'lucide-react';
import type { HighRiskCase } from '../../types/authority';

interface CaseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseItem: HighRiskCase | null;
}

export const CaseDetailModal: React.FC<CaseDetailModalProps> = ({
  isOpen,
  onClose,
  caseItem,
}) => {
  if (!isOpen || !caseItem) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden text-slate-800 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-[#071A2F] text-white p-5 flex items-center justify-between border-b border-[#0D243F]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-600/20 border border-red-500/50 flex items-center justify-center text-red-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Case Inspection Record</h3>
                <span className="text-xs bg-red-950/80 border border-red-500/40 text-red-300 font-mono px-2 py-0.5 rounded">
                  {caseItem.id}
                </span>
              </div>
              <p className="text-xs text-slate-400">Authority Verification & Forensic Review</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Top Summary Banner */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <div>
              <span className="text-xs text-slate-400 font-medium">Passenger Name</span>
              <div className="text-base font-bold text-slate-900">{caseItem.name}</div>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 font-medium">Risk Score</span>
              <div className="text-xl font-extrabold text-red-600 leading-none mt-0.5">
                {caseItem.riskScore}/100
              </div>
            </div>
          </div>

          {/* Grid Details */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-200/60">
              <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                <FileText className="w-3.5 h-3.5" />
                <span className="font-semibold">Document Type</span>
              </div>
              <span className="text-slate-900 font-medium">{caseItem.documentType}</span>
            </div>

            <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-200/60">
              <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span className="font-semibold">Primary Anomaly</span>
              </div>
              <span className="text-red-700 font-semibold">{caseItem.reason}</span>
            </div>

            <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-200/60">
              <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                <MapPin className="w-3.5 h-3.5" />
                <span className="font-semibold">Checkpoint</span>
              </div>
              <span className="text-slate-900 font-medium">{caseItem.checkpoint || 'Delhi (IGI)'}</span>
            </div>

            <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-200/60">
              <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                <User className="w-3.5 h-3.5" />
                <span className="font-semibold">Assigned Officer</span>
              </div>
              <span className="text-slate-900 font-medium">{caseItem.assignedTo || 'Anita Sharma (INV-001)'}</span>
            </div>
          </div>

          {/* Forensic Description */}
          <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs leading-relaxed">
            <div className="flex items-center gap-1.5 font-bold mb-1 text-amber-950">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Forensic Analysis Summary</span>
            </div>
            <p className="text-slate-700">
              {caseItem.details || 'Document exhibits significant digital artifacting, font variance, and structural deviation from official issuer templates.'}
            </p>
          </div>

          {/* Simulated Disclaimer */}
          <div className="text-[11px] text-slate-400 bg-slate-50 p-2.5 rounded-lg text-center border border-slate-200">
            * Simulated case data for academic and hackathon prototype demonstration only.
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors"
          >
            Close
          </button>
          <button
            onClick={() => {
              alert(`Escalation order broadcast to Checkpoint Officer for Case ${caseItem.id}.`);
              onClose();
            }}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
          >
            Escalate to Checkpoint
          </button>
        </div>
      </div>
    </div>
  );
};
