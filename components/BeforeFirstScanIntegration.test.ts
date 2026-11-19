import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useDoseCalculator from '../lib/hooks/useDoseCalculator';
import BeforeFirstScanScreen from './BeforeFirstScanScreen';
import { logAnalyticsEvent, ANALYTICS_EVENTS } from '../lib/analytics';

const mockUser = { uid: 'test-user', isAnonymous: false };
jest.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock('../lib/analytics', () => ({
  logAnalyticsEvent: jest.fn(),
  ANALYTICS_EVENTS: {
    BEFORE_FIRST_SCAN_PROMPT_SHOWN: 'before_first_scan_prompt_shown',
    BEFORE_FIRST_SCAN_DONT_SHOW_AGAIN: 'before_first_scan_dont_show_again',
    BEFORE_FIRST_SCAN_CONTINUE: 'before_first_scan_continue',
  },
}));
jest.mock('../lib/hooks/useDoseLogging', () => ({ useDoseLogging: () => ({}) }));
jest.mock('../lib/hooks/useWhyAreYouHereTracking', () => ({ useWhyAreYouHereTracking: () => ({}) }));
jest.mock('../lib/hooks/usePMFSurvey', () => ({ usePMFSurvey: () => ({}) }));
jest.mock('../lib/hooks/usePowerUserPromotion', () => ({ usePowerUserPromotion: () => ({}) }));
jest.mock('../lib/hooks/useEvaluationDataCapture', () => ({ useEvaluationDataCapture: () => ({}) }));

// This adapter only connects the real screen to the real calculator handlers.
// Navigation, persistence, prompt policy, and analytics all run in app code.
function Flow() {
  const calculator = useDoseCalculator({ checkUsageLimit: async () => true });
  const { Text, TouchableOpacity } = require('react-native');
  if (calculator.beforeFirstScanPrompt.isLoading) return React.createElement(Text, null, 'Loading');
  if (calculator.screenStep === 'beforeFirstScan') return React.createElement(BeforeFirstScanScreen, {
    onContinue: calculator.handleBeforeFirstScanContinue,
    onBack: calculator.handleBeforeFirstScanBack,
    showDontShowAgain: calculator.beforeFirstScanPrompt.showCount > 0,
    onDontShowAgain: calculator.handleBeforeFirstScanDontShowAgain,
  });
  if (calculator.screenStep === 'scan') return React.createElement(Text, null, 'Camera destination');
  return React.createElement(TouchableOpacity, { onPress: calculator.handleScanNavigation }, React.createElement(Text, null, 'Start scan'));
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

async function start() {
  const screen = render(React.createElement(Flow));
  await waitFor(() => expect(screen.getByText('Start scan')).toBeTruthy());
  fireEvent.press(screen.getByText('Start scan'));
  return screen;
}

it('shows the first prompt, persists Continue, and tracks the real analytics', async () => {
  const screen = await start();
  expect(screen.getByText('Before you scan')).toBeTruthy();
  expect(screen.queryByLabelText("Don't show this again")).toBeNull();
  fireEvent.press(screen.getByLabelText('Continue to scan'));
  await waitFor(() => expect(screen.getByText('Camera destination')).toBeTruthy());
  expect(await AsyncStorage.getItem('beforeFirstScanPromptShown_test-user')).toBe('1');
  expect(logAnalyticsEvent).toHaveBeenCalledWith(ANALYTICS_EVENTS.BEFORE_FIRST_SCAN_PROMPT_SHOWN, {
    userId: 'test-user', isAnonymous: false, showCount: 1,
  });
  expect(logAnalyticsEvent).toHaveBeenCalledWith(ANALYTICS_EVENTS.BEFORE_FIRST_SCAN_CONTINUE, { showCount: 1 });
});

it('persists the second-view opt-out without overwriting it when incrementing the count', async () => {
  await AsyncStorage.setItem('beforeFirstScanPromptShown_test-user', '1');
  const screen = await start();
  fireEvent.press(screen.getByLabelText("Don't show this again"));
  await waitFor(() => expect(screen.getByText('Camera destination')).toBeTruthy());
  expect(await AsyncStorage.getItem('beforeFirstScanDontShowAgain_test-user')).toBe('true');
  expect(await AsyncStorage.getItem('beforeFirstScanPromptShown_test-user')).toBe('2');
  expect(logAnalyticsEvent).toHaveBeenCalledWith(ANALYTICS_EVENTS.BEFORE_FIRST_SCAN_DONT_SHOW_AGAIN, {
    userId: 'test-user', isAnonymous: false, showCount: 1,
  });
  expect(logAnalyticsEvent).toHaveBeenCalledWith(ANALYTICS_EVENTS.BEFORE_FIRST_SCAN_PROMPT_SHOWN, {
    userId: 'test-user', isAnonymous: false, showCount: 2,
  });
  screen.unmount();
  const nextSession = await start();
  expect(nextSession.getByText('Camera destination')).toBeTruthy();
  expect(nextSession.queryByText('Before you scan')).toBeNull();
});

it.each([['2', 'false'], ['1', 'true']])('bypasses the prompt for saved count %s and opt-out %s', async (count, optedOut) => {
  await AsyncStorage.multiSet([
    ['beforeFirstScanPromptShown_test-user', count],
    ['beforeFirstScanDontShowAgain_test-user', optedOut],
  ]);
  const screen = await start();
  expect(screen.getByText('Camera destination')).toBeTruthy();
  expect(screen.queryByText('Before you scan')).toBeNull();
  expect(logAnalyticsEvent).not.toHaveBeenCalled();
});

it('Back returns to intro without consuming a viewing', async () => {
  const screen = await start();
  fireEvent.press(screen.getByLabelText('Go back'));
  expect(screen.getByText('Start scan')).toBeTruthy();
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  expect(logAnalyticsEvent).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText('Start scan'));
  expect(screen.getByText('Before you scan')).toBeTruthy();
  expect(screen.queryByLabelText("Don't show this again")).toBeNull();
});
