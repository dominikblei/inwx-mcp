import { ApiClient, Language } from 'domrobot-client';
import type { InwxResponse } from '../types/index.ts';

export interface InwxConfig {
  username: string;
  password: string;
  sharedSecret?: string;
  environment: 'ote' | 'live';
}

export class InwxClient {
  private config: InwxConfig;

  constructor(config: InwxConfig) {
    this.config = config;
  }

  private getApiUrl(): string {
    return this.config.environment === 'live' ? ApiClient.API_URL_LIVE : ApiClient.API_URL_OTE;
  }

  /**
   * Execute an INWX API call with automatic login/logout (pro-request session).
   */
  async call<T = unknown>(
    method: string,
    params: Record<string, unknown> = {}
  ): Promise<InwxResponse<T>> {
    const client = new ApiClient(this.getApiUrl(), Language.EN);

    try {
      // Login
      const loginResponse = await client.login(
        this.config.username,
        this.config.password,
        this.config.sharedSecret
      );

      if (loginResponse.code !== 1000) {
        return {
          code: loginResponse.code,
          msg: loginResponse.msg || 'Login failed',
          reasonCode: loginResponse.reasonCode,
          reason: loginResponse.reason,
        };
      }

      // Execute API call
      const response = await client.callApi(method, params);

      // Logout (best effort, don't fail if logout fails)
      try {
        await client.logout();
      } catch {
        // Ignore logout errors
      }

      return {
        code: response.code,
        msg: response.msg,
        reasonCode: response.reasonCode,
        reason: response.reason,
        resData: response.resData as T,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        code: -1,
        msg: `Connection error: ${message}`,
      };
    }
  }
}

// Singleton instance, initialized from environment
let clientInstance: InwxClient | null = null;

export function getInwxClient(): InwxClient {
  if (!clientInstance) {
    const username = process.env['INWX_USERNAME'];
    const password = process.env['INWX_PASSWORD'];
    const environment = process.env['INWX_ENVIRONMENT'] as 'ote' | 'live' | undefined;

    if (!username || !password) {
      throw new Error('INWX_USERNAME and INWX_PASSWORD environment variables are required');
    }

    clientInstance = new InwxClient({
      username,
      password,
      sharedSecret: process.env['INWX_SHARED_SECRET'],
      environment: environment === 'live' ? 'live' : 'ote',
    });
  }

  return clientInstance;
}
