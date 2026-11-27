import { act, renderHook, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDoc } from 'firebase/firestore';
import { useLogUsageTracking } from './useLogUsageTracking';

let currentUser: { uid: string; isAnonymous: boolean } | null = null;

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: currentUser }),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(), setItem: jest.fn() }));
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})), doc: jest.fn(() => ({})), getDoc: jest.fn(),
  setDoc: jest.fn(), updateDoc: jest.fn(), increment: jest.fn(),
}));
jest.mock('expo-network', () => ({ getNetworkStateAsync: jest.fn(async () => ({ isConnected: true })) }));

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
};

afterEach(() => {
  jest.clearAllMocks();
  currentUser = null;
});

it('ignores a previous account cache read that resolves after the new account', async () => {
  const oldCache = deferred<string | null>();
  const newCache = deferred<string | null>();
  jest.mocked(AsyncStorage.getItem).mockImplementation(key =>
    key === 'log_usage_old' ? oldCache.promise : newCache.promise,
  );
  jest.mocked(getDoc).mockImplementation(async () => ({
    exists: () => true,
    data: () => ({ logsUsed: 4, plan: 'pro', lastLogReset: new Date().toISOString() }),
  }) as Awaited<ReturnType<typeof getDoc>>);

  currentUser = { uid: 'old', isAnonymous: false };
  const { result, rerender } = renderHook(() => useLogUsageTracking());
  currentUser = { uid: 'new', isAnonymous: false };
  rerender();

  await act(async () => { newCache.resolve(JSON.stringify({ logsUsed: 12, plan: 'free', limit: 10 })); });
  await waitFor(() => expect(result.current.logUsageData).toMatchObject({ logsUsed: 4, plan: 'pro', limit: -1 }));
  await act(async () => { oldCache.resolve(JSON.stringify({ logsUsed: 99, plan: 'free', limit: 10 })); });

  expect(result.current.logUsageData).toMatchObject({ logsUsed: 4, plan: 'pro', limit: -1 });
});

it('ignores a previous account Firestore read that resolves after the new account', async () => {
  const oldRead = deferred<Awaited<ReturnType<typeof getDoc>>>();
  const newRead = deferred<Awaited<ReturnType<typeof getDoc>>>();
  jest.mocked(AsyncStorage.getItem).mockResolvedValue(null);
  jest.mocked(getDoc).mockImplementationOnce(() => oldRead.promise).mockImplementationOnce(() => newRead.promise);

  currentUser = { uid: 'old', isAnonymous: false };
  const { result, rerender } = renderHook(() => useLogUsageTracking());
  currentUser = { uid: 'new', isAnonymous: false };
  rerender();

  await act(async () => {
    newRead.resolve({ exists: () => true, data: () => ({ logsUsed: 4, plan: 'pro', lastLogReset: new Date().toISOString() }) } as Awaited<ReturnType<typeof getDoc>>);
  });
  await waitFor(() => expect(result.current.logUsageData).toMatchObject({ logsUsed: 4, plan: 'pro', limit: -1 }));
  await act(async () => {
    oldRead.resolve({ exists: () => true, data: () => ({ logsUsed: 99, plan: 'free', lastLogReset: new Date().toISOString() }) } as Awaited<ReturnType<typeof getDoc>>);
  });

  expect(result.current.logUsageData).toMatchObject({ logsUsed: 4, plan: 'pro', limit: -1 });
  expect(AsyncStorage.setItem).toHaveBeenCalledWith('log_usage_new', expect.stringContaining('"plan":"pro"'));
  expect(AsyncStorage.setItem).not.toHaveBeenCalledWith('log_usage_old', expect.any(String));
});
