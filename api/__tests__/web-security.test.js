/* eslint-env jest */
const { routes } = require('../../vercel.json');
const { createRateLimit } = require('../../lib/apiRateLimit');

describe('Vercel response headers', () => {
  it('applies security headers before the ping, API, filesystem, and SPA routes', () => {
    const [security, ping, api, filesystem, staticAssets, spa] = routes;
    const matcher = new RegExp('^' + security.src + '$');
    for (const path of ['/', '/ping', '/settings', '/assets/app.js', '/api/health']) {
      expect(matcher.test(path)).toBe(true);
    }
    expect(security.continue).toBe(true);
    expect(security.headers).toEqual({
      'Strict-Transport-Security': 'max-age=31536000',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': "frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
    });
    expect(ping).toEqual({ src: '/ping', dest: '/api/deploy-ping.js' });
    expect(api.dest).toBe('/api/$1.js');
    expect(filesystem.handle).toBe('filesystem');
    expect(staticAssets.status).toBe(404);
    expect(new RegExp('^' + staticAssets.src + '$').test('/assets/missing.js')).toBe(true);
    expect(spa.dest).toBe('/index.html');
  });
});

describe('API rate limit', () => {
  const originalVercel = process.env.VERCEL;
  let allow;
  let res;

  beforeEach(() => {
    allow = createRateLimit(1);
    res = { status: jest.fn().mockReturnThis(), json: jest.fn(), setHeader: jest.fn() };
  });

  afterEach(() => {
    if (originalVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = originalVercel;
  });

  it('uses the connection address outside Vercel', () => {
    delete process.env.VERCEL;
    const socket = { remoteAddress: '192.0.2.1' };
    expect(allow({ socket, headers: { 'x-vercel-forwarded-for': '192.0.2.2' } }, res)).toBe(true);
    expect(allow({ socket, headers: { 'x-vercel-forwarded-for': '192.0.2.3' } }, res)).toBe(false);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
  });

  it('uses the Vercel client IP and falls back to the socket for malformed addresses', () => {
    process.env.VERCEL = '1';
    const socket = { remoteAddress: '192.0.2.1' };
    expect(allow({ socket, headers: { 'x-vercel-forwarded-for': '192.0.2.2' } }, res)).toBe(true);
    expect(allow({ socket, headers: { 'x-vercel-forwarded-for': '192.0.2.3' } }, res)).toBe(true);
    expect(allow({ socket, headers: { 'x-vercel-forwarded-for': '192.0.2.2' } }, res)).toBe(false);
    expect(allow({ socket, headers: { 'x-vercel-forwarded-for': 'malformed' } }, res)).toBe(true);
    expect(allow({ socket }, res)).toBe(false);
  });
});
