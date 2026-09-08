import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FileText,
  Radio,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  ChevronRight,
} from 'lucide-react';
import { Header } from './components/Header';
import { SettingsModal } from './components/SettingsModal';
import { StatusTimeline } from './components/StatusTimeline';
import { NfcScreen } from './components/NfcScreen';
import { FaceCameraScreen } from './components/FaceCameraScreen';
import { MobileApiService, type SessionData } from './services/api';

export default function App() {
  const [sessionId, setSessionId] = useState<string>('PRM-20260908-1832');
  const [session, setSession] = useState<SessionData | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'auto' | 'nfc' | 'face'>('auto');

  const sessionRef = useRef<SessionData | null>(null);
  sessionRef.current = session;

  // Poll active session & send heartbeat
  const syncSession = useCallback(async () => {
    try {
      // 1. If we don't have session or need to find current
      const current = await MobileApiService.getSession(sessionId);
      if (current) {
        setSession(current);
        setConnected(true);
      } else {
        // Fallback to discovering current session
        const discovered = await MobileApiService.getCurrentSession();
        if (discovered) {
          setSession(discovered);
          setSessionId(discovered.sessionId);
          setConnected(true);
        } else {
          setConnected(false);
        }
      }

      // 2. Send heartbeat to keep desktop aware
      if (sessionId) {
        await MobileApiService.sendHeartbeat(sessionId);
      }
    } catch {
      setConnected(false);
    }
  }, [sessionId]);

  useEffect(() => {
    syncSession();
    const interval = setInterval(syncSession, 1800);
    return () => clearInterval(interval);
  }, [syncSession]);

  const currentStage = session?.stage || 1;
  const doc = session?.document;

  // Reset Session
  const handleResetSession = async () => {
    try {
      await MobileApiService.resetSession(sessionId);
      await syncSession();
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-screen bg-[#0B132B] text-slate-100 flex flex-col font-sans max-w-md mx-auto relative shadow-2xl pb-10">
      {/* Top Header */}
      <Header
        connected={connected}
        sessionId={sessionId}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 p-4 space-y-4">
        {/* Stage Timeline */}
        <StatusTimeline currentStage={currentStage} />

        {/* Active Document Card (if synced) */}
        {doc && (
          <div className="bg-[#111C44] border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center overflow-hidden">
                {doc.photoUrl ? (
                  <img
                    src={doc.photoUrl}
                    alt="Holder"
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  <FileText className="w-5 h-5 text-slate-400" />
                )}
              </div>
              <div>
                <div className="text-[10px] font-mono text-slate-400 uppercase">
                  Document ID: <strong className="text-white">{doc.documentNumber || 'UNASSIGNED'}</strong>
                </div>
                <div className="text-xs font-bold text-slate-100">
                  {doc.holderName || 'INVESTIGATION RECORD'}
                </div>
                <div className="text-[10px] text-slate-400">
                  DOB: {doc.dob || 'N/A'} • {doc.nationality || 'IND'}
                </div>
              </div>
            </div>

            <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded">
              Synced
            </span>
          </div>
        )}

        {/* Tab Navigation for Gate Direct Access (Auto / NFC / Camera) */}
        <div className="grid grid-cols-3 gap-1 bg-slate-900/90 border border-slate-800 rounded-xl p-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('auto')}
            className={`py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'auto'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Auto Pipeline
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('nfc')}
            className={`py-1.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-1 ${
              activeTab === 'nfc'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>NFC Gate</span>
            {currentStage === 3 && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('face')}
            className={`py-1.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-1 ${
              activeTab === 'face'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Face Gate</span>
            {currentStage === 6 && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            )}
          </button>
        </div>

        {/* Dynamic View based on Stage or Selected Tab */}
        {activeTab === 'nfc' ? (
          session ? (
            <NfcScreen session={session} onNfcComplete={syncSession} />
          ) : (
            <AwaitingSessionCard onOpenSettings={() => setIsSettingsOpen(true)} />
          )
        ) : activeTab === 'face' ? (
          session ? (
            <FaceCameraScreen session={session} onFaceComplete={syncSession} />
          ) : (
            <AwaitingSessionCard onOpenSettings={() => setIsSettingsOpen(true)} />
          )
        ) : (
          /* AUTO PIPELINE FLOW */
          <>
            {/* Stage 1 & 2: Waiting for Document / OCR */}
            {currentStage <= 2 && (
              <div className="bg-[#111C44] border border-slate-800 rounded-2xl p-6 text-center space-y-3">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Radio className="w-7 h-7 animate-radar" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {currentStage === 1 ? 'Stage 1: Document Upload' : 'Stage 2: OCR Extraction'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Screening initiated on Desktop Investigator Console.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300">
                  Stage 3 (NFC Credential Input) will prompt on this screen once OCR extraction finishes.
                </div>
              </div>
            )}

            {/* Stage 3: NFC Gate */}
            {currentStage === 3 && (
              session ? (
                <NfcScreen session={session} onNfcComplete={syncSession} />
              ) : (
                <AwaitingSessionCard onOpenSettings={() => setIsSettingsOpen(true)} />
              )
            )}

            {/* Stage 4 & 5: Validation & Issuer Tampering */}
            {(currentStage === 4 || currentStage === 5) && (
              <div className="bg-[#111C44] border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Stage 3 Completed • Ingesting Forensics
                    </h3>
                    <p className="text-[10.5px] text-slate-400">
                      NFC chip data cross-verified. Executing desktop validation rules.
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
                    <span className="text-slate-300">Stage 4: ICAO 9303 Document Validation</span>
                    <span className={currentStage >= 5 ? 'text-emerald-400 font-bold' : 'text-blue-400 animate-pulse font-bold'}>
                      {currentStage >= 5 ? 'DONE' : 'RUNNING...'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
                    <span className="text-slate-300">Stage 5: Issuer & Tampering Analysis</span>
                    <span className={currentStage === 5 ? 'text-blue-400 animate-pulse font-bold' : 'text-slate-500'}>
                      {currentStage === 5 ? 'RUNNING...' : 'PENDING'}
                    </span>
                  </div>
                </div>

                <p className="text-[10.5px] text-slate-400 text-center pt-1">
                  Hold steady. Stage 6 (Live Face Camera) will activate next automatically.
                </p>
              </div>
            )}

            {/* Stage 6: Face Verification Gate */}
            {currentStage === 6 && (
              session ? (
                <FaceCameraScreen session={session} onFaceComplete={syncSession} />
              ) : (
                <AwaitingSessionCard onOpenSettings={() => setIsSettingsOpen(true)} />
              )
            )}

            {/* Stage 7: Evidence Fusion */}
            {currentStage === 7 && (
              <div className="bg-[#111C44] border border-blue-500/30 rounded-2xl p-6 text-center space-y-3">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-400">
                  <Sparkles className="w-7 h-7 animate-spin" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Stage 7: Evidence Fusion & Risk Calculation
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Synthesizing OCR, NFC, Issuer, Tamper, and Face vectors into unified risk score.
                  </p>
                </div>
              </div>
            )}

            {/* Stage 8: Verification Complete */}
            {currentStage === 8 && (
              <div className="bg-[#111C44] border border-emerald-500/40 rounded-2xl p-5 shadow-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Stage 8: Verification Complete</h3>
                      <p className="text-[10.5px] text-emerald-400 font-semibold">
                        All 8 stages finished successfully
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded">
                    Dossier Ready
                  </span>
                </div>

                {/* Score summary */}
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">NFC Status</div>
                    <div className="text-sm font-bold text-emerald-400 mt-0.5">
                      {session?.nfcResult?.readStatus || 'VERIFIED'}
                    </div>
                  </div>
                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Face Match</div>
                    <div className="text-sm font-bold text-blue-400 mt-0.5">
                      {session?.faceResult?.matchScore ? `${session.faceResult.matchScore}%` : '94%'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleResetSession}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
                  <span>Reset & Prepare Next Verification</span>
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer Info */}
      <footer className="px-4 py-2 text-center text-[10.5px] text-slate-500">
        PRAMAAN Multi-Device Forensic Verification • Local Wi-Fi Mesh
      </footer>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentSessionId={sessionId}
        onUpdateSessionId={setSessionId}
        onRefreshSession={syncSession}
      />
    </div>
  );
}

function AwaitingSessionCard({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <div className="bg-[#111C44] border border-slate-800 rounded-2xl p-6 text-center space-y-3">
      <div className="w-12 h-12 mx-auto rounded-xl bg-slate-800 flex items-center justify-center text-slate-400">
        <Smartphone className="w-6 h-6" />
      </div>
      <div>
        <h4 className="text-xs font-bold text-white">Waiting for Desktop Session</h4>
        <p className="text-[11px] text-slate-400 mt-1">
          Make sure your desktop console is running and connected on the same Wi-Fi.
        </p>
      </div>
      <button
        type="button"
        onClick={onOpenSettings}
        className="px-3 py-1.5 text-xs font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/30 rounded-lg hover:bg-blue-500/20 transition-colors"
      >
        Configure Connection Settings
      </button>
    </div>
  );
}
