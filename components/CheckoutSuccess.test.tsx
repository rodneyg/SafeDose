import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import SuccessScreen from '../app/success';
import { billingRequest } from '../lib/subscriptionStatus';

const mockRouter = { push: jest.fn(), replace: jest.fn() };
let mockParams: { session_id?: string } = { session_id: 'test-session' };
let mockUser: { isAnonymous?: boolean } | null = { isAnonymous: false };
jest.mock('react-native-css-interop/jsx-runtime', () => jest.requireActual('react/jsx-runtime'));
jest.mock('react-native', () => jest.requireActual('../__mocks__/react-native'));
jest.mock('expo-router', () => ({ Link: 'Link', router: mockRouter, useLocalSearchParams: () => mockParams }));
jest.mock('../lib/subscriptionStatus', () => ({ billingRequest: jest.fn() }));
jest.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));

function renderScreen() {
  let renderer!: ReactTestRenderer;
  act(() => { renderer = create(<SuccessScreen />); });
  return renderer;
}
function renderedText(renderer: ReactTestRenderer) {
  return renderer.root.findAllByType('Text' as any)
    .map(node => React.Children.toArray(node.props.children).join('')).join('\n');
}
beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { session_id: 'test-session' };
  mockUser = { isAnonymous: false };
});

afterEach(() => {
  // Individual renderers are unmounted by each test after assertions.
});

it.each([
  ['pending', 'Photo Scan will activate when Stripe confirms payment.'],
  ['active', 'Photo Scan is active'],
  ['inactive', 'Photo Scan is inactive'],
  ['unavailable', 'Photo Scan status unavailable'],
])('uses Photo Scan wording for %s checkout', async (status, expected) => {
  if (status === 'unavailable') {
    (billingRequest as jest.Mock).mockRejectedValueOnce(new Error('Unavailable'));
  } else {
    (billingRequest as jest.Mock).mockResolvedValueOnce({ status });
  }

  let renderer!: ReactTestRenderer;
  await act(async () => { renderer = create(<SuccessScreen />); });
  const text = renderedText(renderer);
  expect(text).toContain(expected);
  if (status === 'active') expect(text).toContain('Your SafeDose account now has unlimited photo scans.');
  expect(text).not.toMatch(/photo checks?/i);
  expect(text).not.toContain('Sign in');
  act(() => renderer.unmount());
});

it('shows sign in and support to a guest and carries the checkout session to sign in', () => {
  mockUser = { isAnonymous: true };
  const renderer = renderScreen();
  expect(renderedText(renderer)).toContain('Sign in');
  expect(renderedText(renderer)).toContain('Support');
  const signIn = renderer.root.findAllByType('TouchableOpacity' as any)
    .find(node => renderedTextFrom(node) === 'Sign in');
  expect(signIn).toBeDefined();
  act(() => signIn!.props.onPress());
  expect(mockRouter.push).toHaveBeenCalledWith({
    pathname: '/login',
    params: { from: 'success', session_id: 'test-session' },
  });
  expect(renderer.root.findByType('Link' as any).props.href).toBe('/support');
  act(() => renderer.unmount());
});

function renderedTextFrom(node: any) {
  return node.findAllByType('Text').map((text: any) => React.Children.toArray(text.props.children).join('')).join('');
}
