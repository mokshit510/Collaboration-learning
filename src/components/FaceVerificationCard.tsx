import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { DocumentData } from '../types';


interface FaceVerificationCardProps {
  data: DocumentData;
}

export const FaceVerificationCard: React.FC<FaceVerificationCardProps> = ({ data }) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-4">
      {/* Title */}
      <h3 className="text-[14px] font-bold text-slate-800 tracking-tight mb-3">
        6. Face Verification
      </h3>

      {/* Main Grid: Left Photos & Right Match Score Card */}
      <div className="grid grid-cols-12 gap-3 items-center">
        {/* Left Side: Document Photo & Live Capture */}
        <div className="col-span-12 sm:col-span-7 flex items-center gap-3">
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
            <span className="text-[10.5px] font-medium text-slate-500 mt-1">
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
            <span className="text-[10.5px] font-medium text-slate-500 mt-1">
              Live Capture
            </span>
          </div>
        </div>

        {/* Right Side: Face Match Score Card */}
        <div className="col-span-12 sm:col-span-5 h-full flex flex-col justify-center bg-[#EDF7EE] border border-emerald-200/80 rounded-xl p-3 text-center">
          <div className="text-[11px] font-bold text-emerald-800 tracking-tight">
            Face Match Score
          </div>

          <div className="text-[30px] font-extrabold text-[#16A34A] leading-tight my-0.5 font-mono tracking-tight">
            {data.faceMatchScore}%
          </div>

          <div className="inline-flex items-center justify-center gap-1 text-[11px] font-bold text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A] fill-emerald-100" />
            <span>{data.faceMatchStatus}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
