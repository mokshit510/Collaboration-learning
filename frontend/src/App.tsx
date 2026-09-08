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
import { apiClient } from './services/apiClient';
import type { NfcResult, FaceResult } from './types';

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
    1: 'COMPLETED',
    2: 'COMPLETED',
    3: 'COMPLETED',
    4: 'COMPLETED',
    5: 'COMPLETED',
    6: 'COMPLETED',
    7: 'COMPLETED',
    8: 'COMPLETED',
  });
  const [stepMessages, setStepMessages] = useState<Record<number, string>>({});
  const [processingTime, setProcessingTime] = useState<string>('12.4 seconds');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // Phone Connection & Mobile Gate States
  const [sessionId, setSessionId] = useState<string>('PRM-20260908-1832');
  const [phoneConnected, setPhoneConnected] = useState<boolean>(false);
  const [nfcResult, setNfcResult] = useState<NfcResult | null>(null);
  const [faceResult, setFaceResult] = useState<FaceResult | null>(null);
  const [pipelinePausedAt, setPipelinePausedAt] = useState<3 | 6 | null>(null);

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
  const handleTypeChange = (type: DocumentType) => {
    setActiveType(type);
    if (uploadedDocument && uploadedDocument.file) {
      setUploadedDocument((prev) => (prev ? { ...prev, documentType: type } : null));
      setDocumentData((prev) => ({
        ...prev,
        type,
        title: `${type.toUpperCase()} — ${uploadedDocument.fileName}`,
      }));
      addToast('info', `Classification: ${type.toUpperCase()}`, 'Updated document classification for verification.');
    } else {
      const data = VerificationService.getDocumentData(type);
      setDocumentData(data);
      setProcessingTime(data.processingTime);
      setInvestigationStatus('unflagged');
      addToast('info', `Switched to ${type.toUpperCase()} Record`, `Loaded ${data.title}`);
    }
  };

  // Switch Demo Scenario
  const handleScenarioChange = (scenarioId: DemoScenarioId) => {
    cleanupObjectUrl();
    setUploadedDocument(null);
    setSelectedScenario(scenarioId);
    setNfcResult(null);
    setFaceResult(null);
    setPipelinePausedAt(null);
    const data = VerificationService.getScenarioData(scenarioId);
    setActiveType(data.type);
    setDocumentData(data);
    setInvestigationStatus('unflagged');
    setCurrentStep(1);
    addToast('info', `Loaded Scenario: ${scenarioId.toUpperCase()}`, data.title);
  };

  // ============================================================================
  // SEQUENTIAL 8-STAGE PIPELINE RUNNER WITH REAL PAUSE GATES (STAGE 3 & STAGE 6)
  // ============================================================================

  // Stage 1 & 2: Upload -> OCR -> Pause at Stage 3 (NFC Required)
  const handleStartSimulation = async () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setCurrentStep(1);
    setInvestigationStatus('unflagged');
    setNfcResult(null);
    setFaceResult(null);
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
        await apiClient.updateSessionStage(sessionId, 3, 'WAITING_NFC', {
          document: {
            documentNumber: updatedDoc.documentNumber,
            holderName: updatedDoc.holderName,
            dob: updatedDoc.dob,
            nationality: updatedDoc.nationality,
            expiryDate: updatedDoc.expiryDate,
            photoUrl: updatedDoc.photoUrl,
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
      setStepMessages((prev) => ({ ...prev, 4: 'Executing ICAO 9303 checksums & chronological validation' }));

      const isTamperedScenario = selectedScenario === 'tampered';
      const isExpiredScenario = selectedScenario === 'expired';

      const validationRes = await VerificationService.validateDocument(documentData, {
        forceExpired: isExpiredScenario,
        forceMismatchedMrz: isTamperedScenario,
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
        forceTampered: isTamperedScenario,
        forceClean: selectedScenario === 'genuine',
      });

      const isIssuerProblem =
        issuerRes.registryStatus === 'EXPIRED' ||
        issuerRes.registryStatus === 'REVOKED' ||
        issuerRes.registryStatus === 'BLACKLISTED' ||
        issuerRes.registryStatus === 'NOT_FOUND';
      const isTamperProblem = tamperingRes.tamperingScore >= 30;

      const tampStatus: PipelineStepStatus =
        tamperingRes.tamperingScore >= 60 || issuerRes.registryStatus === 'NOT_FOUND' || issuerRes.registryStatus === 'BLACKLISTED'
          ? 'FAILED'
          : isIssuerProblem || isTamperProblem
          ? 'WARNING'
          : 'COMPLETED';

      setStepStates((prev) => ({ ...prev, 5: tampStatus }));
      setStepMessages((prev) => ({
        ...prev,
        5: `Tamper score: ${tamperingRes.tamperingScore}/100 (${tamperingRes.verdict})`,
      }));

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
        await apiClient.updateSessionStage(sessionId, 6, 'WAITING_FACE');
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
  }, [documentData, selectedScenario, sessionId, addToast]);

  // Stage 7 & 8: Resume after Stage 6 Face -> Evidence Fusion + Risk Assessment -> Verification Complete
  const handleResumeAfterFace = useCallback(async (receivedFace: FaceResult) => {
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
        receivedFace
      );

      setVerificationResult(finalResult);
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
        await apiClient.updateSessionStage(sessionId, 8, 'VERIFICATION_COMPLETE');
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
  }, [documentData, nfcResult, selectedScenario, sessionId, uploadedDocument, addToast]);

  // Mobile Polling & Gate Synchronization Effect
  useEffect(() => {
    let isCancelled = false;

    const pollSession = async () => {
      try {
        const res = await apiClient.getCurrentSession();
        if (res?.data && !isCancelled) {
          const sess = res.data;
          setSessionId(sess.sessionId);
          setPhoneConnected(Boolean(sess.phoneConnected));

          // If pipeline is paused at Stage 3, check if NFC data arrived
          if (pipelinePausedAt === 3 && sess.nfcResult) {
            handleResumeAfterNfc(sess.nfcResult);
          }

          // If pipeline is paused at Stage 6, check if Face data arrived
          if (pipelinePausedAt === 6 && sess.faceResult) {
            handleResumeAfterFace(sess.faceResult);
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
    try {
      const res = await apiClient.verifyNfc({
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
    addToast('info', 'Simulating Face Capture...', forceMismatch ? 'Injecting identity mismatch' : 'Injecting high likeness match');
    const simulatedFace: FaceResult = {
      matchScore: forceMismatch ? 32 : 94,
      confidence: forceMismatch ? 88.0 : 96.2,
      liveness: 'PASS',
      documentFaceDetected: true,
      liveFaceDetected: true,
      status: forceMismatch ? 'FAIL' : 'PASS',
      statusExplanation: forceMismatch
        ? 'Facial similarity (32%) falls well below biometric match threshold (75%). Identity mismatch suspected.'
        : 'Facial biometrics match across 68 landmark vectors. Active liveness confirmed.',
      livePhotoUrl: documentData.livePhotoUrl,
    };

    try {
      await apiClient.request('/v1/face/verify', {
        method: 'POST',
        body: JSON.stringify({
          sessionId,
          livePhoto: documentData.livePhotoUrl,
          forceMismatch,
        }),
      });
    } catch {
      // ignore
    }

    if (pipelinePausedAt === 6) {
      handleResumeAfterFace(simulatedFace);
    } else {
      setFaceResult(simulatedFace);
    }
  };

  const handleRequestFaceCapture = async () => {
    try {
      await apiClient.requestFaceCapture(sessionId);
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
  useEffect(() => {
    if (uploadedDocument) {
      return;
    }

    let isMounted = true;

    VerificationService.runVerification(
      documentData,
      selectedScenario
    ).then((res) => {
      if (isMounted) {
        setVerificationResult(res);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [selectedScenario, documentData, uploadedDocument]);

  // Upload / Replace Image Handler
  const handleFileUpload = useCallback(
    (file: File) => {
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
      const documentInput = VerificationService.createDocumentInputFromUpload(
        file,
        previewUrl,
        activeType,
        VerificationService.getDocumentData(activeType)
      );
      setDocumentData(documentInput);
      setInvestigationStatus('unflagged');

      // 5. Reset pipeline to READY status (8 stages)
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
      setPipelinePausedAt(null);
      setStepMessages({ 1: `Ingested ${file.name} (${(file.size / 1024).toFixed(1)} KB)` });

      addToast(
        'success',
        'Document Ready for Verification',
        `${file.name} loaded. Click 'Run Pipeline' to verify.`
      );

      setActiveNav('dashboard');
    },
    [activeType, cleanupObjectUrl, addToast]
  );

  // Remove / Reset Uploaded Document
  const handleResetDocument = useCallback(() => {
    cleanupObjectUrl();
    setUploadedDocument(null);
    setNfcResult(null);
    setFaceResult(null);
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
    addToast('info', 'Document Removed', `Restored default ${activeType.toUpperCase()} template.`);
  }, [activeType, cleanupObjectUrl, addToast]);

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
                  faceResult={faceResult || verificationResult?.faceVerification}
                  stepStatus={stepStates[6] || 'NOT_STARTED'}
                  phoneConnected={phoneConnected}
                  sessionId={sessionId}
                  onRequestCapture={handleRequestFaceCapture}
                  onSimulateFace={handleSimulateFace}
                />

                <RiskAssessmentCard
                  data={documentData}
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
