import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../contexts/AuthContext';
import { logAnalyticsEvent, ANALYTICS_EVENTS } from '../analytics';

const INTERACTIONS_TRIGGER_COUNT = 4; // Show after 4 interactions (between 3-5 as specified)
const DISMISS_TIMEOUT_HOURS = 24; // 24 hours before showing again after dismiss

interface SignUpPromptState {
  interactionCount: number;
  hasSeenPrompt: boolean;
  lastDismissedAt: string | null;
}

export function useSignUpPrompt() {
  const { user } = useAuth();
  const [shouldShowPrompt, setShouldShowPrompt] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Storage key for tracking prompt state
  const getStorageKey = () => `signup_prompt_${user?.uid || 'anonymous'}`;

  // Load prompt state from storage
  const loadPromptState = useCallback(async (): Promise<SignUpPromptState> => {
    try {
      const storageKey = getStorageKey();
      const stored = await AsyncStorage.getItem(storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('[useSignUpPrompt] Error loading prompt state:', error);
    }
    
    // Default state
    return {
      interactionCount: 0,
      hasSeenPrompt: false,
      lastDismissedAt: null,
    };
  }, [getStorageKey]);

  // Save prompt state to storage
  const savePromptState = useCallback(async (state: SignUpPromptState) => {
    try {
      const storageKey = getStorageKey();
      await AsyncStorage.setItem(storageKey, JSON.stringify(state));
    } catch (error) {
      console.error('[useSignUpPrompt] Error saving prompt state:', error);
    }
  }, [getStorageKey]);

  // Check if we should show the prompt
  const checkShouldShowPrompt = useCallback(async () => {
    // Don't show prompt for authenticated users
    if (!user?.isAnonymous) {
      setShouldShowPrompt(false);
      setIsLoading(false);
      return;
    }

    const state = await loadPromptState();
    
    // Don't show if we haven't reached the interaction threshold
    if (state.interactionCount < INTERACTIONS_TRIGGER_COUNT) {
      setShouldShowPrompt(false);
      setIsLoading(false);
      return;
    }

    // Don't show if user has seen it and it's been dismissed within 24 hours
    if (state.hasSeenPrompt && state.lastDismissedAt) {
      const dismissedTime = new Date(state.lastDismissedAt).getTime();
      const now = new Date().getTime();
      const hoursSinceDismissal = (now - dismissedTime) / (1000 * 60 * 60);
      
      if (hoursSinceDismissal < DISMISS_TIMEOUT_HOURS) {
        setShouldShowPrompt(false);
        setIsLoading(false);
        return;
      }
    }

    // Show the prompt
    setShouldShowPrompt(true);
    setIsLoading(false);
  }, [user, loadPromptState]);

  // Track an interaction (dose calculation or log save)
  const trackInteraction = useCallback(async () => {
    // Only track for anonymous users
    if (!user?.isAnonymous) return;

    const state = await loadPromptState();
    const newState = {
      ...state,
      interactionCount: state.interactionCount + 1,
    };
    
    await savePromptState(newState);
    
    // Check if we should now show the prompt
    if (newState.interactionCount >= INTERACTIONS_TRIGGER_COUNT && !shouldShowPrompt) {
      await checkShouldShowPrompt();
    }
    
    console.log('[useSignUpPrompt] Interaction tracked, count:', newState.interactionCount);
  }, [user, loadPromptState, savePromptState, shouldShowPrompt, checkShouldShowPrompt]);

  // Mark prompt as shown
  const markPromptShown = useCallback(async () => {
    const state = await loadPromptState();
    const newState = {
      ...state,
      hasSeenPrompt: true,
    };
    
    await savePromptState(newState);
    
    // Log analytics event
    logAnalyticsEvent(ANALYTICS_EVENTS.SIGNUP_PROMPT_SHOWN, {
      source: 'signup_prompt',
      interaction_count: state.interactionCount,
    });
    
    console.log('[useSignUpPrompt] Prompt shown event logged');
  }, [loadPromptState, savePromptState]);

  // Handle prompt dismissal
  const dismissPrompt = useCallback(async () => {
    const state = await loadPromptState();
    const newState = {
      ...state,
      hasSeenPrompt: true,
      lastDismissedAt: new Date().toISOString(),
    };
    
    await savePromptState(newState);
    setShouldShowPrompt(false);
    
    // Log analytics event
    logAnalyticsEvent(ANALYTICS_EVENTS.SIGNUP_PROMPT_DISMISSED, {
      source: 'signup_prompt',
      interaction_count: state.interactionCount,
    });
    
    console.log('[useSignUpPrompt] Prompt dismissed');
  }, [loadPromptState, savePromptState]);

  // Handle prompt click (sign up)
  const handlePromptClick = useCallback(async () => {
    const state = await loadPromptState();
    
    // Mark as seen and dismissed (since they clicked it)
    const newState = {
      ...state,
      hasSeenPrompt: true,
      lastDismissedAt: new Date().toISOString(),
    };
    
    await savePromptState(newState);
    setShouldShowPrompt(false);
    
    // Log analytics event
    logAnalyticsEvent(ANALYTICS_EVENTS.SIGNUP_PROMPT_CLICKED, {
      source: 'signup_prompt',
      interaction_count: state.interactionCount,
    });
    
    console.log('[useSignUpPrompt] Prompt clicked - sign up initiated');
  }, [loadPromptState, savePromptState]);

  // Initialize on mount
  useEffect(() => {
    checkShouldShowPrompt();
  }, [checkShouldShowPrompt]);

  // Re-check when user auth state changes
  useEffect(() => {
    setIsLoading(true);
    checkShouldShowPrompt();
  }, [user?.isAnonymous, user?.uid, checkShouldShowPrompt]);

  return {
    shouldShowPrompt,
    isLoading,
    trackInteraction,
    markPromptShown,
    dismissPrompt,
    handlePromptClick,
  };
}