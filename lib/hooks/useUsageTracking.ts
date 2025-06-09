import { useState, useEffect } from 'react';
import { getFirestore, doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getNetworkStateAsync } from 'expo-network';
import { setAnalyticsUserProperties, updateUserAnalyticsProperties, USER_PROPERTIES } from '../analytics';
import { trackConversionFunnel } from '../analytics/revenueAnalytics';

const MAX_RETRIES = 3;
const INITIAL_BACKOFF = 1000; // 1 second

// Helper function to determine scan limits based on user plan and authentication status
// Business logic: Anonymous users get minimal scans to encourage sign-up,
// while authenticated users get progressively more scans based on their subscription tier
const getLimitForPlan = (plan: string, isAnonymous: boolean) => {
  if (isAnonymous) return 3; // Anonymous users
  if (plan === 'plus') return 50; // Plus plan
  if (plan === 'pro') return 500; // Pro plan
  return 10; // Signed-in free users
};

export function useUsageTracking() {
  const { user } = useAuth();
  const db = getFirestore();
  const [usageData, setUsageData] = useState({ scansUsed: 0, plan: 'free', limit: 3, lastReset: null });
  const [isOnline, setIsOnline] = useState(true);

  // Load cached usage data from AsyncStorage
  const loadCachedUsage = async () => {
    try {
      const cached = await AsyncStorage.getItem(`usage_${user?.uid || 'anonymous'}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        setUsageData(parsed);
        console.log('Loaded cached usage:', parsed);
      }
    } catch (error) {
      console.error('Error loading cached usage:', error);
    }
  };

  // Save usage data to AsyncStorage
  const saveCachedUsage = async (data: { scansUsed: number; plan: string; limit: number; lastReset?: string | null }) => {
    try {
      await AsyncStorage.setItem(`usage_${user?.uid || 'anonymous'}`, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving cached usage:', error);
    }
  };

  // Retry logic with exponential backoff
  // This pattern helps handle transient network issues and Firestore rate limiting
  // by progressively increasing delay between retry attempts
  const retryOperation = async <T>(operation: () => Promise<T>, retries: number, backoff: number): Promise<T> => {
    try {
      return await operation();
    } catch (error) {
      if (retries <= 0) throw error;
      console.warn(`Retrying operation, ${retries} attempts left. Error:`, error);
      await new Promise((resolve) => setTimeout(resolve, backoff));
      return retryOperation(operation, retries - 1, backoff * 2);
    }
  };

  // Check network status
  const checkNetworkStatus = async () => {
    try {
      const networkState = await getNetworkStateAsync();
      setIsOnline(networkState.isConnected ?? true);
    } catch (error) {
      console.error('Error checking network status:', error);
      setIsOnline(false);
    }
  };

  useEffect(() => {
    checkNetworkStatus();
    if (user) {
      loadCachedUsage();
    }
  }, [user]);

  useEffect(() => {
    const fetchUsageData = async () => {
      if (!user || !isOnline) {
        console.log('Skipping Firestore fetch: user not authenticated or offline');
        return;
      }

      try {
        const userDocRef = doc(db, 'users', user.uid);
        const operation = async () => {
          const userDoc = await getDoc(userDocRef);
          let data;
          if (!userDoc.exists()) {
            // Create new user document if it doesn't exist
            const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
            data = { scansUsed: 0, plan: 'free', lastReset: currentMonthStart };
            await setDoc(userDocRef, data);
            console.log('Created new user document:', data);
          } else {
            data = userDoc.data();
            
            // Ensure lastReset exists - add it if missing
            if (!data.lastReset) {
              const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
              data.lastReset = currentMonthStart;
              data.scansUsed = 0; // Reset scansUsed when adding lastReset
              await setDoc(userDocRef, data, { merge: true });
              console.log('Added lastReset to user document:', data);
            } else {
              // Monthly reset logic
              const now = new Date();
              const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
              const lastReset = new Date(data.lastReset).toISOString();

              if (new Date(lastReset) < new Date(currentMonthStart)) {
                data.scansUsed = 0;
                data.lastReset = currentMonthStart;
                await setDoc(userDocRef, data, { merge: true });
                console.log('Reset scansUsed to 0 for new month:', data);
              }
            }
          }
          const limit = getLimitForPlan(data.plan || 'free', user.isAnonymous);
          const newUsageData = { scansUsed: data.scansUsed || 0, plan: data.plan || 'free', limit, lastReset: data.lastReset };
          setUsageData(newUsageData);
          await saveCachedUsage(newUsageData);
          
          // Set user properties for analytics when plan data is available
          updateUserAnalyticsProperties({
            planType: data.plan || 'free',
            isAnonymous: user.isAnonymous,
            subscriptionStatus: data.subscriptionStatus || 'free',
            signupDate: data.createdAt ? new Date(data.createdAt) : undefined,
            totalScans: data.scansUsed || 0,
            lastActiveDate: new Date(),
          });
          
          console.log('Fetched usage data:', newUsageData);
          return newUsageData;
        };
        await retryOperation(operation, MAX_RETRIES, INITIAL_BACKOFF);
      } catch (error) {
        console.error('Error fetching usage data:', error);
        await loadCachedUsage(); // Fallback to cached data
      }
    };

    fetchUsageData();
  }, [user, isOnline]);

  const checkUsageLimit = async () => {
    console.log('[useUsageTracking] ========== CHECKING USAGE LIMIT ==========');
    console.log('[useUsageTracking] Checking usage limit:', {
      user: user ? user.uid : 'No user',
      isOnline,
      currentUsage: usageData.scansUsed,
      limit: usageData.limit,
      plan: usageData.plan
    });
    
    if (!user) {
      console.log('[useUsageTracking] No user found, denying access');
      return false;
    }

    if (!isOnline) {
      console.log('[useUsageTracking] Checking cached usage limit due to offline status');
      const hasScansRemaining = usageData.scansUsed < usageData.limit;
      console.log('[useUsageTracking] Offline limit check result:', hasScansRemaining);
      return hasScansRemaining;
    }

    try {
      const userDocRef = doc(db, 'users', user.uid);
      const operation = async () => {
        const userDoc = await getDoc(userDocRef);
        let data;
        if (!userDoc.exists()) {
          // Create new user document if it doesn't exist
          const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
          data = { scansUsed: 0, plan: 'free', lastReset: currentMonthStart };
          await setDoc(userDocRef, data);
          console.log('Created new user document:', data);
        } else {
          data = userDoc.data();
          
          // Ensure lastReset exists - add it if missing
          if (!data.lastReset) {
            const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
            data.lastReset = currentMonthStart;
            data.scansUsed = 0; // Reset scansUsed when adding lastReset
            await setDoc(userDocRef, data, { merge: true });
            console.log('Added lastReset to user document:', data);
          } else {
            // Monthly reset logic
            // Automatically reset usage counters at the beginning of each calendar month
            // This ensures users get their full monthly allowance regardless of when they signed up
            const now = new Date();
            const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            const lastReset = new Date(data.lastReset).toISOString();

            if (new Date(lastReset) < new Date(currentMonthStart)) {
              data.scansUsed = 0;
              data.lastReset = currentMonthStart;
              await setDoc(userDocRef, data, { merge: true });
              console.log('Reset scansUsed to 0 for new month:', data);
            }
          }
        }
        const limit = getLimitForPlan(data.plan || 'free', user.isAnonymous);
        const newUsageData = { scansUsed: data.scansUsed || 0, plan: data.plan || 'free', limit, lastReset: data.lastReset };
        setUsageData(newUsageData);
        await saveCachedUsage(newUsageData);
        return newUsageData.scansUsed < newUsageData.limit;
      };
      return await retryOperation(operation, MAX_RETRIES, INITIAL_BACKOFF);
    } catch (error) {
      console.error('Error checking usage limit:', error);
      return usageData.scansUsed < usageData.limit; // Fallback to cached data
    }
  };

  const incrementScansUsed = async () => {
    console.log('[useUsageTracking] ========== INCREMENTING SCAN USAGE ==========');
    console.log('[useUsageTracking] Attempting to increment scans used:', {
      user: user ? user.uid : 'No user',
      isOnline,
      currentScansUsed: usageData.scansUsed,
      limit: usageData.limit,
      plan: usageData.plan
    });
    
    if (!user || !isOnline) {
      console.log('[useUsageTracking] Skipping scan increment: user not authenticated or offline');
      return;
    }

    try {
      const userDocRef = doc(db, 'users', user.uid);
      const operation = async () => {
        // Ensure document exists before incrementing
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists()) {
          console.log('[useUsageTracking] User document does not exist, creating new one');
          const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
          await setDoc(userDocRef, { scansUsed: 0, plan: 'free', lastReset: currentMonthStart });
          console.log('[useUsageTracking] Created new user document for increment:', { scansUsed: 0, plan: 'free', lastReset: currentMonthStart });
        }
        
        console.log('[useUsageTracking] Updating Firestore document with increment');
        await updateDoc(userDocRef, { scansUsed: increment(1) });
        
        setUsageData((prev) => {
          const newData = { ...prev, scansUsed: prev.scansUsed + 1 };
          console.log('[useUsageTracking] Updated local usage data:', newData);
          saveCachedUsage(newData);
          return newData;
        });
        console.log('[useUsageTracking] ✅ Successfully incremented scans used');
      };
      await retryOperation(operation, MAX_RETRIES, INITIAL_BACKOFF);
    } catch (error) {
      console.error('[useUsageTracking] ❌ Error incrementing scans:', error);
    }
  };

  return { usageData, checkUsageLimit, incrementScansUsed };
}