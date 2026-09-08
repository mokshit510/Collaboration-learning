/**
 * PRAMAAN Biometric Face Verification Service
 * Connects directly to backend -> Python AI FaceNet512 biometric microservice.
 * Compares Document Portrait against Live Checkpoint Camera Capture using 512-dimensional embeddings.
 */

import { apiClient } from './apiClient';
import type { FaceResult } from '../types';

export interface FaceVerificationOptions {
  sessionId?: string;
  file?: File;
}

export class FaceService {
  /**
   * Helper to resolve an image source (File, Blob, base64, or URL) into a decodable representation
   */
  private static async resolveImageInput(
    input: File | Blob | string | undefined | null
  ): Promise<File | Blob | string | null> {
    if (!input) return null;

    if (input instanceof File || input instanceof Blob) {
      return input;
    }

    if (typeof input === 'string') {
      const trimmed = input.trim();
      if (trimmed.startsWith('data:')) {
        return trimmed;
      }

      // In the browser, fetch blob: URLs or relative /images paths into in-memory binary Blobs
      if (
        typeof window !== 'undefined' &&
        (trimmed.startsWith('blob:') || trimmed.startsWith('/') || trimmed.startsWith('http'))
      ) {
        try {
          const res = await fetch(trimmed);
          if (res.ok) {
            return await res.blob();
          }
        } catch (fetchErr) {
          console.warn('[FaceService] Could not resolve image URL into Blob:', fetchErr);
        }
      }

      return trimmed;
    }

    return null;
  }

  /**
   * Verify face between document photo and live capture using real FaceNet512 AI
   */
  public static async verify(
    docPhoto: File | Blob | string,
    livePhoto: File | Blob | string,
    options: FaceVerificationOptions = {}
  ): Promise<FaceResult> {
    try {
      const docInput = options.file || (await this.resolveImageInput(docPhoto));
      const liveInput = await this.resolveImageInput(livePhoto);

      if (!docInput) {
        throw new Error('DOCUMENT_IMAGE_UNAVAILABLE: No document image provided for face verification');
      }

      if (!liveInput) {
        throw new Error('LIVE_FACE_IMAGE_UNAVAILABLE: No live face selfie provided for face verification');
      }

      const result = await apiClient.verifyFace({
        documentPhoto: docInput,
        livePhoto: liveInput,
        sessionId: options.sessionId,
      });

      return result;
    } catch (err: any) {
      console.error('[FaceService] Biometric verification execution failed:', err);
      // Explicit error result instead of fake fallback
      return {
        sessionId: options.sessionId,
        matchScore: 0,
        liveness: 'NOT_EVALUATED',
        documentFaceDetected: false,
        liveFaceDetected: false,
        status: 'FAIL',
        statusExplanation: err.message || 'Face verification service unavailable or invalid image data.',
        verifiedAt: new Date().toISOString(),
      };
    }
  }
}

export default FaceService;
