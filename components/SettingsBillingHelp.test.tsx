import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import SettingsScreen from '../app/(tabs)/settings';
import SupportPage from '../app/support';
import { useAuth } from '../contexts/AuthContext';

jest.mock('react-native-css-interop/jsx-runtime', () => jest.requireActual('react/jsx-runtime'));
jest.mock('expo-router', () => ({ Link: 'Link' }));
jest.mock('lucide-react-native', () => new Proxy({}, { get: (_, key) => String(key) }));
jest.mock('../contexts/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../lib/hooks/useUsageTracking', () => ({ useUsageTracking: () => ({ usageData: null }) }));
jest.mock('../lib/analytics', () => ({ logAnalyticsEvent: jest.fn(), ANALYTICS_EVENTS: {} }));
jest.mock('../lib/googleAuth', () => ({ signInWithGoogle: jest.fn() }));

const mockUseAuth = jest.mocked(useAuth);
let renderer: ReactTestRenderer;

afterEach(() => {
  act(() => renderer?.unmount());
  jest.restoreAllMocks();
});

it.each([true, false])('links to billing help when isAnonymous is %s and no billing status is available', async (isAnonymous) => {
  const getIdToken = jest.fn().mockResolvedValue('test-token');
  mockUseAuth.mockReturnValue({ user: { isAnonymous, getIdToken } } as ReturnType<typeof useAuth>);
  const subscriptionRequest = jest.spyOn(global, 'fetch').mockResolvedValue(
    new Response(null, { status: 503 }),
  );
  jest.spyOn(console, 'error').mockImplementation(() => {});

  await act(async () => {
    renderer = create(<SettingsScreen />);
  });

  expect(subscriptionRequest).toHaveBeenCalledTimes(isAnonymous ? 0 : 1);
  const link = renderer.root.findAllByType('Link' as any)
    .find(({ props }) => props.children === 'Get billing help');
  expect(link?.props.href).toBe('/support');
});

it('offers an email contact on the billing help destination', () => {
  act(() => { renderer = create(<SupportPage />); });

  const contact = renderer.root.findAllByType('Link' as any)
    .find(({ props }) => props.children === 'Email SafeDose support');
  expect(contact?.props.href).toMatch(/^mailto:.+@.+$/);
});
