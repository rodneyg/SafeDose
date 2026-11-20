import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import ProtocolSetup from '../app/onboarding/protocol-setup';

jest.mock('react-native-css-interop/jsx-runtime', () => jest.requireActual('react/jsx-runtime'));
jest.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: { uid: 'test-account' } }) }));

const scanRoute = '/(tabs)/new-dose?startScan=true';

beforeEach(() => {
  jest.clearAllMocks();
});

function fillProtocol(dose = '.25') {
  fireEvent.press(screen.getByRole('button', { name: 'Yes, set up my protocol' }));
  fireEvent.press(screen.getByRole('radio', { name: 'Custom protocol' }));
  fireEvent.changeText(screen.getByLabelText('Medication name'), ' Example medication ');
  fireEvent.changeText(screen.getByLabelText('Dose per administration'), dose);
  fireEvent.press(screen.getByRole('radio', { name: 'mL' }));
  fireEvent.changeText(screen.getByLabelText('Frequency'), ' every two weeks ');
}

function pressSave() {
  fireEvent.press(screen.getByRole('button', { name: 'Save and continue to scan' }));
}

it('goes directly to the scan path after No without storing a protocol', () => {
  render(<ProtocolSetup />);
  fireEvent.press(screen.getByRole('button', { name: 'No, continue to scan' }));
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  expect(router.replace).toHaveBeenCalledWith(scanRoute);
});

it('persists the prescribed details for this account before opening the scan path', async () => {
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
    type: 'custom', medication: 'Example medication', dose: '.25', unit: 'mL', frequency: 'every two weeks',
  });
  expect(router.replace).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Continue without saving' }).props.accessibilityState.disabled).toBe(true);

  await act(async () => finishWrite());
  expect(router.replace).toHaveBeenCalledTimes(1);
  expect(router.replace).toHaveBeenCalledWith(scanRoute);
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
  expect(screen.getByRole('alert').props.children).toContain('Choose a protocol and dose unit');
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();

  fireEvent.press(screen.getByRole('radio', { name: 'Peptides' }));
  fireEvent.changeText(screen.getByLabelText('Medication name'), 'Example medication');
  fireEvent.changeText(screen.getByLabelText('Dose per administration'), '2');
  fireEvent.press(screen.getByRole('radio', { name: 'IU' }));
  fireEvent.changeText(screen.getByLabelText('Frequency'), 'Weekly');
  jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('Storage unavailable'));
  await act(async () => pressSave());
  expect(screen.getByRole('alert').props.children).toContain('Your protocol could not be saved');
  expect(screen.getByLabelText('Dose per administration').props.value).toBe('2');
  expect(router.replace).not.toHaveBeenCalled();

  await act(async () => pressSave());
  expect(router.replace).toHaveBeenCalledWith(scanRoute);
});
