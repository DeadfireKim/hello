/**
 * Next.js Instrumentation Hook
 * This file runs once when the Next.js server starts
 * Used to initialize the screenshot worker in the same process
 */

// Global flag to ensure worker is only initialized once
declare global {
  var screenshotWorkerInitialized: boolean | undefined;
}

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Only run in Node.js runtime (server-side)
    if (global.screenshotWorkerInitialized) {
      console.log('⏭️  Screenshot Worker already initialized');
      return;
    }

    console.log('═══════════════════════════════════════════');
    console.log('  📸 Screenshot Worker Starting');
    console.log('  💾 Using In-Memory Queue (Shared Process)');
    console.log('═══════════════════════════════════════════\n');

    // Dynamically import to avoid issues with Edge runtime
    const { default: ScreenshotWorker } = await import('./src/lib/worker/screenshot-worker');

    try {
      const worker = new ScreenshotWorker();
      await worker.initialize();

      global.screenshotWorkerInitialized = true;

      console.log('\n═══════════════════════════════════════════');
      console.log('  ✅ Worker Ready - Same Process as API');
      console.log('  📊 Queue: In-Memory (Shared)');
      console.log('═══════════════════════════════════════════\n');
    } catch (error) {
      console.error('❌ Failed to initialize worker:', error);
    }
  }
}
