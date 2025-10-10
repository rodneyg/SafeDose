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

const POWER_USER_STORAGE_KEY = 'powerUserPromotion_v2'; // Added v2 to force fresh start
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

  // Debug function to clear all promotion data (for troubleshooting)
  const clearPromotionData = useCallback(async () => {
    try {
      const userId = user?.uid || 'anonymous';
      const storageKey = `${POWER_USER_STORAGE_KEY}_${userId}`;
      await AsyncStorage.removeItem(storageKey);
      
      const defaultData = {
        doseCount: 0,
        lastShownDate: null,
        hasActiveSubscription: false,
        plan: 'free'
      };
      setPromotionData(defaultData);
      console.log('[PowerUserPromotion] ✅ Cleared all promotion data for user:', userId);
    } catch (error) {
      console.error('[PowerUserPromotion] ❌ Error clearing promotion data:', error);
    }
  }, [user]);

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

      // SafeDose is now free and open source - no subscription status needed

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
  // Note: Power user promotions are disabled as SafeDose is now fully free and open source
  const shouldShowPromotion = useCallback(() => {
    console.log('[PowerUserPromotion] Power user promotions are disabled - SafeDose is free');
    return false;
  }, []);

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
    clearPromotionData, // Debug function
  };
}