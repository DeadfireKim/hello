# Plan: Website Screenshot API Service

> **Feature ID**: website-screenshot
> **Created**: 2026-02-07
> **Updated**: 2026-02-07
> **Status**: Planning
> **PDCA Phase**: Plan
> **Service Type**: RESTful API with Webhook Callback

## 1. 개요 (Overview)

### 목적 (Purpose)
다른 웹서비스에서 호출할 수 있는 **웹사이트 스크린샷 생성 API 서비스**

외부 서비스가 API를 통해 URL을 전달하면, 백그라운드에서 전체 페이지 스크린샷을 생성하고 완료 시 callback URL로 결과를 전송합니다.

### 핵심 가치 (Core Value)
- **비동기 처리**: 즉시 Job ID 반환, 백그라운드에서 스크린샷 생성
- **Webhook 통합**: 완료 시 callback URL로 결과 자동 전송
- **RESTful API**: 언어/플랫폼 독립적 통합
- **확장 가능**: 대량 요청 처리 가능한 큐 시스템

### 목표 사용자 (Target Users)
- **다른 웹서비스 개발자** (API 통합)
- **SaaS 플랫폼** (고객에게 스크린샷 기능 제공)
- **모니터링 서비스** (웹사이트 상태 기록)
- **노코드 툴** (Zapier, Make.com 등과 통합)

### 사용 시나리오
1. **블로그 플랫폼**: 사용자가 링크를 공유할 때 자동으로 미리보기 이미지 생성
2. **URL 단축 서비스**: 단축 URL 생성 시 원본 사이트 스크린샷 저장
3. **웹 모니터링**: 주기적으로 웹사이트 상태 캡처 및 기록
4. **소셜 미디어 툴**: Open Graph 이미지 자동 생성

## 2. 기능 요구사항 (Functional Requirements)

### 2.1 핵심 API 기능

#### FR-01: 스크린샷 요청 API
**Endpoint**: `POST /api/screenshot`

**Request Body**:
```json
{
  "targetUrl": "https://example.com",
  "callbackUrl": "https://your-service.com/webhook/screenshot-complete"
}
```

**Request Parameters**:
- `targetUrl` (required, string): 캡처할 웹사이트 URL
  - 유효성 검증: http/https 프로토콜 필수
  - URL 형식 검증
- `callbackUrl` (required, string): 완료 시 결과를 받을 Webhook URL
  - 유효성 검증: http/https 프로토콜 필수
  - POST 요청 가능한 엔드포인트여야 함

**Response** (즉시 반환):
```json
{
  "success": true,
  "jobId": "uuid-v4-job-id",
  "status": "pending",
  "message": "Screenshot job created successfully",
  "estimatedTime": "5-10 seconds"
}
```

**Response Status Codes**:
- `202 Accepted`: Job 생성 성공
- `400 Bad Request`: 잘못된 파라미터
- `429 Too Many Requests`: Rate limit 초과
- `500 Internal Server Error`: 서버 오류

#### FR-02: Job 상태 조회 API (선택사항)
**Endpoint**: `GET /api/screenshot/{jobId}`

**Response**:
```json
{
  "jobId": "uuid-v4-job-id",
  "status": "processing", // pending, processing, completed, failed
  "targetUrl": "https://example.com",
  "createdAt": "2026-02-07T10:00:00Z",
  "completedAt": null,
  "progress": 60 // percentage (optional)
}
```

#### FR-03: Webhook Callback 전송
스크린샷 생성 완료 시 `callbackUrl`로 POST 요청 전송

**Callback Payload** (성공):
```json
{
  "jobId": "uuid-v4-job-id",
  "status": "completed",
  "targetUrl": "https://example.com",
  "screenshot": {
    "url": "https://storage.example.com/screenshots/uuid.png",
    "format": "png",
    "width": 1920,
    "height": 3840,
    "size": 524288 // bytes
  },
  "completedAt": "2026-02-07T10:00:10Z"
}
```

**Callback Payload** (실패):
```json
{
  "jobId": "uuid-v4-job-id",
  "status": "failed",
  "targetUrl": "https://example.com",
  "error": {
    "code": "TIMEOUT",
    "message": "Page loading timeout after 30 seconds"
  },
  "completedAt": "2026-02-07T10:00:30Z"
}
```

**Callback Retry 정책**:
- 최대 3회 재시도
- 재시도 간격: 1분, 5분, 15분
- 3회 실패 시 Job 상태를 "callback_failed"로 변경

#### FR-04: 스크린샷 생성 로직
- Puppeteer/Playwright로 Headless 브라우저 실행
- 전체 페이지 캡처 (스크롤 포함)
- JavaScript 실행 완료 대기
- 렌더링 타임아웃: 30초
- 이미지 포맷: PNG (기본), JPEG/WebP (Phase 2)
- 이미지 최적화: Sharp로 압축

### 2.2 부가 기능 (Phase 2)

#### FR-05: 옵션 파라미터
Request Body 확장:
```json
{
  "targetUrl": "https://example.com",
  "callbackUrl": "https://your-service.com/webhook",
  "options": {
    "viewport": {
      "width": 1920,
      "height": 1080
    },
    "fullPage": true, // false = 첫 화면만
    "format": "png", // png, jpeg, webp
    "quality": 80 // jpeg/webp 압축 품질 (1-100)
  }
}
```

#### FR-06: API 인증 (Phase 2)
- API Key 기반 인증
- Request Header: `Authorization: Bearer YOUR_API_KEY`
- 사용량 추적 및 제한

## 3. 비기능 요구사항 (Non-Functional Requirements)

### 3.1 성능 (Performance)
- **응답 시간**: API 요청 응답 < 500ms (Job 생성만)
- **스크린샷 생성 시간**: 평균 5-10초
- **동시 처리**: 최대 20개 Job 동시 실행
- **큐 처리량**: 초당 10개 Job 처리 가능

### 3.2 확장성 (Scalability)
- 수평 확장 가능한 Worker 아키텍처
- Job Queue 시스템 (Redis Queue 또는 AWS SQS)
- 상태 관리: Redis 또는 PostgreSQL

### 3.3 안정성 (Reliability)
- **Job 재시도**: 실패 시 최대 3회 자동 재시도
- **타임아웃 처리**: 30초 초과 시 실패 처리
- **에러 핸들링**: 모든 에러 케이스 처리 및 로깅
- **Health Check**: `/api/health` 엔드포인트 제공

### 3.4 보안 (Security)
- **Rate Limiting**: IP당 분당 10회 요청 제한
- **URL 검증**: 악성 URL 차단 (phishing, malware)
- **Callback 검증**: HTTPS callback URL만 허용 (선택적)
- **입력 검증**: XSS, SQL Injection 방지

### 3.5 모니터링 (Monitoring)
- **로깅**: 모든 요청/응답 로그 기록
- **메트릭**: Job 성공률, 평균 처리 시간, 에러율
- **알림**: 에러율 임계값 초과 시 알림

## 4. 기술 스택 (Technology Stack)

### 4.1 Backend API
- **Framework**: Next.js 15 API Routes (또는 Express.js)
- **Runtime**: Node.js 20+
- **Language**: TypeScript

### 4.2 Job Queue System
- **Option 1 (Simple)**: Bull Queue + Redis
- **Option 2 (AWS)**: AWS SQS + Lambda Workers
- **Option 3 (Robust)**: RabbitMQ + Worker Processes

### 4.3 Screenshot Engine
- **Primary**: Puppeteer (Chrome-based)
- **Alternative**: Playwright (더 빠른 성능, 더 적은 메모리)

### 4.4 Image Processing
- **Library**: Sharp (압축, 리사이징, 포맷 변환)

### 4.5 Storage
- **임시 저장**: Local file system (개발 환경)
- **영구 저장** (Production):
  - **Option 1**: AWS S3 + CloudFront CDN
  - **Option 2**: Cloudflare R2 (S3-compatible, 무료 egress)
  - **Option 3**: Vercel Blob Storage
- **이미지 URL**: 서명된 URL (Signed URL) 24시간 유효

### 4.6 Database (Optional)
- **Job 상태 관리**: Redis (빠른 조회)
- **영구 기록**: PostgreSQL (분석/통계용)

### 4.7 Deployment
- **Option 1 (Simple)**: Railway / Render
  - 장점: 긴 실행 시간 지원, 간단한 배포
  - 단점: 비용 (무료 티어 제한)
- **Option 2 (Vercel + Queue)**:
  - API: Vercel (Next.js)
  - Worker: AWS Lambda + SQS
  - 장점: Vercel 강점 활용
  - 단점: 복잡한 아키텍처
- **Option 3 (AWS Full Stack)**:
  - API: API Gateway + Lambda
  - Queue: SQS
  - Worker: Lambda (또는 ECS Fargate)
  - Storage: S3
  - 장점: 완전한 확장성
  - 단점: 높은 복잡도

**추천**: Railway/Render (Phase 1 MVP)

## 5. 아키텍처 (Architecture)

### 5.1 시스템 구성도

```
[External Service]
     ↓ (1) POST /api/screenshot
     ↓     {targetUrl, callbackUrl}
[API Server - Next.js/Express]
     ↓ (2) Create Job (UUID)
     ↓     Store in Database
     ↓ (3) Push to Queue
[Redis Queue / SQS]
     ↓ (4) Job pickup
[Worker Process]
     ↓ (5) Launch Puppeteer
[Headless Chrome]
     ↓ (6) Render & Screenshot
[Image File]
     ↓ (7) Sharp optimization
     ↓ (8) Upload to S3/R2
[Cloud Storage]
     ↓ (9) Get signed URL
[Worker Process]
     ↓ (10) POST to callbackUrl
     ↓      {jobId, status, screenshot.url}
[External Service Webhook]
```

### 5.2 데이터 플로우 (Sequence)

```
Client → API: POST /api/screenshot {targetUrl, callbackUrl}
API → Database: INSERT job (id, targetUrl, callbackUrl, status=pending)
API → Queue: PUSH job_id
API → Client: 202 {jobId, status: "pending"}

Worker → Queue: POP job_id
Worker → Database: UPDATE job SET status='processing'
Worker → Puppeteer: launch browser, goto(targetUrl)
Puppeteer → Worker: screenshot buffer
Worker → Sharp: optimize image
Worker → S3: upload image
S3 → Worker: image URL
Worker → Database: UPDATE job SET status='completed', imageUrl
Worker → Callback: POST callbackUrl {jobId, status, screenshot}
Worker → Database: UPDATE job SET callbackSent=true
```

### 5.3 데이터 모델

#### Job Table (PostgreSQL/Redis)
```sql
CREATE TABLE screenshot_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_url TEXT NOT NULL,
  callback_url TEXT NOT NULL,
  status VARCHAR(20) NOT NULL, -- pending, processing, completed, failed
  image_url TEXT,
  error_code VARCHAR(50),
  error_message TEXT,
  retry_count INT DEFAULT 0,
  callback_retry_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  callback_sent_at TIMESTAMP
);

CREATE INDEX idx_status ON screenshot_jobs(status);
CREATE INDEX idx_created_at ON screenshot_jobs(created_at);
```

## 6. 사용자 스토리 (User Stories)

### US-01: API 통합 (Basic)
**As a** 외부 서비스 개발자
**I want to** API로 스크린샷 요청을 보내고 callback으로 결과를 받기
**So that** 우리 서비스에 스크린샷 기능을 통합할 수 있다

**Acceptance Criteria**:
- [ ] POST /api/screenshot로 요청 전송 가능
- [ ] 202 응답과 jobId를 즉시 받음
- [ ] 5-10초 후 callbackUrl로 결과 수신
- [ ] 결과에 이미지 URL 포함
- [ ] 24시간 동안 이미지 URL 접근 가능

### US-02: 에러 처리
**As a** 외부 서비스 개발자
**I want to** 실패 시 명확한 에러 정보를 받기
**So that** 사용자에게 적절한 메시지를 표시할 수 있다

**Acceptance Criteria**:
- [ ] 잘못된 URL 입력 시 400 에러
- [ ] 접근 불가능한 사이트 시 callback에 에러 정보
- [ ] 타임아웃 시 callback에 TIMEOUT 에러 코드
- [ ] Rate limit 초과 시 429 에러

### US-03: Job 상태 추적
**As a** 외부 서비스 개발자
**I want to** jobId로 현재 진행 상태를 조회하기
**So that** 사용자에게 진행률을 표시할 수 있다

**Acceptance Criteria**:
- [ ] GET /api/screenshot/{jobId}로 상태 조회 가능
- [ ] status 필드로 진행 단계 확인 가능
- [ ] 완료된 Job의 이미지 URL 조회 가능

## 7. API 문서 (API Documentation)

### 7.1 OpenAPI Specification
Phase 2에서 Swagger/OpenAPI 3.0 스펙 작성

### 7.2 API 테스트 페이지 (선택사항)
간단한 웹 UI 제공:
- API 엔드포인트 테스트
- Request/Response 예시
- Webhook 시뮬레이터

## 8. 제약사항 (Constraints)

### 8.1 기술적 제약
- Puppeteer 메모리 사용량: 인스턴스당 ~200MB
- 동시 브라우저 인스턴스 제한 (서버 리소스 의존)
- 일부 웹사이트 봇 감지로 접근 차단 가능
- Vercel Serverless Function 제한: 최대 실행시간 10초 (Hobby), 60초 (Pro)
  → Worker를 별도 서버에서 실행 필요

### 8.2 비즈니스 제약
- Phase 1: 무료 API (인증 없음)
- Rate Limiting: IP당 분당 10회
- 이미지 저장 기간: 24시간 (비용 절감)
- 무료 스토리지 용량 제한

## 9. 위험 요소 (Risks)

| 위험 | 영향도 | 대응 방안 |
|------|--------|-----------|
| Puppeteer 메모리 초과 | 높음 | Playwright 사용, Worker 서버 증설 |
| 느린 웹사이트 타임아웃 | 중간 | 30초 타임아웃, 재시도 로직 |
| 봇 감지로 접근 차단 | 중간 | User-Agent 설정, Puppeteer Stealth Plugin |
| Callback URL 응답 없음 | 중간 | 재시도 정책 (3회), callback_failed 상태 |
| 동시 요청 폭주 | 높음 | Queue 시스템, Rate limiting, Worker 자동 확장 |
| 이미지 스토리지 비용 | 중간 | 24시간 후 자동 삭제, Cloudflare R2 사용 |

## 10. 개발 단계 (Development Phases)

### Phase 1: MVP API (2주)
**목표**: 기본 API와 비동기 처리 구현

**Week 1**: API + Queue
- [ ] Next.js 프로젝트 설정
- [ ] POST /api/screenshot 엔드포인트
- [ ] Request 검증 (targetUrl, callbackUrl)
- [ ] Job 생성 및 UUID 발급
- [ ] Redis + Bull Queue 설정
- [ ] Job 상태 저장 (Redis)

**Week 2**: Worker + Callback
- [ ] Worker 프로세스 구현
- [ ] Puppeteer 통합
- [ ] 스크린샷 생성 로직
- [ ] Sharp 이미지 최적화
- [ ] S3/R2 업로드
- [ ] Callback URL POST 전송
- [ ] 에러 핸들링 및 재시도
- [ ] Railway 배포

### Phase 2: 고급 기능 (1주)
- [ ] GET /api/screenshot/{jobId} 상태 조회
- [ ] 옵션 파라미터 (viewport, format, quality)
- [ ] API 키 인증
- [ ] Rate limiting 고도화
- [ ] API 문서 (Swagger)
- [ ] 간단한 테스트 UI

### Phase 3: 최적화 (1주)
- [ ] Worker 자동 확장
- [ ] 성능 최적화 (이미지 압축)
- [ ] 모니터링 및 로깅 (Sentry, Datadog)
- [ ] Health check 엔드포인트
- [ ] 부하 테스트

## 11. 성공 기준 (Success Criteria)

- [ ] API 요청 응답 시간 < 500ms
- [ ] 스크린샷 생성 시간 평균 5-10초
- [ ] Job 성공률 > 95%
- [ ] Callback 전송 성공률 > 98%
- [ ] 주요 웹사이트 (Google, GitHub, YouTube) 정상 캡처
- [ ] 동시 10개 요청 처리 가능
- [ ] API 문서 완성

## 12. 다음 단계 (Next Steps)

1. **Design 단계로 이동**: `/pdca design website-screenshot`
   - API 엔드포인트 상세 스펙 (Request/Response)
   - Worker 아키텍처 설계
   - Job Queue 설계 (Redis/SQS 선택)
   - Database 스키마
   - Error Handling 전략
   - Retry Logic 설계

2. **기술 선택 확정**:
   - Puppeteer vs Playwright
   - Redis vs SQS (Queue)
   - Railway vs AWS (Deployment)
   - S3 vs Cloudflare R2 (Storage)

## 13. 참고 자료 (References)

- [Puppeteer Documentation](https://pptr.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Bull Queue](https://github.com/OptimalBits/bull)
- [Sharp Image Processing](https://sharp.pixelplumbing.com/)
- [Railway Deployment](https://railway.app/)
- [AWS SQS](https://aws.amazon.com/sqs/)
- [Cloudflare R2](https://www.cloudflare.com/products/r2/)

---

**Plan 문서 업데이트 완료**
**서비스 타입**: RESTful API with Webhook Callback
**다음 단계**: Design 문서 작성 (`/pdca design website-screenshot`)
