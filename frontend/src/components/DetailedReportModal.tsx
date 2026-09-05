import React from 'react';
import { X, ShieldAlert, Printer, AlertTriangle, FileText } from 'lucide-react';
import type { DocumentData } from '../types';

import { PassportDocumentView } from './PassportDocumentView';

interface DetailedReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: DocumentData;
}

export const DetailedReportModal: React.FC<DetailedReportModalProps> = ({
  isOpen,
  onClose,
  data,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#071A2F] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-600/30 border border-red-500/40 text-red-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight text-white">
                  Investigative Forensic Dossier — Case #{data.documentNumber}-2026
                </h3>
                <span className="text-[10px] uppercase font-bold bg-red-600 text-white px-2 py-0.5 rounded">
                  {data.riskLevel} ({data.riskScore}/100)
                </span>
              </div>
              <p className="text-xs text-slate-400">
                PRAMAAN Automated Risk Assessment &amp; Forensics Engine
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-800">
          {/* Top Info Banner */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-400 font-medium block">Document Holder</span>
              <span className="font-bold text-slate-900 text-sm">{data.holderName}</span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Document Number</span>
              <span className="font-mono font-bold text-slate-900 text-sm">{data.documentNumber}</span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Checkpoint / Station</span>
              <span className="font-medium text-slate-900">SSB Checkpoint A-14</span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Analysis Timestamp</span>
              <span className="font-mono text-slate-700">05-SEP-2026 19:15:30 IST</span>
            </div>
          </div>

          {/* Section 1: Visual Forensics Overlay */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Forensic Tamper Detection Map</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div className="max-w-md mx-auto w-full">
                <PassportDocumentView data={data} showTamperOverlay={true} />
              </div>
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-700">Detected Anomalies Breakdown:</div>
                <div className="space-y-2">
                  {data.suspiciousElements.map((elem) => (
                    <div key={elem.id} className="p-2.5 rounded-lg border border-red-200 bg-red-50/50 text-xs">
                      <div className="flex items-center justify-between font-bold text-red-700">
                        <span className="flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {elem.title}
                        </span>
                        <span className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-red-300">
                          {elem.confidenceLevel}
                        </span>
                      </div>
                      <p className="text-slate-600 mt-1 leading-snug">{elem.description}</p>
                      {elem.location && (
                        <span className="text-[10px] font-mono text-slate-500 mt-0.5 block">
                          Region: {elem.location}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Risk Contributors Table */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Risk Engine Scoring Contribution Matrix
            </h4>
            <div className="rounded-xl border border-slate-200 overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Component / Vector</th>
                    <th className="p-3">Weight Points</th>
                    <th className="p-3">Observation Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {data.riskContributors.map((c) => (
                    <tr key={c.category} className="hover:bg-slate-50">
                      <td className="p-3 font-sans font-semibold text-slate-800">{c.category}</td>
                      <td className="p-3">
                        <span
                          className={`font-bold px-2 py-0.5 rounded ${
                            c.points > 20
                              ? 'bg-red-100 text-red-700'
                              : c.points > 0
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          +{c.points}
                        </span>
                      </td>
                      <td className="p-3 font-sans text-slate-600">{c.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: MRZ Checksum Verification */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              ICAO Document 9303 Checksum Validations
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                <span className="text-[10px] text-emerald-800 font-bold block">Document No Checksum</span>
                <span className="font-mono font-bold text-emerald-700">Digit '7' — Valid [OK]</span>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                <span className="text-[10px] text-emerald-800 font-bold block">DOB Checksum</span>
                <span className="font-mono font-bold text-emerald-700">Digit '8' — Valid [OK]</span>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                <span className="text-[10px] text-emerald-800 font-bold block">Expiry Checksum</span>
                <span className="font-mono font-bold text-emerald-700">Digit '7' — Valid [OK]</span>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                <span className="text-[10px] text-emerald-800 font-bold block">Composite Checksum</span>
                <span className="font-mono font-bold text-emerald-700">Matched [OK]</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-400">
            Confidential • Law Enforcement Use Only
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 transition-colors shadow-2xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Dossier</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-[#0B213A] hover:bg-[#132F52] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              Close Dossier
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
