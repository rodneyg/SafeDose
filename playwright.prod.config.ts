import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'prod-scan-flow.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  // Keep each run's evidence; never overwrite a previous run's artifacts.
  outputDir: `.prod-e2e-results/${Date.now()}`,
  reporter: 'list',
  use: {
    browserName: 'chromium',
    headless: true,
    baseURL: 'https://safedose.rodneygainous.com',
    viewport: { width: 1280, height: 900 },
    serviceWorkers: 'block',
    trace: 'off',
    video: 'off',
  },
});
