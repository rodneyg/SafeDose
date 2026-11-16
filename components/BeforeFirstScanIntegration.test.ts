/** Integration coverage for the real first-scan prompt hook and screen. */
import React from 'react';
import { render, renderHook, fireEvent, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BeforeFirstScanScreen from './BeforeFirstScanScreen';
import { useBeforeFirstScanPrompt } from '../lib/hooks/useBeforeFirstScanPrompt';
import { logAnalyticsEvent, ANALYTICS_EVENTS } from '../lib/analytics';

const mockUser = { uid: 'test-user', isAnonymous: false };
jest.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock('../lib/analytics', () => ({
  logAnalyticsEvent: jest.fn(),
  ANALYTICS_EVENTS: {
    BEFORE_FIRST_SCAN_PROMPT_SHOWN: 'before_first_scan_prompt_shown',
    BEFORE_FIRST_SCAN_DONT_SHOW_AGAIN: 'before_first_scan_dont_show_again',
  },
}));

async function prompt(showCount = 0, dontShowAgain = false) {
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async key =>
    key.startsWith('beforeFirstScanPromptShown') ? String(showCount) : String(dontShowAgain));
  const hook = renderHook(() => useBeforeFirstScanPrompt());
  await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
  return hook;
}

beforeEach(() => { jest.clearAllMocks(); });

describe('Before First Scan Integration Test', () => {
  it('should show prompt on first scan attempt and track analytics', async () => {
    const { result } = await prompt();
    expect(result.current.shouldShowPrompt()).toBe(true);
    const onContinue = jest.fn(() => result.current.markPromptAsShown());
    const screen = render(React.createElement(BeforeFirstScanScreen, {
      onContinue, onBack: jest.fn(), showDontShowAgain: result.current.showCount > 0,
    }));
    expect(screen.queryByText("Don't show again")).toBeNull();
    await act(async () => { fireEvent.press(screen.getByText('Continue to Scan')); });
    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(result.current.showCount).toBe(1);
    expect(logAnalyticsEvent).toHaveBeenCalledWith(
      ANALYTICS_EVENTS.BEFORE_FIRST_SCAN_PROMPT_SHOWN, expect.objectContaining({ showCount: 1 }));
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('beforeFirstScanPromptShown_test-user', '1');
  });

  it('should show prompt with dont show again option', async () => {
    const { result } = await prompt(1);
    expect(result.current.shouldShowPrompt()).toBe(true);
    const onDontShowAgain = jest.fn(() => result.current.markDontShowAgain());
    const screen = render(React.createElement(BeforeFirstScanScreen, {
      onContinue: jest.fn(), onBack: jest.fn(), onDontShowAgain, showDontShowAgain: true,
    }));
    await act(async () => { fireEvent.press(screen.getByText("Don't show again")); });
    expect(onDontShowAgain).toHaveBeenCalledTimes(1);
    expect(result.current.shouldShowPrompt()).toBe(false);
    expect(logAnalyticsEvent).toHaveBeenCalledWith(
      ANALYTICS_EVENTS.BEFORE_FIRST_SCAN_DONT_SHOW_AGAIN, expect.objectContaining({ showCount: 1 }));
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('beforeFirstScanDontShowAgain_test-user', 'true');
  });

  it('should not show prompt after 2 times or dont show again', async () => {
    const limited = await prompt(2);
    expect(limited.result.current.shouldShowPrompt()).toBe(false);
    limited.unmount();
    const dismissed = await prompt(1, true);
    expect(dismissed.result.current.shouldShowPrompt()).toBe(false);
  });

  it('should allow back navigation to intro', async () => {
    const { result } = await prompt();
    let currentScreen = 'beforeFirstScan';
    const onBack = jest.fn(() => { currentScreen = 'intro'; });
    const screen = render(React.createElement(BeforeFirstScanScreen, {
      onContinue: jest.fn(), onBack,
    }));
    fireEvent.press(screen.getByText('Back'));
    expect(currentScreen).toBe('intro');
    expect(result.current.showCount).toBe(0);
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('should include all required materials and general rule', () => {
    const screen = render(React.createElement(BeforeFirstScanScreen, {
      onContinue: jest.fn(), onBack: jest.fn(),
    }));
    for (const text of ['Medication vial with clear labels', 'Syringe with visible markings',
      'Prescription box or label', 'Before you scan', "Let's make sure you have what you need"]) {
      expect(screen.getByText(text)).toBeTruthy();
    }
    expect(screen.getByText(/baseline reference/)).toBeTruthy();
  });
});
