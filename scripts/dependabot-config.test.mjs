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
    # Expo SDK 52 requires React 18. Upgrade these together with Expo.
    ignore:
      - dependency-name: react
        update-types: ["version-update:semver-major"]
      - dependency-name: "@types/react"
        update-types: ["version-update:semver-major"]

  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
    open-pull-requests-limit: 3
`;

test('Dependabot checks npm and GitHub Actions weekly and skips React and React types major bumps', async () => {
  const config = await readFile(new URL('../.github/dependabot.yml', import.meta.url), 'utf8');

  assert.equal(config, expectedConfig);
});
