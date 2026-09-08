import React from 'react';
import { Check, Clock, Radio } from 'lucide-react';

interface StatusTimelineProps {
  currentStage: number;
}

const STAGES = [
  { id: 1, name: 'Doc Upload', isGate: false },
  { id: 2, name: 'OCR Extraction', isGate: false },
  { id: 3, name: 'NFC Input (Phone)', isGate: true },
  { id: 4, name: 'Validation', isGate: false },
  { id: 5, name: 'Issuer Analysis', isGate: false },
  { id: 6, name: 'Face Input (Phone)', isGate: true },
  { id: 7, name: 'Evidence Fusion', isGate: false },
  { id: 8, name: 'Complete', isGate: false },
];

export const StatusTimeline: React.FC<StatusTimelineProps> = ({ currentStage }) => {
  return (
    <div className="bg-[#111C44]/80 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Pipeline Progress (8 Stages)
        </span>
        <span className="text-[11px] font-mono font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">
          Stage {currentStage} / 8
        </span>
      </div>

      <div className="grid grid-cols-8 gap-1 items-center">
        {STAGES.map((s) => {
          const isDone = s.id < currentStage || (currentStage === 8 && s.id === 8);
          const isCurrent = s.id === currentStage && currentStage !== 8;
          const isPending = s.id > currentStage;

          return (
            <div key={s.id} className="flex flex-col items-center">
              <div
                className={`w-full h-1.5 rounded-full transition-all duration-300 ${
                  isDone
                    ? 'bg-emerald-500'
                    : isCurrent
                    ? 'bg-blue-500 animate-pulse'
                    : 'bg-slate-800'
                }`}
              />
              <span
                className={`text-[8px] font-mono mt-1 ${
                  isCurrent
                    ? 'text-blue-300 font-bold'
                    : isDone
                    ? 'text-emerald-400'
                    : 'text-slate-600'
                }`}
              >
                {s.isGate ? `S${s.id}*` : `S${s.id}`}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
          <span className="text-slate-300 font-medium">
            {STAGES.find((s) => s.id === currentStage)?.name || 'Processing'}
          </span>
        </div>
        <span className="text-[9.5px] text-slate-500 italic">*Phone Gates (Stage 3 & 6)</span>
      </div>
    </div>
  );
};
