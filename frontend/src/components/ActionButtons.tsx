import React from 'react';
import { Save, Flag, RotateCcw, Check } from 'lucide-react';
import type { InvestigationStatus } from '../types';

interface ActionButtonsProps {
  investigationStatus: InvestigationStatus;
  onSaveToRecords: () => void;
  onFlagForInvestigation: () => void;
  onClear: () => void;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  investigationStatus,
  onSaveToRecords,
  onFlagForInvestigation,
  onClear,
}) => {
  const isFlagged = investigationStatus === 'flagged';
  const isSaved = investigationStatus === 'saved';

  return (
    <div className="flex items-center gap-2.5 shrink-0">
      {/* 1. Save to Records */}
      <button
        onClick={onSaveToRecords}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
          isSaved
            ? 'bg-emerald-700 text-white'
            : 'bg-[#0B213A] hover:bg-[#132F52] text-white active:scale-98'
        }`}
      >
        {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
        <span>{isSaved ? 'Saved to Records' : 'Save to Records'}</span>
      </button>

      {/* 2. Flag for Investigation (Dominant Visual Weight) */}
      <button
        onClick={onFlagForInvestigation}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all shadow-sm cursor-pointer ${
          isFlagged
            ? 'bg-red-800 text-white ring-2 ring-red-400 ring-offset-1'
            : 'bg-[#DC2626] hover:bg-[#B91C1C] text-white active:scale-98 hover:shadow-md'
        }`}
      >
        <Flag className="w-4 h-4 fill-white" />
        <span>{isFlagged ? 'FLAGGED FOR INVESTIGATION' : 'Flag for Investigation'}</span>
      </button>

      {/* 3. Clear */}
      <button
        onClick={onClear}
        className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 transition-colors shadow-2xs cursor-pointer active:scale-98"
      >
        <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
        <span>Clear</span>
      </button>
    </div>
  );
};
