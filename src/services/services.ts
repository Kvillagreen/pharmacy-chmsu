import { Injectable } from '@angular/core';
import { environment } from '../environment/environment';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = environment.apiUrl;

  constructor(private router: Router) {}

  private getPageContext(): string {
    const currentUrl = this.router.url;
    return currentUrl.split('?')[0].split('/').filter(Boolean)[0]?.toLowerCase() || '';
  }

  private getHeaders(token?: string): Record<string, string> {
    const pageContext = this.getPageContext();
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (pageContext) {
      headers['X-Page-Context'] = pageContext;
      headers['X-Type'] = pageContext;
    }

    return headers;
  }

  private buildUrl(endpoint: string, params?: any): string {
    const url = new URL(`${this.apiUrl}${endpoint}`);

    if (params && typeof params === 'object') {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.set(key, String(value));
        }
      });
    }

    return url.toString();
  }

  private async request(method: string, endpoint: string, data?: any, params?: any, token?: string): Promise<any> {
    const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
    const headers = this.getHeaders(token);

    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(this.buildUrl(endpoint, params), {
      method,
      headers,
      body: data !== undefined && data !== null && method !== 'GET' && method !== 'DELETE'
        ? (isFormData ? data : JSON.stringify(data))
        : undefined,
    });

    const contentType = response.headers.get('content-type') || '';
    const parsed = contentType.includes('application/json')
      ? await response.json()
      : await response.text();

    const result = {
      status: response.status,
      data: parsed,
      message: (parsed as any)?.message,
    };

    if (!response.ok) {
      throw {
        status: response.status,
        error: parsed,
        response: result,
      };
    }

    return result;
  }

  async postUser(endpoint: string, data?: any, token?: string): Promise<any> {
    return this.request('POST', endpoint, data, undefined, token);
  }

  async putUser(endpoint: string, data?: any, token?: string): Promise<any> {
    return this.request('PUT', endpoint, data, undefined, token);
  }

  async deleteUser(endpoint: string, params?: any, token?: string): Promise<any> {
    return this.request('DELETE', endpoint, undefined, params, token);
  }

  async getUser(endpoint: string, params?: any, token?: string): Promise<any> {
    return this.request('GET', endpoint, undefined, params, token);
  }
}
