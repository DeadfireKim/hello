/**
 * Simple In-Memory Rate Limiter
 * Replaces Redis-based rate limiting
 */

import { RATE_LIMIT_CONFIG } from '@/lib/config/app-config';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Clean up expired records periodically
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetAt) {
      rateLimitStore.delete(key);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`🧹 Cleaned up ${cleaned} expired rate limit records`);
  }
}, RATE_LIMIT_CONFIG.cleanupIntervalMs);

export async function checkRateLimit(ip: string): Promise<boolean> {
  const key = `ratelimit:${ip}`;
  const now = Date.now();

  let record = rateLimitStore.get(key);

  // Create new record if doesn't exist or expired
  if (!record || now > record.resetAt) {
    record = {
      count: 1,
      resetAt: now + RATE_LIMIT_CONFIG.windowMs,
    };
    rateLimitStore.set(key, record);
    return true;
  }

  // Increment count
  record.count++;

  // Check if exceeded
  return record.count <= RATE_LIMIT_CONFIG.maxRequests;
}

export async function getRateLimitInfo(ip: string) {
  const key = `ratelimit:${ip}`;
  const now = Date.now();

  const record = rateLimitStore.get(key);

  if (!record || now > record.resetAt) {
    return {
      count: 0,
      limit: RATE_LIMIT_CONFIG.maxRequests,
      remaining: RATE_LIMIT_CONFIG.maxRequests,
      resetIn: Math.floor(RATE_LIMIT_CONFIG.windowMs / 1000),
    };
  }

  const resetIn = Math.floor((record.resetAt - now) / 1000);

  return {
    count: record.count,
    limit: RATE_LIMIT_CONFIG.maxRequests,
    remaining: Math.max(0, RATE_LIMIT_CONFIG.maxRequests - record.count),
    resetIn,
  };
}
