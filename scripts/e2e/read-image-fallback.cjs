/* eslint-env node, browser */
// Run with Playwright available on NODE_PATH. No photo fixtures are stored.
// BASE_URL defaults to the local Expo server. EXPECT_FALLBACK=0 records baseline.
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const baseURL = process.env.BASE_URL || 'http://localhost:8087';
const expectFallback = process.env.EXPECT_FALLBACK !== '0';

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const mimeType of (process.env.MIME ? [process.env.MIME] : ['image/jpeg', 'image/png'])) {
      for (const failRead of (process.env.MODE === 'real' ? [false] : process.env.MODE === 'failure' ? [true] : [false, true])) {
        const context = await browser.newContext();
        const page = await context.newPage();
        let scanRequests = 0;
        page.on('request', request => { if (request.url().includes('/api/analyze-scan')) scanRequests++; });
        await page.addInitScript(({ failRead }) => {
          localStorage.setItem('onboardingComplete', 'true');
          localStorage.setItem('userProfile', JSON.stringify({ isLicensedProfessional: false }));
          if (failRead) {
            const originalRead = FileReader.prototype.readAsDataURL;
            FileReader.prototype.readAsDataURL = function (file) {
              if (!/^cup\.(jpg|png)$/.test(file.name || '')) return originalRead.call(this, file);
              queueMicrotask(() => this.dispatchEvent(new ProgressEvent('error')));
            };
          }
        }, { failRead });
        page.on('dialog', dialog => dialog.dismiss());
        await page.goto(`${baseURL}/new-dose`);
        // Anonymous guest initialization must finish before usage checks run.
        await page.waitForTimeout(8000);
        await page.getByText('Scan', { exact: true }).dispatchEvent('click');
        await page.getByText('Continue to Scan', { exact: true }).dispatchEvent('click');
        // Generate a non-medical still life, then encode through the real browser.
        const data = await page.evaluate(mime => {
          const canvas = document.createElement('canvas');
          canvas.width = 640; canvas.height = 480;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#c6b49b'; ctx.fillRect(0, 0, 640, 480);
          ctx.fillStyle = '#e8dec9'; ctx.fillRect(55, 280, 270, 120);
          ctx.fillStyle = '#296a96'; ctx.fillRect(340, 170, 140, 180);
          ctx.strokeStyle = '#296a96'; ctx.lineWidth = 20;
          ctx.beginPath(); ctx.ellipse(490, 250, 40, 55, 0, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = '#402818'; ctx.beginPath(); ctx.ellipse(410, 170, 70, 18, 0, 0, Math.PI * 2); ctx.fill();
          return canvas.toDataURL(mime).split(',')[1];
        }, mimeType);
        await page.getByText('Take or Upload Photo', { exact: true }).dispatchEvent('click');
        await page.locator('input[type=file]').setInputFiles({ name: mimeType === 'image/jpeg' ? 'cup.jpg' : 'cup.png', mimeType, buffer: Buffer.from(data, 'base64') }).catch(async error => { console.log((await page.locator('body').innerText()).slice(0,1800)); throw error; });
        await page.waitForFunction(() => !document.body.innerText.includes('Processing...'), null, { timeout: 60000 });
        // Allow React to commit the completed capture state.
        await page.waitForTimeout(1000);
        const text = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
        const fallback = text.includes('Photo scan is unavailable right now. Enter the values by hand.');
        const readError = text.includes('Failed to read image');
        const manual = text.includes('Dose Amount:');
        const result = { baseURL, mimeType, failRead, scanRequests, readError, fallback, manual };
        console.log(JSON.stringify(result));
        if (failRead) {
          assert.equal(scanRequests, 0);
          if (expectFallback) {
            assert.equal(fallback, true, 'read failure must show the shared plain message');
            assert.equal(manual, true, 'read failure must open manual entry');
          } else assert.equal(readError, true);
        } else {
          assert.equal(readError, false, 'ordinary image should read successfully');
          assert.equal(scanRequests, 1, 'ordinary image should reach scan analysis');
        }
        await context.close();
      }
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
