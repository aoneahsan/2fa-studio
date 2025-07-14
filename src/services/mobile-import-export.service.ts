/**
 * Mobile Import/Export Service
 * Handles import/export functionality for mobile platforms
 * @module services/mobile-import-export
 */

import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
// import { FilePicker } from '@capacitor/file-picker';
// import { Share } from '@capacitor/share'; // Not available on web
import { Encoding } from '@capacitor/filesystem';
import { OTPAccount } from './otp.service';
import { MobileEncryptionService } from './mobile-encryption.service';
import { Preferences } from '@capacitor/preferences';
import {
	ImportExportService,
	ExportFormat,
	ImportFormat,
} from './importExport.service';

export interface MobileExportOptions {
	format: ExportFormat;
	password?: string;
	shareImmediately?: boolean;
	saveToDevice?: boolean;
}

export interface MobileImportOptions {
	format?: ImportFormat;
	password?: string;
	detectFormat?: boolean;
}

export class MobileImportExportService extends ImportExportService {
	private static readonly EXPORT_DIR = 'exports';
	private static readonly BACKUP_DIR = 'backups';

	/**
	 * Initialize directories
	 */
	static async initialize(): Promise<void> {
		if (!Capacitor.isNativePlatform()) return;

		try {
			await Filesystem.mkdir({
				path: this.EXPORT_DIR,
				directory: Directory.Documents,
				recursive: true,
			});

			await Filesystem.mkdir({
				path: this.BACKUP_DIR,
				directory: Directory.Documents,
				recursive: true,
			});
		} catch (error) {
			// Directories might already exist
		}
	}

	/**
	 * Export accounts with mobile features
	 */
	static async mobileExport(
		accounts: OTPAccount[],
		options: MobileExportOptions
	): Promise<{ success: boolean; uri?: string; error?: string }> {
		try {
			// Generate export data
			const exportData = await this.exportAccounts(
				accounts,
				options.format,
				options.password
			);

			// Generate filename
			const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
			const extension = this.getFileExtension(options.format);
			const filename = `2fa-export-${timestamp}.${extension}`;

			if (options.shareImmediately) {
				// Share directly without saving
				if (Capacitor.isNativePlatform()) {
					// await Share.share({
					// 	title: 'Export 2FA Accounts',
					// 	text: `Exported ${accounts.length} accounts`,
					// 	dialogTitle: 'Share your 2FA export',
					// 	files: [`data:application/json;base64,${btoa(exportData)}`],
					// });
				} else {
					// Web fallback - download file
					this.downloadFile(exportData, filename);
				}
				return { success: true };
			}

			if (options.saveToDevice) {
				// Save to device storage
				const result = await this.saveToDevice(exportData, filename);
				return { success: true, uri: result.uri };
			}

			// Default: return data for further processing
			return {
				success: true,
				uri: `data:application/json;base64,${btoa(exportData)}`,
			};
		} catch (error) {
			console.error('Export failed:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Export failed',
			};
		}
	}

	/**
	 * Import accounts with mobile-specific handling
	 */
	static async mobileImport(
		options: MobileImportOptions = {}
	): Promise<{ success: boolean; accounts?: OTPAccount[]; error?: string }> {
		try {
			let fileContent: string;
			let detectedFormat: ImportFormat | undefined;

			if (Capacitor.isNativePlatform()) {
				// Use native file picker
				// const result = await FilePicker.pickFiles({
				// 	types: ['application/json', 'text/plain'],
				// 	// multiple: false, // Not available in type definition
				// });
				const result = { files: [] };

				if (!(result as any).files.length) {
					return { success: false, error: 'No file selected' };
				}

				const file = result.files[0];

				// Read file content
				if (file.data) {
					fileContent = file.data;
				} else {
					return { success: false, error: 'Could not read file content' };
				}

				// Detect format from filename
				if (options.detectFormat) {
					detectedFormat = this.detectFormatFromFilename(file.name || '');
				}
			} else {
				// Web file picker
				fileContent = await this.webFilePicker();
				if (!fileContent) {
					return { success: false, error: 'No file selected' };
				}
			}

			// Detect format from content if not already detected
			if (!detectedFormat && options.detectFormat) {
				detectedFormat = this.detectFormatFromContent(fileContent);
			}

			// Use detected format or fallback to specified format
			const format = detectedFormat || options.format || 'json';

			// Parse accounts
			const accounts = await super.importAccounts(fileContent, format);
			if (!accounts || accounts.length === 0) {
				return { success: false, error: 'No valid accounts found in file' };
			}

			return { success: true, accounts };
		} catch (error) {
			console.error('Mobile import error:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Import failed',
			};
		}
	}

	/**
	 * Create encrypted backup
	 */
	static async createBackup(
		accounts: OTPAccount[],
		password: string
	): Promise<{ success: boolean; uri?: string; error?: string }> {
		try {
			const backupData = {
				version: '2.0',
				created: new Date().toISOString(),
				device: await this.getDeviceInfo(),
				accountCount: accounts.length,
				accounts,
			};

			// Encrypt backup
			const encrypted = await MobileEncryptionService.encryptWithPassword(
				JSON.stringify(backupData),
				password
			);

			// Save backup
			const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
			const filename = `2fa-backup-${timestamp}.2fab`;

			const result = await Filesystem.writeFile({
				path: `${this.BACKUP_DIR}/${filename}`,
				data: encrypted,
				directory: Directory.Documents,
				encoding: Encoding.UTF8,
			});

			return { success: true, uri: result.uri };
		} catch (error) {
			console.error('Backup failed:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Backup failed',
			};
		}
	}

	/**
	 * Restore backup with mobile-specific handling
	 */
	static async restoreBackup(
		password: string
	): Promise<{ success: boolean; accounts?: OTPAccount[]; error?: string }> {
		try {
			if (Capacitor.isNativePlatform()) {
				// const result = await FilePicker.pickFiles({
				// 	types: ['application/json'],
				// 	// multiple: false // Not available in type definition
				// });
				const result = { files: [] };

				if (!(result as any).files.length) {
					return { success: false, error: 'No backup file selected' };
				}

				const file = result.files[0];
				const encryptedData = file.data;

				if (!encryptedData) {
					return { success: false, error: 'Could not read backup file' };
				}

				// Decrypt with password
				const decrypted = await MobileEncryptionService.decryptWithPassword(
					encryptedData,
					password
				);

				const backupData = JSON.parse(decrypted);
				const accounts = backupData.accounts;

				// Validate accounts
				if (!Array.isArray(accounts) || accounts.length === 0) {
					return { success: false, error: 'Invalid backup file format' };
				}

				return { success: true, accounts };
			} else {
				// Web implementation
				const fileContent = await this.webFilePicker();
				if (!fileContent) {
					return { success: false, error: 'No backup file selected' };
				}

				// Decrypt with password
				const decrypted = await MobileEncryptionService.decryptWithPassword(
					fileContent,
					password
				);

				const backupData = JSON.parse(decrypted);
				const accounts = backupData.accounts;

				return { success: true, accounts };
			}
		} catch (error) {
			console.error('Restore backup error:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Restore failed',
			};
		}
	}

	/**
	 * List available backups
	 */
	static async listBackups(): Promise<
		{
			filename: string;
			created: Date;
			size: number;
			uri: string;
		}[]
	> {
		if (!Capacitor.isNativePlatform()) {
			return [];
		}

		try {
			const files = await Filesystem.readdir({
				path: this.BACKUP_DIR,
				directory: Directory.Documents,
			});

			const backups = await Promise.all(
				files.files
					.filter((file: any) => file.name.endsWith('.2fab'))
					.map(async (file) => {
						const stat = await Filesystem.stat({
							path: `${this.BACKUP_DIR}/${file.name}`,
							directory: Directory.Documents,
						});

						return {
							filename: file.name,
							created: new Date(stat.mtime),
							size: stat.size,
							uri: stat.uri,
						};
					})
			);

			return backups.sort((a, b) => b.created.getTime() - a.created.getTime());
		} catch (error) {
			console.error('Failed to list backups:', error);
			return [];
		}
	}

	/**
	 * Delete old backups
	 */
	static async cleanupBackups(keepCount: number = 10): Promise<void> {
		const backups = await this.listBackups();

		if (backups.length <= keepCount) return;

		// Delete oldest backups
		const toDelete = backups.slice(keepCount);

		for (const backup of toDelete) {
			try {
				await Filesystem.deleteFile({
					path: `${this.BACKUP_DIR}/${backup.filename}`,
					directory: Directory.Documents,
				});
			} catch (error) {
				console.error(`Failed to delete backup ${backup.filename}:`, error);
			}
		}
	}

	/**
	 * Helper: Save to device storage
	 */
	private static async saveToDevice(
		data: string,
		filename: string
	): Promise<{ uri: string }> {
		if (!Capacitor.isNativePlatform()) {
			// Web fallback
			this.downloadFile(data, filename);
			return { uri: 'downloaded' };
		}

		return await Filesystem.writeFile({
			path: `${this.EXPORT_DIR}/${filename}`,
			data,
			directory: Directory.Documents,
			encoding: Encoding.UTF8,
		});
	}

	/**
	 * Helper: Get file extension for format
	 */
	private static getFileExtension(format: ExportFormat): string {
		const extensions: Record<ExportFormat, string> = {
			json: 'json',
			'2fas': '2fas',
			aegis: 'json',
			google_authenticator: 'txt',
			authy: 'txt',
			raivo: 'txt',
		};
		return extensions[format] || 'json';
	}

	/**
	 * Helper: Detect format from filename
	 */
	private static detectFormatFromFilename(
		filename: string
	): ImportFormat | undefined {
		const lower = filename.toLowerCase();

		if (lower.endsWith('.2fas')) return '2fas';
		if (lower.includes('aegis')) return 'aegis';
		if (lower.includes('google') || lower.includes('authenticator'))
			return 'google_authenticator';
		if (lower.includes('authy')) return 'authy';
		if (lower.includes('raivo')) return 'raivo';

		return undefined;
	}

	/**
	 * Helper: Detect format from content
	 */
	private static detectFormatFromContent(content: string): ImportFormat {
		try {
			const trimmed = content.trim();

			// Check for URI format
			if (trimmed.startsWith('otpauth://')) {
				return 'google_authenticator';
			}

			// Try to parse as JSON
			const parsed = JSON.parse(trimmed);

			// Check for specific format markers
			if (parsed.version && parsed.accounts) return '2fas';
			if (parsed.db?.entries) return 'aegis';

			return 'json';
		} catch {
			// Not JSON, check if it looks like URIs
			if (content.includes('otpauth://')) {
				return 'google_authenticator';
			}
			return 'json';
		}
	}

	/**
	 * Helper: Web file picker
	 */
	private static webFilePicker(): Promise<string> {
		return new Promise((resolve, reject) => {
			const input = document.createElement('input');
			input.type = 'file';
			input.accept = '.json,.txt,.2fas';

			input.onchange = async (_e) => {
				const file = (_e.target as HTMLInputElement).files?.[0];
				if (!file) {
					reject(new Error('No file selected'));
					return;
				}

				try {
					const content = await this.readFileAsText(file);
					resolve(content);
				} catch (error) {
					reject(error);
				}
			};

			input.click();
		});
	}

	/**
	 * Helper: Get device info
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
		};
	}
}
