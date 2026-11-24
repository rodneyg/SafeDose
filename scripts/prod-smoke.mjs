import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const production = 'https://safedose.rodneygainous.com';
const root = fileURLToPath(new URL('../', import.meta.url));
const pages = [
  ['/', ['Verify Materials', 'Calculate Doses'], '/onboarding'],
  ['/onboarding', ['Verify Materials', 'Calculate Doses']],
  ['/pricing', ['Photo Scan', '/month', '/year', 'Calculator stays free']],
  ['/login', ['Sign In with Google', 'Cancel']],
  ['/changelog', ['Changelog', 'New features, improvements, and fixes']],
  ['/privacy', ['Privacy Policy']],
  ['/terms', ['Terms of Service']],
  ['/support', ['Support']],
];

const guestId = 'safedose-smoke-guest';
// An unsigned placeholder used only in intercepted Firebase responses.
const guestToken = 'e30.' + Buffer.from(JSON.stringify({
  sub: guestId, firebase: { sign_in_provider: 'anonymous' },
})).toString('base64url') + '.fixture';
const cors = { 'access-control-allow-origin': '*' };

export async function isolateRequest(route, origin) {
  const request = route.request();
  const { origin: target, pathname } = new URL(request.url());
  const method = request.method();

  // Complete the Firebase startup locally so the smoke creates no guest accounts
  // or installations and submits no analytics events.
  if (method === 'POST' && target === 'https://identitytoolkit.googleapis.com') {
    if (pathname === '/v1/accounts:signUp') {
      return route.fulfill({ headers: cors, json: {
        localId: guestId, idToken: guestToken, refreshToken: 'fixture', expiresIn: '3600',
      } });
    }
    if (pathname === '/v1/accounts:lookup') {
      return route.fulfill({ headers: cors, json: { users: [{ localId: guestId }] } });
    }
  }
  if (method === 'POST' && target === 'https://firebaseinstallations.googleapis.com' &&
      /^\/v1\/projects\/[^/]+\/installations$/.test(pathname)) {
    return route.fulfill({ headers: cors, json: {
      fid: request.postDataJSON().fid,
      refreshToken: 'fixture',
      authToken: { token: 'fixture', expiresIn: '3600s' },
    } });
  }
  if (['GET', 'POST'].includes(method) && pathname === '/g/collect' &&
      ['https://www.google-analytics.com', 'https://www.google.com'].includes(target)) {
    return route.fulfill({ headers: cors, status: 204 });
  }

  // Load inert analytics scripts locally so tracking requests never reach the
  // network and the browser does not report failures caused by our own guard.
  const analyticsScript = (target === origin && pathname === '/_vercel/insights/script.js') ||
    (target === 'https://www.googletagmanager.com' && pathname === '/gtag/js');
  if (method === 'GET' && request.resourceType() === 'script' && analyticsScript) {
    return route.fulfill({ contentType: 'application/javascript', body: '' });
  }

  const publicDependency =
    (target === 'https://firebase.googleapis.com' && /^\/v1alpha\/projects\/-\/apps\/[^/]+\/webConfig$/.test(pathname)) ||
    (target === 'https://images.unsplash.com' && request.resourceType() === 'image');
  if (method === 'GET' && (target === origin || publicDependency)) {
    const headers = await request.allHeaders();
    if (!headers.cookie && !headers.authorization) return route.continue();
  }
  return route.abort();
}

export function baseOrigin(input = production) {
  const url = new URL(input);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
      url.search || url.hash || url.pathname !== '/') throw new Error('Invalid origin');
  return url.origin;
}

function diagnosticUrl(value) {
  try {
    const url = new URL(value);
    if (['https:', 'http:'].includes(url.protocol)) return url.origin + url.pathname;
  } catch {
    // Some console messages have no URL.
  }
  return '[unknown source]';
}

// Anonymous browser diagnostics only. Strip credentials, URL queries and common tokens.
export function pageErrorDetail(error) {
  return String(error.stack || error.message || 'Unknown page error')
    .replace(/https?:\/\/[^\s)]+/g, diagnosticUrl)
    .replace(/\bAIza[A-Za-z0-9_-]{35}\b/g, '[redacted key]')
    .replace(/\b(?:sk|pk|rk)_(?:live|test)_[A-Za-z0-9_]+\b/g, '[redacted key]')
    .replace(/\bBearer\s+[^\s]+/gi, 'Bearer [redacted]')
    .replace(/((?:token|secret|password|api[_-]?key)\s*[=:]\s*)[^\s,;]+/gi, '$1[redacted]')
    .slice(0, 2000);
}

export async function runSmoke(base = production, { log = console.log } = {}) {
  const origin = baseOrigin(base);
  let failed = 0;
  async function check(name, action) {
    try { log(`PASS ${name}: ${await action()}`); }
    catch (error) {
      failed++;
      // Never print response bodies or page text. Browser errors are sanitized below.
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
          await context.route('**/*', route => isolateRequest(route, origin));
          const page = await context.newPage();
          let pageErrors = 0;
          let consoleErrors = 0;
          let httpErrors = 0;
          page.on('pageerror', error => {
            pageErrors++;
            log(`PAGE ERROR ${path}: ${pageErrorDetail(error)}`);
          });
          page.on('console', message => {
            if (message.type() !== 'error') return;
            consoleErrors++;
            log(`CONSOLE ERROR ${path}: ${diagnosticUrl(message.location().url)}`);
          });
          page.on('response', response => {
            const status = response.status();
            const type = response.request().resourceType();
            const servedHtml = [ 'script', 'stylesheet' ].includes(type) &&
              response.headers()['content-type']?.startsWith('text/html');
            if (status < 400 && !servedHtml) return;
            httpErrors++;
            const reason = servedHtml ? ' HTML for ' + type : '';
            log(`HTTP ERROR ${path}: ${status}${reason} ${diagnosticUrl(response.url())}`);
          });
          const response = await page.goto(`${origin}${path}`, { waitUntil: 'load', timeout: 30000 });
          if (response?.status() !== 200) fail(`HTTP ${response?.status() ?? 'missing'}; expected 200`);
          await page.waitForURL(`${origin}${destination}`, { timeout: 15000 });
          for (const text of expected) {
            await page.getByText(text, { exact: false }).first().waitFor({ state: 'visible', timeout: 15000 });
          }
          // Allow delayed hydration errors to surface, without waiting on perpetual animations.
          await page.waitForTimeout(1500);
          if (pageErrors || consoleErrors || httpErrors) {
            fail(`${pageErrors} page error(s), ${consoleErrors} console error(s), ${httpErrors} HTTP error(s)`);
          }
          return 'HTTP 200, expected visible text, no page, console or HTTP errors';
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
