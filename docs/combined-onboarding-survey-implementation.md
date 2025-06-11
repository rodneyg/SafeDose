# Combined Onboarding Survey Implementation

## Overview

The Combined Onboarding Survey replaces both the "Why Are You Here?" micro-prompt and the PMF survey with a single, unified onboarding experience. This reduces survey fatigue while maintaining all data collection requirements.

## Key Features

### Trigger Conditions
- Shows **once** after the second successful dose action (leveraging PMF survey timing)
- One-time popup per anonymous session or authenticated user ID
- Must be skippable with a clear "X" button
- Never blocks critical functionality

### Survey Flow
1. **Step 1: Why Are You Here?** - User selects from 8 predefined options or "Other" with custom text
2. **Step 2: PMF Disappointment** - "How would you feel if you could no longer use SafeDose?"
3. **Step 3: Benefit Person** - "What type of person would most benefit from SafeDose?"
4. **Step 4: Main Benefit** - "What is the main benefit you've received from using SafeDose so far?"
5. **Step 5: Improvements** - "How can we improve SafeDose for you?"

### UX Design
- **Progressive disclosure** - One question at a time (similar to PMF survey)
- **Progress indicator** showing current step (X of 5)
- **Back navigation** available between questions
- **Skip/dismiss option** with clear "X" button
- **Mobile-responsive** design

## Technical Implementation

### Core Components

#### `useCombinedOnboardingSurvey` Hook
```typescript
// Session tracking and trigger logic
const { triggerData, recordDoseSession, submitCombinedSurvey, skipSurvey } = useCombinedOnboardingSurvey();

// Records each dose completion
await recordDoseSession('scan' | 'manual');

// Check if survey should show
triggerData.shouldShowSurvey; // true on 2nd session (if not shown before)
```

#### `CombinedOnboardingSurvey` Component
- Step-by-step question interface with progress tracking
- Form validation for multiple choice and text inputs
- Analytics tracking for all interactions

#### Integration with Dose Flow
```typescript
// In useDoseCalculator.ts
const handleInjectionSiteSelected = async () => {
  // Record dose session for combined survey tracking
  const triggerData = await combinedSurvey.recordDoseSession(sessionType);
  
  // Show combined survey if conditions met
  if (triggerData.shouldShowSurvey) {
    setScreenStep('combinedOnboardingSurvey');
  } else {
    setScreenStep('postDoseFeedback'); // Regular feedback
  }
};
```

### Storage Strategy

#### Local Storage (AsyncStorage)
```typescript
// Session count tracking
combinedOnboardingSurveySessionCount_${userId}: "2"

// Survey shown state
combinedOnboardingSurvey_${userId}: {
  "hasShownBefore": true,
  "shownAt": "2024-01-01T00:00:00.000Z",
  "responses": { ... }
}
```

### Analytics Events

All existing analytics events are preserved for backward compatibility:

```typescript
// Why Are You Here events (preserved)
WHY_HERE_PROMPT_SHOWN: 'why_here_prompt_shown'
WHY_HERE_PROMPT_RESPONSE: 'why_here_prompt_response' 
WHY_HERE_PROMPT_SKIPPED: 'why_here_prompt_skipped'

// PMF Survey events (preserved)
PMF_SURVEY_SHOWN: 'pmf_survey_shown'
PMF_SURVEY_QUESTION_ANSWERED: 'pmf_survey_question_answered' 
PMF_SURVEY_COMPLETED: 'pmf_survey_completed'
PMF_SURVEY_SKIPPED: 'pmf_survey_skipped'
PMF_SURVEY_DISMISSED: 'pmf_survey_dismissed'
```

## Migration Impact

### Replaced Components
- ❌ `WhyAreYouHereScreen.tsx` - No longer rendered
- ❌ `PMFSurveyModal.tsx` - No longer rendered
- ❌ `useWhyAreYouHereTracking.ts` - No longer used
- ❌ `usePMFSurvey.tsx` - No longer used

### New Components
- ✅ `CombinedOnboardingSurvey.tsx` - Unified survey component
- ✅ `useCombinedOnboardingSurvey.ts` - Unified survey logic
- ✅ `types/combined-onboarding-survey.ts` - Type definitions

### Flow Changes
- **Before**: First dose → Why Are You Here → Second dose → PMF Survey
- **After**: Second dose → Combined Onboarding Survey (5 steps)

## Data Continuity

### Analytics Preservation
- All existing analytics events continue to fire
- Same event parameters and structure maintained
- Existing dashboards and analysis remain functional

### Response Storage
- Combined responses stored in new format but analytics fired separately
- Backward compatibility maintained for existing analysis tools
- Both individual survey data and combined data available

## Benefits

1. **Reduced Survey Fatigue** - Single survey instead of two separate prompts
2. **Higher Completion Rates** - Users have more context after using the app twice
3. **Streamlined Onboarding** - Cleaner user experience
4. **Maintained Insights** - All original data collection preserved
5. **Better Signal** - PMF questions more meaningful after usage experience

## Testing

### Test Coverage
- **Logic tests**: Core trigger and flow logic
- **Component tests**: UI behavior and state management  
- **Integration tests**: Full user flow scenarios
- **Analytics tests**: Event logging verification

### Test Files
- `lib/hooks/combined-onboarding-survey-logic.test.ts`

## Privacy & Safety

- **Non-intrusive**: Can always be skipped
- **Optional data**: No required fields except selections
- **Local storage**: Responses backed up locally for reliability
- **No blocking**: Never interrupts critical dose calculation flow
- **Anonymous-friendly**: Works for both anonymous and authenticated users