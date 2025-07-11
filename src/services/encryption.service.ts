/**
 * Encryption service for secure data handling
 * @module services/encryption
 */

interface EncryptionParams {
  data: string;
  password: string;
  iterations?: number;
}

interface DecryptionParams {
  encryptedData: string;
  password: string;
}

interface EncryptedData {
  data: string;
  salt: string;
  iv: string;
  iterations: number;
}

/**
 * Service for handling encryption and decryption of sensitive data
 * Uses AES-256-GCM for encryption with PBKDF2 key derivation
 */
export class EncryptionService {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;
  private static readonly SALT_LENGTH = 16;
  private static readonly IV_LENGTH = 12;
  private static readonly TAG_LENGTH = 16;
  private static readonly DEFAULT_ITERATIONS = 100000;

  /**
   * Generates a cryptographically secure random salt
   */
  private static generateSalt(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH));
  }

  /**
   * Generates a cryptographically secure random initialization vector
   */
  private static generateIV(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));
  }

  /**
   * Derives a cryptographic key from a password using PBKDF2
   */
  private static async deriveKey({
    password,
    salt,
    iterations = this.DEFAULT_ITERATIONS
  }: {
    password: string;
    salt: Uint8Array;
    iterations?: number;
  }): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: this.ALGORITHM, length: this.KEY_LENGTH },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypts data using AES-256-GCM
   */
  static async encrypt({
    data,
    password,
    iterations = this.DEFAULT_ITERATIONS
  }: EncryptionParams): Promise<EncryptedData> {
    try {
      const salt = this.generateSalt();
      const iv = this.generateIV();
      const key = await this.deriveKey({ password, salt, iterations });

      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);

      const encryptedBuffer = await crypto.subtle.encrypt(
        {
          name: this.ALGORITHM,
          iv
        },
        key,
        dataBuffer
      );

      // Convert to base64 for storage
      const encryptedData = btoa(
        String.fromCharCode(...new Uint8Array(encryptedBuffer))
      );
      const saltBase64 = btoa(String.fromCharCode(...salt));
      const ivBase64 = btoa(String.fromCharCode(...iv));

      return {
        data: encryptedData,
        salt: saltBase64,
        iv: ivBase64,
        iterations
      };
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypts data encrypted with AES-256-GCM
   */
  static async decrypt({
    encryptedData,
    password
  }: DecryptionParams): Promise<string> {
    try {
      const parsedData: EncryptedData = JSON.parse(encryptedData);
      const { data, salt, iv, iterations } = parsedData;

      // Convert from base64
      const encryptedBuffer = Uint8Array.from(
        atob(data),
        c => c.charCodeAt(0)
      );
      const saltBuffer = Uint8Array.from(
        atob(salt),
        c => c.charCodeAt(0)
      );
      const ivBuffer = Uint8Array.from(
        atob(iv),
        c => c.charCodeAt(0)
      );

      const key = await this.deriveKey({
        password,
        salt: saltBuffer,
        iterations
      });

      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv: ivBuffer
        },
        key,
        encryptedBuffer
      );

      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data - invalid password or corrupted data');
    }
  }

  /**
   * Generates a secure random password
   */
  static generatePassword(length: number = 32): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    const randomValues = crypto.getRandomValues(new Uint8Array(length));
    return Array.from(randomValues)
      .map(value => charset[value % charset.length])
      .join('');
  }

  /**
   * Hashes a password using SHA-256
   */
  static async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Validates password strength
   */
  static validatePasswordStrength(password: string): {
    isValid: boolean;
    score: number;
    feedback: string[];
  } {
    const feedback: string[] = [];
    let score = 0;

    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (password.length >= 16) score++;
    
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (password.length < 8) {
      feedback.push('Password should be at least 8 characters long');
    }
    if (!/[a-z]/.test(password)) {
      feedback.push('Include lowercase letters');
    }
    if (!/[A-Z]/.test(password)) {
      feedback.push('Include uppercase letters');
    }
    if (!/[0-9]/.test(password)) {
      feedback.push('Include numbers');
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      feedback.push('Include special characters');
    }

    return {
      isValid: score >= 5,
      score: Math.min(score, 10),
      feedback
    };
  }
}

export default EncryptionService;