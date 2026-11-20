const fs = require('node:fs');
const path = require('node:path');
const { FREE_SCAN_LIMIT, UNLIMITED_SCANS, getLimitForPlan } = require('../lib/plans');
const { SCAN_PROMPT } = require('../lib/scan/request');

const report = fs.readFileSync(path.join(__dirname, 'SAFE_DOSE_REPORT.md'), 'utf8');

test('the code report stays aligned with scan and plan rules', () => {
  expect(report).toContain('## CV scan pipeline');
  expect(report).toContain('## Dose guardrails');
  expect(report).toContain('## What the app does not do');
  expect(report).toContain('## Plan gates');
  expect(report).toContain(`${FREE_SCAN_LIMIT === 3 ? 'three' : FREE_SCAN_LIMIT} photo scans per calendar month`);
  expect(getLimitForPlan('photo_check', false)).toBe(UNLIMITED_SCANS);
  expect(SCAN_PROMPT).toContain('Never calculate a treatment dose.');
  expect(report).not.toMatch(/revenue|\$\d/i);
});
