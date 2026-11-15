const ANALYZE_PATH = '/api/analyze-scan';

export function getScanApiUrl(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${ANALYZE_PATH}`;
  }
  return `https://safedose.rodneygainous.com${ANALYZE_PATH}`;
}

/** Browser/native transport that never receives or stores an OpenAI key. */
export async function completeScanOnServer(image: string, fetchImpl: typeof fetch = fetch): Promise<string> {
  let response: Response;
  try {
    response = await fetchImpl(getScanApiUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ image }),
    });
  } catch {
    throw new Error('Could not reach the scan service. Please try again.');
  }

  let payload: { content?: unknown; error?: unknown } = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  if (!response.ok) {
    const message = typeof payload.error === 'string' && payload.error.trim()
      ? payload.error
      : 'Image analysis failed. Please try again.';
    throw new Error(message);
  }

  if (typeof payload.content !== 'string' || !payload.content.trim()) {
    throw new Error('Invalid response from image analysis');
  }
  return payload.content;
}
