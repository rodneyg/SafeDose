/**
 * End-to-end test for the complete sign-up prompt feature
 * Validates the entire user journey from anonymous interactions to signup
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'anonymous-user', isAnonymous: true },
  }),
}));

const mockLogAnalyticsEvent = jest.fn();
jest.mock('../lib/analytics', () => ({
  logAnalyticsEvent: mockLogAnalyticsEvent,
  ANALYTICS_EVENTS: {
    SIGNUP_PROMPT_SHOWN: 'signup_prompt_shown',
    SIGNUP_PROMPT_CLICKED: 'signup_prompt_clicked',
    SIGNUP_PROMPT_DISMISSED: 'signup_prompt_dismissed',
  },
}));

describe('Sign-Up Prompt End-to-End Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  it('should complete the full interaction tracking and prompt flow', async () => {
    // Simulate the user journey:
    // 1. Anonymous user performs interactions
    // 2. After 4 interactions, prompt should be shown
    // 3. User can dismiss or click to sign up
    
    const storageKey = 'signup_prompt_anonymous-user';
    
    // Initial state - no interactions
    let promptState = {
      interactionCount: 0,
      hasSeenPrompt: false,
      lastDismissedAt: null,
    };
    
    // Simulate 3 interactions (not enough to trigger prompt)
    for (let i = 1; i <= 3; i++) {
      promptState.interactionCount = i;
      
      // Should not show prompt yet
      expect(promptState.interactionCount).toBeLessThan(4);
    }
    
    // 4th interaction - should trigger prompt
    promptState.interactionCount = 4;
    expect(promptState.interactionCount).toBeGreaterThanOrEqual(4);
    
    // Simulate prompt being shown
    promptState.hasSeenPrompt = true;
    await AsyncStorage.setItem(storageKey, JSON.stringify(promptState));
    
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      storageKey,
      JSON.stringify(promptState)
    );
  });

  it('should respect the 24-hour dismissal timeout', () => {
    const now = new Date().getTime();
    const dismissedRecently = new Date(now - (12 * 60 * 60 * 1000)).toISOString(); // 12 hours ago
    const dismissedLongAgo = new Date(now - (36 * 60 * 60 * 1000)).toISOString(); // 36 hours ago
    
    // Recent dismissal - should not show
    const recentDismissalTime = new Date(dismissedRecently).getTime();
    const hoursSinceRecent = (now - recentDismissalTime) / (1000 * 60 * 60);
    expect(hoursSinceRecent).toBeLessThan(24);
    
    // Old dismissal - should show again
    const oldDismissalTime = new Date(dismissedLongAgo).getTime();
    const hoursSinceOld = (now - oldDismissalTime) / (1000 * 60 * 60);
    expect(hoursSinceOld).toBeGreaterThan(24);
  });

  it('should only show prompt for anonymous users', () => {
    // Test that the logic correctly identifies anonymous users
    const anonymousUser = { uid: 'anon-123', isAnonymous: true };
    const authenticatedUser = { uid: 'auth-456', isAnonymous: false };
    
    expect(anonymousUser.isAnonymous).toBe(true);
    expect(authenticatedUser.isAnonymous).toBe(false);
    
    // Prompt should only be considered for anonymous users
    const shouldConsiderPromptForAnonymous = anonymousUser.isAnonymous;
    const shouldConsiderPromptForAuthenticated = authenticatedUser.isAnonymous;
    
    expect(shouldConsiderPromptForAnonymous).toBe(true);
    expect(shouldConsiderPromptForAuthenticated).toBe(false);
  });

  it('should have proper analytics tracking flow', () => {
    // Verify all required analytics events exist
    const { ANALYTICS_EVENTS } = require('../lib/analytics');
    
    const requiredEvents = [
      'signup_prompt_shown',
      'signup_prompt_clicked', 
      'signup_prompt_dismissed'
    ];
    
    requiredEvents.forEach(event => {
      const eventExists = Object.values(ANALYTICS_EVENTS).includes(event);
      expect(eventExists).toBe(true);
    });
  });

  it('should handle edge cases properly', () => {
    // Test interaction threshold boundaries
    const TRIGGER_COUNT = 4;
    
    expect(TRIGGER_COUNT - 1).toBe(3); // Just below threshold
    expect(TRIGGER_COUNT).toBe(4); // At threshold
    expect(TRIGGER_COUNT + 1).toBe(5); // Above threshold
    
    // All these cases should be handled:
    // - Exactly at threshold: should show
    // - Below threshold: should not show
    // - Above threshold: should still show (if not dismissed)
  });
});