/**
 * Comprehensive Backup Automation System
 * Provides scheduled backups, Google Drive integration, encryption, and verification
 */

import {onCall, HttpsError} from 'firebase-functions/v2/https';
import {onSchedule} from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import { Storage } from '@google-cloud/storage';
import { google } from 'googleapis';
import * as crypto from 'crypto';
import * as zlib from 'zlib';
import { v4 as uuidv4 } from 'uuid';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

// Lazy initialization to prevent calling before admin.initializeApp()
const getDb = () => admin.firestore();
const storage = new Storage();
const bucket = storage.bucket(
	process.env.STORAGE_BACKUP_BUCKET || '2fa-studio-backups'
);

// Backup configuration constants
const BACKUP_CONFIG = {
	ENCRYPTION_ALGORITHM: 'aes-256-gcm',
	COMPRESSION_LEVEL: 6,
	CHUNK_SIZE: 1024 * 1024, // 1MB chunks for large backups
	MAX_BACKUP_SIZE: 100 * 1024 * 1024, // 100MB max
	RETENTION_POLICIES: {
		free: { days: 7, maxBackups: 3 },
		pro: { days: 30, maxBackups: 10 },
		premium: { days: 90, maxBackups: 25 },
		business: { days: 365, maxBackups: 100 }
	},
	FREQUENCY_OPTIONS: ['hourly', 'daily', 'weekly', 'monthly'],
	BACKUP_TYPES: ['full', 'incremental', 'differential'],
	COMPRESSION_THRESHOLD: 1024 // Compress files larger than 1KB
};

// Backup status enumeration
enum BackupStatus {
	PENDING = 'pending',
	IN_PROGRESS = 'in_progress',
	COMPLETED = 'completed',
	FAILED = 'failed',
	CORRUPTED = 'corrupted',
	EXPIRED = 'expired'
}

// Backup notification types
enum NotificationType {
	SUCCESS = 'success',
	FAILURE = 'failure',
	CORRUPTION = 'corruption',
	EXPIRATION = 'expiration',
	STORAGE_WARNING = 'storage_warning'
}

interface BackupMetadata {
	id: string;
	userId: string;
	type: 'full' | 'incremental' | 'differential';
	version: string;
	createdAt: admin.firestore.Timestamp;
	size: number;
	compressedSize?: number;
	accountCount: number;
	checksum: string;
	encrypted: boolean;
	compressionRatio?: number;
	status: BackupStatus;
	errorMessage?: string;
	googleDriveFileId?: string;
	parentBackupId?: string; // For incremental backups
	lastFullBackupId?: string; // For differential backups
	platform: 'web' | 'android' | 'ios' | 'extension';
	automatic: boolean;
	expiresAt?: admin.firestore.Timestamp;
	verificationStatus?: 'pending' | 'verified' | 'failed';
}

interface BackupData {
	version: string;
	createdAt: string;
	type: 'full' | 'incremental' | 'differential';
	platform: string;
	accounts: any[];
	settings?: any;
	lastSyncTimestamp?: string;
	changes?: any[]; // For incremental/differential backups
	parentBackupId?: string;
	checksum: string;
}

// ============================================================================
// ENCRYPTION AND COMPRESSION UTILITIES
// ============================================================================

/**
 * Encrypt backup data using AES-256-GCM
 */
async function encryptBackupData(data: string, password: string): Promise<{
	encryptedData: string;
	iv: string;
	authTag: string;
	salt: string;
}> {
	const salt = crypto.randomBytes(32);
	const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
	const iv = crypto.randomBytes(16);
	
	const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
	cipher.setAAD(Buffer.from('2fa-studio-backup'));
	
	let encryptedData = cipher.update(data, 'utf8', 'hex');
	encryptedData += cipher.final('hex');
	
	const authTag = cipher.getAuthTag();
	
	return {
		encryptedData,
		iv: iv.toString('hex'),
		authTag: authTag.toString('hex'),
		salt: salt.toString('hex')
	};
}

/**
 * Decrypt backup data
 */
async function decryptBackupData(
	encryptedData: string,
	password: string,
	iv: string,
	authTag: string,
	salt: string
): Promise<string> {
	const key = crypto.pbkdf2Sync(password, Buffer.from(salt, 'hex'), 100000, 32, 'sha256');
	
	const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
	decipher.setAuthTag(Buffer.from(authTag, 'hex'));
	decipher.setAAD(Buffer.from('2fa-studio-backup'));
	
	let decryptedData = decipher.update(encryptedData, 'hex', 'utf8');
	decryptedData += decipher.final('utf8');
	
	return decryptedData;
}

/**
 * Compress data using gzip
 */
async function compressData(data: string): Promise<Buffer> {
	if (Buffer.byteLength(data) < BACKUP_CONFIG.COMPRESSION_THRESHOLD) {
		return Buffer.from(data);
	}
	return await gzip(data, { level: BACKUP_CONFIG.COMPRESSION_LEVEL });
}

/**
 * Decompress data
 */
async function decompressData(compressedData: Buffer): Promise<string> {
	try {
		const decompressed = await gunzip(compressedData);
		return decompressed.toString();
	} catch {
		// Data might not be compressed
		return compressedData.toString();
	}
}

/**
 * Generate checksum for data integrity
 */
function generateChecksum(data: string): string {
	return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Verify data integrity using checksum
 */
function verifyChecksum(data: string, expectedChecksum: string): boolean {
	const actualChecksum = generateChecksum(data);
	return actualChecksum === expectedChecksum;
}

// ============================================================================
// GOOGLE DRIVE INTEGRATION
// ============================================================================

/**
 * Initialize Google Drive API client
 */
async function initializeDriveClient(userId: string): Promise<any> {
	// Get user's Google OAuth tokens from Firestore
	const userDoc = await getDb().collection('users').doc(userId).get();
	const userData = userDoc.data();
	
	if (!userData?.googleDrive?.accessToken) {
		throw new Error('Google Drive not connected');
	}
	
	const oauth2Client = new google.auth.OAuth2(
		process.env.GOOGLE_DRIVE_CLIENT_ID,
		process.env.GOOGLE_DRIVE_CLIENT_SECRET,
		process.env.GOOGLE_DRIVE_REDIRECT_URI
	);
	
	oauth2Client.setCredentials({
		access_token: userData.googleDrive.accessToken,
		refresh_token: userData.googleDrive.refreshToken
	});
	
	return google.drive({ version: 'v3', auth: oauth2Client });
}

/**
 * Upload backup to Google Drive
 */
async function uploadToGoogleDrive(
	userId: string,
	backupData: string,
	fileName: string
): Promise<string> {
	try {
		const drive = await initializeDriveClient(userId);
		
		// Create 2FA Studio folder if it doesn't exist
		const folderName = '2FA Studio Backups';
		let folderId = await findOrCreateFolder(drive, folderName);
		
		const fileMetadata = {
			name: fileName,
			parents: [folderId],
			description: `2FA Studio backup created on ${new Date().toISOString()}`
		};
		
		const media = {
			mimeType: 'application/json',
			body: backupData
		};
		
		const response = await drive.files.create({
			requestBody: fileMetadata,
			media: media,
			fields: 'id'
		});
		
		return response.data.id;
	} catch (error) {
		console.error('Google Drive upload failed:', error);
		throw error;
	}
}

/**
 * Find or create Google Drive folder
 */
async function findOrCreateFolder(drive: any, folderName: string): Promise<string> {
	// Search for existing folder
	const searchResponse = await drive.files.list({
		q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
		fields: 'files(id, name)'
	});
	
	if (searchResponse.data.files.length > 0) {
		return searchResponse.data.files[0].id;
	}
	
	// Create new folder
	const folderMetadata = {
		name: folderName,
		mimeType: 'application/vnd.google-apps.folder'
	};
	
	const createResponse = await drive.files.create({
		requestBody: folderMetadata,
		fields: 'id'
	});
	
	return createResponse.data.id;
}

/**
 * Download backup from Google Drive
 */
async function downloadFromGoogleDrive(userId: string, fileId: string): Promise<string> {
	const drive = await initializeDriveClient(userId);
	
	const response = await drive.files.get({
		fileId: fileId,
		alt: 'media'
	});
	
	return response.data;
}

// ============================================================================
// BACKUP NOTIFICATION SYSTEM
// ============================================================================

/**
 * Send backup notification to user
 */
async function sendBackupNotification(
	userId: string,
	type: NotificationType,
	message: string,
	metadata?: any
): Promise<void> {
	try {
		await getDb().collection('notifications').add({
			userId,
			type: 'backup',
			subtype: type,
			message,
			metadata,
			read: false,
			createdAt: admin.firestore.FieldValue.serverTimestamp(),
			expiresAt: admin.firestore.FieldValue.serverTimestamp()
		});
		
		// Log notification for analytics
		await getDb().collection('analytics_events').add({
			event: 'backup_notification_sent',
			userId,
			properties: {
				notificationType: type,
				message
			},
			timestamp: admin.firestore.FieldValue.serverTimestamp()
		});
	} catch (error) {
		console.error('Failed to send backup notification:', error);
	}
}

// ============================================================================
// SCHEDULED BACKUP FUNCTIONS
// ============================================================================

/**
 * Scheduled function to run automatic backups every hour
 */
export const scheduledBackupRunner = onSchedule(
	{
		schedule: 'every 1 hours',
		timeZone: 'UTC',
		memory: '1GiB',
		timeoutSeconds: 540
	},
	async () => {
		console.log('Starting scheduled backup run...');
		try {
			const result = await runScheduledBackups();
			console.log(`Scheduled backup run completed: ${result.processed} backups processed`);
		} catch (error) {
			console.error('Scheduled backup run failed:', error);
		}
	}
);

/**
 * Scheduled function to cleanup old backups daily
 */
export const scheduledBackupCleanup = onSchedule(
	{
		schedule: 'every 24 hours',
		timeZone: 'UTC',
		memory: '512MiB',
		timeoutSeconds: 300
	},
	async () => {
		console.log('Starting scheduled backup cleanup...');
		try {
			const result = await cleanupOldBackups();
			console.log(`Backup cleanup completed: ${result.deleted} backups deleted`);
		} catch (error) {
			console.error('Backup cleanup failed:', error);
		}
	}
);

/**
 * Schedule automatic backup for premium users
 */
export const scheduleAutoBackup = onCall(
	{
		cors: true,
		maxInstances: 10,
	},
	async (request) => {
		const data = request.data;
		const context = request.auth;
		
		if (!context) {
			throw new HttpsError(
				'unauthenticated',
				'User must be authenticated'
			);
		}

		const { enabled, frequency = 'daily' } = data ?? {};

		try {
			// Check if user has premium subscription
			const userDoc = await getDb()
				.collection('users')
				.doc(context.uid)
				.get();
			const userData = userDoc.data();

			if (!['premium', 'business'].includes(userData?.subscription?.tier)) {
				throw new HttpsError(
					'permission-denied',
					'Auto backup is only available for premium users'
				);
			}

			// Update backup settings
			await userDoc.ref.update({
				'settings.autoBackup': enabled,
				'settings.backupFrequency': frequency,
				'settings.lastBackupScheduleUpdate':
					admin.firestore.FieldValue.serverTimestamp(),
			});

			if (enabled) {
				// Schedule next backup
				await scheduleNextBackup(context.uid, frequency);
			}

			return { success: true };
		} catch (error) {
			console.error('Error scheduling backup:', error);
			throw new HttpsError(
				'internal',
				'Failed to schedule backup'
			);
		}
	}
);

/**
 * Create comprehensive backup with encryption and compression
 */
export const createAdvancedBackup = onCall(
	{
		cors: true,
		maxInstances: 10,
		memory: '1GiB',
		timeoutSeconds: 300
	},
	async (request) => {
		const data = request.data;
		const context = request.auth;
		
		if (!context) {
			throw new HttpsError(
				'unauthenticated',
				'User must be authenticated'
			);
		}

		const {
			type = 'full',
			encrypt = true,
			compress = true,
			includeSettings = true,
			uploadToGoogleDrive = false,
			platform = 'web',
			password,
			parentBackupId // For incremental/differential
		} = data ?? {};

		try {
			const userId = context.uid;
			const backupId = uuidv4();
			
			// Create backup metadata record
			const backupMetadata: Partial<BackupMetadata> = {
				id: backupId,
				userId,
				type,
				version: '2.0',
				status: BackupStatus.IN_PROGRESS,
				encrypted: encrypt,
				platform,
				automatic: false,
				parentBackupId,
				createdAt: admin.firestore.FieldValue.serverTimestamp() as any
			};
			
			await getDb().collection('backups').doc(backupId).set(backupMetadata);
			
			// Create the backup
			const backupResult = await createComprehensiveBackup(
				userId,
				type,
				backupId,
				{
					encrypt,
					compress,
					includeSettings,
					uploadToGoogleDrive,
					platform,
					password,
					parentBackupId
				}
			);
			
			// Update backup metadata with results
			await getDb().collection('backups').doc(backupId).update({
				...backupResult,
				status: BackupStatus.COMPLETED,
				completedAt: admin.firestore.FieldValue.serverTimestamp()
			});
			
			// Send success notification
			await sendBackupNotification(
				userId,
				NotificationType.SUCCESS,
				`Backup completed successfully (${backupResult.accountCount} accounts)`,
				{ backupId, type, size: backupResult.size }
			);
			
			return {
				success: true,
				backupId,
				...backupResult
			};
			
		} catch (error) {
			console.error('Advanced backup creation failed:', error);
			
			// Update backup status to failed
			if (data?.backupId) {
				await getDb().collection('backups').doc(data.backupId).update({
					status: BackupStatus.FAILED,
					errorMessage: error.message,
					failedAt: admin.firestore.FieldValue.serverTimestamp()
				});
			}
			
			// Send failure notification
			await sendBackupNotification(
				context.uid,
				NotificationType.FAILURE,
				`Backup failed: ${error.message}`,
				{ error: error.message }
			);
			
			throw new HttpsError(
				'internal',
				`Failed to create backup: ${error.message}`
			);
		}
	}
);

/**
 * Restore backup with conflict resolution
 */
export const restoreAdvancedBackup = onCall(
	{
		cors: true,
		maxInstances: 10,
		memory: '1GiB',
		timeoutSeconds: 300
	},
	async (request) => {
		const data = request.data;
		const context = request.auth;
		
		if (!context) {
			throw new HttpsError(
				'unauthenticated',
				'User must be authenticated'
			);
		}

		const {
			backupId,
			password,
			conflictResolution = 'merge', // 'merge', 'replace', 'keep_both'
			restoreSettings = true,
			sourceType = 'firebase' // 'firebase', 'google_drive', 'local'
		} = data ?? {};

		if (!backupId) {
			throw new HttpsError(
				'invalid-argument',
				'Backup ID required'
			);
		}

		try {
			const userId = context.uid;
			
			// Get backup metadata
			const backupDoc = await getDb().collection('backups').doc(backupId).get();
			
			if (!backupDoc.exists) {
				throw new HttpsError('not-found', 'Backup not found');
			}
			
			const backup = backupDoc.data() as BackupMetadata;
			
			// Check if backup belongs to user
			if (backup.userId !== userId) {
				throw new HttpsError(
					'permission-denied',
					'Access denied'
				);
			}
			
			// Verify backup integrity first
			const verificationResult = await verifyBackupIntegrity(backupId);
			if (!verificationResult.valid) {
				throw new HttpsError(
					'failed-precondition',
					`Backup integrity check failed: ${verificationResult.reason}`
				);
			}
			
			// Restore the backup
			const restoreResult = await restoreComprehensiveBackup(
				userId,
				backup,
				{
					password,
					conflictResolution,
					restoreSettings,
					sourceType
				}
			);
			
			// Log restore activity
			await getDb().collection('audit_logs').add({
				action: 'backup_restored',
				userId,
				backupId,
				metadata: {
					conflictResolution,
					restoreSettings,
					sourceType,
					...restoreResult
				},
				timestamp: admin.firestore.FieldValue.serverTimestamp()
			});
			
			// Send success notification
			await sendBackupNotification(
				userId,
				NotificationType.SUCCESS,
				`Backup restored successfully (${restoreResult.accountsRestored} accounts)`,
				{ backupId, ...restoreResult }
			);
			
			return {
				success: true,
				...restoreResult
			};
			
		} catch (error) {
			console.error('Advanced backup restoration failed:', error);
			
			// Send failure notification
			await sendBackupNotification(
				context.uid,
				NotificationType.FAILURE,
				`Backup restoration failed: ${error.message}`,
				{ backupId, error: error.message }
			);
			
			throw new HttpsError(
				'internal',
				`Failed to restore backup: ${error.message}`
			);
		}
	}
);

/**
 * Get comprehensive backup history with filtering and pagination
 */
export const getBackupHistory = onCall(
	{
		cors: true,
		maxInstances: 10
	},
	async (request) => {
		const data = request.data;
		const context = request.auth;
		
		if (!context) {
			throw new HttpsError(
				'unauthenticated',
				'User must be authenticated'
			);
		}

		const {
			limit = 20,
			offset = 0,
			filter = {},
			sortBy = 'createdAt',
			sortOrder = 'desc'
		} = data ?? {};

		try {
			const userId = context.uid;
			
			// Build query
			let query = getDb()
				.collection('backups')
				.where('userId', '==', userId);
			
			// Apply filters
			if (filter.type) {
				query = query.where('type', '==', filter.type);
			}
			
			if (filter.status) {
				query = query.where('status', '==', filter.status);
			}
			
			if (filter.platform) {
				query = query.where('platform', '==', filter.platform);
			}
			
			if (filter.automatic !== undefined) {
				query = query.where('automatic', '==', filter.automatic);
			}
			
			// Apply sorting
			query = query.orderBy(sortBy, sortOrder as any);
			
			// Apply pagination
			query = query.limit(limit).offset(offset);
			
			// Execute query
			const snapshot = await query.get();
			
			const backups = snapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data()
			}));
			
			// Get total count for pagination
			const totalQuery = getDb()
				.collection('backups')
				.where('userId', '==', userId);
				
			const totalSnapshot = await totalQuery.get();
			const totalCount = totalSnapshot.size;
			
			return {
				backups,
				totalCount,
				hasMore: offset + limit < totalCount,
				nextOffset: offset + limit
			};
			
		} catch (error) {
			console.error('Failed to get backup history:', error);
			throw new HttpsError(
				'internal',
				'Failed to retrieve backup history'
			);
		}
	}
);

/**
 * Verify backup integrity
 */
async function verifyBackupIntegrity(backupId: string): Promise<{
	valid: boolean;
	reason?: string;
	metadata?: any;
}> {
	try {
		const backupDoc = await getDb().collection('backups').doc(backupId).get();
		
		if (!backupDoc.exists) {
			return { valid: false, reason: 'Backup not found' };
		}
		
		const backup = backupDoc.data() as BackupMetadata;
		
		// Check if backup file exists in storage
		const fileName = `backup_${backupId}.json`;
		const file = bucket.file(`users/${backup.userId}/${fileName}`);
		const [exists] = await file.exists();
		
		if (!exists) {
			return { valid: false, reason: 'Backup file not found in storage' };
		}
		
		// Get file metadata
		const [metadata] = await file.getMetadata();
		
		// Verify file size matches backup metadata
		if (backup.compressedSize && metadata.size !== backup.compressedSize) {
			return { valid: false, reason: 'File size mismatch' };
		}
		
		// Download and verify checksum
		const [fileContent] = await file.download();
		let backupData = fileContent.toString();
		
		// Decompress if necessary
		if (backup.compressedSize && backup.compressedSize < backup.size) {
			backupData = await decompressData(fileContent);
		}
		
		// Verify checksum
		const actualChecksum = generateChecksum(backupData);
		if (actualChecksum !== backup.checksum) {
			return { valid: false, reason: 'Checksum mismatch - backup may be corrupted' };
		}
		
		// Try to parse backup data
		try {
			const parsedData = JSON.parse(backupData);
			if (!parsedData.accounts || !Array.isArray(parsedData.accounts)) {
				return { valid: false, reason: 'Invalid backup data structure' };
			}
		} catch {
			return { valid: false, reason: 'Backup data is not valid JSON' };
		}
		
		return {
			valid: true,
			metadata: {
				size: metadata.size,
				created: metadata.timeCreated,
				md5Hash: metadata.md5Hash,
				checksum: backup.checksum
			}
		};
		
	} catch (error) {
		console.error('Backup verification failed:', error);
		return { valid: false, reason: `Verification failed: ${error.message}` };
	}
}

// ============================================================================
// CORE BACKUP CREATION AND RESTORATION FUNCTIONS
// ============================================================================

/**
 * Create comprehensive backup with all features
 */
async function createComprehensiveBackup(
	userId: string,
	type: 'full' | 'incremental' | 'differential',
	backupId: string,
	options: {
		encrypt?: boolean;
		compress?: boolean;
		includeSettings?: boolean;
		uploadToGoogleDrive?: boolean;
		platform?: string;
		password?: string;
		parentBackupId?: string;
	}
): Promise<{
	size: number;
	compressedSize?: number;
	accountCount: number;
	checksum: string;
	googleDriveFileId?: string;
	compressionRatio?: number;
}> {
	const {
		encrypt = true,
		compress = true,
		includeSettings = true,
		uploadToGoogleDrive = false,
		platform = 'web',
		password,
		parentBackupId
	} = options;

	// Get user's accounts
	const accountsSnapshot = await getDb()
		.collection('accounts')
		.where('userId', '==', userId)
		.get();

	if (accountsSnapshot.empty && type === 'full') {
		throw new Error('No accounts to backup');
	}

	let accounts = accountsSnapshot.docs.map(doc => ({
		id: doc.id,
		...doc.data()
	}));

	// Handle incremental and differential backups
	if (type === 'incremental' && parentBackupId) {
		// Get changes since parent backup
		accounts = await getChangedAccountsSince(userId, parentBackupId);
	} else if (type === 'differential' && parentBackupId) {
		// Get changes since last full backup
		const lastFullBackup = await getLastFullBackup(userId);
		if (lastFullBackup) {
			accounts = await getChangedAccountsSince(userId, lastFullBackup.id);
		}
	}

	// Prepare backup data
	const backupData: BackupData = {
		version: '2.0',
		createdAt: new Date().toISOString(),
		type,
		platform,
		accounts,
		checksum: '' // Will be set after data is prepared
	};

	// Include settings if requested
	if (includeSettings) {
		const userDoc = await getDb().collection('users').doc(userId).get();
		if (userDoc.exists) {
			backupData.settings = userDoc.data()?.settings || {};
		}
	}

	// Add metadata for incremental/differential backups
	if (type !== 'full') {
		backupData.parentBackupId = parentBackupId;
		if (type === 'differential') {
			const lastFullBackup = await getLastFullBackup(userId);
			backupData.lastSyncTimestamp = lastFullBackup?.createdAt?.toDate?.()?.toISOString();
		}
	}

	// Convert to string and generate checksum
	let backupDataString = JSON.stringify(backupData, null, 2);
	const checksum = generateChecksum(backupDataString);
	
	// Update checksum in data
	backupData.checksum = checksum;
	backupDataString = JSON.stringify(backupData, null, 2);
	
	const originalSize = Buffer.byteLength(backupDataString);
	let finalDataBuffer = Buffer.from(backupDataString);
	let compressedSize: number | undefined;
	let compressionRatio: number | undefined;

	// Compress data if requested
	if (compress) {
		const compressedBuffer = await compressData(backupDataString);
		if (compressedBuffer.length < originalSize) {
			finalDataBuffer = compressedBuffer;
			compressedSize = compressedBuffer.length;
			compressionRatio = (1 - compressedSize / originalSize) * 100;
		}
	}

	// Encrypt data if requested
	let encryptionMetadata: any = null;
	if (encrypt && password) {
		const encryptionResult = await encryptBackupData(
			finalDataBuffer.toString('base64'),
			password
		);
		
		// Store encryption metadata separately in backup record
		encryptionMetadata = {
			iv: encryptionResult.iv,
			authTag: encryptionResult.authTag,
			salt: encryptionResult.salt
		};
		
		finalDataBuffer = Buffer.from(encryptionResult.encryptedData, 'hex');
	}

	// Save to Firebase Storage
	const fileName = `backup_${backupId}.json`;
	const file = bucket.file(`users/${userId}/${fileName}`);
	
	await file.save(finalDataBuffer, {
		metadata: {
			contentType: 'application/json',
			metadata: {
				userId,
				backupId,
				type,
				platform,
				accountCount: accounts.length.toString(),
				encrypted: encrypt.toString(),
				compressed: compress.toString(),
				originalSize: originalSize.toString(),
				...(encryptionMetadata && { encryption: JSON.stringify(encryptionMetadata) })
			}
		}
	});

	// Upload to Google Drive if requested
	let googleDriveFileId: string | undefined;
	if (uploadToGoogleDrive) {
		try {
			googleDriveFileId = await uploadToGoogleDrive(
				userId,
				finalDataBuffer.toString('base64'),
				`2FA_Studio_Backup_${new Date().toISOString().split('T')[0]}_${backupId}.json`
			);
		} catch (error) {
			console.warn('Google Drive upload failed:', error);
			// Don't fail the entire backup if Google Drive fails
		}
	}

	return {
		size: originalSize,
		compressedSize,
		accountCount: accounts.length,
		checksum,
		googleDriveFileId,
		compressionRatio
	};
}

/**
 * Restore comprehensive backup with conflict resolution
 */
async function restoreComprehensiveBackup(
	userId: string,
	backup: BackupMetadata,
	options: {
		password?: string;
		conflictResolution?: 'merge' | 'replace' | 'keep_both';
		restoreSettings?: boolean;
		sourceType?: 'firebase' | 'google_drive' | 'local';
	}
): Promise<{
	accountsRestored: number;
	accountsSkipped: number;
	accountsConflicted: number;
	settingsRestored: boolean;
	conflicts: any[];
}> {
	const {
		password,
		conflictResolution = 'merge',
		restoreSettings = true,
		sourceType = 'firebase'
	} = options;

	// Download backup data
	let backupDataString: string;
	
	if (sourceType === 'google_drive' && backup.googleDriveFileId) {
		backupDataString = await downloadFromGoogleDrive(userId, backup.googleDriveFileId);
	} else {
		// Download from Firebase Storage
		const fileName = `backup_${backup.id}.json`;
		const file = bucket.file(`users/${userId}/${fileName}`);
		const [fileContent] = await file.download();
		
		let dataBuffer = fileContent;
		
		// Decrypt if necessary
		if (backup.encrypted && password) {
			const [metadata] = await file.getMetadata();
			const encryptionMeta = JSON.parse(metadata.metadata?.encryption || '{}');
			
			const decryptedData = await decryptBackupData(
				dataBuffer.toString('hex'),
				password,
				encryptionMeta.iv,
				encryptionMeta.authTag,
				encryptionMeta.salt
			);
			
			dataBuffer = Buffer.from(decryptedData, 'base64');
		}
		
		// Decompress if necessary
		if (backup.compressedSize && backup.compressedSize < backup.size) {
			backupDataString = await decompressData(dataBuffer);
		} else {
			backupDataString = dataBuffer.toString();
		}
	}

	// Parse backup data
	const backupData: BackupData = JSON.parse(backupDataString);
	
	// Verify checksum
	if (!verifyChecksum(backupDataString, backupData.checksum)) {
		throw new Error('Backup data integrity check failed');
	}

	// Get current accounts for conflict resolution
	const currentAccountsSnapshot = await getDb()
		.collection('accounts')
		.where('userId', '==', userId)
		.get();
	
	const currentAccounts = new Map();
	currentAccountsSnapshot.forEach(doc => {
		const data = doc.data();
		currentAccounts.set(data.issuer + ':' + data.label, {
			id: doc.id,
			...data
		});
	});

	// Process accounts restoration
	const conflicts: any[] = [];
	let accountsRestored = 0;
	let accountsSkipped = 0;
	let accountsConflicted = 0;

	const batch = getDb().batch();

	for (const account of backupData.accounts) {
		const accountKey = account.issuer + ':' + account.label;
		const existingAccount = currentAccounts.get(accountKey);

		if (existingAccount) {
			// Handle conflict
			accountsConflicted++;
			
			const conflict = {
				key: accountKey,
				existing: existingAccount,
				backup: account,
				resolution: conflictResolution
			};
			conflicts.push(conflict);

			switch (conflictResolution) {
				case 'replace':
					// Replace existing account
					batch.update(
						getDb().collection('accounts').doc(existingAccount.id),
						{
							...account,
							userId, // Ensure userId is preserved
							restoredAt: admin.firestore.FieldValue.serverTimestamp(),
							restoredFrom: backup.id
						}
					);
					accountsRestored++;
					break;
					
				case 'keep_both':
					// Create new account with modified label
					const newAccount = {
						...account,
						userId,
						label: `${account.label} (Restored)`,
						restoredAt: admin.firestore.FieldValue.serverTimestamp(),
						restoredFrom: backup.id
					};
					delete newAccount.id; // Remove old ID
					batch.set(getDb().collection('accounts').doc(), newAccount);
					accountsRestored++;
					break;
					
				case 'merge':
				default:
					// Merge accounts (prefer backup data for most fields, keep local timestamps)
					const mergedAccount = {
						...existingAccount,
						...account,
						userId, // Ensure userId is preserved
						createdAt: existingAccount.createdAt, // Keep original creation time
						updatedAt: admin.firestore.FieldValue.serverTimestamp(),
						restoredAt: admin.firestore.FieldValue.serverTimestamp(),
						restoredFrom: backup.id
					};
					delete mergedAccount.id; // Remove ID from data
					batch.update(
						getDb().collection('accounts').doc(existingAccount.id),
						mergedAccount
					);
					accountsRestored++;
					break;
			}
		} else {
			// New account, restore directly
			const newAccount = {
				...account,
				userId, // Ensure userId is set
				restoredAt: admin.firestore.FieldValue.serverTimestamp(),
				restoredFrom: backup.id
			};
			delete newAccount.id; // Remove old ID
			batch.set(getDb().collection('accounts').doc(), newAccount);
			accountsRestored++;
		}
	}

	// Commit account changes
	await batch.commit();

	// Restore settings if requested
	let settingsRestored = false;
	if (restoreSettings && backupData.settings) {
		try {
			await getDb().collection('users').doc(userId).update({
				'settings': {
					...backupData.settings,
					restoredAt: admin.firestore.FieldValue.serverTimestamp(),
					restoredFrom: backup.id
				}
			});
			settingsRestored = true;
		} catch (error) {
			console.warn('Failed to restore settings:', error);
		}
	}

	return {
		accountsRestored,
		accountsSkipped,
		accountsConflicted,
		settingsRestored,
		conflicts
	};
}

/**
 * Get accounts that changed since a specific backup
 */
async function getChangedAccountsSince(userId: string, sinceBackupId: string): Promise<any[]> {
	// Get the timestamp of the reference backup
	const backupDoc = await getDb().collection('backups').doc(sinceBackupId).get();
	if (!backupDoc.exists) {
		throw new Error('Reference backup not found');
	}
	
	const sinceTimestamp = backupDoc.data()?.createdAt;
	if (!sinceTimestamp) {
		throw new Error('Invalid reference backup timestamp');
	}

	// Get accounts modified since that timestamp
	const accountsSnapshot = await getDb()
		.collection('accounts')
		.where('userId', '==', userId)
		.where('updatedAt', '>', sinceTimestamp)
		.get();

	return accountsSnapshot.docs.map(doc => ({
		id: doc.id,
		...doc.data()
	}));
}

/**
 * Get the last full backup for a user
 */
async function getLastFullBackup(userId: string): Promise<any | null> {
	const snapshot = await getDb()
		.collection('backups')
		.where('userId', '==', userId)
		.where('type', '==', 'full')
		.where('status', '==', BackupStatus.COMPLETED)
		.orderBy('createdAt', 'desc')
		.limit(1)
		.get();

	if (snapshot.empty) {
		return null;
	}

	return {
		id: snapshot.docs[0].id,
		...snapshot.docs[0].data()
	};
}

/**
 * Cleanup old backups
 */
export async function cleanupOldBackups() {
	try {
		// Get all users
		const usersSnapshot = await getDb().collection('users').get();
		let totalDeleted = 0;
		let totalErrored = 0;

		for (const userDoc of usersSnapshot.docs) {
			const userData = userDoc.data();
			const tier = userData.subscription?.tier || 'free';

			// Get retention policy for user tier
			const retentionPolicy = BACKUP_CONFIG.RETENTION_POLICIES[tier as keyof typeof BACKUP_CONFIG.RETENTION_POLICIES] || BACKUP_CONFIG.RETENTION_POLICIES.free;
			
			const cutoffDate = new Date();
			cutoffDate.setDate(cutoffDate.getDate() - retentionPolicy.days);

			// Get all user backups
			const allBackupsSnapshot = await getDb()
				.collection('backups')
				.where('userId', '==', userDoc.id)
				.orderBy('createdAt', 'desc')
				.get();

			const backups = allBackupsSnapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data()
			}));

			// Apply cleanup rules:
			// 1. Keep all backups within retention period
			// 2. Beyond retention period, keep max allowed backups
			// 3. Always keep at least one successful backup
			const backupsToDelete: any[] = [];
			const recentBackups = backups.filter(b => new Date(b.createdAt.toDate()) > cutoffDate);
			const oldBackups = backups.filter(b => new Date(b.createdAt.toDate()) <= cutoffDate);

			// Keep successful backups up to max limit
			const successfulOldBackups = oldBackups
				.filter(b => b.status === BackupStatus.COMPLETED)
				.slice(retentionPolicy.maxBackups);

			// Always delete failed backups beyond retention period
			const failedOldBackups = oldBackups.filter(b => b.status !== BackupStatus.COMPLETED);

			backupsToDelete.push(...successfulOldBackups, ...failedOldBackups);

			// Ensure we keep at least one successful backup
			const allSuccessfulBackups = backups.filter(b => b.status === BackupStatus.COMPLETED);
			if (allSuccessfulBackups.length === 1 && backupsToDelete.includes(allSuccessfulBackups[0])) {
				// Remove the last successful backup from deletion list
				const index = backupsToDelete.indexOf(allSuccessfulBackups[0]);
				backupsToDelete.splice(index, 1);
			}

			if (backupsToDelete.length > 0) {
				const batch = getDb().batch();
				const filesToDelete: string[] = [];
				const googleDriveFilesToDelete: string[] = [];

				for (const backup of backupsToDelete) {
					// Delete Firestore document
					batch.delete(getDb().collection('backups').doc(backup.id));
					
					// Queue storage file for deletion
					const fileName = `backup_${backup.id}.json`;
					filesToDelete.push(`users/${userDoc.id}/${fileName}`);
					
					// Queue Google Drive file for deletion if exists
					if (backup.googleDriveFileId) {
						googleDriveFilesToDelete.push(backup.googleDriveFileId);
					}
				}

				// Commit Firestore deletions
				await batch.commit();

				// Delete storage files
				for (const filePath of filesToDelete) {
					try {
						await bucket.file(filePath).delete();
					} catch (deleteError) {
						console.error(`Failed to delete storage file: ${filePath}`, deleteError);
						totalErrored++;
					}
				}

				// Delete Google Drive files
				for (const fileId of googleDriveFilesToDelete) {
					try {
						const drive = await initializeDriveClient(userDoc.id);
						await drive.files.delete({ fileId });
					} catch (deleteError) {
						console.error(`Failed to delete Google Drive file: ${fileId}`, deleteError);
						// Don't count as error since Google Drive might be disconnected
					}
				}

				totalDeleted += backupsToDelete.length;

				// Send cleanup notification to user
				await sendBackupNotification(
					userDoc.id,
					NotificationType.SUCCESS,
					`Cleaned up ${backupsToDelete.length} old backups`,
					{ deleted: backupsToDelete.length, tier, retentionDays: retentionPolicy.days }
				);
			}
		}

		console.log(`Backup cleanup completed: ${totalDeleted} deleted, ${totalErrored} errors`);
		return { 
			deleted: totalDeleted, 
			errored: totalErrored,
			success: totalErrored === 0
		};
	} catch (error) {
		console.error('Error cleaning up backups:', error);
		throw error;
	}
}

/**
 * Export user data (GDPR compliance)
 */
export const exportUserData = onCall(
	{
		cors: true,
		maxInstances: 10,
	},
	async (request) => {
		const context = request.auth;
		
		if (!context) {
			throw new HttpsError(
				'unauthenticated',
				'User must be authenticated'
			);
		}

		try {
			const userId = context.uid;
			const exportData: unknown = {
				exportedAt: new Date().toISOString(),
				userId,
			};

			// Get user data
			const userDoc = await getDb().collection('users').doc(userId).get();
			if (userDoc.exists) {
				(exportData as any).user = userDoc.data();
			}

			// Get accounts
			const accountsSnapshot = await getDb()
				.collection('accounts')
				.where('userId', '==', userId)
				.get();

			(exportData as any).accounts = [];
			accountsSnapshot.forEach((doc) => {
				(exportData as any).accounts.push({
					id: doc.id,
					...doc.data(),
				});
			});

			// Get backups metadata
			const backupsSnapshot = await getDb()
				.collection('backups')
				.where('userId', '==', userId)
				.orderBy('createdAt', 'desc')
				.limit(10)
				.get();

			(exportData as any).backups = [];
			backupsSnapshot.forEach((doc) => {
				const backup = doc.data();
				// Don't include actual backup data, just metadata
				(exportData as any).backups.push({
					id: doc.id,
					createdAt: backup.createdAt,
					size: backup.size,
					accountCount: backup.accountCount,
				});
			});

			// Create export file
			const fileName = `export_${userId}_${Date.now()}.json`;
			const file = bucket.file(`exports/${fileName}`);

			await file.save(JSON.stringify(exportData, null, 2), {
				metadata: {
					contentType: 'application/json',
				},
			});

			// Get signed URL (valid for 7 days)
			const [url] = await file.getSignedUrl({
				version: 'v4',
				action: 'read',
				expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
			});

			// Log export
			await getDb().collection('audit_logs').add({
				action: 'data_exported',
				userId,
				fileName,
				timestamp: admin.firestore.FieldValue.serverTimestamp(),
			});

			return { downloadUrl: url, expiresIn: '7 days' };
		} catch (error) {
			console.error('Error exporting user data:', error);
			throw new HttpsError(
				'internal',
				'Failed to export user data'
			);
		}
	}
);

/**
 * Validate backup integrity
 */
export const validateBackup = onCall(
	{
		cors: true,
		maxInstances: 10,
	},
	async (request) => {
		const data = request.data;
		const context = request.auth;
		
		if (!context) {
			throw new HttpsError(
				'unauthenticated',
				'User must be authenticated'
			);
		}

		const { backupId } = data ?? {};

		if (!backupId) {
			throw new HttpsError(
				'invalid-argument',
				'Backup ID required'
			);
		}

		try {
			// Get backup metadata
			const backupDoc = await getDb().collection('backups').doc(backupId).get();

			if (!backupDoc.exists) {
				throw new HttpsError('not-found', 'Backup not found');
			}

			const backup = backupDoc.data();

			// Check if backup belongs to user
			if (backup?.userId !== context.uid) {
				throw new HttpsError(
					'permission-denied',
					'Access denied'
				);
			}

			// Validate backup file exists
			const fileName = backup.storageUrl?.split('/').pop();
			if (!fileName) {
				return { valid: false, reason: 'Missing storage URL' };
			}

			const file = bucket.file(`users/${context.uid}/${fileName}`);
			const [exists] = await file.exists();

			if (!exists) {
				return { valid: false, reason: 'Backup file not found' };
			}

			// Check file metadata
			const [metadata] = await file.getMetadata();

			if (metadata.size !== backup.size) {
				return { valid: false, reason: 'File size mismatch' };
			}

			// TODO: Add checksum validation

			return {
				valid: true,
				metadata: {
					size: metadata.size,
					created: metadata.timeCreated,
					md5Hash: metadata.md5Hash,
				},
			};
		} catch (error) {
			console.error('Error validating backup:', error);
			throw new HttpsError(
				'internal',
				'Failed to validate backup'
			);
		}
	}
);

/**
 * Run scheduled backups
 */
export async function runScheduledBackups() {
	try {
		// Get users with auto backup enabled
		const usersSnapshot = await getDb()
			.collection('users')
			.where('settings.autoBackup', '==', true)
			.get();

		let processed = 0;

		for (const userDoc of usersSnapshot.docs) {
			const userData = userDoc.data();
			const lastBackup = userData.lastBackup?.toDate();
			const frequency = userData.settings?.backupFrequency || 'daily';

			// Check if backup is due
			if (shouldRunBackup(lastBackup, frequency)) {
				try {
					await createAutomaticBackup(userDoc.id);
					processed++;
				} catch (backupError) {
					console.error(`Failed to backup for user ${userDoc.id}:`, backupError);
				}
			}
		}

		console.log(`Processed ${processed} scheduled backups`);
		return { processed };
	} catch (error) {
		console.error('Error running scheduled backups:', error);
		throw error;
	}
}

/**
 * Create automatic backup for user
 */
async function createAutomaticBackup(userId: string) {
	// Get user's accounts
	const accountsSnapshot = await getDb()
		.collection('accounts')
		.where('userId', '==', userId)
		.get();

	if (accountsSnapshot.empty) {
		console.log(`No accounts to backup for user ${userId}`);
		return;
	}

	// Prepare backup data
	const backupData = {
		version: '1.0',
		createdAt: new Date().toISOString(),
		accounts: accountsSnapshot.docs.map((doc) => ({
			id: doc.id,
			...doc.data(),
		})),
	};

	// Create backup file
	const fileName = `backup_${Date.now()}.json`;
	const file = bucket.file(`users/${userId}/${fileName}`);

	const dataString = JSON.stringify(backupData);
	await file.save(dataString, {
		metadata: {
			contentType: 'application/json',
			metadata: {
				userId,
				accountCount: accountsSnapshot.size.toString(),
				automatic: 'true',
			},
		},
	});

	// Save backup metadata
	await getDb().collection('backups').add({
		userId,
		fileName,
		storageUrl: file.name,
		size: Buffer.byteLength(dataString),
		accountCount: accountsSnapshot.size,
		automatic: true,
		createdAt: admin.firestore.FieldValue.serverTimestamp(),
	});

	// Update user's last backup time
	await getDb().collection('users').doc(userId).update({
		lastBackup: admin.firestore.FieldValue.serverTimestamp(),
	});

	console.log(`Created automatic backup for user ${userId}`);
}

/**
 * Check if backup should run based on frequency
 */
function shouldRunBackup(
	lastBackup: Date | undefined,
	frequency: string
): boolean {
	if (!lastBackup) return true;

	const now = new Date();
	const diff = now.getTime() - lastBackup.getTime();
	const hours = diff / (1000 * 60 * 60);

	switch (frequency) {
		case 'hourly':
			return hours >= 1;
		case 'daily':
			return hours >= 24;
		case 'weekly':
			return hours >= 168;
		case 'monthly':
			return hours >= 720;
		default:
			return hours >= 24; // Default to daily
	}
}

/**
 * Schedule next backup for user
 */
async function scheduleNextBackup(userId: string, frequency: string) {
	// In a real implementation, this would create a Cloud Task
	// For now, we rely on the scheduled function to check all users
	console.log(`Next backup scheduled for user ${userId} (${frequency})`);
}

// ============================================================================
// ADDITIONAL BACKUP MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Get backup statistics for user dashboard
 */
export const getBackupStatistics = onCall(
	{
		cors: true,
		maxInstances: 10
	},
	async (request) => {
		const context = request.auth;
		
		if (!context) {
			throw new HttpsError(
				'unauthenticated',
				'User must be authenticated'
			);
		}

		try {
			const userId = context.uid;
			
			// Get all user backups
			const backupsSnapshot = await getDb()
				.collection('backups')
				.where('userId', '==', userId)
				.get();

			const backups = backupsSnapshot.docs.map(doc => doc.data());
			
			// Calculate statistics
			const stats = {
				total: backups.length,
				successful: backups.filter(b => b.status === BackupStatus.COMPLETED).length,
				failed: backups.filter(b => b.status === BackupStatus.FAILED).length,
				inProgress: backups.filter(b => b.status === BackupStatus.IN_PROGRESS).length,
				totalSize: backups.reduce((sum, b) => sum + (b.size || 0), 0),
				totalCompressedSize: backups.reduce((sum, b) => sum + (b.compressedSize || b.size || 0), 0),
				averageCompressionRatio: 0,
				lastBackup: null as any,
				nextScheduledBackup: null as any,
				storageBreakdown: {
					firebase: backups.filter(b => !b.googleDriveFileId).length,
					googleDrive: backups.filter(b => b.googleDriveFileId).length
				},
				typeBreakdown: {
					full: backups.filter(b => b.type === 'full').length,
					incremental: backups.filter(b => b.type === 'incremental').length,
					differential: backups.filter(b => b.type === 'differential').length
				},
				platformBreakdown: {
					web: backups.filter(b => b.platform === 'web').length,
					android: backups.filter(b => b.platform === 'android').length,
					ios: backups.filter(b => b.platform === 'ios').length,
					extension: backups.filter(b => b.platform === 'extension').length
				}
			};

			// Calculate average compression ratio
			const compressedBackups = backups.filter(b => b.compressionRatio);
			if (compressedBackups.length > 0) {
				stats.averageCompressionRatio = compressedBackups.reduce((sum, b) => sum + (b.compressionRatio || 0), 0) / compressedBackups.length;
			}

			// Get last backup
			const lastBackupSnapshot = await getDb()
				.collection('backups')
				.where('userId', '==', userId)
				.where('status', '==', BackupStatus.COMPLETED)
				.orderBy('createdAt', 'desc')
				.limit(1)
				.get();

			if (!lastBackupSnapshot.empty) {
				stats.lastBackup = {
					id: lastBackupSnapshot.docs[0].id,
					...lastBackupSnapshot.docs[0].data()
				};
			}

			// Get user settings for next scheduled backup
			const userDoc = await getDb().collection('users').doc(userId).get();
			const userData = userDoc.data();
			
			if (userData?.settings?.autoBackup && userData?.lastBackup) {
				const frequency = userData.settings.backupFrequency || 'daily';
				const lastBackup = userData.lastBackup.toDate();
				const nextBackup = new Date(lastBackup);
				
				switch (frequency) {
					case 'hourly':
						nextBackup.setHours(nextBackup.getHours() + 1);
						break;
					case 'daily':
						nextBackup.setDate(nextBackup.getDate() + 1);
						break;
					case 'weekly':
						nextBackup.setDate(nextBackup.getDate() + 7);
						break;
					case 'monthly':
						nextBackup.setMonth(nextBackup.getMonth() + 1);
						break;
				}
				
				stats.nextScheduledBackup = nextBackup.toISOString();
			}

			return stats;
			
		} catch (error) {
			console.error('Failed to get backup statistics:', error);
			throw new HttpsError(
				'internal',
				'Failed to retrieve backup statistics'
			);
		}
	}
);

/**
 * Trigger manual instant backup
 */
export const triggerInstantBackup = onCall(
	{
		cors: true,
		maxInstances: 10,
		memory: '1GiB',
		timeoutSeconds: 300
	},
	async (request) => {
		const data = request.data;
		const context = request.auth;
		
		if (!context) {
			throw new HttpsError(
				'unauthenticated',
				'User must be authenticated'
			);
		}

		const {
			type = 'full',
			encrypt = true,
			compress = true,
			uploadToGoogleDrive = false,
			platform = 'web'
		} = data ?? {};

		try {
			const userId = context.uid;

			// Check rate limiting (max 3 manual backups per hour)
			const oneHourAgo = new Date();
			oneHourAgo.setHours(oneHourAgo.getHours() - 1);
			
			const recentBackupsSnapshot = await getDb()
				.collection('backups')
				.where('userId', '==', userId)
				.where('automatic', '==', false)
				.where('createdAt', '>', oneHourAgo)
				.get();

			if (recentBackupsSnapshot.size >= 3) {
				throw new HttpsError(
					'resource-exhausted',
					'Manual backup rate limit exceeded. Please wait before creating another backup.'
				);
			}

			// Trigger the backup using the advanced backup function
			const backupRequest = {
				data: {
					type,
					encrypt,
					compress,
					includeSettings: true,
					uploadToGoogleDrive,
					platform,
					password: data.password
				},
				auth: context
			};

			return await createAdvancedBackup(backupRequest as any);
			
		} catch (error) {
			console.error('Instant backup failed:', error);
			throw error instanceof HttpsError ? error : new HttpsError(
				'internal',
				`Failed to create instant backup: ${error.message}`
			);
		}
	}
);

/**
 * Sync backup status across platforms
 */
export const syncBackupStatus = onCall(
	{
		cors: true,
		maxInstances: 10
	},
	async (request) => {
		const data = request.data;
		const context = request.auth;
		
		if (!context) {
			throw new HttpsError(
				'unauthenticated',
				'User must be authenticated'
			);
		}

		const {
			platform,
			lastSyncTimestamp,
			deviceId
		} = data ?? {};

		if (!platform || !deviceId) {
			throw new HttpsError(
				'invalid-argument',
				'Platform and device ID are required'
			);
		}

		try {
			const userId = context.uid;
			
			// Get backups created or updated since last sync
			let query = getDb()
				.collection('backups')
				.where('userId', '==', userId);

			if (lastSyncTimestamp) {
				const syncDate = new Date(lastSyncTimestamp);
				query = query.where('createdAt', '>', syncDate);
			}

			const backupsSnapshot = await query
				.orderBy('createdAt', 'desc')
				.limit(50)
				.get();

			const backups = backupsSnapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data()
			}));

			// Update device sync timestamp
			await getDb()
				.collection('users')
				.doc(userId)
				.collection('devices')
				.doc(deviceId)
				.set({
					lastSyncTimestamp: admin.firestore.FieldValue.serverTimestamp(),
					platform,
					lastSeen: admin.firestore.FieldValue.serverTimestamp()
				}, { merge: true });

			return {
				backups,
				syncTimestamp: new Date().toISOString(),
				hasMore: backupsSnapshot.size === 50
			};
			
		} catch (error) {
			console.error('Backup sync failed:', error);
			throw new HttpsError(
				'internal',
				'Failed to sync backup status'
			);
		}
	}
);

/**
 * Delete specific backup
 */
export const deleteBackup = onCall(
	{
		cors: true,
		maxInstances: 10
	},
	async (request) => {
		const data = request.data;
		const context = request.auth;
		
		if (!context) {
			throw new HttpsError(
				'unauthenticated',
				'User must be authenticated'
			);
		}

		const { backupId } = data ?? {};

		if (!backupId) {
			throw new HttpsError(
				'invalid-argument',
				'Backup ID is required'
			);
		}

		try {
			const userId = context.uid;
			
			// Get backup metadata
			const backupDoc = await getDb().collection('backups').doc(backupId).get();
			
			if (!backupDoc.exists) {
				throw new HttpsError('not-found', 'Backup not found');
			}
			
			const backup = backupDoc.data();
			
			// Check if backup belongs to user
			if (backup?.userId !== userId) {
				throw new HttpsError(
					'permission-denied',
					'Access denied'
				);
			}

			// Don't allow deletion of the last successful backup
			const successfulBackupsSnapshot = await getDb()
				.collection('backups')
				.where('userId', '==', userId)
				.where('status', '==', BackupStatus.COMPLETED)
				.get();

			if (successfulBackupsSnapshot.size === 1 && backup?.status === BackupStatus.COMPLETED) {
				throw new HttpsError(
					'failed-precondition',
					'Cannot delete the last successful backup. Create a new backup first.'
				);
			}

			// Delete from Firestore
			await backupDoc.ref.delete();

			// Delete from Firebase Storage
			const fileName = `backup_${backupId}.json`;
			try {
				await bucket.file(`users/${userId}/${fileName}`).delete();
			} catch (deleteError) {
				console.warn(`Failed to delete storage file: ${fileName}`, deleteError);
			}

			// Delete from Google Drive if exists
			if (backup?.googleDriveFileId) {
				try {
					const drive = await initializeDriveClient(userId);
					await drive.files.delete({ fileId: backup.googleDriveFileId });
				} catch (deleteError) {
					console.warn(`Failed to delete Google Drive file: ${backup.googleDriveFileId}`, deleteError);
				}
			}

			// Log deletion
			await getDb().collection('audit_logs').add({
				action: 'backup_deleted',
				userId,
				backupId,
				metadata: {
					size: backup?.size,
					accountCount: backup?.accountCount,
					type: backup?.type
				},
				timestamp: admin.firestore.FieldValue.serverTimestamp()
			});

			// Send notification
			await sendBackupNotification(
				userId,
				NotificationType.SUCCESS,
				'Backup deleted successfully',
				{ backupId, type: backup?.type }
			);

			return { success: true };
			
		} catch (error) {
			console.error('Backup deletion failed:', error);
			throw error instanceof HttpsError ? error : new HttpsError(
				'internal',
				`Failed to delete backup: ${error.message}`
			);
		}
	}
);