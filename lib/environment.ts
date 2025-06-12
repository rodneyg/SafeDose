import Constants from 'expo-constants';

/**
 * Get the current environment
 * @returns 'preview', 'production', or other environment values
 */
export const getCurrentEnvironment = (): string => {
  return Constants.expoConfig?.extra?.NEXTPUBLIC_ENVIRONMENT || 'production';
};

/**
 * Check if the app is running in preview environment
 * @returns true if in preview environment
 */
export const isPreviewEnvironment = (): boolean => {
  return getCurrentEnvironment() === 'preview';
};