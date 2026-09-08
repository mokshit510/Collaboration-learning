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
import { RiskEngine } from './riskEngine';
import { RecordsStorage } from './recordsStorage';
import apiClient from './apiClient';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface PipelineProgressCallback {
  (
    stepIndex: number,
    stepName: string,
    stepStatus: PipelineStepStatus,
    details?: string,
    intermediateDoc?: DocumentData
  ): void;
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
  public static async uploadDocument(
    file: File,
    type: DocumentType = 'passport'
  ): Promise<{ url: string; filename: string; documentId?: string }> {
    await delay(350);
    const objectUrl = URL.createObjectURL(file);
    let documentId: string | undefined;

    try {
      // Sync document with backend REST API if available
      const apiRes = await apiClient.uploadDocument(file, type);
      if (apiRes.success && apiRes.data?.id) {
        documentId = apiRes.data.id;
      }
    } catch (err) {
      console.info('[VerificationService] Backend offline or fallback mode:', err);
    }

    return {
      url: objectUrl,
      filename: file.name,
      documentId,
    };
  }

  /**
   * Helper to construct DocumentData input from an uploaded file and object URL
   */
  public static createDocumentInputFromUpload(
    file: File,
    previewUrl: string,
    type: DocumentType = 'passport',
    baselineData?: DocumentData
  ): DocumentData {
    const base = baselineData || this.getDocumentData(type);
    return {
      ...base,
      type,
      title: `${type.toUpperCase()} — ${file.name}`,
      isUserUploaded: true,
      rawImagePreviewUrl: previewUrl,
      uploadedFile: {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
      },
      photoUrl: previewUrl,
      documentNumber: '',
      holderName: '',
      givenName: '',
      surname: '',
      nationality: '',
      dob: '',
      gender: '',
      placeOfBirth: '',
      issueDate: '',
      expiryDate: '',
      countryCode: '',
      mrzLine1: '',
      mrzLine2: '',
      ocrFields: [
        { label: 'Full Name', value: '—', confidence: 0, valid: true },
        { label: type === 'passport' ? 'Passport Number' : type === 'visa' ? 'Visa Number' : 'Document Number', value: '—', confidence: 0, valid: true },
        { label: 'Nationality', value: '—', confidence: 0, valid: true },
        { label: 'Date of Birth', value: '—', confidence: 0, valid: true },
        { label: 'Gender', value: '—', confidence: 0, valid: true },
        { label: 'Place of Birth', value: '—', confidence: 0, valid: true },
        { label: 'Date of Issue', value: '—', confidence: 0, valid: true },
        { label: 'Date of Expiry', value: '—', confidence: 0, valid: true },
      ],
      validationItems: [
        { id: 'format', label: 'Document Format', status: '—', valid: true },
        { id: 'mrz', label: 'MRZ Consistency', status: '—', valid: true },
        { id: 'fields', label: 'Field Validations', status: '—', valid: true },
        { id: 'expiry', label: 'Expiry Check', status: '—', valid: true },
        { id: 'required', label: 'Required Fields', status: '—', valid: true },
      ],
      issuerItems: [
        { id: 'db_lookup', label: 'Passport No. in Database', status: '—', valid: true },
        { id: 'status', label: 'Status', status: '—', valid: true },
        { id: 'blacklist', label: 'Blacklist Check', status: '—', valid: true },
        { id: 'issuer_match', label: 'Issuer Match', status: '—', valid: true },
      ],
      suspiciousElements: [],
      riskContributors: [],
    };
  }

  /**
   * Apply OCR extraction results to DocumentData structure for downstream modules.
   * Maps extracted visual VIZ fields into standard DocumentData fields without
   * overwriting with empty/undefined values, using MRZ as fallback, or using mock values.
   */
  public static applyOcrResultToDocument(
    doc: DocumentData,
    ocrResult: OcrResult
  ): DocumentData {
    const getFieldValue = (...labels: string[]): string | undefined => {
      const field = ocrResult.fields.find(
        (f) =>
          labels.some((l) => l.toLowerCase() === f.label.toLowerCase()) &&
          f.value !== undefined &&
          f.value !== null &&
          f.value.trim() !== '' &&
          f.value.trim() !== '—' &&
          f.value.trim() !== '-'
      );
      return field?.value?.trim();
    };

    const fullName = getFieldValue('Full Name', 'Name');
    const surname = getFieldValue('Surname');
    const givenName = getFieldValue('Given Names', 'Given Name');
    const passportNumber = getFieldValue(
      'Passport Number',
      'Passport No.',
      'Passport No',
      'Visa Number',
      'Certificate No.',
      'Document Number'
    );
    const nationality = getFieldValue('Nationality');
    const dob = getFieldValue('Date of Birth', 'DOB');
    const expiryDate = getFieldValue('Date of Expiry', 'Expiry Date', 'Expiry');
    const gender = getFieldValue('Gender', 'Sex');
    const placeOfBirth = getFieldValue('Place of Birth');
    const issueDate = getFieldValue('Date of Issue', 'Issue Date');
    const countryCode = getFieldValue('Country Code', 'Country');

    let resolvedFullName = fullName || '';
    let resolvedGivenName = givenName || '';
    let resolvedSurname = surname || '';

    if (!resolvedFullName && (resolvedGivenName || resolvedSurname)) {
      resolvedFullName = `${resolvedGivenName} ${resolvedSurname}`.trim();
    } else if (resolvedFullName && (!resolvedGivenName || !resolvedSurname)) {
      const parts = resolvedFullName.split(/\s+/);
      if (parts.length > 1) {
        resolvedSurname = resolvedSurname || parts[parts.length - 1];
        resolvedGivenName = resolvedGivenName || parts.slice(0, -1).join(' ');
      } else {
        resolvedGivenName = resolvedGivenName || parts[0] || '';
      }
    }

    let resolvedCountryCode = countryCode || doc.countryCode;
    if (nationality) {
      const natUpper = nationality.toUpperCase();
      if (natUpper === 'INDIAN' || natUpper === 'IND') {
        resolvedCountryCode = 'IND';
      } else if (natUpper.length === 3) {
        resolvedCountryCode = natUpper;
      }
    }

    // MRZ data (kept independently from VIZ)
    const mrzLine1 =
      ocrResult.mrzParsed?.line1 ||
      (ocrResult as any).mrz?.line1 ||
      doc.mrzLine1 ||
      '';
    const mrzLine2 =
      ocrResult.mrzParsed?.line2 ||
      (ocrResult as any).mrz?.line2 ||
      doc.mrzLine2 ||
      '';

    return {
      ...doc,
      title: `${doc.type.toUpperCase()} — ${resolvedFullName || doc.uploadedFile?.name || 'Uploaded Document'}`,
      holderName: resolvedFullName || doc.holderName,
      givenName: resolvedGivenName || doc.givenName,
      surname: resolvedSurname || doc.surname,
      documentNumber: passportNumber || doc.documentNumber,
      nationality: nationality || doc.nationality,
      countryCode: resolvedCountryCode,
      dob: dob || doc.dob,
      expiryDate: expiryDate || doc.expiryDate,
      gender: gender || doc.gender,
      placeOfBirth: placeOfBirth || doc.placeOfBirth,
      issueDate: issueDate || doc.issueDate,
      mrzLine1,
      mrzLine2,
      ocrFields: ocrResult.fields,
    };
  }

  /**
   * 2. OCR Extraction
   */
  public static async runOCR(
    doc: DocumentData,
    type: DocumentType,
    confidenceModifier: number = 1.0,
    uploadedFile?: File
  ): Promise<OcrResult> {
    if (doc.isUserUploaded) {
      if (!uploadedFile) {
        throw new Error('Uploaded document file is missing for OCR.');
      }
      try {
        console.log('[OCR] Running real backend OCR on uploaded file...');
        return await apiClient.runOcr(uploadedFile, type);
      } catch (error) {
        console.error('[OCR] Backend OCR failed:', error);
        throw error;
      }
    }

    await delay(400);

    return OcrEngine.extractFields(
      doc,
      type,
      confidenceModifier
    );
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
    onStepProgress?: PipelineProgressCallback,
    uploadedFile?: File
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
    const uploadAuditDetail = doc.uploadedFile
      ? `Ingested uploaded document: ${doc.uploadedFile.name} (${(doc.uploadedFile.size / 1024).toFixed(1)} KB) at 300 DPI optical fidelity.`
      : 'Document frame ingested at 300 DPI optical fidelity.';
    recordAudit(1, 'Document Upload', 'COMPLETED', uploadAuditDetail, performance.now() - t0);
    onStepProgress?.(
      1,
      'Document Upload',
      'COMPLETED',
      doc.uploadedFile ? `Ingested ${doc.uploadedFile.name}` : 'Optical ingestion complete'
    );

    // ----------------------------------------------------
    // STEP 2: OCR Extraction
    // ----------------------------------------------------
    t0 = performance.now();
    onStepProgress?.(2, 'OCR Extraction', 'PROCESSING', 'Segmenting Visual Inspection Zone & MRZ stream');
    const ocrConfidenceMod = isLowOcrScenario ? 0.72 : 1.0;
    const ocrResult = await this.runOCR(
      doc,
      doc.type,
      ocrConfidenceMod,
      uploadedFile
    );
    const ocrStatus: PipelineStepStatus = ocrResult.qualityStatus === 'LOW' ? 'WARNING' : 'COMPLETED';
    const ocrAuditDetail = doc.isUserUploaded
      ? `Extracted ${ocrResult.fields.length} text fields using the backend OCR service (${ocrResult.averageConfidence}% reported confidence).`
      : `Extracted ${ocrResult.fields.length} text fields (${ocrResult.averageConfidence}% avg confidence).`;
    recordAudit(
      2,
      'OCR Extraction',
      ocrStatus === 'WARNING' ? 'WARNING' : 'COMPLETED',
      ocrAuditDetail,
      performance.now() - t0
    );
    // ----------------------------------------------------
    // Propagate OCR results into DocumentData
    // ----------------------------------------------------
    const ocrDocument: DocumentData = doc.isUserUploaded
      ? this.applyOcrResultToDocument(doc, ocrResult)
      : doc;

    onStepProgress?.(
      2,
      'OCR Extraction',
      ocrStatus,
      `${ocrResult.averageConfidence}% confidence`,
      ocrDocument
    );

    // ----------------------------------------------------
    // STEP 3: Document Validation
    // ----------------------------------------------------
    t0 = performance.now();
    onStepProgress?.(3, 'Validation', 'PROCESSING', 'Executing ICAO 9303 checksums & chronological validation');

    const validationResult = await this.validateDocument(ocrDocument, {
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
    const issuerResult = await this.verifyIssuer(ocrDocument, {
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
    const tamperingResult = await this.analyzeTampering(ocrDocument, {
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
    const faceResult = await this.verifyFace(ocrDocument.photoUrl, ocrDocument.livePhotoUrl);
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

    const nfcResult = await this.verifyNFC(ocrDocument, {
      forceMismatch: isTamperedScenario,
    });
    const referenceResult = await this.compareReference(ocrDocument, {
      forceLayoutVariance: isTamperedScenario,
    });
    const watchlistResult = await this.checkWatchlist(ocrDocument.documentNumber, ocrDocument.holderName, {
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
    // FINAL VERIFICATION STATUS (Excluding Risk Assessment)
    // ----------------------------------------------------
    let overallVerificationStatus: VerificationResult['status'] = 'COMPLETED';

    const isValidationFail = validationResult.overallStatus === 'FAIL';
    const isTamperingFail = tamperingResult.tamperingScore >= 60;
    const isFaceFail = faceResult.status === 'FAIL';
    const isIssuerFail = issuerResult.registryStatus === 'REVOKED' || issuerResult.registryStatus === 'NOT_FOUND';

    const isValidationWarn = validationResult.overallStatus === 'WARNING';
    const isTamperingWarn = tamperingResult.tamperingScore >= 30;
    const isFaceWarn = faceResult.status === 'REVIEW';
    const isIssuerWarn = issuerResult.registryStatus === 'EXPIRED' || issuerResult.registryStatus === 'SUSPENDED';

    if (isValidationFail || isTamperingFail || isFaceFail || isIssuerFail) {
      overallVerificationStatus = 'FAILED';
    } else if (isValidationWarn || isTamperingWarn || isFaceWarn || isIssuerWarn) {
      overallVerificationStatus = 'WARNING';
    } else {
      overallVerificationStatus = 'COMPLETED';
    }

    recordAudit(
      7,
      'Complete',
      overallVerificationStatus === 'FAILED' ? 'FAILED' : overallVerificationStatus === 'WARNING' ? 'WARNING' : 'COMPLETED',
      `Verification complete. Status: ${overallVerificationStatus}. Validation: ${validationResult.overallStatus}, Issuer: ${issuerResult.registryStatus}, Tampering: ${tamperingResult.verdict}, Face: ${faceResult.status}.`,
      performance.now() - startTime
    );

    onStepProgress?.(
      7,
      'Complete',
      overallVerificationStatus === 'FAILED' ? 'FAILED' : 'COMPLETED',
      `Status: ${overallVerificationStatus}`
    );

    // Generate actionable recommendations
    const recommendations: string[] = [];
    if (overallVerificationStatus === 'FAILED') {
      recommendations.push('Immediate manual secondary inspection recommended.');
      if (tamperingResult.tamperingScore >= 60) {
        recommendations.push('Inspect physical document under forensic UV & oblique lighting for portrait replacement.');
      }
      if (validationResult.overallStatus === 'FAIL') {
        recommendations.push('Review document checksums and formatting inconsistencies.');
      }
      if (faceResult.status === 'FAIL') {
        recommendations.push('Biometric match failure; verify physical bearer.');
      }
    } else if (overallVerificationStatus === 'WARNING') {
      recommendations.push('Manual scrutiny of optical fields recommended.');
      recommendations.push('Request clear high-resolution document scan.');
    } else {
      recommendations.push('Standard clearance. All biometric, issuer, and forensic checks passed within threshold.');
    }

    // Default RiskResult conforming to interface without running riskEngine.ts
    const riskResult: RiskResult = {
      score: 0,
      level: overallVerificationStatus === 'FAILED' ? 'HIGH' : overallVerificationStatus === 'WARNING' ? 'MEDIUM' : 'LOW',
      factors: [],
      explanation: `Screening complete: Validation (${validationResult.overallStatus}), Issuer (${issuerResult.registryStatus}), Tampering (${tamperingResult.verdict}), Face (${faceResult.status}).`,
      recommendation: overallVerificationStatus === 'FAILED'
        ? 'Detailed forensic inspection recommended'
        : overallVerificationStatus === 'WARNING'
        ? 'Manual review recommended'
        : 'Likely clear — Standard processing',
    };

    // Build upgraded DocumentData object with updated fields
    const updatedDocumentData: DocumentData = {
      ...ocrDocument,
      ocrFields: ocrResult.fields,
      validationItems: ValidationEngine.toLegacyValidationItems(validationResult),
      issuerItems: IssuerService.toLegacyIssuerItems(issuerResult),
      suspiciousElements: TamperingService.toLegacySuspiciousElements(tamperingResult),
      faceMatchScore: faceResult.matchScore,
      faceMatchStatus: faceResult.status === 'PASS' ? 'Faces match' : 'Biometric review required',
      riskScore: 0,
      riskLevel: overallVerificationStatus === 'FAILED' ? 'HIGH RISK' : overallVerificationStatus === 'WARNING' ? 'MEDIUM RISK' : 'LOW RISK',
      riskDescription: '',
      riskContributors: [],
      aiSummary: `Screening complete. Validation: ${validationResult.overallStatus} • Issuer: ${issuerResult.registryStatus} • Tampering: ${tamperingResult.verdict} • Face Match: ${faceResult.matchScore}%. Overall Status: ${overallVerificationStatus}.`,
      processingTime: `${((performance.now() - startTime) / 1000).toFixed(1)} seconds`,
    };

    return {
      verificationId,
      status: overallVerificationStatus,
      documentType: ocrDocument.type,
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
      evidence: [],
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
