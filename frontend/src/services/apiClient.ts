/**
 * PRAMAAN REST API Client
 * Centralizes backend communication and provides seamless toggle between MOCK MODE and API MODE.
 * Configured via environment variables:
 * - VITE_API_BASE_URL / VITE_API_URL: Backend base URL (e.g., http://localhost:5000/api)
 * - VITE_USE_MOCK: Set to 'false' to call real backend services (defaults to true for standalone demo/hackathon use)
 */

import type {
  VerificationResult,
  DocumentData,
  DocumentType,
  OcrResult,
  TamperingResult,
  FaceResult,
  NfcResult,
  SyntheticReferenceResult,
  WatchlistResult,
} from '../types';

export const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
  'http://localhost:5000/api';

export const IS_MOCK_MODE =
  typeof import.meta === 'undefined' || import.meta.env?.VITE_USE_MOCK !== 'false';

export class ApiClient {
  private baseUrl: string;
  private isMock: boolean;
  private token: string | null = null;

  constructor() {
    this.baseUrl = API_BASE_URL.replace(/\/+$/, '');
    this.isMock = IS_MOCK_MODE;
    this.token = typeof window !== 'undefined' ? localStorage.getItem('pramaan_token') : null;
  }

  public getMode(): 'MOCK' | 'API' {
    return this.isMock ? 'MOCK' : 'API';
  }

  public setMockMode(enabled: boolean) {
    this.isMock = enabled;
  }

  public setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('pramaan_token', token);
    }
  }

  public getToken(): string | null {
    if (!this.token && typeof window !== 'undefined') {
      this.token = localStorage.getItem('pramaan_token');
    }
    return this.token || 'mock-jwt';
  }

  public clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('pramaan_token');
    }
  }

  /**
   * Universal fetch wrapper with authorization and error handling
   */
  public async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    let cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    if (this.baseUrl.endsWith('/api') && cleanEndpoint.startsWith('/api/')) {
      cleanEndpoint = cleanEndpoint.substring(4);
    }
    const url = `${this.baseUrl}${cleanEndpoint}`;
    const token = this.getToken();

    const headers: HeadersInit = {
      Accept: 'application/json',
      ...(options.headers || {}),
    };

    if (token && !(options.body instanceof FormData)) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
      if (!(headers as Record<string, string>)['Content-Type']) {
        (headers as Record<string, string>)['Content-Type'] = 'application/json';
      }
    } else if (token && options.body instanceof FormData) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMsg = data.message || `API Error: ${response.status} ${response.statusText}`;
        console.error('[PRAMAAN][API] Response error:', {
          url,
          status: response.status,
          message: errorMsg,
        });
        throw new Error(errorMsg);
      }

      return data as T;
    } catch (error: any) {
      if (
        error instanceof TypeError &&
        (error.message.includes('fetch') || error.message.includes('NetworkError') || error.message.includes('Failed'))
      ) {
        console.warn(`[PRAMAAN][API] Failed to connect to backend at ${url}.`, error);
        throw new Error(`Unable to connect to backend at ${this.baseUrl}. Please verify the Node backend service is running.`);
      }
      throw error;
    }
  }

  // ========================================================
  // BACKEND INTEGRATION ENDPOINTS (AUTH & DOCUMENTS)
  // ========================================================

  public async getHealth() {
    return this.request<{ success: boolean; data: Record<string, unknown> }>('/health');
  }

  public async login(email: string, password: string) {
    const res = await this.request<{ success: boolean; data: { token: string; user: Record<string, unknown> } }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }
    );
    if (res.data?.token) {
      this.setToken(res.data.token);
    }
    return res.data;
  }

  public async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.clearToken();
    }
  }

  public async getMe() {
    return this.request<{ success: boolean; data: Record<string, unknown> }>('/auth/me');
  }

  public async uploadDocument(file: File, documentType: string = 'passport') {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('documentType', documentType);

    return this.request<{ success: boolean; data: { id: string; url?: string; [key: string]: unknown } }>(
      '/documents/upload',
      {
        method: 'POST',
        body: formData,
      }
    );
  }

  public async getDocuments() {
    return this.request<{ success: boolean; data: unknown[]; meta: Record<string, unknown> }>('/documents');
  }

  public async getDocumentById(id: string) {
    return this.request<{ success: boolean; data: Record<string, unknown> }>(`/documents/${id}`);
  }

  // ========================================================
  // VERIFICATION PIPELINE REST ENDPOINTS
  // ========================================================

  public async submitVerification(payload: {
    documentType: DocumentType;
    documentImage?: string;
    liveCaptureImage?: string;
    nfcTagData?: string;
  }): Promise<VerificationResult> {
    if (this.isMock) {
      throw new Error('In mock mode; use VerificationService mock pipeline instead.');
    }
    return this.request<VerificationResult>('/v1/verification', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async getVerificationById(id: string): Promise<VerificationResult> {
    return this.request<VerificationResult>(`/v1/verification/${encodeURIComponent(id)}`, {
      method: 'GET',
    });
  }

  public async runOcr(file: File, documentType: DocumentType = 'passport'): Promise<OcrResult> {
    console.log('[PRAMAAN][OCR] Dispatching OCR request:', {
      url: `${this.baseUrl}/v1/ocr`,
      documentType,
      fileName: file.name,
      fileSize: `${(file.size / 1024).toFixed(1)} KB`,
    });

    const formData = new FormData();
    formData.append('document', file);
    formData.append('documentType', documentType);

    try {
      const response = await this.request<{
        success: boolean;
        data: OcrResult;
        timestamp?: string;
      }>('/v1/ocr', {
        method: 'POST',
        body: formData,
      });

      console.log('[PRAMAAN][OCR] OCR response received successfully:', {
        qualityStatus: response.data?.qualityStatus,
        averageConfidence: response.data?.averageConfidence,
        fieldsExtracted: response.data?.fields?.length,
      });

      return response.data;
    } catch (err: any) {
      console.error('[PRAMAAN][OCR] Request failed:', {
        url: `${this.baseUrl}/v1/ocr`,
        documentType,
        fileName: file.name,
        error: err.message,
      });
      throw err;
    }
  }

  public async analyzeTampering(payload: {
    image: string;
    documentType: DocumentType;
  }): Promise<TamperingResult> {
    return this.request<TamperingResult>('/v1/tampering', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async verifyFace(payload: {
    documentPhoto: string;
    livePhoto: string;
  }): Promise<FaceResult> {
    return this.request<FaceResult>('/v1/face', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async verifyNfc(payload: {
    printedData: Partial<DocumentData>;
    nfcData: string;
  }): Promise<NfcResult> {
    return this.request<NfcResult>('/v1/nfc/verify', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async compareReference(payload: {
    document?: Partial<DocumentData> & { givenNames?: string; [key: string]: unknown };
    [key: string]: unknown;
  }): Promise<SyntheticReferenceResult> {
    const response = await this.request<{
      success: boolean;
      data: SyntheticReferenceResult;
    }>('/v1/reference/compare', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response.data;
  }

  public async checkWatchlist(payload: {
    documentNumber: string;
    name: string;
    dob?: string;
    nationality?: string;
  }): Promise<WatchlistResult> {
    return this.request<WatchlistResult>('/v1/watchlist/check', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // ========================================================
  // SESSION COORDINATION ENDPOINTS (DESKTOP & MOBILE PAIRING)
  // ========================================================

  public async getCurrentSession(): Promise<{ success: boolean; data: any }> {
    return this.request<{ success: boolean; data: any }>('/v1/session/current');
  }

  public async initSession(sessionId?: string): Promise<{ success: boolean; data: any }> {
    return this.request<{ success: boolean; data: any }>('/v1/session/init', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    });
  }

  public async getSessionById(sessionId: string): Promise<{ success: boolean; data: any }> {
    return this.request<{ success: boolean; data: any }>(`/v1/session/${encodeURIComponent(sessionId)}`);
  }

  public async sendHeartbeat(sessionId: string, deviceInfo?: any): Promise<{ success: boolean; data: any }> {
    return this.request<{ success: boolean; data: any }>(`/v1/session/${encodeURIComponent(sessionId)}/heartbeat`, {
      method: 'POST',
      body: JSON.stringify({ deviceInfo }),
    });
  }

  public async updateSessionStage(
    sessionId: string,
    currentStage: number,
    stageName: string,
    additionalData?: any
  ): Promise<{ success: boolean; data: any }> {
    return this.request<{ success: boolean; data: any }>(`/v1/session/${encodeURIComponent(sessionId)}/stage`, {
      method: 'POST',
      body: JSON.stringify({ currentStage, stageName, ...additionalData }),
    });
  }

  public async requestFaceCapture(sessionId: string): Promise<{ success: boolean; data: any }> {
    return this.request<{ success: boolean; data: any }>(`/v1/session/${encodeURIComponent(sessionId)}/request-face`, {
      method: 'POST',
    });
  }

  public async getLatestNfc(sessionId: string): Promise<NfcResult | null> {
    try {
      const res = await this.request<{ success: boolean; data: NfcResult }>(
        `/v1/nfc/latest?sessionId=${encodeURIComponent(sessionId)}`
      );
      return res.data || null;
    } catch {
      return null;
    }
  }

  public async getLatestFace(sessionId: string): Promise<FaceResult | null> {
    try {
      const res = await this.request<{ success: boolean; data: FaceResult }>(
        `/v1/face/latest?sessionId=${encodeURIComponent(sessionId)}`
      );
      return res.data || null;
    } catch {
      return null;
    }
  }
}

export const apiClient = new ApiClient();
export default apiClient;

console.log('[PRAMAAN] API mode:', apiClient.getMode());
console.log('[PRAMAAN] API base URL:', API_BASE_URL);
