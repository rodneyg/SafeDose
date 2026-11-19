import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'synthetic-vial.spec.ts',
  workers: 1,
  retries: 0,
  outputDir: `.prod-e2e-results/offline-${Date.now()}`,
  reporter: 'list',
  use: {
    browserName: 'chromium',
    headless: true,
    serviceWorkers: 'block',
    trace: 'off',
    video: 'off',
  },
});
