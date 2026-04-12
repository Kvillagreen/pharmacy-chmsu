import { Injectable } from '@angular/core';
import axios, { AxiosRequestConfig } from 'axios';
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
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // keep this if your backend still uses it
    if (pageContext) {
      headers['X-Page-Context'] = pageContext;
      headers['X-Type'] = pageContext;
    }

    return headers;
  }

  private buildConfig(params?: any, token?: string): AxiosRequestConfig {
    return {
      headers: this.getHeaders(token),
      params: params || {},
    };
  }

  async postUser(endpoint: string, data?: any, token?: string): Promise<any> {
    try {
      const config = this.buildConfig(undefined, token);
      const response = await axios.post(`${this.apiUrl}${endpoint}`, data, config);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async putUser(endpoint: string, data?: any, token?: string): Promise<any> {
    try {
      const config = this.buildConfig(undefined, token);
      const response = await axios.put(`${this.apiUrl}${endpoint}`, data, config);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async deleteUser(endpoint: string, params?: any, token?: string): Promise<any> {
    try {
      const config = this.buildConfig(params, token);
      const response = await axios.delete(`${this.apiUrl}${endpoint}`, config);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async getUser(endpoint: string, params?: any, token?: string): Promise<any> {
    try {
      const config = this.buildConfig(params, token);
      const response = await axios.get(`${this.apiUrl}${endpoint}`, config);
      return response;
    } catch (error) {
      throw error;
    }
  }
}
