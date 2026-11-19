import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { getDoc } from 'firebase/firestore';
import { useUsageTracking } from './useUsageTracking';

jest.mock('react-native-css-interop/jsx-runtime', () => jest.requireActual('react/jsx-runtime'));
let mockUser: any;
jest.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock('firebase/firestore', () => ({ getFirestore: () => ({}), doc: jest.fn(), getDoc: jest.fn(), setDoc: jest.fn(), updateDoc: jest.fn(), increment: jest.fn() }));
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
