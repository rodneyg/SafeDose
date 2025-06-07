import { useState, useCallback } from 'react';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DoseLog } from '../../types/doseLog';

export function useDoseLogging() {
  const { user } = useAuth();
  const db = getFirestore();
  const [isLogging, setIsLogging] = useState(false);

  // Save dose log to local storage
  const saveDoseLogLocally = useCallback(async (doseLog: DoseLog) => {
    try {
      const storageKey = `dose_logs_${user?.uid || 'anonymous'}`;
      const existingLogs = await AsyncStorage.getItem(storageKey);
      const logsList: DoseLog[] = existingLogs ? JSON.parse(existingLogs) : [];
      
      logsList.unshift(doseLog); // Add to beginning for recent-first order
      
      // Keep only the last 100 log entries to prevent storage bloat
      if (logsList.length > 100) {
        logsList.splice(100);
      }
      
      await AsyncStorage.setItem(storageKey, JSON.stringify(logsList));
      console.log('Dose log saved locally:', doseLog.id);
    } catch (error) {
      console.error('Error saving dose log locally:', error);
    }
  }, [user]);

  // Save dose log to Firestore (for authenticated users)
  const saveDoseLogToFirestore = useCallback(async (doseLog: DoseLog) => {
    if (!user || user.isAnonymous) {
      console.log('Skipping Firestore save for anonymous user');
      return;
    }

    try {
      const doseLogsCollection = collection(db, 'dose_logs');
      await addDoc(doseLogsCollection, {
        ...doseLog,
        userId: user.uid,
      });
      console.log('Dose log saved to Firestore:', doseLog.id);
    } catch (error) {
      console.error('Error saving dose log to Firestore:', error);
      // Don't throw error - local storage is the fallback
    }
  }, [user, db]);

  // Automatically log a completed dose
  const logDose = useCallback(async (
    doseInfo: {
      substanceName: string;
      doseValue: number | null;
      unit: string;
      calculatedVolume: number | null;
    },
    notes?: string
  ) => {
    if (isLogging) return;
    
    setIsLogging(true);
    
    try {
      // Only proceed if we have valid dose info
      if (!doseInfo.doseValue || !doseInfo.calculatedVolume) {
        console.warn('Incomplete dose info, skipping dose logging');
        return;
      }

      const doseLog: DoseLog = {
        id: `dose_log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: user?.uid,
        substanceName: doseInfo.substanceName,
        doseValue: doseInfo.doseValue,
        unit: doseInfo.unit,
        calculatedVolume: doseInfo.calculatedVolume,
        timestamp: new Date().toISOString(),
        notes,
      };

      // Save locally first (always works)
      await saveDoseLogLocally(doseLog);
      
      // Try to save to Firestore (for authenticated users)
      await saveDoseLogToFirestore(doseLog);
      
      console.log('Dose logged successfully:', doseLog.id);
    } catch (error) {
      console.error('Error logging dose:', error);
      // Don't throw - we want logging to be non-blocking
    } finally {
      setIsLogging(false);
    }
  }, [isLogging, user, saveDoseLogLocally, saveDoseLogToFirestore]);

  // Get dose log history from local storage
  const getDoseLogHistory = useCallback(async (): Promise<DoseLog[]> => {
    try {
      const storageKey = `dose_logs_${user?.uid || 'anonymous'}`;
      const logData = await AsyncStorage.getItem(storageKey);
      return logData ? JSON.parse(logData) : [];
    } catch (error) {
      console.error('Error loading dose log history:', error);
      return [];
    }
  }, [user]);

  // Delete a dose log entry
  const deleteDoseLog = useCallback(async (logId: string) => {
    try {
      const storageKey = `dose_logs_${user?.uid || 'anonymous'}`;
      const existingLogs = await AsyncStorage.getItem(storageKey);
      const logsList: DoseLog[] = existingLogs ? JSON.parse(existingLogs) : [];
      
      const updatedLogs = logsList.filter(log => log.id !== logId);
      await AsyncStorage.setItem(storageKey, JSON.stringify(updatedLogs));
      
      console.log('Dose log deleted locally:', logId);
      
      // TODO: Also delete from Firestore if user is authenticated
      // This would require storing the Firestore document ID with each log
      
    } catch (error) {
      console.error('Error deleting dose log:', error);
      throw error; // Re-throw so UI can handle the error
    }
  }, [user]);

  return {
    logDose,
    getDoseLogHistory,
    deleteDoseLog,
    isLogging,
  };
}