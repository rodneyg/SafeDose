# SafeDose issue #240 native build investigation

Issue: https://github.com/rodneyg/SafeDose/issues/240

Not reproducible: On 2026-11-22, the current `work` branch (`29f2cec`) passed TypeScript checking and produced iOS and Android Expo bundles.

## Steps

1. Ran `npx expo prebuild --no-install`. Expo could not download `expo-template-bare-minimum@sdk-52` because this environment's npm registry policy returned HTTP 403. The command did not expose a product build failure.
2. Ran `npx tsc --noEmit`. It passed.
3. Ran `npx expo export --platform ios --platform android --max-workers 2 --output-dir /tmp/safedose-native-export`. Both native bundles exported successfully.
4. Ran the two native development-bundle checks used by `.github/workflows/ci.yml` with `EXPO_OFFLINE=1`. Both passed:
   - `npx expo export --platform ios --dev --max-workers 2 --output-dir /tmp/safedose-ios`
   - `npx expo export --platform android --dev --max-workers 2 --output-dir /tmp/safedose-android`

No product code change is justified because the available native and typecheck checks pass. The prebuild template download must be retried in an environment that permits access to the npm package registry if generated native directories need to be recreated.
