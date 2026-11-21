// Build both variants from this commit (clear Metro's cache when changing flags):
// npx expo export --clear --platform web --output-dir ./baseline-web
// EXPO_PUBLIC_FIRST_DOSE_QUICK_START=true npx expo export --clear --platform web --output-dir ./quick-start-web
// Then run:
// node scripts/measure-first-dose.mjs <flag-off-export> <flag-on-export>
// Use an installed Playwright Chromium, or set CHROMIUM_EXECUTABLE to a headless shell.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { chromium } from 'playwright';

const [baselineDir, quickStartDir, sampleCount = '7'] = process.argv.slice(2);
const samples = Number(sampleCount);
assert(baselineDir && quickStartDir && Number.isInteger(samples) && samples >= 3 && samples % 2 === 1,
  'Pass two Expo web export directories and optionally an odd sample count of at least three.');

const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

async function serve(directory) {
  const root = resolve(directory);
  await readFile(resolve(root, 'index.html'));
  const server = createServer(async (request, response) => {
    try {
      const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      if (path.startsWith('/api/')) {
        response.writeHead(503).end();
        return;
      }
      const file = path === '/' ? 'index.html' : path.slice(1).replace(/\/$/, '');
      const target = resolve(root, extname(file) ? file : file + '.html');
      if (!target.startsWith(root + sep)) {
        response.writeHead(403).end();
        return;
      }
      const body = await readFile(target).catch(error => {
        if (error.code !== 'ENOENT' || extname(file)) throw error;
        return readFile(resolve(root, file, 'index.html'));
      });
      response.writeHead(200, { 'content-type': types[extname(target)] ?? 'application/octet-stream' }).end(body);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise((done, fail) => server.once('error', fail).listen(0, '127.0.0.1', done));
  return { server, origin: `http://127.0.0.1:${server.address().port}` };
}

const medication = 'Synthetic timing fixture';
const eventKey = '@safedose/first-dose-event';
const button = (page, name) => page.getByRole('button', { name, exact: true }).click();
const text = (page, label) => page.getByText(label, { exact: true }).click();
const next = page => button(page, 'Next step');

async function standardFlow(page) {
  await next(page);
  await next(page);
  await button(page, 'Start using SafeDose');
  await button(page, 'Skip personalization and enter dose manually');
  await page.getByPlaceholder('e.g., 100', { exact: true }).fill('0.5');
  await text(page, 'mg');
  await next(page);
  await page.getByPlaceholder('Substance Name (Optional)', { exact: true }).fill(medication);
  await page.getByLabel('Concentration', { exact: true }).click();
  await next(page);
  await page.getByPlaceholder('e.g., 10', { exact: true }).fill('2.5');
  await text(page, 'mg/ml');
  await next(page);
  await page.getByPlaceholder('e.g., 50', { exact: true }).fill('5');
  await next(page);
  await text(page, 'Standard Syringes');
  await text(page, '1 ml');
  await button(page, 'Calculate dose');
  await button(page, 'Proceed to result');
  await page.getByText(/Calculated volume: 0\.2 ml/).waitFor();
  await text(page, 'Done');
  await page.getByText("Choose where you'll inject to help track rotation", { exact: true }).waitFor();
  await text(page, 'Continue');
  await page.getByText(/^Skip & continue to /).click();
}

async function quickStartFlow(page) {
  await page.getByRole('heading', { name: 'Quick start' }).waitFor();
  await page.getByLabel('Medication name', { exact: true }).fill(medication);
  await page.getByLabel('Dose taken (mg)', { exact: true }).fill('0.5');
  await page.getByLabel('Strength on label (mg/mL)', { exact: true }).fill('2.5');
  await page.getByRole('radio', { name: '1 ml', exact: true }).click();
  await page.getByText('Calculated volume to log is 0.200 mL.', { exact: true }).waitFor();
  await button(page, 'Log dose');
}

async function measure(browser, origin, variant, flow) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    serviceWorkers: 'block',
    reducedMotion: 'reduce',
  });
  try {
    // The scripted comparison runs without Firebase, Stripe, image hosts or telemetry.
    await context.route('**/*', route => new URL(route.request().url()).origin === origin
      ? route.continue()
      : route.abort());
    const page = await context.newPage();
    page.setDefaultTimeout(12_000);
    await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 12_000 });
    await button(page, 'Start demo');
    await button(page, 'Skip birth date entry');
    await button(page, 'Continue without providing birth date');
    try {
      await flow(page);
    } catch (error) {
      console.error(`${variant} failed at ${new URL(page.url()).pathname}`);
      throw error;
    }
    await page.waitForFunction(key => globalThis.localStorage.getItem(key) !== null, eventKey);
    const { event, logs } = await page.evaluate(key => ({
      event: JSON.parse(globalThis.localStorage.getItem(key)),
      logs: Object.keys(globalThis.localStorage).filter(key => key.startsWith('dose_logs_'))
        .flatMap(key => JSON.parse(globalThis.localStorage.getItem(key))),
    }), eventKey);

    assert.deepEqual(Object.keys(event).sort(), ['elapsed_ms', 'name', 'variant']);
    assert.equal(event.name, 'first_dose_logged');
    assert.equal(event.variant, variant);
    assert(Number.isInteger(event.elapsed_ms) && event.elapsed_ms > 0);
    assert.equal(logs.length, 1);
    assert.equal(logs[0].substanceName, medication);
    assert.equal(logs[0].doseValue, 0.5);
    assert.equal(logs[0].unit, 'mg');
    assert.equal(logs[0].calculatedVolume, 0.2);

    if (variant === 'quick_start') {
      await page.getByText('Dose logged.', { exact: true }).waitFor();
      await button(page, 'Continue setup');
      await page.getByText('How It Works', { exact: true }).waitFor();
    }
    return event.elapsed_ms;
  } finally {
    await context.close();
  }
}

const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const servers = [];
let browser;
try {
  const baseline = await serve(baselineDir);
  servers.push(baseline.server);
  const quickStart = await serve(quickStartDir);
  servers.push(quickStart.server);
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE });
  const runs = { baseline: [], quick_start: [] };
  const control = async () => runs.baseline.push(await measure(browser, baseline.origin, 'baseline', standardFlow));
  const treatment = async () => runs.quick_start.push(await measure(browser, quickStart.origin, 'quick_start', quickStartFlow));
  for (let i = 0; i < samples; i++) {
    const pair = i % 2 === 0 ? [control, treatment] : [treatment, control];
    for (const run of pair) await run();
  }
  const baselineMedianMs = median(runs.baseline);
  const quickStartMedianMs = median(runs.quick_start);
  const improvementPercent = 100 * (1 - quickStartMedianMs / baselineMedianMs);
  console.log(JSON.stringify({
    samplesPerVariant: samples,
    samplesMs: runs,
    baselineMedianMs,
    quickStartMedianMs,
    improvementPercent,
    thresholdPercent: 30,
    thresholdMet: improvementPercent >= 30,
  }, null, 2));
} finally {
  await browser?.close();
  for (const server of servers) server.close();
}
