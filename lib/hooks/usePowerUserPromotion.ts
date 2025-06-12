import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

interface PowerUserPromotionData {
  doseCount: number;
  lastShownDate: string | null;
  hasActiveSubscription: boolean;
  plan: string;
}

const POWER_USER_STORAGE_KEY = 'powerUserPromotion';
const MIN_DOSES_FOR_PROMOTION = 4;
const DAYS_BETWEEN_PROMOTIONS = 14; // 2 weeks

export function usePowerUserPromotion() {
  const { user } = useAuth();
  const db = getFirestore();
  const [promotionData, setPromotionData] = useState<PowerUserPromotionData>({
    doseCount: 0,
    lastShownDate: null,
    hasActiveSubscription: false,
    plan: 'free'
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load promotion data from storage
  const loadPromotionData = useCallback(async () => {
    try {
      const userId = user?.uid || 'anonymous';
      const storageKey = `${POWER_USER_STORAGE_KEY}_${userId}`;
      const stored = await AsyncStorage.getItem(storageKey);
      
      let data: PowerUserPromotionData = {
        doseCount: 0,
        lastShownDate: null,
        hasActiveSubscription: false,
        plan: 'free'
      };

      if (stored) {
        data = { ...data, ...JSON.parse(stored) };
      }

      // For authenticated users, also check Firestore for subscription status
      if (user && !user.isAnonymous) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            data.plan = userData.plan || 'free';
            data.hasActiveSubscription = userData.plan === 'plus' || userData.plan === 'pro';
          }
        } catch (error) {
          console.error('[PowerUserPromotion] Error loading user subscription status:', error);
        }
      }

      setPromotionData(data);
      console.log(`[PowerUserPromotion] Loaded promotion data for ${userId}:`, data);
    } catch (error) {
      console.error('[PowerUserPromotion] Error loading promotion data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, db]);

  // Save promotion data to storage
  const savePromotionData = useCallback(async (data: PowerUserPromotionData) => {
    try {
      const userId = user?.uid || 'anonymous';
      const storageKey = `${POWER_USER_STORAGE_KEY}_${userId}`;
      await AsyncStorage.setItem(storageKey, JSON.stringify(data));
      console.log(`[PowerUserPromotion] Saved promotion data for ${userId}:`, data);
    } catch (error) {
      console.error('[PowerUserPromotion] Error saving promotion data:', error);
    }
  }, [user]);

  // Load data on mount and when user changes
  useEffect(() => {
    loadPromotionData();
  }, [loadPromotionData]);

  // Increment dose count
  const incrementDoseCount = useCallback(async () => {
    const newData = {
      ...promotionData,
      doseCount: promotionData.doseCount + 1
    };
    setPromotionData(newData);
    await savePromotionData(newData);
    console.log('[PowerUserPromotion] Incremented dose count to:', newData.doseCount);
  }, [promotionData, savePromotionData]);

  // Check if promotion should be shown
  const shouldShowPromotion = useCallback(() => {
    console.log('[PowerUserPromotion] === CHECKING IF PROMOTION SHOULD SHOW ===');
    console.log('[PowerUserPromotion] Current promotion data:', promotionData);
    console.log('[PowerUserPromotion] Is loading:', isLoading);
    console.log('[PowerUserPromotion] Min doses required:', MIN_DOSES_FOR_PROMOTION);
    
    // Don't show if loading
    if (isLoading) {
      console.log('[PowerUserPromotion] ❌ Not showing - still loading');
      return false;
    }

    // Don't show if user has active subscription
    if (promotionData.hasActiveSubscription) {
      console.log('[PowerUserPromotion] ❌ Not showing - user has active subscription:', promotionData.plan);
      return false;
    }

    // Don't show if user hasn't reached minimum dose count
    if (promotionData.doseCount < MIN_DOSES_FOR_PROMOTION) {
      console.log('[PowerUserPromotion] ❌ Not showing - dose count too low:', promotionData.doseCount, 'minimum:', MIN_DOSES_FOR_PROMOTION);
      return false;
    }

    // Check if enough time has passed since last shown
    if (promotionData.lastShownDate) {
      const lastShown = new Date(promotionData.lastShownDate);
      const daysSinceLastShown = Math.floor((Date.now() - lastShown.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceLastShown < DAYS_BETWEEN_PROMOTIONS) {
        console.log('[PowerUserPromotion] ❌ Not showing - shown too recently:', daysSinceLastShown, 'days ago, minimum:', DAYS_BETWEEN_PROMOTIONS);
        return false;
      }
    }

    console.log('[PowerUserPromotion] ✅ Should show promotion - dose count:', promotionData.doseCount, 'last shown:', promotionData.lastShownDate);
    return true;
  }, [isLoading, promotionData]);

  // Mark promotion as shown
  const markPromotionShown = useCallback(async () => {
    const newData = {
      ...promotionData,
      lastShownDate: new Date().toISOString()
    };
    setPromotionData(newData);
    await savePromotionData(newData);
    console.log('[PowerUserPromotion] Marked promotion as shown at:', newData.lastShownDate);
  }, [promotionData, savePromotionData]);

  return {
    promotionData,
    isLoading,
    shouldShowPromotion,
    incrementDoseCount,
    markPromotionShown,
  };
}