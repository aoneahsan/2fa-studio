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

// Webhook Functions
export const webhookOneSignal = webhookFunctions.handleOneSignalWebhook;
export const webhookGoogleDrive = webhookFunctions.handleGoogleDriveWebhook;

// Scheduled Functions
export const scheduledCleanup = onSchedule('every 24 hours', async (event) => {
	console.log('Running daily cleanup tasks');

	// Cleanup tasks
	await Promise.all([
		authFunctions.cleanupExpiredSessions(),
		backupFunctions.cleanupOldBackups(),
		analyticsFunctions.cleanupOldAnalytics(),
		securityFunctions.cleanupOldAuditLogs(),
	]);
});

export const scheduledUsageCheck = onSchedule('every 1 hours', async (event) => {
	console.log('Checking user usage limits');

	await subscriptionFunctions.enforceUsageLimits();
});

export const scheduledBackup = onSchedule('every 12 hours', async (event) => {
	console.log('Running scheduled backups');

	await backupFunctions.runScheduledBackups();
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
			await adminFunctions.handleAdminAPI(req as unknown, res as unknown);
		} else if (path[0] === 'webhook' && path[1]) {
			// Webhook routes - cast to proper types
			await webhookFunctions.handleWebhook(req as unknown, res as unknown);
		} else {
			res.status(404).json({ _error: 'Not found' });
		}
	} catch (_error) {
		console.error('API Error:', error);
		res.status(500).json({ _error: 'Internal server error' });
	}
});
