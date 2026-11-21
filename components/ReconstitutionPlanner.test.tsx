import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import ReconstitutionPlanner from './ReconstitutionPlanner';
import { captureAndProcessImage } from '../lib/cameraUtils';
import { getPlannerHandoff, parsePlannerScan } from '../lib/dosing';
import { useRouter } from 'expo-router';
import { useReconstitutionPlanner } from '../lib/hooks/useReconstitutionPlanner';

jest.mock('react-native-css-interop/jsx-runtime', () => jest.requireActual('react/jsx-runtime'));
jest.mock('react-native', () => ({ ...jest.requireActual('../__mocks__/react-native') }));
jest.mock('lucide-react-native', () => new Proxy({}, { get: (_, key) => String(key) }));
jest.mock('expo-camera', () => ({ CameraView: 'CameraView', useCameraPermissions: () => [{ granted: true }, jest.fn()] }));
jest.mock('../lib/utils', () => ({ isMobileWeb: false }));
jest.mock('../lib/cameraUtils', () => ({ captureAndProcessImage: jest.fn() }));
jest.mock('../lib/dosing', () => ({
  parsePlannerScan: jest.fn(),
  getPlannerHandoff: jest.fn(),
  formatDoseNumber: jest.fn(),
}));
jest.mock('../lib/hooks/useReconstitutionPlanner', () => ({ useReconstitutionPlanner: jest.fn() }));
jest.mock('./ReconstitutionInputMethodStep', () => 'ReconstitutionInputMethodStep');
jest.mock('./ReconstitutionManualInputStep', () => 'ReconstitutionManualInputStep');
jest.mock('./ReconstitutionScanStep', () => 'ReconstitutionScanStep');
jest.mock('./ReconstitutionOutputStep', () => 'ReconstitutionOutputStep');

const setters = {
  setStep: jest.fn(), setInputMethod: jest.fn(), setPeptideAmount: jest.fn(),
  setPeptideUnit: jest.fn(), setPreferredVolume: jest.fn(), setTargetDose: jest.fn(),
  setTargetDoseUnit: jest.fn(), setScannedPeptideAmount: jest.fn(),
  setIsProcessing: jest.fn(), setError: jest.fn(), proceedToOutput: jest.fn(), reset: jest.fn(),
};
const baseState = {
  step: 'inputMethod', inputMethod: null, peptideAmount: '', peptideUnit: 'mg',
  targetDose: '', targetDoseUnit: 'mcg', preferredVolume: '0.1',
  scannedPeptideAmount: null, isProcessing: false, error: null, result: null,
  ...setters,
};

let renderer: ReactTestRenderer;
const render = (state: Record<string, unknown> = {}, props: React.ComponentProps<typeof ReconstitutionPlanner> = {}) => {
  (useReconstitutionPlanner as jest.Mock).mockReturnValue({ ...baseState, ...state });
  act(() => { renderer = create(<ReconstitutionPlanner {...props} />); });
  return renderer.root;
};
const buttonWithText = (value: string) => renderer.root.findAllByType('TouchableOpacity' as any)
  .find(button => button.findAllByType('Text' as any).some(node => node.props.children === value))!;

beforeEach(() => jest.clearAllMocks());
afterEach(() => act(() => renderer?.unmount()));

it('keeps incomplete input disabled and routes valid manual and scan choices to the right step', () => {
  let root = render();
  expect(buttonWithText('Continue').props.disabled).toBe(true);
  act(() => root.findAllByType('TouchableOpacity' as any)[0].props.onPress());
  expect((useRouter() as any).back).toHaveBeenCalled();

  root = render({ inputMethod: 'manual' });
  act(() => buttonWithText('Continue').props.onPress());
  expect(setters.setStep).toHaveBeenCalledWith('manualInput');

  render({ inputMethod: 'scan' });
  act(() => buttonWithText('Continue').props.onPress());
  expect(setters.setStep).toHaveBeenCalledWith('scanLabel');

  render({ inputMethod: 'scan' }, { scanDisabled: true });
  act(() => buttonWithText('Continue').props.onPress());
  expect(setters.setStep).toHaveBeenCalledWith('manualInput');
});

it('requires all manual values, calculates when complete, and returns output to its source', () => {
  render({ step: 'manualInput', inputMethod: 'manual', peptideAmount: '10', targetDose: '' });
  expect(buttonWithText('Calculate').props.disabled).toBe(true);

  render({ step: 'manualInput', inputMethod: 'manual', peptideAmount: '10', targetDose: '500' });
  act(() => buttonWithText('Calculate').props.onPress());
  expect(setters.proceedToOutput).toHaveBeenCalled();

  let root = render({ step: 'output', inputMethod: 'manual', result: {} });
  act(() => root.findByType('TouchableOpacity' as any).props.onPress());
  expect(setters.setStep).toHaveBeenCalledWith('manualInput');

  root = render({ step: 'output', inputMethod: 'scan', result: {} });
  act(() => root.findByType('TouchableOpacity' as any).props.onPress());
  expect(setters.setStep).toHaveBeenCalledWith('scanLabel');
});

it('stores a successfully parsed scan and always clears processing', async () => {
  (captureAndProcessImage as jest.Mock).mockResolvedValue({ vial: { totalAmount: '10 mg' } });
  (parsePlannerScan as jest.Mock).mockReturnValue({ ok: true, value: { amount: 10, unit: 'mg' } });
  const root = render({ step: 'scanLabel', inputMethod: 'scan' });

  await act(async () => root.findByType('ReconstitutionScanStep' as any).props.onCapture());

  expect(setters.setIsProcessing.mock.calls).toEqual([[true], [false]]);
  expect(setters.setError).toHaveBeenCalledWith(null);
  expect(setters.setScannedPeptideAmount).toHaveBeenCalledWith('10');
  expect(setters.setPeptideAmount).toHaveBeenCalledWith('');
  expect(setters.setPeptideUnit).toHaveBeenCalledWith('mg');
  expect(setters.setStep).toHaveBeenCalledWith('manualInput');
});

it('falls back to manual entry when vial text cannot be parsed', async () => {
  (captureAndProcessImage as jest.Mock).mockResolvedValue({ vial: { totalAmount: 'unknown' } });
  (parsePlannerScan as jest.Mock).mockReturnValue({ ok: false, error: 'No peptide amount found.' });
  const root = render({ step: 'scanLabel', inputMethod: 'scan' });

  await act(async () => root.findByType('ReconstitutionScanStep' as any).props.onCapture());

  expect(setters.setScannedPeptideAmount).toHaveBeenCalledWith(null);
  expect(setters.setPeptideUnit).not.toHaveBeenCalled();
  expect(setters.setStep).toHaveBeenCalledWith('manualInput');
  expect(setters.setError).toHaveBeenCalledWith('No peptide amount found.');
});

it.each([
  [{ vial: undefined }, 'Could not read vial information. Please enter manually.'],
  [new Error('camera failed'), 'Failed to scan vial label. Please try again or enter manually.'],
])('handles unreadable and failed scans (%#)', async (captureResult, message) => {
  if (captureResult instanceof Error) (captureAndProcessImage as jest.Mock).mockRejectedValue(captureResult);
  else (captureAndProcessImage as jest.Mock).mockResolvedValue(captureResult);
  jest.spyOn(console, 'error').mockImplementation(() => {});
  const root = render({ step: 'scanLabel', inputMethod: 'scan' });

  await act(async () => root.findByType('ReconstitutionScanStep' as any).props.onCapture());

  expect(setters.setError).toHaveBeenCalledWith(message);
  expect(setters.setIsProcessing).toHaveBeenLastCalledWith(false);
  if (!(captureResult instanceof Error)) expect(setters.setStep).toHaveBeenCalledWith('manualInput');
});

it('hands the completed plan to the dose calculator with exact encoded values', () => {
  (getPlannerHandoff as jest.Mock).mockReturnValue({ solutionVolume: '2.5', concentrationExact: '10/3' });
  const root = render({
    step: 'output', inputMethod: 'scan', scannedPeptideAmount: '10', peptideUnit: 'mg',
    targetDose: '500', targetDoseUnit: 'mcg', result: { concentration: 4 },
  });

  act(() => root.findByType('ReconstitutionOutputStep' as any).props.onUseDoseCalculator());

  expect((useRouter() as any).push).toHaveBeenCalledWith(
    '/(tabs)/new-dose?prefillTotalAmount=10&prefillTotalUnit=mg&prefillSolutionVolume=2.5&prefillConcentrationExact=10%2F3&prefillDose=500&prefillDoseUnit=mcg',
  );
});
