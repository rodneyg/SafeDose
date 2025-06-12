import { renderHook, act } from '@testing-library/react-hooks';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePowerUserPromotion } from '../usePowerUserPromotion';

// Mock dependencies
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'test-user', isAnonymous: false } })
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: () => ({}),
  doc: jest.fn(),
  getDoc: jest.fn().mockResolvedValue({ exists: () => false }),
  setDoc: jest.fn()
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn()
}));

describe('usePowerUserPromotion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not show promotion initially when dose count is below minimum', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({
      doseCount: 2,
      lastShownDate: null,
      hasActiveSubscription: false,
      plan: 'free'
    }));

    const { result, waitForNextUpdate } = renderHook(() => usePowerUserPromotion());
    
    await waitForNextUpdate();
    
    expect(result.current.shouldShowPromotion()).toBe(false);
  });

  it('should show promotion when dose count reaches minimum and no active subscription', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({
      doseCount: 4,
      lastShownDate: null,
      hasActiveSubscription: false,
      plan: 'free'
    }));

    const { result, waitForNextUpdate } = renderHook(() => usePowerUserPromotion());
    
    await waitForNextUpdate();
    
    expect(result.current.shouldShowPromotion()).toBe(true);
  });

  it('should not show promotion when user has active subscription', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({
      doseCount: 10,
      lastShownDate: null,
      hasActiveSubscription: true,
      plan: 'pro'
    }));

    const { result, waitForNextUpdate } = renderHook(() => usePowerUserPromotion());
    
    await waitForNextUpdate();
    
    expect(result.current.shouldShowPromotion()).toBe(false);
  });

  it('should not show promotion when shown recently', async () => {
    const recentDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({
      doseCount: 8,
      lastShownDate: recentDate.toISOString(),
      hasActiveSubscription: false,
      plan: 'free'
    }));

    const { result, waitForNextUpdate } = renderHook(() => usePowerUserPromotion());
    
    await waitForNextUpdate();
    
    expect(result.current.shouldShowPromotion()).toBe(false);
  });

  it('should show promotion again after 2 weeks', async () => {
    const oldDate = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000); // 15 days ago
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({
      doseCount: 12,
      lastShownDate: oldDate.toISOString(),
      hasActiveSubscription: false,
      plan: 'free'
    }));

    const { result, waitForNextUpdate } = renderHook(() => usePowerUserPromotion());
    
    await waitForNextUpdate();
    
    expect(result.current.shouldShowPromotion()).toBe(true);
  });

  it('should increment dose count', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({
      doseCount: 3,
      lastShownDate: null,
      hasActiveSubscription: false,
      plan: 'free'
    }));

    const { result, waitForNextUpdate } = renderHook(() => usePowerUserPromotion());
    
    await waitForNextUpdate();
    
    await act(async () => {
      await result.current.incrementDoseCount();
    });

    expect(result.current.promotionData.doseCount).toBe(4);
    expect(AsyncStorage.setItem).toHaveBeenCalled();
  });
});