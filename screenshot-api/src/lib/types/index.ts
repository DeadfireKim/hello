// Request/Response Types
export interface ScreenshotRequest {
  targetUrl: string;
  callbackUrl: string;
  options?: {
    viewport?: {
      width: number;
      height: number;
    };
    fullPage?: boolean;
    format?: 'png' | 'jpeg' | 'webp';
    quality?: number;
  };
}

export interface ScreenshotJobData {
  id: string;
  targetUrl: string;
  callbackUrl: string;
  options?: ScreenshotRequest['options'];
  ipAddress?: string;
  createdAt: number;
}

export interface ScreenshotResponse {
  success: boolean;
  jobId?: string;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  message?: string;
  estimatedTime?: string;
  statusUrl?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface JobStatusResponse {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  targetUrl: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  screenshot?: {
    url: string;
    format: string;
    width: number;
    height: number;
    size: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface CallbackPayload {
  jobId: string;
  status: 'completed' | 'failed';
  targetUrl: string;
  screenshot?: {
    url: string;
    format: string;
    width: number;
    height: number;
    size: number;
  };
  error?: {
    code: string;
    message: string;
  };
  completedAt: string;
}

// Job Queue Types
export interface JobProgress {
  percentage: number;
  message: string;
}

export interface JobResult {
  imageUrl: string;
  width: number;
  height: number;
  size: number;
}
