/**
 * Audit Logging Service for Compliance
 * Implements comprehensive audit logging for SOC 2 and GDPR compliance
 * @module services/compliance/audit-logging
 */

import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  Timestamp,
  serverTimestamp,
  writeBatch,
  doc
} from 'firebase/firestore';
import { db } from '@services/firebase';
import { FirestoreService } from '@services/firestore.service';
import { AuthService } from '@services/auth.service';

export interface AuditLog {
  id?: string;
  userId: string;
  userEmail: string;
  action: AuditAction;
  resource: AuditResource;
  resourceId?: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  timestamp: Date | Timestamp;
  severity: 'info' | 'warning' | 'critical';
  success: boolean;
  errorMessage?: string;
  metadata?: {
    previousValue?: unknown;
    newValue?: unknown;
    changeType?: 'create' | 'update' | 'delete' | 'access';
  };
}

export enum AuditAction {
  // Authentication
  LOGIN = 'auth.login',
  LOGOUT = 'auth.logout',
  REGISTER = 'auth.register',
  PASSWORD_RESET = 'auth.password_reset',
  SESSION_EXPIRED = 'auth.session_expired',
  
  // Account Management
  ACCOUNT_CREATE = 'account.create',
  ACCOUNT_UPDATE = 'account.update',
  ACCOUNT_DELETE = 'account.delete',
  ACCOUNT_VIEW = 'account.view',
  ACCOUNT_EXPORT = 'account.export',
  ACCOUNT_IMPORT = 'account.import',
  
  // User Settings
  SETTINGS_UPDATE = 'settings.update',
  PROFILE_UPDATE = 'profile.update',
  PRIVACY_UPDATE = 'privacy.update',
  
  // Security
  BIOMETRIC_ENABLE = 'security.biometric_enable',
  BIOMETRIC_DISABLE = 'security.biometric_disable',
  ENCRYPTION_KEY_CHANGE = 'security.encryption_key_change',
  DEVICE_TRUST = 'security.device_trust',
  DEVICE_REVOKE = 'security.device_revoke',
  
  // Subscription
  SUBSCRIPTION_CREATE = 'subscription.create',
  SUBSCRIPTION_UPDATE = 'subscription.update',
  SUBSCRIPTION_CANCEL = 'subscription.cancel',
  PAYMENT_METHOD_ADD = 'payment.method_add',
  PAYMENT_METHOD_REMOVE = 'payment.method_remove',
  
  // Data Management
  BACKUP_CREATE = 'data.backup_create',
  BACKUP_RESTORE = 'data.backup_restore',
  DATA_EXPORT = 'data.export',
  DATA_DELETE = 'data.delete',
  
  // Admin Actions
  ADMIN_USER_UPDATE = 'admin.user_update',
  ADMIN_USER_DELETE = 'admin.user_delete',
  ADMIN_SUBSCRIPTION_OVERRIDE = 'admin.subscription_override',
  ADMIN_AUDIT_VIEW = 'admin.audit_view',
  ADMIN_REPORT_GENERATE = 'admin.report_generate',
  
  // Team Management
  TEAM_CREATE = 'team.create',
  TEAM_UPDATE = 'team.update',
  TEAM_DELETE = 'team.delete',
  TEAM_MEMBER_ADD = 'team.member_add',
  TEAM_MEMBER_REMOVE = 'team.member_remove',
  TEAM_ROLE_UPDATE = 'team.role_update',
  
  // Compliance
  CONSENT_UPDATE = 'compliance.consent_update',
  DATA_REQUEST = 'compliance.data_request',
  DATA_DELETION_REQUEST = 'compliance.deletion_request',
  RETENTION_POLICY_APPLY = 'compliance.retention_apply'
}

export enum AuditResource {
  USER = 'user',
  ACCOUNT = 'account',
  SUBSCRIPTION = 'subscription',
  DEVICE = 'device',
  BACKUP = 'backup',
  SETTINGS = 'settings',
  TEAM = 'team',
  AUDIT = 'audit',
  SYSTEM = 'system'
}

export interface AuditQuery {
  userId?: string;
  action?: AuditAction;
  resource?: AuditResource;
  startDate?: Date;
  endDate?: Date;
  severity?: 'info' | 'warning' | 'critical';
  success?: boolean;
  limit?: number;
}

export interface AuditReport {
  summary: {
    totalEvents: number;
    successfulEvents: number;
    failedEvents: number;
    criticalEvents: number;
    uniqueUsers: number;
    dateRange: {
      start: Date;
      end: Date;
    };
  };
  topActions: Array<{
    action: AuditAction;
    count: number;
  }>;
  userActivity: Array<{
    userId: string;
    userEmail: string;
    eventCount: number;
    lastActivity: Date;
  }>;
  securityEvents: AuditLog[];
  complianceEvents: AuditLog[];
}

export class AuditLoggingService {
  private static readonly COLLECTION_NAME = 'audit_logs';
  private static readonly RETENTION_DAYS = 2555; // 7 years for compliance
  private static readonly BATCH_SIZE = 500;
  
  /**
   * Log an audit event
   */
  static async log(params: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
    try {
      const currentUser = AuthService.getCurrentUser();
      const sessionId = sessionStorage.getItem('sessionId') || undefined;
      
      const auditLog: Omit<AuditLog, 'id'> = {
        ...params,
        userId: params.userId || currentUser?.uid || 'system',
        userEmail: params.userEmail || currentUser?.email || 'system',
        sessionId,
        timestamp: serverTimestamp() as Timestamp,
        ipAddress: params.ipAddress || await this.getClientIP(),
        userAgent: params.userAgent || navigator.userAgent
      };
      
      await addDoc(collection(db, this.COLLECTION_NAME), auditLog);
      
      // Alert on critical events
      if (params.severity === 'critical' && !params.success) {
        await this.alertSecurityTeam(auditLog);
      }
    } catch (error) {
      console.error('Failed to create audit log:', error);
      // Don't throw - audit logging should not break the app
    }
  }
  
  /**
   * Query audit logs
   */
  static async query(params: AuditQuery): Promise<AuditLog[]> {
    try {
      let q = query(collection(db, this.COLLECTION_NAME));
      
      if (params.userId) {
        q = query(q, where('userId', '==', params.userId));
      }
      
      if (params.action) {
        q = query(q, where('action', '==', params.action));
      }
      
      if (params.resource) {
        q = query(q, where('resource', '==', params.resource));
      }
      
      if (params.severity) {
        q = query(q, where('severity', '==', params.severity));
      }
      
      if (params.success !== undefined) {
        q = query(q, where('success', '==', params.success));
      }
      
      if (params.startDate) {
        q = query(q, where('timestamp', '>=', Timestamp.fromDate(params.startDate)));
      }
      
      if (params.endDate) {
        q = query(q, where('timestamp', '<=', Timestamp.fromDate(params.endDate)));
      }
      
      q = query(q, orderBy('timestamp', 'desc'));
      
      if (params.limit) {
        q = query(q, limit(params.limit));
      }
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate()
      } as AuditLog));
    } catch (error) {
      console.error('Failed to query audit logs:', error);
      throw error;
    }
  }
  
  /**
   * Generate compliance report
   */
  static async generateReport(
    startDate: Date,
    endDate: Date,
    userId?: string
  ): Promise<AuditReport> {
    try {
      const logs = await this.query({
        startDate,
        endDate,
        userId,
        limit: 10000
      });
      
      // Calculate summary
      const summary = {
        totalEvents: logs.length,
        successfulEvents: logs.filter((l: any) => l.success).length,
        failedEvents: logs.filter((l: any) => !l.success).length,
        criticalEvents: logs.filter((l: any) => l.severity === 'critical').length,
        uniqueUsers: new Set(logs.map((l: any) => l.userId)).size,
        dateRange: { start: startDate, end: endDate }
      };
      
      // Top actions
      const actionCounts = logs.reduce((acc, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const topActions = Object.entries(actionCounts)
        .map(([action, count]) => ({ action: action as AuditAction, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      
      // User activity
      const userActivity = this.calculateUserActivity(logs);
      
      // Security and compliance events
      const securityEvents = logs.filter((l: any) => 
        l.action.startsWith('security.') || 
        l.severity === 'critical'
      );
      
      const complianceEvents = logs.filter((l: any) => 
        l.action.startsWith('compliance.') ||
        l.action.includes('data_') ||
        l.action.includes('consent')
      );
      
      return {
        summary,
        topActions,
        userActivity,
        securityEvents,
        complianceEvents
      };
    } catch (error) {
      console.error('Failed to generate audit report:', error);
      throw error;
    }
  }
  
  /**
   * Export audit logs for compliance
   */
  static async exportLogs(
    startDate: Date,
    endDate: Date,
    format: 'json' | 'csv' = 'json'
  ): Promise<string> {
    try {
      const logs = await this.query({ startDate, endDate });
      
      if (format === 'json') {
        return JSON.stringify(logs, null, 2);
      } else {
        return this.convertToCSV(logs);
      }
    } catch (error) {
      console.error('Failed to export audit logs:', error);
      throw error;
    }
  }
  
  /**
   * Clean up old audit logs (retention policy)
   */
  static async applyRetentionPolicy(): Promise<number> {
    try {
      const retentionDate = new Date();
      retentionDate.setDate(retentionDate.getDate() - this.RETENTION_DAYS);
      
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('timestamp', '<', Timestamp.fromDate(retentionDate)),
        limit(this.BATCH_SIZE)
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return 0;
      }
      
      const batch = writeBatch(db);
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      
      // Log the retention policy application
      await this.log({
        userId: 'system',
        userEmail: 'system',
        action: AuditAction.RETENTION_POLICY_APPLY,
        resource: AuditResource.AUDIT,
        details: {
          deletedCount: snapshot.size,
          retentionDate: retentionDate.toISOString()
        },
        severity: 'info',
        success: true
      });
      
      // Continue if more to delete
      if (snapshot.size === this.BATCH_SIZE) {
        const additionalDeleted = await this.applyRetentionPolicy();
        return snapshot.size + additionalDeleted;
      }
      
      return snapshot.size;
    } catch (error) {
      console.error('Failed to apply retention policy:', error);
      throw error;
    }
  }
  
  /**
   * Get user activity summary
   */
  static async getUserActivitySummary(
    userId: string,
    days: number = 30
  ): Promise<{
    totalActions: number;
    successRate: number;
    topActions: Array<{ action: string; count: number }>;
    recentActivity: AuditLog[];
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const logs = await this.query({
        userId,
        startDate,
        limit: 1000
      });
      
      const totalActions = logs.length;
      const successfulActions = logs.filter((l: any) => l.success).length;
      const successRate = totalActions > 0 ? (successfulActions / totalActions) * 100 : 0;
      
      // Calculate top actions
      const actionCounts = logs.reduce((acc, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const topActions = Object.entries(actionCounts)
        .map(([action, count]) => ({ action, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      
      const recentActivity = logs.slice(0, 10);
      
      return {
        totalActions,
        successRate,
        topActions,
        recentActivity
      };
    } catch (error) {
      console.error('Failed to get user activity summary:', error);
      throw error;
    }
  }
  
  /**
   * Monitor suspicious activity
   */
  static async detectSuspiciousActivity(userId: string): Promise<boolean> {
    try {
      const recentLogs = await this.query({
        userId,
        startDate: new Date(Date.now() - 3600000), // Last hour
        limit: 100
      });
      
      // Check for suspicious patterns
      const failedLogins = recentLogs.filter((l: any) => 
        l.action === AuditAction.LOGIN && !l.success
      ).length;
      
      const criticalEvents = recentLogs.filter((l: any) => 
        l.severity === 'critical'
      ).length;
      
      const dataExports = recentLogs.filter((l: any) => 
        l.action === AuditAction.DATA_EXPORT ||
        l.action === AuditAction.ACCOUNT_EXPORT
      ).length;
      
      // Suspicious if: >5 failed logins, >3 critical events, or >10 data exports
      const isSuspicious = failedLogins > 5 || criticalEvents > 3 || dataExports > 10;
      
      if (isSuspicious) {
        await this.log({
          userId,
          userEmail: recentLogs[0]?.userEmail || 'unknown',
          action: AuditAction.LOGIN,
          resource: AuditResource.SYSTEM,
          details: {
            reason: 'Suspicious activity detected',
            failedLogins,
            criticalEvents,
            dataExports
          },
          severity: 'critical',
          success: false
        });
      }
      
      return isSuspicious;
    } catch (error) {
      console.error('Failed to detect suspicious activity:', error);
      return false;
    }
  }
  
  // Helper methods
  
  private static calculateUserActivity(logs: AuditLog[]): Array<{
    userId: string;
    userEmail: string;
    eventCount: number;
    lastActivity: Date;
  }> {
    const userMap = new Map<string, {
      userEmail: string;
      eventCount: number;
      lastActivity: Date;
    }>();
    
    logs.forEach(log => {
      const existing = userMap.get(log.userId);
      if (existing) {
        existing.eventCount++;
        if (log.timestamp > existing.lastActivity) {
          existing.lastActivity = log.timestamp as Date;
        }
      } else {
        userMap.set(log.userId, {
          userEmail: log.userEmail,
          eventCount: 1,
          lastActivity: log.timestamp as Date
        });
      }
    });
    
    return Array.from(userMap.entries())
      .map(([userId, data]) => ({ userId, ...data }))
      .sort((a, b) => b.eventCount - a.eventCount)
      .slice(0, 20);
  }
  
  private static convertToCSV(logs: AuditLog[]): string {
    const headers = [
      'ID', 'User ID', 'User Email', 'Action', 'Resource', 'Resource ID',
      'Success', 'Severity', 'Timestamp', 'IP Address', 'Details'
    ];
    
    const rows = logs.map((log: any) => [
      log.id || '',
      log.userId,
      log.userEmail,
      log.action,
      log.resource,
      log.resourceId || '',
      log.success.toString(),
      log.severity,
      log.timestamp instanceof Date ? log.timestamp.toISOString() : '',
      log.ipAddress || '',
      JSON.stringify(log.details)
    ]);
    
    return [
      headers.join(','),
      ...rows.map((row: any) => row.map((cell: any) => `"${cell}"`).join(','))
    ].join('\n');
  }
  
  private static async getClientIP(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return 'unknown';
    }
  }
  
  private static async alertSecurityTeam(log: Omit<AuditLog, 'id'>): Promise<void> {
    // In production, this would send alerts via email, SMS, or security monitoring tools
    console.error('SECURITY ALERT:', log);
    
    // Log the alert itself
    await this.log({
      userId: 'system',
      userEmail: 'system',
      action: AuditAction.ADMIN_AUDIT_VIEW,
      resource: AuditResource.SYSTEM,
      details: {
        alert: 'Security team notified',
        originalLog: log
      },
      severity: 'critical',
      success: true
    });
  }
}