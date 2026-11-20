import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDoc } from 'firebase/firestore';
import { useUsageTracking } from './useUsageTracking';
import { getSubscriptionStatus } from '../subscriptionStatus';

jest.mock('react-native-css-interop/jsx-runtime', () => jest.requireActual('react/jsx-runtime'));
let mockUser: any;
jest.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));
const mockDb = {};
jest.mock('firebase/firestore', () => ({ getFirestore: () => mockDb, doc: jest.fn(), getDoc: jest.fn(), setDoc: jest.fn(), updateDoc: jest.fn(), increment: jest.fn() }));
jest.mock('../firestoreWithEnv', () => ({ setDocWithEnv: jest.fn() }));
jest.mock('../analytics', () => ({ setAnalyticsUserProperties: jest.fn(), USER_PROPERTIES: {} }));
jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(async () => null), setItem: jest.fn(async () => {}) }));
jest.mock('expo-network', () => ({ getNetworkStateAsync: jest.fn(async () => ({ isConnected: true })) }));
jest.mock('../subscriptionStatus', () => ({ getSubscriptionStatus: jest.fn() }));
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
])('gates a webhook plan of %s for anonymous=%s at %s scans', async (plan, isAnonymous, scansUsed, allowed) => {
  mockUser = { uid: 'member', isAnonymous };
  const lastReset = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  (getDoc as jest.Mock).mockResolvedValue({ metadata: { fromCache: false }, data: () => ({ plan: 'plus', scansUsed, lastReset }) });
  (getSubscriptionStatus as jest.Mock).mockResolvedValue({ plan, hasActiveSubscription: plan !== 'free' });
  await act(async () => { tree = create(<Probe />); });
  const onVerifiedUsage = jest.fn();
  let result;
  await act(async () => { result = await usage.checkUsageLimit(onVerifiedUsage); });
  expect(result).toBe(allowed);
  expect(usage.usageData.plan).toBe(isAnonymous ? 'free' : plan);
  expect(usage.usageData.scansUsed).toBe(scansUsed);
  expect(usage.hasVerifiedUsage).toBe(true);
  expect(onVerifiedUsage).toHaveBeenCalledWith(usage.usageData);
  if (isAnonymous) expect(getSubscriptionStatus).not.toHaveBeenCalled();
});
it('falls back to the free limit when the billing status is unavailable', async () => {
  const lastReset = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  (getDoc as jest.Mock).mockResolvedValue({ metadata: { fromCache: false }, data: () => ({ plan: 'plus', scansUsed: 3, lastReset }) });
  (getSubscriptionStatus as jest.Mock).mockRejectedValue(new Error('Unavailable'));
  await act(async () => { tree = create(<Probe />); });
  const onVerifiedUsage = jest.fn();
  await act(async () => { await expect(usage.checkUsageLimit(onVerifiedUsage)).resolves.toBe(false); });
  expect(usage.usageData.plan).toBe('free');
  expect(usage.hasVerifiedUsage).toBe(false);
  expect(onVerifiedUsage).not.toHaveBeenCalled();
});
it('does not verify cached scan counts or trust legacy cached plans', async () => {
  const lastReset = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  (getDoc as jest.Mock).mockResolvedValue({
    metadata: { fromCache: true },
    data: () => ({ scansUsed: 0, lastReset }),
  });
  const cachedUsage = JSON.stringify({ scansUsed: 3, lastReset, plan: 'plus' });
  (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(cachedUsage).mockResolvedValueOnce(cachedUsage);
  (getSubscriptionStatus as jest.Mock).mockResolvedValue({ plan: 'free', hasActiveSubscription: false });
  await act(async () => { tree = create(<Probe />); });
  const onVerifiedUsage = jest.fn();
  await act(async () => { await expect(usage.checkUsageLimit(onVerifiedUsage)).resolves.toBe(false); });
  expect(usage.usageData).toEqual({ scansUsed: 3, lastReset, plan: 'free', limit: 3 });
  expect(usage.hasVerifiedUsage).toBe(false);
  expect(onVerifiedUsage).not.toHaveBeenCalled();
});

it('denies a user without a UID without fetching usage', async () => {
  mockUser = null;
  await act(async () => { tree = create(<Probe />); });
  await expect(usage.checkUsageLimit()).resolves.toBe(false);
  expect(getDoc).not.toHaveBeenCalled();
});
