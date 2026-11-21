import { Redirect } from 'expo-router';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import InitialScreen from '../../app';
import { resolveLaunchRoute } from '../../lib/onboardingState';
import AnimatedSplashScreen from '../AnimatedSplashScreen';

jest.mock('expo-router', () => ({ Redirect: () => null }));
jest.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
jest.mock('../../lib/onboardingState', () => ({
  ONBOARDING_ROUTE: '/onboarding',
  loadRemoteUserProfile: jest.fn(),
  resolveLaunchRoute: jest.fn(),
}));
jest.mock('../AnimatedSplashScreen', () => () => null);

let tree: ReactTestRenderer;

afterEach(() => {
  act(() => tree.unmount());
  jest.restoreAllMocks();
});

test('holds the splash until launch state resolves and then redirects', async () => {
  let finish: (route: string) => void = () => {};
  jest.mocked(resolveLaunchRoute).mockReturnValue(new Promise(resolve => { finish = resolve; }));

  act(() => { tree = create(<InitialScreen />); });
  expect(tree.root.findByType(AnimatedSplashScreen)).toBeDefined();
  expect(tree.root.findAllByType(Redirect)).toHaveLength(0);

  await act(async () => { finish('/(tabs)/new-dose'); });
  expect(tree.root.findByType(Redirect).props.href).toBe('/(tabs)/new-dose');
});

test('falls back to onboarding when launch state cannot be loaded', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.mocked(resolveLaunchRoute).mockRejectedValueOnce(new Error('Storage unavailable'));

  await act(async () => { tree = create(<InitialScreen />); });
  expect(tree.root.findByType(Redirect).props.href).toBe('/onboarding');
});
