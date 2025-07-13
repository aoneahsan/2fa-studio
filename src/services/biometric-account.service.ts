/**
 * Biometric account protection service
 * @module services/biometric-account
 */

import { BiometricAuth } from 'capacitor-biometric-auth';
import { Capacitor } from '@capacitor/core';
import { OTPAccount } from '@services/otp.service';
import { updateDoc, doc } from 'firebase/firestore';
import { db, auth } from '@src/config/firebase';
import { AuditLogService } from '@services/audit-log.service';

export interface BiometricAuthResult {
  success: boolean;
  account?: OTPAccount;
  error?: string;
}

export class BiometricAccountService {
  private static authenticatedAccounts: Map<string, Date> = new Map();

  /**
   * Check if biometric authentication is required for an account
   */
  static isBiometricRequired(account: OTPAccount): boolean {
    if (!account.requiresBiometric) {
      return false;
    }

    // Check if already authenticated recently
    const lastAuth = this.authenticatedAccounts.get(account.id);
    if (lastAuth && account.biometricTimeout) {
      const timeoutMs = account.biometricTimeout * 60 * 1000; // Convert minutes to ms
      const elapsed = Date.now() - lastAuth.getTime();
      
      if (elapsed < timeoutMs) {
        return false; // Still within timeout period
      }
    }

    return true;
  }

  /**
   * Authenticate biometric for an account
   */
  static async authenticateAccount(
    account: OTPAccount,
    reason?: string
  ): Promise<BiometricAuthResult> {
    try {
      if (!this.isBiometricRequired(account)) {
        return { success: true, account };
      }

      if (!Capacitor.isNativePlatform()) {
        // On web, we can't use biometric auth, so we'll simulate with a prompt
        const confirmed = window.confirm(
          reason || `Biometric authentication required for ${account.label}`
        );
        
        if (confirmed) {
          this.authenticatedAccounts.set(account.id, new Date());
          return { success: true, account };
        } else {
          return { 
            success: false, 
            error: 'Authentication cancelled' 
          };
        }
      }

      // Check if biometric is available
      const checkResult = await BiometricAuth.checkBiometry();
      if (!checkResult.isAvailable) {
        return { 
          success: false, 
          error: checkResult.biometryType || 'Biometric authentication not available' 
        };
      }

      // Perform biometric authentication
      const authResult = await BiometricAuth.authenticate({
        reason: reason || `Access ${account.label}`,
        cancelTitle: 'Cancel',
        fallbackTitle: 'Use PIN',
        disableDeviceFallback: false,
      });

      if (authResult) {
        // Update authentication timestamp
        this.authenticatedAccounts.set(account.id, new Date());
        
        // Update in database
        await this.updateLastBiometricAuth(account.id, account.userId);
        
        // Log successful biometric auth
        await AuditLogService.log({
          userId: account.userId || auth.currentUser?.uid || 'unknown',
          action: 'security.biometric_auth_success',
          resource: `account/${account.id}`,
          severity: 'info',
          success: true,
          details: {
            accountIssuer: account.issuer,
            accountLabel: account.label
          }
        });
        
        return { success: true, account };
      } else {
        // Log failed biometric auth
        await AuditLogService.log({
          userId: account.userId || auth.currentUser?.uid || 'unknown',
          action: 'security.biometric_auth_failed',
          resource: `account/${account.id}`,
          severity: 'warning',
          success: false,
          details: {
            accountIssuer: account.issuer,
            accountLabel: account.label
          }
        });
        
        return { 
          success: false, 
          error: 'Authentication failed' 
        };
      }
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Authentication error' 
      };
    }
  }

  /**
   * Enable biometric protection for an account
   */
  static async enableBiometric(
    userId: string,
    accountId: string,
    timeout: number = 5 // Default 5 minutes
  ): Promise<void> {
    try {
      // First verify biometric is available
      if (Capacitor.isNativePlatform()) {
        const checkResult = await BiometricAuth.checkBiometry();
        if (!checkResult.isAvailable) {
          throw new Error('Biometric authentication not available on this device');
        }

        // Perform a test authentication
        const authResult = await BiometricAuth.authenticate({
          reason: 'Enable biometric protection',
          cancelTitle: 'Cancel',
          fallbackTitle: 'Use PIN',
          disableDeviceFallback: false,
        });

        if (!authResult) {
          throw new Error('Biometric authentication failed');
        }
      }

      // Update account in Firestore
      const accountRef = doc(db, `users/${userId}/accounts`, accountId);
      await updateDoc(accountRef, {
        requiresBiometric: true,
        biometricTimeout: timeout,
        lastBiometricAuth: new Date(),
        updatedAt: new Date(),
      });

      // Update local cache
      this.authenticatedAccounts.set(accountId, new Date());
      
      // Log biometric enabled
      await AuditLogService.log({
        userId,
        action: 'security.biometric_enabled',
        resource: `account/${accountId}`,
        severity: 'info',
        success: true,
        details: {
          timeout,
          platform: Capacitor.getPlatform()
        }
      });
    } catch (error) {
      console.error('Error enabling biometric:', error);
      
      // Log failed attempt
      await AuditLogService.log({
        userId,
        action: 'security.biometric_enabled',
        resource: `account/${accountId}`,
        severity: 'warning',
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        details: {
          timeout
        }
      });
      
      throw error;
    }
  }

  /**
   * Disable biometric protection for an account
   */
  static async disableBiometric(
    userId: string,
    accountId: string
  ): Promise<void> {
    try {
      // Verify with biometric before disabling
      if (Capacitor.isNativePlatform()) {
        const authResult = await BiometricAuth.authenticate({
          reason: 'Disable biometric protection',
          cancelTitle: 'Cancel',
          fallbackTitle: 'Use PIN',
          disableDeviceFallback: false,
        });

        if (!authResult) {
          throw new Error('Biometric authentication required to disable protection');
        }
      }

      // Update account in Firestore
      const accountRef = doc(db, `users/${userId}/accounts`, accountId);
      await updateDoc(accountRef, {
        requiresBiometric: false,
        biometricTimeout: null,
        lastBiometricAuth: null,
        updatedAt: new Date(),
      });

      // Remove from local cache
      this.authenticatedAccounts.delete(accountId);
      
      // Log biometric disabled
      await AuditLogService.log({
        userId,
        action: 'security.biometric_disabled',
        resource: `account/${accountId}`,
        severity: 'warning',
        success: true,
        details: {
          platform: Capacitor.getPlatform()
        }
      });
    } catch (error) {
      console.error('Error disabling biometric:', error);
      
      // Log failed attempt
      await AuditLogService.log({
        userId,
        action: 'security.biometric_disabled',
        resource: `account/${accountId}`,
        severity: 'warning',
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw error;
    }
  }

  /**
   * Update biometric timeout for an account
   */
  static async updateBiometricTimeout(
    userId: string,
    accountId: string,
    timeout: number
  ): Promise<void> {
    try {
      const accountRef = doc(db, `users/${userId}/accounts`, accountId);
      await updateDoc(accountRef, {
        biometricTimeout: timeout,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error updating biometric timeout:', error);
      throw error;
    }
  }

  /**
   * Update last biometric authentication timestamp
   */
  private static async updateLastBiometricAuth(
    accountId: string,
    userId: string
  ): Promise<void> {
    try {
      const accountRef = doc(db, `users/${userId}/accounts`, accountId);
      await updateDoc(accountRef, {
        lastBiometricAuth: new Date(),
      });
    } catch (error) {
      console.error('Error updating last biometric auth:', error);
    }
  }

  /**
   * Clear all authenticated accounts (on app lock or logout)
   */
  static clearAuthenticatedAccounts(): void {
    this.authenticatedAccounts.clear();
  }

  /**
   * Get biometric status for an account
   */
  static getBiometricStatus(account: OTPAccount): {
    isEnabled: boolean;
    isAuthenticated: boolean;
    timeoutMinutes?: number;
    remainingMinutes?: number;
  } {
    const isEnabled = account.requiresBiometric || false;
    let isAuthenticated = false;
    let remainingMinutes: number | undefined;

    if (isEnabled) {
      const lastAuth = this.authenticatedAccounts.get(account.id);
      if (lastAuth && account.biometricTimeout) {
        const elapsed = Date.now() - lastAuth.getTime();
        const timeoutMs = account.biometricTimeout * 60 * 1000;
        
        if (elapsed < timeoutMs) {
          isAuthenticated = true;
          remainingMinutes = Math.ceil((timeoutMs - elapsed) / 60000);
        }
      }
    }

    return {
      isEnabled,
      isAuthenticated,
      timeoutMinutes: account.biometricTimeout,
      remainingMinutes,
    };
  }
}