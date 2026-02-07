import puppeteer, { Browser, Page } from 'puppeteer';
import { Job } from 'bull';
import screenshotQueue from '@/lib/queue/screenshot-queue';
import { ScreenshotJobData, JobResult } from '@/lib/types';
import { puppeteerConfig, navigationOptions } from '@/lib/config/puppeteer';
import { optimizeImage, getImageMetadata } from './image-optimizer';
import { uploadToStorage } from './storage-uploader';
import { sendCallback } from '@/lib/utils/callback-sender';

class ScreenshotWorker {
  private browser: Browser | null = null;
  private isShuttingDown = false;

  async initialize() {
    console.log('🚀 Starting Screenshot Worker...');

    try {
      // Launch Puppeteer browser once (keep alive for reuse)
      this.browser = await puppeteer.launch(puppeteerConfig);
      console.log('✅ Puppeteer browser launched');

      // Process jobs with concurrency
      const concurrency = parseInt(process.env.WORKER_CONCURRENCY || '5', 10);
      screenshotQueue.process(concurrency, this.processJob.bind(this));
      console.log(`✅ Worker processing jobs (concurrency: ${concurrency})`);

      // Graceful shutdown
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());
    } catch (error) {
      console.error('❌ Failed to initialize worker:', error);
      throw error;
    }
  }

  async processJob(job: Job<ScreenshotJobData>): Promise<JobResult> {
    const { id, targetUrl, callbackUrl, options } = job.data;

    console.log(`📸 Processing job ${id}: ${targetUrl}`);

    try {
      // Update progress
      await job.progress(10);

      // 1. Capture screenshot
      const screenshotBuffer = await this.captureScreenshot(targetUrl, options);
      await job.progress(40);

      // 2. Optimize image
      const { buffer: optimizedBuffer, format } = await optimizeImage(screenshotBuffer, {
        format: options?.format,
        quality: options?.quality,
      });
      await job.progress(60);

      // 3. Get image metadata
      const metadata = await getImageMetadata(optimizedBuffer);
      await job.progress(70);

      // 4. Upload to storage
      const imageUrl = await uploadToStorage(id, optimizedBuffer, format);
      await job.progress(90);

      // 5. Send callback
      const callbackPayload = {
        jobId: id,
        status: 'completed' as const,
        targetUrl,
        screenshot: {
          url: imageUrl,
          format,
          width: metadata.width,
          height: metadata.height,
          size: metadata.size,
        },
        completedAt: new Date().toISOString(),
      };

      await sendCallback(callbackUrl, callbackPayload);
      await job.progress(100);

      console.log(`✅ Job ${id} completed successfully`);

      return {
        imageUrl,
        width: metadata.width,
        height: metadata.height,
        size: metadata.size,
      };
    } catch (error) {
      console.error(`❌ Job ${id} failed:`, error);

      // Send failure callback
      const errorCallback = {
        jobId: id,
        status: 'failed' as const,
        targetUrl,
        error: {
          code: this.getErrorCode(error),
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        completedAt: new Date().toISOString(),
      };

      await sendCallback(callbackUrl, errorCallback);

      throw error;
    }
  }

  async captureScreenshot(
    url: string,
    options?: ScreenshotJobData['options']
  ): Promise<Buffer> {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    let page: Page | null = null;

    try {
      // Create new page
      page = await this.browser.newPage();

      // Set viewport
      const viewport = {
        width: options?.viewport?.width || 1920,
        height: options?.viewport?.height || 1080,
      };
      await page.setViewport(viewport);

      // Set user agent to avoid bot detection
      await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      // Navigate to URL
      console.log(`🌐 Navigating to ${url}...`);
      await page.goto(url, navigationOptions);

      // Wait a bit for dynamic content
      await page.waitForTimeout(1000);

      // Take screenshot
      const fullPage = options?.fullPage !== false; // Default true
      const screenshot = await page.screenshot({
        fullPage,
        type: 'png',
      });

      return screenshot as Buffer;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          throw new Error('TIMEOUT: Page loading timeout after 30 seconds');
        }
        if (error.message.includes('net::ERR')) {
          throw new Error('NAVIGATION_FAILED: Cannot navigate to URL');
        }
      }
      throw error;
    } finally {
      // Always close the page
      if (page) {
        await page.close();
      }
    }
  }

  getErrorCode(error: unknown): string {
    if (error instanceof Error) {
      if (error.message.includes('TIMEOUT')) return 'TIMEOUT';
      if (error.message.includes('NAVIGATION_FAILED')) return 'NAVIGATION_FAILED';
      if (error.message.includes('upload')) return 'UPLOAD_FAILED';
    }
    return 'SCREENSHOT_FAILED';
  }

  async shutdown() {
    if (this.isShuttingDown) return;

    this.isShuttingDown = true;
    console.log('⏳ Shutting down worker...');

    // Close queue (wait for active jobs to finish)
    await screenshotQueue.close();

    // Close browser
    if (this.browser) {
      await this.browser.close();
    }

    console.log('👋 Worker shut down gracefully');
    process.exit(0);
  }
}

export default ScreenshotWorker;
