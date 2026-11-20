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

const doseLogAt = (id: string, timestamp: string) => ({
  id,
  substanceName: 'Test Medication',
  doseValue: 10,
  unit: 'mg',
  calculatedVolume: 0.5,
  timestamp,
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

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('stores the correct instant across an America/Detroit date boundary', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-15T23:59:59.000-05:00'));
    const { result } = renderHook(() => useDoseLogging());

    await act(async () => {
      await result.current.logDose(doseInfo);
    });

    const storedLogs = JSON.parse(storage.setItem.mock.calls[0][1]);
    expect(storedLogs[0]).toMatchObject({
      timestamp: '2026-01-16T04:59:59.000Z',
    });
    expect(new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Detroit',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(storedLogs[0].timestamp))).toBe('2026-01-15');
  });

  it.each([
    ['before the spring transition', '2026-03-08T01:59:59.000-05:00', '2026-03-08T06:59:59.000Z'],
    ['after the spring transition', '2026-03-08T03:00:00.000-04:00', '2026-03-08T07:00:00.000Z'],
    ['the first fall 1:30', '2026-11-01T01:30:00.000-04:00', '2026-11-01T05:30:00.000Z'],
    ['the second fall 1:30', '2026-11-01T01:30:00.000-05:00', '2026-11-01T06:30:00.000Z'],
  ])('preserves the America/Detroit offset %s', async (_label, localTime, expectedTimestamp) => {
    jest.useFakeTimers().setSystemTime(new Date(localTime));
    const { result } = renderHook(() => useDoseLogging());

    await act(async () => {
      await result.current.logDose(doseInfo);
    });

    const storedLogs = JSON.parse(storage.setItem.mock.calls[0][1]);
    expect(storedLogs[0].timestamp).toBe(expectedTimestamp);
  });

  it('sorts existing logs by instant through Detroit DST transitions', async () => {
    const logs = [
      doseLogAt('spring-before', '2026-03-08T01:59:59.000-05:00'),
      doseLogAt('spring-after', '2026-03-08T03:00:00.000-04:00'),
      doseLogAt('fall-first-130', '2026-11-01T01:30:00.000-04:00'),
      doseLogAt('fall-second-130', '2026-11-01T01:30:00.000-05:00'),
    ];
    storage.getItem.mockResolvedValue(JSON.stringify(logs));
    const { result } = renderHook(() => useDoseLogging());

    let history: Awaited<ReturnType<typeof result.current.getDoseLogHistory>> = [];
    await act(async () => {
      history = await result.current.getDoseLogHistory();
    });

    expect(history.map(log => log.id)).toEqual([
      'fall-second-130',
      'fall-first-130',
      'spring-after',
      'spring-before',
    ]);
  });

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
});
