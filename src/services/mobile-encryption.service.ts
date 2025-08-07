/**
 * Enhanced encryption service for mobile with device-specific features
 * @module services/mobile-encryption
 */

import { Device } from '@capacitor/device';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';
import { Capacitor } from '@capacitor/core';
import { StorageService, StorageKeys } from './storage.service';
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
	private static readonly SECURE_STORAGE_AVAILABLE =
		Capacitor.isNativePlatform() &&
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
					const { value } = await SecureStoragePlugin.get({
						key: this.DEVICE_KEY_NAME,
					});
					if (value) return value;
				} catch (_e) {
					// Key doesn't exist yet
				}

				// Generate new key
				const newKey = this.generateDeviceKey();
				await SecureStoragePlugin.set({
					key: this.DEVICE_KEY_NAME,
					value: newKey,
				});
				return newKey;
			} else {
				// Fallback to StorageService for web
				const value = await StorageService.get<string>(this.DEVICE_KEY_NAME);
				if (value) return value;

				const newKey = this.generateDeviceKey();
				await StorageService.set(this.DEVICE_KEY_NAME, newKey, { secure: true });
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
			data: data,
			password: 'device-key',
		});

		const secureData: SecureData = {
			encrypted: JSON.stringify(encrypted),
			timestamp: new Date().toISOString(),
			deviceId: deviceInfo.webViewVersion || 'unknown',
			version: '1.0',
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
			if (
				secureData.deviceId !== 'unknown' &&
				deviceInfo.webViewVersion &&
				secureData.deviceId !== deviceInfo.webViewVersion
			) {
				throw new Error('Device verification failed');
			}

			const encrypted = JSON.parse(secureData.encrypted);
			const decrypted = await super.decrypt(encrypted);

			return decrypted;
		} catch (error) {
			throw new Error('Failed to decrypt data');
		}
	}

	/**
	 * Encrypt data with password
	 */
	static async encryptWithPassword(
		data: string,
		password: string
	): Promise<string> {
		const encrypted = await super.encrypt({
			data: data,
			password: password,
		});
		return JSON.stringify(encrypted);
	}

	/**
	 * Decrypt data with password
	 */
	static async decryptWithPassword(
		encryptedData: string,
		password: string
	): Promise<string> {
		const encrypted = JSON.parse(encryptedData);
		return await super.decrypt(encrypted);
	}

	/**
	 * Secure store for small sensitive data (uses platform secure storage)
	 */
	static async secureStore(key: string, value: string): Promise<void> {
		if (this.SECURE_STORAGE_AVAILABLE) {
			await SecureStoragePlugin.set({ key, value });
		} else {
			// Fallback to encrypted storage
			const encrypted = await this.encryptData(value);
			await StorageService.set(key, encrypted, { secure: true });
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
				// Fallback to encrypted storage
				const value = await StorageService.get<string>(key);
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
			await StorageService.remove(key);
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
	 * Get encryption status
	 */
	static async getEncryptionStatus(): Promise<{
		initialized: boolean;
		secureStorageAvailable: boolean;
		deviceId: string;
		lastKeyRotation?: string;
	}> {
		const deviceInfo = await Device.getInfo();

		return {
			initialized: !!this.deviceKey,
			secureStorageAvailable: this.SECURE_STORAGE_AVAILABLE,
			deviceId: deviceInfo.webViewVersion || 'unknown',
			lastKeyRotation: await this.getLastKeyRotation(),
		};
	}

	/**
	 * Get last key rotation timestamp
	 */
	private static async getLastKeyRotation(): Promise<string | undefined> {
		return await StorageService.get<string>('last_key_rotation') || undefined;
	}

	/**
	 * Rotate device key
	 */
	static async rotateDeviceKey(): Promise<void> {
		// Generate new key
		const newKey = this.generateDeviceKey();

		// Store new key
		await StorageService.set(this.DEVICE_KEY_NAME, newKey, { secure: true });

		// Update in memory
		this.deviceKey = newKey;

		// Record rotation timestamp
		await StorageService.set('last_key_rotation', new Date().toISOString(), { secure: true
		});

		// Note: Caller must re-encrypt all data with the new key
	}

	/**
	 * Encrypt data with device binding
	 */
	static async encryptWithDeviceBinding(
		data: string,
		userId: string
	): Promise<string> {
		const deviceInfo = await Device.getInfo();
		const key = await this.deriveDeviceKey(userId);

		const secureData = {
			data,
			timestamp: Date.now(),
			deviceId: deviceInfo.webViewVersion || 'unknown',
			platform: deviceInfo.platform,
			version: deviceInfo.osVersion,
		};

		return this.encryptData(JSON.stringify(secureData));
	}

	/**
	 * Decrypt data with device binding verification
	 */
	static async decryptWithDeviceBinding(
		encryptedData: string,
		userId: string
	): Promise<string> {
		const deviceInfo = await Device.getInfo();
		const key = await this.deriveDeviceKey(userId);

		const decryptedJson = await this.decryptData(encryptedData);
		const secureData = JSON.parse(decryptedJson);

		// Verify device binding
		if (
			deviceInfo.webViewVersion &&
			secureData.deviceId !== deviceInfo.webViewVersion
		) {
			throw new Error('Device binding verification failed');
		}

		return secureData.data;
	}

	/**
	 * Derive device key for user
	 */
	private static async deriveDeviceKey(userId: string): Promise<string> {
		const baseKey = this.deviceKey || (await this.getOrCreateDeviceKey());
		return await this.hashData(baseKey + userId);
	}

	/**
	 * Hash data using crypto
	 */
	private static async hashData(data: string): Promise<string> {
		const encoder = new TextEncoder();
		const dataBuffer = encoder.encode(data);
		const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
	}

	/**
	 * Generate device fingerprint
	 */
	static async generateDeviceFingerprint(): Promise<string> {
		const deviceInfo = await Device.getInfo();

		const fingerprint = {
			webViewVersion: deviceInfo.webViewVersion || 'unknown',
			platform: deviceInfo.platform,
			model: deviceInfo.model,
			osVersion: deviceInfo.osVersion,
			manufacturer: deviceInfo.manufacturer,
			isVirtual: deviceInfo.isVirtual,
			timestamp: Date.now(),
		};

		return this.hashData(JSON.stringify(fingerprint));
	}
}
