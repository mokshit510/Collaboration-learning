/**
 * PRAMAAN Deterministic Risk Assessment & Evidence Fusion Engine (Stage 7)
 *
 * Core architectural principle:
 *   EVIDENCE → CORRELATION → RISK → HUMAN DECISION
 *
 * Implements a normalized 5-vector weighted forensic risk model:
 *   Tampering:   0.25
 *   Face:        0.25
 *   Issuer:      0.20
 *   NFC:         0.15
 *   Validation:  0.15
 *   Total:       1.00
 *
 * Governed by Critical Security Override Floors that prevent weighted averaging
 * from masking fatal security compromises (e.g., BLACKLISTED, REVOKED, EVIDENT_TAMPERING, FACE FAIL).
 */

import type { RiskResult, RiskFactor, EvidenceItem, RiskContributor } from '../types';

export interface RiskWeightsConfig {
  tamperingWeight: number;    // Default: 0.25
  faceMismatchWeight: number; // Default: 0.25
  issuerWeight: number;       // Default: 0.20
  nfcMismatchWeight: number;  // Default: 0.15
  validationWeight: number;   // Default: 0.15
}

export const DEFAULT_RISK_WEIGHTS: RiskWeightsConfig = {
  tamperingWeight: 0.25,
  faceMismatchWeight: 0.25,
  issuerWeight: 0.20,
  nfcMismatchWeight: 0.15,
  validationWeight: 0.15,
};

export class RiskEngine {
  private static weights: RiskWeightsConfig = { ...DEFAULT_RISK_WEIGHTS };

  public static configureWeights(custom: Partial<RiskWeightsConfig>) {
    this.weights = { ...this.weights, ...custom };
  }

  public static getWeights(): Readonly<RiskWeightsConfig> {
    return this.weights;
  }

  public static resetWeights(): void {
    this.weights = { ...DEFAULT_RISK_WEIGHTS };
  }

  /**
   * Calculate deterministic forensic risk from fused verification evidence.
   */
  public static calculate(evidence: EvidenceItem[]): RiskResult {
    // -------------------------------------------------------------
    // 1. Ingest Normalized Component Risks across 5 Primary Vectors
    // -------------------------------------------------------------
    const evidenceMap: Partial<Record<EvidenceItem['vector'], EvidenceItem>> = {};
    for (const item of evidence) {
      evidenceMap[item.vector] = item;
    }

    const tamperingItem = evidenceMap['Tampering'];
    const faceItem = evidenceMap['Face'];
    const issuerItem = evidenceMap['Issuer'];
    const nfcItem = evidenceMap['NFC'];
    const validationItem = evidenceMap['Validation'];

    // Normalized Component Risks (0–100)
    const tamperingRisk = tamperingItem ? tamperingItem.impactPoints : 0;
    const faceRisk = faceItem ? faceItem.impactPoints : 0;
    const issuerRisk = issuerItem ? issuerItem.impactPoints : 0;
    const nfcRisk = nfcItem ? nfcItem.impactPoints : 0;
    const validationRisk = validationItem ? validationItem.impactPoints : 0;

    // Vector Weights (Sum = 1.00)
    const wTampering = this.weights.tamperingWeight;
    const wFace = this.weights.faceMismatchWeight;
    const wIssuer = this.weights.issuerWeight;
    const wNfc = this.weights.nfcMismatchWeight;
    const wValidation = this.weights.validationWeight;

    // Base Weighted Risk Score (0–100)
    const baseRisk =
      tamperingRisk * wTampering +
      faceRisk * wFace +
      issuerRisk * wIssuer +
      nfcRisk * wNfc +
      validationRisk * wValidation;

    // -------------------------------------------------------------
    // 2. Critical Security Override Floors
    // -------------------------------------------------------------
    let applicableMinimumRisk = 0;
    const activeCriticalVectors = new Set<string>();

    // A. Issuer BLACKLISTED -> Minimum Score 90
    const issuerStatusRaw = issuerItem?.metadata?.registryStatus || '';
    if (issuerStatusRaw === 'BLACKLISTED') {
      applicableMinimumRisk = Math.max(applicableMinimumRisk, 90);
      activeCriticalVectors.add('Issuer');
    }

    // B. Issuer REVOKED -> Minimum Score 90
    if (issuerStatusRaw === 'REVOKED') {
      applicableMinimumRisk = Math.max(applicableMinimumRisk, 90);
      activeCriticalVectors.add('Issuer');
    }

    // C. Evident Tampering (Score >= 75) -> Minimum Score 80
    const tamperingVerdict = issuerItem?.metadata?.verdict || tamperingItem?.metadata?.verdict || '';
    if (
      tamperingVerdict === 'EVIDENT_TAMPERING' &&
      tamperingRisk >= 75
    ) {
      applicableMinimumRisk = Math.max(applicableMinimumRisk, 80);
      activeCriticalVectors.add('Tampering');
    }

    // D. Biometric Face Match FAIL -> Minimum Score 80
    const faceStatus = faceItem?.metadata?.status || (faceItem?.status === 'FAIL' ? 'FAIL' : '');
    if (faceStatus === 'FAIL') {
      applicableMinimumRisk = Math.max(applicableMinimumRisk, 80);
      activeCriticalVectors.add('Face');
    }

    // E. Issuer NOT FOUND in Central Database -> Minimum Score 70
    if (
      issuerStatusRaw === 'NOT_FOUND' ||
      issuerItem?.metadata?.documentFound === false
    ) {
      applicableMinimumRisk = Math.max(applicableMinimumRisk, 70);
      activeCriticalVectors.add('Issuer');
    }

    // F. Issuer Biographical MISMATCH -> Minimum Score 70 (High Risk Identity Variance)
    if (issuerStatusRaw === 'MISMATCH') {
      applicableMinimumRisk = Math.max(applicableMinimumRisk, 70);
      activeCriticalVectors.add('Issuer');
    }

    // G. Document Legally EXPIRED / Validation FAIL -> Minimum Score 60 (Document Invalid for Border Clearance)
    if (issuerStatusRaw === 'EXPIRED' || validationItem?.status === 'FAIL') {
      applicableMinimumRisk = Math.max(applicableMinimumRisk, 60);
      if (issuerStatusRaw === 'EXPIRED') activeCriticalVectors.add('Issuer');
      if (validationItem?.status === 'FAIL') activeCriticalVectors.add('Validation');
    }

    // Final Clamped Score (0–100 integer)
    const rawFinalScore = Math.max(baseRisk, applicableMinimumRisk);
    const finalScore = Math.min(100, Math.max(0, Math.round(rawFinalScore)));

    // -------------------------------------------------------------
    // 3. Build Explainable Evidence Factors
    // -------------------------------------------------------------
    interface VectorDef {
      vector: EvidenceItem['vector'];
      category: string;
      risk: number;
      weight: number;
      item: EvidenceItem | undefined;
    }

    const vectorDefs: VectorDef[] = [
      { vector: 'Tampering', category: 'AI Tampering Forensics', risk: tamperingRisk, weight: wTampering, item: tamperingItem },
      { vector: 'Face', category: 'Biometric Discrepancy', risk: faceRisk, weight: wFace, item: faceItem },
      { vector: 'Issuer', category: 'Issuer Status', risk: issuerRisk, weight: wIssuer, item: issuerItem },
      { vector: 'NFC', category: 'NFC Cross-Verification', risk: nfcRisk, weight: wNfc, item: nfcItem },
      { vector: 'Validation', category: 'Document Validation', risk: validationRisk, weight: wValidation, item: validationItem },
    ];

    // Compute base weighted points for each primary vector
    const basePointsMap = new Map<EvidenceItem['vector'], number>();
    for (const v of vectorDefs) {
      basePointsMap.set(v.vector, v.risk * v.weight);
    }

    // Allocate override elevation to critical vectors so table sums to finalScore
    const overrideLift = Math.max(0, finalScore - Math.round(baseRisk));
    const finalPointsMap = new Map<EvidenceItem['vector'], number>();

    if (overrideLift > 0 && activeCriticalVectors.size > 0) {
      let totalCriticalBase = 0;
      for (const critVec of activeCriticalVectors) {
        totalCriticalBase += basePointsMap.get(critVec as EvidenceItem['vector']) || 0;
      }

      let distributedLift = 0;
      const critArray = Array.from(activeCriticalVectors);
      for (let i = 0; i < critArray.length; i++) {
        const critVec = critArray[i] as EvidenceItem['vector'];
        const bPts = basePointsMap.get(critVec) || 0;
        let share = 0;
        if (i === critArray.length - 1) {
          share = overrideLift - distributedLift;
        } else {
          share = totalCriticalBase > 0
            ? Math.round(overrideLift * (bPts / totalCriticalBase))
            : Math.round(overrideLift / critArray.length);
          distributedLift += share;
        }
        finalPointsMap.set(critVec, Math.round(bPts + share));
      }

      // Non-critical vectors keep base points
      for (const v of vectorDefs) {
        if (!activeCriticalVectors.has(v.vector)) {
          finalPointsMap.set(v.vector, Math.round(basePointsMap.get(v.vector) || 0));
        }
      }
    } else {
      for (const v of vectorDefs) {
        finalPointsMap.set(v.vector, Math.round(basePointsMap.get(v.vector) || 0));
      }
    }

    // Ensure sum matches finalScore exactly through rounding correction if needed
    let calculatedSum = 0;
    for (const v of vectorDefs) {
      calculatedSum += finalPointsMap.get(v.vector) || 0;
    }
    const diff = finalScore - calculatedSum;
    if (diff !== 0 && finalScore > 0) {
      // Adjust the largest contributing vector
      let maxVec: EvidenceItem['vector'] = 'Tampering';
      let maxPts = -1;
      for (const v of vectorDefs) {
        const pts = finalPointsMap.get(v.vector) || 0;
        if (pts > maxPts) {
          maxPts = pts;
          maxVec = v.vector;
        }
      }
      finalPointsMap.set(maxVec, Math.max(0, (finalPointsMap.get(maxVec) || 0) + diff));
    }

    const factors: RiskFactor[] = [];

    for (const v of vectorDefs) {
      const pts = finalPointsMap.get(v.vector) || 0;
      if (v.risk > 0 || pts > 0) {
        let severity: 'low' | 'medium' | 'high' = 'low';
        if (v.risk >= 70 || pts >= 25 || activeCriticalVectors.has(v.vector)) {
          severity = 'high';
        } else if (v.risk >= 35 || pts >= 12) {
          severity = 'medium';
        }

        // PRESERVE REAL TECHNICAL FINDINGS (Do NOT overwrite with static boilerplate)
        const realFinding = v.item?.technicalFinding || `${v.category} variance detected (${v.risk}% risk).`;

        factors.push({
          category: v.category,
          weight: v.weight,
          pointsAdded: pts,
          description: realFinding,
          severity,
        });
      }
    }

    // Include Auxiliary Vectors (Specimen Reference & Watchlist) as informative factors if flagged
    const refItem = evidenceMap['Reference'];
    if (refItem && refItem.status !== 'PASS') {
      factors.push({
        category: 'Reference Specimen Anomaly',
        weight: 0.0,
        pointsAdded: 0,
        description: refItem.technicalFinding,
        severity: refItem.status === 'FAIL' ? 'high' : 'medium',
      });
    }

    const wlItem = evidenceMap['Watchlist'];
    if (wlItem && wlItem.status === 'FAIL') {
      factors.push({
        category: 'Watchlist Alert',
        weight: 0.0,
        pointsAdded: 0,
        description: wlItem.technicalFinding,
        severity: 'high',
      });
    }

    // -------------------------------------------------------------
    // 4. Determine Level, Recommendation, and Dynamic Explanation
    // -------------------------------------------------------------
    let level: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    let recommendation: RiskResult['recommendation'] = 'Likely clear — Standard processing';
    let explanation = 'All primary verification vectors passed with no significant risk indicators.';

    if (finalScore >= 60) {
      level = 'HIGH';
      recommendation = 'Detailed forensic inspection recommended';
      explanation = 'One or more high-severity verification failures require detailed inspection.';
    } else if (finalScore >= 30) {
      level = 'MEDIUM';
      recommendation = 'Manual review recommended';
      explanation = 'One or more verification vectors require supervisory review.';
    }

    return {
      score: finalScore,
      level,
      factors,
      explanation,
      recommendation,
    };
  }

  /**
   * Format factors into legacy RiskContributor[] format for existing UI components
   */
  public static toLegacyRiskContributors(result: RiskResult): RiskContributor[] {
    if (result.factors.length === 0) {
      return [
        { category: 'AI Tampering Forensics', points: 0, description: 'No signs of tampering or digital alteration' },
        { category: 'Biometric Discrepancy', points: 0, description: 'High biometric match confidence' },
        { category: 'Issuer Registry', points: 0, description: 'Authoritative issuer record confirmed active' },
        { category: 'NFC Cross-Verification', points: 0, description: 'Chip data matches printed visual zone' },
        { category: 'Document Validation', points: 0, description: 'All mandatory format and temporal checks passed' },
      ];
    }

    return result.factors.map((f) => ({
      category: f.category,
      points: f.pointsAdded,
      description: f.description,
    }));
  }
}
