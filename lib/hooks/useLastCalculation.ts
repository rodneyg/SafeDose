import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

export type LastCalculation = {
  dose: string;
  draw: string;
  vial: string | null;
  solutionVolume: string | null;
};

function parseLastCalculation(raw: string | null): LastCalculation | null {
  if (!raw) return null;
  const value: Partial<LastCalculation> | null = JSON.parse(raw);
  if (!value || typeof value.dose !== 'string' || !value.dose ||
      typeof value.draw !== 'string' || !value.draw ||
      !(value.vial === null || typeof value.vial === 'string') ||
      !(value.solutionVolume === null || typeof value.solutionVolume === 'string')) return null;
  return { dose: value.dose, draw: value.draw, vial: value.vial, solutionVolume: value.solutionVolume };
}

/** Keeps one confirmed result on this device for the active account and calculator. */
export function useLastCalculation(accountId?: string, calculator: 'dose' | 'reconstitution' = 'dose') {
  const key = `@safedose/last-calculation:v1:${calculator}:${accountId ? `account:${accountId}` : 'guest'}`;
  const [entry, setEntry] = useState<{ key: string; value: LastCalculation | null }>();
  const revision = useRef(0);

  useEffect(() => {
    let active = true;
    const readRevision = revision.current;
    void AsyncStorage.getItem(key).then(raw => {
      const value = parseLastCalculation(raw);
      if (value && active && readRevision === revision.current) setEntry({ key, value });
    }).catch(() => {
      // A missing or unreadable local record does not affect the calculator.
    });
    return () => { active = false; };
  }, [key]);

  const rememberCalculation = useCallback((value: LastCalculation) => {
    revision.current += 1;
    setEntry({ key, value });
    void AsyncStorage.setItem(key, JSON.stringify(value)).catch(() => {
      // Keep the result for the current session if device storage is unavailable.
    });
  }, [key]);

  return { lastCalculation: entry?.key === key ? entry.value : null, rememberCalculation };
}
