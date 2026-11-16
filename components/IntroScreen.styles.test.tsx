import React from 'react';
import { Modal, Platform, StyleSheet, View } from 'react-native';
import { render, fireEvent, act } from '@testing-library/react-native';
import IntroScreen from './IntroScreen';

const mockLogout = jest.fn();
const mockUser = { uid: 'test-user', isAnonymous: false, displayName: 'Test User' };
const mockProfile = { isLicensedProfessional: true };
jest.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: mockUser, logout: mockLogout, isSigningOut: false }) }));
jest.mock('../contexts/UserProfileContext', () => ({ useUserProfile: () => ({ profile: mockProfile, disclaimerText: 'Verify your prescription', isLoading: false }) }));
jest.mock('../lib/hooks/useUsageTracking', () => ({ useUsageTracking: () => ({ usageData: { scansUsed: 1, limit: 3, plan: 'free' } }) }));
jest.mock('../lib/hooks/useDoseLogging', () => ({ useDoseLogging: () => ({ getDoseLogHistory: jest.fn().mockResolvedValue([]) }) }));

let originalOS: typeof Platform.OS;
beforeEach(() => {
  originalOS = Platform.OS;
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
  mockLogout.mockReset().mockResolvedValue(undefined);
});
afterEach(() => Object.defineProperty(Platform, 'OS', { configurable: true, value: originalOS }));

it('places the web sign-out confirmation in a native Modal above screen content', async () => {
  const screen = render(<IntroScreen setScreenStep={jest.fn()} resetFullForm={jest.fn()} />);
  // The old profile/auth menu z-index styles were removed. The current overlay
  // uses Modal, so exercise its visible state, actual layout, and hit targets.
  expect(screen.UNSAFE_getByType(Modal).props.visible).toBe(false);
  fireEvent.press(screen.getByTestId('sign-out-button'));
  const modal = screen.UNSAFE_getByType(Modal);
  expect(modal.props.visible).toBe(true);
  expect(modal.props.transparent).toBe(true);
  expect(modal.props.animationType).toBe('fade');
  const views = modal.findAllByType(View);
  const overlay = StyleSheet.flatten(views[0].props.style);
  expect(overlay).toMatchObject({ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'center', alignItems: 'center' });
  const card = StyleSheet.flatten(views[1].props.style);
  expect(card).toMatchObject({ backgroundColor: '#FFFFFF', width: '85%', maxWidth: 400 });
  expect(screen.getByText('Are you sure you want to sign out?')).toBeTruthy();
  expect(mockLogout).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText('Cancel'));
  expect(screen.UNSAFE_getByType(Modal).props.visible).toBe(false);
  expect(mockLogout).not.toHaveBeenCalled();
  fireEvent.press(screen.getByTestId('sign-out-button'));
  await act(async () => fireEvent.press(screen.getByText('Confirm')));
  expect(mockLogout).toHaveBeenCalledTimes(1);
  expect(screen.UNSAFE_getByType(Modal).props.visible).toBe(false);
});

it('dismisses the overlay through the platform back/close callback and allows reopening', () => {
  const screen = render(<IntroScreen setScreenStep={jest.fn()} resetFullForm={jest.fn()} />);
  fireEvent.press(screen.getByTestId('sign-out-button'));
  act(() => screen.UNSAFE_getByType(Modal).props.onRequestClose());
  expect(screen.UNSAFE_getByType(Modal).props.visible).toBe(false);
  expect(mockLogout).not.toHaveBeenCalled();
  fireEvent.press(screen.getByTestId('sign-out-button'));
  expect(screen.UNSAFE_getByType(Modal).props.visible).toBe(true);
});
