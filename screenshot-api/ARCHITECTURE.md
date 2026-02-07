# Screenshot API Architecture

## System Overview

```
┌────────────────┐
│  External API  │
│     Client     │
└───────┬────────┘
        │ POST /api/screenshot
        │ {targetUrl, callbackUrl}
        ▼
┌────────────────────────────────┐
│      Next.js API Server        │
│  ┌──────────────────────────┐  │
│  │  Rate Limiter (Redis)    │  │
│  │  Request Validator (Zod) │  │
│  │  Job Creator (UUID)      │  │
│  └──────────────────────────┘  │
└───────┬────────────────────────┘
        │ Create Job
        ▼
┌────────────────────────────────┐
│     Bull Queue (Redis)         │
│  ┌──────────────────────────┐  │
│  │  Pending Jobs Queue      │  │
│  │  Active Jobs Tracking    │  │
│  │  Failed Jobs Retry       │  │
│  └──────────────────────────┘  │
└───────┬────────────────────────┘
        │ Worker Polls
        ▼
┌────────────────────────────────┐
│      Screenshot Worker         │
│  ┌──────────────────────────┐  │
│  │  1. Puppeteer Launch     │  │
│  │  2. Navigate to URL      │  │
│  │  3. Wait for Load        │  │
│  │  4. Capture Screenshot   │  │
│  │  5. Sharp Optimization   │  │
│  │  6. Upload to S3/R2      │  │
│  │  7. Send Callback        │  │
│  └──────────────────────────┘  │
└───────┬────────────────────────┘
        │ Upload
        ▼
┌────────────────────────────────┐
│   Cloud Storage (S3/R2)        │
│   - screenshot-{uuid}.png      │
│   - Signed URL (24h expiry)    │
└───────┬────────────────────────┘
        │ POST callback
        ▼
┌────────────────────────────────┐
│   External Webhook Endpoint    │
│   Receives result notification │
└────────────────────────────────┘
```

## Components

### 1. API Server (Next.js)

**Purpose**: Receive requests, validate, create jobs

**Files**:
- `src/app/api/screenshot/route.ts` - POST endpoint
- `src/app/api/screenshot/[jobId]/route.ts` - GET status
- `src/app/api/health/route.ts` - Health check

**Responsibilities**:
- Request validation (Zod)
- Rate limiting (10 req/min per IP)
- Job creation with UUID
- Immediate response (202 Accepted)

### 2. Job Queue (Bull + Redis)

**Purpose**: Async job management

**Files**:
- `src/lib/queue/screenshot-queue.ts`

**Features**:
- Job persistence
- Retry logic (3 attempts, exponential backoff)
- Job status tracking
- Queue statistics

### 3. Worker Process

**Purpose**: Execute screenshot jobs

**Files**:
- `src/lib/worker/screenshot-worker.ts` - Main worker
- `src/lib/worker/image-optimizer.ts` - Sharp optimization
- `src/lib/worker/storage-uploader.ts` - S3/R2 upload
- `src/lib/utils/callback-sender.ts` - Webhook POST
- `src/scripts/start-worker.ts` - Entry point

**Process Flow**:
1. Poll job from queue
2. Launch Puppeteer page
3. Navigate to target URL
4. Wait for page load (networkidle2)
5. Capture full-page screenshot
6. Optimize with Sharp (PNG/JPEG/WebP)
7. Upload to S3/R2
8. Generate signed URL
9. POST to callback URL
10. Update job status

### 4. Storage (S3/R2)

**Purpose**: Store screenshot images

**Configuration**:
- Bucket: `screenshot-bucket`
- Path: `screenshots/{uuid}.png`
- Signed URL: 24h expiry

### 5. Redis

**Purpose**: Queue backend and rate limiting

**Usage**:
- Bull Queue storage
- Rate limit counters (key: `ratelimit:{ip}`)
- Job status cache

## Data Flow

### Request Flow

```
1. Client → POST /api/screenshot
2. API validates request (Zod schema)
3. API checks rate limit (Redis)
4. API creates UUID for job
5. API pushes job to Bull Queue
6. API returns 202 with jobId
```

### Worker Flow

```
1. Worker polls Bull Queue (concurrency: 5)
2. Worker launches Puppeteer page
3. Worker navigates to targetUrl
4. Worker waits for networkidle2 (30s timeout)
5. Worker captures screenshot
6. Worker optimizes with Sharp
7. Worker uploads to S3/R2
8. Worker gets signed URL
9. Worker POSTs to callbackUrl (retry 3x)
10. Worker marks job complete
```

## Error Handling

### Error Types

| Error Code | Retryable | Description |
|------------|-----------|-------------|
| `TIMEOUT` | Yes | Page load timeout (30s) |
| `NAVIGATION_FAILED` | Yes | Cannot navigate to URL |
| `SCREENSHOT_FAILED` | Yes | Screenshot capture failed |
| `UPLOAD_FAILED` | Yes | S3/R2 upload failed |
| `INVALID_URL` | No | URL format invalid |
| `RATE_LIMIT_EXCEEDED` | No | Too many requests |

### Retry Strategy

**Job Retry**:
- Max attempts: 3
- Backoff: Exponential (2s, 4s, 8s)

**Callback Retry**:
- Max attempts: 3
- Delays: 1min, 5min, 15min
- Retry on 5xx errors

## Performance

### Metrics

- API response time: < 500ms
- Screenshot generation: 5-10s average
- Concurrent jobs: 5 per worker
- Queue throughput: 10 jobs/second

### Scaling

**Horizontal Scaling**:
- Deploy multiple worker instances
- All workers connect to same Redis
- Automatic job distribution

**Vertical Scaling**:
- Increase `WORKER_CONCURRENCY` env var
- More CPU/RAM for faster processing

## Security

### Rate Limiting

- 10 requests per minute per IP
- Redis-backed counter
- Automatic reset after 60s

### Input Validation

- URL format check (http/https)
- Max URL length: 2048 chars
- Zod schema validation

### Storage Security

- Signed URLs (24h expiry)
- S3/R2 bucket not publicly accessible
- Images auto-expire (optional)

## Monitoring

### Health Check

`GET /api/health` returns:
- Redis connection status
- Queue statistics
- Worker status

### Logs

- Job created: `📸 Processing job {id}: {url}`
- Job completed: `✅ Job {id} completed successfully`
- Job failed: `❌ Job {id} failed: {error}`
- Callback sent: `✅ Callback sent successfully`

### Metrics to Track

- Job success rate
- Average processing time
- Queue length
- Error rate by type
- Callback delivery rate

## Deployment

### Environment Variables

```bash
# Redis
REDIS_URL=redis://localhost:6379

# Storage
S3_BUCKET=screenshot-bucket
S3_REGION=auto
S3_ACCESS_KEY_ID=***
S3_SECRET_ACCESS_KEY=***
S3_ENDPOINT=https://account.r2.cloudflarestorage.com

# Worker
WORKER_CONCURRENCY=5
```

### Railway Deployment

1. Connect GitHub repository
2. Set environment variables
3. Deploy API + Worker as separate services
4. Share Redis between services

---

**Last Updated**: 2026-02-07
