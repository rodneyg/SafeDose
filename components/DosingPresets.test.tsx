import React from 'react';
import { Text } from 'react-native';
import { act, create } from 'react-test-renderer';
import DosingPresets from './DosingPresets';
import { deleteDosingPreset, getDosingPresets, MAX_DOSING_PRESETS, saveDosingPreset } from '../lib/dosingPresets';

jest.mock('react-native-css-interop/jsx-runtime', () => jest.requireActual('react/jsx-runtime'));
jest.mock('../lib/dosingPresets', () => ({
  ...jest.requireActual('../lib/dosingPresets'),
  deleteDosingPreset: jest.fn(),
  getDosingPresets: jest.fn(),
  saveDosingPreset: jest.fn(),
}));

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

beforeEach(() => jest.resetAllMocks());
afterEach(() => {
  act(() => renderer?.unmount());
  renderer = undefined;
});

function openPresets() {
  act(() => renderer!.root.findByProps({ accessibilityLabel: 'Presets' }).props.onPress());
}

it('shows a safe empty state without offering an apply action', async () => {
  (getDosingPresets as jest.Mock).mockResolvedValue([]);
  await act(async () => { renderer = create(<DosingPresets mode="apply" onApply={jest.fn()} />); });
  openPresets();
  expect(renderer!.root.findByProps({ children: 'No saved presets yet.' })).toBeTruthy();
  expect(renderer!.root.findAllByProps({ accessibilityLabel: expect.stringContaining('Apply') })).toHaveLength(0);
});

it('renders the dose for each saved preset', async () => {
  (getDosingPresets as jest.Mock).mockResolvedValue([preset, eveningPreset]);
  await act(async () => { renderer = create(<DosingPresets mode="apply" onApply={jest.fn()} />); });
  openPresets();

  const morning = renderer!.root.findByProps({ accessibilityLabel: 'Apply Morning preset' });
  const evening = renderer!.root.findByProps({ accessibilityLabel: 'Apply Evening preset' });
  expect(morning.findAllByType(Text).map(text => React.Children.toArray(text.props.children).join('')))
    .toEqual(['Morning', '2 mg Example']);
  expect(evening.findAllByType(Text).map(text => React.Children.toArray(text.props.children).join('')))
    .toEqual(['Evening', '3 mg Sample']);
});

it('applies only the selected saved preset', async () => {
  (getDosingPresets as jest.Mock).mockResolvedValue([preset, eveningPreset]);
  const onApply = jest.fn();
  await act(async () => { renderer = create(<DosingPresets mode="apply" onApply={onApply} />); });
  openPresets();
  act(() => renderer!.root.findByProps({ accessibilityLabel: 'Apply Evening preset' }).props.onPress());
  expect(onApply).toHaveBeenCalledTimes(1);
  expect(onApply).toHaveBeenCalledWith(eveningPreset);
});

it('saves a named preset with optional notes', async () => {
  (getDosingPresets as jest.Mock).mockResolvedValue([]);
  (saveDosingPreset as jest.Mock).mockResolvedValue([preset]);
  const { id: _id, name: _name, ...values } = preset;
  await act(async () => { renderer = create(<DosingPresets mode="save" preset={values} />); });
  act(() => renderer!.root.findByProps({ accessibilityLabel: 'Preset name' }).props.onChangeText('Morning'));
  act(() => renderer!.root.findByProps({ accessibilityLabel: 'Preset notes' }).props.onChangeText('  Test note  '));
  await act(async () => { await renderer!.root.findByProps({ accessibilityLabel: 'Save dosing preset' }).props.onPress(); });
  expect(saveDosingPreset).toHaveBeenCalledWith(expect.objectContaining({ name: 'Morning', dose: '2', unit: 'mg', notes: 'Test note' }));
  expect(renderer!.root.findByProps({ children: 'Preset saved on this device.' })).toBeTruthy();
});

it('shows the limit and disables save when all slots are in use', async () => {
  (getDosingPresets as jest.Mock).mockResolvedValue(
    Array.from({ length: MAX_DOSING_PRESETS }, (_, i) => ({ ...preset, id: String(i) })),
  );
  const { id: _id, name: _name, ...values } = preset;
  await act(async () => { renderer = create(<DosingPresets mode="save" preset={values} />); });
  act(() => renderer!.root.findByProps({ accessibilityLabel: 'Preset name' }).props.onChangeText('Extra'));
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Save dosing preset' }).props.disabled).toBe(true);
  expect(renderer!.root.findByProps({ accessibilityRole: 'alert' }).props.children).toContain('up to 10');
});

it('shows a saved note and deletes only after confirmation', async () => {
  (getDosingPresets as jest.Mock).mockResolvedValue([{ ...preset, notes: 'Test note' }]);
  (deleteDosingPreset as jest.Mock).mockResolvedValue([]);
  const onApply = jest.fn();
  await act(async () => { renderer = create(<DosingPresets mode="apply" onApply={onApply} />); });
  openPresets();
  expect(renderer!.root.findByProps({ children: 'Test note' })).toBeTruthy();
  act(() => renderer!.root.findByProps({ accessibilityLabel: 'Delete Morning preset' }).props.onPress());
  act(() => renderer!.root.findByProps({ accessibilityLabel: 'Cancel deleting preset' }).props.onPress());
  expect(deleteDosingPreset).not.toHaveBeenCalled();
  act(() => renderer!.root.findByProps({ accessibilityLabel: 'Delete Morning preset' }).props.onPress());
  await act(async () => {
    await renderer!.root.findByProps({ accessibilityLabel: 'Confirm delete Morning preset' }).props.onPress();
  });
  expect(deleteDosingPreset).toHaveBeenCalledWith('1');
  expect(onApply).not.toHaveBeenCalled();
  expect(renderer!.root.findByProps({ children: 'No saved presets yet.' })).toBeTruthy();
});
