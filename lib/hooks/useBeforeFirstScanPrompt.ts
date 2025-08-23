import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../contexts/AuthContext';
import { logAnalyticsEvent, ANALYTICS_EVENTS } from '../analytics';

const BEFORE_FIRST_SCAN_STORAGE_KEY = 'beforeFirstScanPromptShown';
const BEFORE_FIRST_SCAN_DONT_SHOW_KEY = 'beforeFirstScanDontShowAgain';

interface BeforeFirstScanState {
  showCount: number;
  dontShowAgain: boolean;
}

export function useBeforeFirstScanPrompt() {
  const { user } = useAuth();
  const [state, setState] = useState<BeforeFirstScanState>({
    showCount: 0,
    dontShowAgain: false,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load the prompt state on mount
  useEffect(() => {
    const loadPromptState = async () => {
      try {
        const userId = user?.uid || 'anonymous';
        const showCountKey = `${BEFORE_FIRST_SCAN_STORAGE_KEY}_${userId}`;
        const dontShowKey = `${BEFORE_FIRST_SCAN_DONT_SHOW_KEY}_${userId}`;
        
        const [showCountStored, dontShowStored] = await Promise.all([
          AsyncStorage.getItem(showCountKey),
          AsyncStorage.getItem(dontShowKey),
        ]);
        
        const showCount = showCountStored ? parseInt(showCountStored, 10) : 0;
        const dontShowAgain = dontShowStored === 'true';
        
        setState({ showCount, dontShowAgain });
        console.log(`[BeforeFirstScan] Loaded state for ${userId}:`, { showCount, dontShowAgain });
      } catch (error) {
        console.error('[BeforeFirstScan] Error loading prompt state:', error);
        // Default to initial state if there's an error
        setState({ showCount: 0, dontShowAgain: false });
      } finally {
        setIsLoading(false);
      }
    };

    loadPromptState();
  }, [user]);

  // Check if the prompt should be shown
  const shouldShowPrompt = useCallback(() => {
    return !isLoading && !state.dontShowAgain && state.showCount < 2;
  }, [isLoading, state.dontShowAgain, state.showCount]);

  // Save state to storage
  const saveState = useCallback(async (newState: BeforeFirstScanState) => {
    try {
      const userId = user?.uid || 'anonymous';
      const showCountKey = `${BEFORE_FIRST_SCAN_STORAGE_KEY}_${userId}`;
      const dontShowKey = `${BEFORE_FIRST_SCAN_DONT_SHOW_KEY}_${userId}`;
      
      await Promise.all([
        AsyncStorage.setItem(showCountKey, newState.showCount.toString()),
        AsyncStorage.setItem(dontShowKey, newState.dontShowAgain.toString()),
      ]);
      
      setState(newState);
    } catch (error) {
      console.error('[BeforeFirstScan] Error saving prompt state:', error);
    }
  }, [user]);

  // Mark the prompt as shown (increment count)
  const markPromptAsShown = useCallback(async () => {
    const newState = {
      ...state,
      showCount: state.showCount + 1,
    };
    
    await saveState(newState);
    
    // Log analytics event
    logAnalyticsEvent(ANALYTICS_EVENTS.BEFORE_FIRST_SCAN_PROMPT_SHOWN, {
      userId: user?.uid || 'anonymous',
      isAnonymous: !user || user.isAnonymous,
      showCount: newState.showCount,
    });
    
    console.log(`[BeforeFirstScan] Marked prompt as shown for ${user?.uid || 'anonymous'}, count: ${newState.showCount}`);
  }, [state, saveState, user]);

  // Mark as "don't show again"
  const markDontShowAgain = useCallback(async () => {
    const newState = {
      ...state,
      dontShowAgain: true,
    };
    
    await saveState(newState);
    
    // Log analytics event
    logAnalyticsEvent(ANALYTICS_EVENTS.BEFORE_FIRST_SCAN_DONT_SHOW_AGAIN, {
      userId: user?.uid || 'anonymous',
      isAnonymous: !user || user.isAnonymous,
      showCount: state.showCount,
    });
    
    console.log(`[BeforeFirstScan] Marked as don't show again for ${user?.uid || 'anonymous'}`);
  }, [state, saveState, user]);

  return {
    shouldShowPrompt,
    markPromptAsShown,
    markDontShowAgain,
    isLoading,
    showCount: state.showCount,
  };
}