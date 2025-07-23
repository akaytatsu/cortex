import type { ILogger } from "../types/services";
import { createServiceLogger } from "./logger";

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  lockoutDuration: number;
}

interface AttemptRecord {
  attempts: number;
  firstAttempt: number;
  lockedUntil?: number;
}

/**
 * Simple in-memory rate limiter for login attempts
 */
export class RateLimiter {
  private attempts = new Map<string, AttemptRecord>();
  private logger: ILogger;
  private config: RateLimitConfig;
  private cleanupInterval: NodeJS.Timeout;

  constructor(config: RateLimitConfig, logger?: ILogger) {
    this.config = config;
    this.logger = logger || createServiceLogger("RateLimiter");

    // Cleanup old entries every 5 minutes
    this.cleanupInterval = setInterval(
      () => {
        this.cleanup();
      },
      5 * 60 * 1000
    );
  }

  /**
   * Check if an identifier (e.g., email or IP) is rate limited
   */
  isRateLimited(identifier: string): boolean {
    const now = Date.now();
    const record = this.attempts.get(identifier);

    if (!record) {
      return false;
    }

    // Check if currently locked out
    if (record.lockedUntil && now < record.lockedUntil) {
      this.logger.warn("Rate limit active", {
        identifier,
        lockedUntil: new Date(record.lockedUntil),
        remainingMs: record.lockedUntil - now,
      });
      return true;
    }

    // Check if window has expired
    if (now - record.firstAttempt > this.config.windowMs) {
      // Reset the window
      this.attempts.delete(identifier);
      return false;
    }

    return false;
  }

  /**
   * Record a failed attempt
   */
  recordFailedAttempt(identifier: string): void {
    const now = Date.now();
    const record = this.attempts.get(identifier);

    if (!record) {
      // First attempt
      this.attempts.set(identifier, {
        attempts: 1,
        firstAttempt: now,
      });
      return;
    }

    // Check if window has expired
    if (now - record.firstAttempt > this.config.windowMs) {
      // Reset the window
      this.attempts.set(identifier, {
        attempts: 1,
        firstAttempt: now,
      });
      return;
    }

    // Increment attempts
    record.attempts++;

    // Check if should be locked out
    if (record.attempts >= this.config.maxAttempts) {
      record.lockedUntil = now + this.config.lockoutDuration;

      this.logger.warn("Rate limit triggered", {
        identifier,
        attempts: record.attempts,
        lockoutDuration: this.config.lockoutDuration,
        lockedUntil: new Date(record.lockedUntil),
      });
    }

    this.attempts.set(identifier, record);
  }

  /**
   * Record a successful attempt (resets the counter)
   */
  recordSuccessfulAttempt(identifier: string): void {
    this.attempts.delete(identifier);
    this.logger.debug("Rate limit reset after successful attempt", {
      identifier,
    });
  }

  /**
   * Get remaining lockout time in milliseconds
   */
  getRemainingLockout(identifier: string): number {
    const record = this.attempts.get(identifier);
    if (!record || !record.lockedUntil) {
      return 0;
    }

    const remaining = record.lockedUntil - Date.now();
    return Math.max(0, remaining);
  }

  /**
   * Get current attempt count for an identifier
   */
  getAttemptCount(identifier: string): number {
    const record = this.attempts.get(identifier);
    if (!record) {
      return 0;
    }

    // Check if window has expired
    if (Date.now() - record.firstAttempt > this.config.windowMs) {
      return 0;
    }

    return record.attempts;
  }

  /**
   * Clear all records for an identifier
   */
  clearRecord(identifier: string): void {
    this.attempts.delete(identifier);
    this.logger.debug("Rate limit record cleared", { identifier });
  }

  /**
   * Cleanup expired records
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [identifier, record] of this.attempts) {
      // Remove if window expired and not currently locked
      const windowExpired = now - record.firstAttempt > this.config.windowMs;
      const lockoutExpired = !record.lockedUntil || now >= record.lockedUntil;

      if (windowExpired && lockoutExpired) {
        this.attempts.delete(identifier);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug("Rate limiter cleanup completed", {
        cleaned,
        remaining: this.attempts.size,
      });
    }
  }

  /**
   * Get current statistics
   */
  getStats(): { totalRecords: number; lockedCount: number } {
    const now = Date.now();
    let lockedCount = 0;

    for (const record of this.attempts.values()) {
      if (record.lockedUntil && now < record.lockedUntil) {
        lockedCount++;
      }
    }

    return {
      totalRecords: this.attempts.size,
      lockedCount,
    };
  }

  /**
   * Cleanup and stop the cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.attempts.clear();
  }
}
