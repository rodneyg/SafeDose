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
      # Firebase 12.7 and later require newer AsyncStorage than Expo SDK 52 ships.
      - dependency-name: firebase
        versions: [">= 12.7.0"]
      # Expo SDK 52 uses AsyncStorage 1.x. AsyncStorage 3 also requires Kotlin 2.1.
      - dependency-name: "@react-native-async-storage/async-storage"
        update-types: ["version-update:semver-major"]
      # Keep Expo and its SDK packages on their SDK 52 compatibility lines.
      - dependency-name: expo
        versions: [">= 53.0.0"]
      - dependency-name: expo-blur
        versions: [">= 15.0.0"]
      - dependency-name: expo-camera
        versions: [">= 17.0.0"]
      - dependency-name: expo-constants
        versions: [">= 18.0.0"]
      - dependency-name: expo-dev-client
        versions: [">= 6.0.0"]
      - dependency-name: expo-font
        versions: [">= 14.0.0"]
      - dependency-name: expo-haptics
        versions: [">= 15.0.0"]
      - dependency-name: expo-image-manipulator
        versions: [">= 14.0.0"]
      - dependency-name: expo-linear-gradient
        versions: [">= 15.0.0"]
      - dependency-name: expo-linking
        versions: [">= 8.0.0"]
      - dependency-name: expo-network
        versions: [">= 8.0.0"]
      - dependency-name: expo-router
        versions: [">= 5.0.0"]
      - dependency-name: expo-splash-screen
        versions: [">= 0.30.0"]
      - dependency-name: expo-status-bar
        versions: [">= 3.0.0"]
      - dependency-name: expo-symbols
        versions: [">= 0.3.0"]
      - dependency-name: expo-system-ui
        versions: [">= 5.0.0"]
      - dependency-name: expo-web-browser
        versions: [">= 15.0.0"]
      # The Fabric build on React Native 0.76 supports react-native-screens through 4.4.x.
      - dependency-name: react-native-screens
        versions: [">= 4.5.0"]
      # Keep the verified Reanimated 3.17 line until the Expo SDK is upgraded.
      - dependency-name: react-native-reanimated
        versions: [">= 3.18.0"]
      # Lucide 1.x fails the web bundle scan and the Expo Jest suite.
      - dependency-name: lucide-react-native
        versions: [">= 1.0.0"]

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
