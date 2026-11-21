const fs = require('node:fs');
const path = require('node:path');
const {
  FREE_SCAN_LIMIT,
  PHOTO_CHECK_MONTHLY_AMOUNT,
  PHOTO_CHECK_ANNUAL_AMOUNT,
  UNLIMITED_SCANS,
  getLimitForPlan,
} = require('../lib/plans');
const { SCAN_PROMPT } = require('../lib/scan/request');

const report = fs.readFileSync(path.join(__dirname, 'SAFE_DOSE_REPORT.md'), 'utf8');

test('the code report stays aligned with scan and plan rules', () => {
  expect(report).toContain('## Computer vision pipeline');
  expect(report).toContain('## Guardrails present in the repository');
  expect(report).toContain('## Product and medical boundaries');
  expect(report).toContain('## Existing prices and revenue boundary');
  const freeLimit = FREE_SCAN_LIMIT === 3 ? 'three' : FREE_SCAN_LIMIT;
  expect(report).toContain(`receive ${freeLimit} photo scans per month`);
  expect(report).toContain('unlimited scan limit');
  expect(getLimitForPlan('photo_check', false)).toBe(UNLIMITED_SCANS);
  expect(SCAN_PROMPT).toContain('Never calculate a treatment dose.');
  expect(report).toContain(`$${PHOTO_CHECK_MONTHLY_AMOUNT} per month`);
  expect(report).toContain(`$${PHOTO_CHECK_ANNUAL_AMOUNT} per year`);
  expect(report).toContain('this report does not calculate or estimate revenue');
});

test('the product overview links to the planner and dose logging', () => {
  expect(report).toContain('## What the app does');
  expect(report).toContain('[reconstitution planner](../app/reconstitution.tsx)');
  expect(report).toContain('[dose logging with local storage](../lib/hooks/useDoseLogging.ts)');
  expect(fs.existsSync(path.resolve(__dirname, '../app/reconstitution.tsx'))).toBe(true);
  expect(fs.existsSync(path.resolve(__dirname, '../lib/hooks/useDoseLogging.ts'))).toBe(true);
});
