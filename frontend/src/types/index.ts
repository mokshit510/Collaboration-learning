export type DocumentType = 'passport' | 'visa' | 'other';

export type PipelineStepId = 
  | 'upload' 
  | 'ocr' 
  | 'validation' 
  | 'issuer' 
  | 'tampering' 
  | 'face' 
  | 'risk' 
  | 'complete';

export interface PipelineStep {
  id: number;
  key: PipelineStepId;
  label: string;
  status: 'completed' | 'current' | 'pending';
}

export interface OcrField {
  label: string;
  value: string;
  confidence: number;
  valid: boolean;
}

export interface ValidationItem {
  id: string;
  label: string;
  status: string;
  valid: boolean;
  detail?: string;
}

export interface IssuerItem {
  id: string;
  label: string;
  status: string;
  valid: boolean;
  detail?: string;
}

export interface SuspiciousElement {
  id: string;
  title: string;
  confidenceLevel: 'High confidence' | 'Medium confidence' | 'Low confidence';
  severity: 'high' | 'medium' | 'low';
  description: string;
  location?: string;
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
}

export type InvestigationStatus = 'unflagged' | 'flagged' | 'saved';
