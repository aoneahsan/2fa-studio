/**
 * Analytics Cloud Functions
 */

import {onCall, HttpsError} from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

const db = admin.firestore();

/**
 * Aggregate daily statistics
 */
export async function aggregateDailyStats() {
	try {
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		const tomorrow = new Date(today);
		tomorrow.setDate(tomorrow.getDate() + 1);

		// Get stats for today
		const stats = {
			date: today,
			users: {
				total: 0,
				active: 0,
				new: 0,
			},
			accounts: {
				total: 0,
				created: 0,
				deleted: 0,
			},
			backups: {
				total: 0,
				automatic: 0,
				manual: 0,
			},
			subscriptions: {
				free: 0,
				pro: 0,
				premium: 0,
				business: 0,
			},
			revenue: {
				daily: 0,
				subscriptions: 0,
			},
		};

		// Count users
		const usersSnapshot = await db.collection('users').get();
		stats.users.total = usersSnapshot.size;

		// Count active users (active today)
		const activeUsersSnapshot = await db
			.collection('users')
			.where('lastActive', '>=', today)
			.where('lastActive', '<', tomorrow)
			.get();
		stats.users.active = activeUsersSnapshot.size;

		// Count new users
		const newUsersSnapshot = await db
			.collection('users')
			.where('createdAt', '>=', today)
			.where('createdAt', '<', tomorrow)
			.get();
		stats.users.new = newUsersSnapshot.size;

		// Count subscription tiers
		usersSnapshot.forEach((doc) => {
			const tier = doc.data().subscription?.tier || 'free';
			stats.subscriptions[tier as keyof typeof stats.subscriptions]++;
		});

		// Count accounts
		const accountsSnapshot = await db.collection('accounts').get();
		stats.accounts.total = accountsSnapshot.size;

		// Count today's account activity
		const accountActivitySnapshot = await db
			.collection('audit_logs')
			.where('timestamp', '>=', today)
			.where('timestamp', '<', tomorrow)
			.where('action', 'in', ['account_created', 'account_deleted'])
			.get();

		accountActivitySnapshot.forEach((doc) => {
			const action = doc.data().action;
			if (action === 'account_created') {
				stats.accounts.created++;
			} else if (action === 'account_deleted') {
				stats.accounts.deleted++;
			}
		});

		// Count backups
		const backupsSnapshot = await db
			.collection('backups')
			.where('createdAt', '>=', today)
			.where('createdAt', '<', tomorrow)
			.get();

		stats.backups.total = backupsSnapshot.size;
		backupsSnapshot.forEach((doc) => {
			if (doc.data().automatic) {
				stats.backups.automatic++;
			} else {
				stats.backups.manual++;
			}
		});

		// Save aggregated stats
		await db
			.collection('analytics')
			.doc(today.toISOString().split('T')[0])
			.set(stats);

		console.log(`Aggregated stats for ${today.toISOString().split('T')[0]}`);
		return stats;
	} catch (error) {
		console.error('Error aggregating stats:', error);
		throw error;
	}
}

/**
 * Generate analytics reports
 */
export const generateReports = onCall(
	{
		cors: true,
		maxInstances: 10,
	},
	async (request) => {
		const data = request.data;
		const context = request.auth;
		
		// Check admin privileges
		if (!_context) {
			throw new HttpsError(
				'unauthenticated',
				'User must be authenticated'
			);
		}

		const userDoc = await db.collection('users').doc(context.uid).get();
		if (!['admin', 'super_admin'].includes(userDoc.data()?.role)) {
			throw new HttpsError(
				'permission-denied',
				'Admin access required'
			);
		}

		const { period = 'week', startDate, endDate } = data ?? {};

		try {
			let start: Date;
			let end: Date;

			if (startDate && endDate) {
				start = new Date(startDate);
				end = new Date(endDate);
			} else {
				end = new Date();
				start = new Date();

				switch (period) {
					case 'day':
						start.setDate(start.getDate() - 1);
						break;
					case 'week':
						start.setDate(start.getDate() - 7);
						break;
					case 'month':
						start.setMonth(start.getMonth() - 1);
						break;
					case 'year':
						start.setFullYear(start.getFullYear() - 1);
						break;
				}
			}

			// Get analytics data for period
			const analyticsSnapshot = await db
				.collection('analytics')
				.where('date', '>=', start)
				.where('date', '<=', end)
				.orderBy('date', 'asc')
				.get();

			const report = {
				period: { start: start.toISOString(), end: end.toISOString() },
				data: analyticsSnapshot.docs.map((doc) => ({
					date: doc.id,
					...doc.data(),
				})),
				summary: calculateSummary(analyticsSnapshot.docs),
			};

			return report;
		} catch (error) {
			console.error('Error generating report:', error);
			throw new HttpsError(
				'internal',
				'Failed to generate report'
			);
		}
	}
);

/**
 * Track custom events
 */
export const trackEvent = onCall(
	{
		cors: true,
		maxInstances: 10,
	},
	async (request) => {
		const data = request.data;
		const context = request.auth;
		const { event, properties = {} } = data ?? {};

		if (!event) {
			throw new HttpsError(
				'invalid-argument',
				'Event name required'
			);
		}

		try {
			await db.collection('events').add({
				event,
				properties,
				userId: context?.uid || null,
				timestamp: admin.firestore.FieldValue.serverTimestamp(),
				date: new Date().toISOString().split('T')[0],
			});

			return { success: true };
		} catch (error) {
			console.error('Error tracking event:', error);
			throw new HttpsError('internal', 'Failed to track event');
		}
	}
);

/**
 * Cleanup old analytics data
 */
export async function cleanupOldAnalytics() {
	try {
		// Keep analytics for 2 years
		const cutoffDate = new Date();
		cutoffDate.setFullYear(cutoffDate.getFullYear() - 2);

		// Delete old analytics
		const oldAnalyticsSnapshot = await db
			.collection('analytics')
			.where('date', '<', cutoffDate)
			.get();

		const batch = db.batch();
		oldAnalyticsSnapshot.forEach((doc) => {
			batch.delete(doc.ref);
		});

		// Delete old events (keep for 90 days)
		const eventCutoffDate = new Date();
		eventCutoffDate.setDate(eventCutoffDate.getDate() - 90);

		const oldEventsSnapshot = await db
			.collection('events')
			.where('timestamp', '<', eventCutoffDate)
			.get();

		oldEventsSnapshot.forEach((doc) => {
			batch.delete(doc.ref);
		});

		if (oldAnalyticsSnapshot.size + oldEventsSnapshot.size > 0) {
			await batch.commit();
			console.log(
				`Cleaned up ${oldAnalyticsSnapshot.size} analytics records and ${oldEventsSnapshot.size} events`
			);
		}

		return {
			analytics: oldAnalyticsSnapshot.size,
			events: oldEventsSnapshot.size,
		};
	} catch (error) {
		console.error('Error cleaning up analytics:', error);
		throw error;
	}
}

/**
 * Calculate summary statistics
 */
function calculateSummary(docs: admin.firestore.QueryDocumentSnapshot[]) {
	const summary = {
		users: {
			totalGrowth: 0,
			averageDaily: 0,
			peakDay: { date: '', count: 0 },
		},
		accounts: {
			totalCreated: 0,
			totalDeleted: 0,
			netGrowth: 0,
		},
		backups: {
			total: 0,
			automaticPercentage: 0,
		},
		subscriptions: {
			conversions: 0,
			churn: 0,
		},
		revenue: {
			total: 0,
			average: 0,
		},
	};

	if (docs.length === 0) return summary;

	let totalUsers = 0;
	let maxUsers = 0;
	let maxUsersDate = '';
	let totalRevenue = 0;
	let totalBackups = 0;
	let automaticBackups = 0;

	docs.forEach((doc) => {
		const data = doc.data();

		// Users
		totalUsers += data.users?.new || 0;
		if (data.users?.active > maxUsers) {
			maxUsers = data.users.active;
			maxUsersDate = doc.id;
		}

		// Accounts
		summary.accounts.totalCreated += data.accounts?.created || 0;
		summary.accounts.totalDeleted += data.accounts?.deleted || 0;

		// Backups
		totalBackups += data.backups?.total || 0;
		automaticBackups += data.backups?.automatic || 0;

		// Revenue
		totalRevenue += data.revenue?.daily || 0;
	});

	summary.users.totalGrowth = totalUsers;
	summary.users.averageDaily = totalUsers / docs.length;
	summary.users.peakDay = { date: maxUsersDate, count: maxUsers };

	summary.accounts.netGrowth =
		summary.accounts.totalCreated - summary.accounts.totalDeleted;

	summary.backups.total = totalBackups;
	summary.backups.automaticPercentage =
		totalBackups > 0 ? (automaticBackups / totalBackups) * 100 : 0;

	summary.revenue.total = totalRevenue;
	summary.revenue.average = totalRevenue / docs.length;

	return summary;
}