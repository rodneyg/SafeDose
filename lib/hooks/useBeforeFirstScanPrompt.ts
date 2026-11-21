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
  /** Returns true after loading when the user has fewer than two views and has not opted out. */
  shouldShowPrompt: () => boolean;
  /** Call after displaying the prompt to increment its saved view count. */
  markPromptAsShown: () => Promise<void>;
  /** Call when the user opts out to save that preference for future scans. */
  markDontShowAgain: () => Promise<void>;
  /** True until the initial storage read completes. */
  isLoading: boolean;
  /** The current view count. It starts at zero while the saved count loads. */
  showCount: number;
}

/**
 * Manages the per-user educational prompt shown before scanning.
 *
 * The persisted state is loaded for the signed-in user, or for the shared
 * anonymous user when signed out. The prompt is eligible to appear at most
 * twice unless the user opts out sooner.
 *
 * @returns The loading state, display count, eligibility check, and async
 * persistence callbacks for recording a view or opting out.
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
