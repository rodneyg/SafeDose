import { Platform } from 'react-native';
import { logAnalyticsEvent } from './analytics';

export const LANDING_CTA_LABELS = {
  control: 'Try Now',
  variant: 'Scan a vial',
} as const;

type Arm = keyof typeof LANDING_CTA_LABELS;
const COOKIE_NAME = 'safedose_landing_cta_v1';
const MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export function readLandingCtaArm(): Arm | null {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return null;

  try {
    const value = document.cookie
      .split(';')
      .map(cookie => cookie.trim())
      .find(cookie => cookie.startsWith(`${COOKIE_NAME}=`))
      ?.slice(COOKIE_NAME.length + 1);
    return value === 'control' || value === 'variant' ? value : null;
  } catch {
    return null;
  }
}

export function assignLandingCtaArm(): Arm | null {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return null;

  const existing = readLandingCtaArm();
  if (existing) return existing;

  const arm = Math.random() < 0.5 ? 'control' : 'variant';
  const secure = document.location.protocol === 'https:' ? '; Secure' : '';

  try {
    document.cookie = `${COOKIE_NAME}=${arm}; Path=/; Max-Age=${MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
  } catch {
    return null;
  }
  return readLandingCtaArm();
}

// Event names identify the arm in GA4's Total users report without a custom dimension.
export function recordLandingCtaExposure(arm: Arm) {
  logAnalyticsEvent(`landing_cta_v1_view_${arm}`);
}

export function recordLandingCtaClick(arm: Arm) {
  logAnalyticsEvent(`landing_cta_v1_click_${arm}`);
}

export function recordLandingCtaStart(kind: 'scan' | 'signup') {
  const arm = readLandingCtaArm();
  if (arm) {
    // A single event per arm lets GA4 count users who did either action just once.
    logAnalyticsEvent(`landing_cta_v1_start_${arm}`, { start_kind: kind });
  }
}
