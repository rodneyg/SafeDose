import { useState, useCallback, useRef } from 'react';
import { getFirestore, collection, doc, deleteDoc, query, where, orderBy, getDocs } from 'firebase/firestore';
import { addDocWithEnv } from '../firestoreWithEnv';
import { useAuth } from '../../contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DoseLog, DoseLogContext } from '../../types/doseLog';
import { useLogUsageTracking } from './useLogUsageTracking';
import { resolveDoseTimestamp, sortLogsNewestFirst } from '../doseLogTimestamp';

/** Logs completed doses and exposes the current log-limit state. */
export function useDoseLogging() {
  const { user } = useAuth();
  const db = getFirestore();
  const [isLogging, setIsLogging] = useState(false);
  const isLoggingRef = useRef(false);
  const { logUsageData, checkLogUsageLimit, incrementLogsUsed } = useLogUsageTracking();

  // Save dose log to local storage
  const saveDoseLogLocally = useCallback(async (doseLog: DoseLog) => {
    try {
      const storageKey = `dose_logs_${user?.uid || 'anonymous'}`;
      console.log('[useDoseLogging] Saving dose log locally with key:', storageKey);
      
      const existingLogs = await AsyncStorage.getItem(storageKey);
      const logsList: DoseLog[] = existingLogs ? JSON.parse(existingLogs) : [];
      
      console.log('[useDoseLogging] Existing logs count:', logsList.length);
      
      // Keep the list sorted newest first by the log timestamp (a backdated dose
      // lands in its place, not at the top).
      logsList.push(doseLog);
      const sortedLogs = sortLogsNewestFirst(logsList);
      
      // Keep only the last 100 log entries to prevent storage bloat
      logsList.length = 0;
      logsList.push(...sortedLogs.slice(0, 100));
      
      await AsyncStorage.setItem(storageKey, JSON.stringify(logsList));
      console.log('[useDoseLogging] Dose log saved locally:', doseLog.id, 'Total logs:', logsList.length);
      
      // Verify the save worked by immediately reading it back
      const verification = await AsyncStorage.getItem(storageKey);
      if (verification) {
        const verifiedLogs = JSON.parse(verification);
        console.log('[useDoseLogging] Verification: saved logs count =', verifiedLogs.length);
      } else {
        console.warn('[useDoseLogging] Warning: Verification failed - no data found after save');
      }
      return logsList.length;
    } catch (error) {
      console.error('[useDoseLogging] Error saving dose log locally:', error);
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
      const firestoreDoseLog = Object.fromEntries(
        Object.entries({ ...doseLog, userId: user.uid })
          .filter(([, value]) => value !== undefined)
      );
      const docRef = await addDocWithEnv(doseLogsCollection, firestoreDoseLog);
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
          insulinScale: data.insulinScale,
          totalAmountUnit: data.totalAmountUnit,
          concentrationExact: data.concentrationExact,
          injectionSite: data.injectionSite,
          timestamp: data.timestamp,
          notes: data.notes,
          protocolOccurrence: data.protocolOccurrence,
          firestoreId: doc.id, // Store the Firestore document ID
          
          // Original user inputs for "Use Last Dose" feature (may not exist in older logs)
          medicationInputType: data.medicationInputType,
          concentrationAmount: data.concentrationAmount,
          concentrationUnit: data.concentrationUnit,
          totalAmount: data.totalAmount,
          solutionVolume: data.solutionVolume,
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
    doseInfo: DoseLogContext,
    notes?: string
  ): Promise<{ success: boolean; limitReached?: boolean; localDoseCount?: number }> => {
    if (isLoggingRef.current) return { success: false };
    
    isLoggingRef.current = true;
    setIsLogging(true);
    
    try {
      console.log('[useDoseLogging] Attempting to log dose with info:', {
        substanceName: doseInfo.substanceName,
        doseValue: doseInfo.doseValue,
        unit: doseInfo.unit,
        calculatedVolume: doseInfo.calculatedVolume,
        syringeType: doseInfo.syringeType,
        hasSubstanceName: !!doseInfo.substanceName,
        hasDoseValue: !!doseInfo.doseValue,
        hasUnit: !!doseInfo.unit,
        hasCalculatedVolume: !!doseInfo.calculatedVolume,
      });
      
      // Only proceed if we have valid dose info
      if (!doseInfo.doseValue || !doseInfo.calculatedVolume) {
        console.warn('[useDoseLogging] Incomplete dose info, skipping dose logging:', {
          doseValue: doseInfo.doseValue,
          calculatedVolume: doseInfo.calculatedVolume
        });
        return { success: false };
      }

      // Use the time the user picked, or now. Reject future or older than 30 days.
      const stamp = resolveDoseTimestamp(doseInfo.loggedAt);
      if (!stamp.ok) {
        console.warn('[useDoseLogging] Invalid dose time:', stamp.reason);
        return { success: false };
      }

      // Check if user has reached log limit
      const canLog = await checkLogUsageLimit();
      if (!canLog) {
        console.log('[useDoseLogging] Log limit reached, cannot save dose log');
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
        insulinScale: doseInfo.insulinScale,
        totalAmountUnit: doseInfo.totalAmountUnit,
        concentrationExact: doseInfo.concentrationExact,
        injectionSite: doseInfo.injectionSite || undefined,
        timestamp: stamp.iso,
        notes,
        ...(doseInfo.protocolOccurrence && { protocolOccurrence: doseInfo.protocolOccurrence }),
        
        // Original user inputs for "Use Last Dose" feature
        medicationInputType: doseInfo.medicationInputType || undefined,
        concentrationAmount: doseInfo.concentrationAmount || undefined,
        concentrationUnit: doseInfo.concentrationUnit || undefined,
        totalAmount: doseInfo.totalAmount || undefined,
        solutionVolume: doseInfo.solutionVolume || undefined,
      };

      console.log('[useDoseLogging] Created dose log:', doseLog);

      // Try to save to Firestore first (for authenticated users)
      const firestoreId = await saveDoseLogToFirestore(doseLog);
      
      // Add Firestore ID to the log if it was saved successfully
      if (firestoreId) {
        doseLog.firestoreId = firestoreId;
      }
      
      // Save locally (now includes Firestore ID if available)
      const localDoseCount = await saveDoseLogLocally(doseLog);

      // A cloud copy can preserve the dose when browser storage is full. For a
      // guest, however, a failed local write means there is no saved dose.
      if (localDoseCount === undefined && !firestoreId) {
        return { success: false };
      }
      
      // Increment log usage count
      await incrementLogsUsed();
      
      console.log('Dose logged successfully:', doseLog.id);
      return { success: true, localDoseCount };
    } catch (error) {
      console.error('Error logging dose:', error);
      // Don't throw - we want logging to be non-blocking
      return { success: false };
    } finally {
      isLoggingRef.current = false;
      setIsLogging(false);
    }
  }, [user, saveDoseLogLocally, saveDoseLogToFirestore, checkLogUsageLimit, incrementLogsUsed]);

  // Get dose log history from local storage and Firestore (merged)
  const getDoseLogHistory = useCallback(async (): Promise<DoseLog[]> => {
    try {
      const storageKey = `dose_logs_${user?.uid || 'anonymous'}`;
      console.log('[useDoseLogging] Loading dose history with key:', storageKey);
      
      // Load from local storage
      const localLogData = await AsyncStorage.getItem(storageKey);
      console.log('[useDoseLogging] Raw local storage data:', localLogData ? 'found' : 'not found');
      
      const localLogs: DoseLog[] = localLogData ? JSON.parse(localLogData) : [];
      console.log('[useDoseLogging] Parsed local logs count:', localLogs.length);
      
      // Load from Firestore for authenticated users
      const firestoreLogs = await loadDoseLogsFromFirestore();
      console.log('[useDoseLogging] Firestore logs count:', firestoreLogs.length);
      
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
      
      console.log('[useDoseLogging] Final merged logs count:', allLogs.length);
      
      // For debugging - log the first few entries
      if (allLogs.length > 0) {
        console.log('[useDoseLogging] First log entry:', {
          id: allLogs[0].id,
          substanceName: allLogs[0].substanceName,
          doseValue: allLogs[0].doseValue,
          unit: allLogs[0].unit,
          calculatedVolume: allLogs[0].calculatedVolume,
          timestamp: allLogs[0].timestamp
        });
      }
      
      // Update local storage with merged logs (for offline access)
      if (firestoreLogs.length > 0) {
        try {
          await AsyncStorage.setItem(storageKey, JSON.stringify(allLogs.slice(0, 100)));
          console.log('[useDoseLogging] Updated local storage with merged logs');
        } catch (error) {
          console.error('[useDoseLogging] Error caching dose history:', error);
        }
      }
      
      return allLogs;
    } catch (error) {
      console.error('[useDoseLogging] Error loading dose log history:', error);
      return [];
    }
  }, [user, loadDoseLogsFromFirestore]);

  // Delete a dose log entry
  const deleteDoseLog = useCallback(async (logId: string) => {
    try {
      const storageKey = `dose_logs_${user?.uid || 'anonymous'}`;
      const existingLogs = await AsyncStorage.getItem(storageKey);
      const logsList: DoseLog[] = existingLogs ? JSON.parse(existingLogs) : [];
      
      let logToDelete = logsList.find(log => log.id === logId);

      // Cloud history can contain logs outside the 100-entry local cache.
      // Resolve those by stable log ID before changing local data.
      if (user && !user.isAnonymous && !logToDelete?.firestoreId) {
        const doseLogsCollection = collection(db, 'dose_logs');
        const q = query(
          doseLogsCollection,
          where('userId', '==', user.uid),
          where('id', '==', logId)
        );
        const querySnapshot = await getDocs(q);
        const matchingDoc = querySnapshot.docs[0];
        if (matchingDoc) {
          logToDelete = { ...matchingDoc.data(), firestoreId: matchingDoc.id } as DoseLog;
        }
      }

      if (user && !user.isAnonymous && logToDelete?.firestoreId) {
        const docRef = doc(db, 'dose_logs', logToDelete.firestoreId);
        try {
          await deleteDoc(docRef);
        } catch (firestoreError) {
          console.error('Error deleting from Firestore:', firestoreError);
          throw firestoreError;
        }
        console.log('Dose log deleted from Firestore:', logToDelete.firestoreId);
      }

      // Keep the local copy if the cloud deletion fails, so retry remains possible.
      const updatedLogs = logsList.filter(log => log.id !== logId);
      await AsyncStorage.setItem(storageKey, JSON.stringify(updatedLogs));
      console.log('Dose log deleted locally:', logId);
      
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

  return {
    logDose,
    getDoseLogHistory,
    deleteDoseLog,
    syncLogsToFirestore,
    isLogging,
    logUsageData,
  };
}
