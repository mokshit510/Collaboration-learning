/**
 * PRAMAAN Verification Service
 * Central abstraction layer coordinating all document verification vectors.
 *
 * Implements:
 * - EVIDENCE → CORRELATION → RISK → HUMAN DECISION
 *
 * Provides:
 * - uploadDocument()
 * - runOCR()
 * - validateDocument()
 * - verifyIssuer()
 * - analyzeTampering()
 * - verifyFace()
 * - verifyNFC()
 * - compareReference()
 * - checkWatchlist()
 * - calculateRisk()
 * - runVerification()
 * - saveVerificationRecord()
 *
 * Works in MOCK MODE (local modular engines) or API MODE (remote backend).
 */

import type {
  DocumentData,
  DocumentType,
  VerificationResult,
  AuditTrailEntry,
  PipelineStepStatus,
  DemoScenarioId,
  OcrResult,
  ValidationResult,
  IssuerResult,
  TamperingResult,
  FaceResult,
  NfcResult,
  ReferenceResult,
  WatchlistResult,
  RiskResult,
  EvidenceItem,
} from '../types';

import { mockPassportData, mockVisaData, mockOtherDocData } from '../data/mockVerificationData';
import { DEMO_SCENARIOS } from '../data/demoScenarios';
import { OcrEngine } from './ocrEngine';
import { ValidationEngine } from './validationEngine';
import { IssuerService } from './issuerService';
import { TamperingService } from './tamperingService';
import { FaceService } from './faceService';
import { NfcService } from './nfcService';
import { ReferenceEngine } from './referenceEngine';
import { WatchlistService } from './watchlistService';
import { EvidenceFusion } from './evidenceFusion';
import { RiskEngine } from './riskEngine';
import { RecordsStorage } from './recordsStorage';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface PipelineProgressCallback {
  (stepIndex: number, stepName: string, stepStatus: PipelineStepStatus, details?: string): void;
}

export class VerificationService {
  /**
   * Fetch current baseline document data based on type
   */
  public static getDocumentData(type: DocumentType): DocumentData {
    switch (type) {
      case 'passport':
        return mockPassportData;
      case 'visa':
        return mockVisaData;
      case 'other':
        return mockOtherDocData;
      default:
        return mockPassportData;
    }
  }

  /**
   * Get document data for a specific demo scenario
   */
  public static getScenarioData(scenarioId: DemoScenarioId): DocumentData {
    return DEMO_SCENARIOS[scenarioId]?.documentData || mockPassportData;
  }

  /**
   * 1. Document Upload
   */
  public static async uploadDocument(file: File): Promise<{ url: string; filename: string }> {
    await delay(350);
    const objectUrl = URL.createObjectURL(file);
    return {
      url: objectUrl,
      filename: file.name,
    };
  }

  /**
   * 2. OCR Extraction
   */
  public static async runOCR(
    doc: DocumentData,
    type: DocumentType,
    confidenceModifier: number = 1.0
  ): Promise<OcrResult> {
    await delay(400);
    return OcrEngine.extractFields(doc, type, confidenceModifier);
  }

  /**
   * 3. Document Validation
   */
  public static async validateDocument(
    doc: DocumentData,
    options?: { forceExpired?: boolean; forceMismatchedMrz?: boolean }
  ): Promise<ValidationResult> {
    await delay(350);
    return ValidationEngine.validate(doc, options);
  }

  /**
   * 4. Issuer Verification (Simulated with clear disclaimer)
   */
  public static async verifyIssuer(
    doc: DocumentData,
    options?: { forceExpired?: boolean; forceNotFound?: boolean }
  ): Promise<IssuerResult> {
    await delay(450);
    return IssuerService.verifyDocument(doc, options);
  }

  /**
   * 5. Tampering Analysis (AI Baseline Forensics / Adapter)
   */
  public static async analyzeTampering(
    doc: DocumentData,
    options?: { forceTampered?: boolean; forceClean?: boolean }
  ): Promise<TamperingResult> {
    await delay(550);
    return TamperingService.analyze(doc, options);
  }

  /**
   * 6. Biometric Face Verification
   */
  public static async verifyFace(
    docPhotoUrl: string,
    livePhotoUrl: string,
    options?: { forceMismatch?: boolean }
  ): Promise<FaceResult> {
    await delay(400);
    return FaceService.verify(docPhotoUrl, livePhotoUrl, options);
  }

  /**
   * 7. NFC Prototype Verification
   */
  public static async verifyNFC(
    doc: DocumentData,
    options?: { forceMismatch?: boolean }
  ): Promise<NfcResult> {
    await delay(350);
    return NfcService.verifyCredential(doc, options);
  }

  /**
   * 8. Document Reference Comparison (PRADO-style)
   */
  public static async compareReference(
    doc: DocumentData,
    options?: { forceLayoutVariance?: boolean }
  ): Promise<ReferenceResult> {
    await delay(350);
    return ReferenceEngine.compare(doc, options);
  }

  /**
   * 9. Watchlist Screening
   */
  public static async checkWatchlist(
    documentNumber: string,
    holderName: string,
    options?: { forceMatch?: boolean }
  ): Promise<WatchlistResult> {
    await delay(300);
    return WatchlistService.screen(documentNumber, holderName, options);
  }

  /**
   * 10. Risk Engine Calculation
   */
  public static calculateRisk(evidence: EvidenceItem[]): RiskResult {
    return RiskEngine.calculate(evidence);
  }

  /**
   * 11. Run Full End-to-End Verification Pipeline
   * Produces one complete structured VerificationResult with full audit trail.
   */
  public static async runVerification(
    doc: DocumentData,
    scenarioId?: DemoScenarioId,
    onStepProgress?: PipelineProgressCallback
  ): Promise<VerificationResult> {
    const startTime = performance.now();
    const verificationId = `PRM-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const timestamp = new Date().toISOString();
    const auditTrail: AuditTrailEntry[] = [];

    const recordAudit = (
      stepNumber: number,
      stepName: string,
      status: 'COMPLETED' | 'WARNING' | 'FAILED',
      details: string,
      durationMs: number
    ) => {
      const now = new Date();
      const timeString = now.toTimeString().split(' ')[0];
      auditTrail.push({
        id: `audit_${stepNumber}_${Date.now()}`,
        stepNumber,
        stepName,
        timestamp: timeString,
        durationMs: Math.round(durationMs),
        status,
        details,
      });
    };

    // Scenario specific flags
    const isTamperedScenario = scenarioId === 'tampered';
    const isExpiredScenario = scenarioId === 'expired';
    const isWatchlistScenario = scenarioId === 'watchlist';
    const isLowOcrScenario = scenarioId === 'low_ocr';

    // ----------------------------------------------------
    // STEP 1: Document Upload & Preprocessing
    // ----------------------------------------------------
    let t0 = performance.now();
    onStepProgress?.(1, 'Document Upload', 'PROCESSING', 'Ingesting document image & optical profile');
    await delay(300);
    recordAudit(1, 'Document Upload', 'COMPLETED', 'Document frame ingested at 300 DPI optical fidelity.', performance.now() - t0);
    onStepProgress?.(1, 'Document Upload', 'COMPLETED', 'Optical ingestion complete');

    // ----------------------------------------------------
    // STEP 2: OCR Extraction
    // ----------------------------------------------------
    t0 = performance.now();
    onStepProgress?.(2, 'OCR Extraction', 'PROCESSING', 'Segmenting Visual Inspection Zone & MRZ stream');
    const ocrConfidenceMod = isLowOcrScenario ? 0.72 : 1.0;
    const ocrResult = await this.runOCR(doc, doc.type, ocrConfidenceMod);
    const ocrStatus: PipelineStepStatus = ocrResult.qualityStatus === 'LOW' ? 'WARNING' : 'COMPLETED';
    recordAudit(
      2,
      'OCR Extraction',
      ocrStatus === 'WARNING' ? 'WARNING' : 'COMPLETED',
      `Extracted ${ocrResult.fields.length} text fields (${ocrResult.averageConfidence}% avg confidence).`,
      performance.now() - t0
    );
    onStepProgress?.(2, 'OCR Extraction', ocrStatus, `${ocrResult.averageConfidence}% confidence`);

    // ----------------------------------------------------
    // STEP 3: Document Validation
    // ----------------------------------------------------
    t0 = performance.now();
    onStepProgress?.(3, 'Validation', 'PROCESSING', 'Executing ICAO 9303 checksums & chronological validation');
    const validationResult = await this.validateDocument(doc, {
      forceExpired: isExpiredScenario,
      forceMismatchedMrz: isTamperedScenario,
    });
    const valStatus: PipelineStepStatus =
      validationResult.overallStatus === 'FAIL'
        ? 'FAILED'
        : validationResult.overallStatus === 'WARNING'
        ? 'WARNING'
        : 'COMPLETED';
    recordAudit(
      3,
      'Validation',
      valStatus === 'FAILED' ? 'FAILED' : valStatus === 'WARNING' ? 'WARNING' : 'COMPLETED',
      `Validated ${validationResult.rulesChecked} rules. Result: ${validationResult.overallStatus}.`,
      performance.now() - t0
    );
    onStepProgress?.(3, 'Validation', valStatus, `${validationResult.passedCount}/${validationResult.rulesChecked} rules passed`);

    // ----------------------------------------------------
    // STEP 4: Issuer Verification (Simulated)
    // ----------------------------------------------------
    t0 = performance.now();
    onStepProgress?.(4, 'Issuer Verification', 'PROCESSING', 'Querying simulated registry records');
    const issuerResult = await this.verifyIssuer(doc, {
      forceExpired: isExpiredScenario,
    });
    const issStatus: PipelineStepStatus =
      issuerResult.registryStatus === 'EXPIRED' || issuerResult.registryStatus === 'REVOKED'
        ? 'WARNING'
        : 'COMPLETED';
    recordAudit(
      4,
      'Issuer Verification',
      issStatus === 'WARNING' ? 'WARNING' : 'COMPLETED',
      `Simulated registry lookup returned status: ${issuerResult.registryStatus}.`,
      performance.now() - t0
    );
    onStepProgress?.(4, 'Issuer Verification', issStatus, `Status: ${issuerResult.registryStatus}`);

    // ----------------------------------------------------
    // STEP 5: Tampering Analysis (AI Forensics)
    // ----------------------------------------------------
    t0 = performance.now();
    onStepProgress?.(5, 'Tampering Analysis', 'PROCESSING', 'Forensic Vision Transformer & artifact boundary scan');
    const tamperingResult = await this.analyzeTampering(doc, {
      forceTampered: isTamperedScenario,
      forceClean: scenarioId === 'genuine',
    });
    const tampStatus: PipelineStepStatus =
      tamperingResult.tamperingScore >= 60
        ? 'FAILED'
        : tamperingResult.tamperingScore >= 30
        ? 'WARNING'
        : 'COMPLETED';
    recordAudit(
      5,
      'Tampering Analysis',
      tampStatus === 'FAILED' ? 'FAILED' : tampStatus === 'WARNING' ? 'WARNING' : 'COMPLETED',
      `Forensic AI tamper score: ${tamperingResult.tamperingScore}/100 (${tamperingResult.verdict}).`,
      performance.now() - t0
    );
    onStepProgress?.(5, 'Tampering Analysis', tampStatus, `${tamperingResult.indicators.length} anomalies flagged`);

    // ----------------------------------------------------
    // STEP 6: Biometric Face Verification
    // ----------------------------------------------------
    t0 = performance.now();
    onStepProgress?.(6, 'Face Verification', 'PROCESSING', 'Biometric landmark alignment & liveness verification');
    const faceResult = await this.verifyFace(doc.photoUrl, doc.livePhotoUrl);
    const faceStatus: PipelineStepStatus = faceResult.status === 'FAIL' ? 'FAILED' : faceResult.status === 'REVIEW' ? 'WARNING' : 'COMPLETED';
    recordAudit(
      6,
      'Face Verification',
      faceStatus === 'FAILED' ? 'FAILED' : faceStatus === 'WARNING' ? 'WARNING' : 'COMPLETED',
      `Biometric face match: ${faceResult.matchScore}% similarity. Liveness: ${faceResult.liveness}.`,
      performance.now() - t0
    );
    onStepProgress?.(6, 'Face Verification', faceStatus, `${faceResult.matchScore}% match`);

    // ----------------------------------------------------
    // STEP 7: NFC, Reference & Watchlist Parallel Checks
    // ----------------------------------------------------
    t0 = performance.now();
    onStepProgress?.(7, 'Risk Assessment', 'PROCESSING', 'Fusing NFC, Reference specimen & Lookout records');

    const nfcResult = await this.verifyNFC(doc, {
      forceMismatch: isTamperedScenario,
    });
    const referenceResult = await this.compareReference(doc, {
      forceLayoutVariance: isTamperedScenario,
    });
    const watchlistResult = await this.checkWatchlist(doc.documentNumber, doc.holderName, {
      forceMatch: isWatchlistScenario,
    });

    recordAudit(
      7,
      'NFC & Reference Checks',
      nfcResult.status === 'PASS' ? 'COMPLETED' : 'WARNING',
      `NFC cross-verification: ${nfcResult.readStatus}; Reference layout: ${referenceResult.layoutMatch}.`,
      performance.now() - t0
    );

    // ----------------------------------------------------
    // EVIDENCE FUSION & RISK CALCULATION
    // ----------------------------------------------------
    const evidence = EvidenceFusion.fuse({
      ocr: ocrResult,
      validation: validationResult,
      issuer: issuerResult,
      tampering: tamperingResult,
      face: faceResult,
      nfc: nfcResult,
      reference: referenceResult,
      watchlist: watchlistResult,
    });

    const riskResult = this.calculateRisk(evidence);

    const overallVerificationStatus: VerificationResult['status'] =
      riskResult.level === 'HIGH' ? 'FAILED' : riskResult.level === 'MEDIUM' ? 'WARNING' : 'COMPLETED';

    recordAudit(
      8,
      'Complete',
      overallVerificationStatus === 'FAILED' ? 'FAILED' : overallVerificationStatus === 'WARNING' ? 'WARNING' : 'COMPLETED',
      `Final Risk Score: ${riskResult.score}/100 (${riskResult.level}). Recommendation: ${riskResult.recommendation}.`,
      performance.now() - startTime
    );

    onStepProgress?.(8, 'Complete', overallVerificationStatus === 'FAILED' ? 'FAILED' : 'COMPLETED', `${riskResult.level} RISK`);

    // Generate actionable recommendations
    const recommendations: string[] = [];
    if (riskResult.level === 'HIGH') {
      recommendations.push('Immediate manual secondary inspection recommended.');
      if (tamperingResult.tamperingScore >= 60) {
        recommendations.push('Inspect physical document under forensic UV & oblique lighting for portrait replacement.');
      }
      if (nfcResult.status !== 'PASS') {
        recommendations.push('Verify physical credential against secure smart card reader / consular database.');
      }
      if (watchlistResult.status === 'MATCH_FOUND') {
        recommendations.push('Alert checkpoint supervisory officer regarding active lookout circular.');
      }
    } else if (riskResult.level === 'MEDIUM') {
      recommendations.push('Manual scrutiny of optical fields recommended.');
      recommendations.push('Request clear high-resolution document scan.');
    } else {
      recommendations.push('Standard clearance. All biometric and security checks passed within threshold.');
    }

    // Build upgraded DocumentData object with updated fields
    const updatedDocumentData: DocumentData = {
      ...doc,
      ocrFields: ocrResult.fields,
      validationItems: ValidationEngine.toLegacyValidationItems(validationResult),
      issuerItems: IssuerService.toLegacyIssuerItems(issuerResult),
      suspiciousElements: TamperingService.toLegacySuspiciousElements(tamperingResult),
      faceMatchScore: faceResult.matchScore,
      faceMatchStatus: faceResult.status === 'PASS' ? 'Faces match' : 'Biometric review required',
      riskScore: riskResult.score,
      riskLevel: `${riskResult.level} RISK` as 'LOW RISK' | 'MEDIUM RISK' | 'HIGH RISK',
      riskDescription: riskResult.explanation,
      riskContributors: RiskEngine.toLegacyRiskContributors(riskResult),
      aiSummary: `${riskResult.explanation} Recommendation: ${riskResult.recommendation}.`,
      processingTime: `${((performance.now() - startTime) / 1000).toFixed(1)} seconds`,
    };

    return {
      verificationId,
      status: overallVerificationStatus,
      documentType: doc.type,
      timestamp,
      document: updatedDocumentData,
      ocr: ocrResult,
      validation: validationResult,
      issuerVerification: issuerResult,
      tampering: tamperingResult,
      faceVerification: faceResult,
      nfcVerification: nfcResult,
      referenceComparison: referenceResult,
      watchlist: watchlistResult,
      risk: riskResult,
      evidence,
      recommendations,
      auditTrail,
    };
  }

  /**
   * 12. Save Record to Storage
   */
  public static saveVerificationRecord(
    result: VerificationResult,
    investigator?: string,
    location?: string,
    actionStatus?: 'SAVED' | 'FLAGGED' | 'CLEARED'
  ) {
    return RecordsStorage.saveRecord(result, investigator, location, actionStatus);
  }

  /**
   * Retrieve saved records
   */
  public static getSavedRecords() {
    return RecordsStorage.getRecords();
  }
}
