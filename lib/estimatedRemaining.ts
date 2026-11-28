import type { DoseLog } from '../types/doseLog';

export type HalfLifeUnit = 'hours' | 'days';
export function halfLifeHours(value: number | undefined, unit: HalfLifeUnit): number | null {
  const hours = (value ?? 0) * (unit === 'days' ? 24 : 1);
  return Number.isFinite(hours) && hours > 0 ? hours : null;
}

/** Returns null when no usable half-life was entered. Only compatible mass units are combined. */
export function estimatedRemaining(logs: readonly DoseLog[], at: Date, value: number | undefined, unit: HalfLifeUnit, outputUnit: string): number | null {
  const hours = halfLifeHours(value, unit);
  if (!hours) return null;
  const factor = (u: string) => u.toLowerCase() === 'mg' ? 1000 : u.toLowerCase() === 'mcg' ? 1 : null;
  const target = factor(outputUnit);
  return logs.reduce((sum, log) => {
    const elapsed = (at.getTime() - Date.parse(log.timestamp)) / 3_600_000;
    if (!Number.isFinite(elapsed) || elapsed < 0 || !Number.isFinite(log.doseValue) || log.doseValue <= 0) return sum;
    const source = factor(log.unit);
    const amount = source !== null && target !== null ? log.doseValue * source / target :
      log.unit.toLowerCase() === outputUnit.toLowerCase() ? log.doseValue : 0;
    return sum + amount * Math.pow(0.5, elapsed / hours);
  }, 0);
}
