import type {
  AuthorityStats,
  VerificationTrendPoint,
  RiskDistributionData,
  DocumentTypeSegment,
  HighRiskCase,
  LocationVerification,
  InvestigatorRecord,
  SystemActivityItem,
} from '../types/authority';

export const authorityStats: AuthorityStats = {
  totalVerifications: {
    value: 1248,
    formatted: '1,248',
    trend: 12,
    trendPeriod: 'vs. last week',
  },
  highRiskCases: {
    value: 87,
    formatted: '87',
    trend: 28,
    trendPeriod: 'vs. last week',
  },
  activeInvestigators: {
    value: 15,
    formatted: '15',
    trend: 7,
    trendPeriod: 'vs. last week',
  },
  clearedDocuments: {
    value: 1161,
    formatted: '1,161',
    trend: 10,
    trendPeriod: 'vs. last week',
  },
};

export const verificationTrendData: VerificationTrendPoint[] = [
  { date: 'Aug 30', totalVerifications: 72, highRiskCases: 16 },
  { date: 'Aug 31', totalVerifications: 88, highRiskCases: 19 },
  { date: 'Sep 01', totalVerifications: 110, highRiskCases: 32 },
  { date: 'Sep 02', totalVerifications: 82, highRiskCases: 23 },
  { date: 'Sep 03', totalVerifications: 122, highRiskCases: 27 },
  { date: 'Sep 04', totalVerifications: 106, highRiskCases: 21 },
  { date: 'Sep 05', totalVerifications: 178, highRiskCases: 29 },
];

export const riskDistributionData: RiskDistributionData = {
  total: 1248,
  segments: [
    {
      level: 'High Risk',
      count: 87,
      percentage: 7,
      color: '#EF4444', // Red
    },
    {
      level: 'Medium Risk',
      count: 184,
      percentage: 15,
      color: '#F59E0B', // Amber
    },
    {
      level: 'Low Risk',
      count: 977,
      percentage: 78,
      color: '#10B981', // Green
    },
  ],
};

export const documentTypeDistribution: DocumentTypeSegment[] = [
  {
    type: 'Passport',
    percentage: 68,
    color: '#1D4ED8', // Dark Royal Blue
  },
  {
    type: 'Visa',
    percentage: 24,
    color: '#38BDF8', // Light Blue / Sky
  },
  {
    type: 'Other',
    percentage: 8,
    color: '#94A3B8', // Slate / Gray
  },
];

export const recentHighRiskCases: HighRiskCase[] = [
  {
    id: '#PR-8421',
    name: 'Alex Johnson',
    documentType: 'Passport',
    riskScore: 92,
    reason: 'Photo Manipulation',
    status: 'Flagged',
    timestamp: '10 mins ago',
    checkpoint: 'Delhi (IGI) Airport — Terminal 3',
    assignedTo: 'Anita Sharma (INV-001)',
    details: 'Digital boundary discontinuity along photo portrait perimeter. Edge pixel density variance exceeds forensic threshold of 14.8%.',
  },
  {
    id: '#PR-8420',
    name: 'Maria Silva',
    documentType: 'Visa',
    riskScore: 88,
    reason: 'Text Inconsistency',
    status: 'Under Review',
    timestamp: '24 mins ago',
    checkpoint: 'Mumbai Checkpoint — Counter 4',
    assignedTo: 'Vikram Singh (INV-002)',
    details: 'Kerning and sub-pixel alignment irregularity detected in Date of Birth (DOB) and Consular stamp signature blocks.',
  },
  {
    id: '#PR-8419',
    name: 'Chen Wei',
    documentType: 'Passport',
    riskScore: 85,
    reason: 'Issuer Mismatch',
    status: 'Flagged',
    timestamp: '42 mins ago',
    checkpoint: 'Kolkata Immigration Hub',
    assignedTo: 'Priya Nair (INV-003)',
    details: 'Document issuing authority digital key failed validation with central simulated simulated registry certificate list.',
  },
  {
    id: '#PR-8418',
    name: 'Ahmed Khan',
    documentType: 'Passport',
    riskScore: 81,
    reason: 'Tampering Detected',
    status: 'Under Review',
    timestamp: '1 hour ago',
    checkpoint: 'Chennai International Terminal',
    assignedTo: 'Priya Nair (INV-003)',
    details: 'Double JPEG compression grid detected around nationality field and security watermark boundary.',
  },
  {
    id: '#PR-8417',
    name: 'Sara Ali',
    documentType: 'Visa',
    riskScore: 79,
    reason: 'Suspicious Elements',
    status: 'Flagged',
    timestamp: '1 hour 25 mins ago',
    checkpoint: 'Delhi (IGI) Airport — Terminal 3',
    assignedTo: 'Anita Sharma (INV-001)',
    details: 'Micro-text resolution degradation and holographic foil dispersion variance detected under simulated UV illumination.',
  },
];

export const locationVerifications: LocationVerification[] = [
  {
    id: 'delhi',
    name: 'Delhi (IGI)',
    count: 412,
    dotColor: '#2563EB',
    coordinates: { x: 38, y: 32 },
  },
  {
    id: 'mumbai',
    name: 'Mumbai',
    count: 286,
    dotColor: '#2563EB',
    coordinates: { x: 27, y: 58 },
  },
  {
    id: 'kolkata',
    name: 'Kolkata',
    count: 148,
    dotColor: '#2563EB',
    coordinates: { x: 74, y: 46 },
  },
  {
    id: 'chennai',
    name: 'Chennai',
    count: 98,
    dotColor: '#2563EB',
    coordinates: { x: 48, y: 78 },
  },
  {
    id: 'bengaluru',
    name: 'Bengaluru',
    count: 76,
    dotColor: '#2563EB',
    coordinates: { x: 39, y: 73 },
  },
  {
    id: 'hyderabad',
    name: 'Hyderabad',
    count: 64,
    dotColor: '#2563EB',
    coordinates: { x: 42, y: 61 },
  },
  {
    id: 'others',
    name: 'Others',
    count: 164,
    dotColor: '#94A3B8',
  },
];

export const activeInvestigators: InvestigatorRecord[] = [
  {
    id: 'INV-001',
    name: 'Anita Sharma',
    checkpoint: 'Delhi (IGI)',
    verifications: 142,
    lastActive: '5 mins ago',
    status: 'Online',
    email: 'a.sharma@pramaan.gov.demo',
  },
  {
    id: 'INV-002',
    name: 'Vikram Singh',
    checkpoint: 'Mumbai',
    verifications: 128,
    lastActive: '12 mins ago',
    status: 'Online',
    email: 'v.singh@pramaan.gov.demo',
  },
  {
    id: 'INV-003',
    name: 'Priya Nair',
    checkpoint: 'Chennai',
    verifications: 96,
    lastActive: '28 mins ago',
    status: 'Away',
    email: 'p.nair@pramaan.gov.demo',
  },
  {
    id: 'INV-004',
    name: 'Rahul Desai',
    checkpoint: 'Bengaluru',
    verifications: 88,
    lastActive: '1 hour ago',
    status: 'Offline',
    email: 'r.desai@pramaan.gov.demo',
  },
];

export const systemActivityFeed: SystemActivityItem[] = [
  {
    id: 'act-1',
    title: 'New high-risk case flagged',
    subtitle: 'Passport • Tampering detected',
    timestamp: '5 mins ago',
    type: 'alert',
  },
  {
    id: 'act-2',
    title: 'Investigator login',
    subtitle: 'Vikram Singh (INV-002)',
    timestamp: '12 mins ago',
    type: 'user',
  },
  {
    id: 'act-3',
    title: 'Watchlist updated',
    subtitle: '3 new entries added',
    timestamp: '1 hour ago',
    type: 'warning',
  },
  {
    id: 'act-4',
    title: 'System health check',
    subtitle: 'All services operational',
    timestamp: '2 hours ago',
    type: 'success',
  },
];
