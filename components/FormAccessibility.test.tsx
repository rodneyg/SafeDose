import React from 'react';
import { Platform, Text } from 'react-native';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import LoginScreen from '../app/login';
import SettingsScreen from '../app/(tabs)/settings';
import { signInWithGoogle } from '../lib/googleAuth';
import ConcentrationInputStep from './ConcentrationInputStep';
import DoseInputStep from './DoseInputStep';
import TotalAmountInputStep from './TotalAmountInputStep';

jest.mock('react-native-css-interop/jsx-runtime', () => jest.requireActual('react/jsx-runtime'));
jest.mock('react-native', () => jest.requireActual('../__mocks__/react-native'));
jest.mock('expo-router', () => ({
  Link: 'Link',
  useLocalSearchParams: () => ({}),
  useRouter: () => ({}),
}));
jest.mock('lucide-react-native', () => new Proxy({}, { get: (_, key) => String(key) }));
jest.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: null, auth: {} }) }));
jest.mock('../lib/hooks/useUsageTracking', () => ({ useUsageTracking: () => ({ usageData: null }) }));
jest.mock('../lib/onboardingState', () => ({}));
jest.mock('../lib/analytics', () => ({ logAnalyticsEvent: jest.fn(), ANALYTICS_EVENTS: {} }));
jest.mock('../lib/googleAuth', () => ({ signInWithGoogle: jest.fn() }));

let renderer: ReactTestRenderer;
function render(element: React.ReactElement) {
  act(() => { renderer = create(element); });
}
function byLabel(accessibilityLabel: string) {
  return renderer.root.findByProps({ accessibilityLabel });
}
afterEach(() => { act(() => renderer.unmount()); });

it('finds the prescribed dose by label and exposes the selected unit', () => {
  const setDose = jest.fn();
  const setUnit = jest.fn();
  render(<DoseInputStep dose="" setDose={setDose} unit="mg" setUnit={setUnit} formError={null} />);

  act(() => byLabel('Dose amount').props.onChangeText('5'));
  expect(setDose).toHaveBeenCalledWith('5');
  expect(byLabel('mg').props).toMatchObject({
    accessibilityRole: 'button',
    accessibilityState: { selected: true },
    'aria-pressed': true,
  });
  expect(byLabel('mcg').props['aria-pressed']).toBe(false);
  act(() => byLabel('mcg').props.onPress());
  expect(setUnit).toHaveBeenCalledWith('mcg');
});

it('labels concentration, exposes the selected unit, and marks incompatible units unavailable', () => {
  const setConcentrationAmount = jest.fn();
  render(<ConcentrationInputStep
    concentrationAmount=""
    setConcentrationAmount={setConcentrationAmount}
    concentrationUnit="mg/ml"
    setConcentrationUnit={jest.fn()}
    setConcentrationHint={jest.fn()}
    concentrationHint={null}
    doseUnit="mg"
    formError={null}
  />);

  act(() => byLabel('Concentration amount').props.onChangeText('10'));
  expect(setConcentrationAmount).toHaveBeenCalledWith('10');
  expect(byLabel('mg/ml').props).toMatchObject({
    accessibilityRole: 'button',
    accessibilityState: { selected: true },
    'aria-pressed': true,
  });
  expect(byLabel('mcg/ml').props).toMatchObject({
    accessibilityRole: 'button',
    accessibilityState: { selected: false },
    'aria-pressed': false,
  });
  expect(byLabel('units/ml').props).toMatchObject({
    disabled: true,
    accessibilityState: { disabled: true },
    'aria-disabled': true,
  });
});

it('keeps the vial amount visibly required on web and exposes the selected unit', () => {
  const platform = jest.replaceProperty(Platform, 'OS', 'web');
  const setUnit = jest.fn();
  try {
    render(<TotalAmountInputStep
      totalAmount=""
      setTotalAmount={jest.fn()}
      totalAmountHint={null}
      setTotalAmountHint={jest.fn()}
      unit="mg"
      setUnit={setUnit}
    />);

    const visibleLabels = renderer.root.findAllByType(Text)
      .map(label => React.Children.toArray(label.props.children).join(''));
    expect(visibleLabels).toContain('Total Amount in Vial (required, mg):');
    expect(byLabel('Total amount in vial').props['aria-required']).toBe(true);
    expect(byLabel('Total amount unit').props.accessibilityRole).toBe('radiogroup');
    expect(byLabel('mg').props).toMatchObject({ accessibilityRole: 'radio', 'aria-checked': true });
    expect(byLabel('mcg').props['aria-checked']).toBe(false);
    act(() => byLabel('mcg').props.onPress());
    expect(setUnit).toHaveBeenCalledWith('mcg');
  } finally {
    platform.restore();
  }
});

it.each([
  ['Settings', SettingsScreen] as const,
  ['Login', LoginScreen] as const,
])('keeps the %s sign-in action named while Google sign-in is busy', async (_screen, Screen) => {
  let finish!: () => void;
  jest.mocked(signInWithGoogle).mockImplementationOnce(() => new Promise(resolve => {
    finish = () => resolve(null);
  }));
  render(<Screen />);

  const label = 'Sign In with Google';
  expect(byLabel(label).props.accessibilityRole).toBe('button');
  let signIn!: Promise<void>;
  act(() => { signIn = byLabel(label).props.onPress(); });
  expect(byLabel(label).props).toMatchObject({ disabled: true, 'aria-busy': true });
  await act(async () => { finish(); await signIn; });
  expect(byLabel(label).props).toMatchObject({ disabled: false, 'aria-busy': false });
});
