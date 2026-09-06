/**
<<<<<<< HEAD:frontend/src/services/apiClient.ts
 * PRAMAAN API Client
 * Centralizes backend communication and provides seamless toggle between MOCK MODE and API MODE.
 * Configured via environment variables:
 * - VITE_API_BASE_URL: Backend base URL (e.g., http://localhost:8000)
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

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
export const IS_MOCK_MODE = import.meta.env.VITE_USE_MOCK !== 'false';

class ApiClient {
  private baseUrl: string;
  private isMock: boolean;

  constructor() {
    this.baseUrl = API_BASE_URL.replace(/\/+$/, '');
    this.isMock = IS_MOCK_MODE;
  }

  public getMode(): 'MOCK' | 'API' {
    return this.isMock ? 'MOCK' : 'API';
  }

  public setMockMode(enabled: boolean) {
    this.isMock = enabled;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`API Error [${response.status}] ${response.statusText}: ${errorBody}`);
      }

      return await response.json();
    } catch (error) {
      console.warn(`[ApiClient] Failed to connect to backend at ${url}.`, error);
      throw error;
    }
  }

  // ========================================================
  // CONCEPTUAL REST ENDPOINTS (READY FOR BACKEND INTEGRATION)
  // ========================================================

  /**
   * POST /api/v1/verification
   * Execute full verification pipeline on a document
   */
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

  /**
   * GET /api/v1/verification/:id
   * Retrieve an existing verification result by ID
   */
  public async getVerificationById(id: string): Promise<VerificationResult> {
    return this.request<VerificationResult>(`/api/v1/verification/${encodeURIComponent(id)}`, {
      method: 'GET',
    });
  }

  /**
   * POST /api/v1/ocr
   * Optical Character Recognition endpoint
   */
  public async runOcr(payload: { image: string; documentType: DocumentType }): Promise<OcrResult> {
    return this.request<OcrResult>('/api/v1/ocr', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * POST /api/v1/tampering
   * ML/Forensic Tampering Detection endpoint
   */
  public async analyzeTampering(payload: {
    image: string;
    documentType: DocumentType;
  }): Promise<TamperingResult> {
    return this.request<TamperingResult>('/api/v1/tampering', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * POST /api/v1/face
   * Biometric Facial Comparison and Liveness endpoint
   */
  public async verifyFace(payload: {
    documentPhoto: string;
    livePhoto: string;
  }): Promise<FaceResult> {
    return this.request<FaceResult>('/api/v1/face', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * POST /api/v1/nfc/verify
   * Secure NFC Credential Verification endpoint
   */
  public async verifyNfc(payload: {
    printedData: Partial<DocumentData>;
    nfcData: string;
  }): Promise<NfcResult> {
    return this.request<NfcResult>('/api/v1/nfc/verify', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * POST /api/v1/reference/compare
   * PRADO-Style Document Reference Comparison endpoint
   */
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

  /**
   * POST /api/v1/watchlist/check
   * Watchlist Screening endpoint
   */
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
=======
 * PRAMAAN REST API Client
 * Centralized HTTP layer communicating with the Node.js backend
 */

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = typeof window !== 'undefined' ? localStorage.getItem('pramaan_token') : null;
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('pramaan_token', token);
    }
  }

  getToken(): string | null {
    if (!this.token && typeof window !== 'undefined') {
      this.token = localStorage.getItem('pramaan_token');
    }
    return this.token || 'mock-jwt-b1a2c3d4-0001-4000-8000-000000000001';
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('pramaan_token');
    }
  }

  /**
   * Universal fetch wrapper with authorization and error handling
   */
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const token = this.getToken();

    const headers: HeadersInit = {
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

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || `API Error: ${response.status} ${response.statusText}`);
    }

    return data;
  }

  // Health probe
  async getHealth() {
    return this.request<{ success: boolean; data: any }>('/health');
  }

  // Auth endpoints
  async login(email: string, password: string) {
    const res = await this.request<{ success: boolean; data: { token: string; user: any } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res.data?.token) {
      this.setToken(res.data.token);
    }
    return res.data;
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.clearToken();
    }
  }

  async getMe() {
    return this.request<{ success: boolean; data: any }>('/auth/me');
  }

  // Document endpoints
  async uploadDocument(file: File, documentType: string = 'passport') {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('documentType', documentType);

    return this.request<{ success: boolean; data: any }>('/documents/upload', {
      method: 'POST',
      body: formData,
    });
  }

  async getDocuments() {
    return this.request<{ success: boolean; data: any[]; meta: any }>('/documents');
  }

  async getDocumentById(id: string) {
    return this.request<{ success: boolean; data: any }>(`/documents/${id}`);
>>>>>>> 56a0b070a9acc63467a734b8076d86b71a25101f:UI/src/services/apiClient.ts
  }
}

export const apiClient = new ApiClient();
<<<<<<< HEAD:frontend/src/services/apiClient.ts
=======
export default apiClient;
>>>>>>> 56a0b070a9acc63467a734b8076d86b71a25101f:UI/src/services/apiClient.ts
