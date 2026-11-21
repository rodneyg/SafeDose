import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const expectedConfig = `version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
    open-pull-requests-limit: 3

  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
    open-pull-requests-limit: 3
`;

test('Dependabot checks npm and GitHub Actions weekly with a PR limit of three', async () => {
  const config = await readFile(new URL('../.github/dependabot.yml', import.meta.url), 'utf8');

  assert.equal(config, expectedConfig);
});
