/**
 * Simple In-Memory Job Queue
 * Replaces Bull Queue + Redis with pure Node.js implementation
 */

import { ScreenshotJobData, JobResult } from '@/lib/types';
import { EventEmitter } from 'events';

interface Job {
  id: string;
  data: ScreenshotJobData;
  status: 'pending' | 'active' | 'completed' | 'failed';
  progress: number;
  result?: JobResult;
  error?: string;
  attempts: number;
  maxAttempts: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

type JobProcessor = (job: Job) => Promise<JobResult>;

class SimpleQueue extends EventEmitter {
  private jobs: Map<string, Job> = new Map();
  private pendingJobs: string[] = [];
  private activeJobs: Set<string> = new Set();
  private processor: JobProcessor | null = null;
  private concurrency: number = 5;
  private processingCount: number = 0;

  constructor(private name: string) {
    super();
  }

  // Add job to queue
  async add(data: ScreenshotJobData): Promise<Job> {
    const job: Job = {
      id: data.id,
      data,
      status: 'pending',
      progress: 0,
      attempts: 0,
      maxAttempts: 3,
      createdAt: Date.now(),
    };

    this.jobs.set(job.id, job);
    this.pendingJobs.push(job.id);

    console.log(`📥 Job ${job.id} added to queue`);

    // Try to process immediately if worker is running
    setImmediate(() => this.processNext());

    return job;
  }

  // Set job processor
  process(concurrency: number, processor: JobProcessor) {
    this.concurrency = concurrency;
    this.processor = processor;

    console.log(`✅ Queue processor set (concurrency: ${concurrency})`);

    // Start processing
    this.processNext();
  }

  // Process next job in queue
  private async processNext() {
    if (!this.processor) return;
    if (this.processingCount >= this.concurrency) return;
    if (this.pendingJobs.length === 0) return;

    const jobId = this.pendingJobs.shift();
    if (!jobId) return;

    const job = this.jobs.get(jobId);
    if (!job) return;

    this.processingCount++;
    this.activeJobs.add(jobId);
    job.status = 'active';
    job.startedAt = Date.now();

    try {
      console.log(`⚙️ Processing job ${jobId}...`);
      const result = await this.processor(job);

      job.status = 'completed';
      job.progress = 100;
      job.result = result;
      job.completedAt = Date.now();

      this.emit('completed', job);
      console.log(`✅ Job ${jobId} completed`);
    } catch (error) {
      job.attempts++;

      if (job.attempts < job.maxAttempts) {
        // Retry with exponential backoff
        const delay = Math.pow(2, job.attempts) * 1000; // 2s, 4s, 8s
        console.log(`⚠️ Job ${jobId} failed, retrying in ${delay}ms (attempt ${job.attempts}/${job.maxAttempts})`);

        setTimeout(() => {
          job.status = 'pending';
          this.pendingJobs.push(jobId);
          this.processNext();
        }, delay);
      } else {
        job.status = 'failed';
        job.error = error instanceof Error ? error.message : 'Unknown error';
        job.completedAt = Date.now();

        this.emit('failed', job, error);
        console.error(`❌ Job ${jobId} failed after ${job.attempts} attempts`);
      }
    } finally {
      this.activeJobs.delete(jobId);
      this.processingCount--;

      // Process next job
      setImmediate(() => this.processNext());
    }
  }

  // Get job by ID
  async getJob(jobId: string): Promise<Job | null> {
    return this.jobs.get(jobId) || null;
  }

  // Update job progress
  async updateProgress(jobId: string, progress: number) {
    const job = this.jobs.get(jobId);
    if (job) {
      job.progress = progress;
    }
  }

  // Get queue stats
  async getStats() {
    const jobs = Array.from(this.jobs.values());

    return {
      waiting: this.pendingJobs.length,
      active: this.activeJobs.size,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length,
      total: this.pendingJobs.length + this.activeJobs.size,
    };
  }

  // Pause queue
  async pause() {
    this.processor = null;
    console.log('⏸️ Queue paused');
  }

  // Resume queue
  async resume(processor: JobProcessor) {
    this.processor = processor;
    console.log('▶️ Queue resumed');
    this.processNext();
  }

  // Close queue
  async close() {
    this.processor = null;
    this.removeAllListeners();
    console.log('👋 Queue closed');
  }

  // Clean up old jobs (older than 1 hour)
  cleanup(maxAge: number = 3600000) {
    const now = Date.now();
    let cleaned = 0;

    for (const [jobId, job] of this.jobs.entries()) {
      if (job.completedAt && now - job.completedAt > maxAge) {
        this.jobs.delete(jobId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} old jobs`);
    }
  }
}

// Create singleton queue instance
const screenshotQueue = new SimpleQueue('screenshot-jobs');

// Auto cleanup every 10 minutes
setInterval(() => {
  screenshotQueue.cleanup();
}, 600000);

// Export functions for API compatibility
export async function createJob(data: ScreenshotJobData) {
  return await screenshotQueue.add(data);
}

export async function getJobStatus(jobId: string) {
  const job = await screenshotQueue.getJob(jobId);
  if (!job) return null;

  return {
    id: job.id,
    status: job.status,
    progress: job.progress,
    data: job.data,
    result: job.result,
    failedReason: job.error,
    processedOn: job.startedAt,
    finishedOn: job.completedAt,
  };
}

export async function getQueueStats() {
  return await screenshotQueue.getStats();
}

export async function pauseQueue() {
  await screenshotQueue.pause();
}

export async function resumeQueue() {
  // Will be set by worker
  console.log('Resume queue - processor will be set by worker');
}

export default screenshotQueue;
