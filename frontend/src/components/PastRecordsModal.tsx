import React, { useState } from 'react';
import { X, FileText, Search, Clock, MapPin, User } from 'lucide-react';
import type { VerificationRecord } from '../types';
import { RecordsStorage } from '../services/recordsStorage';

interface PastRecordsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRecord?: (record: VerificationRecord) => void;
}

export const PastRecordsModal: React.FC<PastRecordsModalProps> = ({
  isOpen,
  onClose,
  onSelectRecord,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState<'ALL' | 'LOW' | 'MEDIUM' | 'HIGH'>('ALL');

  if (!isOpen) return null;

  const records = RecordsStorage.getRecords();

  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      r.holderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.maskedDocumentNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.verificationId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.location.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesLevel = filterLevel === 'ALL' || r.riskLevel === filterLevel;
    return matchesSearch && matchesLevel;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-[#071A2F] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-600/30 border border-blue-500/40 text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight text-white">
                Archived Verification Records &amp; Dossiers
              </h3>
              <p className="text-xs text-slate-400">
                Tamper-evident record repository with masked PII for border screening history
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

        {/* Filter Controls */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by holder name, ID, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
            {(['ALL', 'LOW', 'MEDIUM', 'HIGH'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setFilterLevel(lvl)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                  filterLevel === lvl
                    ? 'bg-[#0B213A] text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Records Table */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredRecords.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              No verification records match your query.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {filteredRecords.map((r) => (
                <div
                  key={r.verificationId}
                  onClick={() => onSelectRecord && onSelectRecord(r)}
                  className="p-4 bg-white hover:bg-slate-50/90 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs cursor-pointer group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">
                        {r.verificationId}
                      </span>
                      <span className="font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        {r.maskedDocumentNumber}
                      </span>
                      <span
                        className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                          r.riskLevel === 'HIGH'
                            ? 'bg-red-100 text-red-700'
                            : r.riskLevel === 'MEDIUM'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {r.riskLevel} ({r.riskScore}/100)
                      </span>
                      <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                        {r.status}
                      </span>
                    </div>

                    <div className="text-slate-800 font-semibold text-xs">
                      Holder: {r.holderName} • Type: <span className="capitalize">{r.documentType}</span>
                    </div>

                    <div className="flex items-center gap-4 text-slate-400 text-[11px]">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(r.timestamp).toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {r.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        {r.investigator}
                      </span>
                    </div>
                  </div>

                  <div className="sm:text-right shrink-0">
                    <div className="text-[11px] font-medium text-slate-500">
                      {r.keyFindings[0] || r.evidenceSummary}
                    </div>
                    <span className="text-[11px] font-bold text-blue-600 hover:underline mt-1 block">
                      Inspect Dossier →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>Total Records: {records.length}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#0B213A] hover:bg-[#132F52] text-white rounded-lg font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
