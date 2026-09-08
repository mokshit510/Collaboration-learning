import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Camera, Radio, Send } from 'lucide-react';
import type { DocumentData, PipelineStepStatus, FaceResult } from '../types';

interface FaceVerificationCardProps {
  data: DocumentData;
  faceResult?: FaceResult | null;
  stepStatus?: PipelineStepStatus;
  phoneConnected?: boolean;
  sessionId?: string;
  onRequestCapture?: () => void;
  onSimulateFace?: (mismatch?: boolean) => void;
}

export const FaceVerificationCard: React.FC<FaceVerificationCardProps> = ({
  data,
  faceResult,
  stepStatus,
  phoneConnected = false,
  sessionId = '',
  onRequestCapture,
  onSimulateFace,
}) => {
  const isWaiting = stepStatus === 'PROCESSING' && !faceResult?.livePhotoUrl;
  const hasCompleted =
    (stepStatus === 'COMPLETED' || stepStatus === 'WARNING' || stepStatus === 'FAILED') &&
    faceResult !== null &&
    faceResult !== undefined;

  const score = faceResult?.matchScore ?? 0;
  const isMatch = faceResult?.status === 'PASS';
  const isReview = faceResult?.status === 'REVIEW';
  const isFail = faceResult?.status === 'FAIL';
  const statusText = isMatch
    ? 'Faces match'
    : isReview
    ? 'Biometric review required'
    : isFail
    ? 'Facial mismatch'
    : 'Face verification not run';

  const livePhotoUrl = faceResult?.livePhotoUrl || (hasCompleted ? data.livePhotoUrl : undefined);

  return (
    <div
      className={`bg-white rounded-xl border transition-all duration-300 shadow-xs p-4 flex flex-col justify-between ${
        isWaiting
          ? 'border-blue-400 ring-2 ring-blue-100/80 bg-gradient-to-b from-blue-50/20 to-white'
          : 'border-slate-200/90'
      }`}
    >
      <div>
        {/* Title and Top Status */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-md bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Camera className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-[14px] font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
              <span>6. Face Input</span>
              <span className="text-blue-600 font-semibold text-xs">(From Phone)</span>
            </h3>
          </div>

          <div>
            {isWaiting ? (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full animate-pulse">
                <Radio className="w-3 h-3 text-blue-600 animate-ping" />
                <span>WAITING FOR LIVE PHOTO</span>
              </span>
            ) : hasCompleted ? (
              <span
                className={`text-[9.5px] font-mono font-bold px-2 py-0.5 rounded border ${
                  isMatch
                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                    : isReview
                    ? 'text-amber-700 bg-amber-50 border-amber-200'
                    : 'text-red-700 bg-red-50 border-red-200'
                }`}
              >
                {isMatch ? 'FACE MATCH' : isReview ? 'REVIEW REQUIRED' : 'FACE MISMATCH'}
              </span>
            ) : (
              <span className="text-[9.5px] font-mono font-bold px-2 py-0.5 rounded border text-slate-500 bg-slate-100 border-slate-200">
                Awaiting Pipeline
              </span>
            )}
          </div>
        </div>

        <div className="text-[10.5px] text-slate-400 mb-2.5">
          Biometric Facial Comparison • Document Portrait vs Live Mobile Capture Feed
        </div>

        {/* Connection & Session Bar */}
        <div className="flex items-center justify-between text-[11px] bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-1.5 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">PHONE DEVICE:</span>
            <div className="flex items-center gap-1 font-bold">
              <span
                className={`w-2 h-2 rounded-full ${
                  phoneConnected ? 'bg-emerald-500 shadow-xs shadow-emerald-500/50' : 'bg-slate-400'
                }`}
              />
              <span className={phoneConnected ? 'text-emerald-700' : 'text-slate-500'}>
                {phoneConnected ? 'Connected' : 'Waiting'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-slate-600">
            <span className="text-slate-400 text-[10px] uppercase font-semibold">Mobile Session:</span>
            <span className="font-mono font-bold text-slate-800 text-[11px] bg-white px-1.5 py-0.2 rounded border border-slate-200">
              {sessionId || 'PRM-20260908-1832'}
            </span>
          </div>
        </div>

        {/* WAITING STATE DISPLAY */}
        {isWaiting ? (
          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-blue-100/80 border border-blue-200 flex items-center justify-center text-blue-600 shadow-inner">
              <Camera className="w-6 h-6 animate-pulse" />
            </div>

            <div>
              <p className="text-xs font-bold text-slate-900">
                Face Verification Required
              </p>
              <p className="text-[11px] text-blue-700 font-medium mt-0.5">
                Waiting for live photo from mobile device.
              </p>
              <p className="text-[10px] text-slate-500 mt-1">
                Open camera on the connected phone or send capture request to initiate live facial selfie.
              </p>
            </div>

            {/* Action & Fallback Buttons */}
            <div className="pt-2 border-t border-blue-200/80 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={onRequestCapture}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs cursor-pointer transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Face Capture Request</span>
              </button>

              {onSimulateFace && (
                <div className="flex items-center gap-1.5 w-full justify-center mt-1">
                  <button
                    type="button"
                    onClick={() => onSimulateFace(false)}
                    className="px-2.5 py-1 text-[10.5px] font-semibold text-blue-700 bg-white hover:bg-blue-50 border border-blue-300 rounded shadow-2xs cursor-pointer transition-colors"
                  >
                    ⚡ Test Live Face (Match)
                  </button>
                  <button
                    type="button"
                    onClick={() => onSimulateFace(true)}
                    className="px-2.5 py-1 text-[10.5px] font-semibold text-amber-700 bg-white hover:bg-amber-50 border border-amber-300 rounded shadow-2xs cursor-pointer transition-colors"
                  >
                    ⚡ Test Live Face (Mismatch)
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Main Grid: Left Photos & Right Match Score Card */
          <div className="grid grid-cols-12 gap-3 items-center">
            {/* Left Side: Document Photo & Live Capture */}
            <div className="col-span-12 sm:col-span-7 flex items-center gap-2.5">
              {/* Document Photo */}
              <div className="flex-1 flex flex-col items-center">
                <div className="relative w-full aspect-square rounded-lg overflow-hidden border border-slate-300 shadow-2xs bg-slate-100">
                  {data.photoUrl ? (
                    <img
                      src={data.photoUrl}
                      alt="Document Portrait"
                      className="w-full h-full object-cover object-top"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50 p-2 text-center">
                      <Camera className="w-5 h-5 mb-1 text-slate-300" />
                      <span className="text-[9px]">Awaiting Doc</span>
                    </div>
                  )}
                  <div className="absolute top-1 left-1 bg-black/60 text-[8px] text-white px-1 py-0.5 rounded font-mono">
                    DOC
                  </div>
                </div>
                <span className="text-[10px] font-medium text-slate-500 mt-1">
                  Document Photo
                </span>
              </div>

              {/* Live Capture Photo */}
              <div className="flex-1 flex flex-col items-center">
                <div className="relative w-full aspect-square rounded-lg overflow-hidden border border-slate-300 shadow-2xs bg-slate-100">
                  {livePhotoUrl ? (
                    <img
                      src={livePhotoUrl}
                      alt="Live Mobile Checkpoint Capture"
                      className="w-full h-full object-cover object-top"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50 p-2 text-center">
                      <Camera className="w-5 h-5 mb-1 text-slate-300" />
                      <span className="text-[9px]">Awaiting Feed</span>
                    </div>
                  )}
                  {livePhotoUrl && (
                    <div className="absolute top-1 right-1 flex items-center gap-1 bg-red-600 text-[8px] text-white px-1 py-0.5 rounded font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                      LIVE
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-medium text-slate-500 mt-1">
                  Live Phone Feed
                </span>
              </div>
            </div>

            {/* Right Side: Face Match Score Card OR Empty State */}
            {hasCompleted ? (
              <div
                className={`col-span-12 sm:col-span-5 h-full flex flex-col justify-center rounded-xl p-3 text-center border ${
                  isMatch
                    ? 'bg-[#EDF7EE] border-emerald-200/80 text-emerald-800'
                    : isReview
                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                <div className="text-[10.5px] font-bold tracking-tight">
                  Biometric Match
                </div>

                <div
                  className={`text-[28px] font-extrabold leading-tight my-0.5 font-mono tracking-tight ${
                    isMatch
                      ? 'text-[#16A34A]'
                      : isReview
                      ? 'text-amber-600'
                      : 'text-[#DC2626]'
                  }`}
                >
                  {score}%
                </div>

                <div className="inline-flex items-center justify-center gap-1 text-[10px] font-bold">
                  {isMatch && <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />}
                  {isReview && <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
                  {isFail && <XCircle className="w-3.5 h-3.5 text-[#DC2626]" />}
                  <span className="truncate">{statusText}</span>
                </div>
              </div>
            ) : (
              <div className="col-span-12 sm:col-span-5 h-full flex flex-col justify-center items-center rounded-xl p-3 text-center border border-slate-200 bg-slate-50/80">
                <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 mb-1 shadow-2xs">
                  <Camera className="w-4 h-4 text-slate-400" />
                </div>
                <div className="text-[11.5px] font-bold text-slate-700 leading-snug">
                  Awaiting pipeline execution
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Face verification not run
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FaceVerificationCard;
