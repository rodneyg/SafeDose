import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import IntroScreen from './IntroScreen';

jest.mock('react-native-css-interop/jsx-runtime', () => jest.requireActual('react/jsx-runtime'));
jest.mock('react-native', () => ({ ...jest.requireActual('../__mocks__/react-native'), ActivityIndicator: 'ActivityIndicator' }));
jest.mock('lucide-react-native', () => new Proxy({}, { get: (_, key) => String(key) }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
jest.mock('react-native-reanimated', () => ({ __esModule: true, default: { View: 'AnimatedView' }, FadeIn: { duration: () => ({}) } }));
jest.mock('../lib/firebase', () => { const auth = {}; return { auth, getAuthInstance: () => auth }; });
jest.mock('../lib/utils', () => ({ isMobileWeb: false }));
jest.mock('../contexts/UserProfileContext', () => ({ useUserProfile: () => ({ disclaimerText: '', profile: null, isLoading: false }) }));
const mockUsage = { scansUsed: 0, limit: 3, plan: 'free' };
jest.mock('../lib/hooks/useUsageTracking', () => ({ useUsageTracking: () => ({ usageData: mockUsage }) }));
const mockHistory = async () => [];
jest.mock('../lib/hooks/useDoseLogging', () => ({ useDoseLogging: () => ({ getDoseLogHistory: mockHistory }) }));
jest.mock('../lib/analytics', () => ({ logAnalyticsEvent: jest.fn(), setAnalyticsUserProperties: jest.fn(), ANALYTICS_EVENTS: {}, USER_PROPERTIES: {} }));
jest.mock('expo-constants', () => ({ expoConfig: { extra: {} } }));
jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: async () => null, removeItem: async () => {} }));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, replace: jest.fn() }), useFocusEffect: () => {} }));
jest.mock('firebase/auth', () => ({ getRedirectResult: jest.fn().mockResolvedValue(null), onAuthStateChanged: jest.fn(), signOut: jest.fn(), signInAnonymously: jest.fn(async () => ({})) }));
let authState: ReturnType<typeof useAuth>;
let listener: (user: any) => void;
let tree: ReactTestRenderer;
const onScanLimit = jest.fn();
const onScanPress = jest.fn();
function Probe() {
  authState = useAuth();
  return <IntroScreen setScreenStep={jest.fn()} resetFullForm={jest.fn()} onScanLimit={onScanLimit} onScanPress={onScanPress} />;
}
const guest = { uid: 'guest', isAnonymous: true };
const member = { uid: 'member', isAnonymous: false, displayName: 'Test' };
async function mount(user: any) {
  (onAuthStateChanged as jest.Mock).mockImplementation((_, callback) => { listener = callback; callback(user); return jest.fn(); });
  await act(async () => { tree = create(<AuthProvider><Probe /></AuthProvider>); });
}
function output() { return JSON.stringify(tree.toJSON()); }
beforeEach(() => {
  jest.clearAllMocks();
  Object.assign(mockUsage, { scansUsed: 0, limit: 3, plan: 'free' });
  (globalThis as any).__DEV__ = false;
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  (signOut as jest.Mock).mockResolvedValue(undefined);
});
afterEach(() => { act(() => tree?.unmount()); jest.restoreAllMocks(); });

it.each([null, guest])('does not announce logout for a fresh guest: %p', async user => {
  await mount(user);
  await act(async () => { listener(guest); });
  expect(authState.hasSignedOut).toBeFalsy();
  expect(output()).not.toContain('Signed out successfully');
  expect(output()).not.toContain("You've been signed out");
  expect(output()).toContain('Sign in to get more scans');
});

it('announces only a completed logout, keeps confirmation for guest auth, and clears it on sign-in', async () => {
  await mount(member);
  let complete!: () => void;
  (signOut as jest.Mock).mockImplementation(() => new Promise<void>(resolve => { complete = resolve; }));
  let pending!: Promise<void>;
  act(() => { pending = authState.logout(); });
  expect(authState.hasSignedOut).toBeFalsy();
  expect(output()).not.toContain('Signed out successfully');
  await act(async () => { complete(); await pending; listener(guest); });
  expect(output()).toContain('Signed out successfully. Sign in to get more scans');
  await act(async () => { listener(member); });
  expect(authState.hasSignedOut).toBeFalsy();
  expect(output()).not.toContain('Signed out successfully');
});

it('does not announce success after a failed logout', async () => {
  await mount(member);
  (signOut as jest.Mock).mockRejectedValue(new Error('failed'));
  await act(async () => { await expect(authState.logout()).rejects.toThrow('failed'); });
  expect(authState.hasSignedOut).toBeFalsy();
  expect(output()).not.toContain('Signed out successfully');
});

it('opens pricing from both the scans remaining text and Upgrade', async () => {
  await mount(guest);
  const status = tree.root.findAllByType('Text' as any).find(node => Array.isArray(node.props.children) && node.props.children.includes('You have 3 scans remaining.'))!;
  expect(status.props.accessibilityRole).toBe('link');
  act(() => status.props.onPress());
  expect(mockPush).toHaveBeenLastCalledWith('/pricing');
  const upgrade = tree.root.findAllByType('Text' as any).find(node => node.props.children === 'Upgrade')!;
  act(() => upgrade.props.onPress());
  expect(mockPush).toHaveBeenCalledTimes(2);
  expect(mockPush).toHaveBeenLastCalledWith('/pricing');
});

it('opens the limit modal from both home upgrade actions after the third scan', async () => {
  mockUsage.scansUsed = 3;
  await mount(guest);
  const labels = tree.root.findAllByType('Text' as any).filter(node => node.props.children === 'Upgrade');
  act(() => labels.find(node => node.props.onPress)!.props.onPress());
  const button = tree.root.findAllByType('TouchableOpacity' as any).find(node =>
    node.findAllByType('Text' as any).some(label => label.props.children === 'Upgrade'),
  )!;
  act(() => button.props.onPress());
  expect(onScanLimit).toHaveBeenCalledTimes(2);
  expect(mockPush).not.toHaveBeenCalled();
});

it('preserves normal scanning for unlimited paid usage', async () => {
  Object.assign(mockUsage, { scansUsed: 8, limit: -1, plan: 'photo_check' });
  await mount(member);
  const button = tree.root.findAllByType('TouchableOpacity' as any).find(node =>
    node.findAllByType('Text' as any).some(label => label.props.children === 'Scan'),
  )!;
  act(() => button.props.onPress());
  expect(onScanPress).toHaveBeenCalledTimes(1);
  expect(onScanLimit).not.toHaveBeenCalled();
});
