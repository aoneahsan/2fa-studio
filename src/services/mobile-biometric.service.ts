/**
 * Mobile Biometric Service
 * Handles biometric authentication for mobile platforms
 * @module services/mobile-biometric
 */

import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { BiometricAuth } from 'capacitor-biometric-auth';
import { MobileEncryptionService } from './mobile-encryption.service';

export interface BiometricConfig {
	enabled: boolean;
	timeout: number;
	reason: string;
	protectedAccounts: string[];
	lastUsed?: string;
	templates?: Record<string, string>;
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
	 * Check if biometric authentication is available
	 */
	static async checkBiometricAvailability(): Promise<{
		available: boolean;
		biometryType: string;
		reason?: string;
	}> {
		if (!Capacitor.isNativePlatform()) {
			return {
				available: false,
				biometryType: 'none',
				reason: 'Biometric authentication not available on web platform',
			};
		}

		try {
			const result = await (BiometricAuth as any).checkBiometry();
			return {
				available: result.available,
				biometryType: result.biometryType,
				reason: result.reason
			};
		} catch (error) {
			return {
				available: false,
				biometryType: 'none',
				reason: 'Error checking biometric availability',
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
			console.error('Failed to get biometric _config:', error);
		}

		return {
			enabled: false,
			timeout: 5, // Default 5 minutes
			reason: '',
			protectedAccounts: [],
		};
	}

	/**
	 * Save biometric configuration
	 */
	static async saveConfig(_config: BiometricConfig): Promise<void> {
		await Preferences.set({
			key: this.CONFIG_KEY,
			value: JSON.stringify(_config),
		});
	}

	/**
	 * Enable biometric authentication
	 */
	static async enableBiometricAuth(
		reason: string = 'Enable biometric authentication'
	): Promise<void> {
		if (!Capacitor.isNativePlatform()) {
			throw new Error('Biometric authentication not available on web platform');
		}

		const config = await this.getConfig();
		config.enabled = true;
		config.reason = reason;
		await this.saveConfig(config);
	}

	/**
	 * Disable biometric authentication
	 */
	static async disableBiometricAuth(): Promise<void> {
		const config = await this.getConfig();
		config.enabled = false;
		await this.saveConfig(config);
	}

	/**
	 * Authenticate with biometric
	 */
	static async authenticate(
		reason: string = 'Authenticate with biometric'
	): Promise<{ success: boolean; error?: string }> {
		if (!Capacitor.isNativePlatform()) {
			return {
				success: false,
				error: 'Biometric authentication not available on web platform',
			};
		}

		try {
			const result = await (BiometricAuth as any).authenticate({
				reason,
				title: '2FA Studio',
				subtitle: 'Biometric Authentication',
				description: 'Use your biometric to authenticate',
				fallbackTitle: 'Use Password',
				cancelTitle: 'Cancel'
			});

			if (result.authenticated) {
				const config = await this.getConfig();
				config.lastUsed = new Date().toISOString();
				await this.saveConfig(config);
				return { success: true };
			} else {
				return { success: false, error: 'Authentication failed' };
			}
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
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
		config.protectedAccounts = config.protectedAccounts.filter(
			(id: any) => id !== accountId
		);
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

		if (authenticated.success) {
			this.authenticatedSessions.set(accountId, new Date());
		}

		return authenticated.success;
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
			remainingTime,
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

	/**
	 * Set biometric timeout
	 */
	static async setBiometricTimeout(timeoutMs: number): Promise<void> {
		const config = await this.getConfig();
		config.timeout = timeoutMs;
		await this.saveConfig(config);
	}

	/**
	 * Clear biometric timeout
	 */
	static async clearBiometricTimeout(): Promise<void> {
		const config = await this.getConfig();
		config.timeout = 0;
		await this.saveConfig(config);
	}

	/**
	 * Store biometric template (for advanced security)
	 */
	static async storeBiometricTemplate(
		accountId: string,
		template: string
	): Promise<void> {
		const config = await this.getConfig();
		if (!config.templates) config.templates = {};
		config.templates[accountId] = template;
		await this.saveConfig(config);
	}

	/**
	 * Get biometric template
	 */
	static async getBiometricTemplate(accountId: string): Promise<string | null> {
		const config = await this.getConfig();
		return config.templates?.[accountId] || null;
	}

	/**
	 * Check if user has authenticated recently
	 */
	static async isRecentlyAuthenticated(accountId: string): Promise<boolean> {
		const config = await this.getConfig();
		if (!config.enabled) return false;

		const lastAuth = config.lastUsed;
		if (!lastAuth) return false;

		const timeSinceAuth = Date.now() - new Date(lastAuth).getTime();
		const isRecent = timeSinceAuth < (config.timeout || 300000); // 5 minutes default

		if (isRecent) {
			const authenticated = await this.authenticate('Access account');
			return authenticated.success;
		}

		return false;
	}

	/**
	 * Clear authentication session
	 */
	static async clearAuthSession(): Promise<void> {
		const config = await this.getConfig();
		config.lastUsed = undefined;
		await this.saveConfig(config);
	}
}
