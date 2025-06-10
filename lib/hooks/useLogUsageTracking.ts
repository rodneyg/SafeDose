import { useState, useEffect } from 'react';
import { getFirestore, doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getNetworkStateAsync } from 'expo-network';

const MAX_RETRIES = 3;
const INITIAL_BACKOFF = 1000; // 1 second

// Helper function to determine log limits based on user plan and authentication status
const getLogLimitForPlan = (plan: string, isAnonymous: boolean) => {
  if (isAnonymous) return 10; // Anonymous users get 10 free logs
  if (plan === 'plus') return 100; // Plus plan gets 100 logs
  if (plan === 'pro') return -1; // Pro plan gets unlimited logs (-1 = unlimited)
  return 15; // Signed-in free users get 15 logs (increased from 10 for new registrants)
};

export function useLogUsageTracking() {
  const { user } = useAuth();
  const db = getFirestore();
  const [logUsageData, setLogUsageData] = useState({ 
    logsUsed: 0, 
    plan: 'free', 
    limit: 10, 
    lastReset: null 
  });
  const [isOnline, setIsOnline] = useState(true);

  // Load cached log usage data from AsyncStorage
  const loadCachedLogUsage = async () => {
    try {
      const cached = await AsyncStorage.getItem(`log_usage_${user?.uid || 'anonymous'}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        setLogUsageData(parsed);
        console.log('Loaded cached log usage:', parsed);
      }
    } catch (error) {
      console.error('Error loading cached log usage:', error);
    }
  };

  // Save log usage data to AsyncStorage
  const saveCachedLogUsage = async (data: { logsUsed: number; plan: string; limit: number; lastReset?: string | null }) => {
    try {
      await AsyncStorage.setItem(`log_usage_${user?.uid || 'anonymous'}`, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving cached log usage:', error);
    }
  };

  // Retry logic with exponential backoff
  const retryOperation = async <T>(operation: () => Promise<T>, retries: number, backoff: number): Promise<T> => {
    try {
      return await operation();
    } catch (error) {
      if (retries <= 0) throw error;
      console.warn(`Retrying log usage operation, ${retries} attempts left. Error:`, error);
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
      loadCachedLogUsage();
    }
  }, [user]);

  useEffect(() => {
    const fetchLogUsageData = async () => {
      if (!user || !isOnline) {
        console.log('Skipping log usage Firestore fetch: user not authenticated or offline');
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
            data = { logsUsed: 0, plan: 'free', lastLogReset: currentMonthStart };
            await setDoc(userDocRef, data, { merge: true });
            console.log('Created new user log tracking:', data);
          } else {
            data = userDoc.data();
            
            // Ensure lastLogReset exists - add it if missing
            if (!data.lastLogReset) {
              const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
              data.lastLogReset = currentMonthStart;
              data.logsUsed = 0; // Reset logsUsed when adding lastLogReset
              await setDoc(userDocRef, data, { merge: true });
              console.log('Added lastLogReset to user document:', data);
            } else {
              // Monthly reset logic for logs
              const now = new Date();
              const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
              const lastReset = new Date(data.lastLogReset).toISOString();

              if (new Date(lastReset) < new Date(currentMonthStart)) {
                data.logsUsed = 0;
                data.lastLogReset = currentMonthStart;
                await setDoc(userDocRef, data, { merge: true });
                console.log('Reset logsUsed to 0 for new month:', data);
              }
            }
          }
          const limit = getLogLimitForPlan(data.plan || 'free', user.isAnonymous);
          const newLogUsageData = { 
            logsUsed: data.logsUsed || 0, 
            plan: data.plan || 'free', 
            limit, 
            lastReset: data.lastLogReset 
          };
          setLogUsageData(newLogUsageData);
          await saveCachedLogUsage(newLogUsageData);
          
          console.log('Fetched log usage data:', newLogUsageData);
          return newLogUsageData;
        };
        await retryOperation(operation, MAX_RETRIES, INITIAL_BACKOFF);
      } catch (error) {
        console.error('Error fetching log usage data:', error);
        await loadCachedLogUsage(); // Fallback to cached data
      }
    };

    fetchLogUsageData();
  }, [user, isOnline]);

  const checkLogUsageLimit = async () => {
    console.log('[useLogUsageTracking] ========== CHECKING LOG USAGE LIMIT ==========');
    console.log('[useLogUsageTracking] Checking log usage limit:', {
      user: user ? user.uid : 'No user',
      isOnline,
      currentUsage: logUsageData.logsUsed,
      limit: logUsageData.limit,
      plan: logUsageData.plan
    });
    
    if (!user) {
      console.log('[useLogUsageTracking] No user found, denying access');
      return false;
    }

    // If limit is -1, it means unlimited
    if (logUsageData.limit === -1) {
      console.log('[useLogUsageTracking] Unlimited logs for this plan');
      return true;
    }

    if (!isOnline) {
      console.log('[useLogUsageTracking] Checking cached log usage limit due to offline status');
      const hasLogsRemaining = logUsageData.logsUsed < logUsageData.limit;
      console.log('[useLogUsageTracking] Offline log limit check result:', hasLogsRemaining);
      return hasLogsRemaining;
    }

    try {
      const userDocRef = doc(db, 'users', user.uid);
      const operation = async () => {
        const userDoc = await getDoc(userDocRef);
        let data;
        if (!userDoc.exists()) {
          // Create new user document if it doesn't exist
          const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
          data = { logsUsed: 0, plan: 'free', lastLogReset: currentMonthStart };
          await setDoc(userDocRef, data, { merge: true });
          console.log('Created new user document for log limit check:', data);
        } else {
          data = userDoc.data();
          
          // Ensure lastLogReset exists - add it if missing
          if (!data.lastLogReset) {
            const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
            data.lastLogReset = currentMonthStart;
            data.logsUsed = 0; // Reset logsUsed when adding lastLogReset
            await setDoc(userDocRef, data, { merge: true });
            console.log('Added lastLogReset to user document during limit check:', data);
          } else {
            // Monthly reset logic
            const now = new Date();
            const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            const lastReset = new Date(data.lastLogReset).toISOString();

            if (new Date(lastReset) < new Date(currentMonthStart)) {
              data.logsUsed = 0;
              data.lastLogReset = currentMonthStart;
              await setDoc(userDocRef, data, { merge: true });
              console.log('Reset logsUsed to 0 for new month during limit check:', data);
            }
          }
        }
        const limit = getLogLimitForPlan(data.plan || 'free', user.isAnonymous);
        const newLogUsageData = { 
          logsUsed: data.logsUsed || 0, 
          plan: data.plan || 'free', 
          limit, 
          lastReset: data.lastLogReset 
        };
        setLogUsageData(newLogUsageData);
        await saveCachedLogUsage(newLogUsageData);
        
        // If limit is -1, it means unlimited
        if (newLogUsageData.limit === -1) {
          return true;
        }
        
        return newLogUsageData.logsUsed < newLogUsageData.limit;
      };
      return await retryOperation(operation, MAX_RETRIES, INITIAL_BACKOFF);
    } catch (error) {
      console.error('Error checking log usage limit:', error);
      // Fallback to cached data
      if (logUsageData.limit === -1) {
        return true;
      }
      return logUsageData.logsUsed < logUsageData.limit;
    }
  };

  const incrementLogsUsed = async () => {
    console.log('[useLogUsageTracking] ========== INCREMENTING LOG USAGE ==========');
    console.log('[useLogUsageTracking] Attempting to increment logs used:', {
      user: user ? user.uid : 'No user',
      isOnline,
      currentLogsUsed: logUsageData.logsUsed,
      limit: logUsageData.limit,
      plan: logUsageData.plan
    });
    
    if (!user || !isOnline) {
      console.log('[useLogUsageTracking] Skipping log increment: user not authenticated or offline');
      return;
    }

    try {
      const userDocRef = doc(db, 'users', user.uid);
      const operation = async () => {
        // Ensure document exists before incrementing
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists()) {
          console.log('[useLogUsageTracking] User document does not exist, creating new one');
          const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
          await setDoc(userDocRef, { logsUsed: 0, plan: 'free', lastLogReset: currentMonthStart }, { merge: true });
          console.log('[useLogUsageTracking] Created new user document for log increment:', { logsUsed: 0, plan: 'free', lastLogReset: currentMonthStart });
        }
        
        console.log('[useLogUsageTracking] Updating Firestore document with log increment');
        await updateDoc(userDocRef, { logsUsed: increment(1) });
        
        setLogUsageData((prev) => {
          const newData = { ...prev, logsUsed: prev.logsUsed + 1 };
          console.log('[useLogUsageTracking] Updated local log usage data:', newData);
          saveCachedLogUsage(newData);
          return newData;
        });
        console.log('[useLogUsageTracking] ✅ Successfully incremented logs used');
      };
      await retryOperation(operation, MAX_RETRIES, INITIAL_BACKOFF);
    } catch (error) {
      console.error('[useLogUsageTracking] ❌ Error incrementing logs:', error);
    }
  };

  return { logUsageData, checkLogUsageLimit, incrementLogsUsed };
}