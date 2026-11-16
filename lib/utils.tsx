import { Platform } from 'react-native';

export const isWeb = typeof window !== 'undefined' && typeof document !== 'undefined';
export const userAgent = typeof navigator !== 'undefined' && navigator.userAgent ? navigator.userAgent : '';
export const isMobileDevice = userAgent ? /Android|iPhone|iPad/i.test(userAgent) : false;
// More precise mobile web detection: only consider it mobile web if it's actually running in a web browser
export const isMobileWeb = isWeb && Platform.OS === 'web' && isMobileDevice;

// Debug logging for platform detection
console.log('[Utils] Platform detection', {
  isWeb,
  userAgent,
  isMobileDevice,
  platformOS: Platform.OS,
  isMobileWeb,
  calculation: `${isWeb} && ${Platform.OS === 'web'} && ${isMobileDevice} = ${isMobileWeb}`
});

export const MAX_FILE_SIZE = 5 * 1024 * 1024;

export { syringeOptions, insulinVolumes, standardVolumes } from './dosing';

export function cn(...inputs: (string | null | undefined | false)[]) {
  return inputs.filter(Boolean).join(' ');
}