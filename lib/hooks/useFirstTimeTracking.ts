import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../contexts/AuthContext';

interface FirstTimeState {
  firstScanCompleted: boolean;
  firstLogsViewed: boolean;
  hasUsedManualEntryOnly: boolean;
}

export function useFirstTimeTracking() {
  const { user } = useAuth();
  const [firstTimeState, setFirstTimeState] = useState<FirstTimeState>({
    firstScanCompleted: false,
    firstLogsViewed: false,
    hasUsedManualEntryOnly: false,
  });

  const getStorageKey = (action: string) => {
    return `first_time_${action}_${user?.uid || 'anonymous'}`;
  };

  // Load existing first-time state on mount
  useEffect(() => {
    const loadFirstTimeState = async () => {
      try {
        const [scanCompleted, logsViewed, manualEntryOnly] = await Promise.all([
          AsyncStorage.getItem(getStorageKey('scan_completed')),
          AsyncStorage.getItem(getStorageKey('logs_viewed')),
          AsyncStorage.getItem(getStorageKey('manual_entry_only')),
        ]);

        setFirstTimeState({
          firstScanCompleted: scanCompleted === 'true',
          firstLogsViewed: logsViewed === 'true',
          hasUsedManualEntryOnly: manualEntryOnly === 'true',
        });
      } catch (error) {
        console.error('[FirstTimeTracking] Error loading first time state:', error);
      }
    };

    loadFirstTimeState();
  }, [user?.uid]);

  const markFirstScanCompleted = async () => {
    try {
      await AsyncStorage.setItem(getStorageKey('scan_completed'), 'true');
      setFirstTimeState(prev => ({ ...prev, firstScanCompleted: true }));
    } catch (error) {
      console.error('[FirstTimeTracking] Error marking first scan completed:', error);
    }
  };

  const markFirstLogsViewed = async () => {
    try {
      await AsyncStorage.setItem(getStorageKey('logs_viewed'), 'true');
      setFirstTimeState(prev => ({ ...prev, firstLogsViewed: true }));
    } catch (error) {
      console.error('[FirstTimeTracking] Error marking first logs viewed:', error);
    }
  };

  const markManualEntryOnly = async () => {
    try {
      await AsyncStorage.setItem(getStorageKey('manual_entry_only'), 'true');
      setFirstTimeState(prev => ({ ...prev, hasUsedManualEntryOnly: true }));
    } catch (error) {
      console.error('[FirstTimeTracking] Error marking manual entry only:', error);
    }
  };

  const isFirstScanCompletion = () => !firstTimeState.firstScanCompleted;
  const isFirstLogsView = () => !firstTimeState.firstLogsViewed;
  const shouldShowManualEntryNudge = () => !firstTimeState.hasUsedManualEntryOnly && !firstTimeState.firstScanCompleted;

  return {
    isFirstScanCompletion,
    isFirstLogsView,
    shouldShowManualEntryNudge,
    markFirstScanCompleted,
    markFirstLogsViewed,
    markManualEntryOnly,
    firstTimeState,
  };
}