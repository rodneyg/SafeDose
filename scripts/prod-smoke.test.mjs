import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { baseOrigin, runSmoke } from './prod-smoke.mjs';

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
    assert.equal(await runSmoke(origin, { log: line => logs.push(line) }), 0);
    broken = true;
    assert.equal(await runSmoke(origin, { log: line => logs.push(line) }), 1);
    assert.ok(logs.some(line => line.includes('HTTP 503; expected 4xx')));
    assert.ok(logs.some(line => line === 'FAIL page /login: 1 page error(s)'));
    assert.ok(!logs.some(line => line.includes('private diagnostic')));
    assert.ok(requests.every(([method, path]) => method === 'GET' ||
      (method === 'POST' && path === '/api/analyze-scan')));
    assert.ok(!requests.some(([, path]) => path === '/forbidden-write'));
  } finally { await new Promise(resolve => server.close(resolve)); }
});
