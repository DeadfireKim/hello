/**
 * Application Configuration
 *
 * 모든 주요 설정값을 한 곳에서 관리합니다.
 * 환경 변수로 오버라이드 가능합니다.
 */

// ============================================================================
// Server Configuration
// ============================================================================

export const SERVER_CONFIG = {
  /** API 서버 포트 */
  port: parseInt(process.env.PORT || '3000', 10),

  /** API Base URL */
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
} as const;

// ============================================================================
// Rate Limiting Configuration
// ============================================================================

export const RATE_LIMIT_CONFIG = {
  /** IP당 최대 요청 수 */
  maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10', 10),

  /** Rate limit 윈도우 (밀리초) - 기본: 60초 */
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),

  /** 만료된 기록 정리 주기 (밀리초) - 기본: 5분 */
  cleanupIntervalMs: parseInt(process.env.RATE_LIMIT_CLEANUP_INTERVAL_MS || '300000', 10),
} as const;

// ============================================================================
// Worker & Queue Configuration
// ============================================================================

export const WORKER_CONFIG = {
  /** 동시 처리 작업 수 */
  concurrency: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),

  /** 작업 최대 재시도 횟수 */
  maxRetries: parseInt(process.env.WORKER_MAX_RETRIES || '3', 10),

  /** 재시도 지연 시간 (밀리초) - 지수 백오프 */
  retryDelays: [2000, 4000, 8000], // 2s, 4s, 8s

  /** 완료된 작업 정리 기준 시간 (밀리초) - 기본: 1시간 */
  jobCleanupMaxAge: parseInt(process.env.JOB_CLEANUP_MAX_AGE_MS || '3600000', 10),

  /** 작업 정리 주기 (밀리초) - 기본: 10분 */
  jobCleanupIntervalMs: parseInt(process.env.JOB_CLEANUP_INTERVAL_MS || '600000', 10),
} as const;

// ============================================================================
// Screenshot Configuration (Puppeteer)
// ============================================================================

export const SCREENSHOT_CONFIG = {
  /** 페이지 로딩 타임아웃 (밀리초) - 기본: 30초 */
  navigationTimeout: parseInt(process.env.SCREENSHOT_NAVIGATION_TIMEOUT_MS || '30000', 10),

  /** 기본 뷰포트 너비 */
  defaultViewportWidth: parseInt(process.env.SCREENSHOT_DEFAULT_WIDTH || '1920', 10),

  /** 기본 뷰포트 높이 */
  defaultViewportHeight: parseInt(process.env.SCREENSHOT_DEFAULT_HEIGHT || '1080', 10),

  /** 스크린샷 후 대기 시간 (밀리초) - 동적 콘텐츠 로딩 대기 */
  waitAfterLoad: parseInt(process.env.SCREENSHOT_WAIT_AFTER_LOAD_MS || '1000', 10),

  /** 기본 이미지 형식 */
  defaultFormat: (process.env.SCREENSHOT_DEFAULT_FORMAT || 'png') as 'png' | 'jpeg' | 'webp',

  /** 기본 이미지 품질 (1-100) */
  defaultQuality: parseInt(process.env.SCREENSHOT_DEFAULT_QUALITY || '80', 10),

  /** 전체 페이지 캡처 기본값 */
  defaultFullPage: process.env.SCREENSHOT_DEFAULT_FULL_PAGE !== 'false',
} as const;

// ============================================================================
// Webhook Callback Configuration
// ============================================================================

export const CALLBACK_CONFIG = {
  /** Webhook 최대 재시도 횟수 */
  maxRetries: parseInt(process.env.CALLBACK_MAX_RETRIES || '3', 10),

  /** Webhook 재시도 지연 시간 (밀리초) */
  retryDelays: [
    parseInt(process.env.CALLBACK_RETRY_DELAY_1_MS || '60000', 10),    // 1분
    parseInt(process.env.CALLBACK_RETRY_DELAY_2_MS || '300000', 10),   // 5분
    parseInt(process.env.CALLBACK_RETRY_DELAY_3_MS || '900000', 10),   // 15분
  ],

  /** Webhook 요청 타임아웃 (밀리초) */
  timeout: parseInt(process.env.CALLBACK_TIMEOUT_MS || '10000', 10),

  /** User-Agent 헤더 */
  userAgent: process.env.CALLBACK_USER_AGENT || 'Screenshot-API/1.0',
} as const;

// ============================================================================
// Storage Configuration
// ============================================================================

export const STORAGE_CONFIG = {
  /** 로컬 스토리지 디렉토리 */
  localDir: process.env.STORAGE_LOCAL_DIR || 'public/screenshots',

  /** S3 Signed URL 만료 시간 (초) - 기본: 24시간 */
  signedUrlExpiry: parseInt(process.env.S3_SIGNED_URL_EXPIRY || '86400', 10),
} as const;

// ============================================================================
// Development & Logging
// ============================================================================

export const DEV_CONFIG = {
  /** 개발 모드 여부 */
  isDevelopment: process.env.NODE_ENV === 'development',

  /** 상세 로그 출력 */
  verbose: process.env.VERBOSE_LOGGING === 'true',
} as const;

// ============================================================================
// 전체 설정 Export
// ============================================================================

export const APP_CONFIG = {
  server: SERVER_CONFIG,
  rateLimit: RATE_LIMIT_CONFIG,
  worker: WORKER_CONFIG,
  screenshot: SCREENSHOT_CONFIG,
  callback: CALLBACK_CONFIG,
  storage: STORAGE_CONFIG,
  dev: DEV_CONFIG,
} as const;

export default APP_CONFIG;
