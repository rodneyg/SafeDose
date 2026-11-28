import { estimatedRemaining, halfLifeHours } from './estimatedRemaining';
import type { DoseLog } from '../types/doseLog';
const dose = (doseValue: number, unit: string, timestamp: string) => ({ doseValue, unit, timestamp } as DoseLog);
const at = new Date('2026-01-02T00:00:00Z');
test('one dose halves after one half-life', () => {
  expect(estimatedRemaining([dose(10, 'mg', '2026-01-01T00:00:00Z')], at, 24, 'hours', 'mg')).toBeCloseTo(5);
});
test('sums earlier doses and excludes future doses', () => {
  expect(estimatedRemaining([dose(10, 'mg', '2026-01-01T00:00:00Z'), dose(4, 'mg', '2026-01-02T00:00:00Z'), dose(99, 'mg', '2026-01-03T00:00:00Z')], at, 1, 'days', 'mg')).toBeCloseTo(9);
});
test('converts days and mass units without combining incompatible units', () => {
  expect(halfLifeHours(2, 'days')).toBe(48);
  expect(estimatedRemaining([dose(1000, 'mcg', '2026-01-01T00:00:00Z'), dose(7, 'units', '2026-01-01T00:00:00Z')], at, 1, 'days', 'mg')).toBeCloseTo(0.5);
});
test.each([undefined, 0, -1, NaN])('missing or invalid half-life %s hides estimate', value => {
  expect(estimatedRemaining([], at, value, 'hours', 'mg')).toBeNull();
});
