import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import { ANALYTICS_EVENTS, logAnalyticsEvent } from './analytics';
import { ONBOARDING_COMPLETE_KEY, USER_PROFILE_STORAGE_KEY } from './onboardingState';

const VERSION = 'first_scan_copy_v1';
const STORAGE_KEY = 'safedose:' + VERSION;
const SESSION_IDLE_MS = 30 * 60 * 1000;

const copyListeners = new Set<() => void>();

type Arm = 'control' | 'variant';
type Enrollment = {
  arm: Arm;
  openedAt: number;
  lastActiveAt: number;
  firstSessionEnded: boolean;
  succeeded: boolean;
};

function getStorage(): Storage | undefined {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    return window.localStorage;
  } catch {
    return;
  }
}

function readEnrollment(storage: Storage): Enrollment | null {
  const value = storage.getItem(STORAGE_KEY);
  return value ? JSON.parse(value) : null;
}

function eventParams(enrollment: Enrollment) {
  return { experiment_version: VERSION, experiment_arm: enrollment.arm };
}

export function startFirstScanExperiment() {
  const storage = getStorage();
  if (!storage) return;

  const now = Date.now();
  try {
    const existing = readEnrollment(storage);
    if (!existing) {
      if (storage.getItem(ONBOARDING_COMPLETE_KEY) || storage.getItem(USER_PROFILE_STORAGE_KEY)) {
        return;
      }
      const timeOrigin = window.performance?.timeOrigin;
      const openedAt = timeOrigin > 0 && timeOrigin <= now ? Math.floor(timeOrigin) : now;
      const enrollment: Enrollment = {
        arm: Math.random() < 0.5 ? 'control' : 'variant',
        openedAt,
        lastActiveAt: now,
        firstSessionEnded: false,
        succeeded: false,
      };
      storage.setItem(STORAGE_KEY, JSON.stringify(enrollment));
      logAnalyticsEvent(ANALYTICS_EVENTS.FIRST_SCAN_SESSION_STARTED, eventParams(enrollment));
      copyListeners.forEach(listener => listener());
    }
  } catch {
    // Storage can be blocked. Keep the current copy and leave the visitor out of the experiment.
    return;
  }

  const onActivity = () => {
    if (document.visibilityState === 'hidden') return;
    try {
      const enrollment = readEnrollment(storage);
      if (!enrollment || enrollment.succeeded || enrollment.firstSessionEnded) return;
      const at = Date.now();
      enrollment.firstSessionEnded = at - enrollment.lastActiveAt >= SESSION_IDLE_MS;
      enrollment.lastActiveAt = at;
      storage.setItem(STORAGE_KEY, JSON.stringify(enrollment));
    } catch {
      // Losing access to experiment state must never interrupt app interactions.
    }
  };

  onActivity();
  window.addEventListener('pointerdown', onActivity);
  window.addEventListener('keydown', onActivity);
  document.addEventListener('visibilitychange', onActivity);
  return () => {
    window.removeEventListener('pointerdown', onActivity);
    window.removeEventListener('keydown', onActivity);
    document.removeEventListener('visibilitychange', onActivity);
  };
}

function subscribeToCopy(listener: () => void) {
  copyListeners.add(listener);
  if (typeof window !== 'undefined') window.addEventListener?.('storage', listener);
  return () => {
    copyListeners.delete(listener);
    if (typeof window !== 'undefined') window.removeEventListener?.('storage', listener);
  };
}

function shouldShowVariant() {
  try {
    const storage = getStorage();
    const enrollment = storage && readEnrollment(storage);
    return enrollment?.arm === 'variant' && !enrollment.succeeded;
  } catch {
    return false;
  }
}

export function useFirstScanCopy() {
  return useSyncExternalStore(subscribeToCopy, shouldShowVariant, () => false);
}

export function recordFirstScanExperimentSuccess() {
  const storage = getStorage();
  if (!storage) return;

  try {
    const enrollment = readEnrollment(storage);
    if (!enrollment || enrollment.succeeded) return;

    const now = Date.now();
    const firstSession = !enrollment.firstSessionEnded
      && now - enrollment.lastActiveAt < SESSION_IDLE_MS;
    enrollment.succeeded = true;
    storage.setItem(STORAGE_KEY, JSON.stringify(enrollment));
    logAnalyticsEvent(ANALYTICS_EVENTS.FIRST_SCAN_SUCCESS, {
      ...eventParams(enrollment),
      elapsed_ms: Math.max(0, now - enrollment.openedAt),
      first_session: firstSession ? 1 : 0,
    });
    copyListeners.forEach(listener => listener());
  } catch {
    // Experiment storage must never interfere with a successful scan.
  }
}
