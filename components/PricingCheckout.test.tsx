import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { loadStripe } from '@stripe/stripe-js/pure';

jest.mock('react-native-css-interop/jsx-runtime', () => jest.requireActual('react/jsx-runtime'));
jest.mock('@stripe/stripe-js/pure', () => ({ loadStripe: jest.fn() }));
jest.mock('@stripe/stripe-js', () => ({ loadStripe: jest.fn().mockResolvedValue(null) }));
jest.mock('../lib/stripeConfig', () => ({ publishableKey: 'test-placeholder' }));
const mockLogAnalytics = jest.fn();
let mockPlatform = 'ios';
let mockOffer: string | undefined;

jest.mock('../lib/analytics', () => ({
  logAnalyticsEvent: mockLogAnalytics,
  ANALYTICS_EVENTS: {
    VIEW_PRICING_PAGE: 'view_pricing_page',
    INITIATE_UPGRADE: 'initiate_upgrade',
    UPGRADE_FAILURE: 'upgrade_failure',
  },
}));
jest.mock('../lib/apiBase', () => ({ getApiBaseUrl: () => 'https://example.invalid' }));
jest.mock('../contexts/UserProfileContext', () => ({ useUserProfile: () => ({ profile: null }) }));
let mockUser: { isAnonymous: boolean; getIdToken: () => Promise<string> };
const mockNavigate = jest.fn();
jest.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock('expo-router', () => ({
  Link: 'Link', router: { back: jest.fn(), push: mockNavigate }, useLocalSearchParams: () => ({ offer: mockOffer }),
}));
jest.mock('./UpgradeEmailForm', () => 'UpgradeEmailForm');
jest.mock('lucide-react-native', () => new Proxy({}, { get: (_, key) => String(key) }));
jest.mock('react-native', () => ({
  ...jest.requireActual('../__mocks__/react-native'),
  Platform: { OS: mockPlatform },
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
  .find(node => node.props.activeOpacity === 0.9)!;
const options = () => renderer.root.findAllByType('TouchableOpacity' as any)
  .filter(node => node.props.accessibilityState || node.props['aria-pressed'] !== undefined);
const selectionState = () => options().map(option =>
  option.props['aria-pressed'] ?? option.props.accessibilityState.selected);
const text = () => renderer.root.findAllByType('Text' as any)
  .map(node => React.Children.toArray(node.props.children).join('')).join('\n');

beforeEach(() => {
  jest.clearAllMocks();
  mockUser = { isAnonymous: false, getIdToken: jest.fn().mockResolvedValue('checkout-test-token') };
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Unexpected checkout request'));
  mountPricing();
});

function mountPricing() {
  // Keep React shared with the renderer while giving each mount a fresh Stripe cache.
  jest.doMock('react', () => React);
  jest.isolateModules(() => {
    const PricingPage = require('../app/pricing').default;
    act(() => { renderer = create(<PricingPage />); });
  });
}

const originalWindow = global.window;
afterEach(() => {
  act(() => renderer.unmount());
  jest.restoreAllMocks();
  mockPlatform = 'ios';
  mockOffer = undefined;
  if (originalWindow === undefined) delete (global as any).window;
  else global.window = originalWindow;
});

it('does not load Stripe while browsing pricing', () => {
  expect(eagerLoader).not.toHaveBeenCalled();
  expect(loader).not.toHaveBeenCalled();
  expect(text()).toContain('Get Photo Scan');
  expect(text()).toContain('Unlimited photo scans');
  expect(text()).not.toMatch(/photo checks?/i);
});

it('offers the existing email capture on the upgrade screen', async () => {
  const form = renderer.root.findByType('UpgradeEmailForm' as any);
  await expect(form.props.getIdToken()).resolves.toBe('checkout-test-token');
  expect(mockUser.getIdToken).toHaveBeenCalledTimes(1);
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
  (fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200, json: async () => ({ sessionId: 'test-session' }) });
  await act(async () => { await button().props.onPress(); });
  expect(text()).not.toContain(message);
  expect(fetch).toHaveBeenCalledWith('https://example.invalid/api/create-checkout-session', expect.objectContaining({
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer checkout-test-token' },
    body: JSON.stringify({ offerKey: 'photo_check_monthly', successUrl: 'https://example.invalid/success?session_id={CHECKOUT_SESSION_ID}', cancelUrl: 'https://example.invalid/pricing', hasTrial: false }),
  }));
  expect(redirectToCheckout).toHaveBeenCalledWith({ sessionId: 'test-session' });
});

it('takes a guest to sign in before loading Stripe', async () => {
  act(() => renderer.unmount());
  mockUser.isAnonymous = true;
  mountPricing();
  expect(text()).toContain('Sign in to link Photo Scan to your account.');
  await act(async () => { await button().props.onPress(); });
  expect(mockNavigate).toHaveBeenCalledWith({
    pathname: '/login', params: { from: 'pricing', offer: 'photo_check_monthly' },
  });
  expect(loader).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
});
it('keeps the monthly default and the legacy view event on native', () => {
  expect(selectionState()).toEqual([true, false]);
  expect(mockLogAnalytics.mock.calls).toEqual([['view_pricing_page']]);
});

describe('web pricing default experiment', () => {
  let storage: Map<string, string>;

  beforeEach(() => {
    act(() => renderer.unmount());
    mockLogAnalytics.mockClear();
    mockPlatform = 'web';
    storage = new Map();
    (global as any).window = {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
      },
    };
  });

  it.each([
    [0.49, 'monthly', [true, false]],
    [0.5, 'annual', [false, true]],
  ] as const)('assigns %s to %s and reuses the assignment on remount', (random, arm, selection) => {
    const coin = jest.spyOn(Math, 'random').mockReturnValue(random);
    mountPricing();
    expect(selectionState()).toEqual(selection);
    expect(mockLogAnalytics.mock.calls).toEqual([['view_pricing_page'], [`pricing_v1_${arm}_view`]]);

    act(() => renderer.unmount());
    coin.mockReturnValue(1 - random);
    mountPricing();
    expect(selectionState()).toEqual(selection);
  });

  it('exposes the primary pricing action as a button on web', () => {
    mountPricing();
    expect(button().props.accessibilityRole).toBe('button');
  });

  it('restores the selected offer after sign-in even when the experiment defaults to monthly', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.25);
    mockOffer = 'photo_check_annual';
    mountPricing();
    expect(selectionState()).toEqual([false, true]);
    expect(mockLogAnalytics).toHaveBeenCalledWith('pricing_v1_monthly_view');

    act(() => options()[0].props.onPress());
    expect(selectionState()).toEqual([true, false]);
  });

  it('keeps the monthly default outside the experiment if storage is blocked', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.75);
    jest.spyOn(window.localStorage, 'setItem').mockImplementation(() => { throw new Error('Storage blocked'); });
    mountPricing();
    expect(selectionState()).toEqual([true, false]);
    expect(mockLogAnalytics.mock.calls).toEqual([['view_pricing_page']]);
  });

  it('attributes explicit choices to the original arm and checks out the selected offer', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.75);
    mountPricing();
    expect(mockLogAnalytics).not.toHaveBeenCalledWith('pricing_v1_annual_select_yr');

    act(() => options()[0].props.onPress());
    act(() => options()[1].props.onPress());
    expect(mockLogAnalytics).toHaveBeenCalledWith('pricing_v1_annual_select_mo');
    expect(mockLogAnalytics).toHaveBeenCalledWith('pricing_v1_annual_select_yr');

    const redirectToCheckout = jest.fn().mockResolvedValue({});
    loader.mockResolvedValueOnce({ redirectToCheckout });
    (fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({ error: 'Unavailable' }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ sessionId: 'test-session' }) });

    await act(async () => { await button().props.onPress(); });
    await act(async () => { await button().props.onPress(); });
    expect(mockLogAnalytics.mock.calls.filter(([name]) => name.endsWith('_checkout_start'))).toEqual([]);
    expect(redirectToCheckout).not.toHaveBeenCalled();

    await act(async () => { await button().props.onPress(); });
    expect(JSON.parse((fetch as jest.Mock).mock.lastCall[1].body).offerKey).toBe('photo_check_annual');
    expect(mockLogAnalytics.mock.calls.filter(([name]) => name.endsWith('_checkout_start'))).toEqual([
      ['pricing_v1_annual_checkout_start', { plan: 'photo_check_annual' }],
    ]);
    expect(redirectToCheckout).toHaveBeenCalledWith({ sessionId: 'test-session' });
  });
});
