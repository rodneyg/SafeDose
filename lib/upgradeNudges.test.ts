import AsyncStorage from '@react-native-async-storage/async-storage';
import { claimUpgradeNudge, photoUpgradeNudge, recordSuccessfulScan } from './upgradeNudges';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const free = { plan: 'free', limit: 3, scansUsed: 0, lastReset: null };
const active = () => true;

it('offers an upgrade after the first successful free scan and with one scan left', () => {
  expect(photoUpgradeNudge(free, true)).toBe('firstScan');
  expect(photoUpgradeNudge({ ...free, scansUsed: 1 }, false)).toBe('oneScanLeft');
});

it('skips returning scanners at a monthly reset, exhausted allowances, and paid plans', () => {
  expect(photoUpgradeNudge(free, false)).toBeNull();
  expect(photoUpgradeNudge({ ...free, scansUsed: 2 }, false)).toBeNull();
  expect(photoUpgradeNudge({ ...free, scansUsed: 3 }, false)).toBeNull();
  expect(photoUpgradeNudge({ ...free, limit: -1, plan: 'photo_check' }, true)).toBeNull();
  expect(photoUpgradeNudge({ ...free, plan: 'full-pro' }, true)).toBeNull();
});

it('claims each prompt once, even across concurrent attempts, and keeps accounts separate', async () => {
  const claims = await Promise.all([
    claimUpgradeNudge('first-account', 'firstLogs', active),
    claimUpgradeNudge('first-account', 'firstLogs', active),
  ]);
  expect(claims.filter(Boolean)).toHaveLength(1);
  await expect(claimUpgradeNudge('second-account', 'firstLogs', active)).resolves.toBe(true);
  await expect(claimUpgradeNudge('first-account', 'manualEntry', active)).resolves.toBe(true);
  await expect(claimUpgradeNudge('first-account', 'manualEntry', active)).resolves.toBe(false);
});

it('recognizes stored prompts and preserves an unseen prompt when its screen loses focus', async () => {
  await AsyncStorage.setItem('upgradeNudge:returning:firstLogs', 'true');
  await expect(claimUpgradeNudge('returning', 'firstLogs', active)).resolves.toBe(false);
  await expect(claimUpgradeNudge('blurred', 'firstLogs', () => false)).resolves.toBe(false);
  await expect(claimUpgradeNudge('blurred', 'firstLogs', active)).resolves.toBe(true);
});

it('suppresses the manual offer after a successful scan, including past sessions', async () => {
  await expect(recordSuccessfulScan('scanned')).resolves.toBe(true);
  await expect(recordSuccessfulScan('scanned')).resolves.toBe(false);
  await expect(claimUpgradeNudge('scanned', 'manualEntry', active)).resolves.toBe(false);

  await AsyncStorage.setItem('upgradeNudge:previously-scanned:hasScanned', 'true');
  await expect(claimUpgradeNudge('previously-scanned', 'manualEntry', active)).resolves.toBe(false);
});
