/* eslint-env jest */
const SOLID_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
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
  let errorLog;

  beforeEach(() => {
    errorLog = jest.spyOn(console, 'error').mockImplementation(() => {});
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
    errorLog.mockRestore();
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
    expect(res.body.error).toBe('Vision analysis is not configured.');
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects missing or malformed images', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    for (const image of [undefined, '', 'http://example.com/x.jpg', 'data:text/plain;base64,abcd']) {
      const res = mockRes();
      await handler({ method: 'POST', body: { image } }, res);
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/image/i);
    }
    expect(create).not.toHaveBeenCalled();
  });

  it.each([401, 403])('maps rejected service credentials (%s) to a safe 503', async status => {
    process.env.OPENAI_API_KEY = 'test-key';
    create.mockRejectedValue({ status, message: 'sensitive provider details: timeout', code: 'invalid_api_key' });
    const res = mockRes();
    await handler({ method: 'POST', body: { image: SMALL_JPEG } }, res);
    expect(res.statusCode).toBe(503);
    expect(res.body.error).toBe('Image analysis is unavailable because service authentication failed. Please contact support.');
    expect(JSON.stringify([res.body, errorLog.mock.calls])).not.toContain('sensitive provider details');
    expect(JSON.stringify([res.body, errorLog.mock.calls])).not.toContain('test-key');
  });

  it.each([
    { name: 'APIConnectionTimeoutError', message: 'Request timed out.' },
    { code: 'ETIMEDOUT' },
    { name: 'AbortError' },
    { status: 408 },
    { status: 504 },
    { message: 'Connection timeout' },
  ])('maps timeout %j to 504', async error => {
    process.env.OPENAI_API_KEY = 'test-key';
    create.mockRejectedValue(error);
    const res = mockRes();
    await handler({ method: 'POST', body: { image: SMALL_JPEG } }, res);
    expect(res.statusCode).toBe(504);
    expect(res.body.error).toBe('Image analysis timed out. Please try again.');
  });

  it.each([
    { status: 400, code: 'invalid_image' },
    { status: 400, code: 'image_parse_error' },
    { status: 422, error: { code: 'invalid_image_format' } },
  ])('maps provider image rejection %j to a safe 400', async error => {
    process.env.OPENAI_API_KEY = 'test-key';
    create.mockRejectedValue({ ...error, message: 'sensitive provider details' });
    const res = mockRes();
    await handler({ method: 'POST', body: { image: SMALL_JPEG } }, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('The image could not be read. Please upload a clear JPEG, PNG, WebP, or GIF image.');
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain('sensitive provider details');
  });

  it.each([{ status: 500 }, { status: 400, code: 'invalid_request_error' }, null])(
    'preserves the safe generic fallback for %j', async error => {
      process.env.OPENAI_API_KEY = 'test-key';
      create.mockRejectedValue(error && { ...error, message: 'sensitive provider details' });
      const res = mockRes();
      await handler({ method: 'POST', body: { image: SMALL_JPEG } }, res);
      expect(res.statusCode).toBe(502);
      expect(res.body.error).toBe('Image analysis failed. Please try again.');
      expect(JSON.stringify(errorLog.mock.calls)).not.toContain('sensitive provider details');
    },
  );

  it.each([
    [401, 'invalid_api_key', 'authentication', 503],
    [403, 'permission_denied', 'authentication', 503],
    [429, 'insufficient_quota', 'other', 502],
    [429, 'rate_limit_exceeded', 'other', 502],
    [404, 'model_not_found', 'other', 502],
    [400, 'invalid_image', 'invalid_image', 400],
    [504, 'ETIMEDOUT', 'timeout', 504],
  ])('logs only safe fields for %s / %s (top-level and nested)', async (status, code, category, publicStatus) => {
    process.env.OPENAI_API_KEY = 'test-key';
    for (const codeFields of [{ code }, { error: { code } }]) {
      errorLog.mockClear();
      create.mockRejectedValue({
        status, ...codeFields,
        message: 'private-provider-message',
        headers: { authorization: 'private-authorization' },
        image: SMALL_JPEG,
        apiKey: process.env.OPENAI_API_KEY,
      });
      const res = mockRes();
      await handler({ method: 'POST', body: { image: SMALL_JPEG } }, res);
      expect(res.statusCode).toBe(publicStatus);
      expect(errorLog).toHaveBeenCalledTimes(1);
      expect(errorLog.mock.calls).toEqual([[JSON.stringify({
        event: 'analyze-scan.provider_failure', category,
        upstream_status: status,
        provider_code: ['invalid_image', 'ETIMEDOUT'].includes(code) ? 'other' : code,
      })]]);
      for (const privateValue of ['private-provider-message', 'private-authorization', SMALL_JPEG, 'test-key']) {
        expect(JSON.stringify([res.body, errorLog.mock.calls])).not.toContain(privateValue);
      }
    }
  });

  it.each([400, 401, 403, 404, 408, 409, 422, 429, 500, 502, 503, 504])(
    'preserves allowlisted numeric upstream status %s', async status => {
      process.env.OPENAI_API_KEY = 'test-key';
      create.mockRejectedValue({ status });
      await handler({ method: 'POST', body: { image: SMALL_JPEG } }, mockRes());
      expect(errorLog).toHaveBeenCalledTimes(1);
      expect(JSON.parse(errorLog.mock.calls[0][0]).upstream_status).toBe(status);
    },
  );

  it.each([
    undefined, null, 200, 418, '401', 'private-status',
    { credential: 'private-status' },
  ])('discards unknown or nonnumeric status %# and arbitrary codes', async status => {
    process.env.OPENAI_API_KEY = 'test-key';
    create.mockRejectedValue({ status, code: 'private-code', message: 'private-message' });
    const res = mockRes();
    await handler({ method: 'POST', body: { image: SMALL_JPEG } }, res);
    expect(res.body).toEqual({ error: 'Image analysis failed. Please try again.' });
    expect(errorLog.mock.calls).toEqual([[JSON.stringify({
      event: 'analyze-scan.provider_failure', category: 'other',
      upstream_status: null, provider_code: 'other',
    })]]);
  });

  it.each([undefined, null, 'INVALID_API_KEY', 'invalid_api_key\nprivate-code', { key: 'private-code' }])(
    'discards non-allowlisted provider code %#', async code => {
      process.env.OPENAI_API_KEY = 'test-key';
      create.mockRejectedValue({ status: 401, code });
      await handler({ method: 'POST', body: { image: SMALL_JPEG } }, mockRes());
      expect(errorLog.mock.calls).toEqual([[JSON.stringify({
        event: 'analyze-scan.provider_failure', category: 'authentication',
        upstream_status: 401, provider_code: 'other',
      })]]);
    },
  );

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

  it.each([
    ['null content', { content: null }],
    ['empty content', { content: '' }],
    ['whitespace content', { content: ' \n\t' }],
    ['missing content', {}],
    ['provider refusal', { content: null, refusal: 'private provider refusal' }],
    ['refusal with content', { content: '{"refuse":false}', refusal: 'private provider refusal' }],
  ])('returns a safe 422 for %s on a valid solid-color PNG', async (_, message) => {
    process.env.OPENAI_API_KEY = 'test-key';
    create.mockResolvedValue({ choices: [{ message }] });
    const res = mockRes();
    await handler({ method: 'POST', body: { image: SOLID_PNG } }, res);
    expect(res.statusCode).toBe(422);
    expect(res.body).toEqual({
      error: 'We could not read a syringe or vial in this photo. Enter the values manually.',
    });
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0].messages[0].content[1].image_url.url).toBe(SOLID_PNG);
    expect(JSON.stringify([res.body, errorLog.mock.calls])).not.toContain('private provider refusal');
  });
  it.each([
    'https://safe-dose.vercel.app',
    'https://safedose.rodneygainous.com',
    'https://safe-dose-abc123-rodneygs-projects.vercel.app',
    'https://safe-dose-git-saf-115-photo-check-rodneygs-projects.vercel.app',
    'http://localhost:8081', undefined,
  ])('allows SafeDose or native origin %s', async origin => {
    process.env.OPENAI_API_KEY = 'test-key';
    create.mockResolvedValue({ choices: [{ message: { content: '{}' } }] });
    const res = mockRes();
    await handler({ method: 'POST', headers: { origin }, body: { image: SMALL_JPEG } }, res);
    expect(res.statusCode).toBe(200);
  });

  it.each([
    'https://evil.vercel.app', 'https://safe-dose.evil.com', 'null',
    'https://app.safedoseai.com', 'https://rodneygainous.com', 'https://www.rodneygainous.com',
    'https://safe-dose-attacker.vercel.app',
    'https://safe-dose-abc-team.vercel.app', 'http://safe-dose.vercel.app',
    'https://safe-dose.vercel.app/path', '', 'http://safedose.rodneygainous.com',
    'https://evil.rodneygainous.com', 'https://safedose.rodneygainous.com.evil.com',
  ])('rejects untrusted origin %s before spending credits', async origin => {
    const res = mockRes();
    await handler({ method: 'POST', headers: { origin } }, res);
    expect(res.statusCode).toBe(403);
    expect(create).not.toHaveBeenCalled();
  });

  it('limits each client IP, returns Retry-After, and expires the sliding window', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    create.mockResolvedValue({ choices: [{ message: { content: '{}' } }] });
    let now = 100000;
    const clock = jest.spyOn(Date, 'now').mockImplementation(() => now);
    const send = async remoteAddress => {
      const res = mockRes();
      await handler({ method: 'POST', socket: { remoteAddress }, body: { image: SMALL_JPEG } }, res);
      return res;
    };
    try {
      const client = '192.0.2.1';
      for (let i = 0; i < handler.RATE_LIMIT_REQUESTS; i++) {
        expect((await send(client)).statusCode).toBe(200);
        now += 1000;
      }
      const limited = await send(client);
      expect(limited.statusCode).toBe(429);
      expect(limited.headers['Retry-After']).toBe('50');
      expect(create).toHaveBeenCalledTimes(handler.RATE_LIMIT_REQUESTS);
      expect((await send('192.0.2.2')).statusCode).toBe(200);
      now = 100000 + handler.RATE_LIMIT_WINDOW_MS;
      expect((await send(client)).statusCode).toBe(200);
      expect((await send(client)).statusCode).toBe(429);
    } finally {
      clock.mockRestore();
    }
  });

});
