/**
 * PRAMAAN Stage 7: Risk & Evidence Fusion Test Suite
 *
 * Validates deterministic, explainable risk scoring across all required scenarios:
 * - TEST 1: Clean Valid
 * - TEST 2: Expired
 * - TEST 3: Issuer Mismatch
 * - TEST 4: Blacklisted
 * - TEST 5: Not Found
 * - TEST 6: Tampered
 * - TEST 7: Face Fail
 * - TEST 8: Multiple Failures
 * - TEST 9: Mismatch is NOT Blacklist
 * - TEST 10: Expired is NOT Blacklist
 * - TEST 11: Document Validation completely devoid of ICAO 9303 MRZ Checksums
 * - TEST 12: Tampered scenario validation free of MRZ checksum tampering alert
 * - Additional: Face Review proportional scaling & weights verification
 */

import assert from 'node:assert';
import { EvidenceFusion } from '../src/services/evidenceFusion';
import { RiskEngine } from '../src/services/riskEngine';
import { ValidationEngine } from '../src/services/validationEngine';
import type {
  DocumentData,
  OcrResult,
  ValidationResult,
  IssuerResult,
  TamperingResult,
  FaceResult,
  NfcResult,
  ReferenceResult,
  WatchlistResult,
} from '../src/types';

// ============================================================================
// Fixture Helpers: Baseline Clean Verification Results
// ============================================================================

function createCleanDoc(): DocumentData {
  return {
    id: 'doc_clean_1',
    type: 'passport',
    title: 'REPUBLIC OF INDIA PASSPORT',
    documentNumber: 'T1234587',
    holderName: 'RAHUL SHARMA',
    givenName: 'RAHUL',
    surname: 'SHARMA',
    nationality: 'IND',
    dob: '15/01/2005',
    gender: 'M',
    issueDate: '15/01/2025',
    expiryDate: '14/01/2035',
    placeOfBirth: 'PUNE',
    countryCode: 'IND',
    mrzLine1: 'P<INDSHARMA<<RAHUL<<<<<<<<<<<<<<<<<<<<<<<<<<<',
    mrzLine2: 'T1234587<3IND0501150M3501140<<<<<<<<<<<<<<<6',
    riskScore: 0,
    riskLevel: 'LOW RISK',
    riskDescription: 'Clean authentic document.',
    riskContributors: [],
  };
}

function createCleanOcr(): OcrResult {
  return {
    rawText: 'P<INDSHARMA<<RAHUL<<<<<<<<<<<<<<<<<<<<<<<<<<<\nT1234587<3IND0501150M3501140<<<<<<<<<<<<<<<6',
    fields: [
      { fieldName: 'documentNumber', value: 'T1234587', confidence: 98, source: 'MRZ' },
      { fieldName: 'holderName', value: 'RAHUL SHARMA', confidence: 97, source: 'MRZ' },
      { fieldName: 'expiryDate', value: '14/01/2035', confidence: 99, source: 'MRZ' },
    ],
    averageConfidence: 98,
    qualityStatus: 'OPTIMAL',
    mrzParsed: {
      documentType: 'passport',
      issuingCountry: 'IND',
      holderName: 'RAHUL SHARMA',
      documentNumber: 'T1234587',
      nationality: 'IND',
      dob: '15/01/2005',
      gender: 'M',
      expiryDate: '14/01/2035',
      compositeChecksumValid: true,
      documentNumberChecksumValid: true,
      dobChecksumValid: true,
      expiryChecksumValid: true,
    },
  };
}

function createCleanValidation(): ValidationResult {
  return ValidationEngine.validate(createCleanDoc());
}

function createCleanIssuer(): IssuerResult {
  return {
    isSimulated: true,
    disclaimer: 'Test Issuer',
    documentFound: true,
    registryStatus: 'ACTIVE',
    issuerMatch: true,
    issuingAuthority: 'Regional Passport Office, Delhi',
    digitalSignatureValid: true,
    blacklistStatus: 'CLEAN',
    identityMatch: true,
    timestamp: new Date().toISOString(),
    source: 'Central Identity Registry',
    referenceComparison: {
      found: true,
      status: 'VERIFIED',
      source: 'Supabase Reference DB',
      simulated: true,
      documentNumber: 'T1234587',
      matchedFields: ['Passport Number', 'Full Name', 'Nationality', 'DOB', 'Expiry Date'],
      mismatchedFields: [],
      message: 'All fields verified against reference database.',
    },
  };
}

function createCleanTampering(): TamperingResult {
  return {
    isSimulated: false,
    modelIdentifier: 'PRAMAAN-ForensicVision-v2.1',
    tamperingScore: 0,
    verdict: 'NO_TAMPERING_DETECTED',
    confidence: 96.5,
    indicators: [],
    suspiciousRegions: [],
    reasonCodes: [],
  };
}

function createCleanFace(): FaceResult {
  return {
    matchScore: 98,
    status: 'PASS',
    statusExplanation: 'Biometric face match verified with high confidence.',
    liveness: 'NOT_EVALUATED',
    documentFaceDetected: true,
    liveFaceDetected: true,
    details: {
      verified: true,
      distance: 0.1245,
      threshold: 0.4000,
      model: 'Facenet512',
    },
  };
}

function createCleanNfc(): NfcResult {
  return {
    moduleName: 'NFC Credential Cross-Verification',
    isPrototype: true,
    disclaimer: 'Prototype module',
    readStatus: 'SUCCESS',
    crossVerification: {
      documentIdMatch: true,
      nameMatch: true,
      dobMatch: true,
      nationalityMatch: true,
      expiryMatch: true,
    },
    integrityVerified: true,
    status: 'PASS',
    explanation: 'Digitally signed chip payload matches visual printed data.',
  };
}

function createCleanReference(): ReferenceResult {
  return {
    moduleName: 'Document Reference Engine',
    referenceStandard: 'ICAO Specimen TD3',
    referenceCountry: 'India',
    documentType: 'passport',
    referenceAvailable: true,
    layoutMatch: 'MATCHED',
    photoRegionMatch: 'MATCHED',
    mrzRegionMatch: 'MATCHED',
    securityFeatureChecks: [],
    anomalies: [],
    confidence: 98,
    source: 'Local Master Catalog',
    status: 'PASS',
  };
}

function createCleanWatchlist(): WatchlistResult {
  return {
    isSimulated: true,
    screeningSource: 'Simulated Lookout Testbed',
    documentNumberChecked: 'T1234587',
    identityChecked: 'RAHUL SHARMA',
    status: 'NO_MATCH',
    matchCount: 0,
    explanation: 'No adverse lookout records matched.',
  };
}

function fuseAndScore(overrides: {
  ocr?: Partial<OcrResult>;
  validation?: Partial<ValidationResult>;
  issuer?: Partial<IssuerResult>;
  tampering?: Partial<TamperingResult>;
  face?: Partial<FaceResult>;
  nfc?: Partial<NfcResult>;
  reference?: Partial<ReferenceResult>;
  watchlist?: Partial<WatchlistResult>;
}) {
  const evidence = EvidenceFusion.fuse({
    ocr: { ...createCleanOcr(), ...overrides.ocr },
    validation: { ...createCleanValidation(), ...overrides.validation },
    issuer: { ...createCleanIssuer(), ...overrides.issuer },
    tampering: { ...createCleanTampering(), ...overrides.tampering },
    face: { ...createCleanFace(), ...overrides.face },
    nfc: { ...createCleanNfc(), ...overrides.nfc },
    reference: { ...createCleanReference(), ...overrides.reference },
    watchlist: { ...createCleanWatchlist(), ...overrides.watchlist },
  });

  return {
    evidence,
    risk: RiskEngine.calculate(evidence),
  };
}

// ============================================================================
// Test Execution
// ============================================================================

console.log('================================================================');
console.log('  PRAMAAN Stage 7: Risk & Evidence Fusion Test Suite');
console.log('  Deterministic Normalized Forensic Scoring Verification');
console.log('================================================================\n');

let passedTests = 0;

// ----------------------------------------------------------------------------
// TEST 1 — CLEAN VALID
// ----------------------------------------------------------------------------
{
  console.log('[TEST 1] Clean Valid Passport:');
  const cleanVal = ValidationEngine.validate(createCleanDoc());
  assert.strictEqual(cleanVal.overallStatus, 'PASS', 'Document Validation must be PASS');
  const checksumCheck = cleanVal.checks.find(
    (c) => c.ruleName.includes('Checksum') || c.id === 'val_mrz_checksum'
  );
  assert.strictEqual(checksumCheck, undefined, 'Must NOT contain ICAO 9303 MRZ Checksum Algorithms check');

  const { risk } = fuseAndScore({ validation: cleanVal });
  console.log(`  Result: Score = ${risk.score}/100, Level = ${risk.level}`);
  console.log(`  Recommendation: ${risk.recommendation}`);
  assert.strictEqual(risk.score, 0, 'Clean valid document must score exactly 0');
  assert.strictEqual(risk.level, 'LOW', 'Clean valid document must be LOW risk');
  assert.ok(risk.explanation.includes('All primary verification vectors passed'));
  assert.strictEqual(risk.factors.length, 0, 'Clean valid document should have 0 penalty factors');
  console.log('  ✓ TEST 1 PASSED\n');
  passedTests++;
}

// ----------------------------------------------------------------------------
// TEST 2 — EXPIRED
// ----------------------------------------------------------------------------
{
  console.log('[TEST 2] Expired Passport (Issuer EXPIRED + Validation FAIL):');
  const expiredDoc = { ...createCleanDoc(), expiryDate: '11/06/2020' };
  const expiredVal = ValidationEngine.validate(expiredDoc, { forceExpired: true });
  assert.strictEqual(expiredVal.overallStatus, 'FAIL');
  const hasExpiryFail = expiredVal.checks.some((c) => c.id === 'val_expiry' && c.status === 'FAIL');
  assert.ok(hasExpiryFail, 'Expiry failure must be present in validation');
  const hasChecksumFail = expiredVal.checks.some((c) => c.id === 'val_mrz_checksum');
  assert.strictEqual(hasChecksumFail, false, 'MRZ checksum must NOT be involved in expiry failure');

  const { risk } = fuseAndScore({
    issuer: { registryStatus: 'EXPIRED' },
    validation: expiredVal,
  });
  console.log(`  Result: Score = ${risk.score}/100, Level = ${risk.level}`);
  assert.ok(risk.score >= 60, `Expired document score must be >= 60, received ${risk.score}`);
  assert.strictEqual(risk.level, 'HIGH', 'Expired document must be HIGH risk');
  const hasExpiredFactor = risk.factors.some((f) => f.description.toLowerCase().includes('expired'));
  assert.ok(hasExpiredFactor, 'Must have EXPIRED factor');
  const hasBlacklistFactor = risk.factors.some((f) => f.category.toLowerCase().includes('blacklist') || f.description.toLowerCase().includes('blacklist'));
  assert.strictEqual(hasBlacklistFactor, false, 'Expired document must NOT generate BLACKLIST factor');
  console.log('  ✓ TEST 2 PASSED\n');
  passedTests++;
}

// ----------------------------------------------------------------------------
// TEST 3 — ISSUER MISMATCH
// ----------------------------------------------------------------------------
{
  console.log('[TEST 3] Issuer Identity Mismatch (Everything else PASS):');
  const { risk } = fuseAndScore({
    issuer: {
      registryStatus: 'MISMATCH',
      documentFound: true,
      referenceComparison: {
        found: true,
        status: 'MISMATCH',
        source: 'Supabase Reference DB',
        simulated: true,
        documentNumber: 'T4567890',
        matchedFields: ['Passport Number', 'Nationality', 'DOB'],
        mismatchedFields: [
          { field: 'Full Name', documentValue: 'AMAN VERMA', referenceValue: 'AMAN SINGH' },
        ],
        message: 'Name on document (AMAN VERMA) mismatches central record (AMAN SINGH).',
      },
    },
  });
  console.log(`  Result: Score = ${risk.score}/100, Level = ${risk.level}`);
  assert.ok(risk.score >= 70, `Issuer mismatch score must be >= 70, received ${risk.score}`);
  assert.strictEqual(risk.level, 'HIGH', 'Issuer mismatch must be HIGH risk');
  const mismatchFactor = risk.factors.find((f) => f.description.includes('MISMATCH'));
  assert.ok(mismatchFactor, 'Must have MISMATCH factor');
  console.log('  ✓ TEST 3 PASSED\n');
  passedTests++;
}

// ----------------------------------------------------------------------------
// TEST 4 — BLACKLISTED
// ----------------------------------------------------------------------------
{
  console.log('[TEST 4] Authoritative Registry BLACKLISTED:');
  const { risk } = fuseAndScore({
    issuer: {
      registryStatus: 'BLACKLISTED',
      documentFound: true,
      blacklistStatus: 'FLAGGED',
    },
  });
  console.log(`  Result: Score = ${risk.score}/100, Level = ${risk.level}`);
  assert.ok(risk.score >= 90, `Blacklisted document score must be >= 90, received ${risk.score}`);
  assert.strictEqual(risk.level, 'HIGH', 'Blacklisted document must be HIGH risk');
  const blacklistFactor = risk.factors.find((f) => f.description.toLowerCase().includes('blacklisted'));
  assert.ok(blacklistFactor, 'Must have BLACKLISTED factor present');
  if (blacklistFactor) {
    assert.strictEqual(blacklistFactor.severity, 'high');
  }
  console.log('  ✓ TEST 4 PASSED\n');
  passedTests++;
}

// ----------------------------------------------------------------------------
// TEST 5 — NOT FOUND
// ----------------------------------------------------------------------------
{
  console.log('[TEST 5] Document NOT FOUND in Issuer Database:');
  const { risk } = fuseAndScore({
    issuer: {
      documentFound: false,
      registryStatus: 'NOT_FOUND',
    },
  });
  console.log(`  Result: Score = ${risk.score}/100, Level = ${risk.level}`);
  assert.ok(risk.score >= 70, `Not found document score must be >= 70, received ${risk.score}`);
  assert.strictEqual(risk.level, 'HIGH', 'Not found document must be HIGH risk');
  const notFoundFactor = risk.factors.find((f) => f.description.includes('not located'));
  assert.ok(notFoundFactor, 'Must have NOT_FOUND factor');
  console.log('  ✓ TEST 5 PASSED\n');
  passedTests++;
}

// ----------------------------------------------------------------------------
// TEST 6 — TAMPERED
// ----------------------------------------------------------------------------
{
  console.log('[TEST 6] Evident Tampering (tamperingScore = 85, EVIDENT_TAMPERING):');
  const { risk } = fuseAndScore({
    tampering: {
      tamperingScore: 85,
      verdict: 'EVIDENT_TAMPERING',
      confidence: 94.8,
      indicators: [
        {
          id: 'cm_1',
          title: 'Copy-Move Forgery',
          severity: 'high',
          confidence: 95,
          confidenceLabel: 'High',
          location: 'Visual Inspection Zone',
          reasonCode: 'COPY_MOVE_CLUSTERS',
          description: '69 cloned feature clusters identified in Visual Inspection Zone',
        },
        {
          id: 'ela_1',
          title: 'Elevated ELA Compression',
          severity: 'high',
          confidence: 94,
          confidenceLabel: 'High',
          location: 'Photo Boundary',
          reasonCode: 'COMPRESSION_DISCONTINUITY',
          description: 'Discontinuous compression boundaries along photo perimeter',
        },
      ],
    },
  });
  console.log(`  Result: Score = ${risk.score}/100, Level = ${risk.level}`);
  assert.ok(risk.score >= 80, `Tampered document score must be >= 80, received ${risk.score}`);
  assert.strictEqual(risk.level, 'HIGH', 'Tampered document must be HIGH risk');
  const tamperFactor = risk.factors.find((f) => f.category === 'AI Tampering Forensics');
  assert.ok(tamperFactor, 'Must have AI Tampering Forensics factor');
  if (tamperFactor) {
    assert.ok(tamperFactor.description.includes('69 cloned feature clusters'), 'Must preserve real indicator details');
  }
  console.log('  ✓ TEST 6 PASSED\n');
  passedTests++;
}

// ----------------------------------------------------------------------------
// TEST 7 — FACE FAIL
// ----------------------------------------------------------------------------
{
  console.log('[TEST 7] Biometric Face Verification FAIL (matchScore = 25, distance = 0.74):');
  const { risk } = fuseAndScore({
    face: {
      status: 'FAIL',
      matchScore: 25,
      statusExplanation: 'Facial recognition distance exceeds biometric match threshold.',
      details: {
        verified: false,
        distance: 0.7412,
        threshold: 0.4000,
        model: 'Facenet512',
      },
    },
  });
  console.log(`  Result: Score = ${risk.score}/100, Level = ${risk.level}`);
  assert.ok(risk.score >= 80, `Face fail score must be >= 80, received ${risk.score}`);
  assert.strictEqual(risk.level, 'HIGH', 'Face fail must be HIGH risk');
  const faceFactor = risk.factors.find((f) => f.category === 'Biometric Discrepancy');
  assert.ok(faceFactor, 'Must have Biometric Discrepancy factor');
  if (faceFactor) {
    assert.ok(faceFactor.description.includes('0.7412'), 'Must preserve exact FaceNet512 distance in factor');
  }
  console.log('  ✓ TEST 7 PASSED\n');
  passedTests++;
}

// ----------------------------------------------------------------------------
// TEST 8 — MULTIPLE FAILURES
// ----------------------------------------------------------------------------
{
  console.log('[TEST 8] Multiple Critical Failures (BLACKLISTED + EVIDENT_TAMPERING + Face FAIL):');
  const { risk } = fuseAndScore({
    issuer: { registryStatus: 'BLACKLISTED', blacklistStatus: 'FLAGGED' },
    tampering: { tamperingScore: 85, verdict: 'EVIDENT_TAMPERING' },
    face: { status: 'FAIL', matchScore: 25 },
  });
  console.log(`  Result: Score = ${risk.score}/100, Level = ${risk.level}`);
  assert.ok(risk.score >= 90, `Multiple critical failures must score >= 90, received ${risk.score}`);
  assert.strictEqual(risk.level, 'HIGH', 'Multiple failures must be HIGH risk');
  console.log('  ✓ TEST 8 PASSED\n');
  passedTests++;
}

// ----------------------------------------------------------------------------
// TEST 9 — MISMATCH IS NOT BLACKLIST
// ----------------------------------------------------------------------------
{
  console.log('[TEST 9] Mismatch is NOT Blacklist:');
  const { risk } = fuseAndScore({
    issuer: { registryStatus: 'MISMATCH', documentFound: true },
  });
  console.log(`  Result: Score = ${risk.score}/100, Level = ${risk.level}`);
  assert.strictEqual(risk.level, 'HIGH');
  const hasMismatchFactor = risk.factors.some((f) => f.description.includes('MISMATCH'));
  assert.ok(hasMismatchFactor, 'Must include MISMATCH factor');
  const hasBlacklistFactor = risk.factors.some((f) => f.description.toLowerCase().includes('blacklisted') || f.category.toLowerCase().includes('blacklist'));
  assert.strictEqual(hasBlacklistFactor, false, 'MISMATCH must NEVER generate BLACKLIST factor');
  console.log('  ✓ TEST 9 PASSED\n');
  passedTests++;
}

// ----------------------------------------------------------------------------
// TEST 10 — EXPIRED IS NOT BLACKLIST
// ----------------------------------------------------------------------------
{
  console.log('[TEST 10] Expired is NOT Blacklist:');
  const { risk } = fuseAndScore({
    issuer: { registryStatus: 'EXPIRED', documentFound: true },
  });
  console.log(`  Result: Score = ${risk.score}/100, Level = ${risk.level}`);
  assert.ok(risk.score >= 60);
  const hasExpiredFactor = risk.factors.some((f) => f.description.includes('EXPIRED'));
  assert.ok(hasExpiredFactor, 'Must include EXPIRED factor');
  const hasBlacklistFactor = risk.factors.some((f) => f.description.toLowerCase().includes('blacklisted') || f.category.toLowerCase().includes('blacklist'));
  assert.strictEqual(hasBlacklistFactor, false, 'EXPIRED must NEVER generate BLACKLIST factor');
  console.log('  ✓ TEST 10 PASSED\n');
  passedTests++;
}

// ----------------------------------------------------------------------------
// TEST 11 — DOCUMENT VALIDATION COMPLETELY DEVOID OF MRZ CHECKSUMS
// ----------------------------------------------------------------------------
{
  console.log('[TEST 11] Document Validation Check Deletion Verification:');
  const valResult = ValidationEngine.validate(createCleanDoc());
  const allRuleNames = valResult.checks.map((c) => c.ruleName);
  const allIds = valResult.checks.map((c) => c.id);

  assert.strictEqual(allRuleNames.includes('ICAO 9303 MRZ Checksum Algorithms'), false, 'Must not include ICAO 9303 MRZ Checksum Algorithms rule');
  assert.strictEqual(allIds.includes('val_mrz_checksum'), false, 'Must not include val_mrz_checksum id');
  assert.strictEqual(valResult.overallStatus, 'PASS', 'Clean validation must remain PASS');

  // Verify Legacy items also do not contain checksum check
  const legacyItems = ValidationEngine.toLegacyValidationItems(valResult);
  assert.strictEqual(legacyItems.some((i) => i.id === 'val_mrz_checksum'), false, 'Legacy validation items must not contain val_mrz_checksum');
  console.log('  ✓ TEST 11 PASSED\n');
  passedTests++;
}

// ----------------------------------------------------------------------------
// TEST 12 — TAMPERED SCENARIO: MRZ CHECKSUM DOES NOT TRIGGER TAMPERING ALERT
// ----------------------------------------------------------------------------
{
  console.log('[TEST 12] Tampered Scenario Validation (Tampering detected ONLY by AI):');
  const tamperedDoc = {
    ...createCleanDoc(),
    holderName: 'AMAN VERMA',
    // In tampered scenario, MRZ checksum must NOT fail or trigger alert
  };
  const valResult = ValidationEngine.validate(tamperedDoc);
  assert.strictEqual(valResult.checks.some((c) => c.id === 'val_mrz_checksum'), false, 'No MRZ checksum check in tampered validation');

  // Real tampering comes from AI
  const { risk } = fuseAndScore({
    validation: valResult,
    tampering: {
      tamperingScore: 82,
      verdict: 'EVIDENT_TAMPERING',
      indicators: [
        {
          id: 'cm_tamper',
          title: 'Copy-Move Splicing',
          severity: 'high',
          confidence: 90,
          confidenceLabel: 'High',
          location: 'Photo Boundary',
          reasonCode: 'PHOTO_SPLICE',
          description: 'Photo perimeter splicing detected',
        },
      ],
    },
  });

  const hasMrzChecksumAlert = risk.factors.some((f) => f.description.toLowerCase().includes('checksum'));
  assert.strictEqual(hasMrzChecksumAlert, false, 'No MRZ checksum alert in risk factors');
  assert.ok(risk.factors.some((f) => f.category === 'AI Tampering Forensics'), 'Tampering alert must come from AI Tampering Forensics');
  console.log('  ✓ TEST 12 PASSED\n');
  passedTests++;
}

// ----------------------------------------------------------------------------
// ADDITIONAL TEST: Proportional Face REVIEW
// ----------------------------------------------------------------------------
{
  console.log('[ADDITIONAL] Proportional Face REVIEW (matchScore = 55, distance = 0.5186):');
  const { risk } = fuseAndScore({
    face: {
      status: 'REVIEW',
      matchScore: 55,
      details: { verified: false, distance: 0.5186, threshold: 0.4000, model: 'Facenet512' },
    },
  });
  console.log(`  Result: Score = ${risk.score}/100, Level = ${risk.level}`);
  assert.ok(risk.score >= 10 && risk.score <= 30, `Face REVIEW alone must scale proportionally, received ${risk.score}`);
  const faceFactor = risk.factors.find((f) => f.category === 'Biometric Discrepancy');
  assert.ok(faceFactor, 'Must have biometric discrepancy factor');
  if (faceFactor) {
    assert.ok(faceFactor.description.includes('0.5186'), 'Must describe distance');
  }
  console.log('  ✓ ADDITIONAL TEST PASSED\n');
  passedTests++;
}

console.log('================================================================');
console.log(`  ALL ${passedTests} TESTS PASSED SUCCESSFULLY!`);
console.log('================================================================');
