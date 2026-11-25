import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import PricingPage from './PricingPage';

jest.mock('react-native-css-interop/jsx-runtime', () => jest.requireActual('react/jsx-runtime'));
const mockToast = jest.fn();
const mockRedirect = jest.fn();
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { isAnonymous: false, getIdToken: async () => 'checkout-test-token' } }),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mockToast }) }));
jest.mock('../../lib/stripeConfig', () => ({ __esModule: true, default: { publishableKey: 'mock-publishable' } }));
function mockStripeModule() {
  return {
    loadStripe: jest.fn(async () => ({
      redirectToCheckout: (...args: unknown[]) => mockRedirect(...args),
    })),
  };
}

// The PR branch and main use different Stripe entry points during this transition.
jest.mock('@stripe/stripe-js', () => mockStripeModule());
jest.mock('@stripe/stripe-js/pure', () => mockStripeModule());
jest.mock('@/components/pricing/PricingCard', () => 'PricingCard');
jest.mock('@/components/pricing/PriceToggle', () => 'PriceToggle');
jest.mock('@/components/pricing/PaymentProviders', () => 'PaymentProviders');

let tree: ReactTestRenderer;
const originalFetch = globalThis.fetch;
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
const mockFetch = jest.fn();
async function select(name = 'Photo Scan') {
  const card = tree.root.findAllByType('PricingCard' as any).find(node => node.props.plan.name === name)!;
  await act(async () => { await card.props.onSelectPlan(card.props.plan); });
}
beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  globalThis.fetch = mockFetch;
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { location: { origin: 'https://safedose.example' } } });
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({ sessionId: 'cs_mock' }) });
  mockRedirect.mockResolvedValue({});
  act(() => { tree = create(<PricingPage />); });
});
afterEach(() => {
  act(() => tree.unmount());
  globalThis.fetch = originalFetch;
  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
  else Object.defineProperty(globalThis, 'window', { configurable: true, value: undefined });
  jest.restoreAllMocks();
});

it.each([false, true])('builds the Photo Scan request for annual=%s and redirects', async annual => {
  act(() => tree.root.findByType('PriceToggle' as any).props.onToggle(annual));
  await select();
  expect(mockFetch).toHaveBeenCalledTimes(1);
  const [url, request] = mockFetch.mock.calls[0];
  expect(url).toBe('https://safedose.example/api/create-checkout-session');
  expect(request.method).toBe('POST');
  expect(request.headers).toEqual({ 'Content-Type': 'application/json', Authorization: 'Bearer checkout-test-token' });
  expect(JSON.parse(request.body)).toEqual({
    offerKey: annual ? 'photo_check_annual' : 'photo_check_monthly', priceId: null,
    successUrl: 'https://safedose.example/success?session_id={CHECKOUT_SESSION_ID}',
    cancelUrl: 'https://safedose.example/pricing', hasTrial: false,
  });
  expect(mockRedirect).toHaveBeenCalledWith({ sessionId: 'cs_mock' });
  expect(mockToast).not.toHaveBeenCalled();
});

it('keeps the free calculator out of checkout', async () => {
  await select('Free');
  expect(mockFetch).not.toHaveBeenCalled();
  expect(mockRedirect).not.toHaveBeenCalled();
  expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Free Plan Selected' }));
});

it.each(['server', 'network', 'invalid-json'])('shows a clear error for %s failure without redirecting', async failure => {
  if (failure === 'network') mockFetch.mockRejectedValue(new Error('Network unavailable'));
  else mockFetch.mockResolvedValue({ ok: false, json: failure === 'invalid-json'
    ? async () => { throw new Error('Invalid JSON'); }
    : async () => ({ error: 'Service unavailable' }) });
  await select();
  expect(mockRedirect).not.toHaveBeenCalled();
  expect(mockToast).toHaveBeenCalledWith({ title: 'Checkout Error',
    description: 'Unable to initiate checkout. Please try again.', variant: 'destructive' });
});

it('shows a clear error when Stripe returns a redirect error', async () => {
  mockRedirect.mockResolvedValue({ error: { message: 'Redirect unavailable' } });
  await select();
  expect(mockToast).toHaveBeenCalledWith({ title: 'Checkout Error',
    description: 'Unable to initiate checkout. Please try again.', variant: 'destructive' });
});
