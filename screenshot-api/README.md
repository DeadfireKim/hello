# Screenshot API

> Webhook 콜백을 지원하는 웹사이트 스크린샷 서비스

Next.js, Puppeteer, Sharp로 구축된 RESTful API 서비스입니다. 웹사이트의 전체 페이지 스크린샷을 캡처하고 webhook 콜백으로 결과를 전달합니다.

## 🚀 주요 기능

- ✅ **비동기 작업 처리** - 논블로킹 스크린샷 생성
- ✅ **Webhook 콜백** - 자동 결과 전송
- ✅ **전체 페이지 캡처** - 스크롤 아래 콘텐츠 포함
- ✅ **요청 제한** - IP당 분당 10회 요청
- ✅ **작업 상태 추적** - 작업 진행상황 조회
- ✅ **에러 재시도** - 실패 시 자동 재시도 (3회)

## 📦 기술 스택

- **API**: Next.js 15 API Routes
- **Queue**: In-Memory Simple Queue (Redis 불필요!)
- **Screenshot**: Puppeteer (Headless Chrome)
- **Image Processing**: Sharp
- **Storage**: AWS S3 / Cloudflare R2

### ✨ 간소화된 아키텍처
- ✅ **Redis 불필요** - 인메모리 큐 사용
- ✅ **단일 서버** - API + Worker가 하나의 프로세스
- ✅ **간편한 설정** - Node.js만 필요
- ⚠️ **트레이드오프**: 서버 재시작 시 작업 손실

## 🔧 사전 요구사항

- Node.js 20+
- AWS S3 또는 Cloudflare R2 계정 (이미지 저장용)

**이게 전부입니다!** Redis나 추가 서비스가 필요하지 않습니다.

## 📖 설치 방법

### 1. 클론 및 설치

\`\`\`bash
git clone <repository-url>
cd screenshot-api
npm install
\`\`\`

### 2. 환경 변수 설정

\`.env.example\`을 \`.env.local\`로 복사:

\`\`\`bash
cp .env.example .env.local
\`\`\`

\`.env.local\` 파일 수정:

\`\`\`bash
# Storage (Cloudflare R2 or AWS S3)
S3_BUCKET=your-bucket-name
S3_REGION=auto
S3_ACCESS_KEY_ID=your_access_key
S3_SECRET_ACCESS_KEY=your_secret_key
S3_ENDPOINT=https://your-account.r2.cloudflarestorage.com

# Application
NEXT_PUBLIC_API_URL=http://localhost:3000
NODE_ENV=development
PORT=3000

# Worker
WORKER_CONCURRENCY=5
\`\`\`

> **💡 개발 팁**: S3 없이 로컬에서 테스트하려면 플레이스홀더 값을 그대로 두세요. 서비스가 자동으로 \`public/screenshots/\` 디렉토리에 스크린샷을 저장합니다.

### 3. 서비스 실행

서비스는 두 가지 배포 모드를 지원합니다:

#### 🟢 **통합 모드 (개발 환경 권장)**

API 서버와 워커가 동일한 프로세스에서 실행됩니다. API가 첫 번째 스크린샷 요청을 받으면 워커가 자동으로 시작됩니다.

\`\`\`bash
npm run dev
\`\`\`

[http://localhost:3000](http://localhost:3000) 접속

**장점:**
- ✅ 간단한 설정 - 단일 명령어
- ✅ 설정 불필요
- ✅ 개발 및 테스트에 최적
- ✅ 인터랙티브 테스트 UI 포함

**트레이드오프:**
- ⚠️ 서버 재시작 시 작업 손실
- ⚠️ 수평 확장 불가

#### 🔵 **독립 워커 모드 (프로덕션/분산 환경용)**

스크린샷 워커를 별도의 데몬 프로세스로 실행합니다. 작업 큐 통신을 위해 Redis가 필요합니다.

**사전 요구사항:**
- Redis 서버 실행 중
- API와 Worker 간 공유 Redis 연결

**설정 방법:**

1. **Redis 설치** (미설치 시):
   \`\`\`bash
   # macOS
   brew install redis
   brew services start redis

   # Ubuntu/Debian
   sudo apt-get install redis-server
   sudo systemctl start redis

   # Docker
   docker run -d -p 6379:6379 redis:alpine
   \`\`\`

2. **\`.env.local\` 업데이트** - Redis 사용:
   \`\`\`bash
   REDIS_URL=redis://localhost:6379
   \`\`\`

3. **큐 구현 수정**:

   \`simple-queue.ts\`를 Bull Queue + Redis 구현으로 교체합니다.
   (\`docs/02-design/features/website-screenshot.design.md\`에서 원본 설계 참고)

4. **서비스 실행**:

   **터미널 1: API 서버**
   \`\`\`bash
   npm run dev
   \`\`\`

   **터미널 2: 워커 데몬**
   \`\`\`bash
   npm run worker
   \`\`\`

   또는 함께 실행:
   \`\`\`bash
   npm run start:all
   \`\`\`

**장점:**
- ✅ 재시작 시에도 작업 유지 (Redis에 저장)
- ✅ 수평 확장 (여러 워커)
- ✅ 워커를 별도 서버에서 실행 가능
- ✅ 프로덕션 워크로드에 적합

**독립 모드 사용 시기:**
- 프로덕션 배포
- 대량 스크린샷 생성
- 작업 영속성 필요
- 분산 아키텍처

#### 🎯 빠른 비교

| 기능 | 통합 모드 | 독립 모드 |
|---------|----------------|-----------------|
| 설정 복잡도 | 간단 (1개 명령어) | 복잡 (Redis + 다중 프로세스) |
| 작업 영속성 | ❌ 재시작 시 손실 | ✅ Redis에 저장 |
| 수평 확장 | ❌ 단일 인스턴스 | ✅ 다중 워커 |
| 개발 환경 | ✅ 권장 | ⚠️ 과도함 |
| 프로덕션 | ⚠️ 제한적 규모 | ✅ 권장 |
| 의존성 | Node.js만 | Node.js + Redis |

## 📡 API 엔드포인트

### POST /api/screenshot

스크린샷 작업을 생성합니다.

**요청:**

\`\`\`bash
curl -X POST http://localhost:3000/api/screenshot \\
  -H "Content-Type: application/json" \\
  -d '{
    "targetUrl": "https://example.com",
    "callbackUrl": "https://your-service.com/webhook"
  }'
\`\`\`

**응답 (202 Accepted):**

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

**선택적 파라미터:**

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

작업 상태를 조회합니다.

**요청:**

\`\`\`bash
curl http://localhost:3000/api/screenshot/550e8400-e29b-41d4-a716-446655440000
\`\`\`

**응답:**

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

헬스 체크 엔드포인트입니다.

\`\`\`bash
curl http://localhost:3000/api/health
\`\`\`

## 🪝 Webhook 콜백

스크린샷이 완료되면 \`callbackUrl\`로 POST 요청이 전송됩니다:

**성공 콜백:**

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

**실패 콜백:**

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

## 🔒 요청 제한

- **제한**: IP당 분당 10회 요청
- **윈도우**: 60초
- **응답**: 429 Too Many Requests

## ⚠️ 에러 코드

| 코드 | 설명 |
|------|-------------|
| \`VALIDATION_ERROR\` | 잘못된 요청 파라미터 |
| \`RATE_LIMIT_EXCEEDED\` | 너무 많은 요청 |
| \`JOB_NOT_FOUND\` | Job ID를 찾을 수 없음 |
| \`TIMEOUT\` | 페이지 로딩 타임아웃 (30초) |
| \`NAVIGATION_FAILED\` | URL로 이동할 수 없음 |
| \`SCREENSHOT_FAILED\` | 스크린샷 캡처 실패 |

## 🎉 구현 상태

### 핵심 기능 ✅
- [x] Next.js 15 API Routes
- [x] In-Memory Simple Queue (Redis 불필요)
- [x] Zod를 사용한 요청 검증
- [x] 요청 제한 (IP당 분당 10회)
- [x] 작업 상태 추적
- [x] Puppeteer 스크린샷 캡처
- [x] Sharp 이미지 최적화
- [x] S3/R2 스토리지 연동
- [x] 로컬 파일시스템 대체 (개발 환경)
- [x] 재시도 기능이 있는 Webhook 콜백
- [x] 워커 자동 초기화
- [x] 인터랙티브 테스트 UI
- [x] 우아한 에러 처리

### 선택적 개선사항
- [ ] 프로덕션용 Redis 기반 큐
- [ ] 데이터베이스 영속성 (PostgreSQL)
- [ ] 워커 수평 확장
- [ ] Railway/Render 배포
- [ ] 프로덕션 환경 설정
- [ ] 모니터링 설정
- [ ] 작업 우선순위 큐
- [ ] 스크린샷 캐싱

## 📝 라이선스

MIT

## 🤝 기여하기

기여를 환영합니다! 이슈나 PR을 열어주세요.

---

**[Claude Code](https://claude.com/claude-code)로 제작 🤖**
