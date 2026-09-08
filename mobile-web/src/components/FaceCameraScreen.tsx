import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, RefreshCw, CheckCircle2, AlertTriangle, UserCheck, ShieldCheck, Upload } from 'lucide-react';
import { MobileApiService, type SessionData } from '../services/api';

interface FaceCameraScreenProps {
  session: SessionData;
  onFaceComplete?: () => void;
}

export const FaceCameraScreen: React.FC<FaceCameraScreenProps> = ({
  session,
  onFaceComplete,
}) => {
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [faceFeedback, setFaceFeedback] = useState<any | null>(session.faceResult || null);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isStartingRef = useRef<boolean>(false);

  // Stop camera tracks helper
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
        console.log('[Camera] track.readyState after stop:', track.readyState);
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  // Start front camera
  const startCamera = useCallback(async () => {
    if (isStartingRef.current) {
      console.log('[Camera] startCamera already in progress, skipping duplicate call');
      return;
    }
    isStartingRef.current = true;
    setCameraError(null);

    // 1. Stop any existing stream first
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera access API is not available on this browser or context.');
      }

      console.log('[Camera] Requesting getUserMedia...');
      // 1. Call getUserMedia
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'user' },
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
        audio: false,
      });

      console.log('[Camera] getUserMedia success');

      // 2. Store MediaStream in ref
      streamRef.current = stream;

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        console.log('[Camera] video track label:', videoTrack.label);
        console.log('[Camera] track.readyState:', videoTrack.readyState);
      }

      const video = videoRef.current;
      if (!video) {
        throw new Error('Video element reference is not available.');
      }

      // 4. After video element exists, assign srcObject
      video.srcObject = stream;

      // 5. Set muted and playsInline
      video.muted = true;
      video.playsInline = true;
      video.setAttribute('muted', '');
      video.setAttribute('playsinline', '');

      console.log('[Camera] video.readyState before play:', video.readyState);

      // 6. Wait for loadedmetadata if readyState < 1
      if (video.readyState < 1) {
        await new Promise<void>((resolve) => {
          const onMetadata = () => {
            video.removeEventListener('loadedmetadata', onMetadata);
            resolve();
          };
          video.addEventListener('loadedmetadata', onMetadata, { once: true });
          setTimeout(resolve, 1500);
        });
      }

      console.log('[Camera] video.readyState after metadata:', video.readyState);

      // 7. Call video.play()
      try {
        await video.play();
        console.log('[Camera] video.play() successful');
      } catch (playErr) {
        console.error('[Camera] video.play() errors:', playErr);
        throw playErr;
      }

      console.log('[Camera] video.videoWidth:', video.videoWidth);
      console.log('[Camera] video.videoHeight:', video.videoHeight);

      // 8. Verify videoWidth and videoHeight > 0 before treating as active
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        setCameraActive(true);
      } else {
        await new Promise<void>((resolve) => {
          let attempts = 0;
          const checkDimensions = () => {
            attempts++;
            if (video.videoWidth > 0 && video.videoHeight > 0) {
              console.log('[Camera] video.videoWidth:', video.videoWidth);
              console.log('[Camera] video.videoHeight:', video.videoHeight);
              setCameraActive(true);
              resolve();
            } else if (attempts >= 20) {
              console.warn('[Camera] Dimensions check timeout; activating camera feed');
              setCameraActive(true);
              resolve();
            } else {
              setTimeout(checkDimensions, 100);
            }
          };
          checkDimensions();
        });
      }

    } catch (err: any) {
      console.error('[Camera] startCamera failed:', err);
      setCameraActive(false);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission denied. Please allow camera access in browser site settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera was found on this device.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setCameraError('Camera is already in use by another application or browser tab.');
      } else if (err.name === 'SecurityError') {
        setCameraError('Camera access was blocked by browser security. Open PRAMAAN using HTTPS.');
      } else {
        setCameraError(`Unable to start camera: ${err.message || err.name || 'Unknown error'}`);
      }
    } finally {
      isStartingRef.current = false;
    }
  }, []);

  // 9. Cleanly stop all tracks when leaving Face Gate or unmounting
  useEffect(() => {
    if (session.stage === 6 && !faceFeedback && !capturedPreview) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [session.stage, faceFeedback, capturedPreview, startCamera, stopCamera]);

  // Capture frame from video
  const handleCaptureFrame = async () => {
    if (!videoRef.current || !canvasRef.current) {
      setCameraError('Video feed not available for capture.');
      return;
    }
    const video = videoRef.current;
    if (video.readyState < 2) {
      setCameraError('Video feed is not ready yet. Please hold steady.');
      return;
    }
    if (video.videoWidth <= 0 || video.videoHeight <= 0) {
      setCameraError('Camera dimensions not detected. Please wait a moment.');
      return;
    }

    setSubmitting(true);
    setCameraError(null);
    try {
      const canvas = canvasRef.current;
      const width = video.videoWidth;
      const height = video.videoHeight;
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      ctx.drawImage(video, 0, 0, width, height);
      const base64Image = canvas.toDataURL('image/jpeg', 0.88);
      setCapturedPreview(base64Image);
      stopCamera();

      // Send actual captured frame to backend
      const result = await MobileApiService.verifyFace({
        sessionId: session.sessionId,
        livePhoto: base64Image,
        documentPhoto: session.document?.photoUrl,
        forceMismatch: false,
      });

      setFaceFeedback(result);
      onFaceComplete?.();
    } catch (err: any) {
      setCameraError(`Capture submission failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle file input upload fallback
  const handleFileUploadFallback = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setCapturedPreview(base64);
      stopCamera();
      setSubmitting(true);
      try {
        const result = await MobileApiService.verifyFace({
          sessionId: session.sessionId,
          livePhoto: base64,
          documentPhoto: session.document?.photoUrl,
          forceMismatch: false,
        });
        setFaceFeedback(result);
        onFaceComplete?.();
      } catch (err: any) {
        setCameraError(`Verification failed: ${err.message}`);
      } finally {
        setSubmitting(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Test simulation fallback (useful when testing without live subject)
  const handleSimulateFaceCapture = async (mismatch: boolean) => {
    setSubmitting(true);
    setCameraError(null);
    stopCamera();

    const samplePhoto =
      session.document?.photoUrl ||
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&fit=crop&crop=faces';
    setCapturedPreview(samplePhoto);

    try {
      const result = await MobileApiService.verifyFace({
        sessionId: session.sessionId,
        livePhoto: samplePhoto,
        documentPhoto: session.document?.photoUrl,
        forceMismatch: mismatch,
      });
      setFaceFeedback(result);
      onFaceComplete?.();
    } catch (err: any) {
      setCameraError(`Simulation failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[#111C44] border border-blue-500/30 rounded-2xl p-5 shadow-xl space-y-4">
      {/* Top Banner */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-400">
            <Camera className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>Stage 6 Gate</span>
              <span className="text-xs text-blue-400 font-semibold">• Live Face Camera</span>
            </h3>
            <p className="text-[10.5px] text-slate-400">
              Desktop pipeline paused awaiting biometric selfie
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono uppercase bg-blue-500/10 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-bold">
          Active Gate
        </span>
      </div>

      {/* Verified Feedback View */}
      {faceFeedback ? (
        <div className="bg-slate-900/90 border border-emerald-500/40 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <div>
                <div className="text-xs font-bold text-white">
                  Biometric Face Match: {faceFeedback.matchScore}%
                </div>
                <div className="text-[10px] text-emerald-400">
                  Liveness: {faceFeedback.liveness} • Confidence: {faceFeedback.confidence}%
                </div>
              </div>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                faceFeedback.status === 'PASS'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}
            >
              {faceFeedback.status}
            </span>
          </div>

          {capturedPreview && (
            <div className="flex items-center justify-center py-2">
              <div className="relative w-28 h-28 rounded-full overflow-hidden border-2 border-emerald-400 shadow-md">
                <img
                  src={capturedPreview}
                  alt="Captured Selfie"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          <p className="text-[11px] text-slate-300 bg-black/40 p-2.5 rounded-lg border border-slate-800">
            {faceFeedback.statusExplanation}
          </p>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" /> Sent to Desktop Console
            </span>
            <button
              type="button"
              onClick={() => {
                setFaceFeedback(null);
                setCapturedPreview(null);
                startCamera();
              }}
              className="text-[10px] text-blue-400 hover:text-blue-300 underline cursor-pointer"
            >
              Retake photo
            </button>
          </div>
        </div>
      ) : (
        /* Camera Viewfinder & Controls */
        <div className="space-y-3">
          {/* Viewfinder Frame */}
          <div className="relative w-full aspect-square bg-black rounded-2xl overflow-hidden border-2 border-slate-700 shadow-inner flex items-center justify-center">
            {/* 3. Render video element (always mounted so ref exists, visibility controlled by cameraActive) */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transform -scale-x-100 ${
                cameraActive ? 'block' : 'hidden'
              }`}
            />

            {cameraActive ? (
              <>
                {/* Oval Guideline Overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-56 h-72 rounded-[50%] border-2 border-dashed border-blue-400/80 shadow-[0_0_0_9999px_rgba(11,19,43,0.65)] flex flex-col items-center justify-between py-6">
                    <span className="text-[10px] font-bold tracking-widest text-blue-300 bg-black/70 px-2 py-0.5 rounded uppercase">
                      Position Face Here
                    </span>
                    <span className="text-[9.5px] text-slate-300 bg-black/70 px-2 py-0.5 rounded">
                      Hold Steady
                    </span>
                  </div>
                </div>

                {/* Animated scanline effect */}
                <div className="absolute left-6 right-6 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-sm shadow-cyan-400 animate-scanline pointer-events-none" />
              </>
            ) : (
              <div className="p-6 text-center space-y-3">
                <div className="w-14 h-14 mx-auto rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400">
                  <Camera className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-300">
                    Camera Viewfinder Standby
                  </p>
                  <p className="text-[10.5px] text-slate-400 mt-1 max-w-[240px] mx-auto">
                    Tap activate camera to take a live selfie for biometric comparison.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md cursor-pointer transition-colors"
                >
                  Activate Camera Feed
                </button>
              </div>
            )}
          </div>

          {/* Hidden Canvas for Frame Capture */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Hidden file input for mobile native camera fallback */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="user"
            onChange={handleFileUploadFallback}
            className="hidden"
          />

          {/* Primary Action Button */}
          {cameraActive && (
            <button
              type="button"
              onClick={handleCaptureFrame}
              disabled={submitting}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing Biometric Vectors...</span>
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4" />
                  <span>Capture & Verify Face</span>
                </>
              )}
            </button>
          )}

          {cameraError && (
            <div className="p-2.5 rounded-lg bg-rose-950/50 border border-rose-500/40 text-[11px] text-rose-300">
              {cameraError}
            </div>
          )}

          {/* Fallback Tools: File picker + One-tap simulation */}
          <div className="pt-1 space-y-2 border-t border-slate-800">
            <div className="flex items-center justify-between text-[10.5px] text-slate-400">
              <span>CAMERA ALTERNATIVES</span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold cursor-pointer"
              >
                <Upload className="w-3 h-3" />
                <span>Upload Selfie Photo</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleSimulateFaceCapture(false)}
                disabled={submitting}
                className="py-2.5 px-2.5 rounded-xl bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Test Face (Match)</span>
              </button>

              <button
                type="button"
                onClick={() => handleSimulateFaceCapture(true)}
                disabled={submitting}
                className="py-2.5 px-2.5 rounded-xl bg-rose-950/70 hover:bg-rose-900/80 border border-rose-500/40 text-rose-300 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>Test Face (Mismatch)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
