import { validateScreenshotRequest, screenshotRequestSchema } from '@/lib/validation/schemas';

describe('Screenshot Request Validation', () => {
  describe('validateScreenshotRequest', () => {
    it('should validate a correct request', () => {
      const validRequest = {
        targetUrl: 'https://example.com',
        callbackUrl: 'https://callback.example.com/webhook',
      };

      const result = validateScreenshotRequest(validRequest);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.targetUrl).toBe('https://example.com');
        expect(result.data.callbackUrl).toBe('https://callback.example.com/webhook');
      }
    });

    it('should validate a request with options', () => {
      const validRequest = {
        targetUrl: 'https://example.com',
        callbackUrl: 'https://callback.example.com/webhook',
        options: {
          viewport: {
            width: 1920,
            height: 1080,
          },
          fullPage: true,
          format: 'png' as const,
          quality: 80,
        },
      };

      const result = validateScreenshotRequest(validRequest);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.options?.viewport?.width).toBe(1920);
        expect(result.data.options?.viewport?.height).toBe(1080);
        expect(result.data.options?.fullPage).toBe(true);
        expect(result.data.options?.format).toBe('png');
        expect(result.data.options?.quality).toBe(80);
      }
    });

    it('should reject invalid targetUrl', () => {
      const invalidRequest = {
        targetUrl: 'not-a-url',
        callbackUrl: 'https://callback.example.com/webhook',
      };

      const result = validateScreenshotRequest(invalidRequest);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
        expect(result.error.message).toContain('Invalid URL');
      }
    });

    it('should reject targetUrl without http/https', () => {
      const invalidRequest = {
        targetUrl: 'ftp://example.com',
        callbackUrl: 'https://callback.example.com/webhook',
      };

      const result = validateScreenshotRequest(invalidRequest);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('http://');
      }
    });

    it('should reject too long URLs', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(2050);
      const invalidRequest = {
        targetUrl: longUrl,
        callbackUrl: 'https://callback.example.com/webhook',
      };

      const result = validateScreenshotRequest(invalidRequest);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('too long');
      }
    });

    it('should reject invalid viewport dimensions', () => {
      const invalidRequest = {
        targetUrl: 'https://example.com',
        callbackUrl: 'https://callback.example.com/webhook',
        options: {
          viewport: {
            width: 100, // Too small (min: 320)
            height: 1080,
          },
        },
      };

      const result = validateScreenshotRequest(invalidRequest);

      expect(result.success).toBe(false);
    });

    it('should reject invalid format', () => {
      const invalidRequest = {
        targetUrl: 'https://example.com',
        callbackUrl: 'https://callback.example.com/webhook',
        options: {
          format: 'gif' as any, // Invalid format
        },
      };

      const result = validateScreenshotRequest(invalidRequest);

      expect(result.success).toBe(false);
    });

    it('should reject invalid quality', () => {
      const invalidRequest = {
        targetUrl: 'https://example.com',
        callbackUrl: 'https://callback.example.com/webhook',
        options: {
          quality: 150, // Max: 100
        },
      };

      const result = validateScreenshotRequest(invalidRequest);

      expect(result.success).toBe(false);
    });

    it('should accept http URLs', () => {
      const validRequest = {
        targetUrl: 'http://localhost:3000',
        callbackUrl: 'http://localhost:3001/webhook',
      };

      const result = validateScreenshotRequest(validRequest);

      expect(result.success).toBe(true);
    });
  });

  describe('screenshotRequestSchema', () => {
    it('should parse valid data', () => {
      const data = {
        targetUrl: 'https://example.com',
        callbackUrl: 'https://callback.example.com/webhook',
      };

      const parsed = screenshotRequestSchema.parse(data);

      expect(parsed.targetUrl).toBe(data.targetUrl);
      expect(parsed.callbackUrl).toBe(data.callbackUrl);
    });

    it('should throw on invalid data', () => {
      const invalidData = {
        targetUrl: 'invalid',
        callbackUrl: 'https://callback.example.com/webhook',
      };

      expect(() => screenshotRequestSchema.parse(invalidData)).toThrow();
    });
  });
});
