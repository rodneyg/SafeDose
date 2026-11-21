import AsyncStorage from '@react-native-async-storage/async-storage';
import { scheduleProtocol } from './dosing/protocolScheduler';
import { localDateTimeFields } from './protocolPlan';
import type { DoseLog, DoseLogContext } from '../types/doseLog';

export const protocolCadences = [1, 7, 14] as const;
export type ProtocolCadence = typeof protocolCadences[number];
export const protocolUnits = ['mg', 'mL', 'IU'] as const;
export type ProtocolDoseUnit = typeof protocolUnits[number];

type PrescribedDoseDetails = {
  type: 'trt' | 'peptides' | 'custom';
  medication: string;
  dose: string;
  unit: ProtocolDoseUnit;
};

export type PrescribedProtocol = PrescribedDoseDetails & {
  cadenceDays: ProtocolCadence;
  firstDate: string;
  savedAt: number;
};

const storageKey = (uid?: string) => `@safedose/onboarding-protocol:${uid ?? 'anonymous'}`;
const dayMs = 86_400_000;

export function isProtocolDate(date: string) {
  try {
    return scheduleProtocol([{ day: 1, dose: null }], date)[0].date === date;
  } catch {
    return false;
  }
}

export function isProtocolDose(dose: string) {
  return /^(?:\d+(?:\.\d+)?|\.\d+)$/.test(dose) && Number.isFinite(Number(dose)) && Number(dose) > 0;
}

export function savePrescribedProtocol(uid: string | undefined, protocol: PrescribedProtocol) {
  return AsyncStorage.setItem(storageKey(uid), JSON.stringify(protocol));
}

async function readPrescribedDetails(uid?: string) {
  const raw = await AsyncStorage.getItem(storageKey(uid));
  if (!raw) return null;
  const protocol: Partial<PrescribedProtocol> | null = JSON.parse(raw);
  if (!protocol || !protocol.type || !['trt', 'peptides', 'custom'].includes(protocol.type) ||
      typeof protocol.medication !== 'string' || !protocol.medication.trim() ||
      typeof protocol.dose !== 'string' || !isProtocolDose(protocol.dose) ||
      !protocol.unit || !protocolUnits.includes(protocol.unit)) return null;
  return protocol as PrescribedDoseDetails & Partial<PrescribedProtocol>;
}

export async function loadPrescribedDoseDetails(uid?: string): Promise<PrescribedDoseDetails | null> {
  return readPrescribedDetails(uid);
}

export async function loadPrescribedProtocol(uid?: string): Promise<PrescribedProtocol | null> {
  const protocol = await readPrescribedDetails(uid);
  if (!protocol) return null;
  const { cadenceDays, savedAt, firstDate } = protocol;
  if (cadenceDays === undefined || !protocolCadences.includes(cadenceDays) ||
      typeof savedAt !== 'number' || !Number.isSafeInteger(savedAt) || savedAt <= 0 ||
      typeof firstDate !== 'string' || !isProtocolDate(firstDate)) return null;
  return { ...protocol, cadenceDays, savedAt, firstDate };
}

export function protocolOccurrence(protocol: PrescribedProtocol, date: string) {
  return `${protocol.savedAt}:${date}`;
}

export function upcomingPrescribedDoses(protocol: PrescribedProtocol, logs: readonly DoseLog[], now = new Date()) {
  const today = localDateTimeFields(now).date;
  const daysSinceStart = (Date.parse(today) - Date.parse(protocol.firstDate)) / dayMs;
  const firstIndex = Math.max(0, Math.ceil(daysSinceStart / protocol.cadenceDays));
  const logged = new Set(logs.map(log => log.protocolOccurrence));
  // Each existing log can remove at most one occurrence from the candidate dates.
  const lastDay = 1 + (Date.parse('9999-12-31') - Date.parse(protocol.firstDate)) / dayMs;
  const candidates = Array.from({ length: 4 + logs.length }, (_, offset) => ({
    day: 1 + (firstIndex + offset) * protocol.cadenceDays, dose: protocol.dose,
  })).filter(({ day }) => day <= lastDay);
  return scheduleProtocol(candidates, protocol.firstDate)
    .flatMap(({ date }) => date && !logged.has(protocolOccurrence(protocol, date)) ? [date] : [])
    .slice(0, 4);
}

export function matchPrescribedDose(protocol: PrescribedProtocol, log: DoseLogContext) {
  return log.substanceName.trim().toLowerCase() === protocol.medication.trim().toLowerCase() &&
    log.doseValue === Number(protocol.dose) &&
    log.unit === (protocol.unit === 'IU' ? 'units' : protocol.unit);
}
