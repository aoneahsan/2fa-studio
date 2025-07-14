/**
 * Audit Helper for easy integration
 * @module services/compliance/audit-helper
 */

import { AuditLoggingService, AuditAction, AuditResource } from './audit-logging.service';

/**
 * Decorator for automatic audit logging
 */
export function Audited(
  action: AuditAction,
  resource: AuditResource,
  severity: 'info' | 'warning' | 'critical' = 'info'
) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const startTime = Date.now();
      let success = true;
      let errorMessage: string | undefined;
      let result: unknown;

      try {
        result = await originalMethod.apply(this, args);
        return result;
      } catch (error) {
        success = false;
        errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw error;
      } finally {
        try {
          await AuditLoggingService.log({
            userId: args[0]?.userId || 'unknown',
            userEmail: args[0]?.userEmail || 'unknown',
            action,
            resource,
            resourceId: args[0]?.resourceId || args[0]?.id,
            details: {
              method: propertyKey,
              args: args.map((arg: unknown) => 
                typeof arg === 'object' ? { ...arg, password: '[REDACTED]' } : arg
              ),
              duration: Date.now() - startTime,
              result: success ? 'success' : 'failure'
            },
            severity,
            success,
            errorMessage
          });
        } catch (auditError) {
          console.error('Audit logging failed:', auditError);
        }
      }
    };

    return descriptor;
  };
}

/**
 * Audit log helper for manual logging
 */
export class AuditHelper {
  static async logAuth(
    action: 'login' | 'logout' | 'register' | 'password_reset',
    userId: string,
    userEmail: string,
    success: boolean,
    details?: Record<string, any>
  ) {
    const actionMap = {
      login: AuditAction.LOGIN,
      logout: AuditAction.LOGOUT,
      register: AuditAction.REGISTER,
      password_reset: AuditAction.PASSWORD_RESET
    };

    await AuditLoggingService.log({
      userId,
      userEmail,
      action: actionMap[action],
      resource: AuditResource.USER,
      details: details || {},
      severity: success ? 'info' : 'warning',
      success
    });
  }

  static async logAccountAction(
    action: 'create' | 'update' | 'delete' | 'view' | 'export' | 'import',
    userId: string,
    userEmail: string,
    accountId?: string,
    details?: Record<string, any>
  ) {
    const actionMap = {
      create: AuditAction.ACCOUNT_CREATE,
      update: AuditAction.ACCOUNT_UPDATE,
      delete: AuditAction.ACCOUNT_DELETE,
      view: AuditAction.ACCOUNT_VIEW,
      export: AuditAction.ACCOUNT_EXPORT,
      import: AuditAction.ACCOUNT_IMPORT
    };

    await AuditLoggingService.log({
      userId,
      userEmail,
      action: actionMap[action],
      resource: AuditResource.ACCOUNT,
      resourceId: accountId,
      details: details || {},
      severity: action === 'delete' ? 'warning' : 'info',
      success: true
    });
  }

  static async logSecurityAction(
    action: 'biometric_enable' | 'biometric_disable' | 'device_trust' | 'device_revoke',
    userId: string,
    userEmail: string,
    details?: Record<string, any>
  ) {
    const actionMap = {
      biometric_enable: AuditAction.BIOMETRIC_ENABLE,
      biometric_disable: AuditAction.BIOMETRIC_DISABLE,
      device_trust: AuditAction.DEVICE_TRUST,
      device_revoke: AuditAction.DEVICE_REVOKE
    };

    await AuditLoggingService.log({
      userId,
      userEmail,
      action: actionMap[action],
      resource: AuditResource.DEVICE,
      details: details || {},
      severity: 'warning',
      success: true
    });
  }

  static async logDataAction(
    action: 'backup' | 'restore' | 'export' | 'delete',
    userId: string,
    userEmail: string,
    details?: Record<string, any>
  ) {
    const actionMap = {
      backup: AuditAction.BACKUP_CREATE,
      restore: AuditAction.BACKUP_RESTORE,
      export: AuditAction.DATA_EXPORT,
      delete: AuditAction.DATA_DELETE
    };

    await AuditLoggingService.log({
      userId,
      userEmail,
      action: actionMap[action],
      resource: AuditResource.BACKUP,
      details: details || {},
      severity: action === 'delete' ? 'critical' : 'info',
      success: true
    });
  }

  static async logAdminAction(
    action: string,
    adminId: string,
    adminEmail: string,
    targetUserId?: string,
    details?: Record<string, any>
  ) {
    await AuditLoggingService.log({
      userId: adminId,
      userEmail: adminEmail,
      action: AuditAction.ADMIN_USER_UPDATE,
      resource: AuditResource.USER,
      resourceId: targetUserId,
      details: {
        adminAction: action,
        ...details
      },
      severity: 'warning',
      success: true
    });
  }

  static async logSubscriptionChange(
    action: 'create' | 'update' | 'cancel',
    userId: string,
    userEmail: string,
    tier: string,
    details?: Record<string, any>
  ) {
    const actionMap = {
      create: AuditAction.SUBSCRIPTION_CREATE,
      update: AuditAction.SUBSCRIPTION_UPDATE,
      cancel: AuditAction.SUBSCRIPTION_CANCEL
    };

    await AuditLoggingService.log({
      userId,
      userEmail,
      action: actionMap[action],
      resource: AuditResource.SUBSCRIPTION,
      details: {
        tier,
        ...details
      },
      severity: action === 'cancel' ? 'warning' : 'info',
      success: true
    });
  }

  static async logComplianceAction(
    action: 'consent_update' | 'data_request' | 'deletion_request',
    userId: string,
    userEmail: string,
    details?: Record<string, any>
  ) {
    const actionMap = {
      consent_update: AuditAction.CONSENT_UPDATE,
      data_request: AuditAction.DATA_REQUEST,
      deletion_request: AuditAction.DATA_DELETION_REQUEST
    };

    await AuditLoggingService.log({
      userId,
      userEmail,
      action: actionMap[action],
      resource: AuditResource.USER,
      details: details || {},
      severity: 'info',
      success: true
    });
  }

  static async logError(
    action: AuditAction,
    userId: string,
    userEmail: string,
    error: Error,
    details?: Record<string, any>
  ) {
    await AuditLoggingService.log({
      userId,
      userEmail,
      action,
      resource: AuditResource.SYSTEM,
      details: {
        error: error.message,
        stack: error.stack,
        ...details
      },
      severity: 'critical',
      success: false,
      errorMessage: error.message
    });
  }
}