import { useState, useCallback } from 'react';
import { getFirestore, collection, addDoc, doc, deleteDoc, query, where, orderBy, getDocs } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DoseLog, InjectionSite } from '../../types/doseLog';
import { useLogUsageTracking } from './useLogUsageTracking';

export function useDoseLogging() {
  const { user } = useAuth();
  const db = getFirestore();
  const [isLogging, setIsLogging] = useState(false);
  const { logUsageData, checkLogUsageLimit, incrementLogsUsed } = useLogUsageTracking();

  // Save dose log to local storage
  const saveDoseLogLocally = useCallback(async (doseLog: DoseLog) => {
    try {
      const storageKey = `dose_logs_${user?.uid || 'anonymous'}`;
      console.log('[useDoseLogging] 💾 Saving dose log locally with key:', storageKey);
      console.log('[useDoseLogging] 💾 Dose log details:', {
        id: doseLog.id,
        substance: doseLog.substanceName,
        doseValue: doseLog.doseValue,
        unit: doseLog.unit,
        timestamp: doseLog.timestamp
      });
      
      const existingLogs = await AsyncStorage.getItem(storageKey);
      const logsList: DoseLog[] = existingLogs ? JSON.parse(existingLogs) : [];
      console.log('[useDoseLogging] 💾 Existing logs count before save:', logsList.length);
      
      logsList.unshift(doseLog); // Add to beginning for recent-first order
      
      // Keep only the last 100 log entries to prevent storage bloat
      if (logsList.length > 100) {
        logsList.splice(100);
      }
      
      await AsyncStorage.setItem(storageKey, JSON.stringify(logsList));
      console.log('[useDoseLogging] 💾 Dose log saved locally successfully. Total logs:', logsList.length);
    } catch (error) {
      console.error('[useDoseLogging] ❌ Error saving dose log locally:', error);
    }
  }, [user]);

  // Save dose log to Firestore (for authenticated users)
  const saveDoseLogToFirestore = useCallback(async (doseLog: DoseLog): Promise<string | null> => {
    if (!user || user.isAnonymous) {
      console.log('Skipping Firestore save for anonymous user');
      return null;
    }

    try {
      const doseLogsCollection = collection(db, 'dose_logs');
      const docRef = await addDoc(doseLogsCollection, {
        ...doseLog,
        userId: user.uid,
      });
      console.log('Dose log saved to Firestore:', doseLog.id, 'Document ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error saving dose log to Firestore:', error);
      // Don't throw error - local storage is the fallback
      return null;
    }
  }, [user, db]);

  // Load dose logs from Firestore (for authenticated users)
  const loadDoseLogsFromFirestore = useCallback(async (): Promise<DoseLog[]> => {
    if (!user || user.isAnonymous) {
      console.log('Skipping Firestore load for anonymous user');
      return [];
    }

    try {
      const doseLogsCollection = collection(db, 'dose_logs');
      const q = query(
        doseLogsCollection,
        where('userId', '==', user.uid),
        orderBy('timestamp', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      const logs: DoseLog[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        logs.push({
          id: data.id,
          userId: data.userId,
          substanceName: data.substanceName,
          doseValue: data.doseValue,
          unit: data.unit,
          calculatedVolume: data.calculatedVolume,
          syringeType: data.syringeType,
          recommendedMarking: data.recommendedMarking,
          injectionSite: data.injectionSite,
          timestamp: data.timestamp,
          notes: data.notes,
          firestoreId: doc.id, // Store the Firestore document ID
          // Enhanced fields for complete dose recreation
          medicationInputType: data.medicationInputType,
          concentrationAmount: data.concentrationAmount,
          concentrationUnit: data.concentrationUnit,
          totalAmount: data.totalAmount,
          solutionVolume: data.solutionVolume,
          syringeVolume: data.syringeVolume,
          calculatedConcentration: data.calculatedConcentration,
        });
      });
      
      console.log('Loaded', logs.length, 'dose logs from Firestore');
      return logs;
    } catch (error) {
      console.error('Error loading dose logs from Firestore:', error);
      return [];
    }
  }, [user, db]);

  // Automatically log a completed dose
  const logDose = useCallback(async (
    doseInfo: {
      substanceName: string;
      doseValue: number | null;
      unit: string;
      calculatedVolume: number | null;
      syringeType?: 'Insulin' | 'Standard' | null;
      recommendedMarking?: string | null;
      injectionSite?: InjectionSite | null;
      // Enhanced fields for complete dose recreation
      medicationInputType?: 'concentration' | 'totalAmount' | null;
      concentrationAmount?: string | null;
      concentrationUnit?: 'mg/ml' | 'mcg/ml' | 'units/ml' | null;
      totalAmount?: string | null;
      solutionVolume?: string | null;
      syringeVolume?: string | null;
      calculatedConcentration?: number | null;
    },
    notes?: string
  ): Promise<{ success: boolean; limitReached?: boolean }> => {
    console.log('[useDoseLogging] 🎯 logDose called with:', {
      substanceName: doseInfo.substanceName,
      doseValue: doseInfo.doseValue,
      unit: doseInfo.unit,
      calculatedVolume: doseInfo.calculatedVolume,
      isLogging,
      user: user?.uid || 'anonymous'
    });
    
    if (isLogging) {
      console.log('[useDoseLogging] 🎯 Already logging, skipping...');
      return { success: false };
    }
    
    setIsLogging(true);
    
    try {
      // Only proceed if we have valid dose info
      if (!doseInfo.doseValue || !doseInfo.calculatedVolume) {
        console.warn('[useDoseLogging] ⚠️ Incomplete dose info, skipping dose logging:', {
          hasDoseValue: !!doseInfo.doseValue,
          hasCalculatedVolume: !!doseInfo.calculatedVolume
        });
        return { success: false };
      }

      // Check if user has reached log limit
      const canLog = await checkLogUsageLimit();
      if (!canLog) {
        console.log('[useDoseLogging] 🚫 Log limit reached, cannot save dose log');
        return { success: false, limitReached: true };
      }

      const doseLog: DoseLog = {
        id: `dose_log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: user?.uid,
        substanceName: doseInfo.substanceName,
        doseValue: doseInfo.doseValue,
        unit: doseInfo.unit,
        calculatedVolume: doseInfo.calculatedVolume,
        syringeType: doseInfo.syringeType || undefined,
        recommendedMarking: doseInfo.recommendedMarking || undefined,
        injectionSite: doseInfo.injectionSite || undefined,
        timestamp: new Date().toISOString(),
        notes,
        // Enhanced fields for complete dose recreation
        medicationInputType: doseInfo.medicationInputType || undefined,
        concentrationAmount: doseInfo.concentrationAmount || undefined,
        concentrationUnit: doseInfo.concentrationUnit || undefined,
        totalAmount: doseInfo.totalAmount || undefined,
        solutionVolume: doseInfo.solutionVolume || undefined,
        syringeVolume: doseInfo.syringeVolume || undefined,
        calculatedConcentration: doseInfo.calculatedConcentration || undefined,
      };

      console.log('[useDoseLogging] 🎯 Created dose log object:', {
        id: doseLog.id,
        userId: doseLog.userId,
        substanceName: doseLog.substanceName,
        timestamp: doseLog.timestamp
      });

      // Try to save to Firestore first (for authenticated users)
      const firestoreId = await saveDoseLogToFirestore(doseLog);
      
      // Add Firestore ID to the log if it was saved successfully
      if (firestoreId) {
        doseLog.firestoreId = firestoreId;
        console.log('[useDoseLogging] 🎯 Firestore save successful, ID:', firestoreId);
      }
      
      // Save locally (always works, now includes Firestore ID if available)
      await saveDoseLogLocally(doseLog);
      
      // Increment log usage count
      await incrementLogsUsed();
      
      console.log('[useDoseLogging] 🎯 Dose logged successfully! ID:', doseLog.id);
      return { success: true };
    } catch (error) {
      console.error('[useDoseLogging] ❌ Error logging dose:', error);
      // Don't throw - we want logging to be non-blocking
      return { success: false };
    } finally {
      setIsLogging(false);
      console.log('[useDoseLogging] 🎯 logDose completed, isLogging set to false');
    }
  }, [isLogging, user, saveDoseLogLocally, saveDoseLogToFirestore, checkLogUsageLimit, incrementLogsUsed]);

  // Get dose log history from local storage and Firestore (merged)
  const getDoseLogHistory = useCallback(async (): Promise<DoseLog[]> => {
    try {
      const storageKey = `dose_logs_${user?.uid || 'anonymous'}`;
      console.log('[useDoseLogging] 📚 getDoseLogHistory called with storageKey:', storageKey);
      
      // Load from local storage
      const localLogData = await AsyncStorage.getItem(storageKey);
      const localLogs: DoseLog[] = localLogData ? JSON.parse(localLogData) : [];
      console.log('[useDoseLogging] 📚 Local storage loaded:', {
        hasData: !!localLogData,
        dataLength: localLogData?.length || 0,
        logsCount: localLogs.length,
        firstLogId: localLogs[0]?.id || 'none'
      });
      
      // Load from Firestore for authenticated users
      const firestoreLogs = await loadDoseLogsFromFirestore();
      console.log('[useDoseLogging] 📚 Firestore loaded:', {
        logsCount: firestoreLogs.length,
        firstLogId: firestoreLogs[0]?.id || 'none'
      });
      
      // Merge logs, avoiding duplicates (prioritize local logs)
      const mergedLogs = new Map<string, DoseLog>();
      
      // Add Firestore logs first
      firestoreLogs.forEach(log => {
        mergedLogs.set(log.id, log);
      });
      
      // Add local logs (will overwrite Firestore logs with same ID)
      localLogs.forEach(log => {
        mergedLogs.set(log.id, log);
      });
      
      // Convert back to array and sort by timestamp (most recent first)
      const allLogs = Array.from(mergedLogs.values()).sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      console.log('[useDoseLogging] 📚 Final merged logs:', {
        totalLogs: allLogs.length,
        mostRecentId: allLogs[0]?.id || 'none',
        mostRecentSubstance: allLogs[0]?.substanceName || 'none',
        mostRecentTimestamp: allLogs[0]?.timestamp || 'none'
      });
      
      // Update local storage with merged logs (for offline access)
      if (firestoreLogs.length > 0) {
        await AsyncStorage.setItem(storageKey, JSON.stringify(allLogs.slice(0, 100)));
        console.log('[useDoseLogging] 📚 Updated local storage with merged logs');
      }
      
      return allLogs;
    } catch (error) {
      console.error('[useDoseLogging] ❌ Error loading dose log history:', error);
      return [];
    }
  }, [user, loadDoseLogsFromFirestore]);

  // Delete a dose log entry
  const deleteDoseLog = useCallback(async (logId: string) => {
    try {
      const storageKey = `dose_logs_${user?.uid || 'anonymous'}`;
      const existingLogs = await AsyncStorage.getItem(storageKey);
      const logsList: DoseLog[] = existingLogs ? JSON.parse(existingLogs) : [];
      
      // Find the log to get its Firestore ID
      const logToDelete = logsList.find(log => log.id === logId);
      
      // Remove from local storage
      const updatedLogs = logsList.filter(log => log.id !== logId);
      await AsyncStorage.setItem(storageKey, JSON.stringify(updatedLogs));
      
      console.log('Dose log deleted locally:', logId);
      
      // Also delete from Firestore if user is authenticated and log has Firestore ID
      if (user && !user.isAnonymous && logToDelete?.firestoreId) {
        try {
          const docRef = doc(db, 'dose_logs', logToDelete.firestoreId);
          await deleteDoc(docRef);
          console.log('Dose log deleted from Firestore:', logToDelete.firestoreId);
        } catch (firestoreError) {
          console.error('Error deleting from Firestore:', firestoreError);
          // Don't throw - local deletion was successful
        }
      }
      
    } catch (error) {
      console.error('Error deleting dose log:', error);
      throw error; // Re-throw so UI can handle the error
    }
  }, [user, db]);

  // Sync local logs to Firestore (useful when user signs in)
  const syncLogsToFirestore = useCallback(async () => {
    if (!user || user.isAnonymous) {
      console.log('Skipping sync for anonymous user');
      return;
    }

    try {
      const storageKey = `dose_logs_${user.uid}`;
      const localLogData = await AsyncStorage.getItem(storageKey);
      const localLogs: DoseLog[] = localLogData ? JSON.parse(localLogData) : [];
      
      // Get logs that don't have Firestore IDs yet
      const logsToSync = localLogs.filter(log => !log.firestoreId);
      
      if (logsToSync.length === 0) {
        console.log('No local logs to sync to Firestore');
        return;
      }
      
      console.log('Syncing', logsToSync.length, 'local logs to Firestore');
      
      // Sync each log to Firestore
      for (const log of logsToSync) {
        const firestoreId = await saveDoseLogToFirestore(log);
        if (firestoreId) {
          log.firestoreId = firestoreId;
        }
      }
      
      // Update local storage with the new Firestore IDs
      await AsyncStorage.setItem(storageKey, JSON.stringify(localLogs));
      
      console.log('Sync completed');
    } catch (error) {
      console.error('Error syncing logs to Firestore:', error);
    }
  }, [user, saveDoseLogToFirestore]);

  // Get the most recent dose log entry
  const getMostRecentDose = useCallback(async (): Promise<DoseLog | null> => {
    try {
      console.log('[useDoseLogging] 🔎 getMostRecentDose called');
      console.log('[useDoseLogging] 🔎 User info:', {
        hasUser: !!user,
        uid: user?.uid || 'none',
        isAnonymous: user?.isAnonymous ?? 'unknown'
      });
      
      const logs = await getDoseLogHistory();
      const recentDose = logs.length > 0 ? logs[0] : null; // logs are already sorted by timestamp desc
      
      console.log('[useDoseLogging] 🔎 getDoseLogHistory returned:', {
        totalLogs: logs.length,
        logIds: logs.slice(0, 3).map(log => ({ id: log.id, substance: log.substanceName, timestamp: log.timestamp }))
      });
      
      console.log('[useDoseLogging] 🔎 getMostRecentDose result:', {
        hasRecentDose: !!recentDose,
        doseId: recentDose?.id || 'none',
        doseSubstance: recentDose?.substanceName || 'none',
        doseValue: recentDose?.doseValue || 'none',
        doseUnit: recentDose?.unit || 'none',
        doseTimestamp: recentDose?.timestamp || 'none',
        totalLogs: logs.length,
        user: user?.uid || 'anonymous'
      });
      
      return recentDose;
    } catch (error) {
      console.error('[useDoseLogging] ❌ Error getting most recent dose:', error);
      return null;
    }
  }, [getDoseLogHistory, user?.uid]);

  return {
    logDose,
    getDoseLogHistory,
    getMostRecentDose,
    deleteDoseLog,
    syncLogsToFirestore,
    isLogging,
    logUsageData,
  };
}