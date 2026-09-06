import React from 'react';
import { AlertTriangle, ShieldAlert, CheckCircle2, Cpu } from 'lucide-react';
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
  const anomaliesCount = data.suspiciousElements?.length || 0;
  const isTampered = anomaliesCount > 0 || data.riskScore > 50;

  // Approximate tampering score (or derive from data)
  const tamperingScore = isTampered ? Math.max(data.riskScore, 75) : 8;
  const verdict =
    tamperingScore >= 60
      ? 'EVIDENT_TAMPERING'
      : tamperingScore >= 30
      ? 'LOW_TAMPERING_SUSPICION'
      : 'NO_TAMPERING_DETECTED';

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-4 flex flex-col justify-between">
      <div>
        {/* Title and Top Status Badge */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-blue-600" />
            <h3 className="text-[14px] font-bold text-slate-800 tracking-tight">
              5. Tampering Analysis <span className="text-blue-600 font-semibold">(AI Forensics)</span>
            </h3>
          </div>

          <div className="flex items-center gap-1.5">
            <span
              className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border ${
                anomaliesCount > 0
                  ? 'text-red-700 bg-red-50 border-red-200'
                  : 'text-emerald-700 bg-emerald-50 border-emerald-200'
              }`}
            >
              {anomaliesCount > 0 ? (
                <>
                  <ShieldAlert className="w-3 h-3 text-red-600" />
                  <span>{anomaliesCount} {anomaliesCount === 1 ? 'Anomaly' : 'Anomalies'}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Surface Clean</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Sub-bar: Score, Verdict & Simulation Disclaimer */}
        <div className="flex items-center justify-between text-[10px] bg-slate-50 border border-slate-200/70 rounded-lg px-2.5 py-1 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Tamper Score:</span>
            <span
              className={`font-mono font-bold ${
                tamperingScore >= 60
                  ? 'text-red-600'
                  : tamperingScore >= 30
                  ? 'text-amber-600'
                  : 'text-emerald-600'
              }`}
            >
              {tamperingScore}/100
            </span>
            <span className="text-slate-300">•</span>
            <span className="font-mono text-[9px] font-semibold text-slate-600">
              {verdict}
            </span>
          </div>

          {/* Mandatory User Requirement: Mark clearly as simulated if no real model connected */}
          <span className="text-[8.5px] font-bold tracking-wider uppercase text-blue-700 bg-blue-100/70 px-1.5 py-0.2 rounded">
            DEMO / SIMULATED ANALYSIS
          </span>
        </div>

        {/* Main Content: Left Document Overlay Preview & Right Suspicious Elements */}
        <div className="grid grid-cols-12 gap-3 items-center">
          {/* Left: Document Overlay Thumbnail */}
          <div className="col-span-12 sm:col-span-5 relative group cursor-pointer">
            <PassportDocumentView
              data={data}
              showTamperOverlay={anomaliesCount > 0}
              compact={true}
            />
            <div className="absolute bottom-1 right-1 bg-black/75 text-[8px] text-white px-1.5 py-0.5 rounded font-mono font-medium backdrop-blur-xs">
              {anomaliesCount > 0 ? 'Forensic BBox' : 'Scan Geometry OK'}
            </div>
          </div>

          {/* Right: Suspicious Elements List or Clean State */}
          <div className="col-span-12 sm:col-span-7 space-y-1.5">
            {anomaliesCount > 0 ? (
              <>
                <div className="text-[10.5px] font-extrabold uppercase tracking-wide text-[#DC2626] mb-1">
                  Suspicious Elements Detected
                </div>

                <div className="space-y-1.5 max-h-[145px] overflow-y-auto pr-0.5">
                  {data.suspiciousElements.map((elem) => (
                    <div
                      key={elem.id}
                      onClick={() => onInspectElement && onInspectElement(elem.id)}
                      className="flex items-start gap-2 p-1.5 rounded-lg bg-red-50/50 hover:bg-red-50 border border-red-100/90 transition-colors cursor-pointer group"
                    >
                      {/* Warning Icon */}
                      <AlertTriangle className="w-3.5 h-3.5 text-[#DC2626] shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />

                      {/* Title and Confidence Level */}
                      <div className="leading-tight flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10.5px] font-bold text-slate-800 group-hover:text-red-700 transition-colors truncate">
                            {elem.title}
                          </span>
                          <span
                            className={`text-[8.5px] font-bold uppercase px-1 py-0.2 rounded shrink-0 ${
                              elem.severity === 'high'
                                ? 'bg-red-200/80 text-red-800'
                                : elem.severity === 'medium'
                                ? 'bg-amber-200/80 text-amber-800'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {elem.severity}
                          </span>
                        </div>
                        <div className="text-[9px] text-slate-500 font-medium truncate mt-0.5">
                          {elem.confidenceLevel} {elem.location ? `• ${elem.location}` : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              /* Clean State for Genuine Documents */
              <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-lg text-center space-y-1">
                <div className="inline-flex p-1.5 rounded-full bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="text-[11px] font-bold text-emerald-800">
                  No Tampering Detected
                </div>
                <p className="text-[9.5px] text-emerald-700/90 leading-tight">
                  Surface grid, font kerning, guilloche pattern, and JPEG compression boundaries verified coherent.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
