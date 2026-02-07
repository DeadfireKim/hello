/**
 * Simple In-Memory Rate Limiter
 * Replaces Redis-based rate limiting
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

const RATE_LIMIT_WINDOW = 60000; // 60 seconds
const MAX_REQUESTS = 10; // 10 requests per minute per IP

// Clean up expired records every 5 minutes
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
}, 300000);

export async function checkRateLimit(ip: string): Promise<boolean> {
  const key = `ratelimit:${ip}`;
  const now = Date.now();

  let record = rateLimitStore.get(key);

  // Create new record if doesn't exist or expired
  if (!record || now > record.resetAt) {
    record = {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW,
    };
    rateLimitStore.set(key, record);
    return true;
  }

  // Increment count
  record.count++;

  // Check if exceeded
  return record.count <= MAX_REQUESTS;
}

export async function getRateLimitInfo(ip: string) {
  const key = `ratelimit:${ip}`;
  const now = Date.now();

  const record = rateLimitStore.get(key);

  if (!record || now > record.resetAt) {
    return {
      count: 0,
      limit: MAX_REQUESTS,
      remaining: MAX_REQUESTS,
      resetIn: Math.floor(RATE_LIMIT_WINDOW / 1000),
    };
  }

  const resetIn = Math.floor((record.resetAt - now) / 1000);

  return {
    count: record.count,
    limit: MAX_REQUESTS,
    remaining: Math.max(0, MAX_REQUESTS - record.count),
    resetIn,
  };
}
