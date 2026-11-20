import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDosingPresets, saveDosingPreset } from './dosingPresets';

jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(), setItem: jest.fn() }));

it('treats missing and malformed storage as an empty preset list', async () => {
  (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null).mockResolvedValueOnce('{bad');
  await expect(getDosingPresets()).resolves.toEqual([]);
  await expect(getDosingPresets()).resolves.toEqual([]);
});

it('persists a new preset', async () => {
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  const preset = { id: '1', name: 'Morning', dose: '2', unit: 'mg' as const, substanceName: '', medicationInputType: 'concentration' as const, concentrationAmount: '4', concentrationUnit: 'mg/ml' as const, totalAmount: '', totalAmountUnit: null, solutionVolume: '', manualSyringe: { type: 'Standard' as const, volume: '1 ml' as const } };
  await expect(saveDosingPreset(preset)).resolves.toEqual([preset]);
  expect(AsyncStorage.setItem).toHaveBeenCalledWith('@safedose/dosing-presets', JSON.stringify([preset]));
});
