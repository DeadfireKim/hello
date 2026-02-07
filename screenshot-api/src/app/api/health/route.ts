import { NextResponse } from 'next/server';
import { getQueueStats } from '@/lib/queue/simple-queue';

export async function GET() {
  try {
    // Get queue statistics
    const queueStats = await getQueueStats();

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        queue: {
          status: 'up',
          type: 'in-memory',
          stats: queueStats,
        },
      },
    };

    return NextResponse.json(health, { status: 200 });
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
