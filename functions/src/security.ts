/**
 * Security Cloud Functions
 */

import {onDocumentCreated} from 'firebase-functions/v2/firestore';
import {onCall, HttpsError} from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';

const db = admin.firestore();

// Rate limiting configuration
const RATE_LIMITS = {
	api: { window: 60, max: 100 }, // 100 requests per minute
	_auth: { window: 300, max: 5 }, // 5 auth attempts per 5 minutes
	backup: { window: 3600, max: 10 }, // 10 backups per hour
};

/**
 * Monitor suspicious activity
 */
export const monitorSuspiciousActivity = onDocumentCreated(
	'audit_logs/{logId}',
	async (event) => {
		const snap = event.data;
		if (!snap) {
			return;
		}
		const log = snap.data();
		const suspiciousActions = [
			'failed_login',
			'unauthorized_access',
			'rate_limit_exceeded',
			'invalid_token',
		];

		if (!suspiciousActions.includes(log.action)) {
			return;
		}

		try {
			// Check for patterns
			const userId = log.userId || log.ip;
			const recentLogsSnapshot = await db
				.collection('audit_logs')
				.where('userId', '==', userId)
				.where('action', 'in', suspiciousActions)
				.where('timestamp', '>', new Date(Date.now() - 3600000)) // Last hour
				.get();

			if (recentLogsSnapshot.size >= 10) {
				// Too many suspicious activities
				await handleSuspiciousUser(userId, recentLogsSnapshot.docs);
			}
		} catch (error) {
			console.error('Error monitoring activity:', error);
		}
	});

/**
 * Enforce rate limiting
 */
export const enforceRateLimit = onCall(
	{
		cors: true,
		maxInstances: 10,
	},
	async (request) => {
		const data = request.data;
		const context = request.auth;
		const { action = 'api', identifier } = data ?? {};
		const id = identifier || context?.uid || request.rawRequest.ip;

		const limit =
			RATE_LIMITS[action as keyof typeof RATE_LIMITS] || RATE_LIMITS.api;
		const key = `ratelimit:${action}:${id}`;

		try {
			// Get current count
			const doc = await db.collection('rate_limits').doc(key).get();
			const now = Date.now();
			const windowStart = now - limit.window * 1000;

			let count = 0;
			let requests: number[] = [];

			if (doc.exists) {
				const data = doc.data();
				requests = (data?.requests || []).filter(
					(time: number) => time > windowStart
				);
				count = requests.length;
			}

			if (count >= limit.max) {
				// Rate limit exceeded
				await db.collection('audit_logs').add({
					action: 'rate_limit_exceeded',
					userId: context?.uid,
					ip: request.rawRequest.ip,
					limit: action,
					timestamp: admin.firestore.FieldValue.serverTimestamp(),
				});

				throw new HttpsError(
					'resource-exhausted',
					'Rate limit exceeded. Please try again later.'
				);
			}

			// Add current request
			requests.push(now);
			await db.collection('rate_limits').doc(key).set({
				requests,
				lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
			});

			return {
				allowed: true,
				remaining: limit.max - count - 1,
				resetAt: new Date(windowStart + limit.window * 1000).toISOString(),
			};
		} catch (_error: unknown) {
			if ((error as unknown).code === 'resource-exhausted') {
				throw error;
			}
			console.error('Error enforcing rate limit:', error);
			throw new HttpsError(
				'internal',
				'Failed to check rate limit'
			);
		}
	}
);

/**
 * Validate request signature
 */
export const validateRequest = onCall(
	{
		cors: true,
		maxInstances: 10,
	},
	async (request) => {
		const data = request.data;
		const context = request.auth;
		const { signature, payload, timestamp } = data ?? {};

		if (!signature || !payload || !timestamp) {
			throw new HttpsError(
				'invalid-argument',
				'Missing required fields'
			);
		}

		// Check timestamp (prevent replay attacks)
		const requestTime = new Date(timestamp).getTime();
		const now = Date.now();
		const maxAge = 5 * 60 * 1000; // 5 minutes

		if (Math.abs(now - requestTime) > maxAge) {
			throw new HttpsError('invalid-argument', 'Request expired');
		}

		// Verify signature
		const secret = process.env.SECURITY_REQUEST_SECRET || 'default-secret';
		const expectedSignature = crypto
			.createHmac('sha256', secret)
			.update(`${timestamp}:${JSON.stringify(payload)}`)
			.digest('hex');

		if (signature !== expectedSignature) {
			await db.collection('audit_logs').add({
				action: 'invalid_signature',
				userId: context?.uid,
				ip: request.rawRequest.ip,
				timestamp: admin.firestore.FieldValue.serverTimestamp(),
			});

			throw new HttpsError(
				'unauthenticated',
				'Invalid signature'
			);
		}

		return { valid: true };
	}
);

/**
 * Create audit log entry
 */
export const createAuditLog = onCall(
	{
		cors: true,
		maxInstances: 10,
	},
	async (request) => {
		const data = request.data;
		const context = request.auth;
		const { action, targetId, details, severity = 'info' } = data ?? {};

		if (!action) {
			throw new HttpsError('invalid-argument', 'Action required');
		}

		try {
			const log = {
				action,
				targetId,
				details,
				severity,
				userId: context?.uid || null,
				ip: request.rawRequest.ip,
				userAgent: request.rawRequest.headers['user-agent'],
				timestamp: admin.firestore.FieldValue.serverTimestamp(),
			};

			await db.collection('audit_logs').add(log);

			// Alert on critical actions
			if (severity === 'critical') {
				await alertAdmins(log);
			}

			return { success: true };
		} catch (error) {
			console.error('Error creating audit log:', error);
			throw new HttpsError(
				'internal',
				'Failed to create audit log'
			);
		}
	}
);

/**
 * Cleanup old audit logs
 */
export async function cleanupOldAuditLogs() {
	try {
		// Keep audit logs for 1 year
		const cutoffDate = new Date();
		cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);

		const oldLogsSnapshot = await db
			.collection('audit_logs')
			.where('timestamp', '<', cutoffDate)
			.get();

		const batch = db.batch();
		oldLogsSnapshot.forEach((doc) => {
			batch.delete(doc.ref);
		});

		if (oldLogsSnapshot.size > 0) {
			await batch.commit();
			console.log(`Cleaned up ${oldLogsSnapshot.size} old audit logs`);
		}

		// Also cleanup old rate limit records
		const rateLimitCutoff = new Date();
		rateLimitCutoff.setDate(rateLimitCutoff.getDate() - 1);

		const oldRateLimitsSnapshot = await db
			.collection('rate_limits')
			.where('lastUpdated', '<', rateLimitCutoff)
			.get();

		const rateLimitBatch = db.batch();
		oldRateLimitsSnapshot.forEach((doc) => {
			rateLimitBatch.delete(doc.ref);
		});

		if (oldRateLimitsSnapshot.size > 0) {
			await rateLimitBatch.commit();
			console.log(
				`Cleaned up ${oldRateLimitsSnapshot.size} old rate limit records`
			);
		}

		return {
			auditLogs: oldLogsSnapshot.size,
			rateLimits: oldRateLimitsSnapshot.size,
		};
	} catch (error) {
		console.error('Error cleaning up logs:', error);
		throw error;
	}
}

/**
 * Handle suspicious user
 */
async function handleSuspiciousUser(
	userId: string,
	logs: admin.firestore.QueryDocumentSnapshot[]
) {
	try {
		// Create security alert
		await db.collection('security_alerts').add({
			userId,
			type: 'suspicious_activity',
			severity: 'high',
			details: {
				recentActions: logs.map((doc) => ({
					action: doc.data().action,
					timestamp: doc.data().timestamp,
				})),
			},
			status: 'pending',
			createdAt: admin.firestore.FieldValue.serverTimestamp(),
		});

		// If it's a user ID, temporarily lock the account
		if (userId.includes('-')) {
			// Firebase UIDs contain hyphens
			await db.collection('users').doc(userId).update({
				accountLocked: true,
				lockedAt: admin.firestore.FieldValue.serverTimestamp(),
				lockedReason: 'Suspicious activity detected',
			});

			// TODO: Send notification to user
		}

		// Alert admins
		await alertAdmins({
			action: 'suspicious_activity_detected',
			userId,
			severity: 'high',
		});
	} catch (error) {
		console.error('Error handling suspicious user:', error);
	}
}

/**
 * Alert administrators
 */
async function alertAdmins(alert: unknown) {
	try {
		// Get admin users
		const adminsSnapshot = await db
			.collection('users')
			.where('role', 'in', ['admin', 'super_admin'])
			.get();

		const batch = db.batch();

		adminsSnapshot.forEach((doc) => {
			const notificationRef = db
				.collection('users')
				.doc(doc.id)
				.collection('notifications')
				.doc();

			batch.set(notificationRef, {
				title: 'Security Alert',
				message: `${alert.severity?.toUpperCase() || 'HIGH'}: ${alert.action}`,
				type: 'security',
				priority: 'high',
				details: alert,
				read: false,
				createdAt: admin.firestore.FieldValue.serverTimestamp(),
			});
		});

		await batch.commit();

		// TODO: Send push notifications via OneSignal
		// TODO: Send email alerts
	} catch (error) {
		console.error('Error alerting admins:', error);
	}
}

/**
 * Check IP reputation
 */
export const checkIPReputation = onCall(
	{
		cors: true,
		maxInstances: 10,
	},
	async (request) => {
		const data = request.data;
		const ip = data?.ip || request.rawRequest.ip;

		try {
			// Check if IP is in blocklist
			const blocklistDoc = await db.collection('ip_blocklist').doc(ip).get();

			if (blocklistDoc.exists) {
				return {
					blocked: true,
					reason: blocklistDoc.data()?.reason,
					since: blocklistDoc.data()?.createdAt,
				};
			}

			// Check recent suspicious activity from this IP
			const recentActivitySnapshot = await db
				.collection('audit_logs')
				.where('ip', '==', ip)
				.where('action', 'in', ['failed_login', 'rate_limit_exceeded'])
				.where('timestamp', '>', new Date(Date.now() - 24 * 3600000)) // Last 24 hours
				.get();

			const suspiciousCount = recentActivitySnapshot.size;

			return {
				blocked: false,
				reputation:
					suspiciousCount < 5
						? 'good'
						: suspiciousCount < 20
							? 'suspicious'
							: 'bad',
				recentSuspiciousActivity: suspiciousCount,
			};
		} catch (error) {
			console.error('Error checking IP reputation:', error);
			throw new HttpsError(
				'internal',
				'Failed to check IP reputation'
			);
		}
	}
);