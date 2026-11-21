import AsyncStorage from '@react-native-async-storage/async-storage';
import { deleteDosingPreset, getDosingPresets, MAX_DOSING_PRESETS, saveDosingPreset, DosingPreset } from './dosingPresets';

jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(), setItem: jest.fn() }));

const preset: DosingPreset = {
  id: '1', name: 'Morning', dose: '2', unit: 'mg', substanceName: 'Example',
  medicationInputType: 'concentration', concentrationAmount: '4', concentrationUnit: 'mg/ml',
  totalAmount: '', totalAmountUnit: null, solutionVolume: '',
  manualSyringe: { type: 'Standard', volume: '1 ml' },
};

beforeEach(() => {
  jest.resetAllMocks();
  let stored: string | null = null;
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async () => stored);
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (_key, value) => { stored = value; });
});

it('treats missing and malformed storage as an empty preset list', async () => {
  (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null).mockResolvedValueOnce('{bad');
  await expect(getDosingPresets()).resolves.toEqual([]);
  await expect(getDosingPresets()).resolves.toEqual([]);
});

it('persists a new preset with its optional notes and reloads the original fields', async () => {
  const notedPreset = { ...preset, notes: 'Test note' };
  await expect(saveDosingPreset(notedPreset)).resolves.toEqual([notedPreset]);
  expect(AsyncStorage.setItem).toHaveBeenCalledWith('@safedose/dosing-presets', JSON.stringify([notedPreset]));
  await expect(getDosingPresets()).resolves.toEqual([notedPreset]);
});

it('keeps the first ten presets when saves overlap and frees a slot on deletion', async () => {
  const presets = Array.from({ length: MAX_DOSING_PRESETS + 1 }, (_, i) => ({ ...preset, id: String(i) }));
  const results = await Promise.all(presets.map(saveDosingPreset));
  expect(results[MAX_DOSING_PRESETS]).toBeNull();
  const stored = presets.slice(0, MAX_DOSING_PRESETS).reverse();
  await expect(getDosingPresets()).resolves.toEqual(stored);
  expect(AsyncStorage.setItem).toHaveBeenCalledTimes(MAX_DOSING_PRESETS);

  await expect(deleteDosingPreset('0')).resolves.toEqual(stored.slice(0, -1));
  await expect(saveDosingPreset(presets[MAX_DOSING_PRESETS])).resolves.toEqual([
    presets[MAX_DOSING_PRESETS],
    ...stored.slice(0, -1),
  ]);
});

it('lets users remove legacy entries above the limit without hiding or discarding them', async () => {
  const legacy = Array.from({ length: MAX_DOSING_PRESETS + 2 }, (_, i) => ({ ...preset, id: String(i) }));
  await AsyncStorage.setItem('@safedose/dosing-presets', JSON.stringify(legacy));
  await expect(getDosingPresets()).resolves.toEqual(legacy);
  await expect(saveDosingPreset({ ...preset, id: 'new' })).resolves.toBeNull();
  await expect(deleteDosingPreset('0')).resolves.toEqual(legacy.slice(1));
});
