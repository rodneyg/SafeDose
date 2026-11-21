import { inject } from '@vercel/analytics';
import { Platform } from 'react-native';
import { initializeWebAnalytics } from './webAnalytics';

jest.mock('@vercel/analytics', () => ({ inject: jest.fn() }));
jest.mock('react-native', () => ({ Platform: { OS: 'web' } }));

const mockInject = jest.mocked(inject);

beforeEach(() => mockInject.mockClear());

it('starts automatic web page tracking without URL parameters or fragments', () => {
  Platform.OS = 'web';
  initializeWebAnalytics();

  expect(mockInject).toHaveBeenCalledTimes(1);
  const options = mockInject.mock.calls[0][0];
  expect(options?.disableAutoTrack).not.toBe(true);
  expect(options?.beforeSend?.({
    type: 'pageview',
    url: 'https://example.com/reset-password?oobCode=fixture#fragment',
  })).toEqual({ type: 'pageview', url: 'https://example.com/reset-password' });
});

it.each(['ios', 'android'] as const)('skips Vercel Analytics on %s', (os) => {
  Platform.OS = os;
  initializeWebAnalytics();
  expect(mockInject).not.toHaveBeenCalled();
});
