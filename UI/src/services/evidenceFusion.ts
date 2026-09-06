/**
 * PRAMAAN Evidence Fusion Engine
 *
 * Core architectural principle:
 *   EVIDENCE → CORRELATION → RISK → HUMAN DECISION
 *
 * Fuses isolated signals across all 8 verification vectors into a unified forensic evidence graph.
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

    // 1. OCR Extraction Vector
    evidence.push({
      id: 'ev_ocr',
      vector: 'OCR',
      status: params.ocr.qualityStatus === 'OPTIMAL' ? 'PASS' : params.ocr.qualityStatus === 'MODERATE' ? 'WARNING' : 'FAIL',
      impactPoints: params.ocr.qualityStatus === 'LOW' ? 15 : params.ocr.qualityStatus === 'MODERATE' ? 5 : 0,
      summary: `OCR Optical Quality: ${params.ocr.qualityStatus} (${params.ocr.averageConfidence}% avg confidence)`,
      technicalFinding: `Extracted ${params.ocr.fields.length} data fields. MRZ stream parsed with ${params.ocr.mrzParsed.documentType} format.`,
    });

    // 2. Validation Vector
    evidence.push({
      id: 'ev_validation',
      vector: 'Validation',
      status: params.validation.overallStatus,
      impactPoints:
        params.validation.overallStatus === 'FAIL'
          ? 25
          : params.validation.overallStatus === 'WARNING'
          ? 12
          : 0,
      summary: `Rule Consistency: ${params.validation.overallStatus} (${params.validation.passedCount}/${params.validation.rulesChecked} rules passed)`,
      technicalFinding:
        params.validation.overallStatus === 'PASS'
          ? 'ICAO 9303 checksums, temporal ordering, and syntax verified.'
          : params.validation.checks.find((c) => c.status !== 'PASS')?.explanation || 'Validation warnings detected.',
    });

    // 3. Issuer Verification Vector
    evidence.push({
      id: 'ev_issuer',
      vector: 'Issuer',
      status: params.issuer.documentFound && params.issuer.registryStatus === 'ACTIVE' ? 'PASS' : 'FAIL',
      impactPoints:
        params.issuer.registryStatus === 'EXPIRED'
          ? 30
          : params.issuer.registryStatus === 'REVOKED'
          ? 40
          : !params.issuer.documentFound
          ? 35
          : 0,
      summary: `Registry Lookup: ${params.issuer.registryStatus} (${params.issuer.isSimulated ? 'Simulated' : 'Official'})`,
      technicalFinding: `${params.issuer.issuingAuthority}: Record indexed. Blacklist state: ${params.issuer.blacklistStatus}.`,
    });

    // 4. Tampering Analysis Vector (Core AI)
    evidence.push({
      id: 'ev_tampering',
      vector: 'Tampering',
      status:
        params.tampering.tamperingScore >= 60
          ? 'FAIL'
          : params.tampering.tamperingScore >= 30
          ? 'WARNING'
          : 'PASS',
      impactPoints: Math.round(params.tampering.tamperingScore * 0.45),
      summary: `AI Tamper Forensics: ${params.tampering.verdict.replace(/_/g, ' ')} (${params.tampering.tamperingScore}/100 score)`,
      technicalFinding:
        params.tampering.indicators.length > 0
          ? params.tampering.indicators.map((i) => i.title).join('; ')
          : 'Surface pixel grid, compression markers, and guilloche alignment within baseline tolerances.',
    });

    // 5. Face Verification Vector
    evidence.push({
      id: 'ev_face',
      vector: 'Face',
      status: params.face.status === 'REVIEW' ? 'WARNING' : params.face.status,
      impactPoints: params.face.status === 'FAIL' ? 35 : params.face.status === 'REVIEW' ? 15 : 0,
      summary: `Biometric Match: ${params.face.matchScore}% similarity (${params.face.status})`,
      technicalFinding: `${params.face.statusExplanation} Liveness: ${params.face.liveness}.`,
    });

    // 6. NFC Prototype Credential Vector
    evidence.push({
      id: 'ev_nfc',
      vector: 'NFC',
      status: params.nfc.status,
      impactPoints: params.nfc.status === 'FAIL' ? 30 : params.nfc.status === 'WARNING' ? 20 : 0,
      summary: `Secure NFC Prototype: ${params.nfc.readStatus} (${params.nfc.status})`,
      technicalFinding: params.nfc.explanation,
    });

    // 7. Document Reference Vector
    evidence.push({
      id: 'ev_reference',
      vector: 'Reference',
      status: params.reference.status,
      impactPoints: params.reference.status === 'FAIL' ? 20 : params.reference.status === 'WARNING' ? 10 : 0,
      summary: `Reference Comparison: ${params.reference.layoutMatch} (${params.reference.status})`,
      technicalFinding:
        params.reference.anomalies.length > 0
          ? params.reference.anomalies.join(' ')
          : `Specimen match against ${params.reference.documentType}. Geometry and security features verified.`,
    });

    // 8. Watchlist Vector
    evidence.push({
      id: 'ev_watchlist',
      vector: 'Watchlist',
      status: params.watchlist.status === 'MATCH_FOUND' ? 'FAIL' : 'PASS',
      impactPoints: params.watchlist.status === 'MATCH_FOUND' ? 50 : 0,
      summary: `Watchlist Screening: ${params.watchlist.status.replace(/_/g, ' ')}`,
      technicalFinding: params.watchlist.explanation,
    });

    return evidence;
  }
}
