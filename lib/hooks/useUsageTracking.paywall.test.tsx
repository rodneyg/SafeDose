import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { getDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setDocWithEnv } from '../firestoreWithEnv';
import { useUsageTracking } from './useUsageTracking';

jest.mock('react-native-css-interop/jsx-runtime', () => jest.requireActual('react/jsx-runtime'));
let mockUser: any;
jest.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock('firebase/firestore', () => ({ getFirestore: () => ({}), doc: jest.fn(() => ({ path: 'users/member' })), getDoc: jest.fn(), setDoc: jest.fn(), updateDoc: jest.fn(), increment: jest.fn() }));
jest.mock('../firestoreWithEnv', () => ({ setDocWithEnv: jest.fn() }));
jest.mock('../analytics', () => ({ setAnalyticsUserProperties: jest.fn(), USER_PROPERTIES: {} }));
jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(async () => null), setItem: jest.fn(async () => {}) }));
jest.mock('expo-network', () => ({ getNetworkStateAsync: jest.fn(async () => ({ isConnected: true })) }));
let usage: ReturnType<typeof useUsageTracking>;
let tree: ReactTestRenderer;
function Probe() { usage = useUsageTracking(); return null; }
beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  mockUser = { uid: 'member', isAnonymous: false };
});
afterEach(() => { act(() => tree?.unmount()); jest.restoreAllMocks(); });

it.each([
  ['free', false, 2, true], ['free', false, 3, false], ['free', false, 4, false],
  ['photo_check', false, 300, true], ['full-pro', false, 300, true],
  ['photo_check', true, 3, false],
])('gates plan=%s anonymous=%s scans=%s with access=%s', async (plan, isAnonymous, scansUsed, allowed) => {
  mockUser = { uid: 'member', isAnonymous };
  const lastReset = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  (getDoc as jest.Mock).mockResolvedValue({ exists: () => true, data: () => ({ plan, scansUsed, lastReset }) });
  await act(async () => { tree = create(<Probe />); });
  let result;
  await act(async () => { result = await usage.checkUsageLimit(); });
  expect(result).toBe(allowed);
  expect(usage.usageData.plan).toBe(plan);
  expect(usage.usageData.scansUsed).toBe(scansUsed);
});
it('denies a user without a UID without fetching usage', async () => {
  mockUser = null;
  await act(async () => { tree = create(<Probe />); });
  await expect(usage.checkUsageLimit()).resolves.toBe(false);
  expect(getDoc).not.toHaveBeenCalled();
});

it('refreshes a free user to the existing photo_check paid plan before allowing an upgrade scan', async () => {
  const lastReset = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  (getDoc as jest.Mock)
    .mockResolvedValueOnce({ exists: () => true, data: () => ({ plan: 'free', scansUsed: 3, lastReset }) })
    .mockResolvedValueOnce({ exists: () => true, data: () => ({ plan: 'photo_check', scansUsed: 3, lastReset }) });

  await act(async () => { tree = create(<Probe />); });
  expect(usage.usageData).toMatchObject({ plan: 'free', scansUsed: 3, limit: 3 });

  const onVerifiedUsage = jest.fn();
  await act(async () => {
    await expect(usage.checkUsageLimit(onVerifiedUsage)).resolves.toBe(true);
  });

  expect(usage.usageData).toMatchObject({ plan: 'photo_check', scansUsed: 3, limit: -1 });
  expect(onVerifiedUsage).toHaveBeenCalledWith(expect.objectContaining({ plan: 'photo_check', limit: -1 }));
});

it('creates free plan state when the user document is empty', async () => {
  (getDoc as jest.Mock).mockResolvedValue({ exists: () => false });

  await act(async () => { tree = create(<Probe />); });

  expect(usage.usageData).toMatchObject({ plan: 'free', scansUsed: 0, limit: 3 });
  expect(setDocWithEnv).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
    plan: 'free',
    scansUsed: 0,
  }));
});

it('recovers with server plan state when cached storage errors', async () => {
  const lastReset = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('storage unavailable'));
  (getDoc as jest.Mock).mockResolvedValue({
    exists: () => true,
    data: () => ({ plan: 'free', scansUsed: 1, lastReset }),
  });
  const error = jest.spyOn(console, 'error').mockImplementation(() => {});

  await act(async () => { tree = create(<Probe />); });

  expect(usage.usageData).toMatchObject({ scansUsed: 1, plan: 'free', limit: 3, lastReset });
  expect(error).toHaveBeenCalledWith('Error loading cached usage:', expect.any(Error));
});
