import { CallbackPayload } from '@/lib/types';

const MAX_RETRIES = 3;
const RETRY_DELAYS = [60000, 300000, 900000]; // 1min, 5min, 15min

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
        'User-Agent': 'Screenshot-API/1.0',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    if (response.ok) {
      console.log(`✅ Callback sent successfully to ${callbackUrl}`);
      return true;
    }

    // Retry on 5xx errors
    if (response.status >= 500 && attempt < MAX_RETRIES - 1) {
      console.warn(
        `⚠️ Callback failed (${response.status}), retrying in ${RETRY_DELAYS[attempt] / 1000}s...`
      );
      await sleep(RETRY_DELAYS[attempt]);
      return sendCallback(callbackUrl, payload, attempt + 1);
    }

    throw new Error(`Callback failed with status ${response.status}`);
  } catch (error) {
    console.error(`❌ Callback error (attempt ${attempt + 1}/${MAX_RETRIES}):`, error);

    // Retry on network errors
    if (attempt < MAX_RETRIES - 1) {
      await sleep(RETRY_DELAYS[attempt]);
      return sendCallback(callbackUrl, payload, attempt + 1);
    }

    return false;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
