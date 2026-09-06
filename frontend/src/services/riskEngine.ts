/**
 * PRAMAAN Configurable Risk Engine
 * Transparent mathematical scoring engine:
 * 0–29: LOW
 * 30–59: MEDIUM
 * 60–100: HIGH
 *
 * Factors are explainable with exact point additions and recommendations.
 */

import type { RiskResult, RiskFactor, EvidenceItem, RiskContributor } from '../types';

export interface RiskWeightsConfig {
  tamperingWeight: number;      // Default: 0.40
  issuerWeight: number;         // Default: 0.35
  nfcMismatchWeight: number;    // Default: 0.25
  validationWeight: number;     // Default: 0.25
  faceMismatchWeight: number;   // Default: 0.35
  watchlistWeight: number;      // Default: 0.50
  referenceAnomalyWeight: number; // Default: 0.15
  ocrLowConfidenceWeight: number; // Default: 0.15
}

export const DEFAULT_RISK_WEIGHTS: RiskWeightsConfig = {
  tamperingWeight: 0.40,
  issuerWeight: 0.35,
  nfcMismatchWeight: 0.25,
  validationWeight: 0.25,
  faceMismatchWeight: 0.35,
  watchlistWeight: 0.50,
  referenceAnomalyWeight: 0.15,
  ocrLowConfidenceWeight: 0.15,
};

export class RiskEngine {
  private static weights: RiskWeightsConfig = { ...DEFAULT_RISK_WEIGHTS };

  public static configureWeights(custom: Partial<RiskWeightsConfig>) {
    this.weights = { ...this.weights, ...custom };
  }

  public static calculate(evidence: EvidenceItem[]): RiskResult {
    const factors: RiskFactor[] = [];
    let totalScore = 0;

    for (const item of evidence) {
      if (item.impactPoints > 0) {
        let severity: 'low' | 'medium' | 'high' = 'low';
        if (item.impactPoints >= 25) severity = 'high';
        else if (item.impactPoints >= 12) severity = 'medium';

        let category: string = item.vector;
        let desc = item.technicalFinding;

        if (item.vector === 'Tampering') {
          category = 'AI Tampering Forensics';
          desc = 'Photo perimeter splicing / font pixel inconsistencies detected';
        } else if (item.vector === 'NFC') {
          category = 'NFC Cross-Verification';
          desc = 'Digitally signed chip data contradicts visual printed text';
        } else if (item.vector === 'Validation') {
          category = 'Document Validation';
          desc = 'Checksum or temporal chronological sequence variance';
        } else if (item.vector === 'Issuer') {
          category = 'Issuer Status';
          desc = 'Credential recorded as expired, revoked, or unindexed in registry';
        } else if (item.vector === 'Reference') {
          category = 'Reference Specimen Anomaly';
          desc = 'Layout or security guilloche pattern displacement from authentic template';
        } else if (item.vector === 'Watchlist') {
          category = 'Watchlist Alert';
          desc = 'Document or identity matched against active Lookout Notice';
        } else if (item.vector === 'Face') {
          category = 'Biometric Discrepancy';
          desc = 'Facial match score below confidence threshold or liveness failure';
        }

        factors.push({
          category,
          weight: this.getWeightForVector(item.vector),
          pointsAdded: item.impactPoints,
          description: desc,
          severity,
        });

        totalScore += item.impactPoints;
      }
    }

    // Clamp score between 0 and 100
    const finalScore = Math.min(Math.max(totalScore, 0), 100);

    let level: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    let recommendation: 'Likely clear — Standard processing' | 'Manual review recommended' | 'Detailed forensic inspection recommended' =
      'Likely clear — Standard processing';
    let explanation = 'Document exhibits high forensic and biographical integrity across all verification vectors.';

    if (finalScore >= 60) {
      level = 'HIGH';
      recommendation = 'Detailed forensic inspection recommended';
      explanation = 'Multiple high-confidence anomalies detected across tampering, NFC correlation, or issuer checks. Critical alert.';
    } else if (finalScore >= 30) {
      level = 'MEDIUM';
      recommendation = 'Manual review recommended';
      explanation = 'Secondary variances or image quality limitations detected. Supervisory review advised.';
    }

    return {
      score: finalScore,
      level,
      factors,
      explanation,
      recommendation,
    };
  }

  private static getWeightForVector(vector: EvidenceItem['vector']): number {
    switch (vector) {
      case 'Tampering':
        return this.weights.tamperingWeight;
      case 'Issuer':
        return this.weights.issuerWeight;
      case 'NFC':
        return this.weights.nfcMismatchWeight;
      case 'Validation':
        return this.weights.validationWeight;
      case 'Face':
        return this.weights.faceMismatchWeight;
      case 'Watchlist':
        return this.weights.watchlistWeight;
      case 'Reference':
        return this.weights.referenceAnomalyWeight;
      case 'OCR':
        return this.weights.ocrLowConfidenceWeight;
      default:
        return 0.1;
    }
  }

  /**
   * Format factors into legacy RiskContributor[] format for existing UI components
   */
  public static toLegacyRiskContributors(result: RiskResult): RiskContributor[] {
    if (result.factors.length === 0) {
      return [
        { category: 'Tampering Analysis', points: 0, description: 'No signs of tampering or digital alteration' },
        { category: 'Document anomalies', points: 0, description: 'Baseline layout adheres to standard' },
        { category: 'Validation', points: 0, description: 'All mandatory checks and checksums passed' },
        { category: 'Face verification', points: 0, description: 'High biometric match confidence' },
        { category: 'Issuer verification', points: 0, description: 'Simulated issuer record confirmed active' },
      ];
    }

    return result.factors.map((f) => ({
      category: f.category,
      points: f.pointsAdded,
      description: f.description,
    }));
  }
}
