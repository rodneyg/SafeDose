import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { baseOrigin, isolateRequest, pageErrorDetail, runSmoke } from './prod-smoke.mjs';

test('rejects credentials, paths and non-HTTP origins without echoing them', () => {
  for (const value of ['https://user:private@example.com', 'https://example.com/path',
    'https://example.com?private=value', 'https://example.com#fragment', 'file:///tmp']) {
    assert.throws(() => baseOrigin(value), { message: 'Invalid origin' });
  }
});

test('checks rendered pages, rejects browser and HTTP errors, and blocks writes', async () => {
  const requests = [];
  let broken = false;
  const server = createServer((req, res) => {
    requests.push([req.method, req.url]);
    if (req.url === '/api/analyze-scan') {
      res.writeHead(broken ? 503 : 400).end('{}');
      return;
    }
    if (req.url === '/api/health') {
      res.writeHead(broken ? 503 : 200, { 'Content-Type': 'application/json' })
        .end(JSON.stringify({ ok: !broken }));
      return;
    }
    if (req.url?.startsWith('/missing.png')) {
      res.writeHead(404).end();
      return;
    }
    if (req.url === '/fallback.js') {
      res.writeHead(200, { 'Content-Type': 'text/html' }).end('<p>fallback</p>');
      return;
    }
    const text = {
      '/onboarding': 'Verify Materials Calculate Doses',
      '/pricing': 'Photo Scan /month /year Calculator stays free',
      '/login': 'Sign In with Google Cancel',
      '/changelog': 'Changelog New features, improvements, and fixes',
      '/privacy': 'Privacy Policy',
      '/terms': 'Terms of Service',
      '/support': 'Support',
    }[req.url] || '';
    const failures = broken ? {
      '/login': '<script>throw new Error("private diagnostic")</script>',
      '/pricing': '<script>console.error("private console message")</script>',
      '/changelog': '<img src="/missing.png?private=value">',
      '/privacy': '<script src="/fallback.js"></script>',
      '/support': '<script>fetch("/forbidden-write", {method:"POST"}).catch(()=>{})</script>',
    } : {};
    res.setHeader('Content-Type', 'text/html');
    res.end(req.url === '/' ? '<script>location.replace("/onboarding")</script>' :
      `<p>${text}</p>${failures[req.url] || ''}`);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const logs = [];
    const origin = `http://127.0.0.1:${server.address().port}`;
    assert.equal(await runSmoke(origin, { log: line => logs.push(line) }), 0, logs.join('\n'));
    broken = true;
    assert.equal(await runSmoke(origin, { log: line => logs.push(line) }), 1);
    assert.ok(logs.some(line => line.includes('HTTP 503; expected 4xx')));
    assert.equal(requests.filter(([, path]) => path === '/api/health').length, 2,
      'the health endpoint present in the fixture must be requested in both smoke runs');
    assert.ok(logs.includes('PASS health availability on origin/main: HTTP 200, ok=true'));
    assert.ok(logs.includes('FAIL health availability on origin/main: HTTP 503; expected 200'));
    assert.ok(logs.some(line => line.startsWith('FAIL page /login: 1 page error(s)')));
    assert.ok(logs.some(line => line === 'FAIL page /pricing: 0 page error(s), 1 console error(s), 0 HTTP error(s)'));
    assert.ok(logs.some(line => line.includes('PAGE ERROR /login: Error: private diagnostic')));
    assert.ok(logs.some(line => line.includes('/login:1:')));
    assert.ok(logs.includes(`HTTP ERROR /changelog: 404 ${origin}/missing.png`));
    assert.ok(logs.includes(`HTTP ERROR /privacy: 200 HTML for script ${origin}/fallback.js`));
    assert.ok(!logs.some(line => line.includes('private console message') || line.includes('private=value')));
    assert.ok(requests.every(([method, path]) => method === 'GET' ||
      (method === 'POST' && path === '/api/analyze-scan')));
    assert.ok(!requests.some(([, path]) => path === '/forbidden-write'));
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('keeps background auth and analytics off the live write endpoints', async () => {
  const origin = 'https://safedose.example';
  function simulate(method, url, headers = {}) {
    return isolateRequest({
      request: () => ({
        method: () => method,
        url: () => url,
        allHeaders: async () => headers,
        resourceType: () => 'fetch',
        postDataJSON: () => ({ fid: 'test-installation' }),
      }),
      fulfill: options => options,
      continue: () => 'continue',
      abort: () => 'abort',
    }, origin);
  }
  const auth = 'https://identitytoolkit.googleapis.com/v1/';
  const guest = (await simulate('POST', auth + 'accounts:signUp')).json;
  const lookup = await simulate('POST', auth + 'accounts:lookup');
  assert.equal(lookup.json.users[0].localId, guest.localId);
  const installation = await simulate('POST', 'https://firebaseinstallations.googleapis.com/v1/projects/test/installations');
  assert.equal(installation.json.fid, 'test-installation');
  const analytics = await simulate('POST', 'https://www.google-analytics.com/g/collect');
  assert.equal(analytics.status, 204);
  assert.equal(await simulate('POST', auth + 'accounts:update'), 'abort');
  assert.equal(await simulate('POST', origin + '/api/create-checkout-session'), 'abort');
  assert.equal(await simulate('GET', origin + '/asset.png', { authorization: 'test' }), 'abort');
  assert.equal(await simulate('GET', origin + '/asset.png', { cookie: 'test' }), 'abort');
  assert.equal(await simulate('GET', origin + '/asset.png'), 'continue');
});

test('page diagnostics retain errors and locations while redacting sensitive values', () => {
  const detail = pageErrorDetail({ stack: 'Error: Failed to load Stripe.js\n at https://user:password@example.com/app.js?token=private#secret:1:2 sk_test_private Bearer private token=private password=private api_key=private' });
  assert.ok(detail.includes('Failed to load Stripe.js'));
  assert.ok(detail.includes('https://example.com/app.js'));
  assert.ok(!detail.includes('private'));
  assert.ok(!detail.includes('user:password'));
});
