// Mock timers for faster tests
jest.useFakeTimers();

// Import after setting up timers
import { sendCallback } from '@/lib/utils/callback-sender';

// Mock fetch globally
global.fetch = jest.fn();

describe('Callback Sender', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
    // Suppress console output in tests
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('sendCallback', () => {
    const mockCallbackUrl = 'https://webhook.example.com/callback';
    const mockPayload = {
      jobId: 'test-job-123',
      status: 'completed' as const,
      targetUrl: 'https://example.com',
      screenshot: {
        url: 'https://storage.example.com/screenshot.png',
        format: 'png' as const,
        width: 1920,
        height: 1080,
        size: 123456,
      },
      completedAt: new Date().toISOString(),
    };

    it('should send successful callback', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const result = await sendCallback(mockCallbackUrl, mockPayload);

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        mockCallbackUrl,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'User-Agent': 'Screenshot-API/1.0',
          }),
          body: JSON.stringify(mockPayload),
        })
      );
    });

    it('should handle callback with error payload', async () => {
      const errorPayload = {
        jobId: 'test-job-123',
        status: 'failed' as const,
        targetUrl: 'https://example.com',
        error: {
          code: 'TIMEOUT',
          message: 'Page loading timeout',
        },
        completedAt: new Date().toISOString(),
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const result = await sendCallback(mockCallbackUrl, errorPayload);

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        mockCallbackUrl,
        expect.objectContaining({
          body: JSON.stringify(errorPayload),
        })
      );
    });

    it('should return false after max retries', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Persistent error'));

      // Start the callback (it will retry internally)
      const callbackPromise = sendCallback(mockCallbackUrl, mockPayload);

      // Fast-forward through all retry delays
      await jest.runAllTimersAsync();

      const result = await callbackPromise;

      // Should return false after all retries
      expect(result).toBe(false);
      // Should have tried 3 times
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should handle non-200 responses with retries on 5xx', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
        });

      // Start the callback
      const callbackPromise = sendCallback(mockCallbackUrl, mockPayload);

      // Fast-forward through retry delay
      await jest.runAllTimersAsync();

      const result = await callbackPromise;

      // Should succeed after retry
      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should throw on 4xx errors without retry', async () => {
      // Use real timers for this test since we don't expect any delays
      jest.useRealTimers();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      });

      await expect(sendCallback(mockCallbackUrl, mockPayload)).rejects.toThrow(
        'Callback failed with status 400'
      );

      // Should not retry on 4xx
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Restore fake timers
      jest.useFakeTimers();
    });
  });
});
