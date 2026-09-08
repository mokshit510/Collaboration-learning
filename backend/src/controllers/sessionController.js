import sessionService from '../services/sessionService.js';
import { sendSuccess, sendError } from '../utils/response.js';

export class SessionController {
  static getCurrent(req, res) {
    try {
      const session = sessionService.getActiveSession();
      return sendSuccess(res, session, 'Active session retrieved');
    } catch (err) {
      return sendError(res, 'Failed to retrieve active session', 500, err.message);
    }
  }

  static initSession(req, res) {
    try {
      const { sessionId, document } = req.body || {};
      const session = sessionService.createSession(sessionId, { document });
      return sendSuccess(res, session, 'New verification session initialized', 201);
    } catch (err) {
      return sendError(res, 'Failed to initialize session', 500, err.message);
    }
  }

  static getById(req, res) {
    try {
      const { sessionId } = req.params;
      const session = sessionService.getSession(sessionId);
      if (!session) {
        return sendError(res, `Session ${sessionId} not found`, 404);
      }
      return sendSuccess(res, session, 'Session retrieved');
    } catch (err) {
      return sendError(res, 'Failed to retrieve session', 500, err.message);
    }
  }

  static heartbeat(req, res) {
    try {
      const { sessionId } = req.params;
      const { deviceInfo } = req.body || {};
      const targetId = sessionId && sessionId !== 'current' ? sessionId : sessionService.activeSessionId;
      const session = sessionService.updateHeartbeat(targetId, deviceInfo);

      if (!session) {
        return sendError(res, `Session ${targetId} not found`, 404);
      }
      return sendSuccess(res, {
        sessionId: session.sessionId,
        phoneConnected: session.phoneConnected,
        currentStage: session.currentStage,
        stageName: session.stageName,
        faceCaptureRequested: session.faceCaptureRequested,
      }, 'Heartbeat recorded');
    } catch (err) {
      return sendError(res, 'Failed to process heartbeat', 500, err.message);
    }
  }

  static updateStage(req, res) {
    try {
      const { sessionId } = req.params;
      const { currentStage, stageName, document, faceCaptureRequested } = req.body || {};
      const targetId = sessionId && sessionId !== 'current' ? sessionId : sessionService.activeSessionId;

      const session = sessionService.updateStage(targetId, currentStage, stageName, {
        document,
        faceCaptureRequested,
      });

      if (!session) {
        return sendError(res, `Session ${targetId} not found`, 404);
      }
      return sendSuccess(res, session, 'Stage updated');
    } catch (err) {
      return sendError(res, 'Failed to update stage', 500, err.message);
    }
  }

  static requestFace(req, res) {
    try {
      const { sessionId } = req.params;
      const targetId = sessionId && sessionId !== 'current' ? sessionId : sessionService.activeSessionId;
      const session = sessionService.requestFaceCapture(targetId);

      if (!session) {
        return sendError(res, `Session ${targetId} not found`, 404);
      }
      return sendSuccess(res, session, 'Face capture requested');
    } catch (err) {
      return sendError(res, 'Failed to request face capture', 500, err.message);
    }
  }

  static resetSession(req, res) {
    try {
      const { sessionId } = req.params;
      const targetId = sessionId && sessionId !== 'current' ? sessionId : sessionService.activeSessionId;
      const session = sessionService.resetSession(targetId);
      return sendSuccess(res, session, 'Session reset');
    } catch (err) {
      return sendError(res, 'Failed to reset session', 500, err.message);
    }
  }
}

export default SessionController;
