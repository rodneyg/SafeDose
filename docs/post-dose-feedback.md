# Post-Dose Feedback Feature

## Overview

The post-dose feedback feature allows users to optionally log how a dose felt after administration. This is a non-intrusive feature that collects user feedback for personal tracking purposes.

## User Flow

1. User completes dose calculation and sees the final result
2. User clicks "New Dose" or "Scan Again" 
3. App routes to **PostDoseFeedbackScreen** (optional step)
4. User can provide feedback or skip
5. App continues to the intended destination (intro screen or scan screen)

## Feedback Options

1. **Great** 😊 - Dose went well with no issues
2. **Mild side effects** 😐 - Some minor side effects experienced  
3. **Something felt wrong** 😟 - Something concerning happened
   - Includes optional text input for additional details (200 char limit)

## Data Storage

- **Local Storage**: AsyncStorage for all users (works offline)
- **Cloud Storage**: The app attempts a Firestore write for signed-in users. Feedback history is read from local storage.
- **Local Retention**: Last 50 feedback entries per storage identity
- **Privacy**: Feedback is user-specific and not shared

## Technical Implementation

### New Components
- `PostDoseFeedbackScreen` - Main feedback UI component
- `useFeedbackStorage` - Hook for data persistence
- `types/feedback.ts` - TypeScript type definitions

### Modified Components
- `FinalResultDisplay` - Routes to feedback screen instead of direct navigation
- `useDoseCalculator` - Added feedback context and navigation handlers
- `ManualEntryScreen` - Passes feedback handlers to child components
- `new-dose.tsx` - Includes feedback screen in routing logic

### Key Features
- ✅ Optional feedback collection (can skip)
- ✅ Three feedback types with clear UI
- ✅ Optional text input for detailed feedback
- ✅ Local and cloud storage with automatic fallback
- ✅ Non-blocking implementation (errors don't break app)
- ✅ Responsive design for mobile web
- ✅ Maintains existing navigation patterns

## Data Structure

```typescript
interface DoseFeedback {
  id: string;
  userId?: string;
  feedbackType: 'great' | 'mild_side_effects' | 'something_wrong';
  notes?: string;
  timestamp: string;
  doseInfo: {
    substanceName: string;
    doseValue: number;
    unit: string;
    calculatedVolume: number;
  };
}
```

## Future Enhancements

- Analytics dashboard for healthcare providers
- Trend analysis over time
- Export functionality for medical records
- Integration with health tracking apps

## Privacy & Safety

- Feedback data is stored locally, with a Firestore write for signed-in users
- No feedback data affects future dose calculations
- Data is used for personal tracking only
- Users can skip feedback collection entirely