import { getFirebaseApp, getFullFirebaseConfig } from './firebase';
import type { Analytics } from 'firebase/analytics';

let analyticsInstance: Analytics | null = null;
let initializationPromise: Promise<Analytics | null> | null = null;

const getAnalyticsInstance = (): Promise<Analytics | null> => {
  if (initializationPromise) return initializationPromise;

  initializationPromise = (async () => {
    if (analyticsInstance) return analyticsInstance;
    if (typeof window === 'undefined') return null;

    try {
      const { getAnalytics, isSupported } = await import('firebase/analytics');
      if (!(await isSupported())) return null;

      const app = await getFirebaseApp();
      if (!app) return null;
      
      const instance = getAnalytics(app);
      
      analyticsInstance = instance;
      return instance;
    } catch (error) {
      console.error('[Analytics REAL] CRITICAL: Real initialization failed.', error);
      return null;
    }
  })();
  
  return initializationPromise;
};

export const logAnalyticsEvent = async (eventName: string, eventParams?: { [key: string]: any }): Promise<void> => {
  const instance = await getAnalyticsInstance();
  if (!instance) return;
  const { logEvent } = await import('firebase/analytics');
  logEvent(instance, eventName, eventParams);
};

export const setAnalyticsUserProperties = async (properties: { [key: string]: any }): Promise<void> => {
  const instance = await getAnalyticsInstance();
  if (!instance) return;
  const { setUserProperties } = await import('firebase/analytics');
  setUserProperties(instance, properties);
};