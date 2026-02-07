import redis from '../db/redis-client';

const RATE_LIMIT_WINDOW = 60; // 60 seconds
const MAX_REQUESTS = 10; // 10 requests per minute per IP

export async function checkRateLimit(ip: string): Promise<boolean> {
  const key = `ratelimit:${ip}`;

  try {
    const current = await redis.incr(key);

    if (current === 1) {
      // First request from this IP, set expiry
      await redis.expire(key, RATE_LIMIT_WINDOW);
    }

    return current <= MAX_REQUESTS;
  } catch (error) {
    console.error('Rate limit check error:', error);
    // On error, allow the request (fail open)
    return true;
  }
}

export async function getRateLimitInfo(ip: string) {
  const key = `ratelimit:${ip}`;

  try {
    const count = (await redis.get(key)) || '0';
    const ttl = await redis.ttl(key);

    return {
      count: parseInt(count, 10),
      limit: MAX_REQUESTS,
      remaining: Math.max(0, MAX_REQUESTS - parseInt(count, 10)),
      resetIn: ttl > 0 ? ttl : RATE_LIMIT_WINDOW,
    };
  } catch (error) {
    console.error('Get rate limit info error:', error);
    return {
      count: 0,
      limit: MAX_REQUESTS,
      remaining: MAX_REQUESTS,
      resetIn: RATE_LIMIT_WINDOW,
    };
  }
}
