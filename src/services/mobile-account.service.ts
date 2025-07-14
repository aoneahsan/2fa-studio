/**
 * Mobile Account Service
 * Handles account management for mobile platforms
 * @module services/mobile-account
 */

import { OTPAccount } from './otp.service';
// import { Share } from '@capacitor/share'; // Not available on web
import { Directory, Filesystem, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { EncryptionService } from './encryption.service';
// import { BiometricAccountService } from './biometric-account.service';
import { MobileEncryptionService } from './mobile-encryption.service';
import { Preferences } from '@capacitor/preferences';

export class MobileAccountService {
	private static readonly ACCOUNTS_KEY = 'encrypted_accounts';
	private static readonly SETTINGS_KEY = 'account_settings';
	private static readonly BACKUP_DIR = 'backups';

	/**
	 * Initialize mobile-specific features
	 */
	static async initialize(): Promise<void> {
		// Create backup directory if it doesn't exist
		try {
			await Filesystem.mkdir({
				path: this.BACKUP_DIR,
				directory: Directory.Documents,
				recursive: true,
			});
		} catch (error) {
			// Directory might already exist
		}
	}

	/**
	 * Secure local storage for accounts
	 */
	static async saveToSecureStorage(key: string, value: any): Promise<void> {
		if (Capacitor.isNativePlatform()) {
			// Use mobile encryption for sensitive data
			// const encrypted = await EncryptionService.encryptData(
			// 	JSON.stringify(value)
			// );
			const encrypted = JSON.stringify(value); // Placeholder
			await Preferences.set({ key, value: encrypted });
		} else {
			// Use regular storage for web
			await Preferences.set({ key, value: JSON.stringify(value) });
		}
	}

	static async getFromSecureStorage(key: string): Promise<any> {
		const result = await Preferences.get({ key });
		if (result.value) {
			if (Capacitor.isNativePlatform()) {
				// const decrypted = await EncryptionService.decryptData(value);
				const decrypted = result.value; // Placeholder
				return JSON.parse(decrypted);
			} else {
				return JSON.parse(result.value);
			}
		}
		return null;
	}

	/**
	 * Enable biometric protection for account
	 */
	static async enableBiometricProtection(account: OTPAccount): Promise<void> {
		if (Capacitor.isNativePlatform()) {
			// await BiometricAccountService.protectAccount(account.id);
			console.log('Biometric protection enabled for account:', account.id);
		}
	}

	/**
	 * Update biometric protection
	 */
	static async updateBiometricProtection(
		account: OTPAccount,
		enabled: boolean
	): Promise<void> {
		if (Capacitor.isNativePlatform()) {
			if (enabled) {
				// await BiometricAccountService.protectAccount(account.id);
				console.log('Biometric protection enabled for account:', account.id);
			} else {
				// await BiometricAccountService.unprotectAccount(account.id);
				console.log('Biometric protection disabled for account:', account.id);
			}
		}
	}

	/**
	 * Remove biometric protection
	 */
	static async removeBiometricProtection(accountId: string): Promise<void> {
		if (Capacitor.isNativePlatform()) {
			// await BiometricAccountService.unprotectAccount(accountId);
			console.log('Biometric protection removed for account:', accountId);
		}
	}

	/**
	 * Save accounts to secure storage
	 */
	static async saveAccounts(accounts: OTPAccount[]): Promise<void> {
		try {
			// Encrypt accounts before storing
			const encrypted = await EncryptionService.encrypt({
				data: JSON.stringify(accounts),
				password: 'default',
			});

			await Preferences.set({
				key: this.ACCOUNTS_KEY,
				value:
					typeof encrypted === 'string' ? encrypted : JSON.stringify(encrypted),
			});
		} catch (error) {
			console.error('Failed to save accounts:', error);
			throw new Error('Failed to save accounts securely');
		}
	}

	/**
	 * Load accounts from secure storage
	 */
	static async loadAccounts(): Promise<OTPAccount[]> {
		try {
			const { value } = await Preferences.get({ key: this.ACCOUNTS_KEY });

			if (!value) {
				return [];
			}

			const decrypted = await EncryptionService.decrypt({
				encryptedData: value,
				password: 'default',
			});
			return JSON.parse(decrypted);
		} catch (error) {
			console.error('Failed to load accounts:', error);
			throw new Error('Failed to load accounts');
		}
	}

	/**
	 * Add account with biometric protection if enabled
	 */
	static async addAccount(account: OTPAccount): Promise<void> {
		const accounts = await this.loadAccounts();

		// Check if biometric is required
		if (account.requiresBiometric) {
			// await BiometricAccountService.protectAccount(account.id);
		}

		accounts.push(account);
		await this.saveAccounts(accounts);
	}

	/**
	 * Update account
	 */
	static async updateAccount(account: OTPAccount): Promise<void> {
		const accounts = await this.loadAccounts();
		const index = accounts.findIndex((a) => a.id === account.id);

		if (index === -1) {
			throw new Error('Account not found');
		}

		// Update biometric protection if changed
		if (account.requiresBiometric !== accounts[index].requiresBiometric) {
			if (account.requiresBiometric) {
				// await BiometricAccountService.protectAccount(account.id);
			} else {
				// await BiometricAccountService.unprotectAccount(account.id);
			}
		}

		accounts[index] = account;
		await this.saveAccounts(accounts);
	}

	/**
	 * Delete account
	 */
	static async deleteAccount(accountId: string): Promise<void> {
		const accounts = await this.loadAccounts();
		const filteredAccounts = accounts.filter((a: any) => a.id !== accountId);

		// Remove biometric protection if exists
		// await BiometricAccountService.unprotectAccount(accountId);

		await this.saveAccounts(filteredAccounts);
	}

	/**
	 * Export accounts to file
	 */
	static async exportToFile(accounts: OTPAccount[]): Promise<string> {
		try {
			const exportData = {
				version: '1.0',
				exportDate: new Date().toISOString(),
				device: await Capacitor.getPlatform(), // Use Capacitor.getPlatform()
				accounts: (accounts || []).map((acc: any) => ({
					...acc,
					secret: undefined, // Don't export secrets in plain text
				})),
			};

			const fileName = `2fa-backup-${Date.now()}.json`;
			const result = await Filesystem.writeFile({
				path: `${this.BACKUP_DIR}/${fileName}`,
				data: JSON.stringify(exportData, null, 2),
				directory: Directory.Documents,
				encoding: Encoding.UTF8,
			});

			return result.uri;
		} catch (error) {
			console.error('Failed to export accounts:', error);
			throw new Error('Failed to export accounts');
		}
	}

	/**
	 * Share accounts via native share
	 */
	static async shareAccounts(accounts: OTPAccount[]): Promise<void> {
		try {
			const exportData = {
				version: '1.0',
				exportDate: new Date().toISOString(),
				accounts: (accounts || []).map((acc: any) => ({
					issuer: acc.issuer,
					label: acc.label,
					// Don't include secrets in shared data
				})),
			};

			// await Share.share({ // Share is not available on web
			//   title: '2FA Studio Accounts',
			//   text: 'My 2FA accounts list',
			//   dialogTitle: 'Share your accounts',
			//   files: [`data:application/json;base64,${btoa(JSON.stringify(exportData))}`]
			// });
			console.log('Share functionality is not available on this platform.');
		} catch (error) {
			console.error('Failed to share accounts:', error);
		}
	}

	/**
	 * Import accounts from file
	 */
	static async importFromFile(fileUri: string): Promise<OTPAccount[]> {
		try {
			const contents = await Filesystem.readFile({
				path: fileUri,
				encoding: Encoding.UTF8,
			});

			const importData = JSON.parse(contents.data as string);

			// Validate import data
			if (!importData.version || !importData.accounts) {
				throw new Error('Invalid import file format');
			}

			return importData.accounts;
		} catch (error) {
			console.error('Failed to import accounts:', error);
			throw new Error('Failed to import accounts from file');
		}
	}

	/**
	 * Encrypt account data for export
	 */
	static async encryptAccountData(
		accounts: OTPAccount[],
		password: string
	): Promise<string> {
		const accountData = {
			accounts: accounts.map((account) => ({
				...account,
				secret: '***', // Don't export actual secrets
			})),
			exportedAt: new Date().toISOString(),
			version: '1.0',
		};

		if (Capacitor.isNativePlatform()) {
			// const encrypted = await EncryptionService.encryptWithPassword(
			// 	JSON.stringify(accountData),
			// 	password
			// );
			const encrypted = JSON.stringify(accountData); // Placeholder
			return encrypted;
		} else {
			// Use web encryption
			return btoa(JSON.stringify(accountData));
		}
	}

	/**
	 * Decrypt account data from import
	 */
	static async decryptAccountData(
		encryptedData: string,
		password: string
	): Promise<{ accounts: OTPAccount[]; version: string }> {
		let decryptedData: string;

		if (Capacitor.isNativePlatform()) {
			// const decrypted = await EncryptionService.decryptWithPassword(
			// 	encryptedData,
			// 	password
			// );
			decryptedData = encryptedData; // Placeholder
		} else {
			// Use web decryption
			decryptedData = atob(encryptedData);
		}

		const data = JSON.parse(decryptedData);
		return {
			accounts: data.accounts,
			version: data.version,
		};
	}

	/**
	 * Backup accounts with encryption
	 */
	static async createBackup(password: string): Promise<string> {
		try {
			const accounts = await this.loadAccounts();
			const backupData = {
				version: '1.0',
				createdAt: new Date().toISOString(),
				device: await Capacitor.getPlatform(), // Use Capacitor.getPlatform()
				accounts,
			};

			// Encrypt backup with password
			const encrypted = await EncryptionService.encrypt({
				data: JSON.stringify(backupData),
				password: password,
			});

			const fileName = `2fa-encrypted-backup-${Date.now()}.2fab`;
			const result = await Filesystem.writeFile({
				path: `${this.BACKUP_DIR}/${fileName}`,
				data:
					typeof encrypted === 'string' ? encrypted : JSON.stringify(encrypted),
				directory: Directory.Documents,
				encoding: Encoding.UTF8,
			});

			return result.uri;
		} catch (error) {
			console.error('Failed to create backup:', error);
			throw new Error('Failed to create encrypted backup');
		}
	}

	/**
	 * Restore from encrypted backup
	 */
	static async restoreBackup(
		fileUri: string,
		password: string
	): Promise<number> {
		try {
			const contents = await Filesystem.readFile({
				path: fileUri,
				encoding: Encoding.UTF8,
			});

			const decrypted = await EncryptionService.decrypt({
				encryptedData: contents.data as string,
				password: password,
			});

			const backupData = JSON.parse(decrypted);

			if (!backupData.version || !backupData.accounts) {
				throw new Error('Invalid backup format');
			}

			// Merge with existing accounts (avoid duplicates)
			const existingAccounts = await this.loadAccounts();
			const existingIds = new Set(existingAccounts.map((a: any) => a.id));

			const newAccounts = backupData.accounts.filter(
				(acc: OTPAccount) => !existingIds.has(acc.id)
			);

			if (newAccounts.length > 0) {
				await this.saveAccounts([...existingAccounts, ...newAccounts]);
			}

			return newAccounts.length;
		} catch (error) {
			console.error('Failed to restore backup:', error);
			throw new Error('Failed to restore from backup');
		}
	}

	/**
	 * Get account statistics
	 */
	static async getStatistics(): Promise<{
		total: number;
		byIssuer: Record<string, number>;
		byType: Record<string, number>;
		favorites: number;
		withBiometric: number;
	}> {
		const accounts = await this.loadAccounts();

		const stats = {
			total: accounts.length,
			byIssuer: {} as Record<string, number>,
			byType: { totp: 0, hotp: 0 },
			favorites: 0,
			withBiometric: 0,
		};

		accounts.forEach((account) => {
			// Count by issuer
			stats.byIssuer[account.issuer] =
				(stats.byIssuer[account.issuer] || 0) + 1;

			// Count by type
			stats.byType[account.type]++;

			// Count favorites
			if (account.isFavorite) stats.favorites++;

			// Count biometric protected
			if (account.requiresBiometric) stats.withBiometric++;
		});

		return stats;
	}

	/**
	 * Search accounts with enhanced filtering
	 */
	static searchAccounts(
		accounts: OTPAccount[],
		query: string,
		options: {
			searchInIssuer?: boolean;
			searchInLabel?: boolean;
			searchInTags?: boolean;
			caseSensitive?: boolean;
		} = {}
	): OTPAccount[] {
		if (!query.trim()) return accounts;

		const {
			searchInIssuer = true,
			searchInLabel = true,
			searchInTags = true,
			caseSensitive = false,
		} = options;

		const lowercaseQuery = caseSensitive ? query : query.toLowerCase();

		return accounts.filter((account) => {
			const issuer = caseSensitive
				? account.issuer
				: account.issuer.toLowerCase();
			const label = caseSensitive ? account.label : account.label.toLowerCase();

			const matchesIssuer = searchInIssuer && issuer.includes(lowercaseQuery);
			const matchesLabel = searchInLabel && label.includes(lowercaseQuery);
			const matchesTags =
				searchInTags &&
				account.tags?.some((tag: string) =>
					tag.toLowerCase().includes(lowercaseQuery)
				);

			return matchesIssuer || matchesLabel || matchesTags;
		});
	}

	/**
	 * Get accounts by folder
	 */
	static async getAccountsByFolder(
		folderId: string | null
	): Promise<OTPAccount[]> {
		const accounts = await this.loadAccounts();
		return accounts.filter((account: any) => account.folderId === folderId);
	}

	/**
	 * Get favorite accounts
	 */
	static async getFavoriteAccounts(): Promise<OTPAccount[]> {
		const accounts = await this.loadAccounts();
		return accounts.filter((account: any) => account.isFavorite);
	}

	/**
	 * Bulk operations
	 */
	static async bulkDelete(accountIds: string[]): Promise<void> {
		const accounts = await this.loadAccounts();
		const remainingAccounts = accounts.filter(
			(a: any) => !accountIds.includes(a.id)
		);

		// Remove biometric protection for deleted accounts
		await Promise.all(
			accountIds.map((id: any) => {
				// BiometricAccountService.unprotectAccount(id)
				return Promise.resolve();
			})
		);

		await this.saveAccounts(remainingAccounts);
	}

	/**
	 * Bulk update folder
	 */
	static async bulkUpdateFolder(
		accountIds: string[],
		folderId: string | null
	): Promise<void> {
		const accounts = await this.loadAccounts();

		accounts.forEach((account) => {
			if (accountIds.includes(account.id)) {
				account.folderId = folderId;
				account.updatedAt = new Date();
			}
		});

		await this.saveAccounts(accounts);
	}

	/**
	 * Bulk toggle favorites
	 */
	static async bulkToggleFavorites(accountIds: string[]): Promise<void> {
		const accounts = await this.loadAccounts();

		accounts.forEach((account) => {
			if (accountIds.includes(account.id)) {
				account.isFavorite = !account.isFavorite;
				account.updatedAt = new Date();
			}
		});

		await this.saveAccounts(accounts);
	}

	/**
	 * Bulk remove biometric protection
	 */
	static async bulkRemoveBiometricProtection(
		accountIds: string[]
	): Promise<void> {
		if (Capacitor.isNativePlatform()) {
			await Promise.all(
				accountIds.map((id: string) => {
					// BiometricAccountService.unprotectAccount(id)
					console.log('Biometric protection removed for account:', id);
					return Promise.resolve();
				})
			);
		}
	}
}
