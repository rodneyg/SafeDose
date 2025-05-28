import { useState, useEffect } from 'react';
import { getFirestore, doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getNetworkStateAsync } from 'expo-network';
import { setAnalyticsUserProperties, USER_PROPERTIES } from '../analytics';

const MAX_RETRIES = 3;
const INITIAL_BACKOFF = 1000; // 1 second

export function useUsageTracking() {
  const { user } = useAuth();
  const db = getFirestore();
  const [usageData, setUsageData] = useState({ scansUsed: 0, plan: 'free', limit: 5 });
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
  const saveCachedUsage = async (data: { scansUsed: number; plan: string; limit: number }) => {
    try {
      await AsyncStorage.setItem(`usage_${user?.uid || 'anonymous'}`, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving cached usage:', error);
    }
  };

  // Retry logic with exponential backoff
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
            data = { scansUsed: 0, plan: 'free' };
            await setDoc(userDocRef, data);
            console.log('Created new user document:', data);
          } else {
            data = userDoc.data();
          }
          const limit = data.plan === 'free' ? (user.isAnonymous ? 5 : 15) : data.plan === 'plus' ? 150 : 500;
          const newUsageData = { scansUsed: data.scansUsed || 0, plan: data.plan || 'free', limit };
          setUsageData(newUsageData);
          await saveCachedUsage(newUsageData);
          
          // Set user properties for analytics when plan data is available
          setAnalyticsUserProperties({
            [USER_PROPERTIES.PLAN_TYPE]: data.plan || 'free',
            [USER_PROPERTIES.IS_ANONYMOUS]: user.isAnonymous,
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
    if (!user) return false;

    if (!isOnline) {
      console.log('Checking cached usage limit due to offline status');
      return usageData.scansUsed < usageData.limit;
    }

    try {
      const userDocRef = doc(db, 'users', user.uid);
      const operation = async () => {
        const userDoc = await getDoc(userDocRef);
        let data;
        if (!userDoc.exists()) {
          // Create new user document if it doesn't exist
          data = { scansUsed: 0, plan: 'free' };
          await setDoc(userDocRef, data);
          console.log('Created new user document:', data);
        } else {
          data = userDoc.data();
        }
        const limit = data.plan === 'free' ? (user.isAnonymous ? 5 : 15) : data.plan === 'plus' ? 150 : 500;
        const newUsageData = { scansUsed: data.scansUsed || 0, plan: data.plan || 'free', limit };
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
    if (!user || !isOnline) {
      console.log('Skipping scan increment: user not authenticated or offline');
      return;
    }

    try {
      const userDocRef = doc(db, 'users', user.uid);
      const operation = async () => {
        // Ensure document exists before incrementing
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists()) {
          await setDoc(userDocRef, { scansUsed: 0, plan: 'free' });
          console.log('Created new user document for increment:', { scansUsed: 0, plan: 'free' });
        }
        await updateDoc(userDocRef, { scansUsed: increment(1) });
        setUsageData((prev) => {
          const newData = { ...prev, scansUsed: prev.scansUsed + 1 };
          saveCachedUsage(newData);
          return newData;
        });
        console.log('Incremented scans used');
      };
      await retryOperation(operation, MAX_RETRIES, INITIAL_BACKOFF);
    } catch (error) {
      console.error('Error incrementing scans:', error);
    }
  };

  return { usageData, checkUsageLimit, incrementScansUsed };
}