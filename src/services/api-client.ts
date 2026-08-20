import * as SecureStore from 'expo-secure-store';
import { CONFIG } from '../constants/config';

interface RequestOptions extends RequestInit {
  tokenOverride?: string;
}

export class ApiClient {
  static onSessionExpired: (() => void) | null = null;

  /**
   * Helper to retrieve the saved token from device secure storage.
   */
  static async getToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(CONFIG.AUTH_TOKEN_KEY);
    } catch {
      return null;
    }
  }

  /**
   * Core request wrapper wrapping standard fetch, handling token injections and error mappings.
   */
  static async request(endpoint: string, options: RequestOptions = {}): Promise<any> {
    const url = `${CONFIG.API_BASE_URL}${endpoint}`;
    
    // 1. Configure headers
    const headers = new Headers(options.headers || {});
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    // 2. Fetch and append Authorization header if token exists
    const token = options.tokenOverride || (await this.getToken());
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);

      let responseData;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = { success: response.ok, message: await response.text() };
      }

      // 3. Handle unauthorized access (Expired/tampered JWT tokens)
      if (response.status === 401 && endpoint !== '/auth/login') {
        // Clear session on security error
        await SecureStore.deleteItemAsync(CONFIG.AUTH_TOKEN_KEY);
        await SecureStore.deleteItemAsync(CONFIG.AUTH_USER_KEY);
        
        if (this.onSessionExpired) {
          this.onSessionExpired();
        }
        
        throw new Error('SESSION_EXPIRED');
      }

      if (!response.ok) {
        throw new Error(responseData.error || `Request failed with status ${response.status}`);
      }

      return responseData;
    } catch (error: any) {
      if (error.message === 'SESSION_EXPIRED') {
        throw error;
      }
      
      // Determine network connectivity issues vs custom API errors
      if (error.message && error.message.includes('Network request failed')) {
        throw new Error('BACKEND_UNAVAILABLE');
      }
      throw error;
    }
  }

  static get(endpoint: string, options: RequestOptions = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  static post(endpoint: string, body?: any, options: RequestOptions = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    });
  }

  static put(endpoint: string, body?: any, options: RequestOptions = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  static delete(endpoint: string, options: RequestOptions = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}
