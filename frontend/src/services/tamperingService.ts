/**
 * PRAMAAN Tampering Detection Service
 * Core AI Forensic Analysis Module.
 *
 * Implements a clean adapter architecture:
 *   TamperingService
 *          ↓
 *   Current Mock / Baseline Analyzer (Heuristic & synthetic rules)
 *          ↓
 *   Future Real ML Model API (ResNet/EfficientNet/Vision Transformer based)
 *
 * Clearly marked as DEMO / SIMULATED ANALYSIS when connected to mock adapter.
 */

import type { DocumentData, TamperingResult, SuspiciousElement } from '../types';

export interface TamperingAnalyzerAdapter {
  analyze(doc: DocumentData, options?: { forceTampered?: boolean; forceClean?: boolean }): Promise<TamperingResult>;
}

/**
 * Baseline Rule / Heuristic Forensics Analyzer
 * Simulates deep forensic feature extraction:
 * - Error Level Analysis (ELA) / JPEG compression artifact boundaries
 * - Copy-move forgery & splicing detection
 * - Font pixel sub-sampling & kerning anomalies
 * - Guilloche wave micro-pattern discontinuity
 */
export class BaselineTamperingAnalyzer implements TamperingAnalyzerAdapter {
  public async analyze(
    doc: DocumentData,
    options: { forceTampered?: boolean; forceClean?: boolean } = {}
  ): Promise<TamperingResult> {
    const isTampered =
      options.forceTampered ||
      (!options.forceClean && (doc.riskScore > 50 || doc.suspiciousElements?.length > 0));

    if (!isTampered) {
      return {
        isSimulated: true,
        modelIdentifier: 'PRAMAAN-ForensicVision-Baseline-Sim (v2026.1)',
        tamperingScore: 8,
        verdict: 'NO_TAMPERING_DETECTED',
        confidence: 96.5,
        indicators: [],
        suspiciousRegions: [],
        reasonCodes: ['CLEAN_SURFACE_GRID', 'COHERENT_COMPRESSION', 'GUILLOCHE_CONTINUITY_VERIFIED'],
      };
    }

    const indicators = [
      {
        id: 'photo_tamper',
        title: 'Possible photo replacement / splice',
        severity: 'high' as const,
        confidence: 92.4,
        confidenceLabel: 'High confidence' as const,
        location: 'Visual Inspection Zone (Portrait Bounding Box)',
        description: 'Edge-gradient discontinuity detected along portrait perimeter; potential digital overlay or re-insertion detected.',
        reasonCode: 'PHOTO_SPLICING_ANOMALY',
      },
      {
        id: 'text_inconsistency',
        title: 'Text region inconsistency (DOB)',
        severity: 'medium' as const,
        confidence: 84.7,
        confidenceLabel: 'Medium confidence' as const,
        location: 'Field: Date of Birth',
        description: 'Font kerning and pixel sub-sampling variance detected in date of birth numerical glyphs.',
        reasonCode: 'FONT_SUBPIXEL_INCONSISTENCY',
      },
      {
        id: 'compression_artifacts',
        title: 'Compression artifact anomaly',
        severity: 'medium' as const,
        confidence: 78.9,
        confidenceLabel: 'Medium confidence' as const,
        location: 'Document Header / Issuing Seal',
        description: 'Double JPEG compression grid boundary detected in header and issuing authority seal.',
        reasonCode: 'DOUBLE_COMPRESSION_GRID',
      },
      {
        id: 'texture_irregularity',
        title: 'Stamp / guilloche pattern irregularity',
        severity: 'low' as const,
        confidence: 65.2,
        confidenceLabel: 'Low confidence' as const,
        location: 'Background Guilloche Band',
        description: 'Guilloche wave pattern micro-alignment deviation detected in lower margin.',
        reasonCode: 'GUILLOCHE_PHASE_DEVIATION',
      },
    ];

    const suspiciousRegions = [
      { x: 12, y: 22, width: 26, height: 42, label: 'Portrait Perimeter Splice', severity: 'high' as const },
      { x: 44, y: 44, width: 28, height: 12, label: 'DOB Text Sub-sampling Variance', severity: 'medium' as const },
      { x: 30, y: 5, width: 45, height: 14, label: 'Dual JPEG Compression Artifact', severity: 'medium' as const },
      { x: 10, y: 82, width: 80, height: 15, label: 'Guilloche Micro-alignment Phase Shift', severity: 'low' as const },
    ];

    return {
      isSimulated: true,
      modelIdentifier: 'PRAMAAN-ForensicVision-Baseline-Sim (v2026.1)',
      tamperingScore: 82,
      verdict: 'EVIDENT_TAMPERING',
      confidence: 88.5,
      indicators,
      suspiciousRegions,
      reasonCodes: indicators.map((i) => i.reasonCode),
    };
  }
}

export class TamperingService {
  private static adapter: TamperingAnalyzerAdapter = new BaselineTamperingAnalyzer();

  /**
   * Set custom adapter (e.g. connected to teammate's PyTorch / TensorFlow backend)
   */
  public static setAdapter(adapter: TamperingAnalyzerAdapter) {
    this.adapter = adapter;
  }

  public static async analyze(
    doc: DocumentData,
    options?: { forceTampered?: boolean; forceClean?: boolean }
  ): Promise<TamperingResult> {
    return this.adapter.analyze(doc, options);
  }

  /**
   * Helper to map indicators to legacy SuspiciousElement format
   */
  public static toLegacySuspiciousElements(res: TamperingResult): SuspiciousElement[] {
    return res.indicators.map((i) => ({
      id: i.id,
      title: i.title,
      confidenceLevel: i.confidenceLabel,
      severity: i.severity,
      description: i.description,
      location: i.location,
      reasonCode: i.reasonCode,
    }));
  }
}
