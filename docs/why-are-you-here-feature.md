# "Why Are You Here?" Micro-Prompt Feature

## Overview

The "Why Are You Here?" micro-prompt is a lightweight, one-time survey that appears after a user's first successful dose calculation (manual or scan). It helps understand user intent and conversion sources without adding friction to the onboarding flow.

## User Experience

### Trigger Conditions
- Shows **once** after the first successful dose action (manual entry or scan)
- One-time popup per anonymous session or authenticated user ID
- Must be skippable with a subtle "Skip" button
- Never blocks critical functionality

### User Flow
1. User completes their first dose calculation successfully
2. Instead of going directly to post-dose feedback, they see the "Why Are You Here?" prompt
3. User can either:
   - Select one of 8 predefined options
   - Choose "Other" and provide custom text (200 char limit)
   - Skip the prompt entirely
4. User proceeds to the existing post-dose feedback screen
5. Subsequent dose calculations skip this prompt and go directly to feedback

### Response Options
1. 🔘 Reddit
2. 🔘 Twitter / X  
3. 🔘 Heard from a friend
4. 🔘 Needed a clean calculator
5. 🔘 Trying the AI scan
6. 🔘 Curious about dose logs
7. 🔘 Comparing tools / other peptide site
8. 🔘 Other (with optional text input)

## Technical Implementation

### Components Added

#### `WhyAreYouHereScreen.tsx`
- Main UI component for the micro-prompt
- Responsive design for mobile and web
- Radio-button style selection with visual feedback
- Optional text input for "Other" responses
- Subtle skip button in bottom-right corner

#### `useWhyAreYouHereTracking.ts`
- Custom hook for managing first-use state
- AsyncStorage integration for persistence
- Per-user tracking (anonymous + authenticated)
- Analytics event logging

### Integration Points

#### Modified Files

**`lib/analytics.ts`**
- Added new analytics events:
  - `WHY_HERE_PROMPT_SHOWN`
  - `WHY_HERE_PROMPT_RESPONSE` 
  - `WHY_HERE_PROMPT_SKIPPED`

**`lib/hooks/useDoseCalculator.ts`**
- Added new screen step: `'whyAreYouHere'`
- Modified `handleGoToFeedback` to check if prompt should be shown
- Added handlers: `handleWhyAreYouHereSubmit`, `handleWhyAreYouHereSkip`

**`app/(tabs)/new-dose.tsx`**
- Added import for `WhyAreYouHereScreen`
- Added screen step rendering logic
- Updated subtitle handling for new screen

### Data Storage

#### Local Storage (AsyncStorage)
```typescript
// Prompt shown flag
key: `whyAreYouHerePromptShown_${userId}`
value: 'true' | null

// Response backup
key: `whyAreYouHereResponse_${userId}`
value: JSON.stringify({
  response: WhyAreYouHereResponse,
  customText: string | null,
  timestamp: string,
  userId: string,
  isAnonymous: boolean
})
```

#### Analytics Events
```typescript
// When prompt is shown
logAnalyticsEvent('why_here_prompt_shown', {
  userId: string,
  isAnonymous: boolean
});

// When user responds
logAnalyticsEvent('why_here_prompt_response', {
  response: WhyAreYouHereResponse,
  hasCustomText: boolean
});

// When user skips
logAnalyticsEvent('why_here_prompt_skipped');
```

## Testing

### Test Coverage
- **Integration tests**: Flow from dose calculation to prompt display
- **Component tests**: UI logic and state management  
- **Hook tests**: Storage and tracking logic
- **Analytics tests**: Event logging verification

### Test Files
- `components/WhyAreYouHereIntegration.test.ts`
- `components/WhyAreYouHereScreen.test.ts`
- `lib/hooks/useWhyAreYouHereTracking.test.ts`

## Usage Analytics

The feature provides insights into:
- **Conversion sources**: Which platforms drive users (Reddit, Twitter, etc.)
- **Feature interest**: What users came to try (AI scan, calculator, logs)
- **User journey**: How users discover and engage with the app

## Privacy & Safety

- **Non-intrusive**: Can always be skipped
- **Optional data**: No required fields except selection
- **Local storage**: Responses backed up locally for reliability
- **No blocking**: Never interrupts critical dose calculation flow
- **Anonymous-friendly**: Works for both anonymous and authenticated users

## Future Enhancements

- Dashboard for analyzing response patterns
- A/B testing different response options
- Integration with user profiles for segmentation
- Export functionality for detailed analysis