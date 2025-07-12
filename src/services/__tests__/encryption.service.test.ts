import { describe, it, expect } from 'vitest';
import { EncryptionService } from '../encryption.service';

describe('EncryptionService', () => {
  const testPassword = 'testPassword123!';
  const testData = 'This is secret data';

  describe('generateSalt', () => {
    it('should generate a salt of correct length', () => {
      const salt = EncryptionService.generateSalt();
      expect(salt).toHaveLength(32); // 16 bytes in hex = 32 characters
    });

    it('should generate unique salts', () => {
      const salt1 = EncryptionService.generateSalt();
      const salt2 = EncryptionService.generateSalt();
      expect(salt1).not.toBe(salt2);
    });
  });

  describe('deriveKey', () => {
    it('should derive a key from password and salt', async () => {
      const salt = EncryptionService.generateSalt();
      const key = await EncryptionService.deriveKey(testPassword, salt);
      expect(key).toBeDefined();
      expect(key.length).toBeGreaterThan(0);
    });

    it('should produce same key for same password and salt', async () => {
      const salt = EncryptionService.generateSalt();
      const key1 = await EncryptionService.deriveKey(testPassword, salt);
      const key2 = await EncryptionService.deriveKey(testPassword, salt);
      expect(key1).toBe(key2);
    });

    it('should produce different keys for different passwords', async () => {
      const salt = EncryptionService.generateSalt();
      const key1 = await EncryptionService.deriveKey('password1', salt);
      const key2 = await EncryptionService.deriveKey('password2', salt);
      expect(key1).not.toBe(key2);
    });
  });

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt data correctly', async () => {
      const encrypted = await EncryptionService.encrypt(testData, testPassword);
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(testData);

      const decrypted = await EncryptionService.decrypt(encrypted, testPassword);
      expect(decrypted).toBe(testData);
    });

    it('should fail to decrypt with wrong password', async () => {
      const encrypted = await EncryptionService.encrypt(testData, testPassword);
      
      await expect(
        EncryptionService.decrypt(encrypted, 'wrongPassword')
      ).rejects.toThrow();
    });

    it('should handle empty data', async () => {
      const encrypted = await EncryptionService.encrypt('', testPassword);
      const decrypted = await EncryptionService.decrypt(encrypted, testPassword);
      expect(decrypted).toBe('');
    });

    it('should handle special characters', async () => {
      const specialData = '!@#$%^&*()_+-=[]{}|;\':",./<>?`~😀';
      const encrypted = await EncryptionService.encrypt(specialData, testPassword);
      const decrypted = await EncryptionService.decrypt(encrypted, testPassword);
      expect(decrypted).toBe(specialData);
    });
  });

  describe('generateSecurePassword', () => {
    it('should generate password of specified length', () => {
      const lengths = [8, 12, 16, 20];
      lengths.forEach(length => {
        const password = EncryptionService.generateSecurePassword(length);
        expect(password).toHaveLength(length);
      });
    });

    it('should generate unique passwords', () => {
      const passwords = new Set();
      for (let i = 0; i < 100; i++) {
        passwords.add(EncryptionService.generateSecurePassword());
      }
      expect(passwords.size).toBe(100);
    });
  });

  describe('checkPasswordStrength', () => {
    it('should rate weak passwords correctly', () => {
      const weakPasswords = ['123456', 'password', 'abc123', 'qwerty'];
      weakPasswords.forEach(pwd => {
        const strength = EncryptionService.checkPasswordStrength(pwd);
        expect(strength.score).toBeLessThan(3);
        expect(strength.level).toBe('weak');
      });
    });

    it('should rate strong passwords correctly', () => {
      const strongPassword = 'MyStr0ng!P@ssw0rd123';
      const strength = EncryptionService.checkPasswordStrength(strongPassword);
      expect(strength.score).toBeGreaterThanOrEqual(4);
      expect(strength.level).toBe('strong');
    });

    it('should provide feedback for improvements', () => {
      const strength = EncryptionService.checkPasswordStrength('simplepassword');
      expect(strength.feedback).toContain('uppercase');
      expect(strength.feedback).toContain('number');
      expect(strength.feedback).toContain('special character');
    });
  });

  describe('hashPassword', () => {
    it('should hash password consistently', async () => {
      const hash1 = await EncryptionService.hashPassword(testPassword);
      const hash2 = await EncryptionService.hashPassword(testPassword);
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different passwords', async () => {
      const hash1 = await EncryptionService.hashPassword('password1');
      const hash2 = await EncryptionService.hashPassword('password2');
      expect(hash1).not.toBe(hash2);
    });
  });
});