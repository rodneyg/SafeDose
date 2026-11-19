export const SCAN_UNAVAILABLE_MESSAGE = 'Photo scan is unavailable right now. Enter the values by hand.';
export const SCAN_TIMEOUT_MS = 20000;

const ANALYZE_PATH = '/api/analyze-scan';

export function getScanApiUrl(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${ANALYZE_PATH}`;
  }
  return `https://safedose.rodneygainous.com${ANALYZE_PATH}`;
}

/** Browser/native transport that never receives or stores an OpenAI key. */
export async function completeScanOnServer(image: string, fetchImpl: typeof fetch = fetch): Promise<string> {
  let content: string;
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    // Include response-body reading in the deadline, and discard any late result.
    const request = async (): Promise<string> => {
      const response = await fetchImpl(getScanApiUrl(), {
        signal: controller.signal,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ image }),
      });
      if (!response.ok) throw new Error(SCAN_UNAVAILABLE_MESSAGE);
      const payload = await response.json();
      if (typeof payload?.content !== 'string' || !payload.content.trim()) {
        throw new Error(SCAN_UNAVAILABLE_MESSAGE);
      }
      return payload.content;
    };
    content = await Promise.race([
      request(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          controller.abort();
          reject(new Error(SCAN_UNAVAILABLE_MESSAGE));
        }, SCAN_TIMEOUT_MS);
      }),
    ]);
  } catch {
    throw new Error(SCAN_UNAVAILABLE_MESSAGE);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
  return content;
}
