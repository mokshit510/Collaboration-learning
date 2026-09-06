import React from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import type { DocumentData } from '../types';
import { PassportDocumentView } from './PassportDocumentView';

interface TamperingAnalysisCardProps {
  data: DocumentData;
  onInspectElement?: (id: string) => void;
}

export const TamperingAnalysisCard: React.FC<TamperingAnalysisCardProps> = ({
  data,
  onInspectElement,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-4">
      {/* Title */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[14px] font-bold text-slate-800 tracking-tight">
          5. Tampering Analysis <span className="text-blue-600 font-semibold">(AI)</span>
        </h3>
        <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
          <ShieldAlert className="w-3 h-3 text-red-600" />
          <span>4 Anomalies</span>
        </span>
      </div>

      {/* Main Content: Left Document Overlay Preview & Right Suspicious Elements */}
      <div className="grid grid-cols-12 gap-3 items-center">
        {/* Left: Document Overlay Thumbnail */}
        <div className="col-span-12 sm:col-span-5 relative group cursor-pointer">
          <PassportDocumentView data={data} showTamperOverlay={true} compact={true} />
          <div className="absolute bottom-1 right-1 bg-black/75 text-[8px] text-white px-1.5 py-0.5 rounded font-mono font-medium backdrop-blur-xs">
            Forensic BBox
          </div>
        </div>

        {/* Right: Suspicious Elements List */}
        <div className="col-span-12 sm:col-span-7 space-y-2">
          <div className="text-[11px] font-extrabold uppercase tracking-wide text-[#DC2626] mb-1">
            Suspicious Elements Detected
          </div>

          <div className="space-y-1.5">
            {data.suspiciousElements.map((elem) => (
              <div
                key={elem.id}
                onClick={() => onInspectElement && onInspectElement(elem.id)}
                className="flex items-start gap-2 p-1.5 rounded-lg bg-red-50/40 hover:bg-red-50 border border-red-100/80 transition-colors cursor-pointer group"
              >
                {/* Warning Icon */}
                <AlertTriangle className="w-3.5 h-3.5 text-[#DC2626] shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />

                {/* Title and Confidence Level */}
                <div className="leading-tight">
                  <div className="text-[11px] font-bold text-slate-800 group-hover:text-red-700 transition-colors">
                    {elem.title}
                  </div>
                  <div className="text-[9.5px] text-slate-500 font-medium">
                    {elem.confidenceLevel}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
