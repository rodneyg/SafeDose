import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import FinalResultDisplay from './FinalResultDisplay';

jest.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: null, auth: {} }) }));
jest.mock('../contexts/UserProfileContext', () => ({ useUserProfile: () => ({ disclaimerText: 'Verify your prescription' }) }));
jest.mock('../lib/hooks/useDoseLogging', () => ({ useDoseLogging: () => ({ logDose: jest.fn(), isLogging: false }) }));

const base: React.ComponentProps<typeof FinalResultDisplay> = {
  calculationError: null, recommendedMarking: '2.5', doseValue: 5, unit: 'mg',
  substanceName: 'Test Medication', manualSyringe: { type: 'Standard', volume: '3 ml' },
  calculatedVolume: 2.5, handleStartOver: jest.fn(), setScreenStep: jest.fn(),
  handleGoToFeedback: jest.fn(), lastActionType: 'manual', isMobileWeb: false,
  usageData: { scansUsed: 2, limit: 3, plan: 'free' }, onTryAIScan: jest.fn(),
};

it('offers AI Scan after a successful manual calculation and invokes the scan handler', () => {
  const onTryAIScan = jest.fn();
  const screen = render(React.createElement(FinalResultDisplay, { ...base, onTryAIScan }));
  expect(screen.getByText('Want to double-check with a vial/syringe photo?')).toBeTruthy();
  fireEvent.press(screen.getByLabelText('Try AI Scan to double-check your calculation'));
  expect(onTryAIScan).toHaveBeenCalledTimes(1);
});

it.each<[string, Partial<React.ComponentProps<typeof FinalResultDisplay>>]>([
  ['scan result', { lastActionType: 'scan' }],
  ['no previous action', { lastActionType: null }],
  ['calculation error', { calculationError: 'Invalid dose calculation', recommendedMarking: null }],
  ['missing marking', { recommendedMarking: null }],
  ['exhausted scans', { usageData: { scansUsed: 3, limit: 3, plan: 'free' } }],
  ['over limit', { usageData: { scansUsed: 4, limit: 3, plan: 'free' } }],
  ['missing usage data', { usageData: undefined }],
  ['missing scan handler', { onTryAIScan: undefined }],
])('hides the teaser for %s', (_name, overrides) => {
  const screen = render(React.createElement(FinalResultDisplay, { ...base, ...overrides }));
  expect(screen.queryByText('Try AI Scan')).toBeNull();
  expect(screen.queryByText('Want to double-check with a vial/syringe photo?')).toBeNull();
});

it('keeps result actions working when the teaser is hidden', () => {
  const handleGoToFeedback = jest.fn();
  const screen = render(React.createElement(FinalResultDisplay, { ...base, lastActionType: 'scan', handleGoToFeedback }));
  expect(screen.getByText('Test Medication', { exact: false })).toBeTruthy();
  fireEvent.press(screen.getByText('Done'));
  fireEvent.press(screen.getByText('New Dose'));
  expect(handleGoToFeedback.mock.calls).toEqual([['start_over'], ['new_dose']]);
});
