import { inject, pageview } from '@vercel/analytics';
import { usePathname } from 'expo-router';
import { Platform } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { WebAnalytics } from './WebAnalytics';

jest.mock('@vercel/analytics', () => ({ inject: jest.fn(), pageview: jest.fn() }));
jest.mock('expo-router', () => ({ usePathname: jest.fn() }));
jest.mock('react-native', () => ({ Platform: { OS: 'web' } }));

const mockInject = jest.mocked(inject);
const mockUsePathname = jest.mocked(usePathname);
let renderer: ReactTestRenderer;

beforeEach(() => {
  jest.clearAllMocks();
  mockUsePathname.mockReturnValue('/');
});

afterEach(() => {
  act(() => renderer.unmount());
});

it('starts once and sends initial and changed pathnames', () => {
  Platform.OS = 'web';
  act(() => { renderer = create(<WebAnalytics />); });
  act(() => renderer.update(<WebAnalytics />));

  mockUsePathname.mockReturnValue('/onboarding');
  act(() => renderer.update(<WebAnalytics />));

  expect(mockInject).toHaveBeenCalledTimes(1);
  expect(pageview).toHaveBeenCalledTimes(2);
  expect(pageview).toHaveBeenNthCalledWith(1, { route: '/', path: '/' });
  expect(pageview).toHaveBeenNthCalledWith(2, { route: '/onboarding', path: '/onboarding' });
  const options = mockInject.mock.calls[0][0];
  expect(options?.disableAutoTrack).toBe(true);
  expect(options?.beforeSend?.({
    type: 'pageview',
    url: 'https://example.com/reset-password?oobCode=fixture#fragment',
  })).toEqual({ type: 'pageview', url: 'https://example.com/reset-password' });
});

it.each(['ios', 'android'] as const)('skips Vercel Analytics on %s', (os) => {
  Platform.OS = os;
  act(() => { renderer = create(<WebAnalytics />); });
  expect(mockUsePathname).not.toHaveBeenCalled();
  expect(mockInject).not.toHaveBeenCalled();
  expect(pageview).not.toHaveBeenCalled();
});
