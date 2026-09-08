import { sendSuccess, sendError } from '../utils/response.js';
import TamperingService from '../services/tamperingService.js';
import sessionService from '../services/sessionService.js';

export class TamperingController {
  /**
   * Process tampering analysis request
   */
  static async analyze(req, res) {
    try {
      const sessionId =
        req.body?.sessionId ||
        req.body?.session_id ||
        req.query?.sessionId ||
        req.headers['x-session-id'];

      if (sessionId && sessionService.activeSessionId && sessionId !== sessionService.activeSessionId) {
        return sendError(
          res,
          'The tampering analysis request belongs to a stale or completed verification session.',
          409,
          'STALE_VERIFICATION_SESSION'
        );
      }

      let buffer = null;
      let filename = 'document.jpg';
      let mimetype = 'image/jpeg';

      // 1. Check if multipart file upload exists
      if (req.file && req.file.buffer) {
        buffer = req.file.buffer;
        filename = req.file.originalname || filename;
        mimetype = req.file.mimetype || mimetype;
      }
      // 2. Check if base64 string provided in JSON body
      else if (req.body) {
        const rawImage = req.body.image || req.body.document || req.body.documentImage;
        if (typeof rawImage === 'string') {
          const trimmed = rawImage.trim();
          const match = trimmed.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            mimetype = match[1];
            filename = `document.${mimetype.split('/')[1] || 'jpg'}`;
            buffer = Buffer.from(match[2], 'base64');
          } else if (trimmed.length > 50) {
            buffer = Buffer.from(trimmed, 'base64');
          }
        }
      }

      if (!buffer || buffer.length === 0) {
        return sendError(
          res,
          'No document image provided. Please upload an image file or provide a base64 image string.',
          400
        );
      }

      const result = await TamperingService.processDocument({
        buffer,
        filename,
        mimetype,
      });

      if (sessionId || sessionService.activeSessionId) {
        const targetSessionId = sessionId || sessionService.activeSessionId;
        sessionService.setTamperingResult(targetSessionId, result);
        result.sessionId = targetSessionId;
      }

      return sendSuccess(res, result, 'Tampering analysis completed successfully');
    } catch (err) {
      console.error('[Tampering] Analysis error:', err.message);

      if (err.code === 'ECONNREFUSED' || err.message?.includes('ECONNREFUSED')) {
        return sendError(
          res,
          'AI tampering analysis service is currently unavailable. Please verify the AI service is running on port 8000.',
          503
        );
      }

      if (err.response) {
        const detail =
          err.response.data?.detail ||
          err.response.data?.message ||
          'Tampering analysis failed on AI service.';
        return sendError(res, detail, err.response.status || 500);
      }

      return sendError(res, err.message || 'Tampering analysis failed.', err.statusCode || 500);
    }
  }
}

export default TamperingController;
