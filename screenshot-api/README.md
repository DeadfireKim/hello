# Screenshot API Server

> 웹사이트 스크린샷을 캡처하는 RESTful API 서버

이 디렉토리는 스크린샷 API 서버의 소스 코드를 포함합니다.

## 🚀 빠른 시작

```bash
# 의존성 설치
npm install

# 개발 서버 실행 (포트 3000)
npm run dev

# 프로덕션 빌드
npm run build
npm start
```

## 📡 API 엔드포인트

- `POST /api/screenshot` - 스크린샷 작업 생성
- `GET /api/screenshot/:jobId` - 작업 상태 조회
- `GET /api/health` - 헬스 체크

## 📚 상세 문서

전체 프로젝트 문서는 [root README.md](../README.md)를 참고하세요.

## 🔧 주요 디렉토리

- `src/app/api/` - API 엔드포인트
- `src/lib/queue/` - 작업 큐 (in-memory)
- `src/lib/worker/` - 스크린샷 워커
- `src/lib/config/` - 환경 설정
- `public/screenshots/` - 로컬 스크린샷 저장소 (개발 환경)

## 🧪 테스트

### 단위 테스트 및 통합 테스트

프로젝트에는 Jest를 사용한 포괄적인 테스트 스위트가 포함되어 있습니다.

```bash
# 모든 테스트 실행
npm test

# 워치 모드로 테스트 (개발 중)
npm run test:watch

# 커버리지 리포트 생성
npm run test:coverage
```

**테스트 커버리지:**
- ✅ Validation schemas (Zod)
- ✅ Simple Queue (in-memory job queue)
- ✅ Rate Limiter
- ✅ Callback Sender
- ✅ API endpoints (unit tests)

**테스트 구조:**
```
src/__tests__/
├── validation/
│   └── schemas.test.ts        # 요청 검증 테스트
├── queue/
│   └── simple-queue.test.ts   # 작업 큐 테스트
├── utils/
│   ├── simple-rate-limiter.test.ts  # Rate limiting 테스트
│   └── callback-sender.test.ts      # Webhook 콜백 테스트
└── api/
    └── screenshot.test.ts     # API 엔드포인트 테스트
```

### 테스트 웹 UI

실제 스크린샷 API를 테스트하려면 [test-website](../test-website/README.md) 프로젝트를 참고하세요.
