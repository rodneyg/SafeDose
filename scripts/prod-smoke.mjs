import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const production = 'https://safedose.rodneygainous.com';
const root = fileURLToPath(new URL('../', import.meta.url));
const pages = [
  ['/', ['Verify Materials', 'Calculate Doses'], '/onboarding'],
  ['/onboarding', ['Verify Materials', 'Calculate Doses']],
  ['/pricing', ['Photo Check', '/month', '/year', 'Calculator stays free']],
  ['/login', ['Sign In with Google', 'Cancel']],
  ['/changelog', ['Changelog', 'New features, improvements, and fixes']],
];

export function baseOrigin(input = production) {
  const url = new URL(input);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
      url.search || url.hash || url.pathname !== '/') throw new Error('Invalid origin');
  return url.origin;
}

export async function runSmoke(base = production, { log = console.log } = {}) {
  const origin = baseOrigin(base);
  let failed = 0;
  async function check(name, action) {
    try { log(`PASS ${name}: ${await action()}`); }
    catch (error) {
      failed++;
      // Never print response bodies, page text, URLs or exception messages.
      log(`FAIL ${name}: ${error.smokeDetail || 'unavailable, unexpected content or timeout'}`);
    }
  }
  function fail(detail) { throw Object.assign(new Error(), { smokeDetail: detail }); }
  async function request(path, options = {}) {
    return fetch(`${origin}${path}`, {
      credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(30000),
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', DNT: '1' },
      ...options,
    });
  }
  await check('/api/analyze-scan empty body', async () => {
    // Validation only: no image, account, key, inference or persisted data.
    const response = await request('/api/analyze-scan', { method: 'POST', body: '{}' });
    if (response.status < 400 || response.status >= 500) fail(`HTTP ${response.status}; expected 4xx`);
    return `HTTP ${response.status}`;
  });
  await check('health availability on origin/main', async () => {
    // Fail if main cannot be inspected; do not guess or probe an unmerged endpoint.
    const paths = execFileSync('git', ['ls-tree', '-r', '--name-only', 'origin/main', 'api'], {
      cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }).trim().split('\n');
    if (!paths.includes('api/health.js')) {
      log('SKIP /api/health: api/health.js is absent from origin/main (draft PR #450 excluded)');
      return 'health check skipped';
    }
    const response = await request('/api/health');
    if (response.status !== 200) fail(`HTTP ${response.status}; expected 200`);
    if ((await response.json()).ok !== true) fail('expected ok=true');
    return 'HTTP 200, ok=true';
  });

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    for (const [path, expected, destination = path] of pages) {
      await check(`page ${path}`, async () => {
        // Fresh anonymous state for each page. No existing Chrome profiles are used.
        const context = await browser.newContext({ locale: 'en-US', serviceWorkers: 'block' });
        try {
          await context.route('**/*', route => {
            const request = route.request();
            const headers = request.headers();
            if (request.method() !== 'GET' || new URL(request.url()).origin !== origin ||
                headers.cookie || headers.authorization) return route.abort();
            return route.continue();
          });
          const page = await context.newPage();
          let errors = 0;
          page.on('pageerror', () => { errors++; });
          const response = await page.goto(`${origin}${path}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
          if (response?.status() !== 200) fail(`HTTP ${response?.status() ?? 'missing'}; expected 200`);
          await page.waitForURL(`${origin}${destination}`, { timeout: 15000 });
          for (const text of expected) {
            await page.getByText(text, { exact: false }).first().waitFor({ state: 'visible', timeout: 15000 });
          }
          // Allow delayed hydration errors to surface, without waiting on perpetual animations.
          await page.waitForTimeout(1500);
          if (errors) fail(`${errors} page error(s)`);
          return 'HTTP 200, expected visible text, no page errors';
        } finally { await context.close(); }
      });
    }
  } catch {
    failed++;
    log('FAIL browser setup: install headless Chromium with npx playwright install chromium');
  } finally { await browser?.close(); }
  log(`${failed ? 'FAIL' : 'PASS'} production smoke: ${failed} failed check(s)`);
  log('Scope: anonymous pages and empty scan validation only. No images, sign-in, checkout or authenticated features tested.');
  return failed ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length > 3) throw new Error();
    process.exitCode = await runSmoke(process.argv[2]);
  } catch {
    console.error('FAIL smoke setup: npm run smoke:prod -- [http(s)-origin]');
    process.exitCode = 1;
  }
}
