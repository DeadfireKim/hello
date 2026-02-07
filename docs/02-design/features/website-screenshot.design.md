# Design: Website Screenshot API Service

> **Feature ID**: website-screenshot
> **Created**: 2026-02-07
> **Status**: Design
> **PDCA Phase**: Design
> **Based on**: [Plan Document](../../01-plan/features/website-screenshot.plan.md)

## 목차 (Table of Contents)

1. [시스템 아키텍처](#1-시스템-아키텍처)
2. [API 설계](#2-api-설계)
3. [데이터베이스 설계](#3-데이터베이스-설계)
4. [Worker 아키텍처](#4-worker-아키텍처)
5. [Job Queue 설계](#5-job-queue-설계)
6. [에러 처리 및 재시도](#6-에러-처리-및-재시도)
7. [파일 구조](#7-파일-구조)
8. [모듈 설계](#8-모듈-설계)
9. [배포 아키텍처](#9-배포-아키텍처)
10. [구현 순서](#10-구현-순서)

---

## 1. 시스템 아키텍처

### 1.1 전체 구조도

```
┌─────────────────────────────────────────────────────────────────┐
│                        External Services                         │
│  (Blog Platform, URL Shortener, Monitoring Service, etc.)       │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          │ POST /api/screenshot
                          │ {targetUrl, callbackUrl}
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API Server                               │
│                    (Next.js / Express)                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  API Route Handler                                        │  │
│  │  - Request Validation                                     │  │
│  │  - Job Creation (UUID)                                    │  │
│  │  - Rate Limiting                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────┬─────────────────────────────────────────────────┘
                │
                │ Job Created
                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Job Queue (Redis)                            │
│                    Bull Queue System                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Queue: screenshot-jobs                                   │  │
│  │  - Pending Jobs                                           │  │
│  │  - Active Jobs                                            │  │
│  │  - Failed Jobs (for retry)                                │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────┬─────────────────────────────────────────────────┘
                │
                │ Worker Polls Jobs
                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Worker Process                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Job Processor                                            │  │
│  │  1. Launch Puppeteer                                      │  │
│  │  2. Navigate to targetUrl                                 │  │
│  │  3. Wait for page load                                    │  │
│  │  4. Take screenshot                                       │  │
│  │  5. Optimize with Sharp                                   │  │
│  │  6. Upload to S3/R2                                       │  │
│  │  7. POST to callbackUrl                                   │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────┬─────────────────────────────────────────────────┘
                │
                │ Upload Image
                ▼
┌─────────────────────────────────────────────────────────────────┐
│                Cloud Storage (S3/R2)                             │
│  - screenshot-{jobId}.png                                        │
│  - Signed URL (24h expiry)                                       │
└─────────────────────────────────────────────────────────────────┘
                │
                │ Callback with image URL
                ▼
┌─────────────────────────────────────────────────────────────────┐
│              External Service Webhook Endpoint                   │
│  POST callbackUrl                                                │
│  {jobId, status, screenshot: {url, width, height}}               │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 컴포넌트 역할

| 컴포넌트 | 역할 | 기술 스택 |
|---------|------|-----------|
| **API Server** | 요청 수신, 검증, Job 생성 | Next.js API Routes / Express |
| **Job Queue** | 비동기 Job 관리, 우선순위 처리 | Bull + Redis |
| **Worker** | 스크린샷 생성 및 처리 | Node.js + Puppeteer + Sharp |
| **Database** | Job 상태 영구 저장 | PostgreSQL (optional) |
| **Storage** | 이미지 파일 저장 | Cloudflare R2 / AWS S3 |
| **Cache** | Job 상태 임시 저장 | Redis |

---

## 2. API 설계

### 2.1 스크린샷 요청 API

#### Endpoint
```
POST /api/screenshot
```

#### Request Schema

```typescript
interface ScreenshotRequest {
  targetUrl: string;      // Required: URL to capture
  callbackUrl: string;    // Required: Webhook URL for result
  options?: {             // Optional: Screenshot options
    viewport?: {
      width: number;      // Default: 1920
      height: number;     // Default: 1080
    };
    fullPage?: boolean;   // Default: true
    format?: 'png' | 'jpeg' | 'webp'; // Default: 'png'
    quality?: number;     // 1-100, for jpeg/webp only
  };
}
```

#### Request Validation Rules

```typescript
const requestSchema = {
  targetUrl: {
    required: true,
    type: 'string',
    pattern: /^https?:\/\/.+/,
    maxLength: 2048,
  },
  callbackUrl: {
    required: true,
    type: 'string',
    pattern: /^https?:\/\/.+/,
    maxLength: 2048,
  },
  options: {
    required: false,
    type: 'object',
    properties: {
      viewport: {
        width: { type: 'number', min: 320, max: 3840 },
        height: { type: 'number', min: 240, max: 2160 },
      },
      fullPage: { type: 'boolean' },
      format: { type: 'string', enum: ['png', 'jpeg', 'webp'] },
      quality: { type: 'number', min: 1, max: 100 },
    },
  },
};
```

#### Response Schema (Success)

```typescript
interface ScreenshotResponse {
  success: true;
  jobId: string;          // UUID v4
  status: 'pending';
  message: string;
  estimatedTime: string;  // e.g., "5-10 seconds"
  statusUrl: string;      // GET /api/screenshot/{jobId}
}
```

**Example Response**:
```json
{
  "success": true,
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "message": "Screenshot job created successfully",
  "estimatedTime": "5-10 seconds",
  "statusUrl": "/api/screenshot/550e8400-e29b-41d4-a716-446655440000"
}
```

#### Response Schema (Error)

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}
```

**Error Codes**:
| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_URL` | 400 | targetUrl is invalid or malformed |
| `INVALID_CALLBACK` | 400 | callbackUrl is invalid |
| `MISSING_PARAMETER` | 400 | Required parameter missing |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests from IP |
| `INTERNAL_ERROR` | 500 | Server error |

### 2.2 Job 상태 조회 API

#### Endpoint
```
GET /api/screenshot/:jobId
```

#### Response Schema

```typescript
interface JobStatusResponse {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  targetUrl: string;
  createdAt: string;      // ISO 8601
  startedAt?: string;
  completedAt?: string;
  screenshot?: {          // Only if status === 'completed'
    url: string;
    format: string;
    width: number;
    height: number;
    size: number;         // bytes
  };
  error?: {               // Only if status === 'failed'
    code: string;
    message: string;
  };
}
```

**Example Response (Completed)**:
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "targetUrl": "https://example.com",
  "createdAt": "2026-02-07T10:00:00Z",
  "startedAt": "2026-02-07T10:00:01Z",
  "completedAt": "2026-02-07T10:00:08Z",
  "screenshot": {
    "url": "https://storage.example.com/screenshots/550e8400.png",
    "format": "png",
    "width": 1920,
    "height": 3840,
    "size": 524288
  }
}
```

### 2.3 Webhook Callback

#### Callback Request (Success)

```typescript
interface CallbackPayload {
  jobId: string;
  status: 'completed';
  targetUrl: string;
  screenshot: {
    url: string;          // Signed URL (24h expiry)
    format: string;
    width: number;
    height: number;
    size: number;
  };
  completedAt: string;    // ISO 8601
}
```

#### Callback Request (Failure)

```typescript
interface CallbackPayload {
  jobId: string;
  status: 'failed';
  targetUrl: string;
  error: {
    code: string;
    message: string;
  };
  completedAt: string;
}
```

**Error Codes**:
| Code | Description |
|------|-------------|
| `TIMEOUT` | Page loading timeout (30s) |
| `NAVIGATION_FAILED` | Cannot navigate to URL |
| `SCREENSHOT_FAILED` | Screenshot capture failed |
| `UPLOAD_FAILED` | Image upload to storage failed |
| `INVALID_URL` | URL is unreachable or blocked |

#### Callback Retry Logic

```typescript
const callbackRetryConfig = {
  maxRetries: 3,
  retryDelays: [60000, 300000, 900000], // 1min, 5min, 15min
  retryOn: [500, 502, 503, 504], // HTTP status codes
};
```

---

## 3. 데이터베이스 설계

### 3.1 Database Schema

#### screenshot_jobs Table

```sql
CREATE TABLE screenshot_jobs (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Request Data
  target_url TEXT NOT NULL,
  callback_url TEXT NOT NULL,

  -- Job Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- Status values: 'pending', 'processing', 'completed', 'failed', 'callback_failed'

  -- Screenshot Options
  viewport_width INTEGER DEFAULT 1920,
  viewport_height INTEGER DEFAULT 1080,
  full_page BOOLEAN DEFAULT true,
  image_format VARCHAR(10) DEFAULT 'png',
  image_quality INTEGER,

  -- Result Data
  image_url TEXT,
  image_width INTEGER,
  image_height INTEGER,
  image_size INTEGER, -- bytes

  -- Error Data
  error_code VARCHAR(50),
  error_message TEXT,

  -- Retry Counters
  retry_count INTEGER DEFAULT 0,
  callback_retry_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  callback_sent_at TIMESTAMP,

  -- Metadata
  ip_address INET,
  user_agent TEXT
);

-- Indexes
CREATE INDEX idx_status ON screenshot_jobs(status);
CREATE INDEX idx_created_at ON screenshot_jobs(created_at DESC);
CREATE INDEX idx_completed_at ON screenshot_jobs(completed_at DESC) WHERE completed_at IS NOT NULL;
```

#### Status Transitions

```
pending → processing → completed → (callback sent)
                    ↓
                   failed → (retry) → processing
                                   ↓
                              callback_failed
```

### 3.2 Redis Data Structure

#### Job Data (임시 저장)

```typescript
// Key: job:{jobId}
interface RedisJobData {
  id: string;
  targetUrl: string;
  callbackUrl: string;
  status: string;
  options: ScreenshotOptions;
  createdAt: number;        // Unix timestamp
  ttl: 86400;              // 24 hours
}
```

#### Rate Limiting

```typescript
// Key: ratelimit:{ip}
// Value: request count
// TTL: 60 seconds
const rateLimitConfig = {
  windowMs: 60000,          // 1 minute
  maxRequests: 10,          // 10 requests per IP
};
```

---

## 4. Worker 아키텍처

### 4.1 Worker Process 구조

```typescript
class ScreenshotWorker {
  private queue: Queue;
  private browser?: Browser;

  async initialize() {
    // Initialize Bull Queue connection
    this.queue = new Queue('screenshot-jobs', {
      redis: process.env.REDIS_URL,
    });

    // Pre-launch Puppeteer browser (keep alive)
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    });

    // Process jobs
    this.queue.process(5, this.processJob.bind(this)); // 5 concurrent jobs
  }

  async processJob(job: Job) {
    const { id, targetUrl, callbackUrl, options } = job.data;

    try {
      // 1. Update status to 'processing'
      await this.updateJobStatus(id, 'processing');

      // 2. Take screenshot
      const screenshotBuffer = await this.captureScreenshot(targetUrl, options);

      // 3. Optimize image
      const optimizedBuffer = await this.optimizeImage(screenshotBuffer, options);

      // 4. Upload to storage
      const imageUrl = await this.uploadToStorage(id, optimizedBuffer);

      // 5. Update job status
      await this.updateJobStatus(id, 'completed', { imageUrl });

      // 6. Send callback
      await this.sendCallback(callbackUrl, {
        jobId: id,
        status: 'completed',
        screenshot: { url: imageUrl },
      });

    } catch (error) {
      await this.handleError(id, callbackUrl, error);
    }
  }

  async captureScreenshot(url: string, options: any): Promise<Buffer> {
    const page = await this.browser!.newPage();

    try {
      // Set viewport
      await page.setViewport({
        width: options.viewport?.width || 1920,
        height: options.viewport?.height || 1080,
      });

      // Navigate with timeout
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // Take screenshot
      const screenshot = await page.screenshot({
        fullPage: options.fullPage ?? true,
        type: 'png',
      });

      return screenshot as Buffer;

    } finally {
      await page.close();
    }
  }

  async optimizeImage(buffer: Buffer, options: any): Promise<Buffer> {
    const format = options.format || 'png';
    const quality = options.quality || 80;

    let pipeline = sharp(buffer);

    if (format === 'jpeg') {
      pipeline = pipeline.jpeg({ quality });
    } else if (format === 'webp') {
      pipeline = pipeline.webp({ quality });
    } else {
      pipeline = pipeline.png({ compressionLevel: 9 });
    }

    return await pipeline.toBuffer();
  }

  async uploadToStorage(jobId: string, buffer: Buffer): Promise<string> {
    // Upload to S3/R2 and return signed URL
    const key = `screenshots/${jobId}.png`;

    await s3.putObject({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: 'image/png',
    }).promise();

    // Generate signed URL (24h expiry)
    const signedUrl = await s3.getSignedUrlPromise('getObject', {
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Expires: 86400, // 24 hours
    });

    return signedUrl;
  }
}
```

### 4.2 Worker Scaling

```typescript
// Worker 개수 자동 조절
const workerConfig = {
  minWorkers: 1,
  maxWorkers: 5,
  concurrency: 5,           // Per worker
  autoscaleThreshold: 10,   // Queue length threshold
};
```

---

## 5. Job Queue 설계

### 5.1 Bull Queue 구성

```typescript
import Queue from 'bull';

const screenshotQueue = new Queue('screenshot-jobs', {
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD,
  },
  defaultJobOptions: {
    attempts: 3,              // Retry 3 times
    backoff: {
      type: 'exponential',
      delay: 2000,            // Start with 2s, then 4s, 8s
    },
    removeOnComplete: 100,    // Keep last 100 completed jobs
    removeOnFail: 500,        // Keep last 500 failed jobs
  },
});
```

### 5.2 Job Priority

```typescript
enum JobPriority {
  LOW = 10,
  NORMAL = 5,
  HIGH = 1,
}

// API Key 사용자는 HIGH priority (Phase 2)
await screenshotQueue.add(jobData, {
  priority: JobPriority.HIGH,
});
```

---

## 6. 에러 처리 및 재시도

### 6.1 에러 분류

```typescript
enum ErrorType {
  // Retryable errors
  TIMEOUT = 'TIMEOUT',
  NAVIGATION_FAILED = 'NAVIGATION_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',

  // Non-retryable errors
  INVALID_URL = 'INVALID_URL',
  BLOCKED_URL = 'BLOCKED_URL',
  RATE_LIMITED = 'RATE_LIMITED',
}

const isRetryable = (error: ErrorType): boolean => {
  return [
    ErrorType.TIMEOUT,
    ErrorType.NAVIGATION_FAILED,
    ErrorType.NETWORK_ERROR,
  ].includes(error);
};
```

### 6.2 재시도 전략

```typescript
const retryStrategy = {
  maxAttempts: 3,
  backoff: 'exponential',   // 2s, 4s, 8s
  retryableErrors: [
    'TIMEOUT',
    'NAVIGATION_FAILED',
    'NETWORK_ERROR',
  ],
};
```

### 6.3 Callback 재시도

```typescript
async function sendCallbackWithRetry(
  callbackUrl: string,
  payload: CallbackPayload,
  jobId: string,
) {
  const maxRetries = 3;
  const retryDelays = [60000, 300000, 900000]; // 1min, 5min, 15min

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(callbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        timeout: 10000, // 10s timeout
      });

      if (response.ok) {
        await updateCallbackStatus(jobId, 'sent');
        return;
      }

      // Retry on 5xx errors
      if (response.status >= 500 && attempt < maxRetries - 1) {
        await sleep(retryDelays[attempt]);
        continue;
      }

      throw new Error(`Callback failed with status ${response.status}`);

    } catch (error) {
      if (attempt === maxRetries - 1) {
        await updateCallbackStatus(jobId, 'callback_failed');
        throw error;
      }
      await sleep(retryDelays[attempt]);
    }
  }
}
```

---

## 7. 파일 구조

```
screenshot-api/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── api/
│   │   │   ├── screenshot/
│   │   │   │   ├── route.ts       # POST /api/screenshot
│   │   │   │   └── [jobId]/
│   │   │   │       └── route.ts   # GET /api/screenshot/:jobId
│   │   │   └── health/
│   │   │       └── route.ts       # GET /api/health
│   │   └── page.tsx               # Landing page (optional)
│   │
│   ├── lib/
│   │   ├── queue/
│   │   │   ├── screenshot-queue.ts     # Bull Queue setup
│   │   │   └── job-processor.ts        # Job processing logic
│   │   ├── worker/
│   │   │   ├── screenshot-worker.ts    # Puppeteer worker
│   │   │   ├── image-optimizer.ts      # Sharp optimization
│   │   │   └── storage-uploader.ts     # S3/R2 upload
│   │   ├── db/
│   │   │   ├── client.ts               # Prisma/Drizzle client
│   │   │   └── queries.ts              # Database queries
│   │   ├── validation/
│   │   │   └── schemas.ts              # Request validation schemas
│   │   ├── utils/
│   │   │   ├── rate-limiter.ts         # Rate limiting logic
│   │   │   └── callback-sender.ts      # Webhook callback
│   │   └── types/
│   │       └── index.ts                # TypeScript types
│   │
│   ├── config/
│   │   ├── redis.ts
│   │   ├── s3.ts
│   │   └── puppeteer.ts
│   │
│   └── scripts/
│       └── start-worker.ts             # Worker process entry
│
├── prisma/                             # Database schema
│   └── schema.prisma
│
├── .env.example
├── .env.local
├── package.json
├── tsconfig.json
├── next.config.js
└── README.md
```

---

## 8. 모듈 설계

### 8.1 API Route Handler

**File**: `src/app/api/screenshot/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '@/lib/validation/schemas';
import { createJob } from '@/lib/queue/screenshot-queue';
import { checkRateLimit } from '@/lib/utils/rate-limiter';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    // 1. Rate limiting
    const ip = request.ip || 'unknown';
    const rateLimitOk = await checkRateLimit(ip);
    if (!rateLimitOk) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please try again later.',
          },
        },
        { status: 429 }
      );
    }

    // 2. Parse and validate request
    const body = await request.json();
    const validation = validateRequest(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: validation.error,
          },
        },
        { status: 400 }
      );
    }

    // 3. Create job
    const jobId = uuidv4();
    await createJob({
      id: jobId,
      targetUrl: body.targetUrl,
      callbackUrl: body.callbackUrl,
      options: body.options,
      ipAddress: ip,
    });

    // 4. Return response
    return NextResponse.json(
      {
        success: true,
        jobId,
        status: 'pending',
        message: 'Screenshot job created successfully',
        estimatedTime: '5-10 seconds',
        statusUrl: `/api/screenshot/${jobId}`,
      },
      { status: 202 }
    );

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred',
        },
      },
      { status: 500 }
    );
  }
}
```

### 8.2 Job Queue Module

**File**: `src/lib/queue/screenshot-queue.ts`

```typescript
import Queue, { Job } from 'bull';
import { ScreenshotJobData } from '@/lib/types';

const screenshotQueue = new Queue<ScreenshotJobData>('screenshot-jobs', {
  redis: process.env.REDIS_URL,
});

export async function createJob(data: ScreenshotJobData): Promise<Job> {
  return await screenshotQueue.add(data, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  });
}

export async function getJobStatus(jobId: string) {
  const job = await screenshotQueue.getJob(jobId);
  if (!job) return null;

  return {
    id: job.id,
    status: await job.getState(),
    progress: job.progress(),
    data: job.data,
  };
}

export default screenshotQueue;
```

### 8.3 Worker Module

**File**: `src/lib/worker/screenshot-worker.ts`

```typescript
import puppeteer, { Browser, Page } from 'puppeteer';
import { Job } from 'bull';
import { ScreenshotJobData } from '@/lib/types';
import screenshotQueue from '../queue/screenshot-queue';
import { optimizeImage } from './image-optimizer';
import { uploadToStorage } from './storage-uploader';
import { sendCallback } from '../utils/callback-sender';
import { updateJobStatus } from '../db/queries';

class ScreenshotWorker {
  private browser: Browser | null = null;

  async start() {
    // Launch browser once
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    // Process jobs
    screenshotQueue.process(5, this.processJob.bind(this));

    console.log('Screenshot worker started');
  }

  async processJob(job: Job<ScreenshotJobData>) {
    const { id, targetUrl, callbackUrl, options } = job.data;

    try {
      await updateJobStatus(id, 'processing');

      // Capture screenshot
      const page = await this.browser!.newPage();
      await page.setViewport({
        width: options?.viewport?.width || 1920,
        height: options?.viewport?.height || 1080,
      });

      await page.goto(targetUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      const screenshot = await page.screenshot({
        fullPage: options?.fullPage ?? true,
      });

      await page.close();

      // Optimize
      const optimized = await optimizeImage(screenshot, options);

      // Upload
      const imageUrl = await uploadToStorage(id, optimized);

      // Update status
      await updateJobStatus(id, 'completed', { imageUrl });

      // Send callback
      await sendCallback(callbackUrl, {
        jobId: id,
        status: 'completed',
        screenshot: { url: imageUrl },
      });

    } catch (error) {
      await this.handleError(job, error);
      throw error;
    }
  }

  async handleError(job: Job, error: any) {
    const { id, callbackUrl } = job.data;

    await updateJobStatus(id, 'failed', {
      errorCode: error.code || 'UNKNOWN_ERROR',
      errorMessage: error.message,
    });

    await sendCallback(callbackUrl, {
      jobId: id,
      status: 'failed',
      error: {
        code: error.code || 'UNKNOWN_ERROR',
        message: error.message,
      },
    });
  }
}

export default ScreenshotWorker;
```

---

## 9. 배포 아키텍처

### 9.1 Railway Deployment

```yaml
# railway.json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm run start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### 9.2 환경 변수

```bash
# .env.example

# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Redis
REDIS_URL=redis://localhost:6379

# Storage (S3 or R2)
S3_BUCKET=screenshot-bucket
S3_REGION=auto
S3_ACCESS_KEY_ID=your_access_key
S3_SECRET_ACCESS_KEY=your_secret_key
S3_ENDPOINT=https://your-account.r2.cloudflarestorage.com

# Application
NODE_ENV=production
PORT=3000
API_BASE_URL=https://your-api.railway.app

# Worker
WORKER_CONCURRENCY=5
```

### 9.3 프로세스 구성

```json
// package.json scripts
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "worker": "tsx src/scripts/start-worker.ts",
    "start:all": "concurrently \"npm run start\" \"npm run worker\""
  }
}
```

---

## 10. 구현 순서

### Phase 1: Week 1 - API + Queue (5일)

#### Day 1-2: 프로젝트 설정
- [ ] Next.js 프로젝트 초기화
- [ ] TypeScript 설정
- [ ] 환경 변수 설정
- [ ] Redis 연결 테스트
- [ ] PostgreSQL 설정 (Prisma)

#### Day 3-4: API 구현
- [ ] POST /api/screenshot 엔드포인트
- [ ] Request validation (Zod)
- [ ] Rate limiting 구현
- [ ] Bull Queue 설정
- [ ] Job 생성 로직

#### Day 5: 상태 조회 API
- [ ] GET /api/screenshot/:jobId
- [ ] Database queries
- [ ] Error handling

### Phase 2: Week 2 - Worker + Callback (5일)

#### Day 1-2: Worker 기본 구현
- [ ] Puppeteer 설정
- [ ] Screenshot 캡처 로직
- [ ] Worker process 구현
- [ ] Job processor 연결

#### Day 3: 이미지 최적화
- [ ] Sharp 통합
- [ ] PNG 압축
- [ ] 포맷 변환 (JPEG, WebP)

#### Day 4: 스토리지 연동
- [ ] S3/R2 클라이언트 설정
- [ ] 이미지 업로드 로직
- [ ] Signed URL 생성

#### Day 5: Callback 구현
- [ ] Webhook POST 요청
- [ ] 재시도 로직
- [ ] 에러 핸들링

### Phase 3: 테스트 및 배포 (2일)

#### Day 1: 테스트
- [ ] API 엔드포인트 테스트
- [ ] Worker 로직 테스트
- [ ] 통합 테스트

#### Day 2: 배포
- [ ] Railway 배포
- [ ] 환경 변수 설정
- [ ] 모니터링 설정

---

## 11. 성공 기준

- [ ] POST /api/screenshot 응답 < 500ms
- [ ] 스크린샷 생성 평균 5-10초
- [ ] Job 성공률 > 95%
- [ ] Callback 전송 성공률 > 98%
- [ ] 동시 10개 요청 처리 가능
- [ ] 주요 웹사이트 (Google, GitHub) 정상 캡처

---

**Design 문서 작성 완료**
**다음 단계**: 구현 시작 (`/pdca do website-screenshot`)
