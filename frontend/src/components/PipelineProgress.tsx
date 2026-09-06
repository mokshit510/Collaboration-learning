import React from 'react';
import { Play, RotateCcw, AlertTriangle, XCircle, Check } from 'lucide-react';
import type { PipelineStepStatus } from '../types';

interface PipelineProgressProps {
  currentStep: number;
  processingTime: string;
  isSimulating: boolean;
  onStartSimulation: () => void;
  onStepClick?: (stepNumber: number) => void;
  stepStates?: Record<number, PipelineStepStatus>;
  stepMessages?: Record<number, string>;
}

export const PipelineProgress: React.FC<PipelineProgressProps> = ({
  currentStep,
  processingTime,
  isSimulating,
  onStartSimulation,
  onStepClick,
  stepStates,
  stepMessages,
}) => {
  const steps = [
    { number: 1, label: 'Document Upload' },
    { number: 2, label: 'OCR Extraction' },
    { number: 3, label: 'Validation' },
    { number: 4, label: 'Issuer Verification' },
    { number: 5, label: 'Tampering Analysis' },
    { number: 6, label: 'Face Verification' },
    { number: 7, label: 'Risk Assessment' },
    { number: 8, label: 'Complete' },
  ];

  const getStepStatus = (stepNumber: number): PipelineStepStatus => {
    if (stepStates && stepStates[stepNumber]) {
      return stepStates[stepNumber];
    }
    // Fallback based on currentStep
    if (currentStep > stepNumber || (currentStep === 8 && stepNumber === 8)) {
      return 'COMPLETED';
    }
    if (currentStep === stepNumber && isSimulating) {
      return 'PROCESSING';
    }
    if (currentStep === stepNumber) {
      return 'COMPLETED';
    }
    return 'NOT_STARTED';
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
      {/* 8-Stage Step Timeline */}
      <div className="flex-1 w-full flex items-center justify-between relative select-none">
        {steps.map((step, idx) => {
          const status = getStepStatus(step.number);
          const isCurrent = currentStep === step.number;
          const customMsg = stepMessages?.[step.number];

          // Determine circle styling based on data-driven state
          let circleClass = 'bg-[#E2E8F0] text-slate-500 hover:bg-slate-300';
          let iconContent: React.ReactNode = step.number;

          if (status === 'COMPLETED') {
            circleClass = 'bg-[#16A34A] text-white shadow-xs';
            iconContent = <Check className="w-3.5 h-3.5 stroke-[3]" />;
          } else if (status === 'WARNING') {
            circleClass = 'bg-amber-500 text-white shadow-xs ring-2 ring-amber-200';
            iconContent = <AlertTriangle className="w-3.5 h-3.5" />;
          } else if (status === 'FAILED') {
            circleClass = 'bg-[#DC2626] text-white shadow-xs ring-2 ring-red-200';
            iconContent = <XCircle className="w-3.5 h-3.5" />;
          } else if (status === 'PROCESSING' || isCurrent) {
            circleClass = 'bg-[#1677E8] text-white ring-4 ring-blue-100 shadow-sm animate-pulse';
            iconContent = <span className="font-extrabold">{step.number}</span>;
          }

          return (
            <React.Fragment key={step.number}>
              {/* Step Node & Label */}
              <div
                onClick={() => onStepClick && onStepClick(step.number)}
                className="flex flex-col items-center relative z-10 cursor-pointer group"
                title={customMsg || `${step.label} (${status})`}
              >
                {/* Circle Indicator */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${circleClass}`}
                >
                  {iconContent}
                </div>

                {/* Step Label below */}
                <span
                  className={`mt-1.5 text-[11px] whitespace-nowrap transition-colors duration-150 ${
                    isCurrent
                      ? 'font-bold text-[#1677E8]'
                      : status === 'COMPLETED'
                      ? 'font-medium text-slate-700'
                      : status === 'WARNING'
                      ? 'font-semibold text-amber-700'
                      : status === 'FAILED'
                      ? 'font-bold text-red-600'
                      : 'font-normal text-slate-400'
                  }`}
                >
                  {step.label}
                </span>

                {/* Micro Sub-status badge if warning/failed */}
                {status === 'WARNING' && (
                  <span className="text-[8px] font-bold text-amber-600 bg-amber-50 px-1 rounded border border-amber-200 mt-0.5 leading-none">
                    REVIEW
                  </span>
                )}
                {status === 'FAILED' && (
                  <span className="text-[8px] font-bold text-red-600 bg-red-50 px-1 rounded border border-red-200 mt-0.5 leading-none">
                    ALERT
                  </span>
                )}
              </div>

              {/* Connecting Line between steps */}
              {idx < steps.length - 1 && (
                <div className="flex-1 h-[2px] mx-1 -mt-4 relative bg-slate-200 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      status === 'COMPLETED' || currentStep > step.number
                        ? 'bg-[#16A34A] w-full'
                        : status === 'WARNING'
                        ? 'bg-amber-400 w-full'
                        : status === 'FAILED'
                        ? 'bg-red-500 w-full'
                        : isCurrent
                        ? 'bg-[#1677E8] w-1/2 animate-pulse'
                        : 'w-0'
                    }`}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Right Side: Processing Time & Simulation Action */}
      <div className="flex items-center gap-4 shrink-0 pl-4 md:border-l border-slate-200 w-full md:w-auto justify-between md:justify-end">
        <div className="text-right leading-tight">
          <div className="text-[11px] font-medium text-slate-400">Processing Time</div>
          <div className="text-[15px] font-bold text-slate-800 tracking-tight font-mono">
            {processingTime}
          </div>
        </div>

        {/* Start / Re-run Simulation Button */}
        <button
          onClick={onStartSimulation}
          disabled={isSimulating}
          title="Run sequential verification pipeline"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
        >
          {isSimulating ? (
            <>
              <RotateCcw className="w-3.5 h-3.5 animate-spin text-blue-600" />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current text-blue-600" />
              <span>Run Pipeline</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
