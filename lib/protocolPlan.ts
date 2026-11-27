import { calculateDose } from './dosing/calculateDose';
import { Exact } from './dosing/exact';
import { parseInputNumber } from './dosing/inputs';
import { SyringeSelection } from './dosing/syringes';

export const protocolFrequencies = [
  { count: 1, label: 'Once a week' },
  { count: 2, label: 'Twice a week' },
  { count: 3, label: '3 times a week' },
  { count: 4, label: '4 times a week' },
  { count: 5, label: '5 times a week' },
  { count: 6, label: '6 times a week' },
  { count: 7, label: 'Daily' },
] as const;

export type ProtocolFrequency = typeof protocolFrequencies[number]['count'];
export type ProtocolUnit = 'mg' | 'IU';
export type DoseTimeOffsets = Record<number, number>;

const HOUR_MS = 60 * 60 * 1000;
const WEEK_MS = 7 * 24 * HOUR_MS;
const MINUTE_MS = 60 * 1000;

export function translateWeeklyDose(
  weeklyTotal: string,
  concentrationText: string,
  unit: ProtocolUnit,
  frequency: ProtocolFrequency,
  syringe: SyringeSelection,
) {
  const weekly = parseInputNumber(weeklyTotal);
  const concentration = parseInputNumber(concentrationText);
  const amount = weekly > 0 ? new Exact(weekly).div(frequency) : null;
  const amountUnit = unit === 'IU' ? 'units' : 'mg';
  const result = calculateDose({
    doseValue: amount,
    concentration,
    unit: amountUnit,
    concentrationUnit: `${amountUnit}/ml`,
    manualSyringe: syringe,
  });
  return {
    amount,
    volume: amount && !result.calculationError ? amount.div(concentration) : null,
    recommendedMarking: result.recommendedMarking,
    calculationError: result.calculationError,
  };
}

export function localDateTimeFields(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return {
    date: `${String(date.getFullYear()).padStart(4, '0')}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  };
}

export function parseProtocolStart(date: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const start = new Date(`${date}T${time}:00`);
  const fields = localDateTimeFields(start);
  return fields.date === date && fields.time === time ? start : null;
}

export function protocolInterval(frequency: ProtocolFrequency) {
  return WEEK_MS / frequency;
}

function scheduledTime(start: Date, frequency: ProtocolFrequency, index: number) {
  if (frequency !== 1) return start.getTime() + protocolInterval(frequency) * index;

  // Weekly doses keep the starting weekday and local clock time through DST.
  const day = new Date(start);
  day.setDate(day.getDate() + 7 * index);
  return day.getTime();
}

export function protocolDoseTime(
  start: Date, frequency: ProtocolFrequency, offsets: DoseTimeOffsets, index: number,
) {
  return scheduledTime(start, frequency, index) + (offsets[index] ?? 0) * MINUTE_MS;
}

export function upcomingProtocolTimes(
  start: Date, frequency: ProtocolFrequency, offsets: DoseTimeOffsets, now: number,
) {
  const timeAt = (index: number) => protocolDoseTime(start, frequency, offsets, index);
  let index = Math.max(0, Math.floor((now - start.getTime()) / protocolInterval(frequency)));
  while (index > 0 && timeAt(index - 1) >= now) index -= 1;
  while (timeAt(index) < now) index += 1;

  return Array.from({ length: 4 }, (_, offset) => ({
    index: index + offset,
    time: timeAt(index + offset),
  }));
}

export function adjustProtocolTime(
  start: Date,
  frequency: ProtocolFrequency,
  offsets: DoseTimeOffsets,
  index: number,
  time: number,
  now: number,
): DoseTimeOffsets | null {
  if (!Number.isSafeInteger(index) || index < 1 || !Number.isSafeInteger(time) ||
      time % MINUTE_MS !== 0 || time < now) return null;
  if (time <= protocolDoseTime(start, frequency, offsets, index - 1) ||
      time >= protocolDoseTime(start, frequency, offsets, index + 1)) return null;
  // A one-time edit stays in its slot even if nearby doses have also moved.
  if (time <= scheduledTime(start, frequency, index - 1) ||
      time >= scheduledTime(start, frequency, index + 1)) return null;
  const minutes = (time - scheduledTime(start, frequency, index)) / MINUTE_MS;
  const next = { ...offsets };
  if (minutes === 0) delete next[index];
  else next[index] = minutes;
  return next;
}
