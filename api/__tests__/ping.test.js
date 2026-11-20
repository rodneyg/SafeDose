/* eslint-env jest */
const handler = require('../ping');
const deployPing = require('../deploy-ping');
const { routes } = require('../../vercel.json');

function mockRes() {
  return {
    statusCode: null,
    body: null,
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

describe('GET /api/ping', () => {
  it('returns pong', () => {
    const res = mockRes();

    handler({ method: 'GET' }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true, message: 'pong' });
    expect(res.headers['Cache-Control']).toBe('no-store');
  });

  it.each(['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'])('rejects %s with the allowed method', method => {
    const res = mockRes();

    handler({ method }, res);

    expect(res.statusCode).toBe(405);
    expect(res.headers.Allow).toBe('GET');
    expect(res.body).toEqual({ error: 'Method Not Allowed' });
  });
});

describe('GET /ping', () => {
  it('routes to the deploy check and returns the SafeDose JSON response', () => {
    const route = routes.find(({ src }) => src && new RegExp(`^${src}$`).test('/ping'));
    expect(route).toEqual({ src: '/ping', dest: '/api/deploy-ping.js' });

    const res = mockRes();

    deployPing({ method: 'GET' }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true, service: 'safedose' });
    expect(res.headers['Cache-Control']).toBe('no-store');
  });

  it('rejects POST', () => {
    const res = mockRes();

    deployPing({ method: 'POST' }, res);

    expect(res.statusCode).toBe(405);
    expect(res.headers.Allow).toBe('GET');
  });
});
