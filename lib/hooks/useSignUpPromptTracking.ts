import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../contexts/AuthContext';

interface SignUpPromptState {
  interactionCount: number;
  hasSeenPrompt: boolean;
  lastDismissedAt: string | null;
  promptShownAt: string | null;
}

const STORAGE_KEY_PREFIX = 'signup_prompt_';
const INTERACTION_THRESHOLD = 3; // Configurable: show prompt after 3 interactions
const DISMISS_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export function useSignUpPromptTracking() {
  const { user } = useAuth();
  const [promptState, setPromptState] = useState<SignUpPromptState>({
    interactionCount: 0,
    hasSeenPrompt: false,
    lastDismissedAt: null,
    promptShownAt: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load state from AsyncStorage
  const loadPromptState = useCallback(async () => {
    if (!user?.uid) {
      setIsLoading(false);
      return;
    }

    try {
      const storageKey = `${STORAGE_KEY_PREFIX}${user.uid}`;
      const stored = await AsyncStorage.getItem(storageKey);
      
      if (stored) {
        const parsed = JSON.parse(stored) as SignUpPromptState;
        setPromptState(parsed);
        console.log('[SignUpPromptTracking] Loaded state:', parsed);
      } else {
        console.log('[SignUpPromptTracking] No existing state found');
      }
    } catch (error) {
      console.error('[SignUpPromptTracking] Error loading state:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid]);

  // Save state to AsyncStorage
  const savePromptState = useCallback(async (newState: SignUpPromptState) => {
    if (!user?.uid) return;

    try {
      const storageKey = `${STORAGE_KEY_PREFIX}${user.uid}`;
      await AsyncStorage.setItem(storageKey, JSON.stringify(newState));
      console.log('[SignUpPromptTracking] Saved state:', newState);
    } catch (error) {
      console.error('[SignUpPromptTracking] Error saving state:', error);
    }
  }, [user?.uid]);

  // Load state when user changes
  useEffect(() => {
    loadPromptState();
  }, [loadPromptState]);

  // Increment interaction count
  const incrementInteractionCount = useCallback(async () => {
    // Only track for anonymous users
    if (!user || !user.isAnonymous) {
      return;
    }

    const newState = {
      ...promptState,
      interactionCount: promptState.interactionCount + 1,
    };
    
    setPromptState(newState);
    await savePromptState(newState);
    
    console.log('[SignUpPromptTracking] Incremented interaction count to:', newState.interactionCount);
  }, [user, promptState, savePromptState]);

  // Mark prompt as shown
  const markPromptShown = useCallback(async () => {
    const newState = {
      ...promptState,
      hasSeenPrompt: true,
      promptShownAt: new Date().toISOString(),
    };
    
    setPromptState(newState);
    await savePromptState(newState);
    
    console.log('[SignUpPromptTracking] Marked prompt as shown');
  }, [promptState, savePromptState]);

  // Mark prompt as dismissed
  const markPromptDismissed = useCallback(async () => {
    const newState = {
      ...promptState,
      lastDismissedAt: new Date().toISOString(),
    };
    
    setPromptState(newState);
    await savePromptState(newState);
    
    console.log('[SignUpPromptTracking] Marked prompt as dismissed');
  }, [promptState, savePromptState]);

  // Check if prompt should be shown
  const shouldShowPrompt = useCallback(() => {
    // Don't show for authenticated users
    if (!user || !user.isAnonymous) {
      return false;
    }

    // Don't show if loading
    if (isLoading) {
      return false;
    }

    // Don't show if haven't reached interaction threshold
    if (promptState.interactionCount < INTERACTION_THRESHOLD) {
      return false;
    }

    // Don't show if dismissed recently (within 24 hours)
    if (promptState.lastDismissedAt) {
      const dismissedAt = new Date(promptState.lastDismissedAt).getTime();
      const now = Date.now();
      if (now - dismissedAt < DISMISS_DURATION) {
        console.log('[SignUpPromptTracking] Prompt dismissed recently, not showing');
        return false;
      }
    }

    return true;
  }, [user, isLoading, promptState]);

  // Reset state (for authenticated users)
  const resetPromptState = useCallback(async () => {
    if (!user?.uid) return;

    const newState = {
      interactionCount: 0,
      hasSeenPrompt: false,
      lastDismissedAt: null,
      promptShownAt: null,
    };
    
    setPromptState(newState);
    await savePromptState(newState);
    
    console.log('[SignUpPromptTracking] Reset prompt state');
  }, [user?.uid, savePromptState]);

  return {
    promptState,
    isLoading,
    incrementInteractionCount,
    markPromptShown,
    markPromptDismissed,
    shouldShowPrompt,
    resetPromptState,
  };
}