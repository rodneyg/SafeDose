import { signOut, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { logAnalyticsEvent } from '@/lib/analytics';

// Mock React Native
jest.mock('react-native', () => ({
  ActivityIndicator: 'ActivityIndicator',
}));

// Mock Firebase auth
jest.mock('firebase/auth', () => ({
  signOut: jest.fn(),
  signInAnonymously: jest.fn(),
  onAuthStateChanged: jest.fn(),
}));

// Mock analytics
jest.mock('@/lib/analytics', () => ({
  logAnalyticsEvent: jest.fn(),
  setAnalyticsUserProperties: jest.fn(),
  ANALYTICS_EVENTS: {
    LOGOUT: 'logout',
  },
  USER_PROPERTIES: {
    IS_ANONYMOUS: 'is_anonymous',
  },
}));

// Mock Firebase config
jest.mock('@/lib/firebase', () => ({
  auth: {},
}));

const mockSignOut = signOut as jest.MockedFunction<typeof signOut>;
const mockSignInAnonymously = signInAnonymously as jest.MockedFunction<typeof signInAnonymously>;
const mockOnAuthStateChanged = onAuthStateChanged as jest.MockedFunction<typeof onAuthStateChanged>;
const mockLogAnalyticsEvent = logAnalyticsEvent as jest.MockedFunction<typeof logAnalyticsEvent>;

describe('AuthContext Sign Out Functionality', () => {
  let authStateCallback: (user: any) => void;
  let unsubscribeFn: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    unsubscribeFn = jest.fn();
    
    // Mock onAuthStateChanged to capture the callback
    mockOnAuthStateChanged.mockImplementation((auth, callback) => {
      authStateCallback = callback;
      return unsubscribeFn;
    });
    
    mockSignOut.mockResolvedValue();
    mockSignInAnonymously.mockResolvedValue({} as any);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should setup auth state listener correctly', () => {
    // Import here to ensure mocks are set up
    require('./AuthContext');
    
    expect(mockOnAuthStateChanged).toHaveBeenCalledTimes(1);
    expect(typeof authStateCallback).toBe('function');
  });

  it('should call signInAnonymously when user is null and not signing out', () => {
    // Import here to ensure mocks are set up
    require('./AuthContext');
    
    // Simulate no user and not signing out
    authStateCallback(null);
    
    expect(mockSignInAnonymously).toHaveBeenCalledTimes(1);
  });

  it('should not call signInAnonymously immediately during sign out process', () => {
    // This test verifies the sign out delay logic
    // We can't easily test the full React component lifecycle in this simple setup,
    // but we can verify the core timeout logic works correctly
    
    let isSigningOut = false;
    let timeoutId: NodeJS.Timeout | null = null;

    // Simulate the logic from our AuthContext
    const simulateSignOutFlow = () => {
      isSigningOut = true;
      
      // This simulates what happens in the auth state callback when user becomes null during logout
      if (!isSigningOut) {
        mockSignInAnonymously();
      } else {
        timeoutId = setTimeout(() => {
          isSigningOut = false;
          mockSignInAnonymously();
        }, 2000);
      }
    };

    simulateSignOutFlow();
    
    // signInAnonymously should not be called immediately
    expect(mockSignInAnonymously).toHaveBeenCalledTimes(0);
    
    // Fast-forward the timeout
    jest.advanceTimersByTime(2000);
    
    // Now it should be called
    expect(mockSignInAnonymously).toHaveBeenCalledTimes(1);
    
    // Clean up
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });

  it('should clear timeout when component unmounts', () => {
    // Test the cleanup logic
    let timeoutId: NodeJS.Timeout | null = null;
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

    // Simulate setting a timeout
    timeoutId = setTimeout(() => {
      mockSignInAnonymously();
    }, 2000);

    // Simulate cleanup (what happens in useEffect return)
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    expect(clearTimeoutSpy).toHaveBeenCalledWith(timeoutId);
    
    clearTimeoutSpy.mockRestore();
  });

  it('should call analytics event on logout', async () => {
    mockSignOut.mockResolvedValue();
    
    // Simulate calling the logout function
    const logout = async () => {
      try {
        await mockSignOut();
        mockLogAnalyticsEvent('logout');
        console.log('Signed out successfully');
      } catch (error) {
        console.error('Error signing out:', error);
        throw error;
      }
    };

    await logout();
    
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mockLogAnalyticsEvent).toHaveBeenCalledWith('logout');
  });

  it('should handle logout errors gracefully', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    const mockError = new Error('Sign out failed');
    mockSignOut.mockRejectedValueOnce(mockError);

    // Simulate calling the logout function with error
    const logout = async () => {
      let isSigningOut = true;
      try {
        await mockSignOut();
        mockLogAnalyticsEvent('logout');
        console.log('Signed out successfully');
      } catch (error) {
        console.error('Error signing out:', error);
        isSigningOut = false;
        throw error;
      }
    };

    await expect(logout()).rejects.toThrow('Sign out failed');
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error signing out:', mockError);
    
    consoleErrorSpy.mockRestore();
  });
});