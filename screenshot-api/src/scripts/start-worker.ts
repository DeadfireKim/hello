#!/usr/bin/env tsx

import ScreenshotWorker from '../lib/worker/screenshot-worker';
import redis from '../lib/db/redis-client';

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  📸 Screenshot Worker Starting');
  console.log('═══════════════════════════════════════════\n');

  try {
    // Check environment variables
    if (!process.env.REDIS_URL) {
      console.warn('⚠️  REDIS_URL not set, using default: redis://localhost:6379');
    }

    if (!process.env.S3_BUCKET) {
      console.warn('⚠️  S3_BUCKET not set');
    }

    // Connect to Redis
    await redis.connect();
    console.log('✅ Redis connected\n');

    // Initialize and start worker
    const worker = new ScreenshotWorker();
    await worker.initialize();

    console.log('\n═══════════════════════════════════════════');
    console.log('  ✅ Worker Ready - Waiting for jobs');
    console.log('═══════════════════════════════════════════\n');
  } catch (error) {
    console.error('❌ Failed to start worker:', error);
    process.exit(1);
  }
}

// Run
main();
