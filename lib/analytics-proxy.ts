/**
 * A completely safe, inert analytics proxy.
 * These functions do nothing and are used during app startup to prevent crashes.
 */
export const logAnalyticsEvent = async (eventName: string, eventParams?: { [key: string]: any }): Promise<void> => Promise.resolve();
export const setAnalyticsUserProperties = async (properties: { [key: string]: any }): Promise<void> => Promise.resolve();