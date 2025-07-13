/**
 * Unit tests for FirestoreService
 * @module tests/unit/firestore.service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FirestoreService } from '@services/firestore.service';

// Mock Firebase Firestore
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  doc: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  startAfter: vi.fn(),
  getDocs: vi.fn(),
  getDoc: vi.fn(),
  addDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  onSnapshot: vi.fn(),
  serverTimestamp: vi.fn(() => ({ isEqual: () => false })),
  writeBatch: vi.fn(),
  runTransaction: vi.fn(),
  enableNetwork: vi.fn(),
  disableNetwork: vi.fn(),
  waitForPendingWrites: vi.fn()
}));

describe('FirestoreService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Data Sanitization', () => {
    describe('sanitizeInput', () => {
      it('should sanitize string inputs', () => {
        const maliciousStrings = [
          '<script>alert("xss")</script>',
          'javascript:alert("malicious")',
          'onclick="hack()"',
          '../../../etc/passwd',
          '${process.env.SECRET}',
          'user"name',
          "user'name"
        ];

        maliciousStrings.forEach(input => {
          const sanitized = FirestoreService.sanitizeInput(input);
          expect(sanitized).not.toContain('<script>');
          expect(sanitized).not.toContain('javascript:');
          expect(sanitized).not.toContain('onclick=');
          expect(sanitized).not.toContain('../');
          expect(sanitized).not.toContain('${');
          expect(sanitized).not.toContain('"');
          expect(sanitized).not.toContain("'");
        });
      });

      it('should sanitize object inputs recursively', () => {
        const maliciousObject = {
          name: '<script>alert("xss")</script>',
          description: 'javascript:malicious()',
          nested: {
            field: '../../../secret',
            array: ['${injection}', 'onclick="bad()"']
          }
        };

        const sanitized = FirestoreService.sanitizeInput(maliciousObject);

        expect(sanitized.name).not.toContain('<script>');
        expect(sanitized.description).not.toContain('javascript:');
        expect(sanitized.nested.field).not.toContain('../');
        expect(sanitized.nested.array[0]).not.toContain('${');
        expect(sanitized.nested.array[1]).not.toContain('onclick=');
      });

      it('should handle arrays properly', () => {
        const maliciousArray = [
          '<script>',
          'javascript:alert()',
          { malicious: '../../../' }
        ];

        const sanitized = FirestoreService.sanitizeInput(maliciousArray);

        expect(sanitized[0]).not.toContain('<script>');
        expect(sanitized[1]).not.toContain('javascript:');
        expect(sanitized[2].malicious).not.toContain('../');
      });

      it('should preserve clean data', () => {
        const cleanData = {
          name: 'Valid Account Name',
          email: 'user@domain.com',
          number: 123,
          boolean: true,
          array: ['item1', 'item2']
        };

        const sanitized = FirestoreService.sanitizeInput(cleanData);

        expect(sanitized).toEqual({
          name: 'Valid Account Name',
          email: 'user@domain.com',
          number: 123,
          boolean: true,
          array: ['item1', 'item2']
        });
      });
    });

    describe('sanitizeBackupData', () => {
      it('should sanitize backup data structure', () => {
        const maliciousBackup = {
          version: '1.0',
          accounts: [
            {
              issuer: '<script>evil()</script>',
              secret: '${SECRET_KEY}',
              label: '../../../passwd'
            }
          ],
          settings: {
            theme: 'javascript:hack()'
          }
        };

        const sanitized = FirestoreService.sanitizeBackupData(maliciousBackup);

        expect(sanitized.accounts[0].issuer).not.toContain('<script>');
        expect(sanitized.accounts[0].secret).not.toContain('${');
        expect(sanitized.accounts[0].label).not.toContain('../');
        expect(sanitized.settings.theme).not.toContain('javascript:');
      });
    });
  });

  describe('User Access Validation', () => {
    describe('validateUserAccess', () => {
      it('should allow access to user own data', () => {
        const userId = 'user123';
        const validPaths = [
          `users/${userId}`,
          `users/${userId}/accounts`,
          `users/${userId}/subscriptions`,
          `users/${userId}/backups`,
          `users/${userId}/devices`,
          `users/${userId}/accounts/account1`,
          `users/${userId}/subscriptions/sub1`
        ];

        validPaths.forEach(path => {
          expect(FirestoreService.validateUserAccess(path, userId)).toBe(true);
        });
      });

      it('should deny access to other users data', () => {
        const userId = 'user123';
        const otherUserId = 'user456';
        const invalidPaths = [
          `users/${otherUserId}`,
          `users/${otherUserId}/accounts`,
          `users/${otherUserId}/subscriptions`,
          'admin/users',
          'global/settings',
          'system/config'
        ];

        invalidPaths.forEach(path => {
          expect(FirestoreService.validateUserAccess(path, userId)).toBe(false);
        });
      });

      it('should handle edge cases', () => {
        const userId = 'user123';
        
        expect(FirestoreService.validateUserAccess('', userId)).toBe(false);
        expect(FirestoreService.validateUserAccess('invalid-path', userId)).toBe(false);
        expect(FirestoreService.validateUserAccess(`users/${userId}`, '')).toBe(false);
      });
    });
  });

  describe('Document Operations', () => {
    it('should sanitize data before creating documents', async () => {
      const maliciousData = {
        name: '<script>alert("xss")</script>',
        description: 'javascript:malicious()'
      };

      // Mock successful document creation
      const mockDocRef = { id: 'doc123' };
      vi.mocked(addDoc).mockResolvedValue(mockDocRef as unknown);

      const documentId = await FirestoreService.createDocument(
        'users/test/accounts',
        maliciousData
      );

      expect(documentId).toBe('doc123');
      // Verify that addDoc was called with sanitized data
      expect(addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          name: expect.not.stringContaining('<script>'),
          description: expect.not.stringContaining('javascript:')
        })
      );
    });

    it('should sanitize data before updating documents', async () => {
      const maliciousUpdate = {
        notes: '../../../etc/passwd',
        label: '${SECRET_INJECTION}'
      };

      await FirestoreService.updateDocument(
        'users/test/accounts',
        'account123',
        maliciousUpdate
      );

      // Verify that updateDoc was called with sanitized data
      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          notes: expect.not.stringContaining('../'),
          label: expect.not.stringContaining('${')
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle Firestore errors gracefully', async () => {
      const firestoreError = new Error('Firestore: permission denied');
      vi.mocked(getDoc).mockRejectedValue(firestoreError);

      try {
        await FirestoreService.getDocument('users/test', 'doc123');
      } catch (_error) {
        expect(error.message).toContain('permission denied');
      }
    });

    it('should handle network connectivity issues', async () => {
      const networkError = new Error('Network request failed');
      vi.mocked(getDocs).mockRejectedValue(networkError);

      try {
        await FirestoreService.getCollection('users');
      } catch (_error) {
        expect(error.message).toContain('Network request failed');
      }
    });

    it('should handle invalid document references', async () => {
      try {
        await FirestoreService.getDocument('', '');
      } catch (_error) {
        expect(_error).toBeDefined();
      }
    });
  });

  describe('Offline Support', () => {
    it('should enable offline persistence', async () => {
      await FirestoreService.initialize();
      // Verify offline persistence setup
      expect(enableNetwork).toHaveBeenCalled();
    });

    it('should handle offline/online transitions', async () => {
      await FirestoreService.enableOffline();
      expect(disableNetwork).toHaveBeenCalled();

      await FirestoreService.enableOnline();
      expect(enableNetwork).toHaveBeenCalled();
    });

    it('should wait for pending writes', async () => {
      await FirestoreService.waitForPendingWrites();
      expect(waitForPendingWrites).toHaveBeenCalled();
    });
  });

  describe('Real-time Subscriptions', () => {
    it('should create document subscriptions', () => {
      const mockCallback = vi.fn();
      const mockErrorCallback = vi.fn();
      const mockUnsubscribe = vi.fn();

      vi.mocked(onSnapshot).mockReturnValue(mockUnsubscribe);

      const unsubscribe = FirestoreService.subscribeToDocument(
        'users/test',
        'doc123',
        mockCallback,
        mockErrorCallback
      );

      expect(onSnapshot).toHaveBeenCalled();
      expect(typeof unsubscribe).toBe('function');
    });

    it('should create collection subscriptions', () => {
      const mockCallback = vi.fn();
      const mockErrorCallback = vi.fn();
      const mockUnsubscribe = vi.fn();

      vi.mocked(onSnapshot).mockReturnValue(mockUnsubscribe);

      const unsubscribe = FirestoreService.subscribeToCollection(
        'users/test/accounts',
        [],
        mockCallback,
        mockErrorCallback
      );

      expect(onSnapshot).toHaveBeenCalled();
      expect(typeof unsubscribe).toBe('function');
    });

    it('should handle subscription cleanup', () => {
      const subscriptionKey = 'test-subscription';
      const mockUnsubscribe = vi.fn();

      // Add subscription
      FirestoreService['syncListeners'].set(subscriptionKey, mockUnsubscribe);

      // Unsubscribe
      FirestoreService.unsubscribe(subscriptionKey);

      expect(mockUnsubscribe).toHaveBeenCalled();
      expect(FirestoreService['syncListeners'].has(subscriptionKey)).toBe(false);
    });
  });

  describe('Batch Operations', () => {
    it('should perform batch writes safely', async () => {
      const operations = [
        {
          type: 'create' as const,
          collection: 'users/test/accounts',
          data: { name: 'Test Account' }
        },
        {
          type: 'update' as const,
          collection: 'users/test/accounts',
          id: 'account1',
          data: { updated: true }
        }
      ];

      const mockBatch = {
        set: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined)
      };

      vi.mocked(writeBatch).mockReturnValue(mockBatch as unknown);

      await FirestoreService.batchWrite(operations);

      expect(writeBatch).toHaveBeenCalled();
      expect(mockBatch.commit).toHaveBeenCalled();
    });
  });

  describe('Transaction Support', () => {
    it('should handle transactions', async () => {
      const mockTransaction = {
        get: vi.fn(),
        set: vi.fn(),
        update: vi.fn(),
        delete: vi.fn()
      };

      const transactionCallback = vi.fn().mockResolvedValue('success');
      vi.mocked(runTransaction).mockImplementation((_, callback) => 
        callback(mockTransaction as unknown)
      );

      const result = await FirestoreService.runTransaction(transactionCallback);

      expect(runTransaction).toHaveBeenCalled();
      expect(transactionCallback).toHaveBeenCalledWith(mockTransaction);
    });
  });
});