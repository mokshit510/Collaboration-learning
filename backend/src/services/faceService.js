import fs from 'fs';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';
import config from '../config/env.js';
import sessionService from './sessionService.js';

/**
 * Helper to parse an image input (Multer file object, Buffer, base64 data URL,
 * raw base64, HTTP URL, or local file path) into a Buffer suitable for multipart upload.
 */
async function resolveImageBuffer(imageInput, defaultFilename = 'image.jpg') {
  if (!imageInput) return null;

  // 1. Direct Buffer
  if (Buffer.isBuffer(imageInput)) {
    return {
      buffer: imageInput,
      filename: defaultFilename,
      contentType: 'image/jpeg',
    };
  }

  // 2. Multer file object
  if (typeof imageInput === 'object' && Buffer.isBuffer(imageInput.buffer)) {
    return {
      buffer: imageInput.buffer,
      filename: imageInput.originalname || defaultFilename,
      contentType: imageInput.mimetype || 'image/jpeg',
    };
  }

  if (typeof imageInput === 'string') {
    const trimmed = imageInput.trim();

    // Browser-local blob: URLs cannot be fetched on backend Node.js process
    if (trimmed.startsWith('blob:')) {
      console.warn(`[Face] Cannot resolve browser-local blob URL on backend: ${trimmed.slice(0, 45)}...`);
      return null;
    }

    // 3. Base64 Data URL: data:image/jpeg;base64,...
    const dataUrlMatch = trimmed.match(/^data:([^;]+);base64,(.+)$/s);
    if (dataUrlMatch) {
      const contentType = dataUrlMatch[1];
      const base64Data = dataUrlMatch[2].replace(/\s+/g, '');
      const ext = contentType.split('/')[1] || 'jpg';
      try {
        const buffer = Buffer.from(base64Data, 'base64');
        return {
          buffer,
          filename: defaultFilename.includes('.') ? defaultFilename : `${defaultFilename}.${ext}`,
          contentType,
        };
      } catch (err) {
        console.warn('[Face] Failed to decode base64 data URL:', err.message);
        return null;
      }
    }

    // 4. HTTP/HTTPS URL: fetch binary arraybuffer
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      try {
        const response = await axios.get(trimmed, {
          responseType: 'arraybuffer',
          timeout: 10000,
        });
        const contentType = response.headers['content-type'] || 'image/jpeg';
        const buffer = Buffer.from(response.data);
        return {
          buffer,
          filename: defaultFilename,
          contentType,
        };
      } catch (err) {
        console.warn(`[Face] Could not fetch image from URL: ${trimmed}`, err.message);
        return null;
      }
    }

    // 5. Local file path resolution (e.g. /images/passport_photo.jpg or public static assets)
    if (trimmed.startsWith('/') || trimmed.startsWith('./') || trimmed.startsWith('../') || trimmed.includes('/')) {
      const cleaned = trimmed.replace(/^\//, '');
      const candidatePaths = [
        path.resolve(process.cwd(), '../frontend/public', cleaned),
        path.resolve(process.cwd(), '../frontend/dist', cleaned),
        path.resolve(process.cwd(), cleaned),
        path.resolve(process.cwd(), '..', cleaned),
      ];

      for (const p of candidatePaths) {
        if (fs.existsSync(p) && fs.statSync(p).isFile()) {
          try {
            const buffer = fs.readFileSync(p);
            const ext = path.extname(p).toLowerCase();
            const contentType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
            return {
              buffer,
              filename: path.basename(p),
              contentType,
            };
          } catch (err) {
            console.warn(`[Face] Could not read candidate image file at ${p}:`, err.message);
          }
        }
      }
    }

    // 6. Raw Base64 string (without data: prefix)
    if (trimmed.length > 50 && !trimmed.includes(' ') && !trimmed.includes('\n')) {
      try {
        const buffer = Buffer.from(trimmed, 'base64');
        if (buffer.length > 0) {
          return {
            buffer,
            filename: defaultFilename,
            contentType: 'image/jpeg',
          };
        }
      } catch {
        return null;
      }
    }
  }

  return null;
}

/**
 * Checks whether a buffer appears to be a valid image format (JPEG, PNG, WEBP, GIF)
 */
function isValidImageBuffer(buf) {
  if (!buf || !Buffer.isBuffer(buf) || buf.length < 32) return false;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
  // PNG: 89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true;
  // WEBP / RIFF
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46) return true;
  return false;
}

/**
 * PRAMAAN Biometric Face Verification Backend Service
 * Proxies live selfie capture from Mobile Companion and document portrait to Python AI service
 * running FaceNet512 biometric matching and landmark analysis.
 */
export class BackendFaceService {
  /**
   * Verify face against document portrait
   * @param {object} payload
   */
  static async verifyFace(payload = {}) {
    const sessionId = payload.sessionId || payload.session_id || sessionService.activeSessionId;
    const session = sessionService.getSession(sessionId);

    console.log(`[Face] FACE_REQUEST_STARTED sessionId: ${sessionId || 'unknown'}`);

    // Extract live face candidate from files or body
    const livePhotoInput =
      payload.files?.['live_face']?.[0] ||
      payload.files?.['livePhoto']?.[0] ||
      payload.files?.['selfie']?.[0] ||
      payload.livePhoto ||
      payload.image ||
      payload.livePhotoUrl ||
      payload.capturedImage ||
      '';

    // Extract document candidate from files, body, or active session
    const documentPhotoInput =
      payload.files?.['document']?.[0] ||
      payload.files?.['documentPhoto']?.[0] ||
      payload.file ||
      payload.documentPhoto ||
      payload.docPhotoUrl ||
      session?.document?.photoBase64 ||
      session?.document?.photoUrl ||
      session?.document?.image ||
      '';

    // Resolve decodable image buffers
    const liveImg = await resolveImageBuffer(livePhotoInput, 'live_face.jpg');
    const docImg = await resolveImageBuffer(documentPhotoInput, 'document.jpg');

    if (docImg && isValidImageBuffer(docImg.buffer)) {
      console.log(`[Face] DOCUMENT_IMAGE_RESOLVED (${docImg.buffer.length} bytes, type: ${docImg.contentType})`);
    } else {
      console.log('[Face] DOCUMENT_IMAGE_RESOLVED: FAILED (missing or invalid decodable buffer)');
    }

    if (liveImg && isValidImageBuffer(liveImg.buffer)) {
      console.log(`[Face] LIVE_FACE_IMAGE_RESOLVED (${liveImg.buffer.length} bytes, type: ${liveImg.contentType})`);
    } else {
      console.log('[Face] LIVE_FACE_IMAGE_RESOLVED: FAILED (missing or invalid decodable buffer)');
    }

    // Validate Document Image (Strict: No silent mock fallbacks!)
    if (!docImg || !isValidImageBuffer(docImg.buffer)) {
      console.error('[Face] FACE_VERIFICATION_FAILED: DOCUMENT_IMAGE_UNAVAILABLE');
      const err = new Error(
        'No valid document portrait image could be resolved for biometric comparison. ' +
        'Browser-local blob: URLs without binary data cannot be fetched by the backend.'
      );
      err.statusCode = 400;
      err.code = 'DOCUMENT_IMAGE_UNAVAILABLE';
      throw err;
    }

    // Validate Live Face Image (Strict: No silent mock fallbacks!)
    if (!liveImg || !isValidImageBuffer(liveImg.buffer)) {
      console.error('[Face] FACE_VERIFICATION_FAILED: LIVE_FACE_IMAGE_UNAVAILABLE');
      const err = new Error('No valid live selfie image provided for biometric verification.');
      err.statusCode = 400;
      err.code = 'LIVE_FACE_IMAGE_UNAVAILABLE';
      throw err;
    }

    // Construct multipart request for Python AI FaceNet512 service
    const form = new FormData();
    form.append('document', docImg.buffer, {
      filename: docImg.filename,
      contentType: docImg.contentType,
    });
    form.append('live_face', liveImg.buffer, {
      filename: liveImg.filename,
      contentType: liveImg.contentType,
    });

    try {
      console.log(`[Face] FACE_AI_REQUEST_SENT -> POST ${config.ai.serviceUrl}/face/verify`);

      const response = await axios.post(`${config.ai.serviceUrl}/face/verify`, form, {
        headers: form.getHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 45000,
      });

      console.log(`[Face] FACE_AI_RESPONSE_RECEIVED status: ${response.status}`);

      const aiData = response.data || {};
      const verification = aiData.verification || {};
      const docFace = aiData.document_face || {};

      // If AI service failed internally during face processing
      if (verification.available === false && verification.error) {
        console.warn('[Face] Biometric processing warning from AI:', verification.error);
        const failResult = {
          sessionId: sessionId || session?.sessionId,
          documentNumber: session?.document?.documentNumber,
          matchScore: 0.0,
          liveness: 'NOT_EVALUATED',
          documentFaceDetected: Boolean(docFace.detected),
          liveFaceDetected: false,
          status: 'FAIL',
          statusExplanation: verification.error,
          livePhotoUrl: typeof livePhotoInput === 'string' && livePhotoInput.startsWith('data:') ? livePhotoInput : undefined,
          verifiedAt: new Date().toISOString(),
          details: {
            verified: false,
            distance: null,
            threshold: null,
            orientationAdjusted: 0,
            model: verification.model || 'Facenet512',
            metric: verification.metric || 'cosine',
            error: verification.error,
          },
        };
        if (sessionId) sessionService.setFaceResult(sessionId, failResult);
        console.log('[Face] FACE_VERIFICATION_COMPLETED (Biometric Error Reported)');
        return failResult;
      }

      // Extract real calibrated match score from Python FaceNet512
      const matchScore =
        typeof verification.match_score === 'number'
          ? Math.round(verification.match_score * 10) / 10
          : verification.verified === true
          ? 90.0
          : 30.0;

      const verified = Boolean(verification.verified);
      let status = 'PASS';
      if (verified && matchScore >= 75) {
        status = 'PASS';
      } else if (matchScore >= 50) {
        status = 'REVIEW';
      } else {
        status = 'FAIL';
      }

      // Explicitly distinguish FACE MATCH from LIVENESS:
      // FaceNet512 evaluates facial vector distance, NOT live presentation attack detection.
      const liveness = 'NOT_EVALUATED';

      const statusExplanation =
        status === 'PASS'
          ? `Facial biometrics match across FaceNet512 landmark embeddings (${matchScore}% match score). Orientation adjusted: ${verification.orientation_adjusted || 0}°.`
          : status === 'REVIEW'
          ? `Facial likeness score (${matchScore}%) falls near boundary; secondary supervisory review recommended.`
          : `Facial similarity (${matchScore}%) falls below verified threshold. Identity mismatch suspected.`;

      const faceResult = {
        sessionId: sessionId || session?.sessionId,
        documentNumber: session?.document?.documentNumber,
        matchScore,
        liveness,
        documentFaceDetected: Boolean(docFace.detected),
        liveFaceDetected: true,
        status,
        statusExplanation,
        livePhotoUrl: typeof livePhotoInput === 'string' && livePhotoInput.startsWith('data:') ? livePhotoInput : undefined,
        verifiedAt: new Date().toISOString(),
        details: {
          verified: verification.verified,
          distance: verification.distance,
          threshold: verification.threshold,
          orientationAdjusted: verification.orientation_adjusted || 0,
          model: verification.model || 'Facenet512',
          metric: verification.metric || 'cosine',
        },
      };

      // Only attach confidence if actual AI response provided it
      if (typeof verification.confidence === 'number') {
        faceResult.confidence = verification.confidence;
      }

      // Bind to current verification session
      if (sessionId) {
        sessionService.setFaceResult(sessionId, faceResult);
      }

      console.log(`[Face] FACE_VERIFICATION_COMPLETED matchScore: ${matchScore}%, status: ${status}, liveness: ${liveness}`);
      return faceResult;

    } catch (err) {
      console.error(`[Face] FACE_VERIFICATION_FAILED: ${err.message}`);

      if (err.code === 'ECONNREFUSED' || err.message?.includes('ECONNREFUSED')) {
        const error = new Error('AI biometric verification service is unavailable. Please ensure the AI service on port 8000 is running.');
        error.code = 'AI_SERVICE_UNAVAILABLE';
        error.statusCode = 503;
        throw error;
      }

      if (err.response) {
        const detail = err.response.data?.detail || err.response.data?.message || 'Face verification failed on AI service';
        const error = new Error(detail);
        error.statusCode = err.response.status || 500;
        error.code = err.response.status === 400 ? 'FACE_IMAGE_INVALID' : 'AI_SERVICE_ERROR';
        throw error;
      }

      throw err;
    }
  }

  static getLatest(sessionId) {
    const session = sessionService.getSession(sessionId);
    return session?.faceResult || null;
  }
}

export default BackendFaceService;
