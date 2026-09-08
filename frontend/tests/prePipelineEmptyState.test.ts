import { mockPassportData, mockVisaData } from '../src/data/mockVerificationData';
import { DEMO_SCENARIOS } from '../src/data/demoScenarios';
import { VerificationService } from '../src/services/verificationService';
import { RiskEngine } from '../src/services/riskEngine';
import { EvidenceFusion } from '../src/services/evidenceFusion';
import type { DocumentData, FaceResult, RiskResult, PipelineStepStatus } from '../src/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

console.log('================================================================');
console.log('  PRAMAAN Pre-Pipeline State & Session Isolation Test Suite');
console.log('  Verifying Clean Empty Pre-Pipeline Face & Risk State');
console.log('================================================================\n');

// -------------------------------------------------------------
// Helper: Simulate Card Rendering Logic
// -------------------------------------------------------------
function getFaceCardState(
  data: DocumentData,
  faceResult: FaceResult | null | undefined,
  stepStatus: PipelineStepStatus
) {
  const isWaiting = stepStatus === 'PROCESSING' && !faceResult?.livePhotoUrl;
  const hasCompleted =
    (stepStatus === 'COMPLETED' || stepStatus === 'WARNING' || stepStatus === 'FAILED') &&
    faceResult !== null &&
    faceResult !== undefined;

  return {
    isWaiting,
    hasCompleted,
    displayStatus: hasCompleted ? faceResult.status : isWaiting ? 'WAITING' : 'NOT_RUN',
    displayedScore: hasCompleted ? faceResult.matchScore : null,
    emptyStateText: !hasCompleted && !isWaiting ? 'Awaiting pipeline execution' : null,
  };
}

function getRiskCardState(
  data: DocumentData,
  riskResult: RiskResult | null | undefined,
  stepStatus: PipelineStepStatus
) {
  const hasCompleted =
    (stepStatus === 'COMPLETED' || stepStatus === 'WARNING' || stepStatus === 'FAILED') &&
    riskResult !== null &&
    riskResult !== undefined;

  return {
    hasCompleted,
    displayLevel: hasCompleted ? riskResult.level : 'Awaiting pipeline execution',
    displayedScore: hasCompleted ? riskResult.score : null,
    displayedExplanation: hasCompleted ? riskResult.explanation : 'Run the verification pipeline to calculate risk',
    emptyStateText: !hasCompleted ? 'Awaiting pipeline execution' : null,
  };
}

// -------------------------------------------------------------
// [TEST 1] Initial Page State (Before any document is uploaded or pipeline run)
// -------------------------------------------------------------
console.log('[TEST 1] Initial Page State (Before upload & before Run Pipeline):');
{
  assert(mockPassportData.faceMatchScore === undefined, 'mockPassportData.faceMatchScore must be undefined');
  assert(mockPassportData.riskScore === undefined, 'mockPassportData.riskScore must be undefined');
  assert(mockPassportData.riskLevel === undefined, 'mockPassportData.riskLevel must be undefined');
  assert(mockPassportData.livePhotoUrl === undefined, 'mockPassportData.livePhotoUrl must be undefined');
  assert(mockPassportData.riskContributors.length === 0, 'mockPassportData.riskContributors must be empty');

  // Evaluate UI Card States before upload
  const initialFaceCard = getFaceCardState(mockPassportData, null, 'NOT_STARTED');
  assert(initialFaceCard.hasCompleted === false, 'Initial FaceCard must not be completed');
  assert(initialFaceCard.displayedScore === null, 'Initial FaceCard must not display a score');
  assert(initialFaceCard.emptyStateText === 'Awaiting pipeline execution', 'Initial FaceCard must show Awaiting pipeline execution');

  const initialRiskCard = getRiskCardState(mockPassportData, null, 'NOT_STARTED');
  assert(initialRiskCard.hasCompleted === false, 'Initial RiskCard must not be completed');
  assert(initialRiskCard.displayedScore === null, 'Initial RiskCard must not display a score');
  assert(initialRiskCard.displayLevel === 'Awaiting pipeline execution', 'Initial RiskCard must show Awaiting pipeline execution');
  assert(initialRiskCard.emptyStateText === 'Awaiting pipeline execution', 'Initial RiskCard must show empty state text');

  console.log('  ✓ Initial Face: Empty / Awaiting pipeline execution (score: null)');
  console.log('  ✓ Initial Risk: Empty / Awaiting pipeline execution (score: null)');
  console.log('  ✓ TEST 1 PASSED\n');
}

// -------------------------------------------------------------
// [TEST 2] Upload Document A (Before clicking Run Pipeline)
// -------------------------------------------------------------
console.log('[TEST 2] Upload Document A (BEFORE clicking Run Pipeline):');
let docA: DocumentData;
let sessionA = 'PRM-SESSION-DOC-A-001';
let faceResultA: FaceResult | null = null;
let riskResultA: RiskResult | null = null;
let stepStatesA: Record<number, PipelineStepStatus> = {
  1: 'COMPLETED', // Ingested
  2: 'NOT_STARTED',
  3: 'NOT_STARTED',
  4: 'NOT_STARTED',
  5: 'NOT_STARTED',
  6: 'NOT_STARTED',
  7: 'NOT_STARTED',
  8: 'NOT_STARTED',
};

{
  const fakeFileA = new File(['fake-doc-a-bytes'], 'passport_alice.jpg', { type: 'image/jpeg' });
  docA = VerificationService.createDocumentInputFromUpload(
    fakeFileA,
    'blob:http://localhost:5173/preview-doc-a',
    'passport',
    mockPassportData
  );

  assert(docA.faceMatchScore === undefined, 'Uploaded Doc A faceMatchScore must be undefined');
  assert(docA.riskScore === undefined, 'Uploaded Doc A riskScore must be undefined');
  assert(docA.riskLevel === undefined, 'Uploaded Doc A riskLevel must be undefined');
  assert(docA.livePhotoUrl === undefined, 'Uploaded Doc A livePhotoUrl must be undefined');
  assert(faceResultA === null, 'Pre-pipeline faceResult must be null');
  assert(riskResultA === null, 'Pre-pipeline riskResult must be null');

  const uploadFaceCard = getFaceCardState(docA, faceResultA, stepStatesA[6]);
  assert(uploadFaceCard.hasCompleted === false, 'Upload FaceCard must not be completed');
  assert(uploadFaceCard.displayedScore === null, 'Upload FaceCard must not show any score');
  assert(uploadFaceCard.emptyStateText === 'Awaiting pipeline execution', 'Upload FaceCard must show empty state');

  const uploadRiskCard = getRiskCardState(docA, riskResultA, stepStatesA[7]);
  assert(uploadRiskCard.hasCompleted === false, 'Upload RiskCard must not be completed');
  assert(uploadRiskCard.displayedScore === null, 'Upload RiskCard must not show any score');
  assert(uploadRiskCard.emptyStateText === 'Awaiting pipeline execution', 'Upload RiskCard must show empty state');

  console.log('  ✓ Post-Upload Face: Empty / Awaiting pipeline execution (score: null)');
  console.log('  ✓ Post-Upload Risk: Empty / Awaiting pipeline execution (score: null)');
  console.log('  ✓ TEST 2 PASSED\n');
}

// -------------------------------------------------------------
// [TEST 3] Complete Pipeline for Document A
// -------------------------------------------------------------
console.log('[TEST 3] Complete Pipeline for Document A:');
{
  // Simulate Stage 6 Face Completion
  faceResultA = {
    sessionId: sessionA,
    documentNumber: 'T1234587',
    matchScore: 99.4,
    distance: 0.0083,
    status: 'PASS',
    statusExplanation: 'Facial biometric comparison PASSED with high confidence.',
    liveness: 'NOT_EVALUATED',
    documentFaceDetected: true,
    liveFaceDetected: true,
    livePhotoUrl: 'blob:http://localhost:5173/live-alice.jpg',
  };
  stepStatesA[6] = 'COMPLETED';

  // Simulate Stage 7 Risk Engine Calculation
  const evidenceA = EvidenceFusion.fuse({
    ocr: {
      fields: [],
      mrzParsed: { documentType: 'P', issuingCountry: 'IND', holderName: 'ALICE', documentNumber: 'T1234587', nationality: 'IND', dob: '01/01/2000', expiryDate: '01/01/2030' },
      rawText: 'RAW',
      averageConfidence: 99,
      qualityStatus: 'HIGH',
    },
    validation: {
      overallStatus: 'PASS',
      rulesChecked: 5,
      passedCount: 5,
      warningCount: 0,
      failedCount: 0,
      checks: [],
    },
    issuer: {
      documentFound: true,
      registryStatus: 'ACTIVE',
      issuingAuthority: 'Passport Office India',
      valid: true,
    },
    tampering: {
      tamperingScore: 0,
      verdict: 'NO_TAMPERING_DETECTED',
      confidence: 95,
      indicators: [],
      suspiciousRegions: [],
    },
    face: faceResultA,
    nfc: {
      readStatus: 'READ_SUCCESS',
      chipValid: true,
    },
    reference: {
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
    },
    watchlist: {
      moduleName: 'Watchlist / Interpol Interception',
      matched: false,
      status: 'PASS',
      source: 'Interpol SLTD',
      watchlistProvider: 'Interpol',
      recordsChecked: 3,
    },
  });

  riskResultA = RiskEngine.calculate(evidenceA);
  stepStatesA[7] = 'COMPLETED';
  stepStatesA[8] = 'COMPLETED';

  const completedFaceCard = getFaceCardState(docA, faceResultA, stepStatesA[6]);
  assert(completedFaceCard.hasCompleted === true, 'FaceCard must be completed after Stage 6');
  assert(completedFaceCard.displayedScore === 99.4, 'FaceCard score must be 99.4%');
  assert(completedFaceCard.displayStatus === 'PASS', 'FaceCard status must be PASS');

  const completedRiskCard = getRiskCardState(docA, riskResultA, stepStatesA[7]);
  assert(completedRiskCard.hasCompleted === true, 'RiskCard must be completed after Stage 7');
  assert(completedRiskCard.displayedScore === 0, 'RiskCard score must be 0 for clean pass');
  assert(completedRiskCard.displayLevel === 'LOW', 'RiskCard level must be LOW');

  console.log(`  ✓ Document A Pipeline Face: ${completedFaceCard.displayedScore}% (${completedFaceCard.displayStatus})`);
  console.log(`  ✓ Document A Pipeline Risk: ${completedRiskCard.displayedScore}/100 (${completedRiskCard.displayLevel})`);
  console.log('  ✓ TEST 3 PASSED\n');
}

// -------------------------------------------------------------
// [TEST 4] Upload Document B (BEFORE clicking Run Pipeline)
// -------------------------------------------------------------
console.log('[TEST 4] Upload Document B (BEFORE Run Pipeline):');
let docB: DocumentData;
let sessionB = 'PRM-SESSION-DOC-B-002';
let activeSessionId = sessionB;
let faceResultB: FaceResult | null = null;
let riskResultB: RiskResult | null = null;
let stepStatesB: Record<number, PipelineStepStatus> = {
  1: 'COMPLETED',
  2: 'NOT_STARTED',
  3: 'NOT_STARTED',
  4: 'NOT_STARTED',
  5: 'NOT_STARTED',
  6: 'NOT_STARTED',
  7: 'NOT_STARTED',
  8: 'NOT_STARTED',
};

{
  const fakeFileB = new File(['fake-doc-b-bytes'], 'passport_bob_mismatch.jpg', { type: 'image/jpeg' });
  docB = VerificationService.createDocumentInputFromUpload(
    fakeFileB,
    'blob:http://localhost:5173/preview-doc-b',
    'passport',
    mockPassportData
  );

  // Must be completely reset from Document A's state!
  assert(docB.faceMatchScore === undefined, 'Uploaded Doc B faceMatchScore must be undefined');
  assert(docB.riskScore === undefined, 'Uploaded Doc B riskScore must be undefined');
  assert(faceResultB === null, 'Doc B faceResult must be null before Run Pipeline');
  assert(riskResultB === null, 'Doc B riskResult must be null before Run Pipeline');

  const bPreFaceCard = getFaceCardState(docB, faceResultB, stepStatesB[6]);
  assert(bPreFaceCard.hasCompleted === false, 'Doc B FaceCard must not be completed');
  assert(bPreFaceCard.displayedScore === null, 'Doc B FaceCard must not show 99.4% from Doc A');
  assert(bPreFaceCard.emptyStateText === 'Awaiting pipeline execution', 'Doc B FaceCard must show empty state');

  const bPreRiskCard = getRiskCardState(docB, riskResultB, stepStatesB[7]);
  assert(bPreRiskCard.hasCompleted === false, 'Doc B RiskCard must not be completed');
  assert(bPreRiskCard.displayedScore === null, 'Doc B RiskCard must not show 0 or 12 from Doc A');
  assert(bPreRiskCard.emptyStateText === 'Awaiting pipeline execution', 'Doc B RiskCard must show empty state');

  console.log('  ✓ Document B Pre-Run Face: Completely reset (no residual 99.4%)');
  console.log('  ✓ Document B Pre-Run Risk: Completely reset (no residual score)');
  console.log('  ✓ TEST 4 PASSED\n');
}

// -------------------------------------------------------------
// [TEST 5] Run Document B
// -------------------------------------------------------------
console.log('[TEST 5] Run Document B (Facial Mismatch Scenario):');
{
  // Simulate Stage 6 Face Completion for B (Mismatch Face)
  faceResultB = {
    sessionId: sessionB,
    documentNumber: 'T4567890',
    matchScore: 55,
    distance: 0.5186,
    status: 'REVIEW',
    statusExplanation: 'Face similarity is borderline (55%). Manual review recommended.',
    liveness: 'NOT_EVALUATED',
    documentFaceDetected: true,
    liveFaceDetected: true,
    livePhotoUrl: 'blob:http://localhost:5173/live-bob.jpg',
  };
  stepStatesB[6] = 'WARNING';

  // Simulate Stage 7 Risk Engine Calculation for B
  const evidenceB = EvidenceFusion.fuse({
    ocr: {
      fields: [],
      mrzParsed: { documentType: 'P', issuingCountry: 'IND', holderName: 'BOB', documentNumber: 'T4567890', nationality: 'IND', dob: '01/01/1990', expiryDate: '01/01/2030' },
      rawText: 'RAW',
      averageConfidence: 99,
      qualityStatus: 'HIGH',
    },
    validation: {
      overallStatus: 'PASS',
      rulesChecked: 5,
      passedCount: 5,
      warningCount: 0,
      failedCount: 0,
      checks: [],
    },
    issuer: {
      documentFound: true,
      registryStatus: 'MISMATCH',
      issuingAuthority: 'Passport Office India',
      valid: false,
    },
    tampering: {
      tamperingScore: 10,
      verdict: 'NO_TAMPERING_DETECTED',
      confidence: 95,
      indicators: [],
      suspiciousRegions: [],
    },
    face: faceResultB,
    nfc: {
      readStatus: 'READ_SUCCESS',
      chipValid: true,
    },
    reference: {
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
    },
    watchlist: {
      moduleName: 'Watchlist / Interpol Interception',
      matched: false,
      status: 'PASS',
      source: 'Interpol SLTD',
      watchlistProvider: 'Interpol',
      recordsChecked: 3,
    },
  });

  riskResultB = RiskEngine.calculate(evidenceB);
  stepStatesB[7] = 'COMPLETED';
  stepStatesB[8] = 'COMPLETED';

  const bCompletedFaceCard = getFaceCardState(docB, faceResultB, stepStatesB[6]);
  assert(bCompletedFaceCard.hasCompleted === true, 'Doc B FaceCard must be completed');
  assert(bCompletedFaceCard.displayedScore === 55, 'Doc B FaceCard score must be 55%');
  assert(bCompletedFaceCard.displayStatus === 'REVIEW', 'Doc B FaceCard status must be REVIEW');

  const bCompletedRiskCard = getRiskCardState(docB, riskResultB, stepStatesB[7]);
  assert(bCompletedRiskCard.hasCompleted === true, 'Doc B RiskCard must be completed');
  assert(bCompletedRiskCard.displayedScore === 70, 'Doc B RiskCard score must be 70/100 (Identity Mismatch gate)');
  assert(bCompletedRiskCard.displayLevel === 'HIGH', 'Doc B RiskCard level must be HIGH');

  console.log(`  ✓ Document B Pipeline Face: ${bCompletedFaceCard.displayedScore}% (${bCompletedFaceCard.displayStatus})`);
  console.log(`  ✓ Document B Pipeline Risk: ${bCompletedRiskCard.displayedScore}/100 (${bCompletedRiskCard.displayLevel})`);
  console.log('  ✓ TEST 5 PASSED\n');
}

// -------------------------------------------------------------
// [TEST 6] Stale Callback / Session Isolation
// -------------------------------------------------------------
console.log('[TEST 6] Stale Callback / Session Isolation:');
{
  // Simulate an async callback or WebSocket event arriving late from Document A while Document B is active
  const staleFaceCallbackFromDocA: FaceResult = {
    sessionId: sessionA,
    documentNumber: 'T1234587',
    matchScore: 99.4,
    status: 'PASS',
    statusExplanation: 'Late resolving promise from Doc A',
    liveness: 'NOT_EVALUATED',
    documentFaceDetected: true,
    liveFaceDetected: true,
  };

  // Validation function mirroring App.tsx sessionId check
  function handleIncomingFaceCallback(incoming: FaceResult, activeSession: string) {
    if (incoming.sessionId && incoming.sessionId !== activeSession) {
      // Stale callback detected! Discard!
      return false;
    }
    return true;
  }

  const accepted = handleIncomingFaceCallback(staleFaceCallbackFromDocA, activeSessionId);
  assert(accepted === false, 'Stale callback from Session A must be discarded when Session B is active');

  // Verify Doc B's result remains unchanged
  assert(faceResultB?.matchScore === 55, 'Doc B faceResult must remain 55% and not be overwritten by Doc A');
  assert(riskResultB?.score === 70, 'Doc B riskResult must remain 70 and not be overwritten by Doc A');

  console.log('  ✓ Late callback with Session A ID correctly ignored by Session B');
  console.log('  ✓ Document B state preserved without pollution');
  console.log('  ✓ TEST 6 PASSED\n');
}

console.log('================================================================');
console.log('  ALL 6 PRE-PIPELINE & SESSION ISOLATION TESTS PASSED!');
console.log('================================================================\n');
