global.__DEV__ = false;
// Exercise component behavior without loading NativeWind's browser/native runtime.
jest.mock('react-native-css-interop/jsx-runtime', () => jest.requireActual('react/jsx-runtime'));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: 'SafeAreaProvider', SafeAreaView: 'SafeAreaView',
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));
jest.mock('lucide-react-native', () => new Proxy({}, {
  get: (_, name) => name === '__esModule' ? true : String(name),
}));
jest.mock('react-native-reanimated', () => {
  const animation = { duration: () => animation, delay: () => animation, springify: () => animation };
  return {
    __esModule: true,
    default: { View: 'View', Text: 'Text', ScrollView: 'ScrollView', createAnimatedComponent: c => c },
    View: 'View', FadeIn: animation, FadeOut: animation, FadeInDown: animation,
    useSharedValue: value => ({ value }), useAnimatedStyle: fn => fn(),
    withTiming: value => value, withSpring: value => value,
  };
});

jest.mock('expo-constants', () => ({ expoConfig: { extra: {} } }));
jest.mock('expo-network', () => ({ getNetworkStateAsync: jest.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true }) }));
