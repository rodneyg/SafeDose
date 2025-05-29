import { Platform } from 'react-native';

export const isWeb = typeof window !== 'undefined' && typeof document !== 'undefined';
export const userAgent = typeof navigator !== 'undefined' && navigator.userAgent ? navigator.userAgent : '';
export const isMobileDevice = userAgent ? /Android|iPhone|iPad/i.test(userAgent) : false;
// More precise mobile web detection: only consider it mobile web if it's actually running in a web browser
export const isMobileWeb = isWeb && Platform.OS === 'web' && isMobileDevice;

export const MAX_FILE_SIZE = 5 * 1024 * 1024;

export const syringeOptions = {
  Insulin: {
    '0.3 ml': '5,10,15,20,25,30',
    '0.5 ml': '5,10,15,20,25,30,35,40,45,50',
    '1 ml': '10,20,30,40,50,60,70,80,90,100',
  },
  Standard: {
    '1 ml': '0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0',
    '3 ml': '0.5,1.0,1.5,2.0,2.5,3.0',
    '5 ml': '1.0,2.0,3.0,4.0,5.0',
  },
};

export const insulinVolumes = ['0.3 ml', '0.5 ml', '1 ml'];
export const standardVolumes = ['1 ml', '3 ml', '5 ml'];

export function cn(...inputs: string[]) {   return inputs.join(' ') }