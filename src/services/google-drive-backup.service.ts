/**
 * Enhanced Google Drive backup service with versioning and encryption
 * @module services/google-drive-backup
 */

import { OTPAccount } from './otp.service';
import { EncryptionService } from './encryption.service';
import { MobileEncryptionService } from './mobile-encryption.service';
import { Capacitor } from '@capacitor/core';
import { GoogleDriveAPI } from './google-drive-api.service';

export interface BackupMetadata {
	version: string;
	createdAt: string;
	deviceInfo: unknown;
	accountCount: number;
	encrypted: boolean;
	checksum: string;
}

export interface DriveBackupFile {
	id: string;
	name: string;
	createdTime: string;
	size: number;
	metadata: BackupMetadata;
}

export interface BackupOptions {
	password?: string;
	description?: string;
	compress?: boolean;
	includeMetadata?: boolean;
}

export interface RestoreOptions {
	password?: string;
	validateChecksum?: boolean;
	mergeStrategy?: 'replace' | 'merge' | 'append';
}

export class GoogleDriveBackupService {
	// Remove unused drive property
	private static isInitialized = false;
	private static readonly APP_FOLDER = '2FA Studio Backups';
	private static readonly BACKUP_PREFIX = '2fa-backup-';
	private static readonly MAX_BACKUPS = 50;

	/**
	 * Initialize Google Drive API
	 */
	static async initialize(accessToken: string): Promise<void> {
		try {
			// Set access token for API requests
			GoogleDriveAPI.setAccessToken(accessToken);
			this.isInitialized = true;

			// Ensure app folder exists
			await this.ensureAppFolder();
		} catch (error) {
			console.error('Failed to initialize Google Drive:', error);
			throw new Error('Google Drive initialization failed');
		}
	}

	/**
	 * Create encrypted backup to Google Drive
	 */
	static async createBackup(
		accounts: OTPAccount[],
		options: BackupOptions = {}
	): Promise<{ success: boolean; fileId?: string; error?: string }> {
		if (!this.isInitialized) {
			return { success: false, error: 'Google Drive not initialized' };
		}

		try {
			// Prepare backup data
			const deviceInfo = await this.getDeviceInfo();
			const backupData = {
				version: '2.0',
				createdAt: new Date().toISOString(),
				deviceInfo,
				accountCount: accounts.length,
				accounts: (accounts || []).map((account: any) => ({
					...account,
					// Remove sensitive fields that shouldn't be backed up
					id: undefined,
					userId: undefined,
					lastUsed: undefined,
				})),
				metadata: {
					description: options.description || 'Automatic backup',
					appVersion: '1.0.0',
				},
			};

			let processedData = JSON.stringify(backupData);
			let encrypted = false;

			// Encrypt data if password provided or if on mobile
			if (options.password || Capacitor.isNativePlatform()) {
				if (options.password) {
					const encryptedResult = await EncryptionService.encrypt({
						data: processedData,
						password: options.password,
					});
					processedData = JSON.stringify(encryptedResult);
				} else {
					// Use device encryption on mobile
					processedData =
						await MobileEncryptionService.encryptData(processedData);
				}
				encrypted = true;
			}

			// Generate checksum
			const checksum = await this.generateChecksum(processedData);

			// Create metadata
			const metadata: BackupMetadata = {
				version: '2.0',
				createdAt: new Date().toISOString(),
				deviceInfo,
				accountCount: accounts.length,
				encrypted,
				checksum,
			};

			// Generate filename
			const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
			const filename = `${this.BACKUP_PREFIX}${timestamp}.json`;

			// Get app folder
			const folderId = await this.getAppFolderId();

			// Upload to Google Drive
			const response = await GoogleDriveAPI.createFile(
				{
					name: filename,
					parents: [folderId],
					description: JSON.stringify(metadata),
					appProperties: {
						type: '2fa-backup',
						version: '2.0',
						accountCount: accounts.length.toString(),
						encrypted: encrypted.toString(),
						checksum,
					},
				},
				processedData
			);

			// Cleanup old backups
			await this.cleanupOldBackups();

			return { success: true, fileId: response.id };
		} catch (error) {
			console.error('Backup failed:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Backup failed',
			};
		}
	}

	/**
	 * List available backups
	 */
	static async listBackups(): Promise<DriveBackupFile[]> {
		if (!this.isInitialized) {
			throw new Error('Google Drive not initialized');
		}

		try {
			const folderId = await this.getAppFolderId();

			const response = await GoogleDriveAPI.listFiles(
				`'${folderId}' in parents and name contains '${this.BACKUP_PREFIX}' and trashed=false`
			);

			return response.files.map((file: any) => {
				let metadata: BackupMetadata;
				try {
					metadata = JSON.parse(file.description || '{}');
				} catch {
					metadata = {
						version: '1.0',
						createdAt: file.createdTime,
						deviceInfo: {},
						accountCount: parseInt(file.appProperties?.accountCount || '0'),
						encrypted: file.appProperties?.encrypted === 'true',
						checksum: file.appProperties?.checksum || '',
					};
				}

				return {
					id: file.id,
					name: file.name,
					createdTime: file.createdTime,
					size: parseInt(file.size || '0'),
					metadata,
				};
			});
		} catch (error) {
			console.error('Failed to list backups:', error);
			throw error;
		}
	}

	/**
	 * Restore from Google Drive backup
	 */
	static async restoreBackup(
		fileId: string,
		options: RestoreOptions = {}
	): Promise<{ success: boolean; accounts?: OTPAccount[]; error?: string }> {
		if (!this.isInitialized) {
			return { success: false, error: 'Google Drive not initialized' };
		}

		try {
			// Get file metadata
			const fileInfo = await GoogleDriveAPI.getFile(fileId, true);

			const appProperties = fileInfo.appProperties || {};
			const encrypted = appProperties.encrypted === 'true';
			const originalChecksum = appProperties.checksum;

			// Download file content
			let data = await GoogleDriveAPI.getFile(fileId, false);

			// Validate checksum if requested
			if (options.validateChecksum && originalChecksum) {
				const currentChecksum = await this.generateChecksum(data);
				if (currentChecksum !== originalChecksum) {
					return { success: false, error: 'Backup integrity check failed' };
				}
			}

			// Decrypt if necessary
			if (encrypted) {
				if (options.password) {
					data = await EncryptionService.decrypt({
						encryptedData: data,
						password: options.password,
					});
				} else if (Capacitor.isNativePlatform()) {
					data = await MobileEncryptionService.decryptData(data);
				} else {
					return {
						success: false,
						error: 'Password required for encrypted backup',
					};
				}
			}

			// Parse backup data
			const backupData = JSON.parse(data);

			if (!backupData.accounts || !Array.isArray(backupData.accounts)) {
				return { success: false, error: 'Invalid backup format' };
			}

			// Convert to OTPAccount format
			const accounts: OTPAccount[] = (backupData.accounts || []).map(
				(account: any) => ({
					...account,
					id: '', // Will be set when saving
					userId: '', // Will be set when saving
					createdAt: account.createdAt
						? new Date(account.createdAt)
						: new Date(),
					updatedAt: new Date(),
					lastUsed: null,
				})
			);

			return { success: true, accounts };
		} catch (error) {
			console.error('Restore failed:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Restore failed',
			};
		}
	}

	/**
	 * Delete backup from Google Drive
	 */
	static async deleteBackup(fileId: string): Promise<boolean> {
		if (!this.isInitialized) {
			throw new Error('Google Drive not initialized');
		}

		try {
			await GoogleDriveAPI.deleteFile(fileId);
			return true;
		} catch (error) {
			console.error('Failed to delete backup:', error);
			return false;
		}
	}

	/**
	 * Get backup info without downloading
	 */
	static async getBackupInfo(fileId: string): Promise<BackupMetadata | null> {
		if (!this.isInitialized) {
			throw new Error('Google Drive not initialized');
		}

		try {
			const response = await GoogleDriveAPI.getFile(fileId, true);

			const description = response.description;
			const appProperties = response.appProperties || {};

			if (description) {
				try {
					return JSON.parse(description);
				} catch {
					// Fallback to app properties
				}
			}

			// Fallback metadata from app properties
			return {
				version: '1.0',
				createdAt: new Date().toISOString(),
				deviceInfo: {},
				accountCount: parseInt(appProperties.accountCount || '0'),
				encrypted: appProperties.encrypted === 'true',
				checksum: appProperties.checksum || '',
			};
		} catch (error) {
			console.error('Failed to get backup info:', error);
			return null;
		}
	}

	/**
	 * Check Google Drive quota
	 */
	static async getQuotaInfo(): Promise<{
		limit: number;
		usage: number;
		available: number;
	}> {
		if (!this.isInitialized) {
			throw new Error('Google Drive not initialized');
		}

		try {
			const response = await GoogleDriveAPI.getAbout();

			const quota = response.storageQuota;
			const limit = parseInt(quota.limit || '0');
			const usage = parseInt(quota.usage || '0');

			return {
				limit,
				usage,
				available: limit - usage,
			};
		} catch (error) {
			console.error('Failed to get quota info:', error);
			throw error;
		}
	}

	/**
	 * Ensure app folder exists
	 */
	private static async ensureAppFolder(): Promise<void> {
		try {
			await this.getAppFolderId();
		} catch (error) {
			// Folder doesn't exist, create it
			await GoogleDriveAPI.createFile(
				{
					name: this.APP_FOLDER,
					mimeType: 'application/vnd.google-apps.folder',
				},
				''
			);
		}
	}

	/**
	 * Get app folder ID
	 */
	private static async getAppFolderId(): Promise<string> {
		const response = await GoogleDriveAPI.listFiles(
			`name='${this.APP_FOLDER}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
		);

		if (response.files.length === 0) {
			throw new Error('App folder not found');
		}

		return response.files[0].id;
	}

	/**
	 * Cleanup old backups
	 */
	private static async cleanupOldBackups(): Promise<void> {
		try {
			const backups = await this.listBackups();

			if (backups.length > this.MAX_BACKUPS) {
				const toDelete = backups.slice(this.MAX_BACKUPS);

				for (const backup of toDelete) {
					await this.deleteBackup(backup.id);
				}
			}
		} catch (error) {
			console.error('Failed to cleanup old backups:', error);
		}
	}

	/**
	 * Generate checksum for data integrity
	 */
	private static async generateChecksum(data: string): Promise<string> {
		const encoder = new TextEncoder();
		const dataBuffer = encoder.encode(data);
		const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		return hashArray.map((b: any) => b.toString(16).padStart(2, '0')).join('');
	}

	/**
	 * Get device information
	 */
	private static async getDeviceInfo(): Promise<any> {
		if (Capacitor.isNativePlatform()) {
			const { Device } = await import('@capacitor/device');
			return await Device.getInfo();
		}

		return {
			platform: 'web',
			model: navigator.userAgent,
			operatingSystem: 'web',
			manufacturer: 'Unknown',
		};
	}

	/**
	 * Test Google Drive connection
	 */
	static async testConnection(): Promise<{ success: boolean; error?: string }> {
		if (!this.isInitialized) {
			return { success: false, error: 'Google Drive not initialized' };
		}

		try {
			await GoogleDriveAPI.getAbout();
			return { success: true };
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error ? error.message : 'Connection test failed',
			};
		}
	}

	private static async getUserInfo(): Promise<any> {
		if (!this.isInitialized) {
			throw new Error('Google Drive not initialized');
		}

		try {
			return await GoogleDriveAPI.getAbout();
		} catch (error) {
			console.error('Failed to get user info:', error);
			throw error;
		}
	}
}
