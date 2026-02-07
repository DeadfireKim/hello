import { NextRequest, NextResponse } from 'next/server';
import { getJobStatus } from '@/lib/queue/simple-queue';
import { JobStatusResponse } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    // Get job status
    const job = await getJobStatus(jobId);

    if (!job) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'JOB_NOT_FOUND',
            message: `Job with ID ${jobId} not found`,
          },
        },
        { status: 404 }
      );
    }

    // Map job state to our status
    const statusMap: Record<string, 'pending' | 'processing' | 'completed' | 'failed'> = {
      pending: 'pending',
      active: 'processing',
      completed: 'completed',
      failed: 'failed',
    };

    const status = statusMap[job.status] || 'pending';

    const response: JobStatusResponse = {
      jobId: job.id as string,
      status,
      targetUrl: job.data.targetUrl,
      createdAt: new Date(job.data.createdAt).toISOString(),
    };

    // Add timestamps
    if (job.processedOn) {
      response.startedAt = new Date(job.processedOn).toISOString();
    }

    if (job.finishedOn) {
      response.completedAt = new Date(job.finishedOn).toISOString();
    }

    // Add result if completed
    if (status === 'completed' && job.result) {
      response.screenshot = {
        url: job.result.imageUrl,
        format: job.data.options?.format || 'png',
        width: job.result.width,
        height: job.result.height,
        size: job.result.size,
      };
    }

    // Add error if failed
    if (status === 'failed' && job.failedReason) {
      response.error = {
        code: 'SCREENSHOT_FAILED',
        message: job.failedReason,
      };
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Get job status error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching job status',
        },
      },
      { status: 500 }
    );
  }
}
