export type DocumentType = 'passport' | 'visa' | 'other';

export type UploadState = 'IDLE' | 'SELECTED' | 'VALIDATING' | 'READY' | 'ERROR';

export interface UploadedDocument {
  file: File;
  previewUrl: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  documentType: DocumentType;
  status: UploadState;
  errorMessage?: string;
  uploadedAt: string;
}

export type PipelineStepId = 
  | 'upload' 
  | 'ocr' 
  | 'validation' 
  | 'issuer' 
  | 'tampering' 
  | 'face' 
  | 'risk' 
  | 'complete';

export type PipelineStepStatus = 'NOT_STARTED' | 'PROCESSING' | 'COMPLETED' | 'WARNING' | 'FAILED';

export interface PipelineStep {
  id: number;
  key: PipelineStepId;
  label: string;
  status: PipelineStepStatus;
  message?: string;
}

export interface OcrField {
  label: string;
  value: string;
  confidence: number;
  valid: boolean;
  status?: 'PASS' | 'WARNING' | 'FAIL';
  confidenceSource?: string;
  lowConfidence?: boolean;
}

export interface ValidationItem {
  id: string;
  label: string;
  status: string;
  valid: boolean;
  detail?: string;
  severity?: 'PASS' | 'WARNING' | 'FAIL';
}

export interface IssuerItem {
  id: string;
  label: string;
  status: string;
  valid: boolean;
  detail?: string;
  severity?: 'PASS' | 'WARNING' | 'FAIL';
}

export interface SuspiciousElement {
  id: string;
  title: string;
  confidenceLevel: 'High confidence' | 'Medium confidence' | 'Low confidence';
  severity: 'high' | 'medium' | 'low';
  description: string;
  location?: string;
  reasonCode?: string;
}

export interface RiskContributor {
  category: string;
  points: number;
  description: string;
}

export interface DocumentData {
  type: DocumentType;
  title: string;
  documentNumber: string;
  holderName: string;
  givenName: string;
  surname: string;
  nationality: string;
  dob: string;
  gender: string;
  placeOfBirth: string;
  issueDate: string;
  expiryDate: string;
  countryCode: string;
  mrzLine1: string;
  mrzLine2: string;
  photoUrl: string;
  livePhotoUrl: string;
  ocrFields: OcrField[];
  validationItems: ValidationItem[];
  issuerItems: IssuerItem[];
  suspiciousElements: SuspiciousElement[];
  faceMatchScore: number;
  faceMatchStatus: string;
  riskScore: number;
  riskLevel: 'LOW RISK' | 'MEDIUM RISK' | 'HIGH RISK';
  riskDescription: string;
  riskContributors: RiskContributor[];
  aiSummary: string;
  processingTime: string;
  isUserUploaded?: boolean;
  rawImagePreviewUrl?: string;
  uploadedFile?: {
    name: string;
    size: number;
    type: string;
    lastModified?: number;
  };
}

export type InvestigationStatus = 'unflagged' | 'flagged' | 'saved';

// ========================================================
// CENTRAL STRUCTURED VERIFICATION RESULT ARCHITECTURE
// ========================================================

export interface OcrResult {
  fields: OcrField[];
  mrzParsed: {
    documentType: string;
    issuingCountry: string;
    holderName: string;
    documentNumber: string;
    nationality: string;
    dob: string;
    gender: string;
    expiryDate: string;
    optionalData?: string;
    compositeChecksumValid: boolean;
    // MRZ metadata extensions
    surname?: string;
    givenName?: string;
    givenNames?: string;
    mrzDetected?: boolean;
    mrzComplete?: boolean;
    line1?: string;
    line2?: string;
    checksumStatus?: Record<string, string>;
    checksumValidation?: Record<string, string>;
    checksumDetails?: Record<string, boolean>;
    parseWarnings?: string[];
  };
  rawText?: string;
  averageConfidence: number;
  qualityStatus: 'OPTIMAL' | 'MODERATE' | 'LOW';
  confidenceSource?: string;
  mrz?: Record<string, unknown>;
  mrzValidation?: Record<string, unknown>;
  vizDetected?: boolean;
  vizFields?: OcrField[];
  vizWarnings?: string[];
  validation?: Array<{
    field: string;
    value: string;
    status: string;
    message: string;
  }>;
  warnings?: string[];
}

export interface ValidationRuleCheck {
  id: string;
  ruleName: string;
  field: string;
  status: 'PASS' | 'WARNING' | 'FAIL';
  explanation: string;
}

export interface ValidationResult {
  overallStatus: 'PASS' | 'WARNING' | 'FAIL';
  rulesChecked: number;
  passedCount: number;
  warningCount: number;
  failedCount: number;
  checks: ValidationRuleCheck[];
  mrzChecksumDetails: {
    docNumberValid: boolean;
    dobValid: boolean;
    expiryValid: boolean;
    compositeValid: boolean;
  };
}

export interface IssuerResult {
  isSimulated: boolean;
  disclaimer: string;
  documentFound: boolean;
  registryStatus: 'ACTIVE' | 'REVOKED' | 'EXPIRED' | 'SUSPENDED' | 'NOT_FOUND';
  issuerMatch: boolean;
  issuingAuthority: string;
  digitalSignatureValid: boolean;
  blacklistStatus: 'CLEAN' | 'FLAGGED';
  identityMatch: boolean;
  timestamp: string;
  source: string;
}

export interface TamperingIndicator {
  id: string;
  title: string;
  severity: 'high' | 'medium' | 'low';
  confidence: number;
  confidenceLabel: 'High confidence' | 'Medium confidence' | 'Low confidence';
  location: string;
  description: string;
  reasonCode: string;
}

export interface TamperingResult {
  isSimulated: boolean;
  modelIdentifier: string;
  tamperingScore: number; // 0 to 100
  verdict: 'NO_TAMPERING_DETECTED' | 'LOW_TAMPERING_SUSPICION' | 'EVIDENT_TAMPERING';
  confidence: number;
  indicators: TamperingIndicator[];
  suspiciousRegions: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    label: string;
    severity: 'high' | 'medium' | 'low';
  }>;
  reasonCodes: string[];
}

export interface FaceResult {
  matchScore: number;
  confidence: number;
  liveness: 'PASS' | 'REVIEW' | 'FAIL';
  documentFaceDetected: boolean;
  liveFaceDetected: boolean;
  status: 'PASS' | 'REVIEW' | 'FAIL';
  statusExplanation: string;
}

export interface NfcCredentialPayload {
  documentId: string;
  name: string;
  dob: string;
  nationality: string;
  expiry: string;
  issuerId: string;
  version: string;
  timestamp: string;
  integrityHash: string;
}

export interface NfcResult {
  moduleName: string;
  isPrototype: boolean;
  disclaimer: string;
  readStatus: 'SUCCESS' | 'MISMATCH' | 'UNREADABLE' | 'SKIPPED';
  nfcPayload?: NfcCredentialPayload;
  crossVerification: {
    documentIdMatch: boolean;
    nameMatch: boolean;
    dobMatch: boolean;
    nationalityMatch: boolean;
    expiryMatch: boolean;
  };
  integrityVerified: boolean;
  status: 'PASS' | 'WARNING' | 'FAIL';
  explanation: string;
}

export interface ReferenceSecurityCheck {
  featureName: string;
  expectedPattern: string;
  detectedStatus: 'VERIFIED' | 'VARIANCE_DETECTED' | 'NOT_APPLICABLE';
  description: string;
}

export interface ReferenceResult {
  moduleName: string;
  referenceStandard: string; // e.g., "PRADO-style Reference Engine (v2026.1)"
  referenceCountry: string;
  documentType: string;
  referenceAvailable: boolean;
  layoutMatch: 'MATCHED' | 'VARIANCE_DETECTED';
  photoRegionMatch: 'MATCHED' | 'VARIANCE_DETECTED';
  mrzRegionMatch: 'MATCHED' | 'VARIANCE_DETECTED';
  securityFeatureChecks: ReferenceSecurityCheck[];
  anomalies: string[];
  confidence: number;
  source: string;
  status: 'PASS' | 'WARNING' | 'FAIL';
}

export interface WatchlistResult {
  isSimulated: boolean;
  screeningSource: string;
  documentNumberChecked: string;
  identityChecked: string;
  status: 'NO_MATCH' | 'MATCH_FOUND' | 'REVIEW';
  matchCount: number;
  hits?: Array<{
    listName: string;
    referenceId: string;
    reason: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
    actionRequired: string;
  }>;
  explanation: string;
}

export interface RiskFactor {
  category: string;
  weight: number;
  pointsAdded: number;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export interface RiskResult {
  score: number; // 0 to 100
  level: 'LOW' | 'MEDIUM' | 'HIGH';
  factors: RiskFactor[];
  explanation: string;
  recommendation: 'Likely clear — Standard processing' | 'Manual review recommended' | 'Detailed forensic inspection recommended';
}

export interface EvidenceItem {
  id: string;
  vector: 'OCR' | 'Validation' | 'Issuer' | 'Tampering' | 'Face' | 'NFC' | 'Reference' | 'Watchlist';
  status: 'PASS' | 'WARNING' | 'FAIL';
  impactPoints: number;
  summary: string;
  technicalFinding: string;
}

export interface AuditTrailEntry {
  id: string;
  stepNumber: number;
  stepName: string;
  timestamp: string;
  durationMs: number;
  status: 'COMPLETED' | 'WARNING' | 'FAILED';
  details: string;
}

export interface VerificationResult {
  verificationId: string;
  status: 'COMPLETED' | 'WARNING' | 'FAILED' | 'PROCESSING';
  documentType: DocumentType;
  timestamp: string;
  document: DocumentData;
  ocr: OcrResult;
  validation: ValidationResult;
  issuerVerification: IssuerResult;
  tampering: TamperingResult;
  faceVerification: FaceResult;
  nfcVerification: NfcResult;
  referenceComparison: ReferenceResult;
  watchlist: WatchlistResult;
  risk: RiskResult;
  evidence: EvidenceItem[];
  recommendations: string[];
  auditTrail: AuditTrailEntry[];
}

export interface VerificationRecord {
  verificationId: string;
  timestamp: string;
  documentType: DocumentType;
  maskedDocumentNumber: string;
  holderName: string;
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'CLEARED' | 'FLAGGED' | 'SAVED' | 'UNDER_REVIEW';
  investigator: string;
  location: string;
  keyFindings: string[];
  evidenceSummary: string;
  scenarioId?: string;
}

export type DemoScenarioId = 'genuine' | 'tampered' | 'expired' | 'watchlist' | 'low_ocr';

export interface DemoScenario {
  id: DemoScenarioId;
  name: string;
  badge: string;
  description: string;
  targetRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  documentData: DocumentData;
}
