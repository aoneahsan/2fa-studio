/**
 * Feature Flag Hook
 * Uses FirebaseKitService for remote config
 * @module hooks/useFeatureFlag
 */

import { useState, useEffect } from 'react';
import { FirebaseKitService } from '@services/firebase-kit.service';

/**
 * Hook to check if a feature is enabled
 */
export function useFeatureFlag(flagName: string, defaultValue: boolean = false): boolean {
  const [isEnabled, setIsEnabled] = useState(defaultValue);

  useEffect(() => {
    const checkFlag = async () => {
      try {
        const enabled = await FirebaseKitService.isFeatureEnabled(flagName);
        setIsEnabled(enabled);
      } catch (error) {
        console.error(`Failed to check feature flag ${flagName}:`, error);
        setIsEnabled(defaultValue);
      }
    };

    checkFlag();
  }, [flagName, defaultValue]);

  return isEnabled;
}

/**
 * Hook to get all feature flags
 */
export function useFeatureFlags(): Record<string, boolean> {
  const [flags, setFlags] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadFlags = async () => {
      try {
        const config = await FirebaseKitService.getRemoteConfig();
        const featureFlags: Record<string, boolean> = {};
        
        // Extract boolean flags from config
        Object.entries(config).forEach(([key, value]) => {
          if (typeof value === 'boolean') {
            featureFlags[key] = value;
          }
        });
        
        setFlags(featureFlags);
      } catch (error) {
        console.error('Failed to load feature flags:', error);
      }
    };

    loadFlags();
  }, []);

  return flags;
}

// Common feature flags
export const FEATURE_FLAGS = {
  SOCIAL_LOGIN: 'social_login',
  BIOMETRIC_AUTH: 'biometric_auth',
  GOOGLE_DRIVE_BACKUP: 'google_drive_backup',
  BROWSER_EXTENSION: 'browser_extension',
  PREMIUM_FEATURES: 'premium_features',
  ANALYTICS: 'analytics_enabled',
  CRASH_REPORTING: 'crash_reporting',
  PERFORMANCE_MONITORING: 'performance_monitoring',
  IN_APP_UPDATES: 'in_app_updates',
  DARK_MODE: 'dark_mode',
  ADVANCED_SEARCH: 'advanced_search',
  EXPORT_IMPORT: 'export_import',
  MULTI_DEVICE_SYNC: 'multi_device_sync',
  SECURITY_DASHBOARD: 'security_dashboard',
  PASSWORD_GENERATOR: 'password_generator',
} as const;

export type FeatureFlag = typeof FEATURE_FLAGS[keyof typeof FEATURE_FLAGS];