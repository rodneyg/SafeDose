import { Redirect } from 'expo-router';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import InitialScreen from '../../app';
import { resolveLaunchRoute } from '../../lib/onboardingState';

jest.mock('expo-router', () => ({ Redirect: () => null }));
jest.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
jest.mock('../../lib/onboardingState', () => ({
  ONBOARDING_ROUTE: '/onboarding',
  loadRemoteUserProfile: jest.fn(),
  resolveLaunchRoute: jest.fn(),
}));

const mockTimingTargets: number[] = [];

jest.mock('react-native-reanimated', () => {
  return {
    __esModule: true,
    default: { View: 'AnimatedView' },
    useSharedValue: (value: number) => ({ value }),
    useAnimatedStyle: (style: () => object) => style(),
    withTiming: (value: number) => { mockTimingTargets.push(value); return value; },
    withDelay: (_delay: number, animation: unknown) => animation,
    withSequence: (...animations: unknown[]) => animations[animations.length - 1],
    Easing: { out: (value: unknown) => value, in: (value: unknown) => value, inOut: (value: unknown) => value, cubic: {}, ease: {} },
  };
});

let tree: ReactTestRenderer;

afterEach(() => {
  if (tree) act(() => tree.unmount());
  jest.useRealTimers();
  jest.restoreAllMocks();
  mockTimingTargets.length = 0;
});

function splashOpacity() {
  const splash = tree.root.findByType('AnimatedView');
  const styles = splash.props.style as Array<Record<string, unknown>>;
  return styles[1].opacity;
}

test('keeps the real splash visible while a slow launch route resolves', async () => {
  jest.useFakeTimers();
  let finish: (route: string) => void = () => {};
  jest.mocked(resolveLaunchRoute).mockReturnValue(new Promise(resolve => { finish = resolve; }));

  act(() => { tree = create(<InitialScreen />); });
  expect(splashOpacity()).toBe(1);

  act(() => { jest.advanceTimersByTime(5000); });
  expect(mockTimingTargets).not.toContain(0);

  await act(async () => { finish('/(tabs)/new-dose'); });
  expect(tree.root.findByType(Redirect).props.href).toBe('/(tabs)/new-dose');
});

test('redirects on a fast route without waiting for a splash fade', async () => {
  jest.useFakeTimers();
  jest.mocked(resolveLaunchRoute).mockResolvedValue('/onboarding');

  await act(async () => { tree = create(<InitialScreen />); });
  expect(tree.root.findByType(Redirect).props.href).toBe('/onboarding');
});

test('falls back to onboarding when launch state cannot be loaded', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.mocked(resolveLaunchRoute).mockRejectedValueOnce(new Error('Storage unavailable'));

  await act(async () => { tree = create(<InitialScreen />); });
  expect(tree.root.findByType(Redirect).props.href).toBe('/onboarding');
});
