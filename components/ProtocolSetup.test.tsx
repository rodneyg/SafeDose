import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import ProtocolSetup from '../app/onboarding/protocol-setup';

jest.mock('react-native-css-interop/jsx-runtime', () => jest.requireActual('react/jsx-runtime'));
jest.mock('expo-router', () => {
  const router = { replace: jest.fn() };
  return { router, useRouter: () => router, useLocalSearchParams: jest.fn(() => ({})) };
});
jest.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: { uid: 'test-account' } }) }));

const scanRoute = '/(tabs)/new-dose?startScan=true';

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useLocalSearchParams).mockReturnValue({});
});

function fillProtocol(dose = '.25') {
  fireEvent.press(screen.getByRole('button', { name: 'Yes, set up my protocol' }));
  fireEvent.press(screen.getByRole('radio', { name: 'Custom protocol' }));
  fireEvent.changeText(screen.getByLabelText('Medication name'), ' Example medication ');
  fireEvent.changeText(screen.getByLabelText('Dose per administration'), dose);
  fireEvent.press(screen.getByRole('radio', { name: 'mL' }));
  fireEvent.press(screen.getByRole('radio', { name: 'Every two weeks' }));
  fireEvent.changeText(screen.getByLabelText('First dose date'), ' 2026-11-20 ');
}

function pressSave() {
  fireEvent.press(screen.getByRole('button', { name: 'Save and continue' }));
}

it('goes directly to the scan path after No without storing a protocol', () => {
  render(<ProtocolSetup />);
  fireEvent.press(screen.getByRole('button', { name: 'No, continue to scan' }));
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  expect(router.replace).toHaveBeenCalledWith(scanRoute);
});

it.each([
  { action: 'View my schedule', route: { pathname: '/protocol-schedule', params: { onboarding: '1' } } },
  { action: 'Continue to first scan', route: scanRoute },
])('persists the prescribed details before allowing $action', async ({ action, route }) => {
  render(<ProtocolSetup />);
  fillProtocol();
  let finishWrite: () => void = () => {};
  jest.mocked(AsyncStorage.setItem).mockImplementationOnce(() => new Promise(resolve => {
    finishWrite = resolve;
  }));

  pressSave();
  expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
  const [key, json] = jest.mocked(AsyncStorage.setItem).mock.calls[0];
  expect(key).toBe('@safedose/onboarding-protocol:test-account');
  expect(JSON.parse(json)).toEqual({
    type: 'custom', medication: 'Example medication', dose: '.25', unit: 'mL', cadenceDays: 14,
    firstDate: '2026-11-20', savedAt: expect.any(Number),
  });
  expect(router.replace).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Continue without saving' }).props.accessibilityState.disabled).toBe(true);

  await act(async () => finishWrite());
  expect(router.replace).not.toHaveBeenCalled();
  const nextButton = screen.getByRole('button', { name: action });
  fireEvent.press(nextButton);
  fireEvent.press(nextButton);

  expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
  expect(router.replace).toHaveBeenCalledTimes(1);
  expect(router.replace).toHaveBeenCalledWith(route);
});

it.each(['0', '-1', '0x10', '1e2', '1,5'])('rejects invalid dose input %s without saving', dose => {
  render(<ProtocolSetup />);
  fillProtocol(dose);
  pressSave();
  expect(screen.getByRole('alert').props.children).toContain('Enter a dose greater than zero');
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  expect(router.replace).not.toHaveBeenCalled();
});

it('keeps the form open after an incomplete or failed save and supports a retry', async () => {
  render(<ProtocolSetup />);
  fireEvent.press(screen.getByRole('button', { name: 'Yes, set up my protocol' }));
  pressSave();
  expect(screen.getByRole('alert').props.children).toContain('Choose a protocol, dose unit');
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();

  fireEvent.press(screen.getByRole('radio', { name: 'Peptides' }));
  fireEvent.changeText(screen.getByLabelText('Medication name'), 'Example medication');
  fireEvent.changeText(screen.getByLabelText('Dose per administration'), '2');
  fireEvent.press(screen.getByRole('radio', { name: 'IU' }));
  fireEvent.press(screen.getByRole('radio', { name: 'Weekly' }));
  fireEvent.changeText(screen.getByLabelText('First dose date'), '2026-11-21');
  jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('Storage unavailable'));
  await act(async () => pressSave());
  expect(screen.getByRole('alert').props.children).toContain('Your protocol could not be saved');
  expect(screen.getByLabelText('Dose per administration').props.value).toBe('2');
  expect(router.replace).not.toHaveBeenCalled();

  await act(async () => pressSave());
  fireEvent.press(screen.getByRole('button', { name: 'Continue to first scan' }));
  expect(router.replace).toHaveBeenCalledWith(scanRoute);
});

it('rejects an impossible calendar date', () => {
  render(<ProtocolSetup />);
  fillProtocol();
  fireEvent.changeText(screen.getByLabelText('First dose date'), '2026-02-30');
  pressSave();
  expect(screen.getByRole('alert').props.children).toContain('Enter a valid first dose date');
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});

it('allows an older protocol to add a schedule without guessing its first date or cadence', async () => {
  jest.mocked(useLocalSearchParams).mockReturnValue({ settings: '1' });
  jest.mocked(AsyncStorage.getItem).mockResolvedValueOnce(JSON.stringify({
    type: 'custom', medication: 'Example medication', dose: '.25', unit: 'mL', frequency: 'weekly',
  }));
  render(<ProtocolSetup />);
  expect((await screen.findByLabelText('Medication name')).props.value).toBe('Example medication');
  expect(screen.getByLabelText('Dose per administration').props.value).toBe('.25');
  expect(screen.getByLabelText('First dose date').props.value).toBe('');
  expect(screen.getByRole('radio', { name: 'Weekly' }).props.accessibilityState.checked).toBe(false);
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});
