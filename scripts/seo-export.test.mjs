import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const dist = new URL('../dist/', import.meta.url);
const sitemap = readFileSync(new URL('sitemap.xml', dist), 'utf8');
const pages = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, url]) => new URL(url));

test('each sitemap URL exports one set of metadata in its HTML head', () => {
  assert.ok(pages.length > 0, 'expected public URLs in the sitemap');
  const titles = new Set();
  for (const url of pages) {
    const file = url.pathname === '/' ? 'index.html' : `${url.pathname.slice(1)}.html`;
    const head = readFileSync(new URL(file, dist), 'utf8').split('</head>', 1)[0];
    const title = head.match(/<title\b[^>]*>([^<]+)<\/title>/)?.[1];
    assert.ok(title, `${file}: missing title`);
    assert.ok(!titles.has(title), `${file}: duplicate page title ${title}`);
    titles.add(title);
    for (const [pattern, expected] of [
      [/<link\b[^>]* rel="canonical"[^>]* href="([^"]+)"/g, url.href],
      [/<meta\b[^>]* property="og:url"[^>]* content="([^"]+)"/g, url.href],
      [/<meta\b[^>]* property="og:image"[^>]* content="([^"]+)"/g, `${url.origin}/icons/icon-512.png`],
      [/<meta\b[^>]* name="twitter:card"[^>]* content="([^"]+)"/g, 'summary'],
    ]) {
      assert.deepEqual([...head.matchAll(pattern)].map(([, value]) => value), [expected], file);
    }
    assert.equal([...head.matchAll(/<meta\b[^>]* name="description"[^>]* content="[^"]+"/g)].length, 1, file);
  }
});


test('private account and checkout return routes export only their page titles', () => {
  const cases = [
    ['login.html', 'Sign In | SafeDose'],
    ['reset-password.html', 'Reset password | SafeDose'],
    ['success.html', 'Subscription status | SafeDose'],
    ['settings.html', 'Settings | SafeDose'],
  ];
  for (const [file, expected] of cases) {
    const html = readFileSync(new URL(file, dist), 'utf8');
    const head = html.split('</head>', 1)[0];
    assert.deepEqual([...head.matchAll(/<title\b[^>]*>([^<]+)<\/title>/g)].map(([, title]) => title), [expected], file);
    assert.doesNotMatch(head, /rel="canonical"|property="og:|name="twitter:/, file);
  }
});
