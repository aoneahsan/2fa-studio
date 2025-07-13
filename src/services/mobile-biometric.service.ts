/**
 * Enhanced biometric service for mobile with local storage support
 * @module services/mobile-biometric
 */

import { BiometricAuth } from 'capacitor-biometric-auth';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

export interface BiometricConfig {
  enabled: boolean;
  timeout: number; // minutes
  protectedAccounts: string[];
  lastAuthentication?: string;
}

export class MobileBiometricService {
  private static readonly CONFIG_KEY = 'biometric_config';
  private static authenticatedSessions: Map<string, Date> = new Map();

  /**
   * Initialize biometric service
   */
  static async initialize(): Promise<void> {
    // Clear expired sessions on app start
    this.authenticatedSessions.clear();
  }

  /**
   * Check if biometric is available on device
   */
  static async isAvailable(): Promise<{
    available: boolean;
    type?: string;
    reason?: string;
  }> {
    if (!Capacitor.isNativePlatform()) {
      return { 
        available: false, 
        reason: 'Not available on web platform' 
      };
    }

    try {
      const result = await BiometricAuth.checkBiometry();
      return {
        available: result.isAvailable,
        type: result.biometryType,
        reason: result.reason
      };
    } catch (error) {
      return { 
        available: false, 
        reason: 'Error checking biometry' 
      };
    }
  }

  /**
   * Get biometric configuration
   */
  static async getConfig(): Promise<BiometricConfig> {
    try {
      const { value } = await Preferences.get({ key: this.CONFIG_KEY });
      if (value) {
        return JSON.parse(value);
      }
    } catch (error) {
      console.error('Failed to get biometric config:', error);
    }

    return {
      enabled: false,
      timeout: 5, // Default 5 minutes
      protectedAccounts: []
    };
  }

  /**
   * Save biometric configuration
   */
  static async saveConfig(config: BiometricConfig): Promise<void> {
    await Preferences.set({
      key: this.CONFIG_KEY,
      value: JSON.stringify(config)
    });
  }

  /**
   * Enable biometric authentication
   */
  static async enable(timeout: number = 5): Promise<boolean> {
    try {
      // Check availability first
      const availability = await this.isAvailable();
      if (!availability.available) {
        throw new Error(availability.reason || 'Biometric not available');
      }

      // Perform test authentication
      const authenticated = await this.authenticate('Enable biometric protection');
      if (!authenticated) {
        return false;
      }

      // Save configuration
      const config = await this.getConfig();
      config.enabled = true;
      config.timeout = timeout;
      await this.saveConfig(config);

      return true;
    } catch (error) {
      console.error('Failed to enable biometric:', error);
      return false;
    }
  }

  /**
   * Disable biometric authentication
   */
  static async disable(): Promise<boolean> {
    try {
      // Require authentication to disable
      const authenticated = await this.authenticate('Disable biometric protection');
      if (!authenticated) {
        return false;
      }

      // Update configuration
      const config = await this.getConfig();
      config.enabled = false;
      config.protectedAccounts = [];
      await this.saveConfig(config);

      // Clear sessions
      this.authenticatedSessions.clear();

      return true;
    } catch (error) {
      console.error('Failed to disable biometric:', error);
      return false;
    }
  }

  /**
   * Authenticate with biometric
   */
  static async authenticate(reason: string): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      // Fallback for web
      return confirm(reason);
    }

    try {
      const result = await BiometricAuth.authenticate({
        reason,
        cancelTitle: 'Cancel',
        fallbackTitle: 'Use Device PIN',
        disableDeviceFallback: false
      });

      if (result) {
        // Update config with last authentication time
        const config = await this.getConfig();
        config.lastAuthentication = new Date().toISOString();
        await this.saveConfig(config);
      }

      return result;
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      return false;
    }
  }

  /**
   * Protect an account with biometric
   */
  static async protectAccount(accountId: string): Promise<void> {
    const config = await this.getConfig();
    
    if (!config.protectedAccounts.includes(accountId)) {
      config.protectedAccounts.push(accountId);
      await this.saveConfig(config);
    }
  }

  /**
   * Remove biometric protection from account
   */
  static async unprotectAccount(accountId: string): Promise<void> {
    const config = await this.getConfig();
    config.protectedAccounts = config.protectedAccounts.filter(id => id !== accountId);
    await this.saveConfig(config);
    
    // Remove from authenticated sessions
    this.authenticatedSessions.delete(accountId);
  }

  /**
   * Check if account requires authentication
   */
  static async requiresAuthentication(accountId: string): Promise<boolean> {
    const config = await this.getConfig();
    
    if (!config.enabled || !config.protectedAccounts.includes(accountId)) {
      return false;
    }

    // Check if already authenticated within timeout
    const lastAuth = this.authenticatedSessions.get(accountId);
    if (lastAuth) {
      const elapsed = Date.now() - lastAuth.getTime();
      const timeoutMs = config.timeout * 60 * 1000;
      
      if (elapsed < timeoutMs) {
        return false; // Still within timeout
      }
    }

    return true;
  }

  /**
   * Authenticate for specific account
   */
  static async authenticateForAccount(
    accountId: string, 
    accountName: string
  ): Promise<boolean> {
    const requiresAuth = await this.requiresAuthentication(accountId);
    
    if (!requiresAuth) {
      return true;
    }

    const authenticated = await this.authenticate(`Access ${accountName}`);
    
    if (authenticated) {
      this.authenticatedSessions.set(accountId, new Date());
    }

    return authenticated;
  }

  /**
   * Clear all authenticated sessions
   */
  static clearSessions(): void {
    this.authenticatedSessions.clear();
  }

  /**
   * Get authentication status for account
   */
  static async getAccountStatus(accountId: string): Promise<{
    protected: boolean;
    authenticated: boolean;
    remainingTime?: number; // minutes
  }> {
    const config = await this.getConfig();
    const isProtected = config.protectedAccounts.includes(accountId);
    
    if (!isProtected || !config.enabled) {
      return { protected: false, authenticated: true };
    }

    const lastAuth = this.authenticatedSessions.get(accountId);
    if (!lastAuth) {
      return { protected: true, authenticated: false };
    }

    const elapsed = Date.now() - lastAuth.getTime();
    const timeoutMs = config.timeout * 60 * 1000;
    
    if (elapsed >= timeoutMs) {
      return { protected: true, authenticated: false };
    }

    const remainingTime = Math.ceil((timeoutMs - elapsed) / 60000);
    return { 
      protected: true, 
      authenticated: true, 
      remainingTime 
    };
  }

  /**
   * Update biometric timeout
   */
  static async updateTimeout(minutes: number): Promise<void> {
    const config = await this.getConfig();
    config.timeout = minutes;
    await this.saveConfig(config);
  }

  /**
   * Get all protected accounts
   */
  static async getProtectedAccounts(): Promise<string[]> {
    const config = await this.getConfig();
    return config.protectedAccounts;
  }

  /**
   * Check if any accounts are protected
   */
  static async hasProtectedAccounts(): Promise<boolean> {
    const config = await this.getConfig();
    return config.protectedAccounts.length > 0;
  }
}