import AsyncStorage from '@react-native-async-storage/async-storage';
import { AmountUnit, SyringeSelection } from './dosing';

const STORAGE_KEY = '@safedose/dosing-presets';

export type DosingPreset = {
  id: string;
  name: string;
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

export async function saveDosingPreset(preset: DosingPreset): Promise<DosingPreset[]> {
  const presets = await getDosingPresets();
  const updated = [preset, ...presets.filter(item => item.id !== preset.id)];
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

