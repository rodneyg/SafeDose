import { act, renderHook } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { deleteDoc, doc, getDocs, getFirestore } from 'firebase/firestore';
import type { DoseLog } from '../../types/doseLog';
import { useDoseLogging } from './useDoseLogging';
import { addDocWithEnv } from '../firestoreWithEnv';
import { useLogUsageTracking } from './useLogUsageTracking';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
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
const mockDeleteDoc = jest.mocked(deleteDoc);
const mockDoc = jest.mocked(doc);
const mockGetDocs = jest.mocked(getDocs);
const mockDb = {} as ReturnType<typeof getFirestore>;
const mockAddDocWithEnv = addDocWithEnv as jest.MockedFunction<typeof addDocWithEnv>;
const mockUseLogUsageTracking = useLogUsageTracking as jest.MockedFunction<typeof useLogUsageTracking>;
const storageKey = 'dose_logs_test-user-123';
const doseInfo = {
  substanceName: 'Test Medication',
  doseValue: 10,
  unit: 'mg',
  calculatedVolume: 0.5,
};

const olderLog: DoseLog = {
  ...doseInfo,
  id: 'older-dose',
  userId: 'test-user-123',
  timestamp: '2026-01-01T08:00:00.000Z',
};
const newerLog: DoseLog = {
  ...olderLog,
  id: 'newer-dose',
  timestamp: '2026-01-02T08:00:00.000Z',
};

const doseLogAt = (id: string, timestamp: string): DoseLog => ({
  ...doseInfo,
  id,
  userId: 'test-user-123',
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
    jest.mocked(getFirestore).mockReturnValue(mockDb);
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
    mockGetDocs.mockResolvedValueOnce({ forEach: jest.fn() } as Awaited<ReturnType<typeof getDocs>>);
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
      storageKey,
      expect.stringContaining('"substanceName":"Test Medication"')
    );
    expect(mockAddDocWithEnv).toHaveBeenCalledTimes(1);
    expect(incrementLogsUsed).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['without notes', undefined],
    ['with notes', 'after breakfast'],
  ])('omits undefined fields from the Firestore document %s', async (_label, notes) => {
    const { result } = renderHook(() => useDoseLogging());

    await act(async () => {
      await result.current.logDose(doseInfo, notes);
    });

    const firestoreDocument = mockAddDocWithEnv.mock.calls[0][1] as Record<string, unknown>;
    expect(Object.values(firestoreDocument)).not.toContain(undefined);
    expect(firestoreDocument).toMatchObject({
      userId: 'test-user-123',
      substanceName: doseInfo.substanceName,
    });
    if (notes === undefined) {
      expect(firestoreDocument).not.toHaveProperty('notes');
    } else {
      expect(firestoreDocument).toHaveProperty('notes', notes);
    }
  });

  it('reports failure when local storage and Firestore both fail', async () => {
    storage.setItem.mockRejectedValueOnce(new Error('storage unavailable'));
    mockAddDocWithEnv.mockRejectedValueOnce(new Error('cloud unavailable'));
    const { result } = renderHook(() => useDoseLogging());

    let response: Awaited<ReturnType<typeof result.current.logDose>>;
    await act(async () => {
      response = await result.current.logDose(doseInfo);
    });

    expect(response!).toEqual({ success: false });
    expect(console.error).toHaveBeenCalledWith(
      '[useDoseLogging] Error saving dose log locally:',
      expect.any(Error)
    );
    expect(incrementLogsUsed).not.toHaveBeenCalled();
  });

  it('reports success when Firestore saved the dose but local storage failed', async () => {
    storage.setItem.mockRejectedValueOnce(new Error('storage unavailable'));
    const { result } = renderHook(() => useDoseLogging());

    await expect(result.current.logDose(doseInfo)).resolves.toEqual({
      success: true,
      localDoseCount: undefined,
    });
    expect(incrementLogsUsed).toHaveBeenCalledTimes(1);
  });

  it('returns local history newest first when Firestore load fails', async () => {
    const error = new Error('Firestore read unavailable');
    storage.getItem.mockResolvedValueOnce(JSON.stringify([olderLog, newerLog]));
    mockGetDocs.mockRejectedValueOnce(error);
    const { result } = renderHook(() => useDoseLogging());

    await expect(result.current.getDoseLogHistory()).resolves.toEqual([newerLog, olderLog]);

    expect(storage.getItem).toHaveBeenCalledWith(storageKey);
    expect(mockGetDocs).toHaveBeenCalledTimes(1);
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith('Error loading dose logs from Firestore:', error);
  });

  it('keeps local doses and restores cloud-only doses after a Firestore load failure', async () => {
    const cachedDose = { ...olderLog, firestoreId: 'remote-older-dose', notes: 'local note' };
    const cloudCopy = { ...olderLog, notes: 'older cloud note' };
    const cloudOnlyDose = {
      ...doseLogAt('cloud-only-dose', '2026-01-01T20:00:00.000Z'),
      firestoreId: 'remote-cloud-only-dose',
    };
    storage.getItem.mockResolvedValue(JSON.stringify([cachedDose, newerLog]));
    mockGetDocs
      .mockRejectedValueOnce(new Error('Firestore read unavailable'))
      .mockResolvedValueOnce({
        forEach: (visit: (entry: { id: string; data: () => DoseLog }) => void) => {
          visit({ id: cloudOnlyDose.firestoreId, data: () => cloudOnlyDose });
          visit({ id: cachedDose.firestoreId, data: () => cloudCopy });
        },
      } as Awaited<ReturnType<typeof getDocs>>);
    const { result } = renderHook(() => useDoseLogging());

    await expect(result.current.getDoseLogHistory()).resolves.toEqual([newerLog, cachedDose]);
    expect(storage.setItem).not.toHaveBeenCalled();

    const restoredHistory = [newerLog, cloudOnlyDose, cachedDose];
    await expect(result.current.getDoseLogHistory()).resolves.toEqual(restoredHistory);

    expect(mockGetDocs).toHaveBeenCalledTimes(2);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    const [key, cachedHistory] = storage.setItem.mock.calls[0];
    expect(key).toBe(storageKey);
    expect(JSON.parse(cachedHistory)).toEqual(restoredHistory);
  });

  it('returns restored Firestore history when the local cache cannot be written', async () => {
    const error = new Error('Local cache write unavailable');
    const remoteId = 'restored-dose';
    mockGetDocs.mockResolvedValueOnce({
      forEach: (visit: (entry: { id: string; data: () => DoseLog }) => void) => {
        visit({ id: remoteId, data: () => olderLog });
      },
    } as Awaited<ReturnType<typeof getDocs>>);
    storage.setItem.mockRejectedValueOnce(error);
    const { result } = renderHook(() => useDoseLogging());

    await expect(result.current.getDoseLogHistory()).resolves.toEqual([
      { ...olderLog, firestoreId: remoteId },
    ]);

    expect(storage.setItem).toHaveBeenCalledTimes(1);
    const [key, cachedLogs] = storage.setItem.mock.calls[0];
    expect(key).toBe(storageKey);
    expect(JSON.parse(cachedLogs)).toEqual([{ ...olderLog, firestoreId: remoteId }]);
    expect(console.error).toHaveBeenCalledWith('[useDoseLogging] Error caching dose history:', error);
  });

  it('retrieves the new dose and prior history after Firestore save and load fail', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-03T08:00:00.000Z'));
    const saveError = new Error('Firestore write unavailable');
    const loadError = new Error('Firestore read unavailable');
    storage.getItem.mockResolvedValueOnce(JSON.stringify([olderLog]));
    mockAddDocWithEnv.mockRejectedValueOnce(saveError);
    const { result } = renderHook(() => useDoseLogging());

    await act(async () => {
      await expect(result.current.logDose(doseInfo, 'after breakfast')).resolves.toEqual({
        success: true,
        localDoseCount: 2,
      });
    });

    expect(mockAddDocWithEnv).toHaveBeenCalledTimes(1);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    const [key, savedLogs] = storage.setItem.mock.calls[0];
    expect(key).toBe(storageKey);
    const [savedDose, ...priorLogs] = JSON.parse(savedLogs) as DoseLog[];
    expect(savedDose).toMatchObject({
      ...doseInfo,
      id: expect.stringMatching(/^dose_log_/),
      userId: olderLog.userId,
      notes: 'after breakfast',
    });
    expect(savedDose).not.toHaveProperty('firestoreId');
    expect(priorLogs).toEqual([olderLog]);
    expect(incrementLogsUsed).toHaveBeenCalledTimes(1);
    expect(result.current.isLogging).toBe(false);
    expect(console.error).toHaveBeenCalledWith('Error saving dose log to Firestore:', saveError);

    storage.getItem.mockResolvedValueOnce(savedLogs);
    mockGetDocs.mockRejectedValueOnce(loadError);

    await expect(result.current.getDoseLogHistory()).resolves.toEqual([savedDose, olderLog]);

    expect(mockGetDocs).toHaveBeenCalledTimes(1);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith('Error loading dose logs from Firestore:', loadError);
  });

  it('keeps the local deletion when Firestore delete fails', async () => {
    const error = new Error('Firestore delete unavailable');
    const remoteId = 'remote-newer-dose';
    const docRef = { id: remoteId } as ReturnType<typeof doc>;
    storage.getItem.mockResolvedValueOnce(JSON.stringify([
      { ...newerLog, firestoreId: remoteId },
      olderLog,
    ]));
    mockDoc.mockReturnValueOnce(docRef);
    mockDeleteDoc.mockRejectedValueOnce(error);
    const { result } = renderHook(() => useDoseLogging());

    await expect(result.current.deleteDoseLog(newerLog.id)).resolves.toBeUndefined();

    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(storage.setItem).toHaveBeenCalledWith(storageKey, JSON.stringify([olderLog]));
    expect(mockDoc).toHaveBeenCalledWith(mockDb, 'dose_logs', remoteId);
    expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
    expect(mockDeleteDoc).toHaveBeenCalledWith(docRef);
    expect(console.error).toHaveBeenCalledWith('Error deleting from Firestore:', error);
  });

  it('reports a local deletion failure without attempting Firestore deletion', async () => {
    const error = new Error('Local storage write unavailable');
    storage.getItem.mockResolvedValueOnce(JSON.stringify([
      { ...newerLog, firestoreId: 'remote-newer-dose' },
      olderLog,
    ]));
    storage.setItem.mockRejectedValueOnce(error);
    const { result } = renderHook(() => useDoseLogging());

    await expect(result.current.deleteDoseLog(newerLog.id)).rejects.toBe(error);

    expect(storage.setItem).toHaveBeenCalledWith(storageKey, JSON.stringify([olderLog]));
    expect(mockDoc).not.toHaveBeenCalled();
    expect(mockDeleteDoc).not.toHaveBeenCalled();
  });

  it('flushes all queued doses and skips a subsequent sync when the queue is empty', async () => {
    storage.getItem.mockResolvedValueOnce(JSON.stringify([newerLog, olderLog]));
    mockAddDocWithEnv
      .mockResolvedValueOnce({ id: 'remote-newer-dose' } as never)
      .mockResolvedValueOnce({ id: 'remote-older-dose' } as never);
    const { result } = renderHook(() => useDoseLogging());

    await result.current.syncLogsToFirestore();

    expect(mockAddDocWithEnv).toHaveBeenCalledTimes(2);
    expect(mockAddDocWithEnv).toHaveBeenNthCalledWith(1, expect.anything(), newerLog);
    expect(mockAddDocWithEnv).toHaveBeenNthCalledWith(2, expect.anything(), olderLog);
    const syncedLogs = JSON.stringify([
      { ...newerLog, firestoreId: 'remote-newer-dose' },
      { ...olderLog, firestoreId: 'remote-older-dose' },
    ]);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(storage.setItem).toHaveBeenCalledWith(storageKey, syncedLogs);

    storage.getItem.mockResolvedValueOnce(syncedLogs);
    await result.current.syncLogsToFirestore();

    expect(mockAddDocWithEnv).toHaveBeenCalledTimes(2);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
  });

  it('continues after a Firestore sync failure and retries only the failed dose', async () => {
    const error = new Error('Firestore sync upload unavailable');
    storage.getItem.mockResolvedValueOnce(JSON.stringify([newerLog, olderLog]));
    mockAddDocWithEnv
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce({ id: 'remote-older-dose' } as never)
      .mockResolvedValueOnce({ id: 'remote-newer-dose' } as never);
    const { result } = renderHook(() => useDoseLogging());

    await expect(result.current.syncLogsToFirestore()).resolves.toBeUndefined();

    expect(mockAddDocWithEnv).toHaveBeenCalledTimes(2);
    expect(mockAddDocWithEnv).toHaveBeenNthCalledWith(1, expect.anything(), newerLog);
    expect(mockAddDocWithEnv).toHaveBeenNthCalledWith(2, expect.anything(), olderLog);
    expect(console.error).toHaveBeenCalledWith('Error saving dose log to Firestore:', error);
    const syncedOlderLog = { ...olderLog, firestoreId: 'remote-older-dose' };
    const partiallySynced = [newerLog, syncedOlderLog];
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(storage.setItem).toHaveBeenLastCalledWith(storageKey, JSON.stringify(partiallySynced));

    storage.getItem.mockResolvedValueOnce(storage.setItem.mock.calls[0][1]);
    await expect(result.current.syncLogsToFirestore()).resolves.toBeUndefined();

    expect(mockAddDocWithEnv).toHaveBeenCalledTimes(3);
    expect(mockAddDocWithEnv).toHaveBeenLastCalledWith(expect.anything(), newerLog);
    expect(storage.setItem).toHaveBeenNthCalledWith(2, storageKey, JSON.stringify([
      { ...newerLog, firestoreId: 'remote-newer-dose' },
      syncedOlderLog,
    ]));
  });

  it('keeps all unsynced doses eligible for retry when every Firestore sync upload fails', async () => {
    const error = new Error('Firestore unavailable for the entire sync');
    const syncedLog = { ...newerLog, id: 'synced-dose', firestoreId: 'remote-synced-dose' };
    const localLogs = JSON.stringify([newerLog, olderLog, syncedLog]);
    storage.getItem.mockResolvedValueOnce(localLogs);
    mockAddDocWithEnv.mockRejectedValueOnce(error).mockRejectedValueOnce(error);
    const { result } = renderHook(() => useDoseLogging());

    await expect(result.current.syncLogsToFirestore()).resolves.toBeUndefined();

    expect(mockAddDocWithEnv).toHaveBeenCalledTimes(2);
    expect(storage.setItem).toHaveBeenCalledWith(storageKey, localLogs);

    storage.getItem.mockResolvedValueOnce(storage.setItem.mock.calls[0][1]);
    mockAddDocWithEnv
      .mockResolvedValueOnce({ id: 'remote-newer-dose' } as never)
      .mockResolvedValueOnce({ id: 'remote-older-dose' } as never);
    await result.current.syncLogsToFirestore();

    expect(mockAddDocWithEnv).toHaveBeenCalledTimes(4);
    expect(mockAddDocWithEnv).toHaveBeenNthCalledWith(3, expect.anything(), newerLog);
    expect(mockAddDocWithEnv).toHaveBeenNthCalledWith(4, expect.anything(), olderLog);
    expect(storage.setItem).toHaveBeenLastCalledWith(storageKey, JSON.stringify([
      { ...newerLog, firestoreId: 'remote-newer-dose' },
      { ...olderLog, firestoreId: 'remote-older-dose' },
      syncedLog,
    ]));
  });

  it('handles a local write failure while saving Firestore sync results', async () => {
    const error = new Error('storage unavailable after sync upload');
    storage.getItem.mockResolvedValueOnce(JSON.stringify([olderLog]));
    storage.setItem.mockRejectedValueOnce(error);
    const { result } = renderHook(() => useDoseLogging());

    await expect(result.current.syncLogsToFirestore()).resolves.toBeUndefined();

    expect(mockAddDocWithEnv).toHaveBeenCalledTimes(1);
    expect(storage.setItem).toHaveBeenCalledWith(storageKey, JSON.stringify([
      { ...olderLog, firestoreId: 'firestore-id' },
    ]));
    expect(console.error).toHaveBeenCalledWith('Error syncing logs to Firestore:', error);
  });

  it('returns an empty history when local storage cannot be read', async () => {
    const error = new Error('Local storage read unavailable');
    storage.getItem.mockRejectedValueOnce(error);
    const { result } = renderHook(() => useDoseLogging());

    await expect(result.current.getDoseLogHistory()).resolves.toEqual([]);

    expect(mockGetDocs).not.toHaveBeenCalled();
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith('[useDoseLogging] Error loading dose log history:', error);
  });

  it('returns an empty history and keeps the stored data when local history is corrupt', async () => {
    storage.getItem.mockResolvedValueOnce('{not json');
    const { result } = renderHook(() => useDoseLogging());

    await expect(result.current.getDoseLogHistory()).resolves.toEqual([]);

    expect(storage.setItem).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(
      '[useDoseLogging] Error loading dose log history:',
      expect.any(SyntaxError)
    );
  });

  it('does not overwrite the local cache when Firestore load fails with no local history', async () => {
    const error = new Error('Firestore read unavailable');
    mockGetDocs.mockRejectedValueOnce(error);
    const { result } = renderHook(() => useDoseLogging());

    await expect(result.current.getDoseLogHistory()).resolves.toEqual([]);

    expect(storage.setItem).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith('Error loading dose logs from Firestore:', error);
  });

  it('reports a local read failure on delete without touching storage or Firestore', async () => {
    const error = new Error('Local storage read unavailable');
    storage.getItem.mockRejectedValueOnce(error);
    const { result } = renderHook(() => useDoseLogging());

    await expect(result.current.deleteDoseLog(newerLog.id)).rejects.toBe(error);

    expect(storage.setItem).not.toHaveBeenCalled();
    expect(mockDeleteDoc).not.toHaveBeenCalled();
  });

  it('keeps the dose in local history when the Firestore save fails for a single log', async () => {
    const error = new Error('Firestore write unavailable');
    mockAddDocWithEnv.mockRejectedValueOnce(error);
    const { result } = renderHook(() => useDoseLogging());

    let response!: Awaited<ReturnType<typeof result.current.logDose>>;
    await act(async () => {
      response = await result.current.logDose(doseInfo);
    });

    expect(response).toEqual({ success: true, localDoseCount: 1 });
    const saved = JSON.parse(storage.setItem.mock.calls[0][1]);
    expect(saved).toHaveLength(1);
    expect(saved[0]).not.toHaveProperty('firestoreId');
    expect(console.error).toHaveBeenCalledWith('Error saving dose log to Firestore:', error);
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
