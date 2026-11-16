// Use the preset's complete native implementation unless a test overrides it.
jest.unmock('react-native');
// Keep native services deterministic and offline in headless component tests.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('react-native-reanimated', () => {
  const native = jest.requireActual('react-native');
  const transition = { duration: () => transition, delay: () => transition };
  return {
    __esModule: true,
    default: { View: native.View, Text: native.Text, ScrollView: native.ScrollView },
    FadeIn: transition,
    FadeInRight: transition,
    FadeOut: transition,
  };
});
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default
);

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: {} }, platform: {}, executionEnvironment: 'standalone' },
}));

jest.mock('expo-router', () => {
  const React = require('react');
  const router = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn() };
  return {
    router,
    useRouter: jest.fn(() => router),
    useFocusEffect: (effect) => React.useEffect(effect, [effect]),
  };
});
