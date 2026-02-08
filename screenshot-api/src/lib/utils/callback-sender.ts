import { CallbackPayload } from '@/lib/types';
import { CALLBACK_CONFIG } from '@/lib/config/app-config';

export async function sendCallback(
  callbackUrl: string,
  payload: CallbackPayload,
  attempt: number = 0
): Promise<boolean> {
  try {
    const response = await fetch(callbackUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': CALLBACK_CONFIG.userAgent,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(CALLBACK_CONFIG.timeout),
    });

    if (response.ok) {
      console.log(`✅ Callback sent successfully to ${callbackUrl}`);
      return true;
    }

    // Retry on 5xx errors
    if (response.status >= 500 && attempt < CALLBACK_CONFIG.maxRetries - 1) {
      console.warn(
        `⚠️ Callback failed (${response.status}), retrying in ${CALLBACK_CONFIG.retryDelays[attempt] / 1000}s...`
      );
      await sleep(CALLBACK_CONFIG.retryDelays[attempt]);
      return sendCallback(callbackUrl, payload, attempt + 1);
    }

    throw new Error(`Callback failed with status ${response.status}`);
  } catch (error) {
    console.error(`❌ Callback error (attempt ${attempt + 1}/${CALLBACK_CONFIG.maxRetries}):`, error);

    // Retry on network errors
    if (attempt < CALLBACK_CONFIG.maxRetries - 1) {
      await sleep(CALLBACK_CONFIG.retryDelays[attempt]);
      return sendCallback(callbackUrl, payload, attempt + 1);
    }

    return false;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
