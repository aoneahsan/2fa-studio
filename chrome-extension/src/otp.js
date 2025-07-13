/**
 * OTP Service for Chrome Extension
 * @module src/otp
 */

import steamGuard from './steam-guard.js';

export class OTPService {
  /**
   * Generate OTP code for an account
   */
  static async generateCode(account) {
    if (account.type === 'totp') {
      return this.generateTOTP(account);
    } else if (account.type === 'hotp') {
      return this.generateHOTP(account);
    } else if (account.type === 'steam') {
      return this.generateSteamCode(account);
    }
    
    throw new Error('Invalid account type');
  }

  /**
   * Generate Steam Guard code
   */
  static async generateSteamCode(account) {
    try {
      const code = await steamGuard.generateCode(account.secret);
      const remainingTime = steamGuard.getTimeRemaining();
      const progress = (remainingTime / 30) * 100;
      
      return {
        code,
        remainingTime,
        progress,
        period: 30,
        type: 'steam'
      };
    } catch (error) {
      console.error('Steam code generation failed:', error);
      return {
        code: 'ERROR',
        remainingTime: 0,
        progress: 0,
        period: 30,
        type: 'steam',
        error: true
      };
    }
  }

  /**
   * Generate TOTP code
   */
  static generateTOTP(account) {
    const period = account.period || 30;
    const digits = account.digits || 6;
    const algorithm = account.algorithm || 'SHA1';
    
    // Get current time
    const now = Math.floor(Date.now() / 1000);
    const counter = Math.floor(now / period);
    
    // Calculate remaining time
    const remainingTime = period - (now % period);
    const progress = (remainingTime / period) * 100;
    
    // Generate code
    const code = this.generateHMAC(account.secret, counter, digits, algorithm);
    
    return {
      code,
      remainingTime,
      progress,
      period
    };
  }

  /**
   * Generate HOTP code
   */
  static generateHOTP(account) {
    const counter = account.counter || 0;
    const digits = account.digits || 6;
    const algorithm = account.algorithm || 'SHA1';
    
    // Generate code
    const code = this.generateHMAC(account.secret, counter, digits, algorithm);
    
    return {
      code,
      counter
    };
  }

  /**
   * Generate HMAC-based code
   */
  static generateHMAC(secret, counter, digits, algorithm) {
    try {
      // Decode base32 secret
      const key = this.base32Decode(secret);
      
      // Convert counter to bytes
      const counterBytes = new ArrayBuffer(8);
      const view = new DataView(counterBytes);
      view.setUint32(4, counter, false);
      
      // Generate HMAC
      const hmacKey = this.importKey(key);
      const hmac = this.computeHMAC(hmacKey, counterBytes, algorithm);
      
      // Dynamic truncation
      const offset = hmac[hmac.length - 1] & 0xf;
      const binary = 
        ((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff);
      
      // Generate final code
      const otp = binary % Math.pow(10, digits);
      return otp.toString().padStart(digits, '0');
    } catch (error) {
      console.error('Failed to generate code:', error);
      return '000000';
    }
  }

  /**
   * Base32 decode
   */
  static base32Decode(input) {
    const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    input = input.replace(/\s/g, '').toUpperCase();
    
    const bytes = [];
    let bits = 0;
    let value = 0;
    
    for (let i = 0; i < input.length; i++) {
      const idx = base32chars.indexOf(input[i]);
      if (idx === -1) continue;
      
      value = (value << 5) | idx;
      bits += 5;
      
      if (bits >= 8) {
        bytes.push((value >>> (bits - 8)) & 255);
        bits -= 8;
      }
    }
    
    return new Uint8Array(bytes);
  }

  /**
   * Import key for HMAC
   */
  static importKey(keyData) {
    // Simple key import simulation
    return keyData;
  }

  /**
   * Compute HMAC
   */
  static computeHMAC(key, data, algorithm) {
    // This is a simplified version - in production, use Web Crypto API
    // For the extension, we'll use a library or the full implementation
    const blockSize = 64;
    const opad = 0x5c;
    const ipad = 0x36;
    
    // Ensure key is correct length
    let keyBytes = new Uint8Array(key);
    if (keyBytes.length > blockSize) {
      // Hash the key if it's too long
      keyBytes = this.hash(keyBytes, algorithm);
    }
    if (keyBytes.length < blockSize) {
      // Pad with zeros
      const padded = new Uint8Array(blockSize);
      padded.set(keyBytes);
      keyBytes = padded;
    }
    
    // Create inner and outer padding
    const innerPad = new Uint8Array(blockSize);
    const outerPad = new Uint8Array(blockSize);
    
    for (let i = 0; i < blockSize; i++) {
      innerPad[i] = keyBytes[i] ^ ipad;
      outerPad[i] = keyBytes[i] ^ opad;
    }
    
    // Compute inner hash
    const innerData = new Uint8Array(innerPad.length + data.byteLength);
    innerData.set(innerPad);
    innerData.set(new Uint8Array(data), innerPad.length);
    const innerHash = this.hash(innerData, algorithm);
    
    // Compute outer hash
    const outerData = new Uint8Array(outerPad.length + innerHash.length);
    outerData.set(outerPad);
    outerData.set(innerHash, outerPad.length);
    
    return this.hash(outerData, algorithm);
  }

  /**
   * Simple hash function (SHA-1)
   */
  static hash(data, _algorithm) {
    // This is a placeholder - use Web Crypto API or a library
    // For now, return a mock hash
    const hash = new Uint8Array(20);
    for (let i = 0; i < hash.length; i++) {
      hash[i] = data[i % data.length] ^ (i * 7);
    }
    return hash;
  }

  /**
   * Parse OTP URI
   */
  static parseURI(uri) {
    try {
      const url = new URL(uri);
      
      if (url.protocol !== 'otpauth:') {
        throw new Error('Invalid OTP URI');
      }
      
      const type = url.hostname;
      const [issuer, accountName] = decodeURIComponent(url.pathname.substr(1)).split(':');
      
      const params = {};
      url.searchParams.forEach((value, key) => {
        params[key] = value;
      });
      
      return {
        type,
        issuer: params.issuer || issuer,
        accountName,
        secret: params.secret,
        algorithm: params.algorithm || 'SHA1',
        digits: parseInt(params.digits || '6'),
        period: parseInt(params.period || '30'),
        counter: parseInt(params.counter || '0')
      };
    } catch (error) {
      console.error('Failed to parse URI:', error);
      return null;
    }
  }

  /**
   * Generate OTP URI
   */
  static generateURI(account) {
    const params = new URLSearchParams({
      secret: account.secret,
      issuer: account.issuer,
      algorithm: account.algorithm || 'SHA1',
      digits: account.digits || 6
    });
    
    if (account.type === 'totp') {
      params.append('period', account.period || 30);
    } else {
      params.append('counter', account.counter || 0);
    }
    
    const label = `${account.issuer}:${account.accountName}`;
    return `otpauth://${account.type}/${encodeURIComponent(label)}?${params.toString()}`;
  }
}