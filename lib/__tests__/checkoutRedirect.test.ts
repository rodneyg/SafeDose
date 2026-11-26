import { Linking } from 'react-native';
import { checkoutHttpsUrl, openCheckoutUrl } from '../checkoutRedirect';

jest.mock('react-native', () => ({
  Linking: { openURL: jest.fn() },
  Platform: { OS: 'ios' },
}));

const openURL = Linking.openURL as jest.Mock;
beforeEach(() => jest.clearAllMocks());

it('accepts an HTTPS checkout URL and opens it on native', async () => {
  openURL.mockResolvedValue(undefined);
  expect(checkoutHttpsUrl('https://checkout.stripe.com/c/pay/session')).toBe('https://checkout.stripe.com/c/pay/session');
  await openCheckoutUrl('https://checkout.stripe.com/c/pay/session');
  expect(openURL).toHaveBeenCalledWith('https://checkout.stripe.com/c/pay/session');
});

it.each(['http://checkout.stripe.com/c/pay/session', 'javascript:alert(1)', 'https://user:pass@checkout.stripe.com/session', null])(
  'rejects unsafe checkout URL %p', value => {
    expect(() => checkoutHttpsUrl(value)).toThrow('Unable to open checkout. Please try again.');
  },
);
