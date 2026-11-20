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
});
