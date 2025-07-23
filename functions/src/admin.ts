/**
 * Admin Cloud Functions
 */

import {onCall, HttpsError} from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { Request, Response } from 'express';

// Lazy initialization to avoid accessing admin before initialization
const getDb = () => admin.firestore();
const getAuth = () => admin.auth();

/**
 * Check if user is admin
 */
async function isAdmin(uid: string): Promise<boolean> {
	try {
		const userDoc = await getDb().collection('users').doc(uid).get();
		const userData = userDoc.data();
		return userData?.role === 'admin' || userData?.role === 'super_admin';
	} catch (error) {
		return false;
	}
}

/**
 * Get user statistics for admin dashboard
 */
export const getUserStats = onCall(
	{
		cors: true,
		maxInstances: 10,
	},
	async (request) => {
		const context = request.auth;
		
		// Check authentication
		if (!context) {
			throw new HttpsError(
				'unauthenticated',
				'User must be authenticated'
			);
		}

		// Check admin privileges
		if (!(await isAdmin(context.uid))) {
			throw new HttpsError(
				'permission-denied',
				'User must be an admin'
			);
		}

		try {
			// Get total users count
			const usersSnapshot = await getDb().collection('users').get();
			const totalUsers = usersSnapshot.size;

			// Get subscription stats
			const subscriptionStats = {
				free: 0,
				pro: 0,
				premium: 0,
				business: 0,
			};

			usersSnapshot.forEach((doc: any) => {
				const user = doc.data();
				const tier = user.subscription?.tier || 'free';
				subscriptionStats[tier as keyof typeof subscriptionStats]++;
			});

			// Get active users (last 30 days)
			const thirtyDaysAgo = new Date();
			thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

			const activeUsersSnapshot = await getDb()
				.collection('users')
				.where('lastActive', '>', thirtyDaysAgo)
				.get();
			const activeUsers = activeUsersSnapshot.size;

			// Get total accounts
			const accountsSnapshot = await getDb().collection('accounts').get();
			const totalAccounts = accountsSnapshot.size;

			// Get recent signups (last 7 days)
			const sevenDaysAgo = new Date();
			sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

			const recentSignupsSnapshot = await getDb()
				.collection('users')
				.where('createdAt', '>', sevenDaysAgo)
				.get();
			const recentSignups = recentSignupsSnapshot.size;

			return {
				totalUsers,
				activeUsers,
				totalAccounts,
				recentSignups,
				subscriptionStats,
				lastUpdated: new Date().toISOString(),
			};
		} catch (error) {
			console.error('Error getting user stats:', error);
			throw new HttpsError(
				'internal',
				'Failed to get user statistics'
			);
		}
	}
);

/**
 * Update user subscription (admin override)
 */
export const updateUserSubscription = onCall(
	{
		cors: true,
		maxInstances: 10,
	},
	async (request) => {
		const data = request.data;
		const context = request.auth;
		
		// Check authentication
		if (!context) {
			throw new HttpsError(
				'unauthenticated',
				'User must be authenticated'
			);
		}

		// Check admin privileges
		if (!(await isAdmin(context.uid))) {
			throw new HttpsError(
				'permission-denied',
				'User must be an admin'
			);
		}

		const { userId, tier, accountLimit, validUntil, reason } = data ?? {};

		if (!userId || !tier) {
			throw new HttpsError(
				'invalid-argument',
				'Missing required fields'
			);
		}

		try {
			// Update user subscription
			await getDb()
				.collection('users')
				.doc(userId)
				.update({
					subscription: {
						tier,
						accountLimit: accountLimit || (tier === 'free' ? 10 : -1),
						validUntil: validUntil || null,
						updatedAt: admin.firestore.FieldValue.serverTimestamp(),
						updatedBy: context.uid,
						adminOverride: true,
					},
				});

			// Create audit log
			await getDb().collection('audit_logs').add({
				action: 'subscription_updated',
				targetUserId: userId,
				performedBy: context.uid,
				changes: { tier, accountLimit, validUntil },
				reason,
				timestamp: admin.firestore.FieldValue.serverTimestamp(),
			});

			return { success: true };
		} catch (error) {
			console.error('Error updating subscription:', error);
			throw new HttpsError(
				'internal',
				'Failed to update subscription'
			);
		}
	}
);

/**
 * Delete user and all associated data
 */
export const deleteUser = onCall(
	{
		cors: true,
		maxInstances: 10,
	},
	async (request) => {
		const data = request.data;
		const context = request.auth;
		
		// Check authentication
		if (!context) {
			throw new HttpsError(
				'unauthenticated',
				'User must be authenticated'
			);
		}

		// Check super admin privileges
		const userDoc = await getDb().collection('users').doc(context.uid).get();
		if (userDoc.data()?.role !== 'super_admin') {
			throw new HttpsError(
				'permission-denied',
				'Only super admins can delete users'
			);
		}

		const { userId, reason } = data ?? {};

		if (!userId || !reason) {
			throw new HttpsError(
				'invalid-argument',
				'Missing required fields'
			);
		}

		try {
			// Delete user accounts
			const accountsSnapshot = await getDb()
				.collection('accounts')
				.where('userId', '==', userId)
				.get();

			const batch = getDb().batch();
			accountsSnapshot.forEach((doc: any) => {
				batch.delete(doc.ref);
			});

			// Delete user document
			batch.delete(getDb().collection('users').doc(userId));

			// Delete user sessions
			const sessionsSnapshot = await getDb()
				.collection('sessions')
				.where('userId', '==', userId)
				.get();

			sessionsSnapshot.forEach((doc: any) => {
				batch.delete(doc.ref);
			});

			await batch.commit();

			// Delete from Firebase Auth
			await getAuth().deleteUser(userId);

			// Create audit log
			await getDb().collection('audit_logs').add({
				action: 'user_deleted',
				targetUserId: userId,
				performedBy: context.uid,
				reason,
				timestamp: admin.firestore.FieldValue.serverTimestamp(),
			});

			return { success: true };
		} catch (error) {
			console.error('Error deleting user:', error);
			throw new HttpsError('internal', 'Failed to delete user');
		}
	}
);

/**
 * Get system statistics
 */
export const getSystemStats = onCall(
	{
		cors: true,
		maxInstances: 10,
	},
	async (request) => {
		const context = request.auth;
		
		// Check authentication
		if (!context) {
			throw new HttpsError(
				'unauthenticated',
				'User must be authenticated'
			);
		}

		// Check admin privileges
		if (!(await isAdmin(context.uid))) {
			throw new HttpsError(
				'permission-denied',
				'User must be an admin'
			);
		}

		try {
			// Get storage usage
			const backupsSnapshot = await getDb().collection('backups').get();
			let totalBackupSize = 0;
			backupsSnapshot.forEach((doc: any) => {
				totalBackupSize += doc.data().size || 0;
			});

			// Get error logs (last 24 hours)
			const oneDayAgo = new Date();
			oneDayAgo.setDate(oneDayAgo.getDate() - 1);

			const errorLogsSnapshot = await getDb()
				.collection('error_logs')
				.where('timestamp', '>', oneDayAgo)
				.get();
			const recentErrors = errorLogsSnapshot.size;

			// Get API usage
			const apiUsageSnapshot = await getDb()
				.collection('api_usage')
				.where('timestamp', '>', oneDayAgo)
				.get();

			let totalApiCalls = 0;
			apiUsageSnapshot.forEach((doc: any) => {
				totalApiCalls += doc.data().count || 0;
			});

			// Get revenue stats (mock data for now)
			const revenueStats = {
				daily: 0,
				monthly: 0,
				yearly: 0,
			};

			return {
				storage: {
					backups: totalBackupSize,
					formatted: formatBytes(totalBackupSize),
				},
				errors: {
					last24Hours: recentErrors,
				},
				apiUsage: {
					last24Hours: totalApiCalls,
				},
				revenue: revenueStats,
				lastUpdated: new Date().toISOString(),
			};
		} catch (error) {
			console.error('Error getting system stats:', error);
			throw new HttpsError(
				'internal',
				'Failed to get system statistics'
			);
		}
	}
);

/**
 * Send notification to user(s)
 */
export const sendNotification = onCall(
	{
		cors: true,
		maxInstances: 10,
	},
	async (request) => {
		const data = request.data;
		const context = request.auth;
		
		// Check authentication
		if (!context) {
			throw new HttpsError(
				'unauthenticated',
				'User must be authenticated'
			);
		}

		// Check admin privileges
		if (!(await isAdmin(context.uid))) {
			throw new HttpsError(
				'permission-denied',
				'User must be an admin'
			);
		}

		const { userIds, title, message, type = 'info' } = data ?? {};

		if (!userIds || !title || !message) {
			throw new HttpsError(
				'invalid-argument',
				'Missing required fields'
			);
		}

		try {
			// Create notifications
			const batch = getDb().batch();
			const notificationData = {
				title,
				message,
				type,
				read: false,
				createdBy: context.uid,
				createdAt: admin.firestore.FieldValue.serverTimestamp(),
			};

			for (const userId of userIds) {
				const notificationRef = getDb()
					.collection('users')
					.doc(userId)
					.collection('notifications')
					.doc();

				batch.set(notificationRef, notificationData);
			}

			await batch.commit();

			// TODO: Send push notifications via OneSignal

			return { success: true, notificationsSent: userIds.length };
		} catch (error) {
			console.error('Error sending notifications:', error);
			throw new HttpsError(
				'internal',
				'Failed to send notifications'
			);
		}
	}
);

/**
 * Export users data
 */
export const exportUsers = onCall(
	{
		cors: true,
		maxInstances: 10,
	},
	async (request) => {
		const context = request.auth;
		
		// Check authentication
		if (!context) {
			throw new HttpsError(
				'unauthenticated',
				'User must be authenticated'
			);
		}

		// Check super admin privileges
		const userDoc = await getDb().collection('users').doc(context.uid).get();
		if (userDoc.data()?.role !== 'super_admin') {
			throw new HttpsError(
				'permission-denied',
				'Only super admins can export user data'
			);
		}

		try {
			const usersSnapshot = await getDb().collection('users').get();
			const users: unknown[] = [];

			usersSnapshot.forEach((doc: any) => {
				const userData = doc.data();
				users.push({
					id: doc.id,
					email: userData.email,
					displayName: userData.displayName,
					subscription: userData.subscription,
					accountCount: userData.accountCount,
					createdAt: userData.createdAt?.toDate().toISOString(),
					lastActive: userData.lastActive?.toDate().toISOString(),
				});
			});

			// Create audit log
			await getDb().collection('audit_logs').add({
				action: 'users_exported',
				performedBy: context.uid,
				count: users.length,
				timestamp: admin.firestore.FieldValue.serverTimestamp(),
			});

			return {
				users,
				exportedAt: new Date().toISOString(),
				exportedBy: context.uid,
			};
		} catch (error) {
			console.error('Error exporting users:', error);
			throw new HttpsError('internal', 'Failed to export users');
		}
	}
);

/**
 * Handle admin API requests
 */
export async function handleAdminAPI(req: Request, res: Response) {
	const path = req.path.split('/').filter(Boolean);

	// Verify admin token
	const token = req.headers.authorization?.split('Bearer ')[1];
	if (!token) {
		res.status(401).json({ error: 'Unauthorized' });
		return;
	}

	try {
		const decodedToken = await getAuth().verifyIdToken(token);
		const isUserAdmin = await isAdmin(decodedToken.uid);

		if (!isUserAdmin) {
			res.status(403).json({ error: 'Forbidden' });
			return;
		}

		// Route admin API requests
		if (path[1] === 'users' && req.method === 'GET') {
			// Get paginated users
			const page = parseInt(req.query.page as string) || 1;
			const limit = parseInt(req.query.limit as string) || 50;
			const offset = (page - 1) * limit;

			const usersSnapshot = await getDb()
				.collection('users')
				.orderBy('createdAt', 'desc')
				.limit(limit)
				.offset(offset)
				.get();

			const users: unknown[] = [];
			usersSnapshot.forEach((doc: any) => {
				users.push({ id: doc.id, ...doc.data() });
			});

			res.json({ users, page, limit });
		} else {
			res.status(404).json({ error: 'Not found' });
		}
	} catch (error) {
		console.error('Admin API error:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes: number): string {
	if (bytes === 0) return '0 Bytes';
	const k = 1024;
	const sizes = ['Bytes', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}