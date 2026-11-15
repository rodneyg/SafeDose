const SMALL_JPEG = 'data:image/jpeg;base64,/9j/4AAQ==';

function mockRes() {
  const res = {
    statusCode: 200,
    body: null,
    headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  return res;
}

describe('POST /api/analyze-scan', () => {
  const originalKey = process.env.OPENAI_API_KEY;
  let create;
  let handler;

  beforeEach(() => {
    jest.resetModules();
    create = jest.fn();
    jest.doMock('openai', () =>
      jest.fn().mockImplementation(() => ({
        chat: { completions: { create } },
      })),
    );
    handler = require('../analyze-scan');
  });

  afterEach(() => {
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
    jest.dontMock('openai');
  });

  it('rejects non-POST methods', async () => {
    const res = mockRes();
    await handler({ method: 'GET' }, res);
    expect(res.statusCode).toBe(405);
    expect(res.body.error).toMatch(/Method Not Allowed/);
  });

  it('returns 503 when OPENAI_API_KEY is missing, without calling OpenAI', async () => {
    delete process.env.OPENAI_API_KEY;
    const res = mockRes();
    await handler({ method: 'POST', body: { image: SMALL_JPEG } }, res);
    expect(res.statusCode).toBe(503);
    expect(res.body.error).toMatch(/not configured/);
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects missing or malformed images', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    for (const image of [undefined, '', 'http://example.com/x.jpg', 'data:text/plain;base64,abcd']) {
      const res = mockRes();
      await handler({ method: 'POST', body: { image } }, res);
      expect(res.statusCode).toBe(400);
    }
    expect(create).not.toHaveBeenCalled();
  });

  it('returns model content and never reads Expo client config', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    create.mockResolvedValue({ choices: [{ message: { content: '{"refuse":true}' } }] });
    const res = mockRes();
    await handler({ method: 'POST', body: { image: SMALL_JPEG } }, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ content: '{"refuse":true}' });
    expect(create).toHaveBeenCalledTimes(1);
    const request = create.mock.calls[0][0];
    expect(request.model).toBe('gpt-4o-2024-08-06');
    expect(request.temperature).toBe(0);
    expect(request.response_format).toEqual({ type: 'json_object' });
    expect(request.messages[0].content[1].image_url.url).toBe(SMALL_JPEG);
  });

  it('returns 502 when the model response is empty', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    create.mockResolvedValue({ choices: [{ message: { content: null } }] });
    const res = mockRes();
    await handler({ method: 'POST', body: { image: SMALL_JPEG } }, res);
    expect(res.statusCode).toBe(502);
  });
  it.each([
    'https://safe-dose.vercel.app',
    'https://safe-dose-abc123-rodneygs-projects.vercel.app', 'http://localhost:8081', undefined,
  ])('allows SafeDose or native origin %s', async origin => {
    process.env.OPENAI_API_KEY = 'test-key';
    create.mockResolvedValue({ choices: [{ message: { content: '{}' } }] });
    const res = mockRes();
    await handler({ method: 'POST', headers: { origin }, body: { image: SMALL_JPEG } }, res);
    expect(res.statusCode).toBe(200);
  });

  it.each([
    'https://evil.vercel.app', 'https://safe-dose.evil.com', 'null',
    'https://app.safedoseai.com', 'https://safe-dose-attacker.vercel.app',
    'https://safe-dose-abc-team.vercel.app', 'http://safe-dose.vercel.app',
    'https://safe-dose.vercel.app/path', '',
  ])('rejects untrusted origin %s before spending credits', async origin => {
    const res = mockRes();
    await handler({ method: 'POST', headers: { origin } }, res);
    expect(res.statusCode).toBe(403);
    expect(create).not.toHaveBeenCalled();
  });

  it('limits each forwarded IP, returns Retry-After, and expires the sliding window', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    create.mockResolvedValue({ choices: [{ message: { content: '{}' } }] });
    let now = 100000;
    const clock = jest.spyOn(Date, 'now').mockImplementation(() => now);
    const send = async headers => {
      const res = mockRes();
      await handler({ method: 'POST', headers, body: { image: SMALL_JPEG } }, res);
      return res;
    };
    try {
      const headers = { 'x-forwarded-for': '192.0.2.1, 10.0.0.1' };
      for (let i = 0; i < handler.RATE_LIMIT_REQUESTS; i++) {
        expect((await send(headers)).statusCode).toBe(200);
        now += 1000;
      }
      const limited = await send({ 'x-forwarded-for': '192.0.2.1, 10.0.0.2' });
      expect(limited.statusCode).toBe(429);
      expect(limited.headers['Retry-After']).toBe('50');
      expect(create).toHaveBeenCalledTimes(handler.RATE_LIMIT_REQUESTS);
      expect((await send({ 'x-real-ip': '192.0.2.2' })).statusCode).toBe(200);
      now = 100000 + handler.RATE_LIMIT_WINDOW_MS;
      expect((await send(headers)).statusCode).toBe(200);
      expect((await send(headers)).statusCode).toBe(429);
    } finally {
      clock.mockRestore();
    }
  });

});
