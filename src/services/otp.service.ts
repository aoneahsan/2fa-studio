/**
 * OTP (One-Time Password) service for TOTP and HOTP generation
 * @module services/otp
 */

import { OTPAuth } from 'otpauth';

export interface OTPAccount {
  id: string;
  issuer: string;
  label: string;
  secret: string;
  algorithm: 'SHA1' | 'SHA256' | 'SHA512';
  digits: number;
  period: number;
  type: 'totp' | 'hotp';
  counter?: number;
  iconUrl?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  backupCodes?: string[];
  notes?: string;
}

export interface OTPGenerationResult {
  code: string;
  remainingTime?: number;
  progress?: number;
}

/**
 * Service for handling OTP generation and management
 */
export class OTPService {
  /**
   * Generates a TOTP code
   */
  static generateTOTP(account: OTPAccount): OTPGenerationResult {
    const totp = new OTPAuth.TOTP({
      issuer: account.issuer,
      label: account.label,
      algorithm: account.algorithm,
      digits: account.digits,
      period: account.period,
      secret: account.secret
    });

    const code = totp.generate();
    const remainingTime = account.period - (Math.floor(Date.now() / 1000) % account.period);
    const progress = ((account.period - remainingTime) / account.period) * 100;

    return {
      code,
      remainingTime,
      progress
    };
  }

  /**
   * Generates a HOTP code
   */
  static generateHOTP(account: OTPAccount): OTPGenerationResult {
    if (!account.counter) {
      throw new Error('Counter is required for HOTP');
    }

    const hotp = new OTPAuth.HOTP({
      issuer: account.issuer,
      label: account.label,
      algorithm: account.algorithm,
      digits: account.digits,
      counter: account.counter,
      secret: account.secret
    });

    const code = hotp.generate();

    return { code };
  }

  /**
   * Generates an OTP code based on account type
   */
  static generateCode(account: OTPAccount): OTPGenerationResult {
    if (account.type === 'totp') {
      return this.generateTOTP(account);
    } else {
      return this.generateHOTP(account);
    }
  }

  /**
   * Parses an OTP URI (otpauth://)
   */
  static parseURI(uri: string): Partial<OTPAccount> {
    try {
      const parsed = OTPAuth.URI.parse(uri);
      
      return {
        issuer: parsed.issuer || '',
        label: parsed.label || '',
        secret: parsed.secret.base32,
        algorithm: parsed.algorithm as 'SHA1' | 'SHA256' | 'SHA512',
        digits: parsed.digits,
        type: parsed instanceof OTPAuth.TOTP ? 'totp' : 'hotp',
        period: parsed instanceof OTPAuth.TOTP ? parsed.period : undefined,
        counter: parsed instanceof OTPAuth.HOTP ? parsed.counter : undefined
      };
    } catch (error) {
      console.error('Failed to parse OTP URI:', error);
      throw new Error('Invalid OTP URI');
    }
  }

  /**
   * Generates an OTP URI for export
   */
  static generateURI(account: OTPAccount): string {
    const options = {
      issuer: account.issuer,
      label: account.label,
      algorithm: account.algorithm,
      digits: account.digits,
      secret: account.secret
    };

    if (account.type === 'totp') {
      const totp = new OTPAuth.TOTP({
        ...options,
        period: account.period
      });
      return totp.toString();
    } else {
      const hotp = new OTPAuth.HOTP({
        ...options,
        counter: account.counter || 0
      });
      return hotp.toString();
    }
  }

  /**
   * Validates a TOTP code
   */
  static validateTOTP(account: OTPAccount, code: string, window: number = 1): boolean {
    const totp = new OTPAuth.TOTP({
      issuer: account.issuer,
      label: account.label,
      algorithm: account.algorithm,
      digits: account.digits,
      period: account.period,
      secret: account.secret
    });

    return totp.validate({ token: code, window }) !== null;
  }

  /**
   * Validates a HOTP code
   */
  static validateHOTP(account: OTPAccount, code: string, window: number = 10): number | null {
    if (!account.counter) {
      throw new Error('Counter is required for HOTP');
    }

    const hotp = new OTPAuth.HOTP({
      issuer: account.issuer,
      label: account.label,
      algorithm: account.algorithm,
      digits: account.digits,
      counter: account.counter,
      secret: account.secret
    });

    return hotp.validate({ token: code, window });
  }

  /**
   * Generates a random secret
   */
  static generateSecret(length: number = 20): string {
    return OTPAuth.Secret.fromBase32(
      OTPAuth.Secret.fromRaw(crypto.getRandomValues(new Uint8Array(length))).base32
    ).base32;
  }

  /**
   * Formats the OTP code for display
   */
  static formatCode(code: string): string {
    // Split code in half for better readability
    const mid = Math.ceil(code.length / 2);
    return `${code.slice(0, mid)} ${code.slice(mid)}`;
  }

  /**
   * Gets the icon URL for a service
   */
  static getServiceIcon(issuer: string): string {
    // This could be expanded to use a service like Google's favicon service
    // or maintain a local database of common service icons
    const domain = issuer.toLowerCase().replace(/\s+/g, '');
    return `https://www.google.com/s2/favicons?domain=${domain}.com&sz=128`;
  }

  /**
   * Estimates the strength of a secret
   */
  static estimateSecretStrength(secret: string): {
    score: number;
    rating: 'weak' | 'fair' | 'good' | 'strong';
  } {
    const length = secret.length;
    let score = 0;

    if (length >= 16) score += 25;
    if (length >= 20) score += 25;
    if (length >= 24) score += 25;
    if (length >= 32) score += 25;

    let rating: 'weak' | 'fair' | 'good' | 'strong';
    if (score < 25) rating = 'weak';
    else if (score < 50) rating = 'fair';
    else if (score < 75) rating = 'good';
    else rating = 'strong';

    return { score, rating };
  }
}

export default OTPService;