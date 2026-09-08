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
import { AiSummaryCard } from './components/AiSummaryCard';
import { ActionButtons } from './components/ActionButtons';
import { DetailedReportModal } from './components/DetailedReportModal';
import { CameraScanModal } from './components/CameraScanModal';
import { PastRecordsModal } from './components/PastRecordsModal';
import { ToastContainer, type ToastMessage } from './components/Toast';
import { AuthorityDashboard } from './pages/AuthorityDashboard';

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

  // Pipeline Step & Data-driven states (7 stages without Risk Assessment)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [stepStates, setStepStates] = useState<Record<number, PipelineStepStatus>>({
    1: 'COMPLETED',
    2: 'COMPLETED',
    3: 'WARNING',
    4: 'COMPLETED',
    5: 'FAILED',
    6: 'COMPLETED',
    7: 'NOT_STARTED',
  });
  const [stepMessages, setStepMessages] = useState<Record<number, string>>({});
  const [processingTime, setProcessingTime] = useState<string>('12.4 seconds');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

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
    const data = VerificationService.getScenarioData(scenarioId);
    setActiveType(data.type);
    setDocumentData(data);
    setInvestigationStatus('unflagged');
    setCurrentStep(1);
    addToast('info', `Loaded Scenario: ${scenarioId.toUpperCase()}`, data.title);
  };

  // Sequential Data-Driven Pipeline Runner
  const handleStartSimulation = async () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setCurrentStep(1);
    setInvestigationStatus('unflagged');

    // Reset step states (7 stages)
    setStepStates({
      1: 'PROCESSING',
      2: 'NOT_STARTED',
      3: 'NOT_STARTED',
      4: 'NOT_STARTED',
      5: 'NOT_STARTED',
      6: 'NOT_STARTED',
      7: 'NOT_STARTED',
    });
    setStepMessages({});

    try {
      const scenarioToUse = uploadedDocument ? undefined : selectedScenario;
      const result = await VerificationService.runVerification(
        documentData,
        scenarioToUse,
        (stepIndex, _stepName, status, details, intermediateDoc) => {
          setCurrentStep(stepIndex);
          setStepStates((prev) => ({
            ...prev,
            [stepIndex]: status
          }));

          if (details) {
            setStepMessages((prev) => ({
              ...prev,
              [stepIndex]: details
            }));
          }

          if (intermediateDoc) {
            setDocumentData(intermediateDoc);
          }
        },
        uploadedDocument?.file
      );

      setVerificationResult(result);
      setDocumentData(result.document);
      setProcessingTime(result.document.processingTime);
      setCurrentStep(7);

      if (result.status === 'FAILED') {
        addToast(
          'error',
          'Verification Flagged',
          result.recommendations[0] || 'Anomalies detected in document screening.'
        );
      } else if (result.status === 'WARNING') {
        addToast(
          'warning',
          'Verification Review Required',
          result.recommendations[0] || 'Verification requires supervisory review.'
        );
      } else {
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.8 } });
        addToast(
          'success',
          'Verification Cleared',
          'All document and identity checks passed within normal thresholds.'
        );
      }
    } catch (err) {
      console.error('[Pipeline] Execution error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Backend OCR service unavailable.';
      setStepStates((prev) => ({
        ...prev,
        2: 'FAILED',
      }));
      setStepMessages((prev) => ({
        ...prev,
        2: errorMessage,
      }));
      addToast('error', 'OCR Processing Failed', errorMessage);
    } finally {
      setIsSimulating(false);
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

      // 5. Reset pipeline to READY status (7 stages)
      setCurrentStep(1);
      setStepStates({
        1: 'COMPLETED',
        2: 'NOT_STARTED',
        3: 'NOT_STARTED',
        4: 'NOT_STARTED',
        5: 'NOT_STARTED',
        6: 'NOT_STARTED',
        7: 'NOT_STARTED',
      });
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

        <Header investigationStatus={investigationStatus} />

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
                />

                <DocumentValidationCard items={documentData.validationItems} />

                <IssuerVerificationCard items={documentData.issuerItems} />

              </div>

              <div className="lg:col-span-4 space-y-4">

                <TamperingAnalysisCard
                  data={documentData}
                  onInspectElement={() => setIsReportModalOpen(true)}
                />

                <FaceVerificationCard data={documentData} />

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
