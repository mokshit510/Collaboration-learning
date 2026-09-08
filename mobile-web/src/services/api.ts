// API service for PRAMAAN Mobile Web Companion

export interface SessionData {
  sessionId: string;
  stage: number;
  stageName: string;
  phoneConnected: boolean;
  lastHeartbeat: string | null;
  faceCaptureRequested: boolean;
  document: {
    documentNumber?: string;
    holderName?: string;
    dob?: string;
    nationality?: string;
    expiryDate?: string;
    photoUrl?: string;
  } | null;
  nfcResult: any | null;
  faceResult: any | null;
  finalResult: any | null;
}

export function getDefaultApiBase(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('pramaan_api_base');
    if (saved) return saved;
    const host = window.location.hostname || 'localhost';
    return `http://${host}:5000`;
  }
  return 'http://localhost:5000';
}

export function setCustomApiBase(url: string) {
  const clean = url.replace(/\/+$/, '');
  localStorage.setItem('pramaan_api_base', clean);
}

export class MobileApiService {
  private static get baseUrl(): string {
    return getDefaultApiBase();
  }

  static async getCurrentSession(): Promise<SessionData | null> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/session/current`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.session || data.data || data;
    } catch {
      return null;
    }
  }

  static async getSession(sessionId: string): Promise<SessionData | null> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/session/${sessionId}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.session || data.data || data;
    } catch {
      return null;
    }
  }

  static async sendHeartbeat(sessionId: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/session/${sessionId}/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device: 'Mobile Companion Web', timestamp: new Date().toISOString() }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  static async verifyNfc(payload: {
    sessionId: string;
    nfcData: any;
    printedData?: any;
  }): Promise<any> {
    const res = await fetch(`${this.baseUrl}/api/v1/nfc/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(`NFC verification failed with HTTP ${res.status}`);
    }
    const data = await res.json();
    return data.data || data;
  }

  static async verifyFace(payload: {
    sessionId: string;
    livePhoto: string;
    documentPhoto?: string;
    forceMismatch?: boolean;
  }): Promise<any> {
    const res = await fetch(`${this.baseUrl}/api/v1/face/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(`Face verification failed with HTTP ${res.status}`);
    }
    const data = await res.json();
    return data.data || data;
  }

  static async resetSession(sessionId: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/session/${sessionId}/reset`, {
        method: 'POST',
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
