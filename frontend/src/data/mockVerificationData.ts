import type { DocumentData } from '../types';

export const mockPassportData: DocumentData = {
  type: 'passport',
  title: 'REPUBLIC OF INDIA PASSPORT',
  documentNumber: 'T1234587',
  holderName: 'RAHUL SHARMA',
  givenName: 'RAHUL',
  surname: 'SHARMA',
  nationality: 'INDIAN',
  dob: '15/01/2005',
  gender: 'MALE',
  placeOfBirth: 'PUNE',
  issueDate: '15/01/2025',
  expiryDate: '14/01/2035',
  countryCode: 'IND',
  mrzLine1: 'P<INDSHARMA<<RAHUL<<<<<<<<<<<<<<<<<<<<<<<<<<<',
  mrzLine2: 'T1234587<3IND0501150M3501140<<<<<<<<<<<<<<<6',
  photoUrl: '/images/passport_photo.jpg',
  livePhotoUrl: undefined,
  processingTime: '0.0 seconds',
  
  ocrFields: [
    { label: 'Full Name', value: 'RAHUL SHARMA', confidence: 99.4, valid: true },
    { label: 'Passport No.', value: 'T1234587', confidence: 98.9, valid: true },
    { label: 'Nationality', value: 'INDIAN', confidence: 99.8, valid: true },
    { label: 'Date of Birth', value: '15/01/2005', confidence: 97.6, valid: true },
    { label: 'Gender', value: 'MALE', confidence: 99.1, valid: true },
    { label: 'Place of Birth', value: 'PUNE', confidence: 98.5, valid: true },
    { label: 'Date of Issue', value: '15/01/2025', confidence: 98.2, valid: true },
    { label: 'Date of Expiry', value: '14/01/2035', confidence: 99.0, valid: true },
  ],

  validationItems: [
    { id: 'format', label: 'Document Format', status: 'Valid', valid: true, detail: 'ICAO 9303 compliant TD3 format detected' },
    { id: 'mrz', label: 'MRZ Consistency', status: 'Matched', valid: true, detail: 'Check digits match visual inspection zone' },
    { id: 'fields', label: 'Field Validations', status: 'Valid', valid: true, detail: 'Character encoding and syntax verified' },
    { id: 'expiry', label: 'Expiry Check', status: 'Valid', valid: true, detail: 'Document valid for more than 6 months' },
    { id: 'required', label: 'Required Fields', status: 'Present', valid: true, detail: 'All 14 mandatory security fields present' },
  ],

  issuerItems: [
    { id: 'db_lookup', label: 'Passport No. in Database', status: 'Found', valid: true, detail: 'Record matched in simulated central registry' },
    { id: 'status', label: 'Status', status: 'Active', valid: true, detail: 'Document status active and unrevoked' },
    { id: 'blacklist', label: 'Blacklist Check', status: 'Not Found', valid: true, detail: 'Clean record across INTERPOL & national watchlists' },
    { id: 'issuer_match', label: 'Issuer Match', status: 'Valid', valid: true, detail: 'RPO Delhi digital signature verified' },
  ],

  suspiciousElements: [],
  riskContributors: [],
  aiSummary: 'Awaiting pipeline execution. Ingest a document and click "Run Pipeline" to perform verification.',
};

export const mockVisaData: DocumentData = {
  type: 'visa',
  title: 'REPUBLIC OF INDIA E-VISA / STICKER',
  documentNumber: 'V9842104',
  holderName: 'RAHUL SHARMA',
  givenName: 'RAHUL',
  surname: 'SHARMA',
  nationality: 'INDIAN',
  dob: '14/02/1999',
  gender: 'MALE',
  placeOfBirth: 'NEW DELHI',
  issueDate: '15/03/2023',
  expiryDate: '14/03/2028',
  countryCode: 'IND',
  mrzLine1: 'VNINDSHARMA<<RAHUL<<<<<<<<<<<<<<<<<<<<<<<<<<<',
  mrzLine2: 'V9842104<8IND9902145M2803145<<<<<<<<<<<<<<<',
  photoUrl: '/images/passport_photo.jpg',
  livePhotoUrl: undefined,
  processingTime: '0.0 seconds',
  
  ocrFields: [
    { label: 'Full Name', value: 'RAHUL SHARMA', confidence: 99.6, valid: true },
    { label: 'Visa No.', value: 'V9842104', confidence: 99.2, valid: true },
    { label: 'Visa Type', value: 'BUSINESS / MULTIPLE ENTRY', confidence: 99.0, valid: true },
    { label: 'Date of Birth', value: '14/02/1999', confidence: 98.8, valid: true },
    { label: 'Gender', value: 'MALE', confidence: 99.4, valid: true },
    { label: 'Associated Passport', value: 'T1234567', confidence: 98.7, valid: true },
    { label: 'Date of Issue', value: '15/03/2023', confidence: 98.9, valid: true },
    { label: 'Date of Expiry', value: '14/03/2028', confidence: 99.1, valid: true },
  ],

  validationItems: [
    { id: 'format', label: 'Document Format', status: 'Valid', valid: true, detail: 'ICAO Format B Visa sticker verified' },
    { id: 'mrz', label: 'MRZ Consistency', status: 'Matched', valid: true, detail: 'Visual data matches OCR check digits' },
    { id: 'fields', label: 'Field Validations', status: 'Valid', valid: true, detail: 'Visa entry constraints authenticated' },
    { id: 'expiry', label: 'Expiry Check', status: 'Valid', valid: true, detail: 'Visa valid for 18 months' },
    { id: 'required', label: 'Required Fields', status: 'Present', valid: true, detail: 'All consular security seals present' },
  ],

  issuerItems: [
    { id: 'db_lookup', label: 'Visa No. in Database', status: 'Found', valid: true, detail: 'Found in simulated consular visa database' },
    { id: 'status', label: 'Status', status: 'Active', valid: true, detail: 'Valid multi-entry permit' },
    { id: 'blacklist', label: 'Blacklist Check', status: 'Not Found', valid: true, detail: 'No immigration adverse notices' },
    { id: 'issuer_match', label: 'Issuer Match', status: 'Valid', valid: true, detail: 'Embassy key signature authenticated' },
  ],

  suspiciousElements: [],
  riskContributors: [],
  aiSummary: 'Awaiting pipeline execution. Ingest a document and click "Run Pipeline" to perform verification.',
};

export const mockOtherDocData: DocumentData = {
  type: 'other',
  title: 'SEAFARER CONTINUOUS DISCHARGE CERTIFICATE',
  documentNumber: 'CDC-902188',
  holderName: 'RAHUL SHARMA',
  givenName: 'RAHUL',
  surname: 'SHARMA',
  nationality: 'INDIAN',
  dob: '14/02/1999',
  gender: 'MALE',
  placeOfBirth: 'NEW DELHI',
  issueDate: '22/08/2021',
  expiryDate: '21/08/2031',
  countryCode: 'IND',
  mrzLine1: 'ISIND902188<<7<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<',
  mrzLine2: '9902145M3108214IND<<<<<<<<<<<<<<9',
  photoUrl: '/images/passport_photo.jpg',
  livePhotoUrl: undefined,
  processingTime: '0.0 seconds',

  ocrFields: [
    { label: 'Full Name', value: 'RAHUL SHARMA', confidence: 98.4, valid: true },
    { label: 'Certificate No.', value: 'CDC-902188', confidence: 97.9, valid: true },
    { label: 'Rank / Grade', value: 'DECK OFFICER', confidence: 98.1, valid: true },
    { label: 'Date of Birth', value: '14/02/1999', confidence: 97.5, valid: true },
    { label: 'Gender', value: 'MALE', confidence: 99.0, valid: true },
    { label: 'Place of Issue', value: 'MUMBAI PORT', confidence: 98.2, valid: true },
    { label: 'Date of Issue', value: '22/08/2021', confidence: 97.8, valid: true },
    { label: 'Date of Expiry', value: '21/08/2031', confidence: 98.9, valid: true },
  ],

  validationItems: [
    { id: 'format', label: 'Document Format', status: 'Valid', valid: true, detail: 'Maritime Authority standard booklet' },
    { id: 'mrz', label: 'MRZ Consistency', status: 'Matched', valid: true, detail: 'ILO Convention 185 compliant MRZ' },
    { id: 'fields', label: 'Field Validations', status: 'Valid', valid: true, detail: 'Maritime discharge stamp verified' },
    { id: 'expiry', label: 'Expiry Check', status: 'Valid', valid: true, detail: 'Valid for maritime service' },
    { id: 'required', label: 'Required Fields', status: 'Present', valid: true, detail: 'Biometric chip reference present' },
  ],

  issuerItems: [
    { id: 'db_lookup', label: 'Doc No. in Database', status: 'Found', valid: true, detail: 'Directorate General of Shipping record matched' },
    { id: 'status', label: 'Status', status: 'Active', valid: true, detail: 'Active seaman discharge book' },
    { id: 'blacklist', label: 'Blacklist Check', status: 'Not Found', valid: true, detail: 'No maritime infractions recorded' },
    { id: 'issuer_match', label: 'Issuer Match', status: 'Valid', valid: true, detail: 'Port officer verification valid' },
  ],

  suspiciousElements: [],
  riskContributors: [],
  aiSummary: 'Awaiting pipeline execution. Ingest a document and click "Run Pipeline" to perform verification.',
};
