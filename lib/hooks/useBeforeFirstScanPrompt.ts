import { useState, useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../contexts/AuthContext';
import { logAnalyticsEvent, ANALYTICS_EVENTS } from '../analytics';

const BEFORE_FIRST_SCAN_STORAGE_KEY = 'beforeFirstScanPromptShown';
const BEFORE_FIRST_SCAN_DONT_SHOW_KEY = 'beforeFirstScanDontShowAgain';

interface BeforeFirstScanState {
  showCount: number;
  dontShowAgain: boolean;
}

export interface BeforeFirstScanPrompt {
  /** Returns whether the prompt is ready and eligible to be displayed. */
  shouldShowPrompt: () => boolean;
  /** Records another prompt display for the current user. */
  markPromptAsShown: () => Promise<void>;
  /** Permanently opts the current user out of the prompt. */
  markDontShowAgain: () => Promise<void>;
  /** Whether the current user's saved prompt state is still loading. */
  isLoading: boolean;
  /** Number of prompt displays recorded for the current user. */
  showCount: number;
}

/**
 * Loads and updates the current user's pre-scan educational prompt state.
 *
 * The display count and opt-out flag use separate storage keys suffixed with
 * the user's UID, or `anonymous` when no UID is available. The hook rereads
 * those keys when the auth user changes.
 *
 * Eligibility requires loading to have finished, fewer than two recorded
 * displays, and no opt-out. A storage read error is logged and resets local
 * state to zero displays and no opt-out. A storage write error is logged
 * without applying the attempted update to local state.
 *
 * @returns The loading flag, display count, eligibility check, and async
 * callbacks that attempt to save a display or an opt-out.
 */
export function useBeforeFirstScanPrompt(): BeforeFirstScanPrompt {
  const { user } = useAuth();
  const [state, setState] = useState<BeforeFirstScanState>({
    showCount: 0,
    dontShowAgain: false,
  });
  const stateRef = useRef(state);
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
        
        stateRef.current = { showCount, dontShowAgain };
        setState(stateRef.current);
        console.log(`[BeforeFirstScan] Loaded state for ${userId}:`, { showCount, dontShowAgain });
      } catch (error) {
        console.error('[BeforeFirstScan] Error loading prompt state:', error);
        // Default to initial state if there's an error
        stateRef.current = { showCount: 0, dontShowAgain: false };
        setState(stateRef.current);
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
      
      // Sequential async handlers can still hold callbacks from an older render.
      stateRef.current = newState;
      setState(newState);
    } catch (error) {
      console.error('[BeforeFirstScan] Error saving prompt state:', error);
    }
  }, [user]);

  // Mark the prompt as shown (increment count)
  const markPromptAsShown = useCallback(async () => {
    const newState = {
      ...stateRef.current,
      showCount: stateRef.current.showCount + 1,
    };
    
    await saveState(newState);
    
    // Log analytics event
    logAnalyticsEvent(ANALYTICS_EVENTS.BEFORE_FIRST_SCAN_PROMPT_SHOWN, {
      userId: user?.uid || 'anonymous',
      isAnonymous: !user || user.isAnonymous,
      showCount: newState.showCount,
    });
    
    console.log(`[BeforeFirstScan] Marked prompt as shown for ${user?.uid || 'anonymous'}, count: ${newState.showCount}`);
  }, [saveState, user]);

  // Mark as "don't show again"
  const markDontShowAgain = useCallback(async () => {
    const newState = {
      ...stateRef.current,
      dontShowAgain: true,
    };
    
    await saveState(newState);
    
    // Log analytics event
    logAnalyticsEvent(ANALYTICS_EVENTS.BEFORE_FIRST_SCAN_DONT_SHOW_AGAIN, {
      userId: user?.uid || 'anonymous',
      isAnonymous: !user || user.isAnonymous,
      showCount: newState.showCount,
    });
    
    console.log(`[BeforeFirstScan] Marked as don't show again for ${user?.uid || 'anonymous'}`);
  }, [saveState, user]);

  return {
    shouldShowPrompt,
    markPromptAsShown,
    markDontShowAgain,
    isLoading,
    showCount: state.showCount,
  };
}
