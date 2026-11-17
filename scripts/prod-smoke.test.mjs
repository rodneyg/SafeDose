import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { baseOrigin, pageErrorDetail, runSmoke } from './prod-smoke.mjs';

test('rejects credentials, paths and non-HTTP origins without echoing them', () => {
  for (const value of ['https://user:private@example.com', 'https://example.com/path',
    'https://example.com?private=value', 'https://example.com#fragment', 'file:///tmp']) {
    assert.throws(() => baseOrigin(value), { message: 'Invalid origin' });
  }
});

test('checks rendered pages, rejects page errors and 5xx, and blocks writes', async () => {
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
    const text = {
      '/onboarding': 'Verify Materials Calculate Doses',
      '/pricing': 'Photo Check /month /year Calculator stays free',
      '/login': 'Sign In with Google Cancel',
      '/changelog': 'Changelog New features, improvements, and fixes',
    }[req.url] || '';
    res.setHeader('Content-Type', 'text/html');
    res.end(req.url === '/' ? '<script>location.replace("/onboarding")</script>' :
      `<p>${text}</p><script>fetch('/forbidden-write', {method:'POST'}).catch(()=>{});${broken && req.url === '/login' ? 'throw new Error("private diagnostic")' : ''}</script>`);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const logs = [];
    const origin = `http://127.0.0.1:${server.address().port}`;
    assert.equal(await runSmoke(origin, { log: line => logs.push(line) }), 0, logs.join('\n'));
    broken = true;
    assert.equal(await runSmoke(origin, { log: line => logs.push(line) }), 1);
    assert.ok(logs.some(line => line.includes('HTTP 503; expected 4xx')));
    if (requests.some(([, path]) => path === '/api/health')) {
      assert.ok(logs.includes('PASS health availability on origin/main: HTTP 200, ok=true'));
      assert.ok(logs.includes('FAIL health availability on origin/main: HTTP 503; expected 200'));
    }
    assert.ok(logs.some(line => line === 'FAIL page /login: 1 page error(s)'));
    assert.ok(logs.some(line => line.includes('PAGE ERROR /login: Error: private diagnostic')));
    assert.ok(logs.some(line => line.includes('/login:1:')));
    assert.ok(requests.every(([method, path]) => method === 'GET' ||
      (method === 'POST' && path === '/api/analyze-scan')));
    assert.ok(!requests.some(([, path]) => path === '/forbidden-write'));
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('page diagnostics retain errors and locations while redacting sensitive values', () => {
  const detail = pageErrorDetail({ stack: 'Error: Failed to load Stripe.js\n at https://user:password@example.com/app.js?token=private#secret:1:2 sk_test_private Bearer private token=private password=private api_key=private' });
  assert.ok(detail.includes('Failed to load Stripe.js'));
  assert.ok(detail.includes('https://example.com/app.js'));
  assert.ok(!detail.includes('private'));
  assert.ok(!detail.includes('user:password'));
});
