import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useBeforeFirstScanPrompt } from './useBeforeFirstScanPrompt';

let mockUser: { uid: string; isAnonymous: boolean } | null = null;

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
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
  mockUser = null;
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

test('recovers an invalid saved count to zero and keeps the opt-out flag', async () => {
  await AsyncStorage.setItem(countKey, 'not-a-number');
  const { result } = renderHook(useBeforeFirstScanPrompt);
  await waitFor(() => expect(result.current.isLoading).toBe(false));

  expect(result.current.showCount).toBe(0);
  expect(result.current.shouldShowPrompt()).toBe(true);
  await act(result.current.markPromptAsShown);
  expect(await AsyncStorage.getItem(countKey)).toBe('1');
  expect(await AsyncStorage.getItem(optOutKey)).toBe('false');

  await AsyncStorage.setItem(countKey, 'not-a-number');
  await AsyncStorage.setItem(optOutKey, 'true');
  const optedOut = renderHook(useBeforeFirstScanPrompt);
  await waitFor(() => expect(optedOut.result.current.isLoading).toBe(false));
  expect(optedOut.result.current.showCount).toBe(0);
  expect(optedOut.result.current.shouldShowPrompt()).toBe(false);
});

test('ignores a previous account storage read that resolves after the current account opted out', async () => {
  const deferredValue = () => {
    let resolve!: (value: string | null) => void;
    const promise = new Promise<string | null>((done) => { resolve = done; });
    return { promise, resolve };
  };
  const accountACount = deferredValue();
  const accountAOptOut = deferredValue();
  jest.spyOn(AsyncStorage, 'getItem').mockImplementation((key: string) => {
    if (key === 'beforeFirstScanPromptShown_account-a') return accountACount.promise;
    if (key === 'beforeFirstScanDontShowAgain_account-a') return accountAOptOut.promise;
    if (key === 'beforeFirstScanDontShowAgain_account-b') return Promise.resolve('true');
    return Promise.resolve(null);
  });

  mockUser = { uid: 'account-a', isAnonymous: false };
  const { result, rerender } = renderHook(useBeforeFirstScanPrompt);
  mockUser = { uid: 'account-b', isAnonymous: false };
  rerender({});

  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.shouldShowPrompt()).toBe(false);

  await act(async () => {
    accountACount.resolve('0');
    accountAOptOut.resolve(null);
    await Promise.all([accountACount.promise, accountAOptOut.promise]);
  });

  expect(result.current.shouldShowPrompt()).toBe(false);
  expect(result.current.showCount).toBe(0);
});
