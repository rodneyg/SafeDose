/* eslint-env jest */
const handler = require('../health');

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

describe('GET /api/health', () => {
  const originalKey = process.env.OPENAI_API_KEY;
  const originalCommit = process.env.VERCEL_GIT_COMMIT_SHA;

  beforeEach(() => {
    delete process.env.VERCEL_GIT_COMMIT_SHA;
  });

  afterEach(() => {
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
    if (originalCommit === undefined) delete process.env.VERCEL_GIT_COMMIT_SHA;
    else process.env.VERCEL_GIT_COMMIT_SHA = originalCommit;
  });

  it.each([undefined, ''])('reports an unconfigured scan provider when the key is %s', key => {
    if (key === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = key;
    const res = mockRes();

    handler({ method: 'GET' }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true, scanProviderConfigured: false, commit: null });
    expect(res.headers['Cache-Control']).toBe('no-store');
  });

  it('returns status booleans and a null commit when the scan provider is configured', () => {
    process.env.OPENAI_API_KEY = 'unit-test-placeholder';
    const res = mockRes();

    handler({ method: 'GET' }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true, scanProviderConfigured: true, commit: null });
    expect(res.headers['Cache-Control']).toBe('no-store');
  });

  it('reads current configuration for each request', () => {
    process.env.OPENAI_API_KEY = 'unit-test-placeholder';
    handler({ method: 'GET' }, mockRes());
    delete process.env.OPENAI_API_KEY;
    const res = mockRes();

    handler({ method: 'GET' }, res);

    expect(res.body).toEqual({ ok: true, scanProviderConfigured: false, commit: null });
  });

  it('reports only the first seven characters of the deployed commit SHA', () => {
    process.env.OPENAI_API_KEY = 'unit-test-placeholder';
    process.env.VERCEL_GIT_COMMIT_SHA = '1234567890abcdef1234567890abcdef12345678';
    const res = mockRes();

    handler({ method: 'GET' }, res);

    expect(res.body).toEqual({ ok: true, scanProviderConfigured: true, commit: '1234567' });
  });

  it.each([undefined, ''])('reports a null commit when the SHA is %s', commit => {
    delete process.env.OPENAI_API_KEY;
    if (commit !== undefined) process.env.VERCEL_GIT_COMMIT_SHA = commit;
    const res = mockRes();

    handler({ method: 'GET' }, res);

    expect(res.body).toEqual({ ok: true, scanProviderConfigured: false, commit: null });
  });

  it.each(['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'])('rejects %s with the allowed method', method => {
    const res = mockRes();

    handler({ method }, res);

    expect(res.statusCode).toBe(405);
    expect(res.headers.Allow).toBe('GET');
    expect(res.body).toEqual({ error: 'Method Not Allowed' });
  });
});
