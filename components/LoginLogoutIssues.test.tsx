import React from 'react';
import { render, act, fireEvent, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import IntroScreen from '../components/IntroScreen';

// Mock Firebase Auth
jest.mock('firebase/auth', () => ({
  signOut: jest.fn(() => Promise.resolve()),
  signInAnonymously: jest.fn(() => Promise.resolve({ user: { uid: 'anon', isAnonymous: true } })),
  onAuthStateChanged: jest.fn(),
  GoogleAuthProvider: jest.fn(),
  signInWithPopup: jest.fn(() => Promise.resolve({ user: { uid: 'test', displayName: 'Test User', isAnonymous: false } })),
}));

// Mock other dependencies
jest.mock('react-native', () => ({
  ActivityIndicator: 'ActivityIndicator',
  Alert: { alert: jest.fn() },
  Platform: { OS: 'web' },
}));

jest.mock('../lib/analytics', () => ({
  logAnalyticsEvent: jest.fn(),
  setAnalyticsUserProperties: jest.fn(),
  ANALYTICS_EVENTS: { LOGOUT: 'logout' },
  USER_PROPERTIES: { IS_ANONYMOUS: 'is_anonymous' },
}));

jest.mock('../lib/firebase', () => ({ auth: {} }));
jest.mock('../contexts/UserProfileContext', () => ({
  useUserProfile: () => ({ disclaimerText: 'Test disclaimer', profile: null, isLoading: false }),
}));
jest.mock('../lib/hooks/useUsageTracking', () => ({
  useUsageTracking: () => ({ usageData: { limit: 3, scansUsed: 0, plan: 'free' } }),
}));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), replace: jest.fn() }) }));
jest.mock('expo-constants', () => ({ expoConfig: { extra: {} } }));
jest.mock('../lib/utils', () => ({ isMobileWeb: false }));

describe('Login and Logout Issues', () => {
  let mockOnAuthStateChanged;
  let authStateCallback;
  
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    const { onAuthStateChanged } = require('firebase/auth');
    mockOnAuthStateChanged = onAuthStateChanged;
    mockOnAuthStateChanged.mockImplementation((auth, callback) => {
      authStateCallback = callback;
      return jest.fn(); // unsubscribe function
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('Issue 1: Login should automatically refresh intro screen', async () => {
    const TestComponent = () => {
      const { user } = useAuth();
      return (
        <IntroScreen 
          setScreenStep={jest.fn()} 
          resetFullForm={jest.fn()}
          setNavigatingFromIntro={jest.fn()}
        />
      );
    };

    const { getByText, rerender } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Initial state: anonymous user
    act(() => {
      authStateCallback({ uid: 'anon', isAnonymous: true });
    });

    // Should show sign-in prompt
    expect(getByText(/Sign in to get more scans/i)).toBeTruthy();

    // Simulate successful Google sign-in
    const { signInWithPopup } = require('firebase/auth');
    signInWithPopup.mockResolvedValueOnce({
      user: { uid: 'test-user', displayName: 'Test User', email: 'test@test.com', isAnonymous: false }
    });

    // Find and click sign-in button
    const signInButton = getByText(/Sign In with Google/i);
    fireEvent.press(signInButton);

    // Simulate auth state change to logged-in user
    await act(async () => {
      authStateCallback({ 
        uid: 'test-user', 
        displayName: 'Test User', 
        email: 'test@test.com', 
        isAnonymous: false 
      });
    });

    // Should now show logged-in state
    await waitFor(() => {
      expect(getByText(/Hello, Test!/i)).toBeTruthy();
      expect(getByText(/Sign Out/i)).toBeTruthy();
    });
  });

  test('Issue 2: Logout should not get stuck in "Signing Out" state', async () => {
    const TestComponent = () => {
      const { user, isSigningOut } = useAuth();
      return (
        <IntroScreen 
          setScreenStep={jest.fn()} 
          resetFullForm={jest.fn()}
          setNavigatingFromIntro={jest.fn()}
        />
      );
    };

    const { getByText, queryByText } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Start with logged-in user
    act(() => {
      authStateCallback({ 
        uid: 'test-user', 
        displayName: 'Test User', 
        email: 'test@test.com', 
        isAnonymous: false 
      });
    });

    await waitFor(() => {
      expect(getByText(/Hello, Test!/i)).toBeTruthy();
    });

    // Click sign out button
    const signOutButton = getByText(/Sign Out/i);
    fireEvent.press(signOutButton);

    // Should show "Signing Out" state
    await waitFor(() => {
      expect(getByText(/Signing Out/i)).toBeTruthy();
    });

    // Simulate auth state change to null (user signed out)
    act(() => {
      authStateCallback(null);
    });

    // Fast-forward through the timeout (updated to 500ms)
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Should no longer show "Signing Out" and should be signed in anonymously
    await waitFor(() => {
      expect(queryByText(/Signing Out/i)).toBeNull();
      expect(getByText(/Ready to get started/i)).toBeTruthy();
    }, { timeout: 3000 });
  });

  test('Issue 2b: Multiple rapid auth state changes should not prevent logout completion', async () => {
    const TestComponent = () => {
      const { isSigningOut } = useAuth();
      return (
        <IntroScreen 
          setScreenStep={jest.fn()} 
          resetFullForm={jest.fn()}
          setNavigatingFromIntro={jest.fn()}
        />
      );
    };

    const { getByText, queryByText } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Start with logged-in user
    act(() => {
      authStateCallback({ uid: 'test-user', displayName: 'Test', isAnonymous: false });
    });

    // Click sign out
    const signOutButton = getByText(/Sign Out/i);
    fireEvent.press(signOutButton);

    // Simulate multiple rapid auth state changes (the problematic scenario)
    act(() => {
      authStateCallback(null); // First null
    });
    
    act(() => {
      jest.advanceTimersByTime(100);
      authStateCallback(null); // Second null - might clear timeout
    });
    
    act(() => {
      jest.advanceTimersByTime(100);
      authStateCallback(null); // Third null - might clear timeout again
    });

    // Even with multiple rapid changes, should eventually clear
    act(() => {
      jest.advanceTimersByTime(500); // Let the last timeout complete (updated to 500ms)
    });

    await waitFor(() => {
      expect(queryByText(/Signing Out/i)).toBeNull();
    }, { timeout: 1000 });
  });
});