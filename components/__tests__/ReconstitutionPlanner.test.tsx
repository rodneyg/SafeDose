import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { captureAndProcessImage } from '../../lib/cameraUtils';
import ReconstitutionPlanner from '../ReconstitutionPlanner';

jest.mock('expo-camera', () => ({
  CameraView: 'CameraView',
  useCameraPermissions: () => [{ granted: true, status: 'granted' }, jest.fn()],
}));
jest.mock('lucide-react-native', () => new Proxy({}, { get: (_, key) => String(key) }));
jest.mock('../../lib/utils', () => ({ isMobileWeb: false }));
jest.mock('../../lib/cameraUtils', () => ({ captureAndProcessImage: jest.fn() }));

beforeEach(() => jest.clearAllMocks());

it('shows a manual volume error and renders the recalculated plan after correction', () => {
  render(<ReconstitutionPlanner />);

  fireEvent.press(screen.getByText('Enter Manually'));
  fireEvent.changeText(screen.getByPlaceholderText('5'), '5');
  fireEvent.changeText(screen.getByPlaceholderText('250'), '500');
  fireEvent.changeText(screen.getByPlaceholderText('0.1'), '0');
  fireEvent.press(screen.getByText('Calculate'));

  expect(screen.getByText('Please enter a valid preferred volume greater than 0')).toBeTruthy();
  expect(screen.queryByText('Use in Dose Calculator')).toBeNull();

  fireEvent.changeText(screen.getByPlaceholderText('0.1'), '0.15');
  fireEvent.press(screen.getByText('Calculate'));

  expect(screen.getByText('1.50 mL')).toBeTruthy();
  expect(screen.getByText('3.333 mg/mL')).toBeTruthy();
  expect(screen.getByText('0.150 mL on your syringe')).toBeTruthy();
});

it('calculates with the parsed scan amount and passes exact concentration to the dose calculator', async () => {
  jest.mocked(captureAndProcessImage).mockResolvedValueOnce({
    syringe: { type: null, volume: null, markings: null, scale: null, capacity_ml: null },
    vial: { substance: null, totalAmount: '5 mg', concentration: null, expiration: null },
    fill: { units: null, ml: null, plunger_visible: null },
    confidence: {},
    refuse: false,
    reasons: [],
    raw: '',
  });
  render(<ReconstitutionPlanner />);

  fireEvent.press(screen.getByText('Scan Vial Label'));
  fireEvent.press(screen.getByText('Capture Label'));

  expect(await screen.findByDisplayValue('5')).toBeTruthy();
  fireEvent.changeText(screen.getByPlaceholderText('250'), '500');
  fireEvent.changeText(screen.getByPlaceholderText('0.1'), '0.15');
  fireEvent.press(screen.getByText('Calculate'));
  expect(screen.getByText('3.333 mg/mL')).toBeTruthy();

  fireEvent.press(screen.getByText('Use in Dose Calculator'));

  expect(router.push).toHaveBeenCalledWith(
    '/(tabs)/new-dose?prefillTotalAmount=5&prefillTotalUnit=mg&prefillSolutionVolume=1.5&prefillConcentrationExact=10%2F3&prefillDose=500&prefillDoseUnit=mcg',
  );
});
