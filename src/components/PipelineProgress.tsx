import React from 'react';
import { Play, RotateCcw } from 'lucide-react';

interface PipelineProgressProps {
  currentStep: number;
  processingTime: string;
  isSimulating: boolean;
  onStartSimulation: () => void;
  onStepClick?: (stepNumber: number) => void;
}

export const PipelineProgress: React.FC<PipelineProgressProps> = ({
  currentStep,
  processingTime,
  isSimulating,
  onStartSimulation,
  onStepClick,
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

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
      {/* 8-Stage Step Timeline */}
      <div className="flex-1 w-full flex items-center justify-between relative select-none">
        {steps.map((step, idx) => {
          const isCompleted = currentStep > step.number || (currentStep === 8 && step.number === 8);
          const isCurrent = currentStep === step.number && currentStep !== 8;


          return (
            <React.Fragment key={step.number}>
              {/* Step Node & Label */}
              <div
                onClick={() => onStepClick && onStepClick(step.number)}
                className="flex flex-col items-center relative z-10 cursor-pointer group"
              >
                {/* Circle Indicator */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    isCompleted
                      ? 'bg-[#16A34A] text-white shadow-xs'
                      : isCurrent
                      ? 'bg-[#1677E8] text-white ring-4 ring-blue-100 shadow-sm animate-pulse-ring'
                      : 'bg-[#E2E8F0] text-slate-500 hover:bg-slate-300'
                  }`}
                >
                  {isCompleted ? (
                    <span className="text-[11px] font-extrabold">{step.number}</span>
                  ) : (
                    step.number
                  )}
                </div>

                {/* Step Label below */}
                <span
                  className={`mt-1.5 text-[11px] whitespace-nowrap transition-colors duration-150 ${
                    isCurrent
                      ? 'font-bold text-[#1677E8]'
                      : isCompleted
                      ? 'font-medium text-slate-700'
                      : 'font-normal text-slate-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {/* Connecting Line between steps */}
              {idx < steps.length - 1 && (
                <div className="flex-1 h-[2px] mx-1 -mt-4 relative bg-slate-200 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      currentStep > step.number
                        ? 'bg-[#16A34A] w-full'
                        : currentStep === step.number
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
          title="Run sequential verification simulation"
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
