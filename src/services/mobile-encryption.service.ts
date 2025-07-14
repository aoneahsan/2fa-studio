/**
 * Enhanced encryption service for mobile with device-specific features
 * @module services/mobile-encryption
 */

import { Device } from '@capacitor/device';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { EncryptionService } from './encryption.service';

export interface SecureData {
  encrypted: string;
  timestamp: string;
  deviceId: string;
  version: string;
}

export class MobileEncryptionService extends EncryptionService {
  private static deviceKey: string | null = null;
  private static readonly DEVICE_KEY_NAME = 'device_encryption_key';
  private static readonly SECURE_STORAGE_AVAILABLE = Capacitor.isNativePlatform() && 
    Capacitor.isPluginAvailable('SecureStoragePlugin');

  /**
   * Initialize encryption service with device-specific key
   */
  static async initialize(): Promise<void> {
    try {
      // Get or generate device-specific key
      this.deviceKey = await this.getOrCreateDeviceKey();
    } catch (error) {
      console.error('Failed to initialize encryption:', error);
      throw new Error('Encryption initialization failed');
    }
  }

  /**
   * Get or create a device-specific encryption key
   */
  private static async getOrCreateDeviceKey(): Promise<string> {
    try {
      if (this.SECURE_STORAGE_AVAILABLE) {
        // Try to get from secure storage first
        try {
          const { value } = await SecureStoragePlugin.get({ key: this.DEVICE_KEY_NAME });
          if (value) return value;
        } catch (_e) {
          // Key doesn't exist yet
        }

        // Generate new key
        const newKey = this.generateDeviceKey();
        await SecureStoragePlugin.set({
          key: this.DEVICE_KEY_NAME,
          value: newKey
        });
        return newKey;
      } else {
        // Fallback to Preferences for web
        const { value } = await Preferences.get({ key: this.DEVICE_KEY_NAME });
        if (value) return value;

        const newKey = this.generateDeviceKey();
        await Preferences.set({
          key: this.DEVICE_KEY_NAME,
          value: newKey
        });
        return newKey;
      }
    } catch (error) {
      console.error('Failed to get device key:', error);
      throw error;
    }
  }

  /**
   * Generate a device-specific encryption key
   */
  private static generateDeviceKey(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array));
  }

  /**
   * Encrypt data with device-specific key
   */
  static async encryptData(data: string): Promise<string> {
    if (!this.deviceKey) {
      await this.initialize();
    }

    const deviceInfo = await Device.getInfo();
    const encrypted = await super.encrypt({
      data,
      password: this.deviceKey!
    });

    const secureData: SecureData = {
      encrypted: JSON.stringify(encrypted),
      timestamp: new Date().toISOString(),
      deviceId: deviceInfo.identifier || 'unknown',
      version: '1.0'
    };

    return JSON.stringify(secureData);
  }

  /**
   * Decrypt data with device-specific key
   */
  static async decryptData(encryptedData: string): Promise<string> {
    if (!this.deviceKey) {
      await this.initialize();
    }

    try {
      const secureData: SecureData = JSON.parse(encryptedData);
      
      // Verify device ID if available
      const deviceInfo = await Device.getInfo();
      if (secureData.deviceId !== 'unknown' && 
          deviceInfo.identifier && 
          secureData.deviceId !== deviceInfo.identifier) {
        throw new Error('Data encrypted on different device');
      }

      return await super.decrypt({
        encryptedData: secureData.encrypted,
        password: this.deviceKey!
      });
    } catch (error) {
      // Try direct decryption for backward compatibility
      if (typeof encryptedData === 'string' && encryptedData.includes('"data"')) {
        return await super.decrypt({
          encryptedData,
          password: this.deviceKey!
        });
      }
      throw error;
    }
  }

  /**
   * Encrypt data with user password (for backups)
   */
  static async encryptWithPassword(data: string, password: string): Promise<string> {
    const encrypted = await super.encrypt({ data, password });
    return JSON.stringify(encrypted);
  }

  /**
   * Decrypt data with user password (for restoring backups)
   */
  static async decryptWithPassword(encryptedData: string, password: string): Promise<string> {
    return await super.decrypt({ encryptedData, password });
  }

  /**
   * Secure store for small sensitive data (uses platform secure storage)
   */
  static async secureStore(key: string, value: string): Promise<void> {
    if (this.SECURE_STORAGE_AVAILABLE) {
      await SecureStoragePlugin.set({ key, value });
    } else {
      // Fallback to encrypted preferences
      const encrypted = await this.encryptData(value);
      await Preferences.set({ key, value: encrypted });
    }
  }

  /**
   * Secure retrieve for small sensitive data
   */
  static async secureRetrieve(key: string): Promise<string | null> {
    try {
      if (this.SECURE_STORAGE_AVAILABLE) {
        const { value } = await SecureStoragePlugin.get({ key });
        return value || null;
      } else {
        // Fallback to encrypted preferences
        const { value } = await Preferences.get({ key });
        if (!value) return null;
        return await this.decryptData(value);
      }
    } catch (error) {
      return null;
    }
  }

  /**
   * Secure remove for small sensitive data
   */
  static async secureRemove(key: string): Promise<void> {
    if (this.SECURE_STORAGE_AVAILABLE) {
      await SecureStoragePlugin.remove({ key });
    } else {
      await Preferences.remove({ key });
    }
  }

  /**
   * Clear all secure storage (use with caution)
   */
  static async clearSecureStorage(): Promise<void> {
    if (this.SECURE_STORAGE_AVAILABLE) {
      await SecureStoragePlugin.clear();
    }
    // Don't clear preferences as it might contain other app data
  }

  /**
   * Generate encryption key from biometric data (future enhancement)
   */
  static async generateBiometricKey(): Promise<string> {
    // This would integrate with biometric APIs to derive a key
    // For now, return a secure random key
    return this.generatePassword(32);
  }

  /**
   * Export encryption status
   */
  static async getEncryptionStatus(): Promise<{
    initialized: boolean;
    secureStorageAvailable: boolean;
    deviceId: string;
    lastKeyRotation?: string;
  }> {
    const deviceInfo = await Device.getInfo();
    
    return {
      initialized: this.deviceKey !== null,
      secureStorageAvailable: this.SECURE_STORAGE_AVAILABLE,
      deviceId: deviceInfo.identifier || 'unknown',
      lastKeyRotation: await Preferences.get({ key: 'last_key_rotation' })
        .then(r => r.value || undefined)
    };
  }

  /**
   * Rotate device encryption key (requires re-encryption of all data)
   */
  static async rotateDeviceKey(): Promise<void> {
    const oldKey = this.deviceKey;
    if (!oldKey) {
      throw new Error('No existing key to rotate');
    }

    // Generate new key
    const newKey = this.generateDeviceKey();
    
    // Store new key
    if (this.SECURE_STORAGE_AVAILABLE) {
      await SecureStoragePlugin.set({
        key: this.DEVICE_KEY_NAME,
        value: newKey
      });
    } else {
      await Preferences.set({
        key: this.DEVICE_KEY_NAME,
        value: newKey
      });
    }

    // Update timestamp
    await Preferences.set({
      key: 'last_key_rotation',
      value: new Date().toISOString()
    });

    this.deviceKey = newKey;
    
    // Note: Caller must re-encrypt all data with the new key
  }
}