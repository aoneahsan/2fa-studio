/**
 * 2FA Studio SDK
 * SDK for integrating 2FA Studio into third-party applications
 * @module sdk
 */

export interface TwoFAStudioConfig {
  apiKey: string;
  apiUrl?: string;
  timeout?: number;
}

export interface Account {
  id: string;
  issuer: string;
  label: string;
}

export interface GenerateCodeRequest {
  accountId: string;
  timestamp?: number;
}

export interface GenerateCodeResponse {
  code: string;
  expiresAt: number;
  remainingSeconds: number;
}

export class TwoFAStudioSDK {
  private config: TwoFAStudioConfig;
  private baseUrl: string;

  constructor(config: TwoFAStudioConfig) {
    this.config = config;
    this.baseUrl = config.apiUrl || 'https://api.2fastudio.app/v1';
  }

  /**
   * Generate OTP code for an account
   */
  async generateCode(request: GenerateCodeRequest): Promise<GenerateCodeResponse> {
    const response = await this.makeRequest('/codes/generate', {
      method: 'POST',
      body: JSON.stringify(request)
    });

    return response.json();
  }

  /**
   * List user's accounts
   */
  async listAccounts(): Promise<Account[]> {
    const response = await this.makeRequest('/accounts');
    return response.json();
  }

  /**
   * Get account details
   */
  async getAccount(accountId: string): Promise<Account> {
    const response = await this.makeRequest(`/accounts/${accountId}`);
    return response.json();
  }

  /**
   * Make authenticated API request
   */
  private async makeRequest(path: string, options?: RequestInit): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    const timeout = this.config.timeout || 30000;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          ...options?.headers
        },
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

// Export for easy import
export default TwoFAStudioSDK;