# Preview Environment Implementation

This document describes the implementation of preview environment handling for analytics disabling and Firestore environment tagging.

## Overview

When `NEXTPUBLIC_ENVIRONMENT=preview`, the application:
1. **Disables all analytics tracking** - no events are sent to Firebase Analytics
2. **Tags Firestore create operations** - adds `env: "preview"` field to new documents
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
4. **lib/hooks/usePMFSurvey.tsx** - PMF survey responses
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

- [x] No analytics events are triggered or sent when running in preview
- [x] All Firestore create operations include "env": "preview" in the data  
- [x] Updates (non-creates) do not require modification
- [x] Other non-analytics operations remain fully functional
- [x] QA can confirm the absence of analytics events and the presence of env in new Firestore records

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