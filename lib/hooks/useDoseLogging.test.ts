import { act, renderHook } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDoseLogging } from './useDoseLogging';
import { addDocWithEnv } from '../firestoreWithEnv';
import { useLogUsageTracking } from './useLogUsageTracking';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  collection: jest.fn(() => ({})),
  doc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  getDocs: jest.fn(),
}));

jest.mock('../firestoreWithEnv', () => ({ addDocWithEnv: jest.fn() }));

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'test-user-123', isAnonymous: false } }),
}));

jest.mock('./useLogUsageTracking', () => ({ useLogUsageTracking: jest.fn() }));

const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockAddDocWithEnv = addDocWithEnv as jest.MockedFunction<typeof addDocWithEnv>;
const mockUseLogUsageTracking = useLogUsageTracking as jest.MockedFunction<typeof useLogUsageTracking>;
const doseInfo = {
  substanceName: 'Test Medication',
  doseValue: 10,
  unit: 'mg',
  calculatedVolume: 0.5,
};

const queuedLog = (id: string) => ({
  id,
  substanceName: 'Queued Medication',
  doseValue: 5,
  unit: 'mg',
  calculatedVolume: 0.25,
  timestamp: '2026-11-20T12:00:00.000Z',
});

describe('useDoseLogging', () => {
  const checkLogUsageLimit = jest.fn();
  const incrementLogsUsed = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    storage.getItem.mockResolvedValue(null);
    storage.setItem.mockResolvedValue();
    mockAddDocWithEnv.mockResolvedValue({ id: 'firestore-id' } as never);
    checkLogUsageLimit.mockResolvedValue(true);
    incrementLogsUsed.mockResolvedValue(undefined);
    mockUseLogUsageTracking.mockReturnValue({
      logUsageData: null,
      checkLogUsageLimit,
      incrementLogsUsed,
    } as unknown as ReturnType<typeof useLogUsageTracking>);
  });

  afterEach(() => jest.restoreAllMocks());

  it('logs a dose to storage and records its usage', async () => {
    const { result } = renderHook(() => useDoseLogging());

    let response: Awaited<ReturnType<typeof result.current.logDose>>;
    await act(async () => {
      response = await result.current.logDose(doseInfo, 'after breakfast');
    });

    expect(response!).toEqual({ success: true, localDoseCount: 1 });
    expect(storage.setItem).toHaveBeenCalledWith(
      'dose_logs_test-user-123',
      expect.stringContaining('"substanceName":"Test Medication"')
    );
    expect(mockAddDocWithEnv).toHaveBeenCalledTimes(1);
    expect(incrementLogsUsed).toHaveBeenCalledTimes(1);
  });

  it('continues without throwing when local storage fails', async () => {
    storage.setItem.mockRejectedValueOnce(new Error('storage unavailable'));
    const { result } = renderHook(() => useDoseLogging());

    let response: Awaited<ReturnType<typeof result.current.logDose>>;
    await act(async () => {
      response = await result.current.logDose(doseInfo);
    });

    expect(response!).toEqual({ success: true, localDoseCount: undefined });
    expect(console.error).toHaveBeenCalledWith(
      '[useDoseLogging] Error saving dose log locally:',
      expect.any(Error)
    );
    expect(incrementLogsUsed).toHaveBeenCalledTimes(1);
  });

  it('does not double log while a dose is already being logged', async () => {
    let allowFirstLog!: (allowed: boolean) => void;
    checkLogUsageLimit.mockReturnValueOnce(
      new Promise<boolean>(resolve => { allowFirstLog = resolve; })
    );
    const { result } = renderHook(() => useDoseLogging());

    let firstLog!: ReturnType<typeof result.current.logDose>;
    let secondResponse!: Awaited<ReturnType<typeof result.current.logDose>>;
    await act(async () => {
      firstLog = result.current.logDose(doseInfo);
      secondResponse = await result.current.logDose(doseInfo);
    });
    expect(secondResponse).toEqual({ success: false });

    await act(async () => {
      allowFirstLog(true);
      await firstLog;
    });
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(incrementLogsUsed).toHaveBeenCalledTimes(1);
  });

  it('queues a dose locally when the Firestore save fails', async () => {
    mockAddDocWithEnv.mockRejectedValueOnce(new Error('offline'));
    const { result } = renderHook(() => useDoseLogging());

    await act(async () => {
      await result.current.logDose(doseInfo);
    });

    const savedLogs = JSON.parse(storage.setItem.mock.calls[0][1]) as { firestoreId?: string }[];
    expect(savedLogs).toHaveLength(1);
    expect(savedLogs[0].firestoreId).toBeUndefined();
  });

  it('flushes queued local doses to Firestore', async () => {
    const logs = [queuedLog('queued-1'), queuedLog('queued-2')];
    storage.getItem.mockResolvedValue(JSON.stringify(logs));
    mockAddDocWithEnv
      .mockResolvedValueOnce({ id: 'remote-1' } as never)
      .mockResolvedValueOnce({ id: 'remote-2' } as never);
    const { result } = renderHook(() => useDoseLogging());

    await act(async () => {
      await result.current.syncLogsToFirestore();
    });

    expect(mockAddDocWithEnv).toHaveBeenCalledTimes(2);
    expect(JSON.parse(storage.setItem.mock.calls[0][1])).toEqual([
      expect.objectContaining({ id: 'queued-1', firestoreId: 'remote-1' }),
      expect.objectContaining({ id: 'queued-2', firestoreId: 'remote-2' }),
    ]);
  });

  it('leaves a failed item queued and retries it on the next flush', async () => {
    let storedLogs = [queuedLog('retry-me'), queuedLog('already-synced')];
    storage.getItem.mockImplementation(async () => JSON.stringify(storedLogs));
    storage.setItem.mockImplementation(async (_key, value) => {
      storedLogs = JSON.parse(value);
    });
    mockAddDocWithEnv
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce({ id: 'remote-2' } as never)
      .mockResolvedValueOnce({ id: 'remote-1' } as never);
    const { result } = renderHook(() => useDoseLogging());

    await act(async () => {
      await result.current.syncLogsToFirestore();
    });
    expect(storedLogs[0]).toEqual(expect.objectContaining({ id: 'retry-me' }));
    expect(storedLogs[0].firestoreId).toBeUndefined();
    expect(storedLogs[1]).toEqual(expect.objectContaining({ id: 'already-synced', firestoreId: 'remote-2' }));

    await act(async () => {
      await result.current.syncLogsToFirestore();
    });
    expect(mockAddDocWithEnv).toHaveBeenCalledTimes(3);
    expect(storedLogs[0]).toEqual(expect.objectContaining({ id: 'retry-me', firestoreId: 'remote-1' }));
  });
});
