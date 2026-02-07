# Screenshot API

> Website Screenshot Service with Webhook Callback

A RESTful API service that captures full-page screenshots of websites and sends results via webhook callback. Built with Next.js, Bull Queue, Puppeteer, and Redis.

## 🚀 Features

- ✅ **Async Job Processing** - Non-blocking screenshot generation
- ✅ **Webhook Callback** - Automatic result delivery
- ✅ **Full Page Capture** - Includes content below the fold
- ✅ **Rate Limiting** - 10 requests/minute per IP
- ✅ **Job Status Tracking** - Query job progress
- ✅ **Error Retry** - Automatic retry on failure (3 attempts)

## 📦 Tech Stack

- **API**: Next.js 15 API Routes
- **Queue**: In-Memory Simple Queue (No Redis!)
- **Screenshot**: Puppeteer (Headless Chrome)
- **Image Processing**: Sharp
- **Storage**: AWS S3 / Cloudflare R2

### ✨ Simplified Architecture
- ✅ **No Redis Required** - Uses in-memory queue
- ✅ **Single Server** - API + Worker in one process
- ✅ **Easy Setup** - Just Node.js needed
- ⚠️ **Trade-off**: Jobs lost on server restart

## 🔧 Prerequisites

- Node.js 20+
- AWS S3 or Cloudflare R2 account (for image storage)

**That's it!** No Redis, no additional services needed.

## 📖 Installation

### 1. Clone and Install

\`\`\`bash
git clone <repository-url>
cd screenshot-api
npm install
\`\`\`

### 2. Environment Variables

Copy \`.env.example\` to \`.env.local\`:

\`\`\`bash
cp .env.example .env.local
\`\`\`

Edit \`.env.local\`:

\`\`\`bash
# Redis
REDIS_URL=redis://localhost:6379

# Storage (Cloudflare R2 or AWS S3)
S3_BUCKET=your-bucket-name
S3_REGION=auto
S3_ACCESS_KEY_ID=your_access_key
S3_SECRET_ACCESS_KEY=your_secret_key
S3_ENDPOINT=https://your-account.r2.cloudflarestorage.com
\`\`\`

### 3. Run Development Server

**Terminal 1: API Server**

\`\`\`bash
npm run dev
\`\`\`

**Terminal 2: Worker Process**

\`\`\`bash
npm run worker
\`\`\`

Visit [http://localhost:3000](http://localhost:3000)

**Or run both together:**

\`\`\`bash
npm run start:all
\`\`\`

## 📡 API Endpoints

### POST /api/screenshot

Create a screenshot job.

**Request:**

\`\`\`bash
curl -X POST http://localhost:3000/api/screenshot \
  -H "Content-Type: application/json" \
  -d '{
    "targetUrl": "https://example.com",
    "callbackUrl": "https://your-service.com/webhook"
  }'
\`\`\`

**Response (202 Accepted):**

\`\`\`json
{
  "success": true,
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "message": "Screenshot job created successfully",
  "estimatedTime": "5-10 seconds",
  "statusUrl": "/api/screenshot/550e8400-e29b-41d4-a716-446655440000"
}
\`\`\`

**Optional Parameters:**

\`\`\`json
{
  "targetUrl": "https://example.com",
  "callbackUrl": "https://your-service.com/webhook",
  "options": {
    "viewport": {
      "width": 1920,
      "height": 1080
    },
    "fullPage": true,
    "format": "png",
    "quality": 80
  }
}
\`\`\`

### GET /api/screenshot/:jobId

Query job status.

**Request:**

\`\`\`bash
curl http://localhost:3000/api/screenshot/550e8400-e29b-41d4-a716-446655440000
\`\`\`

**Response:**

\`\`\`json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "targetUrl": "https://example.com",
  "createdAt": "2026-02-07T10:00:00Z",
  "completedAt": "2026-02-07T10:00:08Z",
  "screenshot": {
    "url": "https://storage.example.com/screenshots/550e8400.png",
    "format": "png",
    "width": 1920,
    "height": 3840,
    "size": 524288
  }
}
\`\`\`

### GET /api/health

Health check endpoint.

\`\`\`bash
curl http://localhost:3000/api/health
\`\`\`

## 🪝 Webhook Callback

When screenshot completes, a POST request is sent to your \`callbackUrl\`:

**Success Callback:**

\`\`\`json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "targetUrl": "https://example.com",
  "screenshot": {
    "url": "https://storage.example.com/screenshots/550e8400.png",
    "format": "png",
    "width": 1920,
    "height": 3840,
    "size": 524288
  },
  "completedAt": "2026-02-07T10:00:08Z"
}
\`\`\`

**Failure Callback:**

\`\`\`json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "failed",
  "targetUrl": "https://example.com",
  "error": {
    "code": "TIMEOUT",
    "message": "Page loading timeout after 30 seconds"
  },
  "completedAt": "2026-02-07T10:00:30Z"
}
\`\`\`

## 🔒 Rate Limiting

- **Limit**: 10 requests per minute per IP
- **Window**: 60 seconds
- **Response**: 429 Too Many Requests

## ⚠️ Error Codes

| Code | Description |
|------|-------------|
| \`VALIDATION_ERROR\` | Invalid request parameters |
| \`RATE_LIMIT_EXCEEDED\` | Too many requests |
| \`JOB_NOT_FOUND\` | Job ID not found |
| \`TIMEOUT\` | Page loading timeout (30s) |
| \`NAVIGATION_FAILED\` | Cannot navigate to URL |
| \`SCREENSHOT_FAILED\` | Screenshot capture failed |

## 🎉 Implementation Status

### Week 1: API + Queue ✅
- [x] Next.js API Routes
- [x] Bull Queue with Redis
- [x] Request validation
- [x] Rate limiting
- [x] Job status tracking

### Week 2: Worker + Storage ✅
- [x] Puppeteer screenshot capture
- [x] Sharp image optimization
- [x] S3/R2 storage integration
- [x] Webhook callback sender
- [x] Worker process with graceful shutdown

### Deployment 🚧
- [ ] Deploy to Railway/Render
- [ ] Configure production environment
- [ ] Set up monitoring

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! Please open an issue or PR.

---

**Built with [Claude Code](https://claude.com/claude-code) 🤖**
