import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, UserCheck } from 'lucide-react';
import type { DocumentData } from '../types';

interface FaceVerificationCardProps {
  data: DocumentData;
}

export const FaceVerificationCard: React.FC<FaceVerificationCardProps> = ({ data }) => {
  const isMatch = data.faceMatchScore >= 80;
  const isReview = data.faceMatchScore >= 65 && data.faceMatchScore < 80;
  const isFail = data.faceMatchScore < 65;

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-4 flex flex-col justify-between">
      <div>
        {/* Title */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-blue-600" />
            <h3 className="text-[14px] font-bold text-slate-800 tracking-tight">
              6. Face Verification
            </h3>
          </div>
          <span className="text-[9.5px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
            Liveness: PASS
          </span>
        </div>

        <div className="text-[10.5px] text-slate-400 mb-2.5">
          Biometric Facial Comparison • Document Portrait vs Live Optical Feed
        </div>

        {/* Main Grid: Left Photos & Right Match Score Card */}
        <div className="grid grid-cols-12 gap-3 items-center">
          {/* Left Side: Document Photo & Live Capture */}
          <div className="col-span-12 sm:col-span-7 flex items-center gap-2.5">
            {/* Document Photo */}
            <div className="flex-1 flex flex-col items-center">
              <div className="relative w-full aspect-square rounded-lg overflow-hidden border border-slate-300 shadow-2xs bg-slate-100">
                <img
                  src={data.photoUrl}
                  alt="Document Portrait"
                  className="w-full h-full object-cover object-top"
                />
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
                <img
                  src={data.livePhotoUrl}
                  alt="Live Checkpoint Capture"
                  className="w-full h-full object-cover object-top"
                />
                <div className="absolute top-1 right-1 flex items-center gap-1 bg-red-600 text-[8px] text-white px-1 py-0.5 rounded font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  LIVE
                </div>
              </div>
              <span className="text-[10px] font-medium text-slate-500 mt-1">
                Live Capture
              </span>
            </div>
          </div>

          {/* Right Side: Face Match Score Card */}
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
              {data.faceMatchScore}%
            </div>

            <div className="inline-flex items-center justify-center gap-1 text-[10.5px] font-bold">
              {isMatch && <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />}
              {isReview && <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
              {isFail && <XCircle className="w-3.5 h-3.5 text-[#DC2626]" />}
              <span className="truncate">{data.faceMatchStatus}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
