/**
 * Integration tests for all custom package services
 * @module tests/integration/services
 */

import { renderHook } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { Capacitor } from '@capacitor/core';

// Import all services
import { StorageService } from '@services/storage.service';
import { UnifiedErrorService } from '@services/unified-error.service';
import { UnifiedTrackingService } from '@services/unified-tracking.service';
import { NotificationKitService } from '@services/notification-kit.service';
import { NativeUpdateService } from '@services/native-update.service';
import { AuthManagerService } from '@services/auth-manager.service';
import { FirebaseKitService } from '@services/firebase-kit.service';
import { MobileBiometricService } from '@services/mobile-biometric.service';
import { buildkitTheme, StyledComponents } from '@services/buildkit-ui.service';
import { secureStorage, useTOTPCountdown, accountSorters } from '@utils/buildkit-utils';

// Mock Capacitor
jest.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: jest.fn(() => false),
    getPlatform: jest.fn(() => 'web'),
  },
}));

describe('Service Integration Tests', () => {
  beforeEach(() => {
    // Clear mocks
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('StorageService (strata-storage)', () => {
    it('should store and retrieve data', async () => {
      const testData = { test: 'value' };
      await StorageService.set('test-key', testData);
      const retrieved = await StorageService.get('test-key');
      expect(retrieved).toEqual(testData);
    });

    it('should remove data', async () => {
      await StorageService.set('test-key', 'value');
      await StorageService.remove('test-key');
      const retrieved = await StorageService.get('test-key');
      expect(retrieved).toBeNull();
    });

    it('should clear all data', async () => {
      await StorageService.set('key1', 'value1');
      await StorageService.set('key2', 'value2');
      await StorageService.clear();
      const key1 = await StorageService.get('key1');
      const key2 = await StorageService.get('key2');
      expect(key1).toBeNull();
      expect(key2).toBeNull();
    });
  });

  describe('UnifiedErrorService', () => {
    it('should initialize without errors', async () => {
      await expect(UnifiedErrorService.initialize()).resolves.not.toThrow();
    });

    it('should report errors', async () => {
      const error = new Error('Test error');
      await expect(
        UnifiedErrorService.reportError(error, {
          category: 'test',
          severity: 'low',
        })
      ).resolves.not.toThrow();
    });

    it('should get error history', async () => {
      const history = await UnifiedErrorService.getErrorHistory();
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('UnifiedTrackingService', () => {
    it('should initialize without errors', async () => {
      await expect(UnifiedTrackingService.initialize()).resolves.not.toThrow();
    });

    it('should track events', async () => {
      await expect(
        UnifiedTrackingService.trackEvent('test_event', { value: 'test' })
      ).resolves.not.toThrow();
    });

    it('should set user properties', async () => {
      await expect(
        UnifiedTrackingService.setUserProperty('test_property', 'value')
      ).resolves.not.toThrow();
    });
  });

  describe('NotificationKitService', () => {
    it('should initialize without errors', async () => {
      await expect(NotificationKitService.initialize()).resolves.not.toThrow();
    });

    it('should get notification settings', async () => {
      const settings = await NotificationKitService.getSettings();
      expect(settings).toHaveProperty('enabled');
      expect(settings).toHaveProperty('securityAlerts');
    });

    it('should update notification settings', async () => {
      const newSettings = {
        enabled: false,
        securityAlerts: false,
        backupReminders: true,
        codeExpiration: false,
        weakSecrets: true,
        deviceLogin: true,
        quietHours: {
          enabled: true,
          start: '22:00',
          end: '08:00',
        },
      };
      await NotificationKitService.updateSettings(newSettings);
      const settings = await NotificationKitService.getSettings();
      expect(settings.enabled).toBe(false);
    });
  });

  describe('NativeUpdateService', () => {
    it('should initialize without errors', async () => {
      await expect(NativeUpdateService.initialize()).resolves.not.toThrow();
    });

    it('should get current version', async () => {
      const version = await NativeUpdateService.getCurrentVersion();
      expect(typeof version).toBe('string');
    });
  });

  describe('AuthManagerService', () => {
    it('should initialize without errors', async () => {
      await expect(AuthManagerService.initialize()).resolves.not.toThrow();
    });

    it('should get available providers', () => {
      const providers = AuthManagerService.getAvailableProviders();
      expect(providers).toContain('google');
      expect(providers).toContain('apple');
    });

    it('should get provider display names', () => {
      expect(AuthManagerService.getProviderDisplayName('google')).toBe('Google');
      expect(AuthManagerService.getProviderDisplayName('apple')).toBe('Apple');
    });
  });

  describe('FirebaseKitService', () => {
    it('should initialize without errors', async () => {
      await expect(FirebaseKitService.initialize()).resolves.not.toThrow();
    });

    it('should check feature flags', async () => {
      const isEnabled = await FirebaseKitService.isFeatureEnabled('social_login');
      expect(typeof isEnabled).toBe('boolean');
    });
  });

  describe('BuildKit UI', () => {
    it('should have theme configuration', () => {
      expect(buildkitTheme).toHaveProperty('colors');
      expect(buildkitTheme).toHaveProperty('spacing');
      expect(buildkitTheme).toHaveProperty('typography');
    });

    it('should export styled components', () => {
      expect(StyledComponents).toHaveProperty('AccountCard');
      expect(StyledComponents).toHaveProperty('PrimaryButton');
      expect(StyledComponents).toHaveProperty('SecurityAlert');
    });
  });

  describe('BuildKit Utils', () => {
    it('should have secure storage functions', async () => {
      await secureStorage.set('test', { value: 'test' });
      const retrieved = await secureStorage.get('test');
      expect(retrieved).toEqual({ value: 'test' });
      await secureStorage.remove('test');
    });

    it('should have TOTP countdown hook', () => {
      const { result } = renderHook(() => useTOTPCountdown(30));
      expect(result.current).toHaveProperty('timeRemaining');
      expect(result.current).toHaveProperty('progress');
    });

    it('should have account sorters', () => {
      const accounts = [
        { issuer: 'Google', label: 'test@gmail.com' },
        { issuer: 'Apple', label: 'test@icloud.com' },
      ];
      const sorted = [...accounts].sort(accountSorters.byIssuer);
      expect(sorted[0].issuer).toBe('Apple');
    });
  });

  describe('Cross-Service Integration', () => {
    it('should handle error reporting with tracking', async () => {
      const error = new Error('Integration test error');
      
      // Report error
      await UnifiedErrorService.reportError(error, {
        category: 'integration_test',
        severity: 'low',
      });

      // Track event
      await UnifiedTrackingService.trackEvent('error_reported', {
        error_type: 'integration_test',
      });

      // Both should complete without throwing
      expect(true).toBe(true);
    });

    it('should store and retrieve with encryption', async () => {
      const sensitiveData = { secret: 'my-2fa-secret' };
      
      // Store using secure storage
      await secureStorage.set('sensitive', sensitiveData);
      
      // Retrieve
      const retrieved = await secureStorage.get('sensitive');
      expect(retrieved).toEqual(sensitiveData);
      
      // Clean up
      await secureStorage.remove('sensitive');
    });
  });
});

// Platform-specific tests
describe('Platform-Specific Service Tests', () => {
  describe('Native Platform Services', () => {
    beforeEach(() => {
      (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(true);
      (Capacitor.getPlatform as jest.Mock).mockReturnValue('ios');
    });

    it('should handle biometric service on native', async () => {
      const isAvailable = await MobileBiometricService.checkAvailability();
      expect(typeof isAvailable).toBe('boolean');
    });

    it('should handle native update checks', async () => {
      const updateInfo = await NativeUpdateService.checkForUpdate();
      // On web, this should return null
      expect(updateInfo).toBeNull();
    });
  });

  describe('Web Platform Services', () => {
    beforeEach(() => {
      (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(false);
      (Capacitor.getPlatform as jest.Mock).mockReturnValue('web');
    });

    it('should handle web-specific auth providers', () => {
      const providers = AuthManagerService.getAvailableProviders();
      expect(providers.length).toBeGreaterThan(2); // More providers on web
    });
  });
});