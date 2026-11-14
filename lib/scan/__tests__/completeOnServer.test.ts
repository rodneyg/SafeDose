import { completeScanOnServer, getScanApiUrl } from '../completeOnServer';

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

  it('surfaces a server error message and never includes a key', async () => {
    const fetchImpl = jest.fn(async () => ({
      ok: false,
      json: async () => ({ error: 'Vision analysis is not configured.' }),
    })) as unknown as typeof fetch;

    await expect(completeScanOnServer('data:image/jpeg;base64,abc', fetchImpl))
      .rejects.toThrow('Vision analysis is not configured.');
  });

  it('uses the canonical host when no window origin is available', () => {
    expect(getScanApiUrl()).toBe('https://safe-dose.vercel.app/api/analyze-scan');
  });
});
