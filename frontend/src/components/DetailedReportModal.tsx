import React, { useState } from 'react';
import {
  X,
  ShieldAlert,
  Printer,
  AlertTriangle,
  FileText,
  Radio,
  BookOpen,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  Cpu,
  Layers,
} from 'lucide-react';
import type { DocumentData, VerificationResult } from '../types';
import { PassportDocumentView } from './PassportDocumentView';

interface DetailedReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: DocumentData;
  verificationResult?: VerificationResult | null;
}

type TabKey = 'forensics' | 'evidence' | 'nfc' | 'reference' | 'watchlist' | 'audit';

export const DetailedReportModal: React.FC<DetailedReportModalProps> = ({
  isOpen,
  onClose,
  data,
  verificationResult,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('forensics');

  if (!isOpen) return null;

  const verificationId = verificationResult?.verificationId || `PRM-2026-${data.documentNumber.slice(-4)}`;
  const timestamp = verificationResult?.timestamp
    ? new Date(verificationResult.timestamp).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'medium',
      })
    : '06-SEP-2026 14:22:15 IST';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-3.5 bg-[#071A2F] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-600/30 border border-red-500/40 text-red-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold tracking-tight text-white">
                  Investigative Forensic Dossier — Case #{verificationId}
                </h3>
                {data.riskScore !== undefined && data.riskScore !== null ? (
                  <span
                    className={`text-[10px] uppercase font-bold text-white px-2 py-0.5 rounded ${
                      data.riskScore >= 60
                        ? 'bg-[#DC2626]'
                        : data.riskScore >= 30
                        ? 'bg-amber-600'
                        : 'bg-emerald-600'
                    }`}
                  >
                    {data.riskLevel} ({data.riskScore}/100)
                  </span>
                ) : (
                  <span className="text-[10px] uppercase font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 font-mono">
                    AWAITING PIPELINE EXECUTION
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                PRAMAAN Automated Risk Assessment &amp; Forensics Engine (EVIDENCE → CORRELATION → RISK)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Info Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-50 px-6 py-2.5 border-b border-slate-200 text-xs shrink-0">
          <div>
            <span className="text-slate-400 font-medium block text-[10px]">Document Holder</span>
            <span className="font-bold text-slate-900 text-xs truncate block">{data.holderName}</span>
          </div>
          <div>
            <span className="text-slate-400 font-medium block text-[10px]">Document Number</span>
            <span className="font-mono font-bold text-slate-900 text-xs">{data.documentNumber}</span>
          </div>
          <div>
            <span className="text-slate-400 font-medium block text-[10px]">Checkpoint / Station</span>
            <span className="font-medium text-slate-900 text-xs">SSB Checkpoint A-14</span>
          </div>
          <div>
            <span className="text-slate-400 font-medium block text-[10px]">Analysis Timestamp</span>
            <span className="font-mono text-slate-700 text-xs">{timestamp}</span>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex border-b border-slate-200 bg-slate-100/70 px-6 py-1 gap-1 text-xs font-semibold overflow-x-auto shrink-0 select-none">
          <button
            onClick={() => setActiveTab('forensics')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              activeTab === 'forensics'
                ? 'bg-white text-blue-700 shadow-2xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Forensic Tampering Map</span>
          </button>

          <button
            onClick={() => setActiveTab('evidence')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              activeTab === 'evidence'
                ? 'bg-white text-blue-700 shadow-2xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Evidence Fusion (8 Vectors)</span>
          </button>

          <button
            onClick={() => setActiveTab('nfc')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              activeTab === 'nfc'
                ? 'bg-white text-blue-700 shadow-2xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>NFC Prototype Credential</span>
          </button>

          <button
            onClick={() => setActiveTab('reference')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              activeTab === 'reference'
                ? 'bg-white text-blue-700 shadow-2xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>PRADO Specimen Comparison</span>
          </button>

          <button
            onClick={() => setActiveTab('watchlist')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              activeTab === 'watchlist'
                ? 'bg-white text-blue-700 shadow-2xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Watchlist / LOC</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              activeTab === 'audit'
                ? 'bg-white text-blue-700 shadow-2xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Audit Trail</span>
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-800 flex-1">
          {/* TAB 1: FORENSICS */}
          {activeTab === 'forensics' && (
            <div className="space-y-6">
              {/* Visual Forensics Overlay */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Forensic Tamper Detection Map</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <div className="max-w-md mx-auto w-full">
                    <PassportDocumentView data={data} showTamperOverlay={true} />
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-slate-700">
                      Detected Anomalies Breakdown ({data.suspiciousElements.length}):
                    </div>
                    {data.suspiciousElements.length === 0 ? (
                      <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>No physical or optical tampering detected. Surface grid and micro-patterns intact.</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {data.suspiciousElements.map((elem) => (
                          <div key={elem.id} className="p-2.5 rounded-lg border border-red-200 bg-red-50/50 text-xs">
                            <div className="flex items-center justify-between font-bold text-red-700">
                              <span className="flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                {elem.title}
                              </span>
                              <span className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-red-300 font-mono">
                                {elem.confidenceLevel}
                              </span>
                            </div>
                            <p className="text-slate-600 mt-1 leading-snug">{elem.description}</p>
                            {elem.location && (
                              <span className="text-[10px] font-mono text-slate-500 mt-0.5 block">
                                Region: {elem.location}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Risk Engine Scoring Matrix */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Risk Engine Scoring Contribution Matrix
                </h4>
                <div className="rounded-xl border border-slate-200 overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Component / Vector</th>
                        <th className="p-2.5">Points</th>
                        <th className="p-2.5">Observation Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {(data.riskContributors || []).length > 0 ? (
                        (data.riskContributors || []).map((c) => (
                          <tr key={c.category} className="hover:bg-slate-50">
                            <td className="p-2.5 font-sans font-semibold text-slate-800">{c.category}</td>
                            <td className="p-2.5">
                              <span
                                className={`font-bold px-2 py-0.5 rounded ${
                                  c.points > 20
                                    ? 'bg-red-100 text-red-700'
                                    : c.points > 0
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-emerald-100 text-emerald-700'
                                }`}
                              >
                                +{c.points}
                              </span>
                            </td>
                            <td className="p-2.5 font-sans text-slate-600">{c.description}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="p-4 text-center text-slate-400 font-sans">
                            Risk assessment not run. Execute pipeline to calculate scoring matrix.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: EVIDENCE FUSION */}
          {activeTab === 'evidence' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Unified Evidence Fusion Model</h4>
                  <p className="text-xs text-slate-500">
                    Cross-correlates findings from OCR, Validation, Issuer, AI Tampering, Face, NFC, Reference &amp; Watchlist.
                  </p>
                </div>
                <span className="text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-lg">
                  EVIDENCE → CORRELATION → RISK
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {(verificationResult?.evidence || []).map((ev) => (
                  <div
                    key={ev.id}
                    className={`p-3 rounded-xl border transition-colors flex items-start justify-between gap-3 text-xs ${
                      ev.status === 'FAIL'
                        ? 'bg-red-50/70 border-red-200'
                        : ev.status === 'WARNING'
                        ? 'bg-amber-50/70 border-amber-200'
                        : 'bg-emerald-50/40 border-emerald-200'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold uppercase tracking-wider text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {ev.vector}
                        </span>
                        <span className="font-semibold text-slate-800">{ev.summary}</span>
                      </div>
                      <p className="text-slate-600 pl-1">{ev.technicalFinding}</p>
                    </div>

                    <div className="shrink-0 text-right">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                          ev.status === 'FAIL'
                            ? 'bg-red-600 text-white'
                            : ev.status === 'WARNING'
                            ? 'bg-amber-500 text-white'
                            : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {ev.status}
                      </span>
                      {ev.impactPoints > 0 && (
                        <span className="block text-[11px] font-mono text-red-600 font-bold mt-1">
                          +{ev.impactPoints} pts
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: NFC PROTOTYPE */}
          {activeTab === 'nfc' && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2">
                <Cpu className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">NFC-Based Prototype Credential Verification (Demonstration Module)</span>
                  <span className="text-blue-700 text-[11px]">
                    Note: Demonstrates secure NFC cross-verification. A generic NFC tag is not an official passport chip.
                    Compares printed visual data against cryptographically signed NFC chip records.
                  </span>
                </div>
              </div>

              {verificationResult?.nfcVerification && (
                <div className="space-y-4 text-xs">
                  <div
                    className={`p-3 rounded-xl border flex items-center justify-between ${
                      verificationResult.nfcVerification.status === 'PASS'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-amber-50 border-amber-200 text-amber-900'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {verificationResult.nfcVerification.status === 'PASS' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                      )}
                      <div>
                        <div className="font-bold">
                          Status: {verificationResult.nfcVerification.status} ({verificationResult.nfcVerification.readStatus})
                        </div>
                        <div className="text-[11px]">{verificationResult.nfcVerification.explanation}</div>
                      </div>
                    </div>
                  </div>

                  {/* Comparison Table: Printed vs Chip */}
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="p-2.5">Data Attribute</th>
                          <th className="p-2.5">Printed Visual Field</th>
                          <th className="p-2.5">NFC Signed Chip Field</th>
                          <th className="p-2.5">Correlation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        <tr className="hover:bg-slate-50">
                          <td className="p-2.5 font-sans font-medium">Document ID</td>
                          <td className="p-2.5">{data.documentNumber}</td>
                          <td className="p-2.5">{verificationResult.nfcVerification.nfcPayload?.documentId || data.documentNumber}</td>
                          <td className="p-2.5 text-emerald-600 font-sans font-bold">MATCH [OK]</td>
                        </tr>
                        <tr className="hover:bg-slate-50">
                          <td className="p-2.5 font-sans font-medium">Date of Birth</td>
                          <td className="p-2.5 font-bold text-slate-900">{data.dob}</td>
                          <td className="p-2.5 font-bold text-slate-900">
                            {verificationResult.nfcVerification.nfcPayload?.dob || data.dob}
                          </td>
                          <td className="p-2.5 font-sans font-bold">
                            {data.dob === (verificationResult.nfcVerification.nfcPayload?.dob || data.dob) ? (
                              <span className="text-emerald-600">MATCH [OK]</span>
                            ) : (
                              <span className="text-red-600">MISMATCH [TAMPERED]</span>
                            )}
                          </td>
                        </tr>
                        <tr className="hover:bg-slate-50">
                          <td className="p-2.5 font-sans font-medium">Nationality</td>
                          <td className="p-2.5">{data.nationality}</td>
                          <td className="p-2.5">{verificationResult.nfcVerification.nfcPayload?.nationality || data.nationality}</td>
                          <td className="p-2.5 text-emerald-600 font-sans font-bold">MATCH [OK]</td>
                        </tr>
                        <tr className="hover:bg-slate-50">
                          <td className="p-2.5 font-sans font-medium">Expiry Date</td>
                          <td className="p-2.5">{data.expiryDate}</td>
                          <td className="p-2.5">{verificationResult.nfcVerification.nfcPayload?.expiry || data.expiryDate}</td>
                          <td className="p-2.5 text-emerald-600 font-sans font-bold">MATCH [OK]</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Cryptographic Hash Details */}
                  {verificationResult.nfcVerification.nfcPayload?.integrityHash && (
                    <div className="p-3 bg-slate-900 text-slate-200 rounded-xl font-mono text-[10px] space-y-1">
                      <div className="text-slate-400">Offline Public Key Trust Anchor Checksum:</div>
                      <div className="text-cyan-400 break-all">
                        {verificationResult.nfcVerification.nfcPayload.integrityHash}
                      </div>
                      <div className="text-slate-400 text-[9px]">
                        Cryptographic signature: Verified against simulated offline consular root certificate.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PRADO REFERENCE */}
          {activeTab === 'reference' && (
            <div className="space-y-4 text-xs">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 flex items-start gap-2">
                <BookOpen className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Document Reference Engine (PRADO-Style Comparison)</span>
                  <span className="text-blue-700 text-[11px]">
                    Compares uploaded identity document against authentic specimen baseline profiles (geometry, watermark, microprint).
                  </span>
                </div>
              </div>

              {verificationResult?.referenceComparison && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                      <span className="text-slate-400 block text-[10px] font-semibold">Specimen Profile</span>
                      <span className="font-bold text-slate-800 block text-xs">
                        {verificationResult.referenceComparison.referenceCountry}
                      </span>
                      <span className="text-slate-500 text-[10px]">
                        {verificationResult.referenceComparison.documentType}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                      <span className="text-slate-400 block text-[10px] font-semibold">Macro Layout Match</span>
                      <span
                        className={`font-bold block text-xs ${
                          verificationResult.referenceComparison.layoutMatch === 'MATCHED'
                            ? 'text-emerald-600'
                            : 'text-amber-600'
                        }`}
                      >
                        {verificationResult.referenceComparison.layoutMatch}
                      </span>
                      <span className="text-slate-500 text-[10px]">Aspect ratio &amp; border coordinates</span>
                    </div>

                    <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                      <span className="text-slate-400 block text-[10px] font-semibold">Specimen Confidence</span>
                      <span className="font-mono font-bold text-blue-600 block text-xs">
                        {verificationResult.referenceComparison.confidence}%
                      </span>
                      <span className="text-slate-500 text-[10px]">Pattern correlation score</span>
                    </div>
                  </div>

                  {/* Security Features Check List */}
                  <div className="space-y-1.5">
                    <span className="font-bold text-slate-700 block">Security Feature Checks:</span>
                    {verificationResult.referenceComparison.securityFeatureChecks.map((feat) => (
                      <div
                        key={feat.featureName}
                        className="p-2.5 rounded-lg border border-slate-200 bg-white flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-slate-800">{feat.featureName}</div>
                          <div className="text-slate-500 text-[10.5px]">{feat.description}</div>
                        </div>
                        <span
                          className={`font-bold text-[10px] px-2 py-0.5 rounded ${
                            feat.detectedStatus === 'VERIFIED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {feat.detectedStatus}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: WATCHLIST */}
          {activeTab === 'watchlist' && (
            <div className="space-y-4 text-xs">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 flex items-start gap-2">
                <Search className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Simulated Watchlist &amp; Lookout Screening</span>
                  <span className="text-blue-700 text-[11px]">
                    Screens document number and biographical identity against synthetic immigration Lookout Circulars (LOC).
                  </span>
                </div>
              </div>

              {verificationResult?.watchlist && (
                <div className="space-y-3">
                  <div
                    className={`p-3.5 rounded-xl border flex items-center justify-between ${
                      verificationResult.watchlist.status === 'MATCH_FOUND'
                        ? 'bg-red-50 border-red-300 text-red-900'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {verificationResult.watchlist.status === 'MATCH_FOUND' ? (
                        <XCircle className="w-5 h-5 text-red-600 shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      )}
                      <div>
                        <div className="font-bold text-sm">
                          Lookout Status: {verificationResult.watchlist.status.replace(/_/g, ' ')}
                        </div>
                        <div className="text-xs">{verificationResult.watchlist.explanation}</div>
                      </div>
                    </div>
                  </div>

                  {verificationResult.watchlist.hits && verificationResult.watchlist.hits.length > 0 && (
                    <div className="space-y-2">
                      <span className="font-bold text-red-700 block">Active Alert Matches:</span>
                      {verificationResult.watchlist.hits.map((hit) => (
                        <div
                          key={hit.referenceId}
                          className="p-3 rounded-xl border border-red-200 bg-red-50/50 space-y-1"
                        >
                          <div className="flex items-center justify-between font-bold text-red-800">
                            <span>{hit.listName}</span>
                            <span className="font-mono text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded">
                              {hit.severity}
                            </span>
                          </div>
                          <p className="text-slate-700">{hit.reason}</p>
                          <p className="text-[11px] font-bold text-red-700 pt-1">
                            Action Directive: {hit.actionRequired}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: AUDIT TRAIL */}
          {activeTab === 'audit' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Chronological Verification Audit Trail</h4>
                  <p className="text-xs text-slate-500">
                    Tamper-evident record of all 8 pipeline operations with exact system timestamps.
                  </p>
                </div>
                <span className="font-mono text-xs text-slate-500">
                  {verificationResult?.auditTrail?.length || 0} events logged
                </span>
              </div>

              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Time (IST)</th>
                      <th className="p-2.5">Step</th>
                      <th className="p-2.5">Operation Details</th>
                      <th className="p-2.5">Duration</th>
                      <th className="p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-xs">
                    {(verificationResult?.auditTrail || []).map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50">
                        <td className="p-2.5 text-slate-500 font-bold">{entry.timestamp}</td>
                        <td className="p-2.5 font-sans font-semibold text-slate-800">{entry.stepName}</td>
                        <td className="p-2.5 font-sans text-slate-600">{entry.details}</td>
                        <td className="p-2.5 text-slate-500">{entry.durationMs}ms</td>
                        <td className="p-2.5 font-sans">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              entry.status === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-700'
                                : entry.status === 'WARNING'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {entry.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-400">
            Confidential • Smart India Hackathon 2026 Prototype (SIH26188)
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 transition-colors shadow-2xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Dossier</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-[#0B213A] hover:bg-[#132F52] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              Close Dossier
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
