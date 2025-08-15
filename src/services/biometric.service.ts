/**
 * Biometric Authentication Service
 * Handles fingerprint, Face ID, and other biometric authentication methods
 */

import { Capacitor } from '@capacitor/core';
import { BiometricAuth } from 'capacitor-biometric-authentication';
import { EncryptionService } from './encryption.service';

export enum BiometricType {
	FINGERPRINT = 'fingerprint',
	FACE_ID = 'face_id',
	IRIS = 'iris',
	NONE = 'none',
}

export interface BiometricStatus {
	isAvailable: boolean;
	type: BiometricType;
	isEnrolled: boolean;
	isConfigured: boolean;
}

export interface BiometricResult {
	success: boolean;
	error?: string;
	token?: string;
}

export class BiometricService {
	private static instance: BiometricService;
	private static biometricKey: string | null = null;
	private static sessionTimeout = 5 * 60 * 1000; // 5 minutes
	private static lastAuthTime: number | null = null;

	private constructor() {}

	public static getInstance(): BiometricService {
		if (!BiometricService.instance) {
			BiometricService.instance = new BiometricService();
		}
		return BiometricService.instance;
	}

	/**
	 * Check if biometric authentication is available
	 */
	public async checkAvailability(): Promise<BiometricStatus> {
		try {
			// Web fallback
			if (!Capacitor.isNativePlatform()) {
				return this.getWebBiometricStatus();
			}

			// Native platform check
			const result = await BiometricAuth.checkBiometricIsAvailable();

			return {
				isAvailable: result.isAvailable,
				type: this.mapBiometricType(result.biometryType),
				isEnrolled: result.isAvailable,
				isConfigured: this.isBiometricConfigured(),
			};
		} catch (error) {
			console.error('Biometric availability check failed:', error);
			return {
				isAvailable: false,
				type: BiometricType.NONE,
				isEnrolled: false,
				isConfigured: false,
			};
		}
	}

	/**
	 * Authenticate using biometrics
	 */
	public async authenticate(reason?: string): Promise<BiometricResult> {
		try {
			// Check if session is still valid
			if (this.isSessionValid()) {
				return {
					success: true,
					token: await this.getSessionToken(),
				};
			}

			// Web fallback
			if (!Capacitor.isNativePlatform()) {
				return await this.authenticateWeb();
			}

			// Native authentication
			const result = await BiometricAuth.authenticate({
				reason: reason || 'Authenticate to access your 2FA codes',
				cancelTitle: 'Cancel',
				fallbackTitle: 'Use PIN',
				disableBackup: false,
			});

			if (result.success) {
				// Generate session token
				const token = await this.generateSessionToken();
				BiometricService.lastAuthTime = Date.now();

				return {
					success: true,
					token,
				};
			}

			return {
				success: false,
				error: 'Authentication failed',
			};
		} catch (error) {
			console.error('Biometric authentication failed:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Authentication failed',
			};
		}
	}

	/**
	 * Configure biometric authentication
	 */
	public async configure(masterPassword: string): Promise<boolean> {
		try {
			// Generate biometric key from master password
			const biometricKey = await this.generateBiometricKey(masterPassword);

			// Store encrypted key
			await this.storeBiometricKey(biometricKey);

			// Mark as configured
			localStorage.setItem('biometric_configured', 'true');
			localStorage.setItem('biometric_configured_at', Date.now().toString());

			return true;
		} catch (error) {
			console.error('Biometric configuration failed:', error);
			return false;
		}
	}

	/**
	 * Remove biometric configuration
	 */
	public async removeConfiguration(): Promise<boolean> {
		try {
			// Clear stored keys
			localStorage.removeItem('biometric_key');
			localStorage.removeItem('biometric_configured');
			localStorage.removeItem('biometric_configured_at');
			localStorage.removeItem('biometric_session');

			BiometricService.biometricKey = null;
			BiometricService.lastAuthTime = null;

			return true;
		} catch (error) {
			console.error('Failed to remove biometric configuration:', error);
			return false;
		}
	}

	/**
	 * Verify biometric with master password
	 */
	public async verifyWithPassword(password: string): Promise<boolean> {
		try {
			const storedKey = await this.getStoredBiometricKey();
			if (!storedKey) return false;

			const generatedKey = await this.generateBiometricKey(password);
			return storedKey === generatedKey;
		} catch (error) {
			console.error('Password verification failed:', error);
			return false;
		}
	}

	/**
	 * Lock application (clear session)
	 */
	public lock(): void {
		BiometricService.lastAuthTime = null;
		localStorage.removeItem('biometric_session');
	}

	/**
	 * Check if app is locked
	 */
	public isLocked(): boolean {
		return !this.isSessionValid();
	}

	/**
	 * Set session timeout (in milliseconds)
	 */
	public setSessionTimeout(timeout: number): void {
		BiometricService.sessionTimeout = timeout;
		localStorage.setItem('biometric_timeout', timeout.toString());
	}

	/**
	 * Get session timeout
	 */
	public getSessionTimeout(): number {
		const stored = localStorage.getItem('biometric_timeout');
		if (stored) {
			BiometricService.sessionTimeout = parseInt(stored);
		}
		return BiometricService.sessionTimeout;
	}

	// Private helper methods

	private async getWebBiometricStatus(): Promise<BiometricStatus> {
		// Check for Web Authentication API
		const isAvailable =
			'credentials' in navigator &&
			'create' in navigator.credentials &&
			'get' in navigator.credentials;

		return {
			isAvailable,
			type: isAvailable ? BiometricType.FINGERPRINT : BiometricType.NONE,
			isEnrolled: isAvailable,
			isConfigured: this.isBiometricConfigured(),
		};
	}

	private async authenticateWeb(): Promise<BiometricResult> {
		try {
			// Use Web Authentication API if available
			if ('credentials' in navigator) {
				// For demo purposes, simulate biometric auth
				// In production, implement proper WebAuthn
				const confirmed = await this.showBiometricPrompt();

				if (confirmed) {
					const token = await this.generateSessionToken();
					BiometricService.lastAuthTime = Date.now();

					return {
						success: true,
						token,
					};
				}
			}

			return {
				success: false,
				error: 'Biometric authentication not available',
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Authentication failed',
			};
		}
	}

	private async showBiometricPrompt(): Promise<boolean> {
		// Simulate biometric prompt for web
		// In production, use WebAuthn API
		return new Promise((resolve) => {
			const message = 'Authenticate with your device credentials to continue';

			// Create a modal or use browser's built-in prompt
			if (confirm(message)) {
				resolve(true);
			} else {
				resolve(false);
			}
		});
	}

	private mapBiometricType(type?: string): BiometricType {
		if (!type) return BiometricType.NONE;

		const typeMap: Record<string, BiometricType> = {
			fingerprint: BiometricType.FINGERPRINT,
			face: BiometricType.FACE_ID,
			face_id: BiometricType.FACE_ID,
			iris: BiometricType.IRIS,
			touch_id: BiometricType.FINGERPRINT,
		};

		return typeMap[type.toLowerCase()] || BiometricType.NONE;
	}

	private isBiometricConfigured(): boolean {
		return localStorage.getItem('biometric_configured') === 'true';
	}

	private isSessionValid(): boolean {
		if (!BiometricService.lastAuthTime) {
			const storedSession = localStorage.getItem('biometric_session');
			if (storedSession) {
				try {
					const session = JSON.parse(storedSession);
					BiometricService.lastAuthTime = session.timestamp;
				} catch {
					return false;
				}
			} else {
				return false;
			}
		}

		const now = Date.now();
		const elapsed = now - BiometricService.lastAuthTime;

		return elapsed < BiometricService.sessionTimeout;
	}

	private async generateSessionToken(): Promise<string> {
		const token = crypto.randomUUID();
		const session = {
			token,
			timestamp: Date.now(),
		};

		localStorage.setItem('biometric_session', JSON.stringify(session));

		return token;
	}

	private async getSessionToken(): Promise<string> {
		const storedSession = localStorage.getItem('biometric_session');
		if (storedSession) {
			try {
				const session = JSON.parse(storedSession);
				return session.token;
			} catch {
				return '';
			}
		}
		return '';
	}

	private async generateBiometricKey(password: string): Promise<string> {
		// Generate a unique key based on password
		const salt = 'biometric_auth_salt_2fa_studio';
		const combined = password + salt;

		const encoder = new TextEncoder();
		const data = encoder.encode(combined);
		const hashBuffer = await crypto.subtle.digest('SHA-256', data);
		const hashArray = Array.from(new Uint8Array(hashBuffer));

		return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
	}

	private async storeBiometricKey(key: string): Promise<void> {
		// Encrypt the key before storing
		const encryptedKey = await EncryptionService.encrypt(
			key,
			'biometric_storage_key'
		);

		localStorage.setItem('biometric_key', encryptedKey);
		BiometricService.biometricKey = key;
	}

	private async getStoredBiometricKey(): Promise<string | null> {
		if (BiometricService.biometricKey) {
			return BiometricService.biometricKey;
		}

		const encryptedKey = localStorage.getItem('biometric_key');
		if (!encryptedKey) return null;

		try {
			const key = await EncryptionService.decrypt(
				encryptedKey,
				'biometric_storage_key'
			);

			BiometricService.biometricKey = key;
			return key;
		} catch {
			return null;
		}
	}

	/**
	 * Export biometric configuration for backup
	 */
	public async exportConfiguration(): Promise<string | null> {
		try {
			const config = {
				configured: this.isBiometricConfigured(),
				configuredAt: localStorage.getItem('biometric_configured_at'),
				timeout: this.getSessionTimeout(),
				key: await this.getStoredBiometricKey(),
			};

			return JSON.stringify(config);
		} catch (error) {
			console.error('Failed to export biometric configuration:', error);
			return null;
		}
	}

	/**
	 * Import biometric configuration from backup
	 */
	public async importConfiguration(configData: string): Promise<boolean> {
		try {
			const config = JSON.parse(configData);

			if (config.configured && config.key) {
				await this.storeBiometricKey(config.key);
				localStorage.setItem('biometric_configured', 'true');
				localStorage.setItem(
					'biometric_configured_at',
					config.configuredAt || Date.now().toString()
				);

				if (config.timeout) {
					this.setSessionTimeout(config.timeout);
				}

				return true;
			}

			return false;
		} catch (error) {
			console.error('Failed to import biometric configuration:', error);
			return false;
		}
	}
}
