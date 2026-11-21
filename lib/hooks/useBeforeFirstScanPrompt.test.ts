import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useBeforeFirstScanPrompt } from './useBeforeFirstScanPrompt';

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));

jest.mock('../analytics', () => ({
  logAnalyticsEvent: jest.fn(),
  ANALYTICS_EVENTS: {
    BEFORE_FIRST_SCAN_PROMPT_SHOWN: 'prompt_shown',
    BEFORE_FIRST_SCAN_DONT_SHOW_AGAIN: 'prompt_opt_out',
  },
}));

const countKey = 'beforeFirstScanPromptShown_anonymous';
const optOutKey = 'beforeFirstScanDontShowAgain_anonymous';

beforeEach(async () => {
  await AsyncStorage.clear();
});

test('allows two views and remembers them after remounting', async () => {
  const { result, unmount } = renderHook(useBeforeFirstScanPrompt);
  expect(result.current.shouldShowPrompt()).toBe(false);
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.shouldShowPrompt()).toBe(true);

  const markShown = result.current.markPromptAsShown;
  await act(markShown);
  expect(result.current.shouldShowPrompt()).toBe(true);
  await act(markShown);
  expect(result.current.showCount).toBe(2);
  expect(result.current.shouldShowPrompt()).toBe(false);
  expect(await AsyncStorage.getItem(countKey)).toBe('2');

  unmount();
  const reopened = renderHook(useBeforeFirstScanPrompt);
  await waitFor(() => expect(reopened.result.current.isLoading).toBe(false));
  expect(reopened.result.current.showCount).toBe(2);
  expect(reopened.result.current.shouldShowPrompt()).toBe(false);
});

test('remembers an opt-out before the view limit', async () => {
  const { result, unmount } = renderHook(useBeforeFirstScanPrompt);
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  await act(result.current.markDontShowAgain);
  expect(result.current.shouldShowPrompt()).toBe(false);
  expect(await AsyncStorage.getItem(optOutKey)).toBe('true');

  unmount();
  const reopened = renderHook(useBeforeFirstScanPrompt);
  await waitFor(() => expect(reopened.result.current.isLoading).toBe(false));
  expect(reopened.result.current.showCount).toBe(0);
  expect(reopened.result.current.shouldShowPrompt()).toBe(false);
});
