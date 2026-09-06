import { useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import type {
  DocumentData,
  DocumentType,
  InvestigationStatus,
  VerificationResult,
  PipelineStepStatus,
  DemoScenarioId,
  VerificationRecord,
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
import { RiskAssessmentCard } from './components/RiskAssessmentCard';
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
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);

  // Pipeline Step & Data-driven states
  const [currentStep, setCurrentStep] = useState<number>(7);
  const [stepStates, setStepStates] = useState<Record<number, PipelineStepStatus>>({
    1: 'COMPLETED',
    2: 'COMPLETED',
    3: 'WARNING',
    4: 'COMPLETED',
    5: 'FAILED',
    6: 'COMPLETED',
    7: 'WARNING',
    8: 'NOT_STARTED',
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
    setActiveNav(navId);
    if (navId === 'past_records') {
      setIsPastRecordsOpen(true);
    }
  };

  // Switch Document Type
  const handleTypeChange = (type: DocumentType) => {
    setActiveType(type);
    const data = VerificationService.getDocumentData(type);
    setDocumentData(data);
    setProcessingTime(data.processingTime);
    setInvestigationStatus('unflagged');
    addToast('info', `Switched to ${type.toUpperCase()} Record`, `Loaded ${data.title}`);
  };

  // Switch Demo Scenario
  const handleScenarioChange = (scenarioId: DemoScenarioId) => {
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

    // Reset step states
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
      const result = await VerificationService.runVerification(
        documentData,
        selectedScenario,
        (stepIndex, _stepName, status, details) => {
          setCurrentStep(stepIndex);
          setStepStates((prev) => ({ ...prev, [stepIndex]: status }));
          if (details) {
            setStepMessages((prev) => ({ ...prev, [stepIndex]: details }));
          }
        }
      );

      setVerificationResult(result);
      setDocumentData(result.document);
      setProcessingTime(result.document.processingTime);
      setCurrentStep(8);

      if (result.risk.score >= 60) {
        addToast(
          'warning',
          'High Risk Anomalies Detected',
          `Risk Score: ${result.risk.score}/100. ${result.recommendations[0]}`
        );
      } else if (result.risk.score >= 30) {
        addToast(
          'warning',
          'Medium Risk — Review Required',
          `Risk Score: ${result.risk.score}/100. Verification requires supervisory review.`
        );
      } else {
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.8 } });
        addToast(
          'success',
          'Verification Cleared',
          `All checks passed within normal thresholds (Risk: ${result.risk.score}/100).`
        );
      }
    } catch (err) {
      console.error('[Pipeline] Execution error:', err);
      addToast('error', 'Pipeline Error', 'Verification pipeline interrupted.');
    } finally {
      setIsSimulating(false);
    }
  };

  // Initial verification state preparation so detailed report modal has content immediately
  useEffect(() => {
    let isMounted = true;
    VerificationService.runVerification(documentData, selectedScenario).then((res) => {
      if (isMounted) {
        setVerificationResult(res);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [selectedScenario, documentData]);

  // Upload / Replace Image Handler
  const handleImageReplace = async (file: File) => {
    try {
      const uploadRes = await VerificationService.uploadDocument(file);
      setDocumentData((prev) => ({
        ...prev,
        photoUrl: uploadRes.url,
      }));
      addToast('success', 'New Document Uploaded', file.name);
      handleStartSimulation();
    } catch (err) {
      console.error('[Upload] Failed:', err);
      addToast('error', 'Upload Failed', 'Could not process document image.');
    }
  };

  // Camera Scan Capture
  const handleCameraCapture = () => {
    addToast('success', 'Camera Scan Captured', 'Optical scan acquired at 300 DPI');
    handleStartSimulation();
  };

  // Action: Save to Records
  const handleSaveToRecords = () => {
    setInvestigationStatus('saved');
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
      `Record #${documentData.documentNumber} archived in checkpoint registry.`
    );
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
      {/* 1. Dark Navy Sidebar (Left) */}
      <Sidebar
        activeNav={activeNav}
        setActiveNav={handleNavClick}
        onNewVerification={() => {
          handleClear();
          setActiveNav('dashboard');
        }}
        onSwitchToAuthority={() => handleSwitchPortal('authority')}
      />

      {/* 2. Main Workspace Layout (Right) */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header */}
        <Header investigationStatus={investigationStatus} />

        {/* Scrollable Workspace */}
        <main className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Top Verification Pipeline Card */}
          <PipelineProgress
            currentStep={currentStep}
            stepStates={stepStates}
            stepMessages={stepMessages}
            processingTime={processingTime}
            isSimulating={isSimulating}
            onStartSimulation={handleStartSimulation}
            onStepClick={(step) => setCurrentStep(step)}
          />

          {/* Main 3-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* COLUMN 1: Document Upload / Viewer (4 cols) */}
            <div className="lg:col-span-4 h-full flex flex-col">
              <DocumentUploadCard
                data={documentData}
                activeType={activeType}
                selectedScenario={selectedScenario}
                onScenarioChange={handleScenarioChange}
                onTypeChange={handleTypeChange}
                onImageReplace={handleImageReplace}
                onScanWithCamera={() => setIsCameraModalOpen(true)}
              />
            </div>

            {/* COLUMN 2: OCR, Validation, Issuer (4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              <OcrExtractionCard fields={documentData.ocrFields} />
              <DocumentValidationCard items={documentData.validationItems} />
              <IssuerVerificationCard items={documentData.issuerItems} />
            </div>

            {/* COLUMN 3: Tampering Analysis, Face Verification, Risk Assessment (4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              <TamperingAnalysisCard
                data={documentData}
                onInspectElement={() => setIsReportModalOpen(true)}
              />
              <FaceVerificationCard data={documentData} />
              <RiskAssessmentCard
                data={documentData}
                onOpenReport={() => setIsReportModalOpen(true)}
              />
            </div>
          </div>

          {/* BOTTOM ROW: AI Summary + Action Buttons */}
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
      </div>

      {/* Modals & Overlays */}
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

      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}

export default App;
