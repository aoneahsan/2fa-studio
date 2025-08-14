/**
 * Enhanced Auth Manager Service using capacitor-auth-manager v2.1.0
 * @module services/auth-manager
 */

import { auth as capacitorAuth, AuthProvider } from 'capacitor-auth-manager';

// Define types since they're not exported
interface AuthResult {
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

interface AuthSession {
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
import { Capacitor } from '@capacitor/core';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '@src/config/firebase';
import { AuthService } from './auth.service';
import { UnifiedErrorService } from './unified-error.service';
import { UnifiedTrackingService } from './unified-tracking.service';

export interface SocialAuthConfig {
  provider: AuthProvider;
  scopes?: string[];
  customParameters?: Record<string, string>;
}

export class AuthManagerService {
  private static authManager: typeof capacitorAuth;
  private static isInitialized = false;

  /**
   * Initialize auth manager
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.authManager = capacitorAuth;
      
      // Initialize with basic config
      await this.authManager.initialize?.();
      this.isInitialized = true;
    } catch (error) {
      await UnifiedErrorService.reportError(error as Error, {
        category: 'auth',
        severity: 'high',
        metadata: { operation: 'auth_manager_init' }
      });
    }
  }

  /**
   * Sign in with social provider
   */
  static async signInWithProvider(config: SocialAuthConfig): Promise<AuthResult> {
    if (!this.isInitialized) await this.initialize();

    try {
      // Track auth attempt
      await UnifiedTrackingService.trackEvent('auth_attempt', {
        provider: config.provider,
        platform: Capacitor.getPlatform()
      });

      // Perform authentication
      const result = await this.authManager.signIn({
        provider: config.provider,
        options: {
          scopes: config.scopes,
          customParameters: config.customParameters,
          prompt: 'select_account'
        }
      });

      if (result.success && result.credential) {
        // Sign in to Firebase with custom token
        if (result.credential.customToken) {
          await signInWithCustomToken(auth, result.credential.customToken);
        }

        // Track successful auth
        await UnifiedTrackingService.trackEvent('auth_success', {
          provider: config.provider,
          userId: result.user?.id
        });
      }

      return result;
    } catch (error) {
      await UnifiedErrorService.reportError(error as Error, {
        category: 'auth',
        severity: 'high',
        metadata: { 
          operation: 'social_sign_in',
          provider: config.provider 
        }
      });
      throw error;
    }
  }

  /**
   * Link additional provider to existing account
   */
  static async linkProvider(provider: AuthProvider): Promise<AuthResult> {
    if (!this.isInitialized) await this.initialize();

    try {
      const result = await this.authManager.linkAccount({
        provider,
        options: {
          prompt: 'select_account'
        }
      });

      if (result.success) {
        await UnifiedTrackingService.trackEvent('provider_linked', {
          provider,
          userId: auth.currentUser?.uid
        });
      }

      return result;
    } catch (error) {
      await UnifiedErrorService.reportError(error as Error, {
        category: 'auth',
        severity: 'medium',
        metadata: { 
          operation: 'link_provider',
          provider 
        }
      });
      throw error;
    }
  }

  /**
   * Unlink provider from account
   */
  static async unlinkProvider(provider: AuthProvider): Promise<void> {
    if (!this.isInitialized) await this.initialize();

    try {
      await this.authManager.unlinkAccount(provider);
      
      await UnifiedTrackingService.trackEvent('provider_unlinked', {
        provider,
        userId: auth.currentUser?.uid
      });
    } catch (error) {
      await UnifiedErrorService.reportError(error as Error, {
        category: 'auth',
        severity: 'medium',
        metadata: { 
          operation: 'unlink_provider',
          provider 
        }
      });
      throw error;
    }
  }

  /**
   * Get current session
   */
  static async getSession(): Promise<AuthSession | null> {
    if (!this.isInitialized) await this.initialize();
    return await this.authManager.getSession();
  }

  /**
   * Refresh session
   */
  static async refreshSession(): Promise<AuthSession | null> {
    if (!this.isInitialized) await this.initialize();

    try {
      const session = await this.authManager.refreshSession();
      
      if (session) {
        await UnifiedTrackingService.trackEvent('session_refreshed', {
          userId: auth.currentUser?.uid
        });
      }

      return session;
    } catch (error) {
      await UnifiedErrorService.reportError(error as Error, {
        category: 'auth',
        severity: 'low',
        metadata: { operation: 'refresh_session' }
      });
      return null;
    }
  }

  /**
   * Sign out from all providers
   */
  static async signOut(): Promise<void> {
    if (!this.isInitialized) await this.initialize();

    try {
      await this.authManager.signOut();
      await AuthService.signOut();
      
      await UnifiedTrackingService.trackEvent('sign_out', {
        userId: auth.currentUser?.uid
      });
    } catch (error) {
      await UnifiedErrorService.reportError(error as Error, {
        category: 'auth',
        severity: 'medium',
        metadata: { operation: 'sign_out' }
      });
    }
  }

  /**
   * Get available providers
   */
  static getAvailableProviders(): AuthProvider[] {
    const providers: AuthProvider[] = ['google', 'apple'];
    
    // Add more providers based on platform
    if (!Capacitor.isNativePlatform()) {
      providers.push('facebook', 'microsoft', 'github', 'twitter');
    }
    
    return providers;
  }

  /**
   * Handle deep link for OAuth callback
   */
  static async handleAuthRedirect(url: string): Promise<AuthResult | null> {
    if (!this.isInitialized) await this.initialize();

    try {
      return await this.authManager.handleRedirectCallback(url);
    } catch (error) {
      await UnifiedErrorService.reportError(error as Error, {
        category: 'auth',
        severity: 'medium',
        metadata: { 
          operation: 'handle_redirect',
          url 
        }
      });
      return null;
    }
  }

  /**
   * Get provider name for display
   */
  static getProviderDisplayName(provider: AuthProvider): string {
    const names: Record<AuthProvider, string> = {
      google: 'Google',
      apple: 'Apple',
      facebook: 'Facebook',
      microsoft: 'Microsoft',
      github: 'GitHub',
      twitter: 'Twitter',
      linkedin: 'LinkedIn',
      discord: 'Discord'
    };
    
    return names[provider] || provider;
  }

  /**
   * Get provider icon
   */
  static getProviderIcon(provider: AuthProvider): string {
    const icons: Record<AuthProvider, string> = {
      google: '🔍',
      apple: '🍎',
      facebook: '📘',
      microsoft: '🪟',
      github: '🐙',
      twitter: '🐦',
      linkedin: '💼',
      discord: '💬'
    };
    
    return icons[provider] || '🔐';
  }
}