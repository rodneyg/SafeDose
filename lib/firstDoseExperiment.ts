import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export const firstDoseQuickStartEnabled = process.env.EXPO_PUBLIC_FIRST_DOSE_QUICK_START === 'true';

const FIRST_OPEN_KEY = '@safedose/first-dose-opened-at';
const FIRST_DOSE_EVENT_KEY = '@safedose/first-dose-event';
const launchedAt = Platform.OS === 'web' && typeof window !== 'undefined'
  ? window.performance.timeOrigin
  : Date.now();

let firstOpenWrite: Promise<void> | undefined;
let firstDoseWrite: Promise<void> | undefined;

export function startFirstDoseTimer() {
  firstOpenWrite ??= (async () => {
    if (await AsyncStorage.getItem(FIRST_OPEN_KEY) === null) {
      await AsyncStorage.setItem(FIRST_OPEN_KEY, String(launchedAt));
    }
  })().catch(() => { firstOpenWrite = undefined; });
}

export async function recordFirstDoseLogged(loggedAt: number) {
  firstDoseWrite ??= (async () => {
    await firstOpenWrite;
    if (await AsyncStorage.getItem(FIRST_DOSE_EVENT_KEY) !== null) return;
    const openedAt = Number(await AsyncStorage.getItem(FIRST_OPEN_KEY));
    if (!Number.isFinite(openedAt) || openedAt <= 0 || openedAt > loggedAt) return;

    // Keep the experiment event on this device. No dose or account data is stored here.
    await AsyncStorage.setItem(FIRST_DOSE_EVENT_KEY, JSON.stringify({
      name: 'first_dose_logged',
      variant: firstDoseQuickStartEnabled ? 'quick_start' : 'baseline',
      elapsed_ms: Math.round(loggedAt - openedAt),
    }));
  })().catch(() => { firstDoseWrite = undefined; });
  await firstDoseWrite;
}
