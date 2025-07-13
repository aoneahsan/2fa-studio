import { describe, it, expect } from 'vitest';
import { EncryptionService } from '@services/encryption.service';

describe('EncryptionService', () => {
  const testPassword = 'testPassword123!';
  const testData = 'This is secret data';

  // Note: generateSalt and deriveKey are private methods, so we test them through encrypt/decrypt

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt data correctly', async () => {
      const encrypted = await EncryptionService.encrypt({
        data: testData,
        password: testPassword
      });
      
      expect(encrypted).toBeDefined();
      expect(encrypted.data).toBeDefined();
      expect(encrypted.salt).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.iterations).toBe(100000);

      const decrypted = await EncryptionService.decrypt({
        encryptedData: JSON.stringify(encrypted),
        password: testPassword
      });
      expect(decrypted).toBe(testData);
    });

    it('should fail to decrypt with wrong password', async () => {
      const encrypted = await EncryptionService.encrypt({
        data: testData,
        password: testPassword
      });
      
      await expect(
        EncryptionService.decrypt({
          encryptedData: JSON.stringify(encrypted),
          password: 'wrongPassword'
        })
      ).rejects.toThrow('Failed to decrypt data');
    });

    it('should handle empty data', async () => {
      const encrypted = await EncryptionService.encrypt({
        data: '',
        password: testPassword
      });
      const decrypted = await EncryptionService.decrypt({
        encryptedData: JSON.stringify(encrypted),
        password: testPassword
      });
      expect(decrypted).toBe('');
    });

    it('should handle special characters', async () => {
      const specialData = '!@#$%^&*()_+-=[]{}|;\':",./<>?`~😀';
      const encrypted = await EncryptionService.encrypt({
        data: specialData,
        password: testPassword
      });
      const decrypted = await EncryptionService.decrypt({
        encryptedData: JSON.stringify(encrypted),
        password: testPassword
      });
      expect(decrypted).toBe(specialData);
    });
  });

  // generateSecurePassword and checkPasswordStrength are not part of EncryptionService
  // They might be in a separate password utility or not implemented yet

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