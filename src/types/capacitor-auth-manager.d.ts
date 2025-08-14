declare module 'capacitor-auth-manager' {
  export type AuthProvider = 'google' | 'apple' | 'facebook' | 'microsoft';
  
  export interface AuthResult {
    success: boolean;
    provider: AuthProvider;
    token?: string;
    user?: {
      id: string;
      email?: string;
      name?: string;
      photoUrl?: string;
    };
    error?: string;
  }

  export interface AuthSession {
    provider: AuthProvider;
    token: string;
    refreshToken?: string;
    expiresAt?: number;
    user: {
      id: string;
      email?: string;
      name?: string;
    };
  }

  export interface AuthManagerConfig {
    providers?: {
      google?: {
        clientId?: string;
        redirectUri?: string;
        additionalScopes?: string[];
      };
      apple?: {
        clientId?: string;
        redirectUri?: string;
        responseMode?: string;
      };
      facebook?: {
        appId?: string;
        redirectUri?: string;
        permissions?: string[];
      };
      microsoft?: {
        clientId?: string;
        redirectUri?: string;
        scopes?: string[];
      };
    };
    sessionStorage?: 'local' | 'session';
    autoRefresh?: boolean;
  }

  export class AuthManager {
    constructor(config?: AuthManagerConfig);
    signIn(provider: AuthProvider): Promise<AuthResult>;
    signOut(): Promise<void>;
    getCurrentSession(): Promise<AuthSession | null>;
    refreshSession(): Promise<AuthSession | null>;
    isAuthenticated(): Promise<boolean>;
  }
}