import BackendFaceService from '../services/faceService.js';
import sessionService from '../services/sessionService.js';
import { sendSuccess, sendError } from '../utils/response.js';

export class FaceController {
  static async verify(req, res) {
    try {
      const sessionId =
        req.body?.sessionId ||
        req.body?.session_id ||
        req.headers['x-session-id'] ||
        null;

      if (sessionId && sessionService.activeSessionId && sessionId !== sessionService.activeSessionId) {
        return sendError(
          res,
          'The captured face photo belongs to a stale or completed verification session.',
          409,
          'STALE_VERIFICATION_SESSION'
        );
      }

      const payload = {
        ...(req.body || {}),
        files: req.files,
        file: req.file,
        sessionId: sessionId || sessionService.activeSessionId,
      };

      const faceResult = await BackendFaceService.verifyFace(payload);
      return sendSuccess(res, faceResult, 'Face verification processed successfully');
    } catch (err) {
      console.error('[Face] Verification error:', err.message);

      if (err.code === 'ECONNREFUSED' || err.message?.includes('ECONNREFUSED') || err.code === 'AI_SERVICE_UNAVAILABLE') {
        return sendError(
          res,
          'AI biometric verification service is unavailable. Please ensure the AI service on port 8000 is running.',
          503,
          'AI_SERVICE_UNAVAILABLE'
        );
      }

      const statusCode = err.statusCode || err.status || 500;
      const errorCode = err.code || (statusCode === 400 ? 'FACE_IMAGE_INVALID' : 'FACE_VERIFICATION_ERROR');
      return sendError(res, err.message || 'Failed to process face verification', statusCode, errorCode);
    }
  }

  static getLatest(req, res) {
    try {
      const sessionId = req.query.sessionId || req.params.sessionId;
      const faceResult = BackendFaceService.getLatest(sessionId);
      if (!faceResult) {
        return sendSuccess(res, null, 'No face data recorded for session yet');
      }
      return sendSuccess(res, faceResult, 'Latest face result retrieved');
    } catch (err) {
      return sendError(res, 'Failed to get latest face result', 500, err.message);
    }
  }
}

export default FaceController;
