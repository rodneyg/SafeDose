import AsyncStorage from '@react-native-async-storage/async-storage';
import { AmountUnit, SyringeSelection } from './dosing';

const STORAGE_KEY = '@safedose/dosing-presets';
export const MAX_DOSING_PRESETS = 10;

let pendingWrite: Promise<unknown> = Promise.resolve();

function writePresets<T>(write: () => Promise<T>): Promise<T> {
  const result = pendingWrite.then(write);
  pendingWrite = result.catch(() => {});
  return result;
}

export type DosingPreset = {
  id: string;
  name: string;
  notes?: string;
  dose: string;
  unit: 'mg' | 'mcg' | 'units' | 'mL';
  substanceName: string;
  medicationInputType: 'concentration' | 'totalAmount';
  concentrationAmount: string;
  concentrationUnit: 'mg/ml' | 'mcg/ml' | 'units/ml';
  totalAmount: string;
  totalAmountUnit: AmountUnit | null;
  solutionVolume: string;
  manualSyringe: SyringeSelection;
};

export async function getDosingPresets(): Promise<DosingPreset[]> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  try {
    const presets = JSON.parse(stored);
    return Array.isArray(presets) ? presets : [];
  } catch {
    return [];
  }
}

export function saveDosingPreset(preset: DosingPreset): Promise<DosingPreset[] | null> {
  return writePresets(async () => {
    const presets = await getDosingPresets();
    const remaining = presets.filter(item => item.id !== preset.id);
    if (remaining.length === presets.length && remaining.length >= MAX_DOSING_PRESETS) {
      return null;
    }
    const updated = [preset, ...remaining];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  });
}

export function deleteDosingPreset(id: string): Promise<DosingPreset[]> {
  return writePresets(async () => {
    const presets = await getDosingPresets();
    const updated = presets.filter(item => item.id !== id);
    if (updated.length !== presets.length) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
    return updated;
  });
}
