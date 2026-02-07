import { NextResponse } from 'next/server';
import { getQueueStats } from '@/lib/queue/screenshot-queue';
import redis from '@/lib/db/redis-client';

export async function GET() {
  try {
    // Check Redis connection
    const redisStatus = await redis.ping();
    const isRedisHealthy = redisStatus === 'PONG';

    // Get queue statistics
    const queueStats = await getQueueStats();

    const health = {
      status: isRedisHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        redis: {
          status: isRedisHealthy ? 'up' : 'down',
        },
        queue: {
          status: 'up',
          stats: queueStats,
        },
      },
    };

    const statusCode = health.status === 'healthy' ? 200 : 503;

    return NextResponse.json(health, { status: statusCode });
  } catch (error) {
    console.error('Health check error:', error);

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}
