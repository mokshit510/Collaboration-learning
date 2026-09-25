import React, { useState, useEffect, useCallback } from 'react';
import {
  User,
  ShieldAlert,
  CheckCircle2,
  Smartphone,
  QrCode,
  X,
  ExternalLink,
  Wifi,
  Copy,
  Check,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Radio,
  Server,
  Lock,
  Cable,
} from 'lucide-react';
import type { InvestigationStatus, NetworkInfoResponse, NetworkCandidate } from '../types';
import { apiClient } from '../services/apiClient';
import { QrCodeGenerator } from './QrCodeGenerator';

interface HeaderProps {
  investigationStatus: InvestigationStatus;
  phoneConnected?: boolean;
  sessionId?: string;
}

export const Header: React.FC<HeaderProps> = ({
  investigationStatus,
  phoneConnected = false,
  sessionId = 'PRM-20260908-1832',
}) => {
  const [showQr, setShowQr] = useState<boolean>(false);
  const [networkInfo, setNetworkInfo] = useState<NetworkInfoResponse | null>(null);
  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState<number>(0);
  const [loadingNetwork, setLoadingNetwork] = useState<boolean>(false);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [showTechInfo, setShowTechInfo] = useState<boolean>(false);

  // Fetch LAN network information from backend
  const fetchNetworkInfo = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setLoadingNetwork(true);
    try {
      const info = await apiClient.getNetworkInfo();
      setNetworkInfo((prev) => {
        // If the previously selected address still exists, preserve candidate index
        if (prev && info.candidates?.length) {
          const prevAddress = prev.candidates[selectedCandidateIndex]?.address;
          const matchIdx = info.candidates.findIndex((c) => c.address === prevAddress);
          if (matchIdx !== -1) {
            setSelectedCandidateIndex(matchIdx);
          }
        }
        return info;
      });
      setNetworkError(null);
    } catch (err: any) {
      console.warn('[PRAMAAN][Header] Network detection error:', err);
      setNetworkError(err?.message || 'Failed to detect network interfaces');
    } finally {
      if (isManualRefresh) setLoadingNetwork(false);
    }
  }, [selectedCandidateIndex]);

  // Polling hook: fetch immediately when modal opens, then poll every 5s to detect Wi-Fi/Hotspot changes
  useEffect(() => {
    if (!showQr) return;

    fetchNetworkInfo(true);
    const interval = setInterval(() => {
      fetchNetworkInfo(false);
    }, 5000);

    return () => clearInterval(interval);
  }, [showQr, fetchNetworkInfo]);

  // Resolve candidates and active candidate
  const candidates: NetworkCandidate[] = networkInfo?.candidates || [];
  const activeCandidate: NetworkCandidate | undefined =
    candidates[selectedCandidateIndex] || candidates[0];

  // Base URL calculation
  const fallbackHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const isHostedCloud =
    typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1' &&
    !/^(\d{1,3}\.){3}\d{1,3}$/.test(window.location.hostname);

  const resolvedBaseUrl =
    activeCandidate?.url ||
    networkInfo?.mobileUrl ||
    (isHostedCloud ? `${window.location.origin}/mobile` : `http://${fallbackHost}:5174`);

  // Full Companion URL with embedded session ID
  const companionFullUrl = `${resolvedBaseUrl.replace(/\/+$/, '')}/?session=${encodeURIComponent(
    sessionId
  )}`;

  const isLocalOnly =
    !isHostedCloud &&
    (!activeCandidate ||
      activeCandidate.address === 'localhost' ||
      activeCandidate.address === '127.0.0.1');

  const isHttps =
    networkInfo?.isHttps ??
    (resolvedBaseUrl.startsWith('https://') || activeCandidate?.url?.startsWith('https://') || (typeof window !== 'undefined' && window.location.protocol === 'https:'));

  const handleCopyUrl = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(companionFullUrl);
      } else {
        const input = document.createElement('input');
        input.value = companionFullUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch (err) {
      console.error('[PRAMAAN][Header] Failed to copy URL:', err);
    }
  };

  return (
    <>
      <header className="bg-[#071A2F] border-b border-[#0D243F] text-white px-6 py-3.5 flex items-center justify-between shrink-0 select-none shadow-sm z-20">
        {/* Left Title & Subtitle */}
        <div>
          <h2 className="text-[17px] font-bold text-white tracking-normal leading-tight font-sans">
            AI-Powered Identity & Document Verification
          </h2>
          <p className="text-[12px] text-slate-400 font-normal tracking-wide">
            Secure Borders. Safer Tomorrow.
          </p>
        </div>

        {/* Right Side: Phone Status + Demo Environment Disclaimer + Inspector Badge */}
        <div className="flex items-center gap-4 lg:gap-6">
          {/* Phone Device & Mobile Session Status Area */}
          <button
            type="button"
            onClick={() => setShowQr(true)}
            className="hidden sm:flex items-center gap-2.5 bg-[#0F294A] hover:bg-[#153863] border border-[#1E426F] hover:border-blue-400/60 px-3 py-1.5 rounded-lg shadow-inner transition-all cursor-pointer text-left group"
            title="Click to view Phone QR Code & connection link"
          >
            <Smartphone className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
            <div className="leading-none text-left">
              <div className="text-[9.5px] uppercase font-bold text-slate-400 flex items-center gap-1">
                Phone Device
                <span className="text-[9px] text-blue-400/80 underline font-normal">QR</span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    phoneConnected
                      ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                      : 'bg-amber-400 animate-pulse'
                  }`}
                />
                <span
                  className={`text-[11px] font-bold ${
                    phoneConnected ? 'text-emerald-300' : 'text-amber-300'
                  }`}
                >
                  {phoneConnected ? 'Connected' : 'Scan to Connect'}
                </span>
              </div>
            </div>
            <div className="w-px h-6 bg-[#1E426F]" />
            <div className="leading-none text-left">
              <div className="text-[9.5px] uppercase font-bold text-slate-400">Mobile Session</div>
              <div className="text-[11px] font-mono font-bold text-blue-300 mt-0.5">
                {sessionId}
              </div>
            </div>
            <QrCode className="w-4 h-4 text-blue-400/70 ml-0.5 group-hover:text-blue-300" />
          </button>

          {/* Status Indicator if Flagged */}
          {investigationStatus === 'flagged' && (
            <div className="flex items-center gap-2 bg-red-950/80 border border-red-500/60 px-3 py-1.5 rounded-md text-red-300 animate-pulse">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <span className="text-xs font-bold tracking-wide uppercase">
                Flagged for Investigation
              </span>
            </div>
          )}

          {investigationStatus === 'saved' && (
            <div className="flex items-center gap-2 bg-emerald-950/80 border border-emerald-500/60 px-3 py-1.5 rounded-md text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold tracking-wide uppercase">
                Record Archived
              </span>
            </div>
          )}

          {/* Demo Environment Badge */}
          <div className="hidden lg:flex items-center gap-3 border-r border-[#153457] pr-6">
            <div className="w-7 h-7 rounded bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-300">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                <path d="M12 2L9 7h6l-3-5zm-5 6h10v2H7V8zm1 3h8v6H8v-6zm-2 7h12v2H6v-2z" />
              </svg>
            </div>
            <div className="text-right">
              <div className="flex items-center justify-end gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                <span className="text-[10px] font-bold tracking-wider text-amber-400 uppercase bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/30">
                  Demo Environment
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                Simulated Issuer Verification • Hackathon / Research Use Only
              </p>
            </div>
          </div>

          {/* Inspector Profile */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#122F52] border border-blue-500/40 flex items-center justify-center text-blue-300 shadow-inner">
              <User className="w-4 h-4" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-white">Inspector</div>
              <div className="text-[11px] text-slate-400">SSB Checkpoint A</div>
            </div>
          </div>
        </div>
      </header>

      {/* Connect Phone Companion Dynamic Modal */}
      {showQr && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-[#0B1E36] border border-[#1E426F] rounded-2xl p-6 max-w-md w-full text-white shadow-2xl relative max-h-[92vh] overflow-y-auto">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowQr(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800/80 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-inner">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white leading-tight">
                  Connect Phone Companion
                </h3>
                <p className="text-xs text-slate-400">
                  Live phone pairing for passport NFC reading & face capture
                </p>
              </div>
            </div>

            {/* Connection Status Bar */}
            <div
              className={`flex items-center justify-between px-3 py-2 rounded-xl border mb-3.5 text-xs ${
                phoneConnected
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    phoneConnected
                      ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                      : 'bg-amber-400 animate-ping'
                  }`}
                />
                <span className="font-semibold">
                  {phoneConnected ? 'Phone Connected & Active' : 'Waiting for phone to scan...'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => fetchNetworkInfo(true)}
                  disabled={loadingNetwork}
                  title="Refresh network detection"
                  className="p-1 hover:bg-slate-800/80 rounded transition-colors text-slate-400 hover:text-white cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${loadingNetwork ? 'animate-spin text-blue-400' : ''}`}
                  />
                </button>
              </div>
            </div>

            {/* Network Interface Candidates Selector (if multiple available) */}
            {candidates.length > 1 && (
              <div className="mb-3.5">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Select Network Interface
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {candidates.map((cand, idx) => {
                    const isSelected = idx === selectedCandidateIndex;
                    return (
                      <button
                        key={cand.address}
                        type="button"
                        onClick={() => setSelectedCandidateIndex(idx)}
                        className={`flex items-center gap-2 p-2 rounded-xl text-left border text-xs transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600/20 border-blue-500 text-white font-medium shadow-sm'
                            : 'bg-[#081729] border-[#153457] text-slate-400 hover:text-slate-200 hover:border-slate-600'
                        }`}
                      >
                        {cand.type === 'wifi' || cand.type === 'wireless' || cand.name.toLowerCase().includes('wi-fi') ? (
                          <Wifi className={`w-4 h-4 shrink-0 ${isSelected ? 'text-blue-400' : 'text-slate-500'}`} />
                        ) : (
                          <Cable className={`w-4 h-4 shrink-0 ${isSelected ? 'text-blue-400' : 'text-slate-500'}`} />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-semibold text-[11px] leading-tight">
                            {cand.name}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 truncate">
                            {cand.address}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Network Detection Warning if local-only */}
            {isLocalOnly && (
              <div className="flex items-start gap-2 bg-amber-950/60 border border-amber-500/40 rounded-xl p-2.5 mb-3.5 text-xs text-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">No Wi-Fi/Hotspot IP detected.</span>
                  <p className="text-[11px] text-amber-300/80 mt-0.5">
                    Connect your laptop to a Wi-Fi network or enable Mobile Hotspot so your phone can pair.
                  </p>
                </div>
              </div>
            )}

            {/* Dynamic QR Code Display */}
            <div className="bg-[#07172A] border border-[#153457] rounded-xl p-4 flex flex-col items-center justify-center mb-3.5">
              <QrCodeGenerator value={companionFullUrl} size={170} />

              <div className="flex items-center gap-2 mt-3 text-xs text-slate-400 font-medium">
                <Radio className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                <span>Auto-detected:</span>
                <span className="font-mono text-blue-300 font-bold">
                  {activeCandidate?.address || fallbackHost}
                </span>
                <span className="text-slate-500">•</span>
                <span className="font-mono text-slate-300">
                  Port {networkInfo?.port || 5174}
                </span>
              </div>
            </div>

            {/* Direct Companion URL + Action Buttons */}
            <div className="bg-[#071526] border border-[#153457] rounded-xl p-3 mb-3.5">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium mb-1.5">
                <span>Phone Browser URL:</span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {isHttps ? 'HTTPS Secure' : 'HTTP'}
                </span>
              </div>
              <div className="font-mono text-xs font-bold text-blue-400 break-all bg-[#091D34] px-2.5 py-1.5 rounded-lg border border-blue-900/40 select-all mb-2.5">
                {companionFullUrl}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="flex items-center justify-center gap-1.5 bg-[#0F294A] hover:bg-[#163B6B] border border-[#1E426F] hover:border-blue-400 text-xs font-medium text-white py-1.5 px-3 rounded-lg transition-all cursor-pointer active:scale-98"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-300 font-bold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-300" />
                      <span>Copy URL</span>
                    </>
                  )}
                </button>

                <a
                  href={companionFullUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white py-1.5 px-3 rounded-lg transition-all cursor-pointer shadow-md"
                >
                  <span>Open Companion</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* HTTPS Self-Signed Certificate Notice */}
            {isHttps && (
              <div className="flex items-start gap-2 bg-blue-950/40 border border-blue-800/40 rounded-xl p-2.5 mb-3.5 text-[11px] text-blue-200">
                <Lock className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div className="leading-tight">
                  <span className="font-bold text-blue-100">Mobile HTTPS Note:</span>
                  <p className="text-blue-300/80 mt-0.5">
                    If mobile Safari/Chrome warns <em>"Connection Not Private"</em>, tap{' '}
                    <strong className="text-white">Advanced → Proceed to IP (unsafe)</strong> once to allow camera & NFC access.
                  </p>
                </div>
              </div>
            )}

            {/* Quick Steps Instructions */}
            <div className="space-y-2 text-[11.5px] text-slate-300 bg-[#0E2745]/60 p-3 rounded-xl border border-blue-900/40 mb-3.5">
              <div className="flex items-start gap-2">
                <Wifi className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span>Phone and laptop must be on the same Wi-Fi network or Mobile Hotspot.</span>
              </div>
              <div className="flex items-start gap-2">
                <Smartphone className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Scan the QR code with phone camera to automatically pair this session.</span>
              </div>
            </div>

            {/* Expandable Technical Details Drawer */}
            <div className="border-t border-slate-800/80 pt-2.5">
              <button
                type="button"
                onClick={() => setShowTechInfo(!showTechInfo)}
                className="flex items-center justify-between w-full text-[11px] text-slate-400 hover:text-slate-200 py-1 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-blue-400" />
                  <span>Technical Info & Network Diagnostics</span>
                </div>
                {showTechInfo ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {showTechInfo && (
                <div className="mt-2.5 p-2.5 bg-[#061424] rounded-lg border border-slate-800 text-[10.5px] font-mono space-y-1.5 animate-in fade-in duration-100">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Interface:</span>
                    <span className="text-slate-300 font-semibold">{activeCandidate?.name || networkInfo?.interfaceName || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Host IPv4:</span>
                    <span className="text-blue-300 font-semibold">{activeCandidate?.address || networkInfo?.ipv4 || fallbackHost}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Port / Protocol:</span>
                    <span className="text-slate-300">{networkInfo?.port || 5174} / {networkInfo?.protocol?.toUpperCase() || 'HTTPS'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Backend API:</span>
                    <span className="text-slate-300">{networkInfo?.backendUrl || apiClient.getMode()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Session Token:</span>
                    <span className="text-emerald-400 truncate max-w-[170px]">{sessionId}</span>
                  </div>
                  {networkError && (
                    <div className="text-red-400 pt-1 border-t border-red-900/30 text-[10px]">
                      Err: {networkError}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer Session Badge */}
            <div className="mt-3 pt-2 text-center border-t border-slate-800/60">
              <span className="text-[11px] text-slate-400">Active Session: </span>
              <span className="text-[11px] font-mono font-bold text-blue-300">{sessionId}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
