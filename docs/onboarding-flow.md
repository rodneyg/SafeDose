# Step-by-Step Onboarding Flow

## Overview

The user onboarding experience has been transformed from a single page with all questions to a step-by-step flow that feels less invasive while collecting the same information needed for personalization.

## Flow Design

### Step 1: Background (Required)
**Question:** "What's your background?"

**Options:**
- Healthcare Professional (Licensed healthcare provider, nurse, doctor, pharmacist, etc.)
- General User (Patient, caregiver, or someone learning about medications)

**Analytics:**
```typescript
// Step start
logAnalyticsEvent('onboarding_step_start', {
  step: 1,
  step_name: 'background'
});

// User selection
logAnalyticsEvent('onboarding_step_complete', {
  step: 1,
  step_name: 'background',
  question: 'isLicensedProfessional',
  answer: true // or false
});
```

### Step 2: Use Type (Required)
**Question:** "What type of use?"

**Options:**
- Medical/Prescribed (Doctor-prescribed medications or medical treatments)
- Cosmetic/Aesthetic (Cosmetic injections or aesthetic treatments)

**Analytics:**
```typescript
// Step start
logAnalyticsEvent('onboarding_step_start', {
  step: 2,
  step_name: 'use_type'
});

// User selection
logAnalyticsEvent('onboarding_step_complete', {
  step: 2,
  step_name: 'use_type',
  question: 'isCosmeticUse',
  answer: false // true for cosmetic, false for medical
});
```

### Step 3: Personal Use (Optional - Can Skip)
**Question:** "Who is this for?"

**Options:**
- For myself (I'm using this for my own treatment)
- For someone else (I'm helping prepare medication for another person)
- **Skip option:** "Prefer not to answer"

**Analytics:**
```typescript
// Step start
logAnalyticsEvent('onboarding_step_start', {
  step: 3,
  step_name: 'personal_use'
});

// User selection
logAnalyticsEvent('onboarding_step_complete', {
  step: 3,
  step_name: 'personal_use',
  question: 'isPersonalUse',
  answer: true // or false
});

// Or if user skips
logAnalyticsEvent('onboarding_step_skip', {
  step: 3,
  step_name: 'personal_use'
});
```

## Completion Analytics

When the user completes the entire flow:

```typescript
logAnalyticsEvent('onboarding_complete', {
  isLicensedProfessional: true, // final answer
  isPersonalUse: true, // final answer or default if skipped
  isCosmeticUse: false, // final answer
  skipped_personal_use: false // true if step 3 was skipped
});
```

## User Experience Improvements

### Less Invasive Questions
- **Before:** "Are you using this personally?" (sounds intrusive)
- **After:** "Who is this for?" (more neutral framing)

- **Before:** "Are you a licensed health professional?" (yes/no binary)
- **After:** "What's your background?" (descriptive options)

- **Before:** "Is this for cosmetic or prescribed use?" (confusing either/or)
- **After:** "What type of use?" (clear categories)

### Progressive Disclosure
- Users see one question at a time
- Clear progress indicator (Step X of 3)
- Visual progress bar
- Back navigation available

### Skip Option
- Most sensitive question (personal use) can be skipped
- Clear "Prefer not to answer" option
- Default behavior when skipped (assumes personal use)
- Analytics tracking of skips for insights

## Data Handling

### Default Values for Skipped Questions
```typescript
const finalProfile = {
  isLicensedProfessional: answers.isLicensedProfessional ?? false,
  isPersonalUse: answers.isPersonalUse ?? true, // Default to personal use if skipped
  isCosmeticUse: answers.isCosmeticUse ?? false,
  dateCreated: new Date().toISOString(),
  userId: user?.uid,
};
```

### Analytics Insights Available
1. **Completion rates per step**
2. **Skip rates for personal use question**
3. **User segmentation breakdown**
4. **Drop-off points in the flow**
5. **Time spent on each step**

## Navigation Flow

```
Welcome → Demo → Background → Use Type → Personal Use → Main App
    ↑        ↑         ↑          ↑           ↑
    |        |         |          |           |
  Entry    Step-by-step onboarding flow    Complete
```

## Technical Implementation

- Step state management with React useState
- Progress calculation: `((currentStep + 1) / 3) * 100`
- Animated transitions between steps
- Analytics integration with Firebase
- Backward compatibility with existing user profile structure