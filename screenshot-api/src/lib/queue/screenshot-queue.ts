import Queue, { Job } from 'bull';
import { ScreenshotJobData } from '@/lib/types';

// Create Bull Queue
const screenshotQueue = new Queue<ScreenshotJobData>('screenshot-jobs', {
  redis: process.env.REDIS_URL || 'redis://localhost:6379',
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000, // 2s, 4s, 8s
    },
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 500, // Keep last 500 failed jobs
  },
});

// Event listeners
screenshotQueue.on('completed', (job: Job) => {
  console.log(`✅ Job ${job.id} completed`);
});

screenshotQueue.on('failed', (job: Job, err: Error) => {
  console.error(`❌ Job ${job.id} failed:`, err.message);
});

screenshotQueue.on('stalled', (job: Job) => {
  console.warn(`⚠️ Job ${job.id} stalled`);
});

screenshotQueue.on('error', (error: Error) => {
  console.error('Queue error:', error);
});

// Queue functions
export async function createJob(data: ScreenshotJobData): Promise<Job<ScreenshotJobData>> {
  return await screenshotQueue.add(data, {
    jobId: data.id,
  });
}

export async function getJobStatus(jobId: string) {
  const job = await screenshotQueue.getJob(jobId);

  if (!job) {
    return null;
  }

  const state = await job.getState();
  const progress = job.progress();

  return {
    id: job.id,
    status: state,
    progress: typeof progress === 'number' ? progress : 0,
    data: job.data,
    result: job.returnvalue,
    failedReason: job.failedReason,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn,
  };
}

export async function getQueueStats() {
  const [waiting, active, completed, failed] = await Promise.all([
    screenshotQueue.getWaitingCount(),
    screenshotQueue.getActiveCount(),
    screenshotQueue.getCompletedCount(),
    screenshotQueue.getFailedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    total: waiting + active,
  };
}

export async function pauseQueue() {
  await screenshotQueue.pause();
  console.log('⏸️ Queue paused');
}

export async function resumeQueue() {
  await screenshotQueue.resume();
  console.log('▶️ Queue resumed');
}

export default screenshotQueue;
