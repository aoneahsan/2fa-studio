/**
 * TOTP/HOTP Service
 * Handles generation of time-based and counter-based one-time passwords
 */

import { authenticator, totp, hotp } from 'otplib';

export interface TOTPAccount {
  id: string;
  issuer: string;
  label: string;
  secret: string;
  algorithm?: 'SHA1' | 'SHA256' | 'SHA512';
  digits?: number;
  period?: number;
  type?: 'totp' | 'hotp';
  counter?: number;
  icon?: string;
}

export class TOTPService {
  static {
    // Configure default options
    authenticator.options = {
      digits: 6,
      period: 30,
      algorithm: 'SHA1'
    };
  }

  /**
   * Generate TOTP code
   */
  static generateTOTP(secret: string, options?: Partial<TOTPAccount>): string {
    const config = {
      digits: options?.digits || 6,
      period: options?.period || 30,
      algorithm: options?.algorithm || 'SHA1'
    };
    
    return totp.generate(secret, config);
  }

  /**
   * Generate HOTP code
   */
  static generateHOTP(secret: string, counter: number, options?: Partial<TOTPAccount>): string {
    const config = {
      digits: options?.digits || 6,
      algorithm: options?.algorithm || 'SHA1'
    };
    
    return hotp.generate(secret, counter, config);
  }

  /**
   * Verify TOTP code
   */
  static verifyTOTP(token: string, secret: string, options?: Partial<TOTPAccount>): boolean {
    const config = {
      digits: options?.digits || 6,
      period: options?.period || 30,
      algorithm: options?.algorithm || 'SHA1',
      window: 1
    };
    
    return totp.verify({ token, secret, ...config });
  }

  /**
   * Get time remaining for current code
   */
  static getTimeRemaining(period: number = 30): number {
    const now = Date.now();
    const epoch = Math.floor(now / 1000);
    return period - (epoch % period);
  }

  /**
   * Parse otpauth URI
   */
  static parseOTPAuthURI(uri: string): TOTPAccount | null {
    try {
      const url = new URL(uri);
      if (url.protocol !== 'otpauth:') return null;

      const type = url.hostname as 'totp' | 'hotp';
      const label = decodeURIComponent(url.pathname.slice(1));
      const params = new URLSearchParams(url.search);

      return {
        id: Date.now().toString(),
        type,
        label,
        secret: params.get('secret') || '',
        issuer: params.get('issuer') || label.split(':')[0] || '',
        algorithm: (params.get('algorithm') as any) || 'SHA1',
        digits: parseInt(params.get('digits') || '6'),
        period: parseInt(params.get('period') || '30'),
        counter: parseInt(params.get('counter') || '0')
      };
    } catch {
      return null;
    }
  }

  /**
   * Generate otpauth URI
   */
  static generateOTPAuthURI(account: TOTPAccount): string {
    const type = account.type || 'totp';
    const label = encodeURIComponent(account.label);
    const params = new URLSearchParams({
      secret: account.secret,
      issuer: account.issuer,
      algorithm: account.algorithm || 'SHA1',
      digits: (account.digits || 6).toString()
    });

    if (type === 'totp') {
      params.append('period', (account.period || 30).toString());
    } else {
      params.append('counter', (account.counter || 0).toString());
    }

    return `otpauth://${type}/${label}?${params.toString()}`;
  }
}