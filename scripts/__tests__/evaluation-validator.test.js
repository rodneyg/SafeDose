const { spawnSync } = require('node:child_process');
const { resolve } = require('node:path');

it('runs the standalone evaluator and reports unsupported cases separately', () => {
  const script = resolve(__dirname, '../validate-evals.js');
  const result = spawnSync(process.execPath, [script], { encoding: 'utf8' });

  if (result.error) throw result.error;
  expect({ status: result.status, stderr: result.stderr }).toEqual({ status: 0, stderr: '' });
  expect(result.stdout).toContain('Passed: 7');
  expect(result.stdout).toContain('Failed: 0');
  expect(result.stdout).toContain('Skipped: 5');
});
