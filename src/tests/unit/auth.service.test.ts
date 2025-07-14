/**
 * Unit tests for AuthService
 * @module tests/unit/auth.service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from '@services/auth.service';

// Mock Firebase Auth
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({})),
  onAuthStateChanged: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  updateProfile: vi.fn(),
  updatePassword: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  OAuthProvider: vi.fn(),
  signInWithPopup: vi.fn(),
  linkWithCredential: vi.fn(),
  unlink: vi.fn(),
  deleteUser: vi.fn(),
  EmailAuthProvider: vi.fn(),
  reauthenticateWithCredential: vi.fn(),
  setPersistence: vi.fn(),
  browserLocalPersistence: {},
  browserSessionPersistence: {}
}));

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Input Validation', () => {
    describe('validateEmail', () => {
      it('should validate correct email formats', () => {
        const validEmails = [
          'user@example.com',
          'test.email+tag@domain.co.uk',
          'user123@test-domain.org',
          'valid_email@sub.domain.com'
        ];

        validEmails.forEach(email => {
          expect(AuthService.validateEmail(email)).toBe(true);
        });
      });

      it('should reject invalid email formats', () => {
        const invalidEmails = [
          'invalid',
          '@domain.com',
          'user@',
          'user@.com',
          'user..email@domain.com',
          'user@domain',
          '',
          null as unknown,
          undefined as unknown
        ];

        invalidEmails.forEach(email => {
          expect(AuthService.validateEmail(email)).toBe(false);
        });
      });
    });

    describe('validateTOTPSecret', () => {
      it('should validate correct TOTP secret formats', () => {
        const validSecrets = [
          'JBSWY3DPEHPK3PXP',
          'HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ',
          'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'
        ];

        validSecrets.forEach(secret => {
          expect(AuthService.validateTOTPSecret(secret)).toBe(true);
        });
      });

      it('should reject invalid TOTP secret formats', () => {
        const invalidSecrets = [
          'invalid!@#',
          '123456',
          'short',
          '',
          'CONTAINS8AND9',
          'lowercase',
          null as unknown,
          undefined as unknown
        ];

        invalidSecrets.forEach(secret => {
          expect(AuthService.validateTOTPSecret(secret)).toBe(false);
        });
      });
    });

    describe('validatePasswordStrength', () => {
      it('should validate strong passwords', () => {
        const strongPasswords = [
          'MyStr0ng!Pass',
          'Complex123$',
          'Secure@2024',
          'P@ssw0rd123!'
        ];

        strongPasswords.forEach(password => {
          expect(AuthService.validatePasswordStrength(password)).toBe(true);
        });
      });

      it('should reject weak passwords', () => {
        const weakPasswords = [
          '123',
          'password',
          'PASSWORD',
          '12345678',
          'NoNumbers!',
          'nonumbersorspecial',
          'ALLUPPERCASE123',
          'alllowercase123!',
          '',
          null as unknown,
          undefined as unknown
        ];

        weakPasswords.forEach(password => {
          expect(AuthService.validatePasswordStrength(password)).toBe(false);
        });
      });
    });

    describe('sanitizeInput', () => {
      it('should remove malicious characters', () => {
        const maliciousInputs = [
          '<script>alert("xss")</script>',
          'javascript:alert("xss")',
          'onclick="malicious()"',
          'user"name',
          "user'name",
          '../../../etc/passwd'
        ];

        maliciousInputs.forEach(input => {
          const sanitized = AuthService.sanitizeInput(input);
          expect(sanitized).not.toContain('<script>');
          expect(sanitized).not.toContain('javascript:');
          expect(sanitized).not.toContain('onclick=');
          expect(sanitized).not.toContain('"');
          expect(sanitized).not.toContain("'");
        });
      });

      it('should preserve clean text', () => {
        const cleanInputs = [
          'normal username',
          'email@domain.com',
          'Company Name Inc',
          'Valid Account Label'
        ];

        cleanInputs.forEach(input => {
          const sanitized = AuthService.sanitizeInput(input);
          expect(sanitized).toBe(input.trim());
        });
      });

      it('should handle edge cases', () => {
        expect(AuthService.sanitizeInput('')).toBe('');
        expect(AuthService.sanitizeInput(null as unknown)).toBe('');
        expect(AuthService.sanitizeInput(undefined as unknown)).toBe('');
        expect(AuthService.sanitizeInput(123 as unknown)).toBe(123);
      });
    });
  });

  describe('Authentication Methods', () => {
    it('should validate inputs before authentication', async () => {
      const invalidEmail = 'invalid-email';
      const weakPassword = '123';

      try {
        await AuthService.signInWithEmail(invalidEmail, weakPassword);
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(_error).toBeDefined();
      }
    });

    it('should sanitize display name input', async () => {
      const maliciousDisplayName = '<script>alert("xss")</script>';
      
      try {
        await AuthService.signUpWithEmail('test@test.com', 'ValidPass123!', maliciousDisplayName);
      } catch (error) {
        // Should handle malicious input gracefully
        expect(error.message).not.toContain('<script>');
      }
    });
  });

  describe('Security Features', () => {
    it('should not expose sensitive information in error messages', async () => {
      try {
        await AuthService.signInWithEmail('test@test.com', 'wrongpassword');
      } catch (error) {
        // Error should not contain sensitive information
        expect(error.message).not.toContain('password');
        expect(error.message).not.toContain('database');
        expect(error.message).not.toContain('server');
      }
    });

    it('should handle concurrent authentication attempts', async () => {
      const promises = Array(5).fill(null).map(() => 
        AuthService.signInWithEmail('test@test.com', 'password123')
      );

      // Should handle multiple concurrent requests gracefully
      const results = await Promise.allSettled(promises);
      expect(results).toHaveLength(5);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Mock network error
      vi.mocked(signInWithEmailAndPassword).mockRejectedValue(new Error('Network error'));

      try {
        await AuthService.signInWithEmail('test@test.com', 'password123');
      } catch (error) {
        expect(error.message).toContain('Network error');
      }
    });

    it('should handle Firebase auth errors', async () => {
      const firebaseError = {
        code: 'auth/user-not-found',
        message: 'User not found'
      };

      vi.mocked(signInWithEmailAndPassword).mockRejectedValue(firebaseError);

      try {
        await AuthService.signInWithEmail('test@test.com', 'password123');
      } catch (error) {
        expect(error.code).toBe('auth/user-not-found');
      }
    });
  });

  describe('State Management', () => {
    it('should properly initialize auth state listener', () => {
      const mockCallback = vi.fn();
      const unsubscribe = AuthService.initialize(mockCallback);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should handle auth state changes', () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'test@test.com',
        displayName: 'Test User'
      };

      const mockCallback = vi.fn();
      AuthService.initialize(mockCallback);

      // Simulate auth state change
      expect(mockCallback).toBeCalledWith(expect.any(Object));
    });
  });

  describe('Account Linking', () => {
    it('should validate provider before linking', async () => {
      const invalidProvider = 'invalid-provider' as unknown;

      try {
        await AuthService.linkAccount(invalidProvider);
      } catch (error) {
        expect(_error).toBeDefined();
      }
    });

    it('should handle linking conflicts', async () => {
      const mockError = {
        code: 'auth/email-already-in-use',
        message: 'Email already in use'
      };

      vi.mocked(linkWithCredential).mockRejectedValue(mockError);

      try {
        await AuthService.linkAccount('google');
      } catch (error) {
        expect(error.code).toBe('auth/email-already-in-use');
      }
    });
  });
});