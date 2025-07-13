/**
 * Rate limiter utility for preventing brute force attacks
 * @module utils/rate-limiter
 */

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  blockDurationMs: number;
}

interface AttemptRecord {
  count: number;
  firstAttempt: number;
  blockedUntil?: number;
}

export class RateLimiter {
  private attempts: Map<string, AttemptRecord> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(private _config: RateLimitConfig) {
    // Cleanup old records every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Check if an action is allowed for a given key
   */
  isAllowed(key: string): boolean {
    const now = Date.now();
    const record = this.attempts.get(key);

    if (!record) {
      return true;
    }

    // Check if blocked
    if (record.blockedUntil && now < record.blockedUntil) {
      return false;
    }

    // Check if window expired
    if (now - record.firstAttempt > this.config.windowMs) {
      this.attempts.delete(key);
      return true;
    }

    // Check if under limit
    return record.count < this.config.maxAttempts;
  }

  /**
   * Record an attempt for a given key
   */
  recordAttempt(key: string): void {
    const now = Date.now();
    const record = this.attempts.get(key);

    if (!record) {
      this.attempts.set(key, {
        count: 1,
        firstAttempt: now
      });
      return;
    }

    // Reset if window expired
    if (now - record.firstAttempt > this.config.windowMs) {
      this.attempts.set(key, {
        count: 1,
        firstAttempt: now
      });
      return;
    }

    // Increment count
    record.count++;

    // Block if limit exceeded
    if (record.count >= this.config.maxAttempts) {
      record.blockedUntil = now + this.config.blockDurationMs;
    }
  }

  /**
   * Get remaining attempts for a key
   */
  getRemainingAttempts(key: string): number {
    const record = this.attempts.get(key);
    if (!record) {
      return this.config.maxAttempts;
    }

    const now = Date.now();
    if (now - record.firstAttempt > this.config.windowMs) {
      return this.config.maxAttempts;
    }

    return Math.max(0, this.config.maxAttempts - record.count);
  }

  /**
   * Get time until unblocked (in ms)
   */
  getBlockedTime(key: string): number {
    const record = this.attempts.get(key);
    if (!record || !record.blockedUntil) {
      return 0;
    }

    const now = Date.now();
    return Math.max(0, record.blockedUntil - now);
  }

  /**
   * Reset attempts for a key
   */
  reset(key: string): void {
    this.attempts.delete(key);
  }

  /**
   * Clean up old records
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.attempts.entries()) {
      if (
        now - record.firstAttempt > this.config.windowMs &&
        (!record.blockedUntil || now > record.blockedUntil)
      ) {
        this.attempts.delete(key);
      }
    }
  }

  /**
   * Destroy the rate limiter
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.attempts.clear();
  }
}

// Pre-configured rate limiters
export const authRateLimiter = new RateLimiter({
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  blockDurationMs: 30 * 60 * 1000 // 30 minutes
});

export const otpRateLimiter = new RateLimiter({
  maxAttempts: 10,
  windowMs: 60 * 1000, // 1 minute
  blockDurationMs: 5 * 60 * 1000 // 5 minutes
});

export const apiRateLimiter = new RateLimiter({
  maxAttempts: 100,
  windowMs: 60 * 1000, // 1 minute
  blockDurationMs: 60 * 1000 // 1 minute
});