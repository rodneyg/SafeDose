import React from 'react';
import { act, create } from 'react-test-renderer';
import DosingPresets from './DosingPresets';
import { getDosingPresets, saveDosingPreset } from '../lib/dosingPresets';

jest.mock('react-native-css-interop/jsx-runtime', () => jest.requireActual('react/jsx-runtime'));
jest.mock('../lib/dosingPresets', () => ({ getDosingPresets: jest.fn(), saveDosingPreset: jest.fn() }));

const preset = {
  id: '1', name: 'Morning', dose: '2', unit: 'mg' as const, substanceName: 'Example',
  medicationInputType: 'concentration' as const, concentrationAmount: '4', concentrationUnit: 'mg/ml' as const,
  totalAmount: '', totalAmountUnit: null, solutionVolume: '', manualSyringe: { type: 'Standard' as const, volume: '1 ml' as const },
};

let renderer: ReturnType<typeof create> | undefined;

beforeEach(() => jest.clearAllMocks());
afterEach(() => {
  act(() => renderer?.unmount());
  renderer = undefined;
});

it('shows a safe empty state without offering an apply action', async () => {
  (getDosingPresets as jest.Mock).mockResolvedValue([]);
  await act(async () => { renderer = create(<DosingPresets mode="apply" onApply={jest.fn()} />); });
  expect(renderer!.root.findByProps({ children: 'No saved presets yet.' })).toBeTruthy();
  expect(renderer!.root.findAllByProps({ accessibilityLabel: expect.stringContaining('Apply') })).toHaveLength(0);
});

it('applies the selected saved preset', async () => {
  (getDosingPresets as jest.Mock).mockResolvedValue([preset]);
  const onApply = jest.fn();
  await act(async () => { renderer = create(<DosingPresets mode="apply" onApply={onApply} />); });
  act(() => renderer!.root.findByProps({ accessibilityLabel: 'Apply Morning preset' }).props.onPress());
  expect(onApply).toHaveBeenCalledWith(preset);
});

it('saves a named preset', async () => {
  (getDosingPresets as jest.Mock).mockResolvedValue([]);
  (saveDosingPreset as jest.Mock).mockResolvedValue([preset]);
  const { id: _id, name: _name, ...values } = preset;
  await act(async () => { renderer = create(<DosingPresets mode="save" preset={values} />); });
  act(() => renderer!.root.findByProps({ accessibilityLabel: 'Preset name' }).props.onChangeText('Morning'));
  await act(async () => { await renderer!.root.findByProps({ accessibilityLabel: 'Save dosing preset' }).props.onPress(); });
  expect(saveDosingPreset).toHaveBeenCalledWith(expect.objectContaining({ name: 'Morning', dose: '2', unit: 'mg' }));
  expect(renderer!.root.findByProps({ children: 'Preset saved on this device.' })).toBeTruthy();
});
