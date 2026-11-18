import { completeScanOnServer, getScanApiUrl, SCAN_UNAVAILABLE_MESSAGE, SCAN_TIMEOUT_MS } from '../completeOnServer';

describe('completeScanOnServer', () => {
  it('posts only the image to the server route and returns content', async () => {
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      json: async () => ({ content: '{"refuse":true}' }),
    })) as unknown as typeof fetch;

    const content = await completeScanOnServer('data:image/jpeg;base64,abc', fetchImpl);
    expect(content).toBe('{"refuse":true}');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = (fetchImpl as jest.Mock).mock.calls[0];
    expect(String(url)).toMatch(/\/api\/analyze-scan$/);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ image: 'data:image/jpeg;base64,abc' });
    expect(JSON.stringify(init)).not.toMatch(/sk-/);
    expect(JSON.stringify(init)).not.toMatch(/OPENAI_API_KEY/);
  });

  it('replaces a server error with the manual-entry message', async () => {
    const fetchImpl = jest.fn(async () => ({
      ok: false,
      json: async () => ({ error: 'Vision analysis is not configured.' }),
    })) as unknown as typeof fetch;

    await expect(completeScanOnServer('data:image/jpeg;base64,abc', fetchImpl))
      .rejects.toThrow(SCAN_UNAVAILABLE_MESSAGE);
  });

  it('uses the canonical host when no window origin is available', () => {
    expect(getScanApiUrl()).toBe('https://safe-dose.vercel.app/api/analyze-scan');
  });
});

it.each(['request', 'body'])('times out a stalled %s and aborts without accepting late results', async stage => {
  jest.useFakeTimers();
  let resolveLate!: (value: any) => void;
  const stalled = new Promise<any>(resolve => { resolveLate = resolve; });
  const fetchImpl = jest.fn(() => stage === 'request' ? stalled : Promise.resolve({ ok: true, json: () => stalled })) as unknown as typeof fetch;
  try {
    const result = completeScanOnServer('photo', fetchImpl);
    const assertion = expect(result).rejects.toThrow(SCAN_UNAVAILABLE_MESSAGE);
    await jest.advanceTimersByTimeAsync(SCAN_TIMEOUT_MS);
    await assertion;
    expect((fetchImpl as jest.Mock).mock.calls[0][1].signal.aborted).toBe(true);
    resolveLate(stage === 'request' ? { ok: true, json: async () => ({ content: 'late' }) } : { content: 'late' });
    await Promise.resolve();
    expect(jest.getTimerCount()).toBe(0);
  } finally {
    jest.useRealTimers();
  }
});
