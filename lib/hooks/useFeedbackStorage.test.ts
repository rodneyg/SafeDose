import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook } from '@testing-library/react-native';
import { collection, getFirestore } from 'firebase/firestore';
import { useFeedbackStorage } from './useFeedbackStorage';
import { addDocWithEnv } from '../firestoreWithEnv';

let mockUser: { uid: string; isAnonymous: boolean } | null = {
  uid: 'user-123',
  isAnonymous: false,
};

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({ name: 'test-db' })),
  collection: jest.fn(() => ({ path: 'feedback' })),
}));

jest.mock('../firestoreWithEnv', () => ({
  addDocWithEnv: jest.fn(() => Promise.resolve({ id: 'document-123' })),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(() => Promise.resolve()),
}));

const doseInfo = {
  substanceName: 'Test medicine',
  doseValue: 5,
  unit: 'mg',
  calculatedVolume: 0.5,
};

describe('useFeedbackStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { uid: 'user-123', isAnonymous: false };
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('saves valid feedback locally and to Firestore for an authenticated user', async () => {
    const { result } = renderHook(() => useFeedbackStorage());

    await act(async () => {
      await result.current.submitFeedback('mild_side_effects', doseInfo, 'A note');
    });

    expect(getFirestore).toHaveBeenCalled();
    expect(collection).toHaveBeenCalledWith({ name: 'test-db' }, 'feedback');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'feedback_user-123',
      expect.any(String),
    );

    const savedFeedback = JSON.parse((AsyncStorage.setItem as jest.Mock).mock.calls[0][1]);
    expect(savedFeedback).toHaveLength(1);
    expect(savedFeedback[0]).toMatchObject({
      userId: 'user-123',
      feedbackType: 'mild_side_effects',
      notes: 'A note',
      doseInfo,
    });
    expect(addDocWithEnv).toHaveBeenCalledWith(
      { path: 'feedback' },
      expect.objectContaining({ userId: 'user-123', feedbackType: 'mild_side_effects' }),
    );
    expect(result.current.isSubmitting).toBe(false);
  });

  it('keeps only the newest 50 local feedback entries', async () => {
    const existing = Array.from({ length: 50 }, (_, index) => ({ id: `old-${index}` }));
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(existing));
    const { result } = renderHook(() => useFeedbackStorage());

    await act(async () => {
      await result.current.submitFeedback('great', doseInfo);
    });

    const savedFeedback = JSON.parse((AsyncStorage.setItem as jest.Mock).mock.calls[0][1]);
    expect(savedFeedback).toHaveLength(50);
    expect(savedFeedback[0].id).toBe('old-1');
    expect(savedFeedback[49]).toMatchObject({ feedbackType: 'great' });
  });

  it('uses anonymous local storage and skips Firestore for a signed-out user', async () => {
    mockUser = null;
    const { result } = renderHook(() => useFeedbackStorage());

    await act(async () => {
      await result.current.submitFeedback('something_wrong', doseInfo);
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith('feedback_anonymous', expect.any(String));
    expect(collection).not.toHaveBeenCalled();
    expect(addDocWithEnv).not.toHaveBeenCalled();
  });

  it('skips submission when required dose information is missing', async () => {
    const { result } = renderHook(() => useFeedbackStorage());

    await act(async () => {
      await result.current.submitFeedback('great', {
        ...doseInfo,
        calculatedVolume: null,
      });
    });

    expect(console.warn).toHaveBeenCalledWith('Incomplete dose info, skipping feedback submission');
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    expect(addDocWithEnv).not.toHaveBeenCalled();
    expect(result.current.isSubmitting).toBe(false);
  });

  it('does not interrupt submission when local or cloud persistence fails', async () => {
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('storage unavailable'));
    (addDocWithEnv as jest.Mock).mockRejectedValueOnce(new Error('firestore unavailable'));
    const { result } = renderHook(() => useFeedbackStorage());

    await act(async () => {
      await expect(result.current.submitFeedback('great', doseInfo)).resolves.toBeUndefined();
    });

    expect(addDocWithEnv).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith('Error saving feedback locally:', expect.any(Error));
    expect(console.error).toHaveBeenCalledWith('Error saving feedback to Firestore:', expect.any(Error));
    expect(result.current.isSubmitting).toBe(false);
  });

  it('returns stored history and falls back to an empty list for invalid data', async () => {
    const storedFeedback = [{ id: 'stored-feedback', feedbackType: 'great' }];
    (AsyncStorage.getItem as jest.Mock)
      .mockResolvedValueOnce(JSON.stringify(storedFeedback))
      .mockResolvedValueOnce('not-json');
    const { result } = renderHook(() => useFeedbackStorage());

    await expect(result.current.getFeedbackHistory()).resolves.toEqual(storedFeedback);
    await expect(result.current.getFeedbackHistory()).resolves.toEqual([]);
    expect(AsyncStorage.getItem).toHaveBeenNthCalledWith(1, 'feedback_user-123');
    expect(console.error).toHaveBeenCalledWith('Error loading feedback history:', expect.any(Error));
  });
});
