import BackendFaceService from '../services/faceService.js';
import { sendSuccess, sendError } from '../utils/response.js';

export class FaceController {
  static verify(req, res) {
    try {
      const faceResult = BackendFaceService.verifyFace(req.body || {});
      return sendSuccess(res, faceResult, 'Face verification processed successfully');
    } catch (err) {
      return sendError(res, 'Failed to process face verification', 500, err.message);
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
