#!/usr/bin/env tsx

import ScreenshotWorker from '../lib/worker/screenshot-worker';

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  📸 Screenshot Worker Starting');
  console.log('  💾 Using In-Memory Queue (No Redis)');
  console.log('═══════════════════════════════════════════\n');

  try {
    // Check environment variables
    if (!process.env.S3_BUCKET) {
      console.warn('⚠️  S3_BUCKET not set');
    }

    // Initialize and start worker
    const worker = new ScreenshotWorker();
    await worker.initialize();

    console.log('\n═══════════════════════════════════════════');
    console.log('  ✅ Worker Ready - Waiting for jobs');
    console.log('  📊 Queue: In-Memory (Simple)');
    console.log('═══════════════════════════════════════════\n');
  } catch (error) {
    console.error('❌ Failed to start worker:', error);
    process.exit(1);
  }
}

// Run
main();
