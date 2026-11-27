import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDoc, updateDoc } from 'firebase/firestore';
import { setDocWithEnv } from '../firestoreWithEnv';
import { useUsageTracking } from './useUsageTracking';
import { getSubscriptionStatus } from '../subscriptionStatus';

jest.mock('react-native-css-interop/jsx-runtime', () => jest.requireActual('react/jsx-runtime'));
let mockUser: any;
const mockAuth = { currentUser: null as any };
jest.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: mockUser, auth: mockAuth }) }));
const mockDb = {};
jest.mock('firebase/firestore', () => ({ getFirestore: () => mockDb, doc: jest.fn(() => ({ path: 'users/member' })), getDoc: jest.fn(), setDoc: jest.fn(), updateDoc: jest.fn(), increment: jest.fn() }));
jest.mock('../firestoreWithEnv', () => ({ setDocWithEnv: jest.fn() }));
jest.mock('../analytics', () => ({ setAnalyticsUserProperties: jest.fn(), USER_PROPERTIES: {} }));
jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(async () => null), setItem: jest.fn(async () => {}) }));
jest.mock('expo-network', () => ({ getNetworkStateAsync: jest.fn(async () => ({ isConnected: true })) }));
jest.mock('../subscriptionStatus', () => ({ getSubscriptionStatus: jest.fn() }));
let usage: ReturnType<typeof useUsageTracking>;
let tree: ReactTestRenderer;
let retainedIncrement: () => Promise<void>;
function Probe() { usage = useUsageTracking(); retainedIncrement ??= usage.incrementScansUsed; return null; }
beforeEach(() => {
  jest.clearAllMocks();
  retainedIncrement = undefined as any;
  jest.spyOn(console, 'log').mockImplementation(() => {});
  mockUser = { uid: 'member', isAnonymous: false };
  mockAuth.currentUser = mockUser;
  (getSubscriptionStatus as jest.Mock).mockReset().mockResolvedValue({ plan: 'free', hasActiveSubscription: false });
});
afterEach(() => { act(() => tree?.unmount()); jest.restoreAllMocks(); });

it.each([
  ['free', false, 2, true], ['free', false, 3, false], ['free', false, 4, false],
  ['photo_check', false, 300, true], ['full-pro', false, 300, true],
  ['free', true, 2, true], ['free', true, 3, false], ['photo_check', true, 3, false],
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

it('refreshes a free user to the existing photo_check paid plan before allowing an upgrade scan', async () => {
  const lastReset = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  (getDoc as jest.Mock)
    .mockResolvedValue({ metadata: { fromCache: false }, data: () => ({ plan: 'free', scansUsed: 3, lastReset }) });
  (getSubscriptionStatus as jest.Mock)
    .mockResolvedValueOnce({ plan: 'free', hasActiveSubscription: false })
    .mockResolvedValueOnce({ plan: 'photo_check', hasActiveSubscription: true });

  await act(async () => { tree = create(<Probe />); });
  expect(usage.usageData).toMatchObject({ plan: 'free', scansUsed: 3, limit: 3 });

  const onVerifiedUsage = jest.fn();
  await act(async () => {
    await expect(usage.checkUsageLimit(onVerifiedUsage)).resolves.toBe(true);
  });

  expect(usage.usageData).toMatchObject({ plan: 'photo_check', scansUsed: 3, limit: -1 });
  expect(onVerifiedUsage).toHaveBeenCalledWith(expect.objectContaining({ plan: 'photo_check', limit: -1 }));
});

it('increments from the refreshed preflight count through the retained callback', async () => {
  const lastReset = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  (getDoc as jest.Mock).mockResolvedValue({ metadata: { fromCache: false }, data: () => ({ scansUsed: 2, lastReset }) });
  await act(async () => { tree = create(<Probe />); });
  const increment = retainedIncrement;

  await act(async () => { await usage.checkUsageLimit(); });
  expect(usage.usageData.scansUsed).toBe(2);
  await act(async () => { await increment(); });

  expect(usage.usageData.scansUsed).toBe(3);
  expect(AsyncStorage.setItem).toHaveBeenLastCalledWith(`usage_member`, JSON.stringify({ scansUsed: 3, lastReset }));
  expect(updateDoc).toHaveBeenCalledTimes(1);
});

it('does not write usage after the active account changes', async () => {
  await act(async () => { tree = create(<Probe />); });
  const increment = retainedIncrement;
  mockAuth.currentUser = { uid: 'different-account' };

  await act(async () => { await increment(); });

  expect(updateDoc).not.toHaveBeenCalled();
  expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
});

it('creates free plan state when the user document is empty', async () => {
  (getDoc as jest.Mock).mockResolvedValue({ metadata: { fromCache: false }, data: () => undefined });

  await act(async () => { tree = create(<Probe />); });

  expect(usage.usageData).toMatchObject({ plan: 'free', scansUsed: 0, limit: 3 });
  expect(setDocWithEnv).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
    scansUsed: 0,
  }), { merge: true });
});

it('recovers with server scan counts after cached storage errors', async () => {
  const lastReset = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('storage unavailable'));
  (getDoc as jest.Mock).mockResolvedValue({
    metadata: { fromCache: false },
    data: () => ({ plan: 'free', scansUsed: 1, lastReset }),
  }).mockResolvedValueOnce({ metadata: { fromCache: true } });
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

  await act(async () => { tree = create(<Probe />); });
  await act(async () => { await usage.checkUsageLimit(); });

  expect(usage.usageData).toMatchObject({ scansUsed: 1, plan: 'free', limit: 3, lastReset });
  expect(warn).toHaveBeenCalledWith('Could not read cached scan usage.');
});
