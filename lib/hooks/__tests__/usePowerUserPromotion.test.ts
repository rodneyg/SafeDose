import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePowerUserPromotion } from '../usePowerUserPromotion';

let mockUser = { uid: 'test-user', isAnonymous: false };
const mockDb = {};
const mockGetDoc = jest.fn();

// Mock dependencies
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser })
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: () => mockDb,
  doc: (_db: unknown, _collection: string, uid: string) => ({ uid }),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  setDoc: jest.fn()
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn()
}));

describe('usePowerUserPromotion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { uid: 'test-user', isAnonymous: false };
    mockGetDoc.mockResolvedValue({ exists: () => false });
  });

  it('ignores a previous account Firestore read that resolves after the current Plus account', async () => {
    let resolveAccountA!: (value: { exists: () => boolean; data: () => { plan: string } }) => void;
    let resolveAccountB!: (value: { exists: () => boolean; data: () => { plan: string } }) => void;
    const accountARead = new Promise<{ exists: () => boolean; data: () => { plan: string } }>((resolve) => {
      resolveAccountA = resolve;
    });
    const accountBRead = new Promise<{ exists: () => boolean; data: () => { plan: string } }>((resolve) => {
      resolveAccountB = resolve;
    });
    mockGetDoc.mockImplementation((ref: { uid: string }) => ref.uid === 'account-a' ? accountARead : accountBRead);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({
      doseCount: 4,
      lastShownDate: null,
      hasActiveSubscription: false,
      plan: 'free',
    }));

    mockUser = { uid: 'account-a', isAnonymous: false };
    const { result, rerender } = renderHook(() => usePowerUserPromotion());
    mockUser = { uid: 'account-b', isAnonymous: false };
    rerender({});

    await act(async () => {
      resolveAccountB({ exists: () => true, data: () => ({ plan: 'plus' }) });
      await accountBRead;
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.promotionData.plan).toBe('plus');
    expect(result.current.shouldShowPromotion()).toBe(false);

    await act(async () => {
      resolveAccountA({ exists: () => true, data: () => ({ plan: 'free' }) });
      await accountARead;
    });

    expect(result.current.promotionData.plan).toBe('plus');
    expect(result.current.shouldShowPromotion()).toBe(false);
  });

  it('exposes the documented subscription promotion result shape', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    const { result } = renderHook(() => usePowerUserPromotion());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(Object.keys(result.current).sort()).toEqual([
      'clearPromotionData',
      'incrementDoseCount',
      'isLoading',
      'markPromotionShown',
      'promotionData',
      'shouldShowPromotion',
    ]);
  });

  it('should not show promotion one dose below the minimum', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({
      doseCount: 3,
      lastShownDate: null,
      hasActiveSubscription: false,
      plan: 'free'
    }));

    const { result } = renderHook(() => usePowerUserPromotion());
    
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    
    expect(result.current.shouldShowPromotion()).toBe(false);
  });

  it('should show promotion when dose count reaches minimum and no active subscription', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({
      doseCount: 4,
      lastShownDate: null,
      hasActiveSubscription: false,
      plan: 'free'
    }));

    const { result } = renderHook(() => usePowerUserPromotion());
    
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    
    expect(result.current.shouldShowPromotion()).toBe(true);
  });

  it('should stop showing the promotion after it is dismissed', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({
      doseCount: 4,
      lastShownDate: null,
      hasActiveSubscription: false,
      plan: 'free'
    }));

    const { result } = renderHook(() => usePowerUserPromotion());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.shouldShowPromotion()).toBe(true);

    await act(async () => {
      await result.current.markPromotionShown();
    });

    expect(result.current.shouldShowPromotion()).toBe(false);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'powerUserPromotion_v2_test-user',
      expect.stringContaining('"lastShownDate"')
    );
  });

  it('should not show promotion when user has active subscription', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({
      doseCount: 10,
      lastShownDate: null,
      hasActiveSubscription: true,
      plan: 'pro'
    }));

    const { result } = renderHook(() => usePowerUserPromotion());
    
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    
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

    const { result } = renderHook(() => usePowerUserPromotion());
    
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    
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

    const { result } = renderHook(() => usePowerUserPromotion());
    
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    
    expect(result.current.shouldShowPromotion()).toBe(true);
  });

  it('should increment dose count', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({
      doseCount: 3,
      lastShownDate: null,
      hasActiveSubscription: false,
      plan: 'free'
    }));

    const { result } = renderHook(() => usePowerUserPromotion());
    
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    
    await act(async () => {
      await result.current.incrementDoseCount();
    });

    expect(result.current.promotionData.doseCount).toBe(4);
    expect(AsyncStorage.setItem).toHaveBeenCalled();
  });
});
