const { createRateLimit, WINDOW_MS } = require('./apiRateLimit');

function request(remoteAddress = '127.0.0.1', headers = {}) {
  return { headers, socket: { remoteAddress } };
}

function response() {
  return {
    setHeader: jest.fn(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
}

describe('createRateLimit', () => {
  const originalVercel = process.env.VERCEL;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00Z'));
    delete process.env.VERCEL;
  });

  afterEach(() => {
    jest.useRealTimers();
    if (originalVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = originalVercel;
  });

  test('accepts requests up to the limit and disables response caching', () => {
    const limit = createRateLimit(2);
    const res = response();

    expect(limit(request(), res)).toBe(true);
    expect(limit(request(), res)).toBe(true);
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
    expect(res.status).not.toHaveBeenCalled();
  });

  test('rejects excess requests with the default message and retry delay', () => {
    const limit = createRateLimit(1);
    const res = response();

    expect(limit(request(), res)).toBe(true);
    jest.advanceTimersByTime(1_500);
    expect(limit(request(), res)).toBe(false);

    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', '59');
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Too many requests. Please try again later.',
    });
  });

  test('uses a custom rejection message', () => {
    const limit = createRateLimit(0, 'Slow down');
    const res = response();

    expect(limit(request(), response())).toBe(true);
    expect(limit(request(), res)).toBe(false);
    expect(res.json).toHaveBeenCalledWith({ error: 'Slow down' });
  });

  test('allows requests again after the sliding window expires', () => {
    const limit = createRateLimit(1);

    expect(limit(request(), response())).toBe(true);
    jest.advanceTimersByTime(WINDOW_MS);
    expect(limit(request(), response())).toBe(true);
  });

  test('tracks valid Vercel forwarded addresses independently', () => {
    process.env.VERCEL = '1';
    const limit = createRateLimit(1);
    const socketAddress = '10.0.0.1';

    expect(limit(request(socketAddress, { 'x-vercel-forwarded-for': '192.0.2.1' }), response())).toBe(true);
    expect(limit(request(socketAddress, { 'x-vercel-forwarded-for': '192.0.2.2' }), response())).toBe(true);
  });

  test.each([
    ['outside Vercel', undefined, '192.0.2.1'],
    ['when the forwarded value is invalid', '1', 'not-an-ip'],
  ])('falls back to the socket address %s', (_label, vercel, forwarded) => {
    if (vercel) process.env.VERCEL = vercel;
    const limit = createRateLimit(1);
    const headers = { 'x-vercel-forwarded-for': forwarded };

    expect(limit(request('10.0.0.1', headers), response())).toBe(true);
    expect(limit(request('10.0.0.1'), response())).toBe(false);
  });

  test('uses an unknown client key when no socket address exists', () => {
    const limit = createRateLimit(1);
    const req = { headers: {}, socket: {} };

    expect(limit(req, response())).toBe(true);
    expect(limit(req, response())).toBe(false);
  });

  test('rejects a new client when the client capacity is full', () => {
    const limit = createRateLimit(1);
    for (let index = 0; index < 10_000; index += 1) {
      expect(limit(request(`client-${index}`), response())).toBe(true);
    }
    const res = response();

    expect(limit(request('one-client-too-many'), res)).toBe(false);
    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', '60');
    expect(res.status).toHaveBeenCalledWith(429);
  });
});
