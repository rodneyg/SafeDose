import { chromium } from 'playwright';

const previewURL = process.env.PREVIEW_URL;
const previewSHA = process.env.PREVIEW_SHA;
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const timeout = 15_000;
let stage = 'configuration';
let browser;

try {
  const origin = new URL(previewURL).origin;
  const local = /^http:\/\/127\.0\.0\.1:\d+$/.test(origin);
  const preview = /^https:\/\/safe-dose-[a-z0-9]+-rodneygs-projects\.vercel\.app$/.test(origin);
  if (origin !== previewURL || !/^[0-9a-f]{40}$/.test(previewSHA) ||
      (!local && !(preview && bypass))) {
    throw new Error();
  }

  stage = 'launch headless Chromium';
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ serviceWorkers: 'block' });
  context.setDefaultTimeout(timeout);

  const healthURL = `${origin}/api/health`;
  if (preview) {
    stage = 'exchange preview credential for a cookie';
    const response = await context.request.get(healthURL, {
      headers: {
        'x-vercel-protection-bypass': bypass,
        'x-vercel-set-bypass-cookie': 'true',
      },
      maxRedirects: 0,
      timeout,
    });
    if (response.status() >= 400) throw new Error();
  }

  stage = 'read health JSON from the expected commit';
  const health = await context.request.get(healthURL, { maxRedirects: 0, timeout });
  if (health.status() !== 200 || !health.headers()['content-type']?.includes('application/json')) {
    throw new Error();
  }
  const { ok, commit } = await health.json();
  if (ok !== true || commit !== previewSHA.slice(0, 7)) throw new Error();
  console.log('PASS preview health and commit');

  // Allow only same-origin reads. Fetch without following redirects so a preview
  // cannot pass a blocked request on to another origin.
  await context.routeWebSocket('**/*', socket => socket.close());
  await context.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() !== 'GET' || url.origin !== origin ||
        url.pathname.startsWith('/api/') || url.pathname.startsWith('/_vercel/insights/')) {
      return route.abort();
    }
    let response;
    try {
      response = await route.fetch({ maxRedirects: 0, timeout });
      if (response.status() >= 300 && response.status() < 400) return await route.abort();
      await route.fulfill({ response });
    } catch {
      await route.abort();
    } finally {
      await response?.dispose();
    }
  });

  const page = await context.newPage();
  let pageErrors = 0;
  let badScripts = 0;
  page.on('pageerror', () => pageErrors++);
  page.on('response', response => {
    if (response.request().resourceType() === 'script' &&
        (response.status() !== 200 || !/(java|ecma)script/i.test(response.headers()['content-type']))) {
      badScripts++;
    }
  });

  stage = 'load and hydrate the welcome page';
  const pageResponse = await page.goto(origin, { waitUntil: 'domcontentloaded', timeout });
  if (pageResponse?.status() !== 200) throw new Error();
  await page.waitForURL(`${origin}/onboarding`, { timeout });
  stage = 'click the primary onboarding button';
  // Previews built from older branches may lack the test ID.
  await page.getByTestId('onboarding-primary-cta')
    .or(page.getByRole('button', { name: /^(Start demo|Try Now|Scan a vial)$/ }))
    .click();

  stage = 'show the age step after starting the demo';
  await page.waitForURL(`${origin}/onboarding/age`, { timeout });
  await page.getByText('Welcome to SafeDose', { exact: true }).waitFor({ state: 'visible' });

  stage = 'check for script and browser errors';
  if (pageErrors || badScripts) throw new Error();
  console.log('PASS web onboarding: welcome page loaded and the primary button opened the age step');
} catch {
  // Error objects can contain request headers or application data.
  console.error(`FAIL preview smoke: could not ${stage}.`);
  process.exitCode = 1;
} finally {
  await browser?.close();
}
