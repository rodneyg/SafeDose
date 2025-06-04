import * as Sentry from '@sentry/react-native';
import * as SentryBrowser from '@sentry/browser';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Get Sentry DSN from environment variables
const SENTRY_DSN = (Constants as any).expoConfig?.extra?.SENTRY_DSN || process.env.SENTRY_DSN;

// Configuration for data scrubbing and privacy
const commonConfig = {
  dsn: SENTRY_DSN,
  debug: __DEV__, // Enable debug mode in development
  tracesSampleRate: __DEV__ ? 1.0 : 0.1, // 100% in dev, 10% in prod
  environment: __DEV__ ? 'development' : 'production',
  
  // Scrub sensitive data
  beforeSend: (event: any) => {
    // Remove or scrub sensitive data
    if (event.user) {
      // Keep only non-PII data
      event.user = {
        id: event.user.id, // Keep user ID for tracking
        // Remove email, name, and other PII
      };
    }
    
    // Scrub sensitive data from exception details
    if (event.exception) {
      event.exception.values?.forEach((exception: any) => {
        if (exception.stacktrace?.frames) {
          exception.stacktrace.frames.forEach((frame: any) => {
            // Remove local file paths and sensitive info
            if (frame.filename && frame.filename.includes('/')) {
              frame.filename = frame.filename.split('/').pop();
            }
          });
        }
      });
    }
    
    // Scrub sensitive data from breadcrumbs
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map((breadcrumb: any) => {
        if (breadcrumb.data) {
          // Remove potentially sensitive data from breadcrumb data
          const { email, password, token, apiKey, ...safeData } = breadcrumb.data;
          breadcrumb.data = safeData;
        }
        return breadcrumb;
      });
    }
    
    return event;
  },
  
  // Integration configuration
  integrations: [
    // Default integrations will be added automatically
  ],
};

// Initialize Sentry based on platform
export const initSentry = () => {
  if (!SENTRY_DSN) {
    console.warn('[Sentry] DSN not provided, Sentry will not be initialized');
    return;
  }

  try {
    if (Platform.OS === 'web') {
      // Use browser SDK for web
      SentryBrowser.init({
        ...commonConfig,
        integrations: [
          SentryBrowser.browserTracingIntegration(),
        ],
      });
      console.log('[Sentry] Browser SDK initialized successfully');
    } else {
      // Use React Native SDK for mobile
      Sentry.init({
        ...commonConfig,
        integrations: [
          Sentry.mobileReplayIntegration(),
        ],
      });
      console.log('[Sentry] React Native SDK initialized successfully');
    }
  } catch (error) {
    console.error('[Sentry] Failed to initialize:', error);
  }
};

// Helper functions for consistent Sentry usage across the app
export const captureException = (error: Error | any, context?: Record<string, any>) => {
  try {
    if (Platform.OS === 'web') {
      SentryBrowser.withScope((scope) => {
        if (context) {
          Object.keys(context).forEach(key => {
            scope.setContext(key, context[key]);
          });
        }
        SentryBrowser.captureException(error);
      });
    } else {
      Sentry.withScope((scope) => {
        if (context) {
          Object.keys(context).forEach(key => {
            scope.setContext(key, context[key]);
          });
        }
        Sentry.captureException(error);
      });
    }
    console.log('[Sentry] Exception captured:', error.message || error);
  } catch (sentryError) {
    console.error('[Sentry] Failed to capture exception:', sentryError);
  }
};

export const captureMessage = (message: string, level: 'info' | 'warning' | 'error' = 'info', context?: Record<string, any>) => {
  try {
    if (Platform.OS === 'web') {
      SentryBrowser.withScope((scope) => {
        if (context) {
          Object.keys(context).forEach(key => {
            scope.setContext(key, context[key]);
          });
        }
        SentryBrowser.captureMessage(message, level);
      });
    } else {
      Sentry.withScope((scope) => {
        if (context) {
          Object.keys(context).forEach(key => {
            scope.setContext(key, context[key]);
          });
        }
        Sentry.captureMessage(message, level);
      });
    }
    console.log(`[Sentry] Message captured [${level}]:`, message);
  } catch (sentryError) {
    console.error('[Sentry] Failed to capture message:', sentryError);
  }
};

export const setUser = (user: { id?: string; email?: string; planTier?: string } | null) => {
  try {
    const userData = user ? {
      id: user.id,
      // Only include plan tier, not PII like email
      planTier: user.planTier,
    } : null;

    if (Platform.OS === 'web') {
      SentryBrowser.setUser(userData);
    } else {
      Sentry.setUser(userData);
    }
    console.log('[Sentry] User context set:', userData ? 'User data provided' : 'User cleared');
  } catch (error) {
    console.error('[Sentry] Failed to set user:', error);
  }
};

export const addBreadcrumb = (breadcrumb: {
  message: string;
  category?: string;
  level?: 'info' | 'warning' | 'error';
  data?: Record<string, any>;
}) => {
  try {
    // Scrub sensitive data from breadcrumb data
    const safeData = breadcrumb.data ? 
      Object.keys(breadcrumb.data).reduce((acc, key) => {
        // Skip potentially sensitive keys
        if (!['email', 'password', 'token', 'apiKey', 'uid'].includes(key.toLowerCase())) {
          acc[key] = breadcrumb.data![key];
        }
        return acc;
      }, {} as Record<string, any>) : undefined;

    const safeBreadcrumb = {
      ...breadcrumb,
      data: safeData,
      level: breadcrumb.level || 'info',
      category: breadcrumb.category || 'app',
    };

    if (Platform.OS === 'web') {
      SentryBrowser.addBreadcrumb(safeBreadcrumb);
    } else {
      Sentry.addBreadcrumb(safeBreadcrumb);
    }
    console.log('[Sentry] Breadcrumb added:', breadcrumb.message);
  } catch (error) {
    console.error('[Sentry] Failed to add breadcrumb:', error);
  }
};

// Export Sentry instance for advanced usage if needed
export { Sentry, SentryBrowser };