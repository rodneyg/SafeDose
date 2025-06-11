import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../contexts/AuthContext';
import { logAnalyticsEvent, ANALYTICS_EVENTS } from '../analytics';
import type { WhyAreYouHereResponse } from '../../components/WhyAreYouHereScreen';

const WHY_HERE_STORAGE_KEY = 'whyAreYouHerePromptShown';

export function useWhyAreYouHereTracking() {
  const { user } = useAuth();
  const [hasShownPrompt, setHasShownPrompt] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load the prompt shown status on mount
  useEffect(() => {
    const loadPromptStatus = async () => {
      try {
        const userId = user?.uid || 'anonymous';
        const storageKey = `${WHY_HERE_STORAGE_KEY}_${userId}`;
        const stored = await AsyncStorage.getItem(storageKey);
        const hasShown = stored === 'true';
        setHasShownPrompt(hasShown);
        console.log(`[WhyAreYouHere] Loaded prompt status for ${userId}:`, hasShown);
      } catch (error) {
        console.error('[WhyAreYouHere] Error loading prompt status:', error);
        // Default to not shown if there's an error
        setHasShownPrompt(false);
      } finally {
        setIsLoading(false);
      }
    };

    loadPromptStatus();
  }, [user]);

  // Check if the prompt should be shown for this user
  const shouldShowPrompt = useCallback(() => {
    return !isLoading && !hasShownPrompt;
  }, [isLoading, hasShownPrompt]);

  // Mark the prompt as shown and save to storage
  const markPromptAsShown = useCallback(async () => {
    try {
      const userId = user?.uid || 'anonymous';
      const storageKey = `${WHY_HERE_STORAGE_KEY}_${userId}`;
      await AsyncStorage.setItem(storageKey, 'true');
      setHasShownPrompt(true);
      
      // Log analytics event
      logAnalyticsEvent(ANALYTICS_EVENTS.WHY_HERE_PROMPT_SHOWN, {
        userId: userId,
        isAnonymous: !user || user.isAnonymous,
      });
      
      console.log(`[WhyAreYouHere] Marked prompt as shown for ${userId}`);
    } catch (error) {
      console.error('[WhyAreYouHere] Error marking prompt as shown:', error);
    }
  }, [user]);

  // Store the user's response
  const storeResponse = useCallback(async (response: WhyAreYouHereResponse, customText?: string) => {
    try {
      const userId = user?.uid || 'anonymous';
      const responseData = {
        response,
        customText: customText || null,
        timestamp: new Date().toISOString(),
        userId: userId,
        isAnonymous: !user || user.isAnonymous,
      };

      // Store locally for backup
      const responseStorageKey = `whyAreYouHereResponse_${userId}`;
      await AsyncStorage.setItem(responseStorageKey, JSON.stringify(responseData));
      
      console.log(`[WhyAreYouHere] Stored response for ${userId}:`, response);
    } catch (error) {
      console.error('[WhyAreYouHere] Error storing response:', error);
    }
  }, [user]);

  return {
    shouldShowPrompt,
    markPromptAsShown,
    storeResponse,
    isLoading,
  };
}