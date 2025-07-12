import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OTPService, OTPAccount } from '../otp.service';

describe('OTPService', () => {
  const mockAccount: OTPAccount = {
    id: '1',
    issuer: 'Test Service',
    label: 'test@example.com',
    secret: 'JBSWY3DPEHPK3PXP', // Base32 encoded secret
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    type: 'totp',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('generateTOTP', () => {
    it('should generate a 6-digit code', () => {
      const result = OTPService.generateTOTP(mockAccount);
      expect(result.code).toMatch(/^\d{6}$/);
    });

    it('should include remaining time', () => {
      const result = OTPService.generateTOTP(mockAccount);
      expect(result.remainingTime).toBeDefined();
      expect(result.remainingTime).toBeGreaterThan(0);
      expect(result.remainingTime).toBeLessThanOrEqual(30);
    });

    it('should calculate progress correctly', () => {
      const result = OTPService.generateTOTP(mockAccount);
      expect(result.progress).toBeDefined();
      expect(result.progress).toBeGreaterThanOrEqual(0);
      expect(result.progress).toBeLessThanOrEqual(100);
    });

    it('should generate different codes at different times', () => {
      const result1 = OTPService.generateTOTP(mockAccount);
      
      // Advance time by 31 seconds (more than the period)
      vi.advanceTimersByTime(31000);
      
      const result2 = OTPService.generateTOTP(mockAccount);
      expect(result1.code).not.toBe(result2.code);
    });
  });

  describe('generateHOTP', () => {
    const hotpAccount: OTPAccount = {
      ...mockAccount,
      type: 'hotp',
      counter: 0,
    };

    it('should generate a 6-digit code', () => {
      const result = OTPService.generateHOTP(hotpAccount);
      expect(result.code).toMatch(/^\d{6}$/);
    });

    it('should generate different codes for different counters', () => {
      const result1 = OTPService.generateHOTP(hotpAccount);
      
      const accountWithHigherCounter = {
        ...hotpAccount,
        counter: 1,
      };
      const result2 = OTPService.generateHOTP(accountWithHigherCounter);
      
      expect(result1.code).not.toBe(result2.code);
    });

    it('should not include time-based properties', () => {
      const result = OTPService.generateHOTP(hotpAccount);
      expect(result.remainingTime).toBeUndefined();
      expect(result.progress).toBeUndefined();
    });

    it('should throw error when counter is undefined', () => {
      const accountNoCounter = { ...hotpAccount };
      delete accountNoCounter.counter;
      
      expect(() => OTPService.generateHOTP(accountNoCounter)).toThrow('Counter is required for HOTP');
    });
  });

  describe('parseURI', () => {
    it('should parse a valid TOTP URI', () => {
      const uri = 'otpauth://totp/Example:alice@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Example&algorithm=SHA1&digits=6&period=30';
      const parsed = OTPService.parseURI(uri);
      
      expect(parsed.type).toBe('totp');
      expect(parsed.label).toBe('alice@example.com');
      expect(parsed.issuer).toBe('Example');
      expect(parsed.secret).toBe('JBSWY3DPEHPK3PXP');
      expect(parsed.algorithm).toBe('SHA1');
      expect(parsed.digits).toBe(6);
      expect(parsed.period).toBe(30);
    });

    it('should parse a valid HOTP URI', () => {
      const uri = 'otpauth://hotp/Example:alice@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Example&counter=10';
      const parsed = OTPService.parseURI(uri);
      
      expect(parsed.type).toBe('hotp');
      expect(parsed.counter).toBe(10);
    });

    it('should throw error for invalid URI', () => {
      expect(() => OTPService.parseURI('invalid://uri')).toThrow('Invalid OTP URI');
    });

    it('should handle missing optional parameters', () => {
      const uri = 'otpauth://totp/alice@example.com?secret=JBSWY3DPEHPK3PXP';
      const parsed = OTPService.parseURI(uri);
      
      expect(parsed.algorithm).toBe('SHA1'); // default
      expect(parsed.digits).toBe(6); // default
      expect(parsed.period).toBe(30); // default
    });
  });

  describe('generateURI', () => {
    it('should generate a valid TOTP URI', () => {
      const uri = OTPService.generateURI(mockAccount);
      expect(uri).toContain('otpauth://totp/');
      expect(uri).toContain(`secret=${mockAccount.secret}`);
      expect(uri).toContain(`issuer=${encodeURIComponent(mockAccount.issuer)}`);
      expect(uri).toContain(`algorithm=${mockAccount.algorithm}`);
      expect(uri).toContain(`digits=${mockAccount.digits}`);
      expect(uri).toContain(`period=${mockAccount.period}`);
    });

    it('should generate a valid HOTP URI', () => {
      const hotpAccount: OTPAccount = {
        ...mockAccount,
        type: 'hotp',
        counter: 5,
      };
      
      const uri = OTPService.generateURI(hotpAccount);
      expect(uri).toContain('otpauth://hotp/');
      expect(uri).toContain('counter=5');
      expect(uri).not.toContain('period=');
    });

    it('should properly encode special characters', () => {
      const accountWithSpecialChars: OTPAccount = {
        ...mockAccount,
        issuer: 'Test & Service',
        label: 'user+test@example.com',
      };
      
      const uri = OTPService.generateURI(accountWithSpecialChars);
      expect(uri).toContain('issuer=Test%20%26%20Service');
      expect(uri).toContain('Test%20%26%20Service:user%2Btest%40example.com');
    });
  });

  // validateSecret method doesn't exist in OTPService

  describe('getServiceIcon', () => {
    it('should return favicon URL for services', () => {
      const googleIcon = OTPService.getServiceIcon('Google');
      expect(googleIcon).toContain('favicons');
      expect(googleIcon).toContain('google.com');
    });

    it('should handle services with spaces', () => {
      const icon = OTPService.getServiceIcon('My Service');
      expect(icon).toContain('myservice.com');
    });

    it('should handle empty issuer', () => {
      const icon = OTPService.getServiceIcon('');
      expect(icon).toContain('favicons');
      expect(icon).toContain('.com');
    });
  });
});