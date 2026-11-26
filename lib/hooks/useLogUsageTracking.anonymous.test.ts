import { act, renderHook, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDoc, updateDoc } from 'firebase/firestore';
import { addDocWithEnv } from '../firestoreWithEnv';
import { useDoseLogging } from './useDoseLogging';

const mockUser = { uid: 'test-user', isAnonymous: true };

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
  increment: (amount: number) => amount,
}));
jest.mock('expo-network', () => ({
  getNetworkStateAsync: async () => ({ isConnected: true }),
}));
jest.mock('../firestoreWithEnv', () => ({ addDocWithEnv: jest.fn() }));

afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

it.each([
  ['a guest', true, 'free'],
  ['a Photo Scan subscriber', false, 'photo_check'],
])('saves dose 11 and refuses dose 12 in the same month for %s', async (_label, isAnonymous, plan) => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  mockUser.isAnonymous = isAnonymous;
  const lastLogReset = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  let logsUsed = 10;
  jest.mocked(getDoc).mockImplementation(async () => ({
    exists: () => true,
    data: () => ({ logsUsed, plan, lastLogReset }),
  }) as Awaited<ReturnType<typeof getDoc>>);
  jest.mocked(updateDoc).mockImplementation(async () => {
    logsUsed += 1;
  });
  jest.mocked(addDocWithEnv).mockResolvedValue({ id: 'test-log' } as Awaited<ReturnType<typeof addDocWithEnv>>);

  const storage = new Map<string, string>();
  jest.mocked(AsyncStorage.getItem).mockImplementation(async key => storage.get(key) ?? null);
  jest.mocked(AsyncStorage.setItem).mockImplementation(async (key, value) => {
    storage.set(key, value);
  });

  const { result } = renderHook(() => useDoseLogging());
  await waitFor(() => expect(JSON.parse(storage.get('log_usage_test-user') ?? '{}').logsUsed).toBe(10));

  const dose = { doseValue: 1, unit: 'mg', calculatedVolume: 0.2, substanceName: 'Test medication' };
  await act(async () => {
    await expect(result.current.logDose(dose)).resolves.toEqual({ success: true, localDoseCount: 1 });
  });
  const saved = storage.get('dose_logs_test-user');
  expect(JSON.parse(saved ?? '[]')).toEqual([expect.objectContaining(dose)]);
  expect(logsUsed).toBe(11);

  await act(async () => {
    await expect(result.current.logDose(dose)).resolves.toEqual({ success: false, limitReached: true });
  });
  expect(storage.get('dose_logs_test-user')).toBe(saved);
  expect(updateDoc).toHaveBeenCalledTimes(1);
  expect(addDocWithEnv).toHaveBeenCalledTimes(isAnonymous ? 0 : 1);
});
