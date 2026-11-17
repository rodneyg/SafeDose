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

  afterEach(() => {
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  });

  it.each([undefined, ''])('reports an unconfigured scan provider when the key is %s', key => {
    if (key === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = key;
    const res = mockRes();

    handler({ method: 'GET' }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true, scanProviderConfigured: false });
    expect(res.headers['Cache-Control']).toBe('no-store');
  });

  it('returns only status booleans when the scan provider is configured', () => {
    process.env.OPENAI_API_KEY = 'unit-test-placeholder';
    const res = mockRes();

    handler({ method: 'GET' }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true, scanProviderConfigured: true });
    expect(res.headers['Cache-Control']).toBe('no-store');
  });

  it('reads current configuration for each request', () => {
    process.env.OPENAI_API_KEY = 'unit-test-placeholder';
    handler({ method: 'GET' }, mockRes());
    delete process.env.OPENAI_API_KEY;
    const res = mockRes();

    handler({ method: 'GET' }, res);

    expect(res.body).toEqual({ ok: true, scanProviderConfigured: false });
  });

  it.each(['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'])('rejects %s with the allowed method', method => {
    const res = mockRes();

    handler({ method }, res);

    expect(res.statusCode).toBe(405);
    expect(res.headers.Allow).toBe('GET');
    expect(res.body).toEqual({ error: 'Method Not Allowed' });
  });
});
