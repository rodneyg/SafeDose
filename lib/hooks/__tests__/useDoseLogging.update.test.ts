import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateDoc, doc } from 'firebase/firestore';
import { useDoseLogging } from '../useDoseLogging';
import type { DoseLog } from '../../../types/doseLog';

let mockUser: { uid: string; isAnonymous: boolean } = { uid: 'u1', isAnonymous: false };

jest.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock('../../firestoreWithEnv', () => ({ addDocWithEnv: jest.fn() }));
jest.mock('../useLogUsageTracking', () => ({
  useLogUsageTracking: () => ({
    logUsageData: null,
    checkLogUsageLimit: jest.fn(),
    incrementLogsUsed: jest.fn(),
  }),
}));
jest.mock('firebase/firestore', () => ({
  getFirestore: () => ({}),
  collection: jest.fn(),
  doc: jest.fn((_db, name, id) => `${name}/${id}`),
  deleteDoc: jest.fn(),
  updateDoc: jest.fn().mockResolvedValue(undefined),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  getDocs: jest.fn(),
}));

const baseLog: DoseLog = {
  id: 'log-1',
  substanceName: 'Test peptide',
  doseValue: 2,
  unit: 'mg',
  calculatedVolume: 0.2,
  syringeType: 'Insulin',
  recommendedMarking: '20',
  injectionSite: 'abdomen_L',
  timestamp: '2026-11-20T12:00:00.000Z',
  notes: 'first note',
};
const otherLog: DoseLog = { ...baseLog, id: 'log-2', notes: 'leave me alone' };
const key = 'dose_logs_u1';

async function seed(logs: DoseLog[]) {
  await AsyncStorage.setItem(key, JSON.stringify(logs));
}
async function stored(): Promise<DoseLog[]> {
  return JSON.parse((await AsyncStorage.getItem(key)) as string);
}

describe('useDoseLogging updateDoseLog', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockUser = { uid: 'u1', isAnonymous: false };
    await AsyncStorage.clear();
  });

  it('edits date, site and notes in the local copy and leaves other logs alone', async () => {
    await seed([{ ...baseLog }, otherLog]);
    const { result } = renderHook(() => useDoseLogging());

    let updated: DoseLog | null = null;
    await act(async () => {
      updated = await result.current.updateDoseLog('log-1', {
        timestamp: '2026-11-19T08:30:00.000Z',
        injectionSite: 'thigh_R',
        notes: '  corrected  ',
      });
    });

    expect(updated).toMatchObject({ timestamp: '2026-11-19T08:30:00.000Z', injectionSite: 'thigh_R', notes: 'corrected' });
    const logs = await stored();
    expect(logs).toHaveLength(2);
    expect(logs[0]).toMatchObject({ id: 'log-1', injectionSite: 'thigh_R', notes: 'corrected', doseValue: 2, calculatedVolume: 0.2, recommendedMarking: '20' });
    expect(logs[1]).toEqual(otherLog);
  });

  it('scales the volume and drops the stale syringe marking when the dose changes', async () => {
    await seed([{ ...baseLog }]);
    const { result } = renderHook(() => useDoseLogging());

    await act(async () => {
      await result.current.updateDoseLog('log-1', { doseValue: 3 });
    });

    const [log] = await stored();
    expect(log.doseValue).toBe(3);
    expect(log.calculatedVolume).toBeCloseTo(0.3, 6);
    expect(log.recommendedMarking).toBeUndefined();
  });

  it('clears the notes and the injection site when they are emptied', async () => {
    await seed([{ ...baseLog }]);
    const { result } = renderHook(() => useDoseLogging());

    await act(async () => {
      await result.current.updateDoseLog('log-1', { notes: '   ', injectionSite: null });
    });

    const [log] = await stored();
    expect(log.notes).toBeUndefined();
    expect(log.injectionSite).toBeUndefined();
  });

  it('returns null and writes nothing when the log does not exist', async () => {
    await seed([{ ...baseLog }]);
    const { result } = renderHook(() => useDoseLogging());

    let updated: DoseLog | null = baseLog;
    await act(async () => {
      updated = await result.current.updateDoseLog('missing', { notes: 'x' });
    });

    expect(updated).toBeNull();
    expect(await stored()).toEqual([baseLog]);
    expect(updateDoc).not.toHaveBeenCalled();
  });

  it('rejects a dose of zero and keeps the saved log', async () => {
    await seed([{ ...baseLog }]);
    const { result } = renderHook(() => useDoseLogging());

    await expect(act(async () => {
      await result.current.updateDoseLog('log-1', { doseValue: 0 });
    })).rejects.toThrow('Dose value must be greater than zero');
    expect(await stored()).toEqual([baseLog]);
  });

  it('also updates the Firestore copy when the log was synced', async () => {
    await seed([{ ...baseLog, firestoreId: 'fs-1' }]);
    const { result } = renderHook(() => useDoseLogging());

    await act(async () => {
      await result.current.updateDoseLog('log-1', { notes: '', doseValue: 4 });
    });

    expect(doc).toHaveBeenCalledWith(expect.anything(), 'dose_logs', 'fs-1');
    expect(updateDoc).toHaveBeenCalledTimes(1);
    const [ref, changes] = (updateDoc as jest.Mock).mock.calls[0];
    expect(ref).toBe('dose_logs/fs-1');
    expect(changes).toMatchObject({ doseValue: 4, notes: null, recommendedMarking: null });
    expect(changes).not.toHaveProperty('firestoreId');
    expect((await stored())[0].doseValue).toBe(4);
  });

  it('keeps the local edit when the Firestore update fails', async () => {
    (updateDoc as jest.Mock).mockRejectedValueOnce(new Error('offline'));
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await seed([{ ...baseLog, firestoreId: 'fs-1' }]);
    const { result } = renderHook(() => useDoseLogging());

    await act(async () => {
      await result.current.updateDoseLog('log-1', { notes: 'saved offline' });
    });

    expect((await stored())[0].notes).toBe('saved offline');
  });

  it('skips Firestore for anonymous users', async () => {
    mockUser = { uid: 'u1', isAnonymous: true };
    await seed([{ ...baseLog, firestoreId: 'fs-1' }]);
    const { result } = renderHook(() => useDoseLogging());

    await act(async () => {
      await result.current.updateDoseLog('log-1', { notes: 'anon' });
    });

    expect(updateDoc).not.toHaveBeenCalled();
    expect((await stored())[0].notes).toBe('anon');
  });
});
