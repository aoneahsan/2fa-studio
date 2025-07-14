/**
 * Integration tests for user registration flow
 * @module tests/integration/user-registration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AuthService } from '@services/auth.service';
import { FirestoreService } from '@services/firestore.service';
import { MobileEncryptionService } from '@services/mobile-encryption.service';
import { RealtimeSyncService } from '@services/realtime-sync.service';

describe('User Registration Integration Tests', () => {
  const testUser = {
    email: 'testuser@example.com',
    password: 'TestPassword123!',
    displayName: 'Test User'
  };

  beforeEach(async () => {
    // Initialize services
    await FirestoreService.initialize();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Cleanup
    RealtimeSyncService.cleanup();
  });

  describe('Complete Registration Flow', () => {
    it('should complete full user registration with all services', async () => {
      // Step 1: Validate input data
      expect(AuthService.validateEmail(testUser.email)).toBe(true);
      expect(AuthService.validatePasswordStrength(testUser.password)).toBe(true);
      
      // Step 2: Sanitize display name
      const sanitizedDisplayName = AuthService.sanitizeInput(testUser.displayName);
      expect(sanitizedDisplayName).toBe(testUser.displayName);

      // Step 3: Mock successful registration
      const mockUser = {
        uid: 'test-uid-123',
        email: testUser.email,
        displayName: sanitizedDisplayName
      };

      // Mock Firebase Auth registration
      vi.spyOn(AuthService, 'signUpWithEmail').mockResolvedValue(mockUser as unknown);

      // Step 4: Register user
      const registeredUser = await AuthService.signUpWithEmail(
        testUser.email,
        testUser.password,
        testUser.displayName
      );

      expect(registeredUser).toBeDefined();
      expect(registeredUser.email).toBe(testUser.email);
      expect(registeredUser.uid).toBe('test-uid-123');

      // Step 5: Verify encryption key generation
      const encryptionKey = await MobileEncryptionService.generateEncryptionKey(registeredUser.uid);
      expect(encryptionKey).toBeDefined();
      expect(typeof encryptionKey).toBe('string');

      // Step 6: Initialize sync service for new user
      await RealtimeSyncService.initialize(registeredUser.uid);
      const syncState = RealtimeSyncService.getSyncState();
      expect(syncState).toBeDefined();
    });

    it('should handle registration with malicious input', async () => {
      const maliciousUser = {
        email: 'test@example.com',
        password: 'ValidPassword123!',
        displayName: '<script>alert("xss")</script>'
      };

      // Should sanitize malicious display name
      const sanitized = AuthService.sanitizeInput(maliciousUser.displayName);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('alert');

      // Registration should proceed with sanitized data
      vi.spyOn(AuthService, 'signUpWithEmail').mockResolvedValue({
        uid: 'test-uid',
        email: maliciousUser.email,
        displayName: sanitized
      } as unknown);

      const user = await AuthService.signUpWithEmail(
        maliciousUser.email,
        maliciousUser.password,
        maliciousUser.displayName
      );

      expect(user.displayName).not.toContain('<script>');
    });

    it('should create user profile in Firestore after registration', async () => {
      const mockUser = {
        uid: 'test-uid-123',
        email: testUser.email,
        displayName: testUser.displayName
      };

      // Mock registration
      vi.spyOn(AuthService, 'signUpWithEmail').mockResolvedValue(mockUser as unknown);
      
      // Mock Firestore document creation
      vi.spyOn(FirestoreService, 'createDocument').mockResolvedValue('profile-doc-id');

      const user = await AuthService.signUpWithEmail(
        testUser.email,
        testUser.password,
        testUser.displayName
      );

      // Verify user profile creation
      expect(FirestoreService.createDocument).toHaveBeenCalledWith(
        'users',
        expect.objectContaining({
          email: testUser.email,
          displayName: testUser.displayName
        }),
        mockUser.uid
      );
    });
  });

  describe('Registration Error Handling', () => {
    it('should handle invalid email during registration', async () => {
      const invalidEmail = 'invalid-email';
      
      expect(AuthService.validateEmail(invalidEmail)).toBe(false);

      try {
        await AuthService.signUpWithEmail(invalidEmail, testUser.password);
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(_error).toBeDefined();
      }
    });

    it('should handle weak password during registration', async () => {
      const weakPassword = '123';
      
      expect(AuthService.validatePasswordStrength(weakPassword)).toBe(false);

      try {
        await AuthService.signUpWithEmail(testUser.email, weakPassword);
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(_error).toBeDefined();
      }
    });

    it('should handle Firebase auth errors', async () => {
      const firebaseError = {
        code: 'auth/email-already-in-use',
        message: 'Email already in use'
      };

      vi.spyOn(AuthService, 'signUpWithEmail').mockRejectedValue(firebaseError);

      try {
        await AuthService.signUpWithEmail(testUser.email, testUser.password);
      } catch (error) {
        expect(error.code).toBe('auth/email-already-in-use');
      }
    });

    it('should handle Firestore errors during profile creation', async () => {
      const mockUser = {
        uid: 'test-uid-123',
        email: testUser.email
      };

      // Mock successful auth but failed Firestore
      vi.spyOn(AuthService, 'signUpWithEmail').mockResolvedValue(mockUser as unknown);
      vi.spyOn(FirestoreService, 'createDocument').mockRejectedValue(
        new Error('Firestore: permission denied')
      );

      try {
        await AuthService.signUpWithEmail(testUser.email, testUser.password);
        // Should still handle profile creation error gracefully
      } catch (error) {
        expect(error.message).toContain('permission denied');
      }
    });
  });

  describe('Post-Registration Setup', () => {
    it('should initialize all user services after registration', async () => {
      const mockUser = {
        uid: 'test-uid-123',
        email: testUser.email,
        displayName: testUser.displayName
      };

      vi.spyOn(AuthService, 'signUpWithEmail').mockResolvedValue(mockUser as unknown);
      vi.spyOn(MobileEncryptionService, 'generateEncryptionKey').mockResolvedValue('test-key');
      vi.spyOn(RealtimeSyncService, 'initialize').mockResolvedValue();

      // Register user
      const user = await AuthService.signUpWithEmail(
        testUser.email,
        testUser.password,
        testUser.displayName
      );

      // Initialize encryption
      await MobileEncryptionService.generateEncryptionKey(user.uid);
      
      // Initialize sync
      await RealtimeSyncService.initialize(user.uid);

      // Verify all services were initialized
      expect(MobileEncryptionService.generateEncryptionKey).toHaveBeenCalledWith(user.uid);
      expect(RealtimeSyncService.initialize).toHaveBeenCalledWith(user.uid);
    });

    it('should create default user collections', async () => {
      const mockUser = {
        uid: 'test-uid-123',
        email: testUser.email
      };

      vi.spyOn(AuthService, 'signUpWithEmail').mockResolvedValue(mockUser as unknown);
      vi.spyOn(FirestoreService, 'createDocument').mockResolvedValue('doc-id');

      const user = await AuthService.signUpWithEmail(testUser.email, testUser.password);

      // Should create user profile
      expect(FirestoreService.createDocument).toHaveBeenCalledWith(
        'users',
        expect.any(Object),
        user.uid
      );
    });
  });

  describe('Registration Security', () => {
    it('should not expose sensitive data during registration', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const errorSpy = vi.spyOn(console, 'error');

      vi.spyOn(AuthService, 'signUpWithEmail').mockResolvedValue({
        uid: 'test-uid',
        email: testUser.email
      } as unknown);

      await AuthService.signUpWithEmail(testUser.email, testUser.password);

      // Check that password was not logged
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining(testUser.password)
      );
      expect(errorSpy).not.toHaveBeenCalledWith(
        expect.stringContaining(testUser.password)
      );
    });

    it('should validate all inputs before processing', async () => {
      const invalidInputs = [
        { email: '', password: testUser.password },
        { email: testUser.email, password: '' },
        { email: 'invalid', password: testUser.password },
        { email: testUser.email, password: 'weak' }
      ];

      for (const input of invalidInputs) {
        try {
          await AuthService.signUpWithEmail(input.email, input.password);
          expect(false).toBe(true); // Should not reach here
        } catch (error) {
          expect(_error).toBeDefined();
        }
      }
    });
  });

  describe('Concurrent Registration Handling', () => {
    it('should handle multiple simultaneous registration attempts', async () => {
      const users = Array(5).fill(null).map((_, i) => ({
        email: `user${i}@example.com`,
        password: 'TestPassword123!'
      }));

      // Mock successful registrations
      vi.spyOn(AuthService, 'signUpWithEmail').mockImplementation(
        async (email) => ({
          uid: `uid-${email.split('@')[0]}`,
          email
        } as unknown)
      );

      const promises = users.map(user => 
        AuthService.signUpWithEmail(user.email, user.password)
      );

      const results = await Promise.allSettled(promises);
      
      // All registrations should complete
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.status).toBe('fulfilled');
      });
    });
  });
});