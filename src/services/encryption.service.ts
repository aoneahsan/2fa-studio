/**
 * Encryption Service
 * Handles encryption and decryption of sensitive data
 * @module services/encryption
 */

import { UnifiedErrorHandling } from 'unified-error-handling';

export interface EncryptedData {
  data: string;
  salt: string;
  iv: string;
}

export class EncryptionService {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;
  private static readonly SALT_LENGTH = 16;
  private static readonly IV_LENGTH = 12;
  private static readonly PBKDF2_ITERATIONS = 100000;

  /**
   * Initialize encryption service
   */
  static async initialize(): Promise<void> {
    // Check if Web Crypto API is available
    if (!window.crypto || !window.crypto.subtle) {
      throw new Error('Web Crypto API not available');
    }
  }

  /**
   * Encrypt data with password
   */
  static async encryptWithPassword(
    data: string,
    password: string
  ): Promise<EncryptedData> {
    return UnifiedErrorHandling.withTryCatch(
      async () => {
        // Generate salt and IV
        const salt = crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH));
        const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));

        // Derive key from password
        const key = await this.deriveKeyFromPassword(password, salt);

        // Encode data as UTF-8
        const encoder = new TextEncoder();
        const encodedData = encoder.encode(data);

        // Encrypt data
        const encryptedData = await crypto.subtle.encrypt(
          {
            name: this.ALGORITHM,
            iv
          },
          key,
          encodedData
        );

        // Convert to base64 for storage
        return {
          data: this.arrayBufferToBase64(encryptedData),
          salt: this.arrayBufferToBase64(salt),
          iv: this.arrayBufferToBase64(iv)
        };
      },
      {
        operation: 'EncryptionService.encryptWithPassword',
        metadata: { dataLength: data.length }
      }
    );
  }

  /**
   * Decrypt data with password
   */
  static async decryptWithPassword(
    encryptedData: string,
    password: string,
    params: {
      salt: string;
      iv: string;
    }
  ): Promise<string> {
    return UnifiedErrorHandling.withTryCatch(
      async () => {
        // Convert from base64
        const salt = this.base64ToArrayBuffer(params.salt);
        const iv = this.base64ToArrayBuffer(params.iv);
        const data = this.base64ToArrayBuffer(encryptedData);

        // Derive key from password
        const key = await this.deriveKeyFromPassword(password, new Uint8Array(salt));

        // Decrypt data
        const decryptedData = await crypto.subtle.decrypt(
          {
            name: this.ALGORITHM,
            iv: new Uint8Array(iv)
          },
          key,
          data
        );

        // Decode from UTF-8
        const decoder = new TextDecoder();
        return decoder.decode(decryptedData);
      },
      {
        operation: 'EncryptionService.decryptWithPassword',
        metadata: { hasPassword: !!password }
      }
    );
  }

  /**
   * Derive encryption key from password
   */
  private static async deriveKeyFromPassword(
    password: string,
    salt: Uint8Array
  ): Promise<CryptoKey> {
    // Import password as key material
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    // Derive key using PBKDF2
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: this.PBKDF2_ITERATIONS,
        hash: 'SHA-256'
      },
      keyMaterial,
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH
      },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Convert ArrayBuffer to base64 string
   */
  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert base64 string to ArrayBuffer
   */
  private static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Generate secure random key
   */
  static generateRandomKey(length: number = 32): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return this.arrayBufferToBase64(array.buffer);
  }

  /**
   * Hash data using SHA-256
   */
  static async hash(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    return this.arrayBufferToBase64(hashBuffer);
  }
}