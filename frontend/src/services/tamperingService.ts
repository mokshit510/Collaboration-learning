/**
 * PRAMAAN Tampering Detection Service
 * Core AI Forensic Analysis Module.
 *
 * Connected directly to real Python AI forensic engine via Node backend:
 *   Frontend UI
 *        ↓
 *   ApiTamperingAnalyzer (resolves binary image from File / Blob)
 *        ↓
 *   POST /api/v1/tampering (Node backend)
 *        ↓
 *   POST http://localhost:8000/tampering/analyze (Python AI)
 *        ↓
 *   Real ELA, Copy-Move, and Edge-Seam forensics returned to UI
 */

import type { DocumentData, TamperingResult, SuspiciousElement } from '../types';
import { apiClient } from './apiClient';

export interface TamperingAnalyzerOptions {
  file?: File;
  sessionId?: string;
  forceTampered?: boolean;
  forceClean?: boolean;
}

export interface TamperingAnalyzerAdapter {
  analyze(doc: DocumentData, options?: TamperingAnalyzerOptions): Promise<TamperingResult>;
}

/**
 * Real AI Tampering Analyzer
 * Proxies the actual document image to the backend -> Python AI forensic microservice running:
 * - Error Level Analysis (ELA) for JPEG double compression
 * - Copy-move cloned feature matching (ORB)
 * - Photo splicing / edge-seam gradient discontinuity
 */
export class ApiTamperingAnalyzer implements TamperingAnalyzerAdapter {
  public async analyze(
    doc: DocumentData,
    options: TamperingAnalyzerOptions = {}
  ): Promise<TamperingResult> {
    try {
      let imageInput: File | Blob | string | null = null;

      if (options.file instanceof File) {
        imageInput = options.file;
      } else if (doc.rawImagePreviewUrl || doc.photoUrl) {
        const url = doc.rawImagePreviewUrl || doc.photoUrl;

        if (url.startsWith('data:')) {
          imageInput = url;
        } else if (
          typeof window !== 'undefined' &&
          (url.startsWith('blob:') || url.startsWith('/') || url.startsWith('http'))
        ) {
          try {
            const res = await fetch(url);
            if (res.ok) {
              imageInput = await res.blob();
            }
          } catch (fetchErr) {
            console.warn('[TamperingService] Could not fetch document image for analysis:', fetchErr);
          }
        }
      }

      if (!imageInput) {
        throw new Error('No document image available for AI forensic analysis');
      }

      console.log('[PRAMAAN][Tampering] Forwarding real document image to AI tampering endpoint...');
      const result = await apiClient.analyzeTampering(imageInput as any, {
        sessionId: options.sessionId,
        documentType: doc.type,
      });

      console.log('[PRAMAAN][Tampering] Real AI forensic analysis response:', {
        score: result.tamperingScore,
        verdict: result.verdict,
        confidence: result.confidence,
        regions: result.suspiciousRegions?.length,
        indicators: result.indicators?.length,
      });

      return result;
    } catch (err: any) {
      console.error('[TamperingService] Real AI analysis error:', err.message);
      // Explicit error state rather than fake clean pass
      return {
        isSimulated: false,
        modelIdentifier: 'PRAMAAN-ForensicVision-API-Unavailable',
        tamperingScore: 50,
        verdict: 'LOW_TAMPERING_SUSPICION',
        confidence: 0,
        indicators: [
          {
            id: 'ai_analysis_unavailable',
            title: 'Forensic Tampering AI Unavailable',
            severity: 'medium',
            confidence: 0,
            confidenceLabel: 'Low confidence',
            location: 'AI Forensic Inspection Layer',
            description: err.message || 'AI tampering analysis service is currently unreachable.',
            reasonCode: 'AI_SERVICE_UNAVAILABLE',
          },
        ],
        suspiciousRegions: [],
        reasonCodes: ['AI_SERVICE_UNAVAILABLE'],
      };
    }
  }
}

/**
 * Baseline Rule / Heuristic Forensics Analyzer (Preserved for offline unit testing)
 */
export class BaselineTamperingAnalyzer implements TamperingAnalyzerAdapter {
  public async analyze(
    doc: DocumentData,
    options: TamperingAnalyzerOptions = {}
  ): Promise<TamperingResult> {
    const isTampered =
      options.forceTampered ||
      (!options.forceClean && (((doc.riskScore ?? 0) > 50) || (doc.suspiciousElements?.length || 0) > 0));

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
    ];

    const suspiciousRegions = [
      { x: 12, y: 22, width: 26, height: 42, label: 'Portrait Perimeter Splice', severity: 'high' as const },
      { x: 44, y: 44, width: 28, height: 12, label: 'DOB Text Sub-sampling Variance', severity: 'medium' as const },
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
  private static adapter: TamperingAnalyzerAdapter = new ApiTamperingAnalyzer();

  /**
   * Set custom adapter (e.g. for offline mock testing)
   */
  public static setAdapter(adapter: TamperingAnalyzerAdapter) {
    this.adapter = adapter;
  }

  public static async analyze(
    doc: DocumentData,
    options?: TamperingAnalyzerOptions
  ): Promise<TamperingResult> {
    return this.adapter.analyze(doc, options);
  }

  /**
   * Helper to map indicators to legacy SuspiciousElement format
   */
  public static toLegacySuspiciousElements(res: TamperingResult): SuspiciousElement[] {
    return (res.indicators || []).map((i) => ({
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

export default TamperingService;
