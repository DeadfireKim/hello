import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { validateScreenshotRequest } from '@/lib/validation/schemas';
import { createJob } from '@/lib/queue/simple-queue';
import { checkRateLimit, getRateLimitInfo } from '@/lib/utils/simple-rate-limiter';
import { ScreenshotResponse } from '@/lib/types';
import ScreenshotWorker from '@/lib/worker/screenshot-worker';

// Global worker instance
declare global {
  var screenshotWorker: ScreenshotWorker | undefined;
}

// Initialize worker on first request
async function ensureWorkerInitialized() {
  if (!global.screenshotWorker) {
    console.log('🚀 Initializing Screenshot Worker on first request...');
    global.screenshotWorker = new ScreenshotWorker();
    await global.screenshotWorker.initialize();
    console.log('✅ Screenshot Worker initialized');
  }
}

export async function POST(request: NextRequest) {
  try {
    // Ensure worker is initialized
    await ensureWorkerInitialized();

    // Get client IP
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';

    // Rate limiting
    const rateLimitOk = await checkRateLimit(ip);
    if (!rateLimitOk) {
      const rateLimitInfo = await getRateLimitInfo(ip);

      return NextResponse.json<ScreenshotResponse>(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Too many requests. Please try again in ${rateLimitInfo.resetIn} seconds.`,
            details: rateLimitInfo,
          },
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitInfo.limit.toString(),
            'X-RateLimit-Remaining': rateLimitInfo.remaining.toString(),
            'X-RateLimit-Reset': rateLimitInfo.resetIn.toString(),
          },
        }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = validateScreenshotRequest(body);

    if (!validation.success) {
      return NextResponse.json<ScreenshotResponse>(
        {
          success: false,
          error: validation.error,
        },
        { status: 400 }
      );
    }

    // Create job ID
    const jobId = uuidv4();

    // Create job in queue
    await createJob({
      id: jobId,
      targetUrl: validation.data.targetUrl,
      callbackUrl: validation.data.callbackUrl,
      options: validation.data.options,
      ipAddress: ip,
      createdAt: Date.now(),
    });

    // Return response
    const response: ScreenshotResponse = {
      success: true,
      jobId,
      status: 'pending',
      message: 'Screenshot job created successfully',
      estimatedTime: '5-10 seconds',
      statusUrl: `/api/screenshot/${jobId}`,
    };

    return NextResponse.json(response, { status: 202 });
  } catch (error) {
    console.error('API Error:', error);

    return NextResponse.json<ScreenshotResponse>(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal server error occurred',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
