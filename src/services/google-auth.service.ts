/**
 * Google Authentication Service
 * Handles Google Sign-In and Drive API access
 * @module services/google-auth
 */

import { UnifiedErrorHandling } from 'unified-error-handling';

export interface GoogleAuthConfig {
  clientId: string;
  scopes: string[];
}

export interface GoogleAuthResult {
  accessToken: string;
  idToken: string;
  refreshToken?: string;
  expiresAt: number;
  user: {
    id: string;
    email: string;
    name: string;
    picture?: string;
  };
}

export class GoogleAuthService {
  private static config: GoogleAuthConfig;
  private static tokenClient: any;
  private static isInitialized = false;

  /**
   * Initialize Google Auth
   */
  static async initialize(config: GoogleAuthConfig): Promise<void> {
    this.config = config;
    
    // Load Google Identity Services library
    await this.loadGoogleScript();
    
    // Initialize token client
    this.tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: config.clientId,
      scope: config.scopes.join(' '),
      callback: '', // Will be set when requesting token
    });
    
    this.isInitialized = true;
  }

  /**
   * Sign in with Google
   */
  static async signIn(): Promise<GoogleAuthResult> {
    return UnifiedErrorHandling.withTryCatch(
      async () => {
        if (!this.isInitialized) {
          throw new Error('Google Auth not initialized');
        }

        return new Promise((resolve, reject) => {
          this.tokenClient.callback = async (response: any) => {
            if (response.error) {
              reject(new Error(response.error));
              return;
            }

            try {
              const userInfo = await this.getUserInfo(response.access_token);
              const result: GoogleAuthResult = {
                accessToken: response.access_token,
                idToken: response.id_token || '',
                expiresAt: Date.now() + (response.expires_in * 1000),
                user: userInfo
              };
              resolve(result);
            } catch (error) {
              reject(error);
            }
          };

          this.tokenClient.requestAccessToken();
        });
      },
      {
        operation: 'GoogleAuthService.signIn',
        metadata: { scopes: this.config.scopes }
      }
    );
  }

  /**
   * Get user info from Google
   */
  private static async getUserInfo(accessToken: string): Promise<any> {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to get user info');
    }

    return response.json();
  }

  /**
   * Load Google Identity Services script
   */
  private static loadGoogleScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if ((window as any).google?.accounts?.oauth2) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
      document.head.appendChild(script);
    });
  }

  /**
   * Check if user has valid token
   */
  static hasValidToken(authResult?: GoogleAuthResult): boolean {
    if (!authResult) return false;
    return authResult.expiresAt > Date.now();
  }
}