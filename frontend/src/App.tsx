import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import type {
  DocumentData,
  DocumentType,
  InvestigationStatus,
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

  const handleSwitchPortal = (portal: 'authority' | 'investigator') => {
    setCurrentPortal(portal);
    window.location.hash = portal;
    addToast(
      'info',
      `Switched to ${portal === 'authority' ? 'Authority Portal' : 'Investigator Console'}`,
      'Active session view updated.'
    );
  };

  // Document & Verification State
  const [activeType, setActiveType] = useState<DocumentType>('passport');
  const [documentData, setDocumentData] = useState<DocumentData>(mockPassportData);
  
  // Pipeline Step: Default to 7 (Risk Assessment) to match the reference image 1:1
  const [currentStep, setCurrentStep] = useState<number>(7);
  const [processingTime, setProcessingTime] = useState<string>('12.4 seconds');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // Status & Modals
  const [investigationStatus, setInvestigationStatus] = useState<InvestigationStatus>('unflagged');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Toast Helper
  const addToast = (type: ToastMessage['type'], title: string, description?: string) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, type, title, description }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
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

  // Simulated Full Pipeline Runner
  const handleStartSimulation = async () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setCurrentStep(1);
    setInvestigationStatus('unflagged');

    const startTime = performance.now();

    try {
      await VerificationService.runPipelineSimulation(activeType, (step) => {
        setCurrentStep(step);
      });

      const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);
      setProcessingTime(`${elapsed} seconds`);
      setCurrentStep(8); // Completed

      if (documentData.riskScore > 50) {
        addToast(
          'warning',
          'High Risk Anomalies Detected',
          'Document contains forensic inconsistencies. Manual inspection recommended.'
        );
      } else {
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.8 } });
        addToast('success', 'Verification Complete', 'All checks passed within normal thresholds.');
      }
    } catch (err) {
      addToast('error', 'Pipeline Error', 'Verification pipeline interrupted.');
    } finally {
      setIsSimulating(false);
    }
  };

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
    } catch (e) {
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
    addToast(
      'success',
      'Saved to Investigation Records',
      `Record #${documentData.documentNumber} archived in checkpoint registry.`
    );
  };

  // Action: Flag for Investigation
  const handleFlagForInvestigation = () => {
    setInvestigationStatus('flagged');
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
    setProcessingTime('0.0 seconds');
    addToast('info', 'Console Reset', 'Ready for next document screening.');
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
        setActiveNav={setActiveNav}
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
      />

      <CameraScanModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCapture={handleCameraCapture}
      />

      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}

export default App;
