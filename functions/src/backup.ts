/**
 * Backup Cloud Functions
 */

import {onCall, HttpsError} from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { Storage } from '@google-cloud/storage';

// Lazy initialization to prevent calling before admin.initializeApp()
const getDb = () => admin.firestore();
const storage = new Storage();
const bucket = storage.bucket(
	process.env.STORAGE_BACKUP_BUCKET || '2fa-studio-backups'
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
 * Cleanup old backups
 */
export async function cleanupOldBackups() {
	try {
		// Get all users
		const usersSnapshot = await getDb().collection('users').get();
		let totalDeleted = 0;

		for (const userDoc of usersSnapshot.docs) {
			const userData = userDoc.data();
			const tier = userData.subscription?.tier || 'free';

			// Determine retention period based on tier
			const retentionMap = {
				free: 7,
				pro: 30,
				premium: 90,
				business: 365,
			};
			const retentionDays = retentionMap[tier as keyof typeof retentionMap] || 7;

			const cutoffDate = new Date();
			cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

			// Get old backups
			const oldBackupsSnapshot = await getDb()
				.collection('backups')
				.where('userId', '==', userDoc.id)
				.where('createdAt', '<', cutoffDate)
				.get();

			const batch = getDb().batch();
			const filesToDelete: string[] = [];

			oldBackupsSnapshot.forEach((doc) => {
				const backup = doc.data();
				batch.delete(doc.ref);
				if (backup.storageUrl) {
					filesToDelete.push(backup.storageUrl);
				}
			});

			if (oldBackupsSnapshot.size > 0) {
				await batch.commit();

				// Delete files from storage
				for (const url of filesToDelete) {
					try {
						const fileName = url.split('/').pop();
						if (fileName) {
							await bucket.file(`users/${userDoc.id}/${fileName}`).delete();
						}
					} catch (deleteError) {
						console.error(`Failed to delete file: ${url}`, deleteError);
					}
				}

				totalDeleted += oldBackupsSnapshot.size;
			}
		}

		console.log(`Cleaned up ${totalDeleted} old backups`);
		return { deleted: totalDeleted };
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