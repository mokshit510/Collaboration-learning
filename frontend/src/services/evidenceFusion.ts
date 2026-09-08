/**
 * PRAMAAN Evidence Fusion Engine
 *
 * Core architectural principle:
 *   EVIDENCE → CORRELATION → RISK → HUMAN DECISION
 *
 * Fuses real forensic signals across all verification vectors into a normalized,
 * explainable forensic evidence graph without arbitrary scaling or lost metadata.
 */

import type {
  EvidenceItem,
  OcrResult,
  ValidationResult,
  IssuerResult,
  TamperingResult,
  FaceResult,
  NfcResult,
  ReferenceResult,
  WatchlistResult,
} from '../types';

export class EvidenceFusion {
  public static fuse(params: {
    ocr: OcrResult;
    validation: ValidationResult;
    issuer: IssuerResult;
    tampering: TamperingResult;
    face: FaceResult;
    nfc: NfcResult;
    reference: ReferenceResult;
    watchlist: WatchlistResult;
  }): EvidenceItem[] {
    const evidence: EvidenceItem[] = [];

    // ------------------------------------------------------------------
    // 1. OCR Extraction Vector
    // ------------------------------------------------------------------
    const ocrQuality = params.ocr.qualityStatus;
    const ocrRisk = ocrQuality === 'LOW' ? 60 : ocrQuality === 'MODERATE' ? 25 : 0;
    const ocrStatus: EvidenceItem['status'] =
      ocrQuality === 'OPTIMAL' ? 'PASS' : ocrQuality === 'MODERATE' ? 'WARNING' : 'FAIL';

    evidence.push({
      id: 'ev_ocr',
      vector: 'OCR',
      status: ocrStatus,
      impactPoints: ocrRisk,
      summary: `OCR Optical Quality: ${ocrQuality} (${params.ocr.averageConfidence}% avg confidence)`,
      technicalFinding: `Extracted ${params.ocr.fields.length} data fields. MRZ stream parsed with ${params.ocr.mrzParsed?.documentType || 'standard'} format. Optical confidence: ${params.ocr.averageConfidence}%.`,
      metadata: {
        qualityStatus: ocrQuality,
        averageConfidence: params.ocr.averageConfidence,
        fieldsCount: params.ocr.fields.length,
      },
    });

    // ------------------------------------------------------------------
    // 2. Validation Vector (Document Fields & Chronology)
    // ------------------------------------------------------------------
    const valStatus = params.validation.overallStatus;
    let validationRisk = 0;
    if (valStatus === 'FAIL') {
      validationRisk = 85;
    } else if (valStatus === 'WARNING') {
      validationRisk = 40;
    }

    const failingCheck = params.validation.checks.find((c) => c.status !== 'PASS');
    const valFinding =
      valStatus === 'PASS'
        ? 'Document syntax, temporal ordering, and field formats verified.'
        : failingCheck
        ? `${failingCheck.ruleName}: ${failingCheck.explanation}`
        : 'Validation rule warnings detected.';

    evidence.push({
      id: 'ev_validation',
      vector: 'Validation',
      status: valStatus,
      impactPoints: validationRisk,
      summary: `Rule Consistency: ${valStatus} (${params.validation.passedCount}/${params.validation.rulesChecked} rules passed)`,
      technicalFinding: valFinding,
      metadata: {
        overallStatus: valStatus,
        passedCount: params.validation.passedCount,
        rulesChecked: params.validation.rulesChecked,
        failingRule: failingCheck?.ruleName,
      },
    });

    // ------------------------------------------------------------------
    // 3. Issuer Verification Vector (Authoritative Reference DB)
    // ------------------------------------------------------------------
    const isDocFound = params.issuer.documentFound !== false;
    const rawStatus = (params.issuer.registryStatus || '').toUpperCase();

    let effectiveRegistryStatus = rawStatus;
    let issuerRisk = 0;
    let issuerStatus: EvidenceItem['status'] = 'PASS';
    let issuerFinding = '';

    if (!isDocFound || rawStatus === 'NOT_FOUND') {
      effectiveRegistryStatus = 'NOT_FOUND';
      issuerRisk = 85;
      issuerStatus = 'FAIL';
      issuerFinding = `${params.issuer.issuingAuthority || 'Issuing Authority'}: Document number not located in central issuer registry.`;
    } else if (rawStatus === 'BLACKLISTED') {
      issuerRisk = 100;
      issuerStatus = 'FAIL';
      issuerFinding = `${params.issuer.issuingAuthority || 'Issuing Authority'}: Credential or holder is officially BLACKLISTED in authoritative registry.`;
    } else if (rawStatus === 'REVOKED') {
      issuerRisk = 90;
      issuerStatus = 'FAIL';
      issuerFinding = `${params.issuer.issuingAuthority || 'Issuing Authority'}: Credential has been REVOKED by issuing authority.`;
    } else if (rawStatus === 'SUSPICIOUS') {
      issuerRisk = 80;
      issuerStatus = 'FAIL';
      issuerFinding = `${params.issuer.issuingAuthority || 'Issuing Authority'}: Credential record flagged as SUSPICIOUS in registry.`;
    } else if (rawStatus === 'MISMATCH') {
      issuerRisk = 75;
      issuerStatus = 'FAIL';
      const mismatchedList = params.issuer.referenceComparison?.mismatchedFields;
      const mismatchDesc =
        mismatchedList && mismatchedList.length > 0
          ? `Mismatched fields: ${mismatchedList.join(', ')}`
          : 'Biographical identity contradicts reference record';
      issuerFinding = `${params.issuer.issuingAuthority || 'Issuing Authority'}: Central registry identity MISMATCH. ${mismatchDesc}.`;
    } else if (rawStatus === 'EXPIRED') {
      issuerRisk = 60;
      issuerStatus = 'FAIL';
      issuerFinding = `${params.issuer.issuingAuthority || 'Issuing Authority'}: Credential recorded as EXPIRED in authoritative registry.`;
    } else if (rawStatus === 'ACTIVE' || rawStatus === 'VERIFIED') {
      issuerRisk = 0;
      issuerStatus = 'PASS';
      issuerFinding = `${params.issuer.issuingAuthority || 'Issuing Authority'}: Record indexed and verified active in authoritative database.`;
    } else {
      // Fallback for unknown status
      issuerRisk = 40;
      issuerStatus = 'WARNING';
      issuerFinding = `${params.issuer.issuingAuthority || 'Issuing Authority'}: Registry status '${rawStatus}' requires manual verification.`;
    }

    evidence.push({
      id: 'ev_issuer',
      vector: 'Issuer',
      status: issuerStatus,
      impactPoints: issuerRisk,
      summary: `Registry Lookup: ${effectiveRegistryStatus} (${params.issuer.isSimulated ? 'Simulated' : 'Official'})`,
      technicalFinding: issuerFinding,
      metadata: {
        registryStatus: effectiveRegistryStatus,
        documentFound: isDocFound,
        isBlacklisted: effectiveRegistryStatus === 'BLACKLISTED',
        isRevoked: effectiveRegistryStatus === 'REVOKED',
        isMismatch: effectiveRegistryStatus === 'MISMATCH',
        mismatchedFields: params.issuer.referenceComparison?.mismatchedFields,
      },
    });

    // ------------------------------------------------------------------
    // 4. Tampering Analysis Vector (Python AI Forensics)
    // ------------------------------------------------------------------
    const tamperingScore = Math.min(100, Math.max(0, Math.round(params.tampering.tamperingScore || 0)));
    const tamperingRisk = tamperingScore; // Direct 1:1 mapping (0–100)

    const tamperingStatus: EvidenceItem['status'] =
      tamperingScore >= 60 ? 'FAIL' : tamperingScore >= 30 ? 'WARNING' : 'PASS';

    let tamperingFinding = '';
    if (params.tampering.indicators && params.tampering.indicators.length > 0) {
      tamperingFinding = params.tampering.indicators
        .map((i) => (i.description ? `${i.title}: ${i.description}` : i.title))
        .join('; ');
    } else if (params.tampering.verdict === 'EVIDENT_TAMPERING') {
      tamperingFinding = `Forensic pixel anomalies and cloned features indicate evident tampering (${tamperingScore}% suspicion).`;
    } else {
      tamperingFinding = 'Surface pixel grid, compression markers, and guilloche alignment within baseline tolerances.';
    }

    evidence.push({
      id: 'ev_tampering',
      vector: 'Tampering',
      status: tamperingStatus,
      impactPoints: tamperingRisk,
      summary: `AI Tamper Forensics: ${params.tampering.verdict.replace(/_/g, ' ')} (${tamperingScore}/100 score)`,
      technicalFinding: tamperingFinding,
      metadata: {
        tamperingScore,
        verdict: params.tampering.verdict,
        confidence: params.tampering.confidence,
        indicatorsCount: params.tampering.indicators?.length || 0,
      },
    });

    // ------------------------------------------------------------------
    // 5. Face Verification Vector (FaceNet512 AI Biometrics)
    // ------------------------------------------------------------------
    const faceMatchScore = params.face.matchScore ?? 0;
    const faceStatusRaw = params.face.status;
    let faceRisk = 0;
    let faceStatus: EvidenceItem['status'] = 'PASS';

    if (faceStatusRaw === 'FAIL') {
      faceRisk = Math.round(Math.max(80, Math.min(100, 100 - faceMatchScore)));
      faceStatus = 'FAIL';
    } else if (faceStatusRaw === 'REVIEW') {
      faceRisk = Math.round(Math.max(35, Math.min(65, 100 - faceMatchScore)));
      faceStatus = 'WARNING';
    } else {
      faceRisk = 0;
      faceStatus = 'PASS';
    }

    const distInfo =
      typeof params.face.details?.distance === 'number'
        ? ` Distance: ${params.face.details.distance.toFixed(4)} (threshold: 0.4000).`
        : '';
    const faceExplanation = params.face.statusExplanation || (faceStatus === 'PASS' ? 'Biometric facial match confirmed.' : 'Biometric match discrepancy detected.');
    const faceFinding = `${faceExplanation} FaceNet512 similarity: ${faceMatchScore}%.${distInfo}`;

    evidence.push({
      id: 'ev_face',
      vector: 'Face',
      status: faceStatus,
      impactPoints: faceRisk,
      summary: `Biometric Match: ${faceMatchScore}% similarity (${faceStatusRaw})`,
      technicalFinding: faceFinding,
      metadata: {
        status: faceStatusRaw,
        matchScore: faceMatchScore,
        distance: params.face.details?.distance,
      },
    });

    // ------------------------------------------------------------------
    // 6. NFC Prototype Credential Vector
    // ------------------------------------------------------------------
    const nfcStatusRaw = params.nfc.status;
    let nfcRisk = 0;
    if (nfcStatusRaw === 'FAIL') {
      nfcRisk = 85;
    } else if (nfcStatusRaw === 'WARNING') {
      nfcRisk = 40;
    }

    evidence.push({
      id: 'ev_nfc',
      vector: 'NFC',
      status: nfcStatusRaw,
      impactPoints: nfcRisk,
      summary: `Secure NFC Prototype: ${params.nfc.readStatus} (${nfcStatusRaw})`,
      technicalFinding: params.nfc.explanation || (nfcStatusRaw === 'PASS' ? 'Digitally signed chip payload matches visual printed data.' : 'NFC cross-verification discrepancy.'),
      metadata: {
        status: nfcStatusRaw,
        readStatus: params.nfc.readStatus,
        integrityVerified: params.nfc.integrityVerified,
      },
    });

    // ------------------------------------------------------------------
    // 7. Document Reference Vector (Auxiliary Specimen Layout)
    // ------------------------------------------------------------------
    const refStatus = params.reference.status;
    const refRisk = refStatus === 'FAIL' ? 60 : refStatus === 'WARNING' ? 30 : 0;

    evidence.push({
      id: 'ev_reference',
      vector: 'Reference',
      status: refStatus,
      impactPoints: refRisk,
      summary: `Reference Comparison: ${params.reference.layoutMatch} (${refStatus})`,
      technicalFinding:
        params.reference.anomalies.length > 0
          ? params.reference.anomalies.join(' ')
          : `Specimen match against ${params.reference.documentType}. Geometry and security features verified.`,
      metadata: {
        status: refStatus,
        layoutMatch: params.reference.layoutMatch,
      },
    });

    // ------------------------------------------------------------------
    // 8. Watchlist Vector (Auxiliary Screening)
    // ------------------------------------------------------------------
    const wlStatus = params.watchlist.status === 'MATCH_FOUND' ? 'FAIL' : 'PASS';
    const wlRisk = params.watchlist.status === 'MATCH_FOUND' ? 80 : 0;

    evidence.push({
      id: 'ev_watchlist',
      vector: 'Watchlist',
      status: wlStatus,
      impactPoints: wlRisk,
      summary: `Watchlist Screening: ${params.watchlist.status.replace(/_/g, ' ')}`,
      technicalFinding: params.watchlist.explanation,
      metadata: {
        status: params.watchlist.status,
        matchCount: params.watchlist.matchCount,
      },
    });

    return evidence;
  }
}
