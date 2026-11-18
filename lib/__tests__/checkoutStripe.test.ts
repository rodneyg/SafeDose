jest.mock('@stripe/stripe-js/pure', () => ({ loadStripe: jest.fn() }));
jest.mock('../stripeConfig', () => ({ __esModule: true, default: { publishableKey: 'pk_test_placeholder' } }));

import { loadStripe } from '@stripe/stripe-js/pure';
import { getCheckoutStripe, STRIPE_LOAD_ERROR } from '../checkoutStripe';

const load = loadStripe as jest.Mock;

test('does not load Stripe on import', () => {
  expect(load).not.toHaveBeenCalled();
});

test('handles blocked scripts, shares pending loads, and allows retry', async () => {
  load.mockRejectedValueOnce(new Error('Failed to load Stripe.js'));
  const first = getCheckoutStripe();
  expect(getCheckoutStripe()).toBe(first);
  await expect(first).rejects.toThrow(STRIPE_LOAD_ERROR);
  expect(load).toHaveBeenCalledTimes(1);

  load.mockResolvedValueOnce(null);
  await expect(getCheckoutStripe()).rejects.toThrow(STRIPE_LOAD_ERROR);

  const stripe = { redirectToCheckout: jest.fn() };
  load.mockResolvedValueOnce(stripe);
  await expect(getCheckoutStripe()).resolves.toBe(stripe);
  await expect(getCheckoutStripe()).resolves.toBe(stripe);
  expect(load).toHaveBeenCalledTimes(3);
});
