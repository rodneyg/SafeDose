# Sign-Up Prompt Feature Implementation

## Overview
The sign-up prompt feature encourages anonymous users to register after completing a few interactions, helping to increase user engagement and conversion to authenticated accounts.

## Features

### ✅ Interaction Tracking
- Tracks manual dose calculations completed (`MANUAL_ENTRY_COMPLETED` events)
- Tracks successful log saves for anonymous users
- Configurable threshold (currently set to 3 interactions)
- Persistent storage using AsyncStorage

### ✅ Smart Display Logic
- Only shows for anonymous users
- Appears after reaching interaction threshold
- Respects 24-hour dismissal timeout
- Won't show if user has already seen it (unless dismissed timeout expired)

### ✅ User Interface
- Non-modal bottom overlay design
- Clean SafeDose aesthetic (muted gray, pill-shaped buttons)
- "Sign Up Free" button with email icon
- "Maybe Later" dismissal option
- Animated entrance/exit

### ✅ Integration
- Seamlessly connects to existing Google OAuth flow
- Shows on IntroScreen (home screen)
- Tracks conversions when users sign up after seeing prompt

### ✅ Analytics Tracking
All user interactions are tracked with Firebase Analytics:
- `signup_prompt_shown` - When prompt is displayed
- `signup_prompt_clicked` - When user clicks "Sign Up Free"
- `signup_prompt_dismissed` - When user clicks "Maybe Later"
- `signup_prompt_conversion` - When user signs up after seeing prompt

### ✅ Enhanced User Experience
- New registrants get 15 free logs (up from 10)
- Welcome alert shown to new users: "Welcome! You've got 15 free logs—upgrade to Pro for unlimited."
- Automatic state reset when users become authenticated

## Implementation Files

### Core Components
- `lib/hooks/useSignUpPromptTracking.ts` - Interaction tracking and prompt state management
- `components/SignUpPromptOverlay.tsx` - UI component for the prompt
- `lib/hooks/useWelcomeNotification.ts` - Welcome message for new registrants

### Integration Points
- `components/IntroScreen.tsx` - Main integration point for display logic
- `lib/hooks/useDoseCalculator.ts` - Interaction tracking for manual entries and log saves
- `lib/hooks/useLogUsageTracking.ts` - Updated log limits for new users
- `lib/analytics.ts` - New analytics events

## Configuration

### Interaction Threshold
```typescript
const INTERACTION_THRESHOLD = 3; // Show after 3 interactions
```

### Dismissal Duration
```typescript
const DISMISS_DURATION = 24 * 60 * 60 * 1000; // 24 hours
```

### Log Limits
- Anonymous users: 10 logs
- Authenticated users: 15 logs (increased for new registrants)
- Plus plan: 100 logs
- Pro plan: Unlimited

## User Flow

1. **Anonymous User** starts using SafeDose
2. **Interaction Tracking** counts manual dose calculations and log saves
3. **Threshold Reached** (3 interactions) triggers prompt eligibility
4. **Prompt Display** shows non-modal overlay on home screen
5. **User Action**:
   - **Sign Up** → Google OAuth flow → Welcome message → 15 free logs
   - **Maybe Later** → 24-hour dismissal → Can show again later
6. **Analytics** tracks all user decisions for optimization

## Testing

The feature can be tested by:
1. Using the app as an anonymous user
2. Completing 3 manual dose calculations or log saves
3. Returning to the home screen to see the prompt
4. Testing both "Sign Up" and "Maybe Later" flows
5. Verifying analytics events in Firebase Analytics console

## Future Enhancements

- A/B testing for different prompt messages
- Configurable interaction thresholds per user segment
- More sophisticated timing (e.g., after specific user journeys)
- Email capture for non-OAuth users
- Progressive disclosure of features for new users