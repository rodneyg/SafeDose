import { logAnalyticsEvent } from '../analytics';

export const UNREADABLE_PHOTO_MESSAGE = 'We could not read the syringe size or vial strength safely. Try a clear photo showing the syringe scale and vial strength, or enter the details manually.';

type RetakeVariant = 'a' | 'b';

export interface RetakeGuidance {
  variant: RetakeVariant;
  shown: boolean;
}

interface RetakeSession {
  guidance?: RetakeGuidance;
}

const COOKIE_NAME = 'safedose_retake_guidance_v1';
const COOKIE_MAX_AGE = 90 * 24 * 60 * 60;

// The capture utility and ScanScreen share the camera ref. Each mounted scanner
// owns one episode at a time, without storing scan outcomes across visits.
const sessions = new WeakMap<object, RetakeSession>();

function readVariant(): RetakeVariant | undefined {
  const cookie = document.cookie.split(';').map(part => part.trim())
    .find(part => part.startsWith(`${COOKIE_NAME}=`));
  const value = cookie?.slice(COOKIE_NAME.length + 1);
  return value === 'a' || value === 'b' ? value : undefined;
}

function getVariant(): RetakeVariant | undefined {
  try {
    const existing = readVariant();
    if (existing) return existing;

    const variant = Math.random() < 0.5 ? 'a' : 'b';
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${COOKIE_NAME}=${variant}; Max-Age=${COOKIE_MAX_AGE}; Path=/; SameSite=Lax${secure}`;
    // Leave the existing guidance in place if the browser cannot retain an arm.
    return readVariant();
  } catch {
    return undefined;
  }
}

export function startRetakeSession(cameraRef: object): () => void {
  sessions.set(cameraRef, {});
  return () => { sessions.delete(cameraRef); };
}

export function getRetakeSession(cameraRef: object): RetakeSession | undefined {
  return sessions.get(cameraRef);
}

export function offerRetakeGuidance(session: RetakeSession | undefined): void {
  if (!session) return;
  const variant = getVariant();
  if (variant) session.guidance = { variant, shown: false };
}

export function recordGuidanceShown(guidance: RetakeGuidance): void {
  if (guidance.shown) return;
  guidance.shown = true;
  logAnalyticsEvent(`retake_guidance_shown_${guidance.variant}`);
}

export function beginGuidedRetake(session: RetakeSession | undefined): RetakeVariant | undefined {
  const guidance = session?.guidance;
  if (!session || !guidance?.shown) return;
  delete session.guidance;
  logAnalyticsEvent(`retake_guidance_retry_${guidance.variant}`);
  return guidance.variant;
}

export function recordGuidedRetakeSuccess(variant: RetakeVariant | undefined): void {
  if (variant) logAnalyticsEvent(`retake_guidance_success_${variant}`);
}
