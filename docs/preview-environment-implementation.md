# Preview Environment Implementation

This document describes the implementation of preview environment handling for analytics disabling and Firestore environment tagging.

## Overview

When `NEXTPUBLIC_ENVIRONMENT=preview`, the application:
1. **Skips Firebase event logging and user property updates**
2. **Tags Firestore writes that use the wrappers** by adding `env: "preview"` to adds and non-merge sets
3. **Preserves update operations** - merge operations remain unchanged

## Environment Detection

### Configuration
- Added `NEXTPUBLIC_ENVIRONMENT` to `app.config.js`
- Environment variable defaults to `'production'` if not set

### Utility Functions
```typescript
// lib/environment.ts
export const getCurrentEnvironment = (): string => {
  return Constants.expoConfig?.extra?.NEXTPUBLIC_ENVIRONMENT || 'production';
};

export const isPreviewEnvironment = (): boolean => {
  return getCurrentEnvironment() === 'preview';
};
```

## Analytics Disabling

### Implementation
Modified `lib/analytics.ts` to check environment before sending analytics:

```typescript
export const logAnalyticsEvent = (eventName: string, parameters?: Record<string, any>) => {
  // Disable analytics in preview environment
  if (isPreviewEnvironment()) {
    console.log(`[Analytics] Preview environment - skipping event: ${eventName}`, parameters);
    return;
  }
  // ... rest of function
};
```

### Affected Functions
- `logAnalyticsEvent()` - skips all event logging
- `setAnalyticsUserProperties()` - skips all user property setting
- `setPersonalizationUserProperties()` - indirectly disabled via above

[Vercel Web Analytics](../lib/WebAnalytics.tsx) uses a separate web-only
provider. It tracks route changes and strips query strings and fragments
from the event URL. The Firebase preview switch does not control Vercel
Web Analytics.

## Firestore Environment Tagging

### Implementation
Created wrapper functions in `lib/firestoreWithEnv.ts`:

#### addDocWithEnv
- Adds `env: "preview"` field to all documents in preview environment
- Replaces direct `addDoc` calls

#### setDocWithEnv  
- Adds `env: "preview"` field only for create operations (no merge options)
- Update operations (with merge: true) remain unchanged
- Replaces direct `setDoc` calls for document creation

### Updated Files
The following files were updated to use the wrapper functions:

1. **contexts/UserProfileContext.tsx** - User profile creation
2. **lib/hooks/useDoseLogging.ts** - Dose log creation  
3. **app/(tabs)/reference.tsx** - Compound suggestions
4. **lib/hooks/useOnboardingSurvey.ts** - PMF survey responses
5. **lib/hooks/useOnboardingIntentStorage.ts** - Onboarding intent data
6. **lib/hooks/useFeedbackStorage.ts** - User feedback
7. **lib/hooks/useUsageTracking.ts** - User usage tracking documents (create only)

### Unchanged Operations
These operations continue using standard Firestore functions:
- All update operations with `{ merge: true }`
- Document deletions
- Read operations
- Query operations

## Testing

### Environment Validation
```bash
# Preview environment
NEXTPUBLIC_ENVIRONMENT=preview

# Production environment  
NEXTPUBLIC_ENVIRONMENT=production
# or unset (defaults to production)
```

### Expected Behavior

#### Preview Environment
- Console logs show: `[Analytics] Preview environment - skipping event: ...`
- Firestore documents include: `{ ..., env: "preview" }`
- Update operations exclude env field

#### Production Environment
- Analytics events sent normally
- Firestore documents do not include env field
- All operations work as before

## Acceptance Criteria ✅

- [x] Firebase event and property helpers skip tracking when running in preview
- [x] Wrapped Firestore adds and non-merge sets include "env": "preview" in the data
- [x] Updates (non-creates) do not require modification
- [x] Other non-analytics operations remain fully functional
- [x] QA can check for Firebase events and the env field on wrapped Firestore writes

## Files Modified

### New Files
- `lib/environment.ts` - Environment detection utilities
- `lib/firestoreWithEnv.ts` - Firestore wrapper functions
- `lib/__tests__/previewEnvironment.test.ts` - Test coverage

### Modified Files
- `app.config.js` - Added NEXTPUBLIC_ENVIRONMENT support
- `lib/analytics.ts` - Added environment checks
- 8 other files updated to use Firestore wrappers

Total lines changed: 44 additions, 19 deletions (minimal surgical changes)