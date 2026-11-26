import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import SuccessScreen from '../app/success';
import { billingRequest } from '../lib/subscriptionStatus';

jest.mock('react-native-css-interop/jsx-runtime', () => jest.requireActual('react/jsx-runtime'));
jest.mock('react-native', () => jest.requireActual('../__mocks__/react-native'));
jest.mock('expo-router', () => ({ useLocalSearchParams: () => ({ session_id: 'test-session' }) }));
jest.mock('../lib/subscriptionStatus', () => ({ billingRequest: jest.fn() }));

const mockUser = { isAnonymous: false };
jest.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));

it.each([
  ['pending', 'Photo Scan will activate when Stripe confirms payment.'],
  ['active', 'Photo Scan is active'],
  ['inactive', 'Photo Scan is inactive'],
  ['unavailable', 'Photo Scan status unavailable'],
])('uses Photo Scan wording for %s checkout', async (status, expected) => {
  (billingRequest as jest.Mock).mockReset();
  if (status === 'unavailable') {
    (billingRequest as jest.Mock).mockRejectedValueOnce(new Error('Unavailable'));
  } else {
    (billingRequest as jest.Mock).mockResolvedValueOnce({ status });
  }

  let renderer!: ReactTestRenderer;
  await act(async () => { renderer = create(<SuccessScreen />); });
  const text = renderer.root.findAllByType('Text' as any)
    .map(node => React.Children.toArray(node.props.children).join('')).join('\n');
  act(() => renderer.unmount());

  expect(text).toContain(expected);
  if (status === 'active') expect(text).toContain('Your SafeDose account now has unlimited photo scans.');
  expect(text).not.toMatch(/photo checks?/i);
});
