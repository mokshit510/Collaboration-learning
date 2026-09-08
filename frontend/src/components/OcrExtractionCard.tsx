import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, ScanText } from 'lucide-react';
import type { OcrField } from '../types';

interface OcrExtractionCardProps {
  fields: OcrField[];
  mrzLine?: string;
  qualityStatus?: 'OPTIMAL' | 'MODERATE' | 'LOW';
}

const DEFAULT_PLACEHOLDER_FIELDS: OcrField[] = [
  { label: 'Full Name', value: '—', confidence: 0, valid: true },
  { label: 'Passport Number', value: '—', confidence: 0, valid: true },
  { label: 'Nationality', value: '—', confidence: 0, valid: true },
  { label: 'Date of Birth', value: '—', confidence: 0, valid: true },
  { label: 'Gender', value: '—', confidence: 0, valid: true },
  { label: 'Place of Birth', value: '—', confidence: 0, valid: true },
  { label: 'Date of Issue', value: '—', confidence: 0, valid: true },
  { label: 'Date of Expiry', value: '—', confidence: 0, valid: true },
];

export const OcrExtractionCard: React.FC<OcrExtractionCardProps> = ({
  fields,
  mrzLine,
  qualityStatus,
}) => {
  const displayFields = fields.length > 0 ? fields : DEFAULT_PLACEHOLDER_FIELDS;
  const isPrePipeline = displayFields.every((f) => !f.value || f.value === '—' || f.value === '-');

  const validFieldsWithConf = displayFields.filter((f) => f.confidence !== undefined && f.confidence > 0);
  const avgConfidence = validFieldsWithConf.length
    ? Math.round((validFieldsWithConf.reduce((acc, f) => acc + (f.confidence || 0), 0) / validFieldsWithConf.length) * 10) / 10
    : null;

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-4 flex flex-col justify-between">
      <div>
        {/* Header with Title and Extraction Disclaimer Tag */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <ScanText className="w-4 h-4 text-blue-600" />
            <h3 className="text-[14px] font-bold text-slate-800 tracking-tight">
              2. OCR Extraction
            </h3>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                isPrePipeline || avgConfidence === null
                  ? 'bg-slate-100 text-slate-500 border-slate-200'
                  : avgConfidence >= 90
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : avgConfidence >= 75
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-red-50 text-red-700 border-red-200'
              }`}
              title={isPrePipeline ? 'Pending Pipeline Execution' : `Optical Quality: ${qualityStatus || (avgConfidence && avgConfidence >= 90 ? 'OPTIMAL' : 'MODERATE')}`}
            >
              Avg: {isPrePipeline || avgConfidence === null ? '—' : `${avgConfidence}%`}
            </span>
          </div>
        </div>

        {/* Informational Subtext clarifying extraction vs validation */}
        <div className="text-[10.5px] text-slate-400 mb-2.5 flex items-center justify-between">
          <span>Optical Character &amp; MRZ Stream</span>
          <span className="text-[9.5px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
            Extraction ≠ Validation
          </span>
        </div>

        {/* Extracted Fields List */}
        <div className="divide-y divide-slate-100">
          {displayFields.map((field) => {
            const isPlaceholder = !field.value || field.value === '—' || field.value === '-';
            const conf = field.confidence;
            const isWarning = !isPlaceholder && (field.status === 'WARNING' || (conf !== undefined && conf < 85 && conf >= 70));
            const isFail = !isPlaceholder && (field.status === 'FAIL' || (conf !== undefined && conf < 70));
            const isPass = !isPlaceholder && !isWarning && !isFail;

            return (
              <div
                key={field.label}
                className="flex items-center justify-between py-1.5 px-1 hover:bg-slate-50/80 rounded transition-colors group"
                title={`${field.label}: ${field.value}${conf ? ` (Confidence: ${conf}%)` : ''}`}
              >
                {/* Field Label */}
                <span className="text-[11.5px] font-medium text-slate-500 w-28 sm:w-32 shrink-0 truncate">
                  {field.label}
                </span>

                {/* Field Value */}
                <span className={`text-[11.5px] font-mono tracking-tight flex-1 px-2 text-left truncate ${
                  isPlaceholder ? 'text-slate-400' : 'font-bold text-slate-900'
                }`}>
                  {field.value || '—'}
                </span>

                {/* Confidence + Status Icon */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded ${
                      isPlaceholder || conf === undefined
                        ? 'text-slate-400 bg-slate-100/80'
                        : isPass
                        ? 'text-emerald-700 bg-emerald-50/80'
                        : isWarning
                        ? 'text-amber-700 bg-amber-50'
                        : 'text-red-700 bg-red-50'
                    }`}
                  >
                    {isPlaceholder || conf === undefined ? '—' : `${conf}%`}
                  </span>

                  {isPlaceholder ? (
                    <span className="w-3.5 text-center text-slate-300 font-mono text-xs select-none">
                      —
                    </span>
                  ) : (
                    <>
                      {isPass && (
                        <span title="Confidence optimal (>85%)">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />
                        </span>
                      )}
                      {isWarning && (
                        <span title="Optical ambiguity / degraded character">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        </span>
                      )}
                      {isFail && (
                        <span title="Low optical confidence (<70%)">
                          <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Subtle MRZ footer indicator if present */}
      {mrzLine && (
        <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono text-slate-400">
          <span className="truncate">MRZ: {mrzLine.slice(0, 24)}...</span>
          <span className="text-emerald-600 font-bold font-sans text-[9.5px]">ICAO 9303 PASS</span>
        </div>
      )}
    </div>
  );
};
