import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { trackSessionStart, trackSessionEnd, logAnalyticsEvent, ANALYTICS_EVENTS } from '../analytics';

export function useSessionTracking() {
  const sessionStartTime = useRef<number | null>(null);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    // Track initial app open
    logAnalyticsEvent(ANALYTICS_EVENTS.APP_OPENED);
    
    // Start session tracking
    startSession();

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App has come to the foreground
        logAnalyticsEvent(ANALYTICS_EVENTS.APP_OPENED);
        startSession();
      } else if (
        appState.current === 'active' &&
        nextAppState.match(/inactive|background/)
      ) {
        // App has gone to the background
        endSession();
      }

      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Cleanup on unmount
    return () => {
      endSession();
      subscription?.remove();
    };
  }, []);

  const startSession = () => {
    sessionStartTime.current = Date.now();
    trackSessionStart();
  };

  const endSession = () => {
    if (sessionStartTime.current) {
      const duration = Math.floor((Date.now() - sessionStartTime.current) / 1000); // in seconds
      trackSessionEnd(duration);
      sessionStartTime.current = null;
    }
  };

  return {
    startSession,
    endSession,
  };
}