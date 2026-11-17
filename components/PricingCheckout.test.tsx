import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { loadStripe } from '@stripe/stripe-js/pure';
import PricingPage from '../app/pricing';

jest.mock('react-native-css-interop/jsx-runtime', () => jest.requireActual('react/jsx-runtime'));
jest.mock('@stripe/stripe-js/pure', () => ({ loadStripe: jest.fn() }));
jest.mock('@stripe/stripe-js', () => ({ loadStripe: jest.fn().mockResolvedValue(null) }));
jest.mock('../lib/stripeConfig', () => ({ publishableKey: 'test-placeholder' }));
jest.mock('../lib/analytics', () => ({ logAnalyticsEvent: jest.fn(), ANALYTICS_EVENTS: {} }));
jest.mock('../lib/apiBase', () => ({ getApiBaseUrl: () => 'https://example.invalid' }));
jest.mock('../contexts/UserProfileContext', () => ({ useUserProfile: () => ({ profile: null }) }));
jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));
jest.mock('lucide-react-native', () => new Proxy({}, { get: (_, key) => String(key) }));
jest.mock('react-native', () => ({
  ...jest.requireActual('../__mocks__/react-native'),
  Animated: {
    Value: class { interpolate() { return 1; } }, View: 'View',
    timing: () => ({}), parallel: () => ({ start() {} }), sequence: () => ({ start() {} }),
  },
}));

const eagerLoadCount = jest.requireMock('@stripe/stripe-js').loadStripe.mock.calls.length;
let renderer: ReactTestRenderer;
const loader = loadStripe as jest.Mock;
const message = 'Checkout could not load. Disable your ad blocker or try another browser.';
const button = () => renderer.root.findAllByType('TouchableOpacity' as any)
  .find(node => node.props.disabled !== undefined)!;
const text = () => renderer.root.findAllByType('Text' as any)
  .map(node => React.Children.toArray(node.props.children).join('')).join('\n');

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  global.fetch = jest.fn();
  act(() => { renderer = create(<PricingPage />); });
});
afterEach(() => { act(() => renderer.unmount()); jest.restoreAllMocks(); });

it('does not load Stripe while browsing pricing', () => {
  expect(eagerLoadCount).toBe(0);
  expect(loader).not.toHaveBeenCalled();
  expect(text()).toContain('Get Photo Check');
});

it.each(['reject', 'null', 'throw'])('handles a %s loader failure and allows retry', async failure => {
  if (failure === 'reject') loader.mockRejectedValueOnce(new Error('Failed to load Stripe.js'));
  else if (failure === 'throw') loader.mockImplementationOnce(() => { throw new Error('blocked'); });
  else loader.mockResolvedValueOnce(null);
  await act(async () => { await button().props.onPress(); });
  expect(text()).toContain(message);
  expect(button().props.disabled).toBe(false);
  expect(fetch).not.toHaveBeenCalled();

  const redirectToCheckout = jest.fn().mockResolvedValue({});
  loader.mockResolvedValueOnce({ redirectToCheckout });
  (fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200, text: async () => JSON.stringify({ sessionId: 'test-session' }) });
  await act(async () => { await button().props.onPress(); });
  expect(text()).not.toContain(message);
  expect(fetch).toHaveBeenCalledWith('https://example.invalid/api/create-checkout-session', expect.objectContaining({
    method: 'POST',
    body: JSON.stringify({ offerKey: 'photo_check_monthly', successUrl: 'https://example.invalid/success?session_id={CHECKOUT_SESSION_ID}', cancelUrl: 'https://example.invalid/pricing', hasTrial: false }),
  }));
  expect(redirectToCheckout).toHaveBeenCalledWith({ sessionId: 'test-session' });
});
