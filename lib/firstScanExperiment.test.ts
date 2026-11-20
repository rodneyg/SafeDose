/** @jest-environment jsdom */
import { Platform } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import { ANALYTICS_EVENTS, logAnalyticsEvent } from './analytics';
import { recordFirstScanExperimentSuccess, startFirstScanExperiment, useFirstScanCopy } from './firstScanExperiment';

jest.mock('./analytics', () => ({
  ANALYTICS_EVENTS: {
    FIRST_SCAN_SESSION_STARTED: 'first_scan_session_started',
    FIRST_SCAN_SUCCESS: 'first_scan_success',
  },
  logAnalyticsEvent: jest.fn(),
}));
jest.mock('./onboardingState', () => ({
  ONBOARDING_COMPLETE_KEY: 'onboardingComplete',
  USER_PROFILE_STORAGE_KEY: 'userProfile',
}));

const log = jest.mocked(logAnalyticsEvent);
const props = { experiment_version: 'first_scan_copy_v1', experiment_arm: 'variant' };
const openedAt = 1_800_000_000_000;
const idle = 30 * 60_000;
const platform = Platform.OS;
let stop: ReturnType<typeof startFirstScanExperiment>;

beforeEach(() => {
  Platform.OS = 'web';
  localStorage.clear();
  log.mockClear();
  Object.defineProperty(window.performance, 'timeOrigin', { configurable: true, value: openedAt });
  jest.spyOn(Date, 'now').mockReturnValue(openedAt + 500);
  jest.spyOn(Math, 'random').mockReturnValue(0.5);
});

afterEach(() => {
  stop?.();
  stop = undefined;
  jest.restoreAllMocks();
  Platform.OS = platform;
});

it('enrolls on first open, reveals the treatment and emits just the first successful result', () => {
  const { result } = renderHook(useFirstScanCopy);
  expect(result.current).toBe(false);
  act(() => { stop = startFirstScanExperiment(); });
  expect(result.current).toBe(true);
  expect(log.mock.calls).toEqual([[ANALYTICS_EVENTS.FIRST_SCAN_SESSION_STARTED, props]]);

  jest.mocked(Date.now).mockReturnValue(openedAt + 1200);
  act(() => recordFirstScanExperimentSuccess());
  expect(result.current).toBe(false);
  recordFirstScanExperimentSuccess();
  expect(log).toHaveBeenCalledTimes(2);
  expect(log).toHaveBeenLastCalledWith(ANALYTICS_EVENTS.FIRST_SCAN_SUCCESS, {
    ...props, elapsed_ms: 1200, first_session: 1,
  });
});

it('keeps control assignment and the first-open clock across app reloads', () => {
  jest.mocked(Math.random).mockReturnValue(0.49);
  const cleanup = startFirstScanExperiment();
  cleanup?.();
  jest.mocked(Math.random).mockReturnValue(0.9);
  jest.mocked(Date.now).mockReturnValue(openedAt + 5000);
  stop = startFirstScanExperiment();
  expect(renderHook(useFirstScanCopy).result.current).toBe(false);
  recordFirstScanExperimentSuccess();

  expect(log.mock.calls).toEqual([
    [ANALYTICS_EVENTS.FIRST_SCAN_SESSION_STARTED, { ...props, experiment_arm: 'control' }],
    [ANALYTICS_EVENTS.FIRST_SCAN_SUCCESS, {
      ...props, experiment_arm: 'control', elapsed_ms: 5000, first_session: 1,
    }],
  ]);
});

it('keeps an active first session open past 30 minutes from opening', () => {
  stop = startFirstScanExperiment();
  jest.mocked(Date.now).mockReturnValue(openedAt + idle - 1000);
  window.dispatchEvent(new Event('pointerdown'));
  jest.mocked(Date.now).mockReturnValue(openedAt + idle + 1000);
  recordFirstScanExperimentSuccess();
  expect(log).toHaveBeenLastCalledWith(ANALYTICS_EVENTS.FIRST_SCAN_SUCCESS, {
    ...props, elapsed_ms: idle + 1000, first_session: 1,
  });
});

it('measures later successes without counting them as first-session successes', () => {
  stop = startFirstScanExperiment();
  jest.mocked(Date.now).mockReturnValue(openedAt + idle + 500);
  window.dispatchEvent(new Event('keydown'));
  jest.mocked(Date.now).mockReturnValue(openedAt + idle + 1000);
  recordFirstScanExperimentSuccess();
  expect(log).toHaveBeenLastCalledWith(ANALYTICS_EVENTS.FIRST_SCAN_SUCCESS, {
    ...props, elapsed_ms: idle + 1000, first_session: 0,
  });
});

it.each(['onboardingComplete', 'userProfile'])('excludes returning browsers with %s', key => {
  localStorage.setItem(key, 'true');
  stop = startFirstScanExperiment();
  recordFirstScanExperimentSuccess();
  expect(log).not.toHaveBeenCalled();
});

it('leaves native sessions and blocked browser storage out of the experiment', () => {
  Platform.OS = 'ios';
  expect(startFirstScanExperiment()).toBeUndefined();
  Platform.OS = 'web';
  jest.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
    throw new Error('access denied');
  });
  expect(startFirstScanExperiment()).toBeUndefined();
  expect(renderHook(useFirstScanCopy).result.current).toBe(false);
  expect(() => recordFirstScanExperimentSuccess()).not.toThrow();
  expect(log).not.toHaveBeenCalled();
});
