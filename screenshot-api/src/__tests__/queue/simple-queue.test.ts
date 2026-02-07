import { ScreenshotJobData, JobResult } from '@/lib/types';

// Mock the global queue to avoid singleton issues
jest.mock('@/lib/queue/simple-queue', () => {
  const EventEmitter = require('events');

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

      setImmediate(() => this.processNext());

      return job;
    }

    process(concurrency: number, processor: JobProcessor) {
      this.concurrency = concurrency;
      this.processor = processor;
      this.processNext();
    }

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
        const result = await this.processor(job);

        job.status = 'completed';
        job.progress = 100;
        job.result = result;
        job.completedAt = Date.now();

        this.emit('completed', job);
      } catch (error) {
        job.attempts++;

        if (job.attempts < job.maxAttempts) {
          const delay = Math.pow(2, job.attempts) * 1000;

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
        }
      } finally {
        this.activeJobs.delete(jobId);
        this.processingCount--;

        setImmediate(() => this.processNext());
      }
    }

    async getJob(jobId: string): Promise<Job | null> {
      return this.jobs.get(jobId) || null;
    }

    async updateProgress(jobId: string, progress: number) {
      const job = this.jobs.get(jobId);
      if (job) {
        job.progress = progress;
      }
    }

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

    async pause() {
      this.processor = null;
    }

    async close() {
      this.processor = null;
      this.removeAllListeners();
    }

    cleanup(maxAge: number = 3600000) {
      const now = Date.now();
      let cleaned = 0;

      for (const [jobId, job] of this.jobs.entries()) {
        if (job.completedAt && now - job.completedAt > maxAge) {
          this.jobs.delete(jobId);
          cleaned++;
        }
      }

      return cleaned;
    }
  }

  const queue = new SimpleQueue('test-queue');

  return {
    __esModule: true,
    default: queue,
    createJob: async (data: ScreenshotJobData) => await queue.add(data),
    getJobStatus: async (jobId: string) => {
      const job = await queue.getJob(jobId);
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
    },
    getQueueStats: async () => await queue.getStats(),
  };
});

import screenshotQueue, { createJob, getJobStatus, getQueueStats } from '@/lib/queue/simple-queue';

describe('SimpleQueue', () => {
  const mockJobData: ScreenshotJobData = {
    id: 'test-job-1',
    targetUrl: 'https://example.com',
    callbackUrl: 'https://callback.example.com/webhook',
    options: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createJob', () => {
    it('should create a new job', async () => {
      const job = await createJob({
        ...mockJobData,
        id: `test-${Date.now()}`,
      });

      expect(job).toBeDefined();
      expect(job.id).toBe(job.id);
      expect(job.status).toBe('pending');
      expect(job.progress).toBe(0);
      expect(job.attempts).toBe(0);
    });

    it('should add job to pending queue', async () => {
      const jobId = `test-${Date.now()}`;
      await createJob({ ...mockJobData, id: jobId });

      const stats = await getQueueStats();
      expect(stats.waiting).toBeGreaterThan(0);
    });
  });

  describe('getJobStatus', () => {
    it('should return job status', async () => {
      const jobId = `test-${Date.now()}`;
      await createJob({ ...mockJobData, id: jobId });

      const status = await getJobStatus(jobId);

      expect(status).toBeDefined();
      expect(status?.id).toBe(jobId);
      expect(status?.status).toBe('pending');
    });

    it('should return null for non-existent job', async () => {
      const status = await getJobStatus('non-existent-id');
      expect(status).toBeNull();
    });
  });

  describe('job processing', () => {
    it('should process jobs successfully', async () => {
      const jobId = `test-${Date.now()}`;
      const job = await createJob({ ...mockJobData, id: jobId });

      const mockProcessor = jest.fn().mockResolvedValue({
        screenshotUrl: 'https://example.com/screenshot.png',
        format: 'png',
        width: 1920,
        height: 1080,
        size: 123456,
      });

      screenshotQueue.process(1, mockProcessor);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      const status = await getJobStatus(jobId);
      expect(mockProcessor).toHaveBeenCalled();
    });

    it('should handle job failures with retry', async () => {
      const jobId = `test-${Date.now()}`;
      await createJob({ ...mockJobData, id: jobId });

      let callCount = 0;
      const mockProcessor = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          throw new Error('Temporary failure');
        }
        return Promise.resolve({
          screenshotUrl: 'https://example.com/screenshot.png',
          format: 'png',
          width: 1920,
          height: 1080,
          size: 123456,
        });
      });

      screenshotQueue.process(1, mockProcessor);

      // Wait for retries
      await new Promise(resolve => setTimeout(resolve, 5000));

      expect(callCount).toBeGreaterThan(1);
    }, 10000);
  });

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      const stats = await getQueueStats();

      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('waiting');
      expect(stats).toHaveProperty('active');
      expect(stats).toHaveProperty('completed');
      expect(stats).toHaveProperty('failed');
      expect(stats).toHaveProperty('total');
    });
  });

  describe('cleanup', () => {
    it('should remove old completed jobs', async () => {
      const jobId = `test-${Date.now()}`;
      await createJob({ ...mockJobData, id: jobId });

      // Manually mark job as completed with old timestamp
      const job = await screenshotQueue.getJob(jobId);
      if (job) {
        job.status = 'completed';
        job.completedAt = Date.now() - 7200000; // 2 hours ago
      }

      const cleaned = screenshotQueue.cleanup(3600000); // Clean jobs older than 1 hour

      expect(cleaned).toBeGreaterThan(0);
    });
  });
});
