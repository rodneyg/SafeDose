import { expect, test, type Request } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs/promises';

test.skip(process.env.SAFEDOSE_PROD_E2E !== '1', 'Production requires explicit opt-in');
test.skip(Boolean(process.env.CI), 'Production is never exercised in CI');

test('guest photo scan, manual calculation, and pricing', async ({ page, context }, testInfo) => {

  const origin = 'https://safedose.rodneygainous.com';
  const requests: { method: string; path: string; status: number | string }[] = [];
  const requestRows = new Map<Request, (typeof requests)[number]>();
  let analyzeAttempts = 0;
  const blocked: string[] = [];
  // Guard against retries and accidental payment or other API mutations.
  await context.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname === '/api/analyze-scan') {
      analyzeAttempts += 1;
      if (url.origin !== origin || request.method() !== 'POST' || analyzeAttempts > 1) {
        blocked.push('Unexpected or repeated analyze request');
        return route.abort();
      }
    } else if (
      (url.pathname.startsWith('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(request.method())) ||
      (url.pathname.startsWith('/api/') && /checkout|subscribe|payment|portal/i.test(url.pathname))
    ) {
      blocked.push(`${request.method()} ${url.pathname}`);
      return route.abort();
    }
    await route.continue();
  });
  context.on('request', request => {
    const url = new URL(request.url());
    if (!url.pathname.startsWith('/api/')) return;
    const row = { method: request.method(), path: url.pathname, status: 'pending' as number | string };
    requests.push(row);
    requestRows.set(request, row);
  });
  context.on('response', response => {
    const row = requestRows.get(response.request());
    if (row) row.status = response.status();
  });
  context.on('requestfailed', request => {
    const row = requestRows.get(request);
    if (row) row.status = 'failed';
  });
  const screenshot = async (name: string) => {
    await page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: true });
  };
  const next = () => page.getByRole('button', { name: 'Next step', exact: true }).click();

  try {
    await test.step('Guest start using only app onboarding', async () => {
      await page.goto('/');
      await expect(page.getByRole('button', { name: 'Start demo', exact: true })).toBeVisible();
      await screenshot('01-welcome');
      await page.getByRole('button', { name: 'Start demo', exact: true }).click();
      await page.getByRole('button', { name: 'Skip birth date entry', exact: true }).click();
      await page.getByRole('button', { name: 'Continue without providing birth date', exact: true }).click();
      await next();
      await next();
      await page.getByRole('button', { name: 'Start using SafeDose', exact: true }).click();
      await page.getByRole('button', { name: 'General User', exact: true }).click();
      await page.getByRole('button', { name: 'Continue to next step', exact: true }).click();
      await page.getByRole('button', { name: 'Medical/Prescribed', exact: true }).click();
      await page.getByRole('button', { name: 'Continue to next step', exact: true }).click();
      await page.getByRole('button', { name: 'For myself', exact: true }).click();
      await page.getByRole('button', { name: 'Complete setup', exact: true }).click();
      await expect(page.getByText('Manual', { exact: true })).toBeVisible();
      await expect(page.getByText('Sign in to get more scans', { exact: true })).toBeVisible();
      await screenshot('02-guest-start');
    });

    await test.step('One synthetic photo scan shows a result or friendly refusal', async () => {
      await page.getByText('Scan', { exact: true }).click();
      await page.getByRole('button', { name: 'Continue to scan', exact: true }).click();
      // No camera permission is granted in this fresh headless context.
      await expect(page.getByText('Take or Upload Photo', { exact: true })).toBeVisible();
      await screenshot('03-photo-upload');
      const chooserPromise = page.waitForEvent('filechooser');
      await page.getByText('Take or Upload Photo', { exact: true }).click();
      const chooser = await chooserPromise;
      const responsePromise = page.waitForResponse(response =>
        new URL(response.url()).pathname === '/api/analyze-scan', { timeout: 90_000 });
      await chooser.setFiles(path.join(__dirname, 'fixtures/synthetic-vial.png'));
      await screenshot('04-scan-processing');
      const response = await responsePromise;
      expect(response.status()).toBe(200);
      const refusal = page.getByRole('alert').filter({ hasText: /could not read|enter.*manually|manual entry/i });
      const result = page.getByText('Prescribed Dose', { exact: true });
      await expect(refusal.or(result)).toBeVisible({ timeout: 15_000 });
      await screenshot('05-scan-outcome');
      // Store only the user-facing outcome, never response bodies or session data.
      await fs.writeFile(testInfo.outputPath('scan-outcome.txt'),
        await (await refusal.isVisible() ? refusal : result).innerText());
      if (await refusal.isVisible()) {
        await page.getByText('Go Back', { exact: true }).click();
      } else {
        await page.goto('/new-dose');
      }
      await page.getByText('Manual', { exact: true }).click();
    });

    await test.step('Manual entry reaches the expected calculated dose', async () => {
      await page.getByPlaceholder('e.g., 100', { exact: true }).fill('0.5');
      await page.getByText('mg', { exact: true }).click();
      await screenshot('06-manual-dose');
      await next();
      await page.getByPlaceholder('Substance Name (Optional)', { exact: true }).fill('Synthetic E2E fixture');
      await page.getByLabel('Concentration', { exact: true }).click();
      await screenshot('07-manual-medication');
      await next();
      await page.getByPlaceholder('e.g., 10', { exact: true }).fill('2.5');
      await page.getByText('mg/ml', { exact: true }).click();
      await screenshot('08-manual-strength');
      await next();
      await page.getByPlaceholder('e.g., 50', { exact: true }).fill('5');
      await screenshot('09-manual-vial');
      await next();
      await page.getByText('Insulin Syringes', { exact: true }).click();
      await page.getByText('U-100', { exact: true }).click();
      await page.getByText('1 ml', { exact: true }).click();
      await screenshot('10-manual-syringe');
      await page.getByRole('button', { name: 'Calculate dose', exact: true }).click();
      await expect(page.getByText('Verify Your Information', { exact: true })).toBeVisible();
      await screenshot('11-manual-review');
      await page.getByRole('button', { name: 'Proceed to result', exact: true }).click();
      await expect(page.getByText('Draw to 20.00 units', { exact: true })).toBeVisible();
      await expect(page.getByText(/Calculated volume: 0\.2 ml/)).toBeVisible();
      await screenshot('12-calculated-dose');
    });

    await test.step('Pricing plans render without checkout', async () => {
      await page.goto('/pricing');
      await expect(page.getByText('Monthly', { exact: true })).toBeVisible();
      await expect(page.getByText('Yearly', { exact: true })).toBeVisible();
      await expect(page.getByText('$2.99', { exact: true })).toBeVisible();
      await expect(page.getByText('$26.99', { exact: true })).toBeVisible();
      await screenshot('13-pricing');
    });
    expect(analyzeAttempts).toBe(1);
    expect(blocked).toEqual([]);
  } finally {
    await fs.writeFile(testInfo.outputPath('api-requests.json'), JSON.stringify(requests, null, 2));
    await testInfo.attach('API request log', {
      path: testInfo.outputPath('api-requests.json'), contentType: 'application/json',
    });
  }
});
