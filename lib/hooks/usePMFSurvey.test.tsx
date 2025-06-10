import { renderHook } from '@testing-library/react';
import { usePMFSurvey } from '../lib/hooks/usePMFSurvey';

// Mock dependencies
jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'test-user', isAnonymous: false } })
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  collection: jest.fn(),
  addDoc: jest.fn(() => Promise.resolve({ id: 'test-doc' })),
}));

describe('usePMFSurvey', () => {
  test('should initialize with default trigger data', () => {
    const { result } = renderHook(() => usePMFSurvey());
    
    expect(result.current.triggerData).toEqual({
      sessionCount: 0,
      lastSessionType: 'manual',
      shouldShowSurvey: false,
      hasShownBefore: false,
    });
  });

  test('should record dose session and increment count', async () => {
    const { result } = renderHook(() => usePMFSurvey());
    
    const triggerData = await result.current.recordDoseSession('scan');
    
    expect(triggerData.sessionCount).toBe(1);
    expect(triggerData.lastSessionType).toBe('scan');
  });
});