export type AuthorityNavId =
  | 'overview'
  | 'verification_records'
  | 'high_risk_cases'
  | 'investigators'
  | 'watchlist_management'
  | 'analytics_reports'
  | 'audit_logs'
  | 'system_settings';

export interface AuthorityStats {
  totalVerifications: {
    value: number;
    formatted: string;
    trend: number;
    trendPeriod: string;
  };
  highRiskCases: {
    value: number;
    formatted: string;
    trend: number;
    trendPeriod: string;
  };
  activeInvestigators: {
    value: number;
    formatted: string;
    trend: number;
    trendPeriod: string;
  };
  clearedDocuments: {
    value: number;
    formatted: string;
    trend: number;
    trendPeriod: string;
  };
}

export interface VerificationTrendPoint {
  date: string;
  totalVerifications: number;
  highRiskCases: number;
}

export interface RiskDistributionSegment {
  level: 'High Risk' | 'Medium Risk' | 'Low Risk';
  count: number;
  percentage: number;
  color: string;
}

export interface RiskDistributionData {
  total: number;
  segments: RiskDistributionSegment[];
}

export interface DocumentTypeSegment {
  type: 'Passport' | 'Visa' | 'Other';
  percentage: number;
  color: string;
}

export interface HighRiskCase {
  id: string; // e.g. '#PR-8421'
  name: string;
  documentType: 'Passport' | 'Visa' | 'Other';
  riskScore: number;
  reason: string;
  status: 'Flagged' | 'Under Review' | 'Cleared';
  timestamp?: string;
  checkpoint?: string;
  assignedTo?: string;
  details?: string;
}

export interface LocationVerification {
  id: string;
  name: string;
  count: number;
  dotColor: string;
  coordinates?: { x: number; y: number }; // percentage coordinates on map
}

export interface InvestigatorRecord {
  id: string; // e.g. 'INV-001'
  name: string;
  checkpoint: string;
  verifications: number;
  lastActive: string;
  status: 'Online' | 'Away' | 'Offline';
  avatar?: string;
  email?: string;
}

export interface SystemActivityItem {
  id: string;
  title: string;
  subtitle: string;
  timestamp: string;
  type: 'alert' | 'user' | 'warning' | 'success';
}
