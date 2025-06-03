/**
 * Test file for IntroScreen redesign validation
 * This tests the component structure and ensures it handles different user states correctly
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import IntroScreen from './IntroScreen';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { useUsageTracking } from '../lib/hooks/useUsageTracking';

// Mock dependencies
jest.mock('../contexts/AuthContext');
jest.mock('../contexts/UserProfileContext');
jest.mock('../lib/hooks/useUsageTracking');
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));
jest.mock('react-native-reanimated', () => ({
  FadeIn: {
    duration: () => ({}),
  },
  View: 'View',
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseUserProfile = useUserProfile as jest.MockedFunction<typeof useUserProfile>;
const mockUseUsageTracking = useUsageTracking as jest.MockedFunction<typeof useUsageTracking>;

describe('IntroScreen Redesign Validation', () => {
  const mockSetScreenStep = jest.fn();
  const mockResetFullForm = jest.fn();
  const mockLogout = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock setup
    mockUseUserProfile.mockReturnValue({
      disclaimerText: 'Test disclaimer',
      profile: { isLicensedProfessional: true },
      isLoading: false,
    } as any);

    mockUseUsageTracking.mockReturnValue({
      usageData: { scansUsed: 1, limit: 10, plan: 'free' },
    } as any);
  });

  it('should show new header design for authenticated user', () => {
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

    const { getByText, queryByText } = render(
      <IntroScreen
        setScreenStep={mockSetScreenStep}
        resetFullForm={mockResetFullForm}
      />
    );

    // Should show new app title
    expect(getByText('SafeDose')).toBeTruthy();
    
    // Should show concise welcome message
    expect(getByText('Hello, Test!')).toBeTruthy();
    
    // Should not show old welcome message
    expect(queryByText(/Welcome back, Test User/)).toBeFalsy();
    
    // Should show inline scan information
    expect(getByText(/You have 9 scans remaining/)).toBeTruthy();
    expect(getByText('Upgrade')).toBeTruthy();
  });

  it('should show simplified UI for anonymous user', () => {
    mockUseAuth.mockReturnValue({
      user: {
        uid: 'anon-user',
        isAnonymous: true,
      } as any,
      auth: {} as any,
      logout: mockLogout,
      isSigningOut: false,
    });

    const { getByText, queryByText } = render(
      <IntroScreen
        setScreenStep={mockSetScreenStep}
        resetFullForm={mockResetFullForm}
      />
    );

    // Should show generic welcome message
    expect(getByText('Ready to get started?')).toBeTruthy();
    
    // Should show sign-in section
    expect(getByText(/Sign in to save calculations/)).toBeTruthy();
    
    // Should not show profile icon or dropdown
    expect(queryByText('Account Settings')).toBeFalsy();
  });

  it('should show smaller, less prominent disclaimer', () => {
    mockUseAuth.mockReturnValue({
      user: {
        uid: 'test-user',
        isAnonymous: false,
        displayName: 'Test User',
        email: 'test@example.com',
      } as any,
      auth: {} as any,
      logout: mockLogout,
      isSigningOut: false,
    });

    const { getByText } = render(
      <IntroScreen
        setScreenStep={mockSetScreenStep}
        resetFullForm={mockResetFullForm}
      />
    );

    // Should show disclaimer text
    expect(getByText(/Always consult a licensed healthcare professional/)).toBeTruthy();
  });

  it('should handle premium users correctly', () => {
    mockUseAuth.mockReturnValue({
      user: {
        uid: 'premium-user',
        isAnonymous: false,
        displayName: 'Premium User',
        email: 'premium@example.com',
      } as any,
      auth: {} as any,
      logout: mockLogout,
      isSigningOut: false,
    });

    mockUseUsageTracking.mockReturnValue({
      usageData: { scansUsed: 5, limit: 100, plan: 'plus' },
    } as any);

    const { getByText, queryByText } = render(
      <IntroScreen
        setScreenStep={mockSetScreenStep}
        resetFullForm={mockResetFullForm}
      />
    );

    // Should show scan count but no upgrade link for premium users
    expect(getByText(/You have 95 scans remaining/)).toBeTruthy();
    expect(queryByText('Upgrade')).toBeFalsy();
  });
});