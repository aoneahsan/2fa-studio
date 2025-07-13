/**
 * Audit Log Service Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuditLogService } from '@services/audit-log.service';
import { collection, addDoc, getDocs, query } from 'firebase/firestore';
import { auth } from '@src/config/firebase';
import { DeviceService } from '@services/device.service';

// Mock Firebase
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  addDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  startAfter: vi.fn(),
  serverTimestamp: vi.fn(() => new Date()),
  Timestamp: {
    fromDate: vi.fn((date) => date)
  }
}));

vi.mock('@src/config/firebase', () => ({
  db: {},
  _auth: {
    currentUser: null
  }
}));

vi.mock('@services/device.service', () => ({
  DeviceService: {
    getDeviceId: vi.fn(() => Promise.resolve('test-device-id')),
    getSessionId: vi.fn(() => 'test-session-id')
  }
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: vi.fn(() => 'web')
  }
}));

describe('AuditLogService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // @ts-ignore
    auth.currentUser = {
      uid: 'test-user-id'
    };
  });

  afterEach(() => {
    // @ts-ignore
    auth.currentUser = null;
  });

  describe('log', () => {
    it('should log an audit event', async () => {
      const mockEntry = {
        action: 'auth.login' as const,
        resource: 'auth',
        severity: 'info' as const,
        success: true,
        details: { email: 'test@example.com' }
      };

      vi.mocked(addDoc).mockResolvedValueOnce({ id: 'log-id' } as unknown);

      await AuditLogService.log(mockEntry);

      expect(addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          ...mockEntry,
          userId: 'test-user-id',
          deviceId: 'test-device-id',
          sessionId: 'test-session-id',
          platform: 'web',
          userAgent: expect.any(String),
          appVersion: '1.0.0'
        })
      );
    });

    it('should log event for anonymous user when no auth user', async () => {
      // @ts-ignore
      auth.currentUser = null;

      const mockEntry = {
        action: 'auth.failed_login' as const,
        resource: 'auth',
        severity: 'warning' as const,
        success: false,
        details: { email: 'test@example.com' }
      };

      vi.mocked(addDoc).mockResolvedValueOnce({ id: 'log-id' } as unknown);

      await AuditLogService.log(mockEntry);

      expect(addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          ...mockEntry,
          userId: 'anonymous'
        })
      );
    });

    it('should not throw on logging error', async () => {
      const mockEntry = {
        action: 'auth.login' as const,
        resource: 'auth',
        severity: 'info' as const,
        success: true
      };

      vi.mocked(addDoc).mockRejectedValueOnce(new Error('Database error'));

      // Should not throw
      await expect(AuditLogService.log(mockEntry)).resolves.toBeUndefined();
    });
  });

  describe('searchLogs', () => {
    it('should search logs with filters', async () => {
      const mockDocs = [
        {
          id: 'log1',
          data: () => ({
            userId: 'user1',
            action: 'auth.login',
            resource: 'auth',
            timestamp: { toDate: () => new Date() },
            ipAddress: '1.2.3.4',
            deviceId: 'device1'
          })
        },
        {
          id: 'log2',
          data: () => ({
            userId: 'user1',
            action: 'auth.logout',
            resource: 'auth',
            timestamp: { toDate: () => new Date() },
            ipAddress: '1.2.3.4',
            deviceId: 'device1'
          })
        }
      ];

      vi.mocked(getDocs).mockResolvedValueOnce({
        docs: mockDocs,
        size: mockDocs.length
      } as unknown);

      const result = await AuditLogService.searchLogs({
        userId: 'user1',
        pageSize: 50
      });

      expect(result.logs).toHaveLength(2);
      expect(result.logs[0]).toMatchObject({
        id: 'log1',
        userId: 'user1',
        action: 'auth.login'
      });
      expect(result.hasMore).toBe(false);
    });

    it('should handle pagination', async () => {
      const mockDocs = Array(51).fill(null).map((_, i) => ({
        id: `log${i}`,
        data: () => ({
          userId: 'user1',
          action: 'auth.login',
          resource: 'auth',
          timestamp: { toDate: () => new Date() }
        })
      }));

      vi.mocked(getDocs).mockResolvedValueOnce({
        docs: mockDocs,
        size: mockDocs.length
      } as unknown);

      const result = await AuditLogService.searchLogs({
        userId: 'user1',
        pageSize: 50
      });

      expect(result.logs).toHaveLength(50);
      expect(result.hasMore).toBe(true);
    });
  });

  describe('detectSuspiciousActivity', () => {
    it('should detect multiple failed login attempts', async () => {
      const mockFailedLogins = Array(5).fill(null).map((_, i) => ({
        id: `log${i}`,
        data: () => ({
          userId: 'user1',
          action: 'auth.failed_login',
          success: false,
          timestamp: { toDate: () => new Date() }
        })
      }));

      // First call for failed logins
      vi.mocked(getDocs).mockResolvedValueOnce({
        docs: mockFailedLogins,
        size: mockFailedLogins.length
      } as unknown);

      vi.mocked(addDoc).mockResolvedValueOnce({ id: 'alert-log' } as unknown);

      const isSuspicious = await AuditLogService.detectSuspiciousActivity('user1');

      expect(isSuspicious).toBe(true);
      expect(addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          action: 'auth.suspicious_activity',
          severity: 'critical',
          success: false
        })
      );
    });

    it('should detect access from multiple devices', async () => {
      const mockAccessLogs = Array(10).fill(null).map((_, i) => ({
        id: `log${i}`,
        data: () => ({
          userId: 'user1',
          action: 'auth.login',
          timestamp: { toDate: () => new Date() },
          deviceId: `device${i % 4}`, // 4 different devices
          ipAddress: `1.2.3.${i % 6}` // 6 different IPs
        })
      }));

      // First call for failed logins (none)
      vi.mocked(getDocs).mockResolvedValueOnce({
        docs: [],
        size: 0
      } as unknown);

      // Second call for recent access
      vi.mocked(getDocs).mockResolvedValueOnce({
        docs: mockAccessLogs,
        size: mockAccessLogs.length
      } as unknown);

      vi.mocked(addDoc).mockResolvedValueOnce({ id: 'alert-log' } as unknown);

      const isSuspicious = await AuditLogService.detectSuspiciousActivity('user1');

      expect(isSuspicious).toBe(true);
      expect(addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          action: 'auth.suspicious_activity',
          severity: 'warning',
          details: expect.objectContaining({
            reason: 'Access from multiple devices/locations'
          })
        })
      );
    });
  });

  describe('getStats', () => {
    it('should calculate audit log statistics', async () => {
      const mockLogs = [
        {
          id: 'log1',
          data: () => ({
            userId: 'user1',
            action: 'auth.login',
            success: true,
            severity: 'info',
            timestamp: { toDate: () => new Date() }
          })
        },
        {
          id: 'log2',
          data: () => ({
            userId: 'user2',
            action: 'auth.failed_login',
            success: false,
            severity: 'warning',
            timestamp: { toDate: () => new Date() }
          })
        },
        {
          id: 'log3',
          data: () => ({
            userId: 'user1',
            action: 'auth.suspicious_activity',
            success: false,
            severity: 'critical',
            timestamp: { toDate: () => new Date() }
          })
        }
      ];

      vi.mocked(getDocs).mockResolvedValueOnce({
        docs: mockLogs,
        size: mockLogs.length
      } as unknown);

      const stats = await AuditLogService.getStats();

      expect(stats).toMatchObject({
        totalEvents: 3,
        failedAttempts: 2,
        suspiciousActivities: 1,
        uniqueUsers: 2
      });
      expect(stats.topActions).toContainEqual({
        action: 'auth.login',
        count: 1
      });
    });
  });

  describe('exportLogs', () => {
    it('should export logs as CSV', async () => {
      const mockLogs = [
        {
          id: 'log1',
          data: () => ({
            userId: 'user1',
            action: 'auth.login',
            resource: 'auth',
            timestamp: { toDate: () => new Date('2024-01-01') },
            ipAddress: '1.2.3.4',
            deviceId: 'device1',
            details: { email: 'test@example.com' }
          })
        }
      ];

      vi.mocked(getDocs).mockResolvedValueOnce({
        docs: mockLogs,
        size: mockLogs.length
      } as unknown);

      vi.mocked(addDoc).mockResolvedValueOnce({ id: 'export-log' } as unknown);

      const csv = await AuditLogService.exportLogs(
        'user1',
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(csv).toContain('Timestamp,Action,Resource,IP Address,Device ID,Details');
      expect(csv).toContain('auth.login');
      expect(csv).toContain('1.2.3.4');
      expect(csv).toContain('test@example.com');
      
      // Should log the export action
      expect(addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          action: 'data.gdpr_export',
          resource: 'audit_logs'
        })
      );
    });
  });
});