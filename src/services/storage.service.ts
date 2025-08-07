/**
 * Storage Service using strata-storage
 * Universal storage API for all platforms
 * @module services/storage
 */

import { storage } from 'strata-storage';
import { Capacitor } from '@capacitor/core';

// Register Capacitor adapters if available
if (Capacitor.isNativePlatform()) {
  import('strata-storage/capacitor').then(({ registerCapacitorAdapters }) => {
    registerCapacitorAdapters(storage);
  });
}

export interface StorageOptions {
  ttl?: number; // Time to live in milliseconds
  secure?: boolean; // Use secure storage on native platforms
  encrypt?: boolean; // Encrypt the data
}

/**
 * Universal Storage Service
 * Provides a consistent API across web, iOS, and Android
 */
export class StorageService {
  /**
   * Get a value from storage
   */
  static async get<T = any>(key: string): Promise<T | null> {
    try {
      const value = await storage.get(key);
      return value as T;
    } catch (error) {
      console.error(`Error getting storage key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set a value in storage
   */
  static async set(
    key: string,
    value: any,
    options?: StorageOptions
  ): Promise<boolean> {
    try {
      const storageOptions: any = {};
      
      if (options?.ttl) {
        storageOptions.ttl = options.ttl;
      }
      
      if (options?.secure && Capacitor.isNativePlatform()) {
        storageOptions.storage = 'secure';
      }
      
      if (options?.encrypt) {
        storageOptions.encrypt = true;
      }

      await storage.set(key, value, storageOptions);
      return true;
    } catch (error) {
      console.error(`Error setting storage key ${key}:`, error);
      return false;
    }
  }

  /**
   * Remove a value from storage
   */
  static async remove(key: string): Promise<boolean> {
    try {
      await storage.remove(key);
      return true;
    } catch (error) {
      console.error(`Error removing storage key ${key}:`, error);
      return false;
    }
  }

  /**
   * Clear all storage
   */
  static async clear(): Promise<boolean> {
    try {
      await storage.clear();
      return true;
    } catch (error) {
      console.error('Error clearing storage:', error);
      return false;
    }
  }

  /**
   * Get all keys in storage
   */
  static async keys(): Promise<string[]> {
    try {
      const keys = await storage.keys();
      return keys || [];
    } catch (error) {
      console.error('Error getting storage keys:', error);
      return [];
    }
  }

  /**
   * Check if a key exists
   */
  static async has(key: string): Promise<boolean> {
    try {
      const value = await storage.get(key);
      return value !== null && value !== undefined;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get multiple values at once
   */
  static async getMultiple<T = any>(keys: string[]): Promise<Record<string, T>> {
    const result: Record<string, T> = {};
    
    for (const key of keys) {
      const value = await this.get<T>(key);
      if (value !== null) {
        result[key] = value;
      }
    }
    
    return result;
  }

  /**
   * Set multiple values at once
   */
  static async setMultiple(
    items: Record<string, any>,
    options?: StorageOptions
  ): Promise<boolean> {
    try {
      for (const [key, value] of Object.entries(items)) {
        await this.set(key, value, options);
      }
      return true;
    } catch (error) {
      console.error('Error setting multiple storage items:', error);
      return false;
    }
  }

  /**
   * Remove multiple keys at once
   */
  static async removeMultiple(keys: string[]): Promise<boolean> {
    try {
      for (const key of keys) {
        await this.remove(key);
      }
      return true;
    } catch (error) {
      console.error('Error removing multiple storage keys:', error);
      return false;
    }
  }

  /**
   * Get storage size (if supported)
   */
  static async getSize(): Promise<number> {
    try {
      // Calculate approximate size by getting all keys and values
      const keys = await this.keys();
      let totalSize = 0;
      
      for (const key of keys) {
        const value = await this.get(key);
        if (value) {
          totalSize += JSON.stringify(value).length;
        }
      }
      
      return totalSize;
    } catch (error) {
      console.error('Error calculating storage size:', error);
      return 0;
    }
  }

  /**
   * Migrate from old Preferences to strata-storage
   */
  static async migrateFromPreferences(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return; // No migration needed on web
    }

    try {
      const { Preferences } = await import('@capacitor/preferences');
      
      // Get all keys from Preferences
      const { keys } = await Preferences.keys();
      
      // Migrate each key-value pair
      for (const key of keys) {
        const { value } = await Preferences.get({ key });
        if (value) {
          try {
            // Try to parse as JSON first
            const parsedValue = JSON.parse(value);
            await this.set(key, parsedValue);
          } catch {
            // If not JSON, store as string
            await this.set(key, value);
          }
        }
      }
      
      console.log(`Successfully migrated ${keys.length} items from Preferences to strata-storage`);
    } catch (error) {
      console.error('Error migrating from Preferences:', error);
    }
  }
}

// Storage keys used throughout the app
export const StorageKeys = {
  // Auth
  AUTH_TOKEN: 'authToken',
  USER_DATA: 'userData',
  DEVICE_ID: 'deviceId',
  
  // Settings
  APP_SETTINGS: 'appSettings',
  THEME: 'theme',
  LANGUAGE: 'language',
  
  // Security
  BIOMETRIC_CONFIG: 'biometric_config',
  ENCRYPTION_SALT: 'encryptionSalt',
  LOCK_STATE: 'lockState',
  
  // Accounts
  ACCOUNTS_CACHE: 'accountsCache',
  ACCOUNTS_ORDER: 'accountsOrder',
  
  // Backup
  LAST_BACKUP: 'lastBackup',
  BACKUP_SETTINGS: 'backupSettings',
  
  // Sync
  LAST_SYNC: 'lastSync',
  SYNC_TOKEN: 'syncToken',
  
  // Features
  FEATURE_FLAGS: 'featureFlags',
  SUBSCRIPTION_DATA: 'subscriptionData',
  
  // Analytics
  ANALYTICS_ID: 'analyticsId',
  ANALYTICS_CONSENT: 'analyticsConsent',
} as const;