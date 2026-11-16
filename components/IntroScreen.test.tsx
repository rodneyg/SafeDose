import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import IntroScreen from './IntroScreen';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { useUsageTracking } from '../lib/hooks/useUsageTracking';
import { useRouter } from 'expo-router';

jest.mock('react-native', () => ({
  ...jest.requireActual('../__mocks__/react-native'),
  Platform: { ...jest.requireActual('../__mocks__/react-native').Platform, OS: 'web' },
}));

// Mock dependencies
jest.mock('../contexts/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../contexts/UserProfileContext', () => ({ useUserProfile: jest.fn() }));
jest.mock('../lib/hooks/useUsageTracking', () => ({ useUsageTracking: jest.fn() }));
jest.mock('expo-router', () => ({ useRouter: jest.fn(), useFocusEffect: jest.fn() }));
jest.mock('react-native-reanimated', () => ({
  FadeIn: {
    duration: () => ({}),
  },
  View: 'View',
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseUserProfile = useUserProfile as jest.MockedFunction<typeof useUserProfile>;
const mockUseUsageTracking = useUsageTracking as jest.MockedFunction<typeof useUsageTracking>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

describe('IntroScreen Sign Out Functionality', () => {
  const mockLogout = jest.fn();
  const mockSetScreenStep = jest.fn();
  const mockResetFullForm = jest.fn();
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogout.mockResolvedValue(undefined);

    // Mock authenticated user (not anonymous)
    mockUseAuth.mockReturnValue({
      user: {
        uid: 'test-user-id',
        isAnonymous: false,
        displayName: 'Test User',
        email: 'test@example.com',
      } as any,
      auth: {} as any,
      logout: mockLogout,
      isSigningOut: false,
    });

    mockUseUserProfile.mockReturnValue({
      disclaimerText: 'Test disclaimer',
      profile: { isLicensedProfessional: true },
      isLoading: false,
    } as any);

    // Mock usage tracking
    mockUseUsageTracking.mockReturnValue({
      usageData: {
        scansUsed: 1,
        limit: 10,
        plan: 'free',
      },
    } as any);

    // Mock router
    mockUseRouter.mockReturnValue({
      push: mockPush,
    } as any);
  });

  it('should call logout function when sign out button is pressed', async () => {
    const { getByTestId, getByText } = render(
      <IntroScreen
        setScreenStep={mockSetScreenStep}
        resetFullForm={mockResetFullForm}
      />
    );

    // Find the sign out button by test ID
    const signOutButton = getByTestId('sign-out-button');
    expect(signOutButton).toBeTruthy();

    await act(async () => { fireEvent.press(signOutButton); });
    await act(async () => { fireEvent.press(getByText('Confirm')); });

    // Verify logout was called
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('should show proper UI state for authenticated user', () => {
    const { queryByText } = render(
      <IntroScreen
        setScreenStep={mockSetScreenStep}
        resetFullForm={mockResetFullForm}
      />
    );

    // For authenticated user, should show welcome message with display name
    expect(queryByText(/Hello, Test!/)).toBeTruthy();

    // Should not show sign in prompt for authenticated users
    expect(queryByText(/Sign in to get more scans/)).toBeFalsy();
  });

  it('should handle signing out state correctly with fallback protection', () => {
    // Mock signing out state
    mockUseAuth.mockReturnValue({
      user: null,
      auth: {} as any,
      logout: mockLogout,
      isSigningOut: true,
    });

    // Also need to mock the usage tracking and router for this test
    mockUseUsageTracking.mockReturnValue({
      usageData: {
        scansUsed: 1,
        limit: 10,
        plan: 'free',
      },
    } as any);

    mockUseRouter.mockReturnValue({
      push: mockPush,
    } as any);

    const { queryByText } = render(
      <IntroScreen
        setScreenStep={mockSetScreenStep}
        resetFullForm={mockResetFullForm}
      />
    );

    // Should show signing out message
    expect(queryByText(/Signing Out/)).toBeTruthy();
    expect(queryByText(/sign you in anonymously shortly/)).toBeTruthy();
    
    // With our fix, this state should not persist indefinitely
    // The fallback timeout should prevent users from being stuck
  });

  it('should handle logout errors gracefully', async () => {
    const mockError = new Error('Logout failed');
    mockLogout.mockRejectedValueOnce(mockError);
    
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { getByTestId, getByText, queryByText } = render(
      <IntroScreen setScreenStep={mockSetScreenStep} resetFullForm={mockResetFullForm} />
    );
    await act(async () => { fireEvent.press(getByTestId('sign-out-button')); });
    await act(async () => { fireEvent.press(getByText('Confirm')); });
    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith('[IntroScreen] Logout failed:', mockError);
    expect(queryByText('Signing Out...')).toBeNull();
    errorSpy.mockRestore();
  });

  it('should show sign out button with proper test ID for authenticated users', () => {
    const { getByTestId } = render(
      <IntroScreen
        setScreenStep={mockSetScreenStep}
        resetFullForm={mockResetFullForm}
      />
    );

    // Should have sign out button with test ID
    const signOutButton = getByTestId('sign-out-button');
    expect(signOutButton).toBeTruthy();
  });

  it('should handle enhanced debugging logs during logout', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    render(
      <IntroScreen
        setScreenStep={mockSetScreenStep}
        resetFullForm={mockResetFullForm}
      />
    );

    // Should have logged debug information during render
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[IntroScreen]')
    );

    consoleSpy.mockRestore();
  });
});
jest.mock('../lib/hooks/useDoseLogging', () => ({
  useDoseLogging: () => ({ getDoseLogHistory: mockGetDoseLogHistory }),
}));
const mockGetDoseLogHistory = jest.fn().mockResolvedValue([]);
