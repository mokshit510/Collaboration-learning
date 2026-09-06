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
  ReferenceResult,
  WatchlistResult,
} from '../types';

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000/api';

export const IS_MOCK_MODE = import.meta.env.VITE_USE_MOCK !== 'false';

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
    return this.token || 'mock-jwt-b1a2c3d4-0001-4000-8000-000000000001';
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
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
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
        throw new Error(data.message || `API Error: ${response.status} ${response.statusText}`);
      }

      return data as T;
    } catch (error) {
      console.warn(`[ApiClient] Failed to connect to backend at ${url}.`, error);
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
    return this.request<VerificationResult>('/api/v1/verification', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async getVerificationById(id: string): Promise<VerificationResult> {
    return this.request<VerificationResult>(`/api/v1/verification/${encodeURIComponent(id)}`, {
      method: 'GET',
    });
  }

  public async runOcr(payload: { image: string; documentType: DocumentType }): Promise<OcrResult> {
    return this.request<OcrResult>('/api/v1/ocr', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async analyzeTampering(payload: {
    image: string;
    documentType: DocumentType;
  }): Promise<TamperingResult> {
    return this.request<TamperingResult>('/api/v1/tampering', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async verifyFace(payload: {
    documentPhoto: string;
    livePhoto: string;
  }): Promise<FaceResult> {
    return this.request<FaceResult>('/api/v1/face', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async verifyNfc(payload: {
    printedData: Partial<DocumentData>;
    nfcData: string;
  }): Promise<NfcResult> {
    return this.request<NfcResult>('/api/v1/nfc/verify', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async compareReference(payload: {
    country: string;
    documentType: DocumentType;
    documentImage?: string;
    extractedFields?: Record<string, string>;
  }): Promise<ReferenceResult> {
    return this.request<ReferenceResult>('/api/v1/reference/compare', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async checkWatchlist(payload: {
    documentNumber: string;
    name: string;
    dob?: string;
    nationality?: string;
  }): Promise<WatchlistResult> {
    return this.request<WatchlistResult>('/api/v1/watchlist/check', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}

export const apiClient = new ApiClient();
export default apiClient;
