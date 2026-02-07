# Screenshot API

> Webhook 콜백을 지원하는 웹사이트 스크린샷 서비스

Next.js, Puppeteer, Sharp로 구축된 RESTful API 서비스입니다. 웹사이트의 전체 페이지 스크린샷을 캡처하고 webhook 콜백으로 결과를 전달합니다.

## 📁 프로젝트 구조

이 저장소는 두 개의 독립적인 프로젝트로 구성되어 있습니다:

```
hello/
├── screenshot-api/       # 스크린샷 API 서버 (포트 3000)
│   ├── src/
│   │   ├── app/api/     # API 엔드포인트
│   │   ├── lib/         # 핵심 로직 (Queue, Worker, Storage)
│   │   └── scripts/     # 독립 워커 스크립트
│   └── public/          # 로컬 스크린샷 저장소
│
├── test-website/         # 테스트 웹 UI (포트 3001)
│   └── src/app/         # 테스트 인터페이스
│
├── docs/                 # PDCA 문서
│   ├── 01-plan/         # 계획 문서
│   ├── 02-design/       # 설계 문서
│   ├── 03-analysis/     # 분석 결과
│   └── 04-report/       # 완료 보고서
│
└── CLAUDE.md            # Claude Code 프로젝트 가이드
```

### 프로젝트 실행하기

**1. API 서버 실행 (포트 3000)**
```bash
cd screenshot-api
npm install
npm run dev
```

**2. 테스트 웹사이트 실행 (포트 3001)**
```bash
cd test-website
npm install
npm run dev
```

두 서버를 모두 실행한 후, 브라우저에서 [http://localhost:3001](http://localhost:3001)로 테스트 UI에 접속하세요.

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
- **Storage**: 로컬 파일시스템 (개발) / AWS S3 / Cloudflare R2 (프로덕션)

### ✨ 간소화된 아키텍처
- ✅ **Redis 불필요** - 인메모리 큐 사용
- ✅ **단일 서버** - API + Worker가 하나의 프로세스
- ✅ **간편한 설정** - Node.js만 필요
- ⚠️ **트레이드오프**: 서버 재시작 시 작업 손실

## 🔧 사전 요구사항

- Node.js 20+

**이게 전부입니다!**

개발 환경에서는 스크린샷이 자동으로 로컬 디렉토리(`public/screenshots/`)에 저장됩니다.

### 선택 사항 (프로덕션 배포 시)

- AWS S3 또는 Cloudflare R2 계정 - 클라우드 스토리지에 이미지 저장
- Redis 서버 - 독립 워커 모드 사용 시 필요

## 📖 빠른 시작

### 1. 저장소 클론

\`\`\`bash
git clone https://github.com/DeadfireKim/hello.git
cd hello
\`\`\`

### 2. API 서버 설치 및 실행

\`\`\`bash
cd screenshot-api
npm install
npm run dev
\`\`\`

API 서버가 [http://localhost:3000](http://localhost:3000)에서 실행됩니다.

### 3. 테스트 웹사이트 실행 (선택사항)

새 터미널을 열고:

\`\`\`bash
cd test-website
npm install
npm run dev
\`\`\`

테스트 UI가 [http://localhost:3001](http://localhost:3001)에서 실행됩니다.

### 2. 환경 변수 설정

\`.env.example\`을 \`.env.local\`로 복사:

\`\`\`bash
cp .env.example .env.local
\`\`\`

**개발 환경에서는 기본 설정 그대로 사용하면 됩니다!**
별도 수정 없이 바로 실행 가능하며, 스크린샷은 \`public/screenshots/\` 디렉토리에 저장됩니다.

#### 프로덕션 환경 설정 (선택 사항)

클라우드 스토리지를 사용하려면 \`.env.local\` 파일을 수정하세요:

\`\`\`bash
# Storage (Cloudflare R2 or AWS S3) - 프로덕션용
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

> **📌 저장 위치 자동 선택**:
> - **개발 모드** (S3 설정 없음): \`public/screenshots/\` 디렉토리에 로컬 저장
> - **프로덕션 모드** (S3 설정 있음): S3/R2 클라우드 스토리지에 저장

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

## 💾 스토리지 설정

스크린샷 이미지는 자동으로 적절한 저장소에 저장됩니다:

### 로컬 파일시스템 (기본값)

**조건**: S3 자격증명이 설정되지 않았거나 개발 모드일 때

- **저장 위치**: \`public/screenshots/\`
- **URL 형식**: \`http://localhost:3000/screenshots/[jobId].png\`
- **장점**:
  - ✅ 즉시 사용 가능 (설정 불필요)
  - ✅ 빠른 개발 및 테스트
  - ✅ 외부 의존성 없음
- **단점**:
  - ⚠️ 서버 재시작 시에도 유지되지만 서버 디스크 공간 사용
  - ⚠️ 다중 서버 환경에서 공유 불가

### 클라우드 스토리지 (프로덕션)

**조건**: S3 자격증명이 올바르게 설정되었을 때

- **지원 서비스**: AWS S3, Cloudflare R2
- **URL 형식**: Signed URL (24시간 유효)
- **장점**:
  - ✅ 무제한 저장 공간
  - ✅ CDN 연동 가능
  - ✅ 다중 서버 환경에서 공유
  - ✅ 자동 백업 및 복제
- **설정 방법**: 위의 "프로덕션 환경 설정" 참고

## 📡 API 엔드포인트

| Method | Endpoint | 설명 | 인증 | Rate Limit |
|--------|----------|------|------|------------|
| POST | `/api/screenshot` | 스크린샷 작업 생성 | 불필요 | 10회/분 |
| GET | `/api/screenshot/:jobId` | 작업 상태 조회 | 불필요 | 제한없음 |
| GET | `/api/health` | 헬스 체크 | 불필요 | 제한없음 |

### 📝 상세 사용법

---

#### 1. POST /api/screenshot

스크린샷 작업을 생성하고 비동기로 처리합니다.

**필수 파라미터:**
- `targetUrl` (string): 스크린샷을 캡처할 웹사이트 URL
- `callbackUrl` (string): 결과를 받을 Webhook URL

**선택적 파라미터:**
- `options.viewport.width` (number): 뷰포트 너비 (기본: 1920, 범위: 320-3840)
- `options.viewport.height` (number): 뷰포트 높이 (기본: 1080, 범위: 240-2160)
- `options.fullPage` (boolean): 전체 페이지 캡처 여부 (기본: true)
- `options.format` (string): 이미지 형식 - `png`, `jpeg`, `webp` (기본: png)
- `options.quality` (number): 이미지 품질 (기본: 80, 범위: 1-100)

<details>
<summary><b>📤 요청 예시</b></summary>

```bash
curl -X POST http://localhost:3000/api/screenshot \
  -H "Content-Type: application/json" \
  -d '{
    "targetUrl": "https://example.com",
    "callbackUrl": "https://your-service.com/webhook",
    "options": {
      "viewport": { "width": 1920, "height": 1080 },
      "fullPage": true,
      "format": "png",
      "quality": 80
    }
  }'
```

</details>

<details>
<summary><b>📥 응답 (202 Accepted)</b></summary>

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

</details>

---

#### 2. GET /api/screenshot/:jobId

작업의 현재 상태와 결과를 조회합니다.

**Path 파라미터:**
- `jobId` (string): 작업 ID (POST 요청에서 받은 ID)

**상태 값:**
- `pending`: 대기 중
- `active`: 처리 중
- `completed`: 완료
- `failed`: 실패

<details>
<summary><b>📤 요청 예시</b></summary>

```bash
curl http://localhost:3000/api/screenshot/550e8400-e29b-41d4-a716-446655440000
```

</details>

<details>
<summary><b>📥 응답 (완료 시)</b></summary>

```json
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
```

</details>

---

#### 3. GET /api/health

API 서버의 상태를 확인합니다.

<details>
<summary><b>📤 요청 예시</b></summary>

```bash
curl http://localhost:3000/api/health
```

</details>

<details>
<summary><b>📥 응답</b></summary>

```json
{
  "status": "ok",
  "timestamp": "2026-02-07T10:00:00Z",
  "uptime": 3600
}
```

</details>

---

## 🪝 Webhook 콜백

스크린샷이 완료되면 `callbackUrl`로 POST 요청이 전송됩니다.

<details>
<summary><b>✅ 성공 콜백</b></summary>

```json
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
```

</details>

<details>
<summary><b>❌ 실패 콜백</b></summary>

```json
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
```

</details>

---

## 🔒 요청 제한

| 항목 | 값 |
|------|-----|
| **제한** | IP당 분당 10회 요청 |
| **윈도우** | 60초 |
| **초과 시 응답** | 429 Too Many Requests |

---

## ⚠️ 에러 코드

| 코드 | 설명 | HTTP 상태 |
|------|-------------|-----------|
| `VALIDATION_ERROR` | 잘못된 요청 파라미터 | 400 |
| `RATE_LIMIT_EXCEEDED` | 너무 많은 요청 | 429 |
| `JOB_NOT_FOUND` | Job ID를 찾을 수 없음 | 404 |
| `TIMEOUT` | 페이지 로딩 타임아웃 (30초) | 500 |
| `NAVIGATION_FAILED` | URL로 이동할 수 없음 | 500 |
| `SCREENSHOT_FAILED` | 스크린샷 캡처 실패 | 500 |

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
