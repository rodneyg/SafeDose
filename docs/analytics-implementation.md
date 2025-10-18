# Firebase Analytics Implementation

This document describes the Firebase Analytics implementation for SafeDose to track user behavior and increase revenue.

## Overview

Firebase Analytics has been integrated to track key user interactions and behaviors that impact revenue generation. The implementation includes event tracking, user properties, and error monitoring.

## Analytics Events

The following custom events are tracked:

### Authentication Events
- **sign_in_attempt**: Logged when user attempts to sign in (email or Google)
- **sign_in_success**: Logged on successful sign-in
- **sign_in_failure**: Logged on failed sign-in with error details
- **sign_up_success**: Logged when anonymous user links to authenticated account
- **logout**: Logged when user signs out

### Pricing & Upgrade Events
- **view_pricing_page**: Logged when pricing page is viewed
- **initiate_upgrade**: Logged when user starts upgrade process
- **upgrade_success**: Logged on successful plan upgrade
- **upgrade_failure**: Logged on upgrade failure with error details
- **cancel_subscription**: Logged when a user cancels their plan
- **downgrade_plan**: Logged when a user downgrades to a lower tier

### Scan Usage Events
- **scan_attempt**: Logged when user attempts a scan
- **scan_success**: Logged on successful scan completion
- **scan_failure**: Logged on scan failure with reason
- **reach_scan_limit**: Logged when user hits scan limit

### Manual Entry Events
- **MANUAL_ENTRY_STARTED**: Logged when the user starts the manual entry flow.
- **MANUAL_ENTRY_COMPLETED**: Logged when the user completes the manual entry flow and proceeds to the feedback screen.

### User Interaction Events
- **limit_modal_view**: Logged when the limit modal is displayed
- **limit_modal_action**: Logged for limit modal interactions (sign_in, upgrade, cancel)
- **error_occurred**: Logged for critical errors with type and message

### Feedback Events
- **feedback_submitted**: Logged when post-dose feedback is submitted
- **feedback_skipped**: Logged when the feedback step is skipped

### Profile Storage Events
- **profile_saved_firebase**: Logged when profile is saved to Firebase with detailed personalization parameters
- **profile_saved_local_only**: Logged when profile is saved only to local storage (anonymous users)
- **profile_save_firebase_failed**: Logged when Firebase profile save fails but local save succeeds
- **profile_backed_up**: Logged when local profile is backed up to Firebase (user authentication transition)
- **profile_backup_failed**: Logged when profile backup to Firebase fails

## User Properties

The following user properties are set and maintained:

- **plan_type**: "free", "plus", or "pro" (updated on auth change and after upgrades)
- **is_anonymous**: true/false (updated on auth state changes)
- **is_licensed_professional**: true/false (from user profile personalization)
- **is_personal_use**: true/false (from user profile personalization)
- **is_cosmetic_use**: true/false (from user profile personalization)
- **user_segment**: "healthcare_professional", "cosmetic_user", "personal_medical_user", or "general_user" (derived from profile settings)

## Implementation Details

### Core Files

1. **lib/analytics.ts**: Central analytics utility with constants and helper functions
2. **app/_layout.tsx**: Analytics initialization
3. **contexts/AuthContext.tsx**: User properties and logout events
4. **contexts/UserProfileContext.tsx**: Personalization user properties and profile storage events
5. **app/login.tsx**: Authentication events
6. **app/pricing.tsx**: Pricing and upgrade initiation events
7. **app/success.tsx**: Upgrade completion events
8. **app/(tabs)/new-dose.tsx**: Scan events and error tracking
9. **app/onboarding/userType.tsx**: Detailed onboarding step tracking and completion events
10. **components/LimitModal.tsx**: Limit modal interaction events
11. **lib/hooks/useUsageTracking.ts**: Plan type user property updates

### Event Parameters

Events include relevant parameters for analysis:
- Method (email, google) for authentication events
- Plan type (plus) for upgrade events
- Error messages for failure events
- Action type (sign_in, upgrade, cancel) for modal events
- Detailed personalization selections (isLicensedProfessional, isPersonalUse, isCosmeticUse) for profile and onboarding events
- User segmentation and transition data for profile backup events

### Error Handling

All analytics calls are wrapped in try-catch blocks and gracefully handle:
- Missing analytics instance (non-web platforms)
- Network connectivity issues
- Firebase configuration problems

## Usage Examples

```typescript
// Log a simple event
logAnalyticsEvent(ANALYTICS_EVENTS.SCAN_ATTEMPT);

// Log event with parameters
logAnalyticsEvent(ANALYTICS_EVENTS.SIGN_IN_FAILURE, { 
  method: 'google', 
  error: error.message 
});

// Log profile storage events with personalization details
logAnalyticsEvent(ANALYTICS_EVENTS.PROFILE_SAVED_FIREBASE, {
  isLicensedProfessional: true,
  isPersonalUse: false,
  isCosmeticUse: false,
  userId: user.uid,
  userType: 'authenticated'
});

// Log profile backup events
logAnalyticsEvent(ANALYTICS_EVENTS.PROFILE_BACKED_UP, {
  isLicensedProfessional: false,
  isPersonalUse: true,
  isCosmeticUse: true,
  userId: user.uid,
  previouslyAnonymous: true
});

// Set user properties
setAnalyticsUserProperties({
  [USER_PROPERTIES.PLAN_TYPE]: 'plus',
  [USER_PROPERTIES.IS_ANONYMOUS]: false,
});

// Set personalization user properties
setPersonalizationUserProperties(profile);

// Export analytics data grouped by user segments
const groupedData = exportGroupedAnalytics();

// Export analytics data for a specific date range
const dataForDateRange = exportGroupedAnalytics(
  new Date('2024-01-01'), 
  new Date('2024-12-31')
);

// Export analytics as CSV format
const csvExport = exportAnalyticsAsCSV(groupedData);

// Export analytics summary with top events per segment
const summary = exportAnalyticsSummary();

// Log events with storage for export functionality
logAnalyticsEventWithStorage(
  ANALYTICS_EVENTS.SCAN_ATTEMPT,
  { method: 'camera' },
  USER_SEGMENTS.HEALTHCARE_PROFESSIONAL,
  'user_123'
);
```

## Key Metrics to Monitor

Using the implemented events, you can track:

1. **Conversion Rates**:
   - reach_scan_limit → upgrade_success
   - view_pricing_page → initiate_upgrade
   - initiate_upgrade → upgrade_success

2. **User Engagement**:
   - Scan success/failure rates
   - Anonymous vs authenticated user behavior
   - Plan usage patterns

3. **Drop-off Points**:
   - Authentication funnel (attempt → success/failure)
   - Upgrade funnel (view → initiate → success)

4. **Error Monitoring**:
   - Scan failure reasons
   - Upgrade failure causes
   - Critical application errors

## Testing

To verify the implementation:

1. Simulate user actions (sign-in, scan, upgrade)
2. Check Firebase Analytics console for events (may take up to 24 hours)
3. Verify user properties reflect current user state
4. Test error scenarios to ensure error events are logged

## Group Analyzer Export Functionality

The analytics system now includes comprehensive export functionality for analyzing user behavior grouped by user segments. This allows administrators and analysts to understand usage patterns across different user types.

### User Segments

The system tracks four distinct user segments:

- **healthcare_professional**: Licensed healthcare professionals
- **cosmetic_user**: Users focused on cosmetic applications
- **personal_medical_user**: Personal medical use cases
- **general_user**: All other users (default segment)

### Export Functions

#### `logAnalyticsEventWithStorage`
Enhanced logging function that stores events for export while maintaining regular analytics logging.

```typescript
logAnalyticsEventWithStorage(
  eventName: string,
  parameters?: Record<string, any>,
  userSegment?: string,
  userId?: string
)
```

#### `exportGroupedAnalytics`
Exports analytics data grouped by user segments with optional date filtering.

```typescript
const groupedData = exportGroupedAnalytics(
  dateFrom?: Date,
  dateTo?: Date
): GroupedAnalyticsData
```

Returns data structured by user segment with:
- Event lists per segment
- Event counts per event type
- Unique user counts
- User properties

#### `exportAnalyticsAsCSV`
Exports analytics data in CSV format for spreadsheet analysis.

```typescript
const csvData = exportAnalyticsAsCSV(
  groupedData?: GroupedAnalyticsData,
  dateFrom?: Date,
  dateTo?: Date
): string
```

#### `exportAnalyticsSummary`
Exports a summary report with top events and metrics per segment.

```typescript
const summary = exportAnalyticsSummary(
  dateFrom?: Date,
  dateTo?: Date
): Record<string, any>
```

### Example Usage

```typescript
// Log events with storage for export
logAnalyticsEventWithStorage(
  ANALYTICS_EVENTS.SCAN_ATTEMPT,
  { method: 'camera' },
  USER_SEGMENTS.HEALTHCARE_PROFESSIONAL,
  'user_123'
);

// Export all data grouped by segments
const allData = exportGroupedAnalytics();

// Export data for specific date range
const monthlyData = exportGroupedAnalytics(
  new Date('2024-01-01'),
  new Date('2024-01-31')
);

// Export as CSV for spreadsheet analysis
const csvReport = exportAnalyticsAsCSV(monthlyData);

// Get summary report
const summary = exportAnalyticsSummary();
console.log('Healthcare professionals:', summary.segmentSummary.healthcare_professional);
```

## Platform Support

The implementation works across:
- Web (Firebase Analytics fully supported)
- iOS (Firebase Analytics SDK)
- Android (Firebase Analytics SDK)

Analytics will only be active on web platforms where `window` is available. On mobile platforms, events will be logged to console for debugging but won't be sent to Firebase unless the platform-specific Firebase Analytics SDK is properly configured.