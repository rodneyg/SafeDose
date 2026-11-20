import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { loadStripe } from '@stripe/stripe-js/pure';

jest.mock('react-native-css-interop/jsx-runtime', () => jest.requireActual('react/jsx-runtime'));
jest.mock('@stripe/stripe-js/pure', () => ({ loadStripe: jest.fn() }));
jest.mock('@stripe/stripe-js', () => ({ loadStripe: jest.fn().mockResolvedValue(null) }));
jest.mock('../lib/stripeConfig', () => ({ publishableKey: 'test-placeholder' }));
jest.mock('../lib/analytics', () => ({ logAnalyticsEvent: jest.fn(), ANALYTICS_EVENTS: {} }));
jest.mock('../lib/apiBase', () => ({ getApiBaseUrl: () => 'https://example.invalid' }));
jest.mock('../contexts/UserProfileContext', () => ({ useUserProfile: () => ({ profile: null }) }));
jest.mock('expo-router', () => ({ Link: 'Link', router: { back: jest.fn() } }));
jest.mock('lucide-react-native', () => new Proxy({}, { get: (_, key) => String(key) }));
jest.mock('react-native', () => ({
  ...jest.requireActual('../__mocks__/react-native'),
  Animated: {
    Value: class { interpolate() { return 1; } }, View: 'View',
    timing: () => ({}), parallel: () => ({ start() {} }), sequence: () => ({ start() {} }),
  },
}));

let renderer: ReactTestRenderer;
const loader = loadStripe as jest.Mock;
const eagerLoader = jest.requireMock('@stripe/stripe-js').loadStripe;
const message = 'Unable to load secure checkout. Please allow Stripe in your browser or network settings and try again.';
const button = () => renderer.root.findAllByType('TouchableOpacity' as any)
  .find(node => node.props.disabled !== undefined)!;
const text = () => renderer.root.findAllByType('Text' as any)
  .map(node => React.Children.toArray(node.props.children).join('')).join('\n');

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Unexpected checkout request'));
  // Keep React shared with the renderer while giving each case a fresh Stripe cache.
  jest.doMock('react', () => React);
  jest.isolateModules(() => {
    const PricingPage = require('../app/pricing').default;
    act(() => { renderer = create(<PricingPage />); });
  });
});
afterEach(() => { act(() => renderer.unmount()); jest.restoreAllMocks(); });

it('does not load Stripe while browsing pricing', () => {
  expect(eagerLoader).not.toHaveBeenCalled();
  expect(loader).not.toHaveBeenCalled();
  expect(text()).toContain('Get Photo Scan');
});

it('links the pricing footer to subscription settings, legal pages, and support', () => {
  const links = renderer.root.findAllByType('Link' as any);
  expect(links.map(({ props }) => [props.children, props.href])).toEqual([
    ['Manage subscription', '/settings'],
    ['Terms of Service', '/terms'],
    ['Privacy Policy', '/privacy'],
    ['Support', '/support'],
    ['Understanding dosing', '/dosing-problem'],
  ]);
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
