/**
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
  }
}

export const apiClient = new ApiClient();
export default apiClient;
