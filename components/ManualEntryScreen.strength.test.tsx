import React from 'react';
import { act, create } from 'react-test-renderer';
import ManualEntryScreen from './ManualEntryScreen';

jest.mock('react-native-css-interop/jsx-runtime', () => jest.requireActual('react/jsx-runtime'));
jest.mock('react-native', () => ({
  ...jest.requireActual('../__mocks__/react-native'),
  ScrollView: 'ScrollView',
}));
jest.mock('lucide-react-native', () => new Proxy({}, { get: (_, key) => String(key) }));
jest.mock('../lib/utils', () => ({ isMobileWeb: false }));
jest.mock('../lib/analytics', () => ({ logAnalyticsEvent: jest.fn(), ANALYTICS_EVENTS: {} }));
jest.mock('./CustomProgressBar', () => 'CustomProgressBar');
jest.mock('./DoseInputStep', () => 'DoseInputStep');
jest.mock('./MedicationSourceStep', () => 'MedicationSourceStep');
jest.mock('./ConcentrationInputStep', () => 'ConcentrationInputStep');
jest.mock('./TotalAmountInputStep', () => 'TotalAmountInputStep');
jest.mock('./ReconstitutionStep', () => 'ReconstitutionStep');
jest.mock('./SyringeStep', () => 'SyringeStep');
jest.mock('./FinalResultDisplay', () => 'FinalResultDisplay');

describe('manual safety review strength', () => {
  beforeEach(() => { jest.spyOn(console, 'log').mockImplementation(() => {}); });
  afterEach(() => { jest.restoreAllMocks(); });

  it.each([
    ['concentration', '10.000', 10, '10.000'],
    ['totalAmount', '', 10, '10.000'],
    ['totalAmount', '99', 2.5, '2.500'],
  ] as const)('shows the active %s strength with input %s', (path, amount, derived, expected) => {
    const props = {
      manualStep: 'preDoseConfirmation', medicationInputType: path,
      concentrationAmount: amount, concentrationUnit: 'mg/ml',
      totalAmount: '50', totalAmountUnit: 'mg', solutionVolume: '5',
      calculatedConcentration: derived, calculatedVolume: 0.5,
      doseValue: 5, dose: '5', unit: 'mg', substanceName: '',
      manualSyringe: { type: 'Standard', volume: 1 },
      recommendedMarking: '0.5', calculationError: null,
    } as React.ComponentProps<typeof ManualEntryScreen>;
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<ManualEntryScreen {...props} />); });
    const text = renderer.root.findAllByType('Text' as any).map(node => node.props.children);
    expect(text).toContain(`Strength: ${expected} mg/ml`);
    expect(text).toContain(`${expected} mg/ml`);
    expect(text).not.toContain('Strength:  mg/ml');
    act(() => renderer.unmount());
  });
});
