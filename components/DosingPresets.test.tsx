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

const eveningPreset = {
  ...preset,
  id: '2',
  name: 'Evening',
  dose: '3',
  substanceName: 'Sample',
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

it('renders each entry in a short protocol list', async () => {
  (getDosingPresets as jest.Mock).mockResolvedValue([preset, eveningPreset]);

  await act(async () => { renderer = create(<DosingPresets mode="apply" />); });

  expect(renderer!.root.findByProps({ accessibilityLabel: 'Apply Morning preset' })).toBeTruthy();
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Apply Evening preset' })).toBeTruthy();
  const renderedText = renderer!.root
    .findAll(node => Array.isArray(node.props.children))
    .map(node => node.props.children.join(''));
  expect(renderedText).toEqual(expect.arrayContaining(['2 mg Example', '3 mg Sample']));
});

it('reports the selected protocol item', async () => {
  (getDosingPresets as jest.Mock).mockResolvedValue([preset, eveningPreset]);
  const onApply = jest.fn();
  await act(async () => { renderer = create(<DosingPresets mode="apply" onApply={onApply} />); });
  act(() => renderer!.root.findByProps({ accessibilityLabel: 'Apply Evening preset' }).props.onPress());
  expect(onApply).toHaveBeenCalledTimes(1);
  expect(onApply).toHaveBeenCalledWith(eveningPreset);
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
