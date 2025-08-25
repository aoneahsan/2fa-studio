/**
 * Firebase Cloud Functions for 2FA Studio
 */

import {onSchedule} from 'firebase-functions/v2/scheduler';
import {onRequest} from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import * as adminFunctions from './admin';
import * as authFunctions from './auth';
import * as subscriptionFunctions from './subscription';
import * as backupFunctions from './backup';
import * as analyticsFunctions from './analytics';
import * as securityFunctions from './security';
import * as webhookFunctions from './webhooks';

// Initialize Firebase Admin
admin.initializeApp();

// Admin Functions
export const adminGetUserStats = adminFunctions.getUserStats;
export const adminUpdateUserSubscription =
	adminFunctions.updateUserSubscription;
export const adminDeleteUser = adminFunctions.deleteUser;
export const adminGetSystemStats = adminFunctions.getSystemStats;
export const adminSendNotification = adminFunctions.sendNotification;
export const adminExportUsers = adminFunctions.exportUsers;

// Auth Functions
export const authOnUserCreate = authFunctions.onUserCreate;
export const authOnUserDelete = authFunctions.onUserDelete;
export const authValidateAdmin = authFunctions.validateAdmin;
export const authCleanupSessions = authFunctions.cleanupSessions;
export const authCreateSession = authFunctions.createSession;
export const authRevokeSession = authFunctions.revokeSession;
export const authGetUserSessions = authFunctions.getUserSessions;

// Subscription Functions
export const subscriptionCreateCheckoutSession =
	subscriptionFunctions.createCheckoutSession;
export const subscriptionCreatePortalSession =
	subscriptionFunctions.createPortalSession;
export const subscriptionWebhook = subscriptionFunctions.handleStripeWebhook;
export const subscriptionCheckLimits = subscriptionFunctions.checkAccountLimits;
export const subscriptionUpdateUsage = subscriptionFunctions.updateUsageStats;

// Backup Functions
export const backupScheduleAutoBackup = backupFunctions.scheduleAutoBackup;
export const backupCleanupOldBackups = backupFunctions.cleanupOldBackups;
export const backupExportUserData = backupFunctions.exportUserData;
export const backupValidateBackup = backupFunctions.validateBackup;

// Analytics Functions
export const analyticsAggregateDaily = analyticsFunctions.aggregateDailyStats;
export const analyticsGenerateReports = analyticsFunctions.generateReports;
export const analyticsTrackEvent = analyticsFunctions.trackEvent;
export const analyticsCleanupOldData = analyticsFunctions.cleanupOldAnalytics;

// Security Functions
export const securityMonitorSuspiciousActivity =
	securityFunctions.monitorSuspiciousActivity;
export const securityEnforceRateLimit = securityFunctions.enforceRateLimit;
export const securityValidateRequest = securityFunctions.validateRequest;
export const securityAuditLog = securityFunctions.createAuditLog;
export const securityCheckIPReputation = securityFunctions.checkIPReputation;

// Webhook Functions
export const webhookOneSignal = webhookFunctions.handleOneSignalWebhook;
export const webhookGoogleDrive = webhookFunctions.handleGoogleDriveWebhook;
export const webhookRegister = webhookFunctions.registerWebhook;
export const webhookList = webhookFunctions.listWebhooks;

// Scheduled Functions
export const scheduledCleanup = onSchedule('every 24 hours', async () => {
	console.log('Running daily cleanup tasks');

	try {
		// Cleanup tasks
		await Promise.all([
			authFunctions.cleanupExpiredSessions(),
			backupFunctions.cleanupOldBackups(),
			analyticsFunctions.cleanupOldAnalytics(),
			securityFunctions.cleanupOldAuditLogs(),
		]);
		console.log('Daily cleanup completed successfully');
	} catch (error) {
		console.error('Error during daily cleanup:', error);
	}
});

export const scheduledUsageCheck = onSchedule('every 1 hours', async () => {
	console.log('Checking user usage limits');

	try {
		const result = await subscriptionFunctions.enforceUsageLimits();
		console.log(`Usage check completed: ${result.violations} violations found`);
	} catch (error) {
		console.error('Error during usage check:', error);
	}
});

export const scheduledBackup = onSchedule('every 12 hours', async () => {
	console.log('Running scheduled backups');

	try {
		const result = await backupFunctions.runScheduledBackups();
		console.log(`Scheduled backups completed: ${result.processed} processed`);
	} catch (error) {
		console.error('Error during scheduled backups:', error);
	}
});

export const scheduledAnalytics = onSchedule('every 24 hours', async () => {
	console.log('Running daily analytics aggregation');

	try {
		const stats = await analyticsFunctions.aggregateDailyStats();
		console.log('Daily analytics aggregation completed', {
			totalUsers: stats.users.total,
			activeUsers: stats.users.active,
			newUsers: stats.users.new
		});
	} catch (error) {
		console.error('Error during analytics aggregation:', error);
	}
});

// HTTP Functions for API
export const api = onRequest(async (req, res) => {
	// Enable CORS
	res.set('Access-Control-Allow-Origin', '*');
	res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
	res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

	if (req.method === 'OPTIONS') {
		res.status(204).send('');
		return;
	}

	// Route API requests
	const path = req.path.split('/').filter(Boolean);

	try {
		if (path[0] === 'health') {
			res.json({ status: 'ok', timestamp: new Date().toISOString() });
		} else if (path[0] === 'admin' && path[1]) {
			// Admin API routes - cast to proper types
			await adminFunctions.handleAdminAPI(req as any, res as any);
		} else if (path[0] === 'webhook' && path[1]) {
			// Webhook routes - cast to proper types
			await webhookFunctions.handleWebhook(req as any, res as any);
		} else {
			res.status(404).json({ error: 'Not found' });
		}
	} catch (error) {
		console.error('API Error:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});
