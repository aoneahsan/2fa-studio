/**
 * Audit Log Service
 * @module services/audit-log
 *
 * Tracks all security-critical actions across the application
 * including authentication events, account operations, admin actions,
 * and system access patterns.
 */

import {
	collection,
	doc,
	addDoc,
	getDocs,
	query,
	where,
	orderBy,
	limit,
	startAfter,
	DocumentSnapshot,
	serverTimestamp,
	Timestamp,
	QueryConstraint,
} from 'firebase/firestore';
import { db, auth } from '@src/config/firebase';
import { AuditLog } from '@src/types';
import { DeviceService } from '@services/device.service';
import { Capacitor } from '@capacitor/core';

export type AuditAction =
	// Authentication actions
	| 'auth.login'
	| 'auth.logout'
	| 'auth.signup'
	| 'auth.password_reset'
	| 'auth.password_changed'
	| 'auth.email_verified'
	| 'auth.failed_login'
	| 'auth.account_locked'
	| 'auth.account_deleted'
	| 'auth.provider_linked'
	| 'auth.provider_unlinked'
	| 'auth.session_expired'
	| 'auth.suspicious_activity'

	// Account (2FA) actions
	| 'account.created'
	| 'account.updated'
	| 'account.deleted'
	| 'account.exported'
	| 'account.imported'
	| 'account.batch_deleted'
	| 'account.backup_created'
	| 'account.backup_restored'
	| 'account.shared'

	// Security actions
	| 'security.biometric_enabled'
	| 'security.biometric_disabled'
	| 'security.biometric_auth_success'
	| 'security.biometric_auth_failed'
	| 'security.encryption_key_changed'
	| 'security.device_trusted'
	| 'security.device_untrusted'
	| 'security.suspicious_access'
	| 'security.rate_limit_exceeded'

	// Admin actions
	| 'admin.user_updated'
	| 'admin.user_disabled'
	| 'admin.user_enabled'
	| 'admin.subscription_changed'
	| 'admin.feature_flag_changed'
	| 'admin.system_config_changed'
	| 'admin.user_data_accessed'
	| 'admin.audit_log_accessed'
	| 'admin.report_generated'

	// Subscription actions
	| 'subscription.upgraded'
	| 'subscription.downgraded'
	| 'subscription.cancelled'
	| 'subscription.renewed'
	| 'subscription.payment_failed'
	| 'subscription.trial_started'
	| 'subscription.trial_ended'

	// Data actions
	| 'data.exported'
	| 'data.imported'
	| 'data.backup_created'
	| 'data.backup_restored'
	| 'data.backup_deleted'
	| 'data.sync_started'
	| 'data.sync_completed'
	| 'data.sync_failed'
	| 'data.gdpr_export'
	| 'data.gdpr_deletion'

	// Vault actions
	| 'vault.created'
	| 'vault.updated'
	| 'vault.deleted'
	| 'vault.account_added'
	| 'vault.account_removed'
	| 'vault.member_added'
	| 'vault.member_removed'
	| 'vault.permissions_changed';

export interface AuditLogEntry extends Omit<AuditLog, 'id' | 'timestamp'> {
	action: AuditAction;
	severity: 'info' | 'warning' | 'critical';
	userAgent?: string;
	platform?: string;
	appVersion?: string;
	success: boolean;
	errorMessage?: string;
	metadata?: Record<string, any>;
}

export interface AuditLogSearchParams {
	userId?: string;
	actions?: AuditAction[];
	severity?: ('info' | 'warning' | 'critical')[];
	startDate?: Date;
	endDate?: Date;
	resource?: string;
	success?: boolean;
	deviceId?: string;
	pageSize?: number;
	lastDoc?: DocumentSnapshot;
}

export interface AuditLogStats {
	totalEvents: number;
	failedAttempts: number;
	suspiciousActivities: number;
	uniqueUsers: number;
	topActions: { action: AuditAction; count: number }[];
	recentFailures: AuditLog[];
}

const PROJECT_PREFIX = 'fa2s_';

export class AuditLogService {
	private static readonly AUDIT_LOGS_COLLECTION = `${PROJECT_PREFIX}audit_logs`;
	private static readonly RETENTION_DAYS = 90; // Keep logs for 90 days
	private static readonly BATCH_SIZE = 100;

	/**
	 * Log an audit event
	 */
	static async log(entry: AuditLogEntry): Promise<void> {
		try {
			const currentUser = auth.currentUser;
			const deviceId = await DeviceService.getDeviceId();
			const sessionId = DeviceService.getSessionId();

			// Get additional context
			const platform = Capacitor.getPlatform();
			const userAgent = navigator.userAgent;

			// Get IP address (would be done server-side in production)
			let ipAddress = 'unknown';
			try {
				// In production, this would be handled by Cloud Functions
				// to get the real IP from the request headers
				ipAddress = 'client-side-log';
			} catch (error) {
				console.error('Error getting IP address:', error);
			}

			const auditLog = {
				...entry,
				userId: entry.userId || currentUser?.uid || 'anonymous',
				timestamp: serverTimestamp(),
				ipAddress,
				deviceId,
				sessionId,
				platform,
				userAgent,
				appVersion: process.env.REACT_APP_VERSION || '1.0.0',
			};

			await addDoc(collection(db, this.AUDIT_LOGS_COLLECTION), auditLog);

			// For critical security events, also trigger alerts
			if (entry.severity === 'critical' || !entry.success) {
				await this.triggerSecurityAlert(auditLog);
			}
		} catch (error) {
			console.error('Error logging audit event:', error);
			// Don't throw - audit logging should not break the app
		}
	}

	/**
	 * Search audit logs
	 */
	static async searchLogs(params: AuditLogSearchParams): Promise<{
		logs: AuditLog[];
		lastDoc: DocumentSnapshot | null;
		hasMore: boolean;
	}> {
		try {
			const constraints: QueryConstraint[] = [];

			if (params.userId) {
				constraints.push(where('userId', '==', params.userId));
			}

			if (params.actions && params.actions.length > 0) {
				constraints.push(where('action', 'in', params.actions));
			}

			if (params.severity && params.severity.length > 0) {
				constraints.push(where('severity', 'in', params.severity));
			}

			if (params.startDate) {
				constraints.push(
					where('timestamp', '>=', Timestamp.fromDate(params.startDate))
				);
			}

			if (params.endDate) {
				constraints.push(
					where('timestamp', '<=', Timestamp.fromDate(params.endDate))
				);
			}

			if (params.resource) {
				constraints.push(where('resource', '==', params.resource));
			}

			if (params.success !== undefined) {
				constraints.push(where('success', '==', params.success));
			}

			if (params.deviceId) {
				constraints.push(where('deviceId', '==', params.deviceId));
			}

			// Always order by timestamp descending
			constraints.push(orderBy('timestamp', 'desc'));

			// Pagination
			const pageSize = params.pageSize || 50;
			constraints.push(limit(pageSize + 1)); // Get one extra to check if there are more

			if (params.lastDoc) {
				constraints.push(startAfter(params.lastDoc));
			}

			const q = query(
				collection(db, this.AUDIT_LOGS_COLLECTION),
				...constraints
			);
			const snapshot = await getDocs(q);

			const logs: AuditLog[] = [];
			let lastDoc: DocumentSnapshot | null = null;

			snapshot.docs.slice(0, pageSize).forEach((doc) => {
				const data = doc.data();
				logs.push({
					id: doc.id,
					userId: data.userId,
					action: data.action,
					resource: data.resource,
					timestamp: data.timestamp?.toDate() || new Date(),
					details: data.details,
					ipAddress: data.ipAddress,
					deviceId: data.deviceId,
					...data.metadata,
				});
				lastDoc = doc;
			});

			return {
				logs,
				lastDoc,
				hasMore: snapshot.docs.length > pageSize,
			};
		} catch (error) {
			console.error('Error searching audit logs:', error);
			throw error;
		}
	}

	/**
	 * Get audit log statistics
	 */
	static async getStats(
		userId?: string,
		startDate?: Date,
		endDate?: Date
	): Promise<AuditLogStats> {
		try {
			const constraints: QueryConstraint[] = [];

			if (userId) {
				constraints.push(where('userId', '==', userId));
			}

			if (startDate) {
				constraints.push(
					where('timestamp', '>=', Timestamp.fromDate(startDate))
				);
			}

			if (endDate) {
				constraints.push(where('timestamp', '<=', Timestamp.fromDate(endDate)));
			}

			const q = query(
				collection(db, this.AUDIT_LOGS_COLLECTION),
				...constraints
			);
			const snapshot = await getDocs(q);

			const stats: AuditLogStats = {
				totalEvents: 0,
				failedAttempts: 0,
				suspiciousActivities: 0,
				uniqueUsers: new Set<string>().size,
				topActions: [],
				recentFailures: [],
			};

			const actionCounts = new Map<AuditAction, number>();
			const uniqueUsers = new Set<string>();
			const recentFailures: AuditLog[] = [];

			snapshot.docs.forEach((doc) => {
				const data = doc.data();
				stats.totalEvents++;

				uniqueUsers.add(data.userId);

				if (!data.success) {
					stats.failedAttempts++;
					if (recentFailures.length < 10) {
						recentFailures.push({
							id: doc.id,
							userId: data.userId,
							action: data.action,
							resource: data.resource,
							timestamp: data.timestamp?.toDate() || new Date(),
							details: data.details,
							ipAddress: data.ipAddress,
							deviceId: data.deviceId,
						});
					}
				}

				if (
					data.severity === 'critical' ||
					data.action.includes('suspicious')
				) {
					stats.suspiciousActivities++;
				}

				// Count actions
				const count = actionCounts.get(data.action) || 0;
				actionCounts.set(data.action, count + 1);
			});

			stats.uniqueUsers = uniqueUsers.size;
			stats.recentFailures = recentFailures;

			// Get top 10 actions
			stats.topActions = Array.from(actionCounts.entries())
				.sort((a, b) => b[1] - a[1])
				.slice(0, 10)
				.map(([action, count]) => ({ action, count }));

			return stats;
		} catch (error) {
			console.error('Error getting audit log stats:', error);
			throw error;
		}
	}

	/**
	 * Detect suspicious activities
	 */
	static async detectSuspiciousActivity(userId: string): Promise<boolean> {
		try {
			// Check for multiple failed login attempts
			const recentFailures = await this.searchLogs({
				userId,
				actions: ['auth.failed_login'],
				success: false,
				startDate: new Date(Date.now() - 15 * 60 * 1000), // Last 15 minutes
				pageSize: 10,
			});

			if (recentFailures.logs.length >= 5) {
				await this.log({
					userId,
					action: 'auth.suspicious_activity',
					resource: 'auth',
					severity: 'critical',
					success: false,
					details: {
						reason: 'Multiple failed login attempts',
						count: recentFailures.logs.length,
					},
				});
				return true;
			}

			// Check for unusual access patterns
			const recentAccess = await this.searchLogs({
				userId,
				startDate: new Date(Date.now() - 60 * 60 * 1000), // Last hour
				pageSize: 50,
			});

			// Check for access from multiple devices/IPs
			const uniqueDevices = new Set(
				recentAccess.logs.map((log: any) => log.deviceId)
			);
			const uniqueIPs = new Set(
				recentAccess.logs.map((log: any) => log.ipAddress)
			);

			if (uniqueDevices.size > 3 || uniqueIPs.size > 5) {
				await this.log({
					userId,
					action: 'auth.suspicious_activity',
					resource: 'auth',
					severity: 'warning',
					success: true,
					details: {
						reason: 'Access from multiple devices/locations',
						deviceCount: uniqueDevices.size,
						ipCount: uniqueIPs.size,
					},
				});
				return true;
			}

			return false;
		} catch (error) {
			console.error('Error detecting suspicious activity:', error);
			return false;
		}
	}

	/**
	 * Trigger security alert for critical events
	 */
	private static async triggerSecurityAlert(auditLog: unknown): Promise<void> {
		try {
			// In production, this would:
			// 1. Send email to user
			// 2. Send push notification
			// 3. Alert admin dashboard
			// 4. Potentially lock account for critical breaches

			console.warn('Security Alert:', auditLog);

			// You could integrate with services like:
			// - SendGrid for emails
			// - FCM for push notifications
			// - Slack for admin alerts
			// - PagerDuty for critical incidents
		} catch (error) {
			console.error('Error triggering security alert:', error);
		}
	}

	/**
	 * Clean up old audit logs
	 */
	static async cleanupOldLogs(): Promise<number> {
		try {
			const cutoffDate = new Date();
			cutoffDate.setDate(cutoffDate.getDate() - this.RETENTION_DAYS);

			const q = query(
				collection(db, this.AUDIT_LOGS_COLLECTION),
				where('timestamp', '<', Timestamp.fromDate(cutoffDate)),
				limit(this.BATCH_SIZE)
			);

			const snapshot = await getDocs(q);

			// In production, this would be done in batches via Cloud Functions
			console.log(`Found ${snapshot.size} old audit logs to clean up`);

			return snapshot.size;
		} catch (error) {
			console.error('Error cleaning up old logs:', error);
			return 0;
		}
	}

	/**
	 * Export audit logs for compliance
	 */
	static async exportLogs(params: AuditLogSearchParams): Promise<string> {
		try {
			const allLogs: AuditLog[] = [];
			let lastDoc: DocumentSnapshot | null = null;
			let hasMore = true;

			while (hasMore) {
				const result = await this.searchLogs({
					...params,
					pageSize: this.BATCH_SIZE,
					lastDoc: lastDoc || undefined,
				});

				allLogs.push(...result.logs);
				lastDoc = result.lastDoc;
				hasMore = result.hasMore;
			}

			// Create CSV format for export
			const csv = this.convertToCSV(allLogs);

			// Log the export action
			await this.log({
				userId: params.userId || 'system',
				action: 'data.gdpr_export',
				resource: 'audit_logs',
				severity: 'info',
				success: true,
				details: {
					recordCount: allLogs.length,
					startDate: params.startDate,
					endDate: params.endDate,
				},
			});

			return csv;
		} catch (error) {
			console.error('Error exporting audit logs:', error);
			throw error;
		}
	}

	/**
	 * Convert audit logs to CSV format
	 */
	private static convertToCSV(logs: AuditLog[]): string {
		const headers = [
			'Timestamp',
			'Action',
			'Resource',
			'IP Address',
			'Device ID',
			'Details',
		];

		const rows = logs.map((log: any) => [
			log.timestamp.toISOString(),
			log.action,
			log.resource,
			log.ipAddress || '',
			log.deviceId || '',
			JSON.stringify(log.details || {}),
		]);

		const csv = [
			headers.join(','),
			...rows.map((row: any) => row.map((cell: any) => `"${cell}"`).join(',')),
		].join('\n');

		return csv;
	}

	/**
	 * Log account-related action
	 */
	static async logAccountAction(
		action: AuditAction,
		accountId: string,
		userEmail: string,
		details?: Record<string, any>
	): Promise<void> {
		try {
			await this.log({
				userId: userEmail,
				action,
				resource: 'account',
				severity: 'info',
				success: true,
				details: {
					...details,
					accountId,
				},
			});
		} catch (error) {
			console.error('Failed to log account action:', error);
		}
	}

	/**
	 * Get current user
	 */
	private static getCurrentUser(): any {
		return auth.currentUser;
	}
}
