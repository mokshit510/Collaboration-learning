import { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import type {
  DocumentData,
  DocumentType,
  InvestigationStatus,
  VerificationResult,
  PipelineStepStatus,
  DemoScenarioId,
  VerificationRecord,
  UploadedDocument,
  TamperingResult,
} from './types';
import { mockPassportData } from './data/mockVerificationData';
import { VerificationService } from './services/verificationService';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { PipelineProgress } from './components/PipelineProgress';
import { DocumentUploadCard } from './components/DocumentUploadCard';
import { OcrExtractionCard } from './components/OcrExtractionCard';
import { DocumentValidationCard } from './components/DocumentValidationCard';
import { IssuerVerificationCard } from './components/IssuerVerificationCard';
import { TamperingAnalysisCard } from './components/TamperingAnalysisCard';
import { FaceVerificationCard } from './components/FaceVerificationCard';
import { NfcVerificationCard } from './components/NfcVerificationCard';
import { RiskAssessmentCard } from './components/RiskAssessmentCard';
import { AiSummaryCard } from './components/AiSummaryCard';
import { ActionButtons } from './components/ActionButtons';
import { DetailedReportModal } from './components/DetailedReportModal';
import { CameraScanModal } from './components/CameraScanModal';
import { PastRecordsModal } from './components/PastRecordsModal';
import { ToastContainer, type ToastMessage } from './components/Toast';
import { AuthorityDashboard } from './pages/AuthorityDashboard';
import { ValidationEngine } from './services/validationEngine';
import { IssuerService } from './services/issuerService';
import { TamperingService } from './services/tamperingService';
import { FaceService } from './services/faceService';
import { apiClient } from './services/apiClient';
import type { NfcResult, FaceResult, RiskResult } from './types';

const readFileAsBase64 = (blobOrFile: Blob | File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blobOrFile);
  });
};

export function App() {
  // Navigation & Role/Portal Mode
  const [activeNav, setActiveNav] = useState('dashboard');
  const isNewVerification = activeNav === 'new_verification';
  const [currentPortal, setCurrentPortal] = useState<'authority' | 'investigator'>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.toLowerCase();
      if (hash.includes('investigator')) return 'investigator';
      if (hash.includes('authority')) return 'authority';
    }
    return 'authority';
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash.includes('investigator')) setCurrentPortal('investigator');
      else if (hash.includes('authority')) setCurrentPortal('authority');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash.replace('#', '') !== currentPortal) {
      window.location.hash = currentPortal;
    }
  }, [currentPortal]);

  // Toast Helper
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: ToastMessage['type'], title: string, description?: string) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, type, title, description }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleSwitchPortal = (portal: 'authority' | 'investigator') => {
    setCurrentPortal(portal);
    addToast(
      'info',
      `Switched to ${portal === 'authority' ? 'Authority Portal' : 'Investigator Console'}`,
      'Active session view updated.'
    );
  };

  // Document & Verification State
  const [activeType, setActiveType] = useState<DocumentType>('passport');
  const [selectedScenario, setSelectedScenario] = useState<DemoScenarioId>('tampered');
  const [documentData, setDocumentData] = useState<DocumentData>(mockPassportData);
  const [uploadedDocument, setUploadedDocument] = useState<UploadedDocument | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);

  // Safe object URL lifecycle management to avoid memory leaks
  const activeObjectUrlRef = useRef<string | null>(null);

  const cleanupObjectUrl = useCallback(() => {
    if (activeObjectUrlRef.current) {
      URL.revokeObjectURL(activeObjectUrlRef.current);
      activeObjectUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanupObjectUrl();
    };
  }, [cleanupObjectUrl]);

  // Pipeline Step & Data-driven states (8 stages with Stage 3 NFC and Stage 6 Face gates)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [stepStates, setStepStates] = useState<Record<number, PipelineStepStatus>>({
    1: 'NOT_STARTED',
    2: 'NOT_STARTED',
    3: 'NOT_STARTED',
    4: 'NOT_STARTED',
    5: 'NOT_STARTED',
    6: 'NOT_STARTED',
    7: 'NOT_STARTED',
    8: 'NOT_STARTED',
  });
  const [stepMessages, setStepMessages] = useState<Record<number, string>>({});
  const [processingTime, setProcessingTime] = useState<string>('0.0 seconds');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // Phone Connection & Mobile Gate States
  const [sessionId, setSessionId] = useState<string>('PRM-20260908-1832');
  const activeSessionIdRef = useRef<string>('PRM-20260908-1832');
  const [phoneConnected, setPhoneConnected] = useState<boolean>(false);
  const [nfcResult, setNfcResult] = useState<NfcResult | null>(null);
  const [faceResult, setFaceResult] = useState<FaceResult | null>(null);
  const [riskResult, setRiskResult] = useState<RiskResult | null>(null);
  const [tamperingResult, setTamperingResult] = useState<TamperingResult | null>(null);
  const [pipelinePausedAt, setPipelinePausedAt] = useState<3 | 6 | null>(null);

  // Synchronize ref with sessionId state to prevent stale closures
  useEffect(() => {
    activeSessionIdRef.current = sessionId;
  }, [sessionId]);

  // Create isolated verification session for every document / run
  const startNewVerificationSession = useCallback(
    async (doc?: DocumentData) => {
      setNfcResult(null);
      setFaceResult(null);
      setRiskResult(null);
      setVerificationResult(null);
      setTamperingResult(null);
      setPipelinePausedAt(null);

      try {
        const res = await apiClient.initSession();
        if (res?.data?.sessionId) {
          const freshId = res.data.sessionId;
          setSessionId(freshId);
          activeSessionIdRef.current = freshId;
          if (doc) {
            await apiClient.updateSessionStage(freshId, 1, 'DOCUMENT_UPLOAD', {
              document: {
                documentNumber: doc.documentNumber,
                holderName: doc.holderName,
                dob: doc.dob,
                nationality: doc.nationality,
                expiryDate: doc.expiryDate,
                photoUrl: doc.photoBase64 || doc.photoUrl,
                photoBase64: doc.photoBase64,
              },
            });
          }
          return freshId;
        }
      } catch (err) {
        console.warn('[Session] Backend init session fallback to client-generated ID:', err);
      }

      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const localId = `PRM-${yyyy}${mm}${dd}-${randomSuffix}`;
      setSessionId(localId);
      activeSessionIdRef.current = localId;
      return localId;
    },
    []
  );

  // Status & Modals
  const [investigationStatus, setInvestigationStatus] = useState<InvestigationStatus>('unflagged');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [isPastRecordsOpen, setIsPastRecordsOpen] = useState(false);

  // Handle Sidebar navigation
  const handleNavClick = (navId: string) => {
    if (navId === 'past_records') {
      setIsPastRecordsOpen(true);
      return;
    }
    setActiveNav(navId);
  };

  // Switch Document Type
  const handleTypeChange = async (type: DocumentType) => {
    setActiveType(type);
    if (uploadedDocument && uploadedDocument.file) {
      setUploadedDocument((prev) => (prev ? { ...prev, documentType: type } : null));
      const updatedDoc: DocumentData = {
        ...documentData,
        type,
        title: `${type.toUpperCase()} — ${uploadedDocument.fileName}`,
      };
      setDocumentData(updatedDoc);
      await startNewVerificationSession(updatedDoc);
      addToast('info', `Classification: ${type.toUpperCase()}`, 'Updated document classification for verification.');
    } else {
      const data = VerificationService.getDocumentData(type);
      setDocumentData(data);
      setProcessingTime(data.processingTime);
      setInvestigationStatus('unflagged');
      await startNewVerificationSession(data);
      addToast('info', `Switched to ${type.toUpperCase()} Record`, `Loaded ${data.title}`);
    }
  };

  // Switch Demo Scenario
  const handleScenarioChange = async (scenarioId: DemoScenarioId) => {
    cleanupObjectUrl();
    setUploadedDocument(null);
    setSelectedScenario(scenarioId);
    setNfcResult(null);
    setFaceResult(null);
    setRiskResult(null);
    setVerificationResult(null);
    setTamperingResult(null);
    setPipelinePausedAt(null);
    const data = VerificationService.getScenarioData(scenarioId);
    setActiveType(data.type);

    if (data.photoUrl && !data.photoUrl.startsWith('data:') && typeof window !== 'undefined') {
      try {
        const res = await fetch(data.photoUrl);
        if (res.ok) {
          const blob = await res.blob();
          data.photoBase64 = await readFileAsBase64(blob);
        }
      } catch (e) {
        console.warn('[PRAMAAN] Could not load scenario image as base64:', e);
      }
    }

    setDocumentData(data);
    setInvestigationStatus('unflagged');
    await startNewVerificationSession(data);
    setCurrentStep(1);
    setStepStates({
      1: 'NOT_STARTED',
      2: 'NOT_STARTED',
      3: 'NOT_STARTED',
      4: 'NOT_STARTED',
      5: 'NOT_STARTED',
      6: 'NOT_STARTED',
      7: 'NOT_STARTED',
      8: 'NOT_STARTED',
    });
    setStepMessages({});
    addToast('info', `Loaded Scenario: ${scenarioId.toUpperCase()}`, data.title);
  };

  // ============================================================================
  // SEQUENTIAL 8-STAGE PIPELINE RUNNER WITH REAL PAUSE GATES (STAGE 3 & STAGE 6)
  // ============================================================================

  // Stage 1 & 2: Upload -> OCR -> Pause at Stage 3 (NFC Required)
  const handleStartSimulation = async () => {
    if (isSimulating) return;
    setIsSimulating(true);

    // Ensure session is fresh for this run to prevent evidence carryover
    let currentActiveSession = activeSessionIdRef.current;
    if (nfcResult || faceResult || stepStates[8] === 'COMPLETED' || currentStep > 1) {
      currentActiveSession = await startNewVerificationSession(documentData);
    }

    setCurrentStep(1);
    setInvestigationStatus('unflagged');
    setNfcResult(null);
    setFaceResult(null);
    setRiskResult(null);
    setVerificationResult(null);
    setTamperingResult(null);
    setPipelinePausedAt(null);

    // Reset step states (8 stages)
    setStepStates({
      1: 'PROCESSING',
      2: 'NOT_STARTED',
      3: 'NOT_STARTED',
      4: 'NOT_STARTED',
      5: 'NOT_STARTED',
      6: 'NOT_STARTED',
      7: 'NOT_STARTED',
      8: 'NOT_STARTED',
    });
    setStepMessages({});

    try {
      // 1. STAGE 1: Document Upload Ingestion
      await new Promise((r) => setTimeout(r, 250));
      setStepStates((prev) => ({ ...prev, 1: 'COMPLETED' }));
      setStepMessages((prev) => ({ ...prev, 1: 'Document frame ingested at 300 DPI' }));

      // 2. STAGE 2: OCR Extraction
      setCurrentStep(2);
      setStepStates((prev) => ({ ...prev, 2: 'PROCESSING' }));
      setStepMessages((prev) => ({ ...prev, 2: 'Segmenting Visual Inspection Zone & MRZ stream' }));

      const ocrConfidenceMod = selectedScenario === 'low_ocr' ? 0.72 : 1.0;
      const ocrRes = await VerificationService.runOCR(
        documentData,
        documentData.type,
        ocrConfidenceMod,
        uploadedDocument?.file
      );

      const ocrStatus: PipelineStepStatus = ocrRes.qualityStatus === 'LOW' ? 'WARNING' : 'COMPLETED';
      setStepStates((prev) => ({ ...prev, 2: ocrStatus }));
      setStepMessages((prev) => ({ ...prev, 2: `${ocrRes.averageConfidence}% avg confidence` }));

      const updatedDoc = uploadedDocument
        ? VerificationService.applyOcrResultToDocument(documentData, ocrRes)
        : documentData;
      setDocumentData(updatedDoc);

      // Sync active session document and stage to backend
      try {
        await apiClient.updateSessionStage(currentActiveSession, 3, 'WAITING_NFC', {
          document: {
            documentNumber: updatedDoc.documentNumber,
            holderName: updatedDoc.holderName,
            dob: updatedDoc.dob,
            nationality: updatedDoc.nationality,
            expiryDate: updatedDoc.expiryDate,
            photoUrl: updatedDoc.photoBase64 || updatedDoc.photoUrl,
            photoBase64: updatedDoc.photoBase64,
          },
        });
      } catch (e) {
        console.warn('[PRAMAAN][Session] Backend sync deferred:', e);
      }

      // 3. STAGE 3 GATE: PAUSE PIPELINE. Wait for Mobile NFC Reader.
      setCurrentStep(3);
      setStepStates((prev) => ({ ...prev, 3: 'PROCESSING' }));
      setStepMessages((prev) => ({
        ...prev,
        3: 'Waiting for input from mobile device: NFC Credential Required',
      }));
      setPipelinePausedAt(3);

      addToast(
        'info',
        'Stage 3: NFC Credential Required',
        "Scan the document's NFC credential using the PRAMAAN NFC Reader."
      );
    } catch (err: any) {
      console.error('[Pipeline] Execution error at Stage 2:', err);
      const errorMessage = err instanceof Error ? err.message : 'OCR processing failed.';
      setStepStates((prev) => ({
        ...prev,
        2: 'FAILED',
      }));
      setStepMessages((prev) => ({
        ...prev,
        2: errorMessage,
      }));
      addToast('error', 'OCR Processing Failed', errorMessage);
      setIsSimulating(false);
      setPipelinePausedAt(null);
    }
  };

  // Stage 4 & 5: Resume after Stage 3 NFC -> Validation -> Issuer + Tampering -> Pause at Stage 6 (Face)
  const handleResumeAfterNfc = useCallback(async (receivedNfc: NfcResult) => {
    // Guard: ignore stale NFC evidence that belongs to a different or completed session
    if (receivedNfc.sessionId && receivedNfc.sessionId !== activeSessionIdRef.current) {
      console.warn('[Pipeline] Ignored stale NFC evidence from session:', receivedNfc.sessionId, 'active:', activeSessionIdRef.current);
      return;
    }

    setNfcResult(receivedNfc);
    setPipelinePausedAt(null);

    const nfcStatus: PipelineStepStatus = receivedNfc.status === 'PASS' ? 'COMPLETED' : 'WARNING';
    setStepStates((prev) => ({ ...prev, 3: nfcStatus }));
    setStepMessages((prev) => ({
      ...prev,
      3: receivedNfc.readStatus === 'SUCCESS' ? 'Chip credential verified' : 'NFC cross-check mismatch',
    }));

    if (receivedNfc.readStatus === 'MISMATCH') {
      addToast(
        'warning',
        'NFC Mismatch Flagged',
        'Printed text contradicts digitally signed NFC chip record.'
      );
    } else {
      addToast('success', 'NFC Credential Received', 'Cryptographic offline chip verified.');
    }

    try {
      // 4. STAGE 4: Document Validation
      setCurrentStep(4);
      setStepStates((prev) => ({ ...prev, 4: 'PROCESSING' }));
      setStepMessages((prev) => ({ ...prev, 4: 'Executing document field & chronological validation' }));

      const isExpiredScenario = selectedScenario === 'expired';

      const validationRes = await VerificationService.validateDocument(documentData, {
        forceExpired: isExpiredScenario,
      });

      const valStatus: PipelineStepStatus =
        validationRes.overallStatus === 'FAIL'
          ? 'FAILED'
          : validationRes.overallStatus === 'WARNING'
          ? 'WARNING'
          : 'COMPLETED';

      setStepStates((prev) => ({ ...prev, 4: valStatus }));
      setStepMessages((prev) => ({
        ...prev,
        4: `${validationRes.passedCount}/${validationRes.rulesChecked} rules passed`,
      }));

      // 5. STAGE 5: Issuer + Tampering Analysis
      setCurrentStep(5);
      setStepStates((prev) => ({ ...prev, 5: 'PROCESSING' }));
      setStepMessages((prev) => ({ ...prev, 5: 'Querying synthetic reference database & AI vision forensics' }));

      const issuerRes = await VerificationService.verifyIssuer(documentData, {
        forceExpired: isExpiredScenario,
      });
      const tamperingRes = await VerificationService.analyzeTampering(documentData, {
        file: uploadedDocument?.file,
        sessionId: activeSessionIdRef.current,
      });

      const isIssuerProblem =
        issuerRes.registryStatus === 'EXPIRED' ||
        issuerRes.registryStatus === 'REVOKED' ||
        issuerRes.registryStatus === 'BLACKLISTED' ||
        issuerRes.registryStatus === 'NOT_FOUND' ||
        issuerRes.registryStatus === 'MISMATCH';
      const isTamperProblem = tamperingRes.tamperingScore >= 30;

      const tampStatus: PipelineStepStatus =
        tamperingRes.reasonCodes?.includes('AI_SERVICE_UNAVAILABLE')
          ? 'WARNING'
          : tamperingRes.tamperingScore >= 60 ||
            issuerRes.registryStatus === 'NOT_FOUND' ||
            issuerRes.registryStatus === 'BLACKLISTED' ||
            issuerRes.registryStatus === 'MISMATCH'
          ? 'FAILED'
          : isIssuerProblem || isTamperProblem
          ? 'WARNING'
          : 'COMPLETED';

      setStepStates((prev) => ({ ...prev, 5: tampStatus }));
      setStepMessages((prev) => ({
        ...prev,
        5: tamperingRes.reasonCodes?.includes('AI_SERVICE_UNAVAILABLE')
          ? 'AI Forensic Vision Unavailable'
          : `Tamper score: ${tamperingRes.tamperingScore}/100 (${tamperingRes.verdict.replace(/_/g, ' ')})`,
      }));

      setTamperingResult(tamperingRes);

      const intermediateDocWithForensics: DocumentData = {
        ...documentData,
        validationItems: ValidationEngine.toLegacyValidationItems(validationRes),
        issuerItems: IssuerService.toLegacyIssuerItems(issuerRes),
        referenceComparison: issuerRes.referenceComparison,
        suspiciousElements: TamperingService.toLegacySuspiciousElements(tamperingRes),
      };
      setDocumentData(intermediateDocWithForensics);

      // Tell backend session we are now at Stage 6 (WAITING_FACE)
      try {
        await apiClient.updateSessionStage(activeSessionIdRef.current, 6, 'WAITING_FACE');
      } catch (e) {
        console.warn('[PRAMAAN][Session] Backend sync deferred:', e);
      }

      // 6. STAGE 6 GATE: PAUSE PIPELINE. Wait for Mobile Live Face Photo.
      setCurrentStep(6);
      setStepStates((prev) => ({ ...prev, 6: 'PROCESSING' }));
      setStepMessages((prev) => ({
        ...prev,
        6: 'Waiting for live photo from mobile device: Face Verification Required',
      }));
      setPipelinePausedAt(6);

      addToast(
        'info',
        'Stage 6: Face Verification Required',
        'Waiting for live photo from mobile device camera.'
      );
    } catch (err: any) {
      console.error('[Pipeline] Error in Stage 4/5:', err);
      setIsSimulating(false);
      setPipelinePausedAt(null);
    }
  }, [documentData, selectedScenario, addToast]);

  // Stage 7 & 8: Resume after Stage 6 Face -> Evidence Fusion + Risk Assessment -> Verification Complete
  const handleResumeAfterFace = useCallback(async (receivedFace: FaceResult) => {
    // Guard: ignore stale Face evidence that belongs to a different or completed session
    if (receivedFace.sessionId && receivedFace.sessionId !== activeSessionIdRef.current) {
      console.warn('[Pipeline] Ignored stale Face evidence from session:', receivedFace.sessionId, 'active:', activeSessionIdRef.current);
      return;
    }

    setFaceResult(receivedFace);
    setPipelinePausedAt(null);

    const faceStatus: PipelineStepStatus =
      receivedFace.status === 'FAIL' ? 'FAILED' : receivedFace.status === 'REVIEW' ? 'WARNING' : 'COMPLETED';
    setStepStates((prev) => ({ ...prev, 6: faceStatus }));
    setStepMessages((prev) => ({
      ...prev,
      6: `${receivedFace.matchScore}% similarity (Liveness: ${receivedFace.liveness})`,
    }));

    addToast('success', 'Face Verification Received', `Biometric match: ${receivedFace.matchScore}%`);

    try {
      // 7. STAGE 7: Evidence Fusion + Risk Assessment
      setCurrentStep(7);
      setStepStates((prev) => ({ ...prev, 7: 'PROCESSING' }));
      setStepMessages((prev) => ({
        ...prev,
        7: 'Fusing evidence graph & calculating mathematical risk score',
      }));

      const scenarioToUse = uploadedDocument ? undefined : selectedScenario;
      const finalResult = await VerificationService.runVerification(
        {
          ...documentData,
          livePhotoUrl: receivedFace.livePhotoUrl || documentData.livePhotoUrl,
          faceMatchScore: receivedFace.matchScore,
          faceMatchStatus: receivedFace.status === 'PASS' ? 'Faces match' : 'Biometric review required',
        },
        scenarioToUse,
        undefined,
        uploadedDocument?.file,
        nfcResult || undefined,
        receivedFace,
        tamperingResult || undefined
      );

      setVerificationResult(finalResult);
      setRiskResult(finalResult.risk);
      setDocumentData(finalResult.document);
      setProcessingTime(finalResult.document.processingTime);

      setStepStates((prev) => ({
        ...prev,
        7: 'COMPLETED',
        8: finalResult.status === 'FAILED' ? 'FAILED' : finalResult.status === 'WARNING' ? 'WARNING' : 'COMPLETED',
      }));
      setStepMessages((prev) => ({
        ...prev,
        7: `Risk Score: ${finalResult.risk.score}/100 (${finalResult.risk.level})`,
        8: `Verification ${finalResult.status}`,
      }));

      // 8. STAGE 8: Complete
      setCurrentStep(8);

      try {
        await apiClient.updateSessionStage(activeSessionIdRef.current, 8, 'VERIFICATION_COMPLETE');
      } catch (e) {
        console.warn('[PRAMAAN][Session] Complete stage sync deferred:', e);
      }

      if (finalResult.status === 'FAILED') {
        addToast(
          'error',
          'Verification Flagged',
          finalResult.recommendations[0] || 'Anomalies detected in document screening.'
        );
      } else if (finalResult.status === 'WARNING') {
        addToast(
          'warning',
          'Verification Review Required',
          finalResult.recommendations[0] || 'Verification requires supervisory review.'
        );
      } else {
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.8 } });
        addToast(
          'success',
          'Verification Cleared',
          'All document and identity checks passed within normal thresholds.'
        );
      }
    } catch (err: any) {
      console.error('[Pipeline] Error in Stage 7/8:', err);
    } finally {
      setIsSimulating(false);
    }
  }, [documentData, nfcResult, tamperingResult, selectedScenario, uploadedDocument, addToast]);

  // Mobile Polling & Gate Synchronization Effect
  useEffect(() => {
    let isCancelled = false;

    const pollSession = async () => {
      try {
        const res = await apiClient.getCurrentSession();
        if (res?.data && !isCancelled) {
          const sess = res.data;

          // Only sync if session belongs to active desktop verification session
          if (sess.sessionId === activeSessionIdRef.current) {
            setPhoneConnected(Boolean(sess.phoneConnected));

            // If pipeline is paused at Stage 3, check if NFC data arrived for this session
            if (
              pipelinePausedAt === 3 &&
              sess.nfcResult &&
              (!sess.nfcResult.sessionId || sess.nfcResult.sessionId === activeSessionIdRef.current)
            ) {
              handleResumeAfterNfc(sess.nfcResult);
            }

            // If pipeline is paused at Stage 6, check if Face data arrived for this session
            if (
              pipelinePausedAt === 6 &&
              sess.faceResult &&
              (!sess.faceResult.sessionId || sess.faceResult.sessionId === activeSessionIdRef.current)
            ) {
              handleResumeAfterFace(sess.faceResult);
            }
          } else if (!activeSessionIdRef.current) {
            setSessionId(sess.sessionId);
            activeSessionIdRef.current = sess.sessionId;
            setPhoneConnected(Boolean(sess.phoneConnected));
          }
        }
      } catch {
        // Backend offline or running standalone
      }
    };

    const interval = setInterval(pollSession, 1400);
    pollSession();

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [pipelinePausedAt, handleResumeAfterNfc, handleResumeAfterFace]);

  // Fallback / Demonstration Triggers for NFC & Face
  const handleSimulateNfc = async (forceTampered: boolean = false) => {
    addToast('info', 'Simulating NFC Credential...', forceTampered ? 'Injecting DOB mismatch' : 'Injecting clean chip payload');
    const currentActiveSession = activeSessionIdRef.current;
    try {
      const res = await apiClient.verifyNfc({
        sessionId: currentActiveSession,
        printedData: documentData,
        nfcData: JSON.stringify({
          documentId: documentData.documentNumber,
          name: documentData.holderName,
          dob: forceTampered ? '14/02/1998' : documentData.dob,
          nationality: documentData.nationality || 'IND',
          expiry: documentData.expiryDate,
        }),
      });
      if (pipelinePausedAt === 3) {
        handleResumeAfterNfc(res);
      } else {
        setNfcResult(res);
      }
    } catch {
      // Local fallback
      const localResult: NfcResult = {
        sessionId: currentActiveSession,
        documentNumber: documentData.documentNumber,
        moduleName: 'NFC-Based Prototype Credential Verification',
        isPrototype: true,
        disclaimer: 'DEMO / PROTOTYPE MODULE: Demonstrates secure NFC cross-verification.',
        readStatus: forceTampered ? 'MISMATCH' : 'SUCCESS',
        nfcPayload: {
          documentId: documentData.documentNumber,
          name: documentData.holderName,
          dob: forceTampered ? '14/02/1998' : documentData.dob,
          nationality: documentData.nationality || 'IND',
          expiry: documentData.expiryDate,
          issuerId: 'IN-GOV-AUTH-091',
          version: 'NFC-CRED-2.1',
          timestamp: new Date().toISOString(),
          integrityHash: 'sha256:4d8a67ef8b9012a9bc763189d201cba643890f91a92e4071190bcda6129841b5',
        },
        crossVerification: {
          documentIdMatch: true,
          nameMatch: true,
          dobMatch: !forceTampered,
          nationalityMatch: true,
          expiryMatch: true,
        },
        integrityVerified: true,
        status: forceTampered ? 'WARNING' : 'PASS',
        explanation: forceTampered
          ? `NFC CROSS-VERIFICATION MISMATCH: Printed DOB (${documentData.dob}) does not match digitally signed NFC chip DOB (14/02/1998).`
          : 'All printed optical fields match cryptographically signed NFC chip records.',
      };
      if (pipelinePausedAt === 3) {
        handleResumeAfterNfc(localResult);
      } else {
        setNfcResult(localResult);
      }
    }
  };

  const handleSimulateFace = async (forceMismatch: boolean = false) => {
    addToast('info', 'Testing Face Biometrics...', forceMismatch ? 'Testing non-matching face specimen' : 'Testing matching live selfie specimen');
    const currentActiveSession = activeSessionIdRef.current;

    // Use real decodable image inputs: document portrait + live test specimen
    const docPhoto = uploadedDocument?.file || documentData.photoBase64 || documentData.photoUrl || '/images/passport_photo.jpg';
    const livePhoto = forceMismatch ? '/images/admin_mehta.jpg' : '/images/live_capture.jpg';

    try {
      const realFaceResult = await FaceService.verify(docPhoto, livePhoto, {
        sessionId: currentActiveSession,
        file: uploadedDocument?.file,
      });

      if (pipelinePausedAt === 6) {
        handleResumeAfterFace(realFaceResult);
      } else {
        setFaceResult(realFaceResult);
      }
    } catch (err: any) {
      console.error('[Face] Face test execution failed:', err);
      addToast('error', 'Face Verification Error', err.message || 'Failed to verify face');
    }
  };

  const handleRequestFaceCapture = async () => {
    try {
      await apiClient.requestFaceCapture(activeSessionIdRef.current);
      addToast(
        'info',
        'Face Capture Broadcasted',
        'Sent live camera activation signal to connected mobile device.'
      );
    } catch {
      addToast('info', 'Face Capture Triggered', 'Waiting for live capture.');
    }
  };

  // Initial verification state preparation so detailed report modal has content immediately
  // Upload / Replace Image Handler
  const handleFileUpload = useCallback(
    async (file: File) => {
      // 1. Clean up prior object URL to prevent memory leaks
      cleanupObjectUrl();

      // 2. Generate browser object URL for preview
      const previewUrl = URL.createObjectURL(file);
      activeObjectUrlRef.current = previewUrl;

      // 3. Create UploadedDocument state
      const newDocRecord: UploadedDocument = {
        file,
        previewUrl,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type || 'image/jpeg',
        documentType: activeType,
        status: 'READY',
        uploadedAt: new Date().toISOString(),
      };
      setUploadedDocument(newDocRecord);

      // 4. Construct real document input for VerificationService
      let photoBase64: string | undefined;
      try {
        photoBase64 = await readFileAsBase64(file);
      } catch (readErr) {
        console.warn('[PRAMAAN] Could not read uploaded file as base64:', readErr);
      }

      const documentInput = VerificationService.createDocumentInputFromUpload(
        file,
        previewUrl,
        activeType,
        VerificationService.getDocumentData(activeType)
      );
      if (photoBase64) {
        documentInput.photoBase64 = photoBase64;
      }
      setDocumentData(documentInput);
      setInvestigationStatus('unflagged');

      // 5. Initialize isolated verification session on backend and frontend (Step 2 & 5)
      await startNewVerificationSession(documentInput);

      // 6. Reset pipeline to READY status (8 stages)
      setCurrentStep(1);
      setStepStates({
        1: 'COMPLETED',
        2: 'NOT_STARTED',
        3: 'NOT_STARTED',
        4: 'NOT_STARTED',
        5: 'NOT_STARTED',
        6: 'NOT_STARTED',
        7: 'NOT_STARTED',
        8: 'NOT_STARTED',
      });
      setNfcResult(null);
      setFaceResult(null);
      setRiskResult(null);
      setVerificationResult(null);
      setTamperingResult(null);
      setPipelinePausedAt(null);
      setStepMessages({ 1: `Ingested ${file.name} (${(file.size / 1024).toFixed(1)} KB)` });

      addToast(
        'success',
        'Document Ready for Verification',
        `${file.name} loaded. Click 'Run Pipeline' to verify.`
      );

      setActiveNav('dashboard');
    },
    [activeType, cleanupObjectUrl, startNewVerificationSession, addToast]
  );

  // Remove / Reset Uploaded Document
  const handleResetDocument = useCallback(async () => {
    cleanupObjectUrl();
    setUploadedDocument(null);
    setNfcResult(null);
    setFaceResult(null);
    setRiskResult(null);
    setVerificationResult(null);
    setTamperingResult(null);
    setPipelinePausedAt(null);
    setIsSimulating(false);
    const baseline = VerificationService.getDocumentData(activeType);
    setDocumentData(baseline);
    setInvestigationStatus('unflagged');
    await startNewVerificationSession(baseline);
    setCurrentStep(1);
    setStepStates({
      1: 'NOT_STARTED',
      2: 'NOT_STARTED',
      3: 'NOT_STARTED',
      4: 'NOT_STARTED',
      5: 'NOT_STARTED',
      6: 'NOT_STARTED',
      7: 'NOT_STARTED',
      8: 'NOT_STARTED',
    });
    setStepMessages({});
    addToast('info', 'Document Removed', `Restored default ${activeType.toUpperCase()} template.`);
  }, [activeType, cleanupObjectUrl, startNewVerificationSession, addToast]);

  // Camera Scan Capture (unified with File Upload)
  const handleCameraCapture = (file: File) => {
    addToast('info', 'Optical Scan Acquired', `Ingesting optical scan: ${file.name}`);
    handleFileUpload(file);
  };

  // Action: Save to Records (Saves and then clears active verification cleanly)
  const handleSaveToRecords = () => {
    if (verificationResult) {
      VerificationService.saveVerificationRecord(
        verificationResult,
        'Inspector A. Verma (SSB-41)',
        'SSB Checkpoint A-14',
        'SAVED'
      );
    }
    addToast(
      'success',
      'Saved to Investigation Records',
      `Record #${documentData.documentNumber || 'PRM'} archived in checkpoint registry.`
    );
    // End and clear active verification session
    handleClear();
  };

  // Action: Flag for Investigation
  const handleFlagForInvestigation = () => {
    setInvestigationStatus('flagged');
    if (verificationResult) {
      VerificationService.saveVerificationRecord(
        verificationResult,
        'Inspector A. Verma (SSB-41)',
        'SSB Checkpoint A-14',
        'FLAGGED'
      );
    }
    addToast(
      'warning',
      'FLAGGED FOR INVESTIGATION',
      `Case escalated to Senior Supervisor. Alert broadcast to Checkpoint A.`
    );
  };

  // Action: Clear / Reset
  const handleClear = () => {
    cleanupObjectUrl();
    setVerificationResult(null);
    setUploadedDocument(null);
    setNfcResult(null);
    setFaceResult(null);
    setRiskResult(null);
    setTamperingResult(null);
    setPipelinePausedAt(null);
    setIsSimulating(false);
    const baseline = VerificationService.getDocumentData(activeType);
    setDocumentData(baseline);
    setInvestigationStatus('unflagged');
    setCurrentStep(1);
    setStepStates({
      1: 'NOT_STARTED',
      2: 'NOT_STARTED',
      3: 'NOT_STARTED',
      4: 'NOT_STARTED',
      5: 'NOT_STARTED',
      6: 'NOT_STARTED',
      7: 'NOT_STARTED',
      8: 'NOT_STARTED',
    });
    setStepMessages({});
    setProcessingTime('0.0 seconds');
    addToast('info', 'Console Reset', 'Ready for next document screening.');
  };

  // Select historical record from Past Records
  const handleSelectPastRecord = (rec: VerificationRecord) => {
    setIsPastRecordsOpen(false);
    if (rec.scenarioId) {
      handleScenarioChange(rec.scenarioId as DemoScenarioId);
    }
    setIsReportModalOpen(true);
    addToast('info', 'Loaded Archived Record', `Dossier #${rec.verificationId}`);
  };

  if (currentPortal === 'authority') {
    return (
      <>
        <AuthorityDashboard
          onSwitchToInvestigator={() => handleSwitchPortal('investigator')}
          onShowToast={(title, desc) => addToast('info', title, desc)}
        />
        <ToastContainer toasts={toasts} onDismiss={removeToast} />
      </>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F5F7FA] text-[#14213D] font-sans antialiased">

      <Sidebar
        activeNav={activeNav}
        setActiveNav={handleNavClick}
        onNewVerification={() => {
          setActiveNav('new_verification');
        }}
        onSwitchToAuthority={() => handleSwitchPortal('authority')}
      />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">

        <Header
          investigationStatus={investigationStatus}
          phoneConnected={phoneConnected}
          sessionId={sessionId}
        />

        {isNewVerification ? (
          /* =====================================================
             NEW VERIFICATION — UPLOAD SCREEN
             ===================================================== */
          <main className="flex-1 overflow-y-auto px-5 py-6">

            <div className="max-w-4xl mx-auto">

              <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-wider text-[#1677E8]">
                  PRAMAAN / New Verification
                </p>

                <h1 className="text-2xl font-bold text-slate-900 mt-1">
                  Start New Verification
                </h1>

                <p className="text-sm text-slate-500 mt-1">
                  Upload a document image to prepare it for AI-powered screening.
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">

                <div className="mb-5">
                  <h2 className="text-sm font-bold text-slate-800">
                    Upload Identity / Travel Document
                  </h2>

                  <p className="text-xs text-slate-500 mt-1">
                    Supported formats: JPG, JPEG, PNG and WEBP. Maximum file size: 2 MB.
                  </p>
                </div>

                <DocumentUploadCard
                  data={documentData}
                  activeType={activeType}
                  uploadedDocument={uploadedDocument}
                  selectedScenario={selectedScenario}
                  onScenarioChange={undefined}
                  onTypeChange={handleTypeChange}
                  onImageReplace={handleFileUpload}
                  onResetDocument={handleResetDocument}
                  onStartVerification={undefined}
                  isSimulating={false}
                  onScanWithCamera={() => setIsCameraModalOpen(true)}
                  allowUpload={true}
                />

                {uploadedDocument && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
                    <span className="text-xs text-blue-800 font-medium">
                      Active verification session exists for <strong>{uploadedDocument.fileName}</strong>.
                    </span>
                    <button
                      onClick={() => setActiveNav('dashboard')}
                      className="text-xs font-semibold text-blue-700 hover:text-blue-900 bg-white border border-blue-300 px-2.5 py-1 rounded-lg cursor-pointer"
                    >
                      Return to Dashboard →
                    </button>
                  </div>
                )}

                <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">

                  <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
                    <div className="text-xs font-bold text-blue-800">
                      STEP 1
                    </div>
                    <div className="text-sm font-semibold text-slate-800 mt-1">
                      Upload
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Select a clear document image.
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                    <div className="text-xs font-bold text-slate-600">
                      STEP 2
                    </div>
                    <div className="text-sm font-semibold text-slate-800 mt-1">
                      Review
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Review the uploaded document on the dashboard.
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                    <div className="text-xs font-bold text-slate-600">
                      STEP 3
                    </div>
                    <div className="text-sm font-semibold text-slate-800 mt-1">
                      Run Pipeline
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Manually start OCR and AI verification.
                    </p>
                  </div>

                </div>

                <div className="mt-5 p-4 rounded-xl bg-amber-50 border border-amber-200">
                  <div className="flex items-start gap-3">
                    <div className="text-amber-600 text-lg">
                      ⓘ
                    </div>

                    <div>
                      <p className="text-xs font-bold text-amber-800">
                        AI processing does not start during upload
                      </p>

                      <p className="text-xs text-amber-700 mt-1">
                        Uploading only prepares the document. OCR, validation,
                        tampering analysis, and face verification
                        start only after you manually click
                        <strong> Run Pipeline</strong> on the dashboard.
                      </p>
                    </div>
                  </div>
                </div>

              </div>

            </div>

          </main>

        ) : (

          /* =====================================================
             EXISTING DASHBOARD
             ===================================================== */
          <main className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

            <PipelineProgress
              currentStep={currentStep}
              stepStates={stepStates}
              stepMessages={stepMessages}
              processingTime={processingTime}
              isSimulating={isSimulating}
              onStartSimulation={handleStartSimulation}
              onStepClick={(step) => setCurrentStep(step)}
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">

              <div className="lg:col-span-4 h-full flex flex-col">

                <DocumentUploadCard
                  data={documentData}
                  activeType={activeType}
                  uploadedDocument={uploadedDocument}
                  selectedScenario={selectedScenario}
                  onScenarioChange={undefined}
                  onTypeChange={handleTypeChange}
                  onImageReplace={handleFileUpload}
                  onResetDocument={handleResetDocument}
                  onStartVerification={handleStartSimulation}
                  isSimulating={isSimulating}
                  onScanWithCamera={() => setIsCameraModalOpen(true)}
                  allowUpload={false}
                />

              </div>

              <div className="lg:col-span-4 space-y-4">

                <OcrExtractionCard
                  fields={documentData.ocrFields}
                  mrzLine={documentData.mrzLine2 || documentData.mrzLine1}
                  qualityStatus={verificationResult?.ocr?.qualityStatus}
                  averageConfidence={verificationResult?.ocr?.averageConfidence}
                />

                <NfcVerificationCard
                  nfcResult={nfcResult || verificationResult?.nfcVerification}
                  stepStatus={stepStates[3] || 'NOT_STARTED'}
                  phoneConnected={phoneConnected}
                  sessionId={sessionId}
                  onSimulateNfc={handleSimulateNfc}
                />

                <DocumentValidationCard items={documentData.validationItems} />

              </div>

              <div className="lg:col-span-4 space-y-4">

                <IssuerVerificationCard
                  items={documentData.issuerItems}
                  referenceComparison={documentData.referenceComparison}
                  documentNumber={documentData.documentNumber}
                />

                <TamperingAnalysisCard
                  data={documentData}
                  onInspectElement={() => setIsReportModalOpen(true)}
                />

                <FaceVerificationCard
                  data={documentData}
                  faceResult={stepStates[6] === 'COMPLETED' || stepStates[6] === 'WARNING' || stepStates[6] === 'FAILED' ? faceResult : null}
                  stepStatus={stepStates[6] || 'NOT_STARTED'}
                  phoneConnected={phoneConnected}
                  sessionId={sessionId}
                  onRequestCapture={handleRequestFaceCapture}
                  onSimulateFace={handleSimulateFace}
                />

                <RiskAssessmentCard
                  data={documentData}
                  riskResult={stepStates[7] === 'COMPLETED' || stepStates[7] === 'WARNING' || stepStates[7] === 'FAILED' ? riskResult : null}
                  stepStatus={stepStates[7] || 'NOT_STARTED'}
                  onOpenReport={() => setIsReportModalOpen(true)}
                />

              </div>

            </div>

            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 pt-1 pb-2">

              <AiSummaryCard summary={documentData.aiSummary} />

              <ActionButtons
                investigationStatus={investigationStatus}
                onSaveToRecords={handleSaveToRecords}
                onFlagForInvestigation={handleFlagForInvestigation}
                onClear={handleClear}
              />

            </div>

          </main>
        )}

      </div>

      <DetailedReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        data={documentData}
        verificationResult={verificationResult}
      />

      <CameraScanModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCapture={handleCameraCapture}
      />

      <PastRecordsModal
        isOpen={isPastRecordsOpen}
        onClose={() => setIsPastRecordsOpen(false)}
        onSelectRecord={handleSelectPastRecord}
      />

      <ToastContainer
        toasts={toasts}
        onDismiss={removeToast}
      />

    </div>
  );
}

export default App;
