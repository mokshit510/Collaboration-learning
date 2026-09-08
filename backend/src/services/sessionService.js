/**
 * PRAMAAN Verification Session Service
 * Manages active verification sessions, phone device pairing,
 * and synchronized stage progression between Desktop Investigator Dashboard and Mobile Webapp.
 */

class SessionService {
  constructor() {
    this.sessions = new Map();
    this.activeSessionId = null;
    this.initDefaultSession();
  }

  generateSessionId() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `PRM-${yyyy}${mm}${dd}-${randomSuffix}`;
  }

  initDefaultSession() {
    const sessionId = this.generateSessionId();
    const session = {
      sessionId,
      createdAt: new Date().toISOString(),
      phoneConnected: false,
      lastPhonePing: null,
      deviceInfo: null,
      currentStage: 1,
      stageName: 'DOCUMENT_UPLOAD',
      faceCaptureRequested: false,
      document: null,
      nfcResult: null,
      faceResult: null,
      tamperingResult: null,
      updatedAt: new Date().toISOString(),
    };

    this.sessions.set(sessionId, session);
    this.activeSessionId = sessionId;
    return session;
  }

  createSession(customId = null, options = {}) {
    const sessionId = customId || this.generateSessionId();

    // Preserve active device pairing / heartbeat if active within last 9 seconds (Step 14)
    const prevSession = this.activeSessionId ? this.sessions.get(this.activeSessionId) : null;
    const hasRecentPing = prevSession?.lastPhonePing && (Date.now() - new Date(prevSession.lastPhonePing).getTime() < 9000);
    const lastPhonePing = hasRecentPing ? prevSession.lastPhonePing : null;
    const deviceInfo = hasRecentPing ? { ...prevSession.deviceInfo } : null;
    const phoneConnected = Boolean(hasRecentPing);

    const session = {
      sessionId,
      createdAt: new Date().toISOString(),
      phoneConnected,
      lastPhonePing,
      deviceInfo,
      currentStage: 1,
      stageName: 'DOCUMENT_UPLOAD',
      faceCaptureRequested: false,
      document: options.document || null,
      nfcResult: null,
      faceResult: null,
      tamperingResult: null,
      updatedAt: new Date().toISOString(),
    };

    this.sessions.set(sessionId, session);
    this.activeSessionId = sessionId;
    return session;
  }

  getActiveSession() {
    if (!this.activeSessionId || !this.sessions.has(this.activeSessionId)) {
      return this.initDefaultSession();
    }
    const session = this.sessions.get(this.activeSessionId);
    return this.refreshConnectionState(session);
  }

  getSession(sessionId) {
    if (!sessionId) return this.getActiveSession();
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    return this.refreshConnectionState(session);
  }

  refreshConnectionState(session) {
    if (!session.lastPhonePing) {
      session.phoneConnected = false;
    } else {
      // Connected if heartbeat received within last 9 seconds
      const elapsed = Date.now() - new Date(session.lastPhonePing).getTime();
      session.phoneConnected = elapsed < 9000;
    }
    return session;
  }

  updateHeartbeat(sessionId, deviceInfo = {}) {
    const session = this.getSession(sessionId);
    if (!session) return null;

    session.lastPhonePing = new Date().toISOString();
    session.phoneConnected = true;
    if (deviceInfo) {
      session.deviceInfo = { ...session.deviceInfo, ...deviceInfo };
    }
    session.updatedAt = new Date().toISOString();
    return session;
  }

  updateStage(sessionId, currentStage, stageName, additionalData = {}) {
    const session = this.getSession(sessionId);
    if (!session) return null;

    session.currentStage = currentStage;
    session.stageName = stageName || session.stageName;
    if (additionalData.document) {
      session.document = { ...session.document, ...additionalData.document };
    }
    if (additionalData.faceCaptureRequested !== undefined) {
      session.faceCaptureRequested = additionalData.faceCaptureRequested;
    }
    session.updatedAt = new Date().toISOString();
    return session;
  }

  requestFaceCapture(sessionId) {
    const session = this.getSession(sessionId);
    if (!session) return null;

    session.faceCaptureRequested = true;
    session.stageName = 'WAITING_FACE';
    session.currentStage = 6;
    session.updatedAt = new Date().toISOString();
    return session;
  }

  setNfcResult(sessionId, nfcResult) {
    const session = this.getSession(sessionId);
    if (!session) return null;

    if (nfcResult && typeof nfcResult === 'object') {
      nfcResult.sessionId = session.sessionId;
      if (session.document?.documentNumber) {
        nfcResult.documentNumber = session.document.documentNumber;
      }
    }

    session.nfcResult = nfcResult;
    session.currentStage = Math.max(session.currentStage, 3);
    session.stageName = 'NFC_RECEIVED';
    session.updatedAt = new Date().toISOString();
    return session;
  }

  setFaceResult(sessionId, faceResult) {
    const session = this.getSession(sessionId);
    if (!session) return null;

    if (faceResult && typeof faceResult === 'object') {
      faceResult.sessionId = session.sessionId;
      if (session.document?.documentNumber) {
        faceResult.documentNumber = session.document.documentNumber;
      }
    }

    session.faceResult = faceResult;
    session.faceCaptureRequested = false;
    session.currentStage = Math.max(session.currentStage, 6);
    session.stageName = 'FACE_RECEIVED';
    session.updatedAt = new Date().toISOString();
    return session;
  }

  setTamperingResult(sessionId, tamperingResult) {
    const session = this.getSession(sessionId);
    if (!session) return null;

    if (tamperingResult && typeof tamperingResult === 'object') {
      tamperingResult.sessionId = session.sessionId;
      if (session.document?.documentNumber) {
        tamperingResult.documentNumber = session.document.documentNumber;
      }
    }

    session.tamperingResult = tamperingResult;
    session.updatedAt = new Date().toISOString();
    return session;
  }

  setDocument(sessionId, documentData) {
    const session = this.getSession(sessionId);
    if (!session) return null;

    session.document = documentData;
    session.updatedAt = new Date().toISOString();
    return session;
  }

  resetSession(sessionId) {
    const session = this.getSession(sessionId);
    if (!session) return this.initDefaultSession();

    session.currentStage = 1;
    session.stageName = 'DOCUMENT_UPLOAD';
    session.faceCaptureRequested = false;
    session.document = null;
    session.nfcResult = null;
    session.faceResult = null;
    session.tamperingResult = null;
    session.updatedAt = new Date().toISOString();
    return session;
  }
}

export const sessionService = new SessionService();
export default sessionService;
