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
      # Firebase 11 expects AsyncStorage 1.x. AsyncStorage 3 also requires Kotlin 2.1.
      - dependency-name: "@react-native-async-storage/async-storage"
        update-types: ["version-update:semver-major"]
      # Keep the verified Reanimated 3.17 line until the Expo SDK is upgraded.
      - dependency-name: react-native-reanimated
        versions: [">= 3.18.0"]

  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
    open-pull-requests-limit: 3
`;

test('Dependabot checks npm and GitHub Actions weekly and skips incompatible Expo and Firebase dependency updates', async () => {
  const config = await readFile(new URL('../.github/dependabot.yml', import.meta.url), 'utf8');

  assert.equal(config, expectedConfig);
});
