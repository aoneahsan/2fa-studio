/**
 * Biometric Account Service - Manages biometric authentication for OTP accounts
 * @module services/biometric-account
 */

import {
	collection,
	doc,
	updateDoc,
	serverTimestamp,
	getFirestore,
} from 'firebase/firestore';

// Try to import biometric auth, fallback to mock if not available
let BiometricAuth: any = null;
try {
	BiometricAuth = require('@capacitor-community/biometric-auth').BiometricAuth;
} catch (error) {
	console.warn('Biometric auth not available, using mock implementation');
	BiometricAuth = {
		isAvailable: () => Promise.resolve({ isAvailable: false }),
		authenticate: () =>
			Promise.reject(new Error('Biometric auth not available')),
	};
}

import { auth } from '../config/firebase';
import { AuditLogService } from './audit-log.service';
import { ErrorMonitoringService } from './error-monitoring.service';

interface BiometricAuthResult {
	success: boolean;
	account?: OTPAccount;
	error?: string;
}

interface OTPAccount {
	id: string;
	userId?: string;
	label: string;
	requiresBiometric?: boolean;
	biometricTimeout?: number;
	lastBiometricAuth?: Date;
}

const db = getFirestore();

/**
 * Service for managing biometric authentication on OTP accounts
 */
export class BiometricAccountService {
	private static authenticatedAccounts: Map<string, Date> = new Map();

	/**
	 * Check if biometric authentication is required for an account
	 */
	static isBiometricRequired(account: OTPAccount): boolean {
		if (!account.requiresBiometric) {
			return false;
		}

		const lastAuth = this.authenticatedAccounts.get(account.id);
		if (!lastAuth) {
			return true;
		}

		const timeoutMinutes = account.biometricTimeout || 5;
		const timeoutMs = timeoutMinutes * 60 * 1000;
		const now = new Date();

		return now.getTime() - lastAuth.getTime() > timeoutMs;
	}

	/**
	 * Authenticate an account using biometric authentication
	 */
	static async authenticateAccount(
		account: OTPAccount,
		reason?: string
	): Promise<BiometricAuthResult> {
		try {
			// Check if biometric is required
			if (!this.isBiometricRequired(account)) {
				return {
					success: true,
					account,
				};
			}

			// Check if biometric is available
			const available = await BiometricAuth.isAvailable();
			if (!available.isAvailable) {
				return {
					success: false,
					error: 'Biometric authentication not available',
				};
			}

			// Perform biometric authentication
			await BiometricAuth.authenticate({
				reason: reason || `Access ${account.label}`,
				title: 'Authentication Required',
				subtitle: 'Please authenticate to continue',
				description: 'Use biometric authentication to access your account',
				negativeButtonText: 'Cancel',
			});

			// Update authentication timestamp
			this.authenticatedAccounts.set(account.id, new Date());

			// Update in database
			await this.updateLastBiometricAuth(account.id, account.userId || '');

			// Log successful biometric auth
			await AuditLogService.log({
				userId: account.userId || auth.currentUser?.uid || 'unknown',
				action: 'security.biometric_auth_success',
				resource: 'account',
				success: true,
				severity: 'info',
				details: {
					accountId: account.id,
					accountLabel: account.label,
				},
			});

			return {
				success: true,
				account,
			};
		} catch (error) {
			console.error('Biometric authentication failed:', error);

			// Log failed biometric auth
			await AuditLogService.log({
				userId: account.userId || auth.currentUser?.uid || 'unknown',
				action: 'security.biometric_auth_failed',
				resource: 'account',
				success: false,
				severity: 'warning',
				details: {
					accountId: account.id,
					accountLabel: account.label,
					error: error instanceof Error ? error.message : 'Unknown error',
				},
			});

			return {
				success: false,
				error: error instanceof Error ? error.message : 'Authentication failed',
			};
		}
	}

	/**
	 * Enable biometric authentication for an account
	 */
	static async enableBiometric(
		userId: string,
		accountId: string,
		timeout: number = 5 // Default 5 minutes
	): Promise<void> {
		try {
			// Check if biometric is available
			const available = await BiometricAuth.isAvailable();
			if (!available.isAvailable) {
				throw new Error(
					'Biometric authentication not available on this device'
				);
			}

			// Perform initial biometric authentication to confirm setup
			await BiometricAuth.authenticate({
				reason: 'Confirm biometric setup',
				title: 'Enable Biometric Authentication',
				subtitle: 'Authenticate to enable biometric protection',
				description:
					'This will enable biometric authentication for this account',
				negativeButtonText: 'Cancel',
			});

			// Update account in database
			const accountRef = doc(db, 'accounts', accountId);
			await updateDoc(accountRef, {
				requiresBiometric: true,
				biometricTimeout: timeout,
				lastBiometricAuth: serverTimestamp(),
				updatedAt: serverTimestamp(),
			});

			// Log biometric enablement
			await AuditLogService.log({
				userId: userId,
				action: 'security.biometric_enabled',
				resource: 'account',
				success: true,
				severity: 'info',
				details: {
					accountId,
					timeout,
				},
			});

			console.log('Biometric authentication enabled for account:', accountId);
		} catch (error) {
			console.error('Failed to enable biometric authentication:', error);
			throw error;
		}
	}

	/**
	 * Disable biometric authentication for an account
	 */
	static async disableBiometric(
		userId: string,
		accountId: string
	): Promise<void> {
		try {
			// Perform biometric authentication to confirm disabling
			await BiometricAuth.authenticate({
				reason: 'Confirm biometric disable',
				title: 'Disable Biometric Authentication',
				subtitle: 'Authenticate to disable biometric protection',
				description:
					'This will disable biometric authentication for this account',
				negativeButtonText: 'Cancel',
			});

			// Update account in database
			const accountRef = doc(db, 'accounts', accountId);
			await updateDoc(accountRef, {
				requiresBiometric: false,
				biometricTimeout: null,
				lastBiometricAuth: null,
				updatedAt: serverTimestamp(),
			});

			// Remove from authenticated accounts
			this.authenticatedAccounts.delete(accountId);

			// Log biometric disablement
			await AuditLogService.log({
				userId: userId,
				action: 'security.biometric_disabled',
				resource: 'account',
				success: true,
				severity: 'info',
				details: {
					accountId,
				},
			});

			console.log('Biometric authentication disabled for account:', accountId);
		} catch (error) {
			console.error('Failed to disable biometric authentication:', error);
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
			// Update account in database
			const accountRef = doc(db, 'accounts', accountId);
			await updateDoc(accountRef, {
				biometricTimeout: timeout,
				updatedAt: serverTimestamp(),
			});

			// Log timeout update
			await AuditLogService.log({
				userId: userId,
				action: 'security.biometric_enabled',
				resource: 'account',
				success: true,
				severity: 'info',
				details: {
					accountId,
					newTimeout: timeout,
				},
			});
		} catch (error) {
			console.error('Failed to update biometric timeout:', error);
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
			const accountRef = doc(db, 'accounts', accountId);
			await updateDoc(accountRef, {
				lastBiometricAuth: serverTimestamp(),
				updatedAt: serverTimestamp(),
			});
		} catch (error) {
			console.error('Failed to update last biometric auth timestamp:', error);
			// Don't throw error as this is not critical
		}
	}

	/**
	 * Clear all authenticated accounts (e.g., on app backgrounding)
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
		const isAuthenticated = !this.isBiometricRequired(account);

		if (!isEnabled) {
			return {
				isEnabled: false,
				isAuthenticated: true,
			};
		}

		const lastAuth = this.authenticatedAccounts.get(account.id);
		const timeoutMinutes = account.biometricTimeout || 5;

		let remainingMinutes = 0;
		if (lastAuth) {
			const elapsed = new Date().getTime() - lastAuth.getTime();
			const remaining = timeoutMinutes * 60 * 1000 - elapsed;
			remainingMinutes = Math.max(0, Math.ceil(remaining / (60 * 1000)));
		}

		return {
			isEnabled,
			isAuthenticated,
			timeoutMinutes,
			remainingMinutes,
		};
	}
}
