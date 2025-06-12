# Power User Promotion Feature Testing Guide

## Overview
This guide outlines how to test the new power user promotion modal functionality that addresses issue #333.

## What Changed
- **Before**: "You've become a SafeDose power user!" modal showed when hitting log storage limits (10 logs for free users)
- **After**: Modal shows based on dose completion count (4+ doses), subscription status, and time cycling (every 2 weeks)

## Testing Scenarios

### ✅ Scenario 1: New User - No Promotion Yet
**Setup**: Fresh user, completed 1-3 doses
**Expected**: No promotion modal should appear
**How to Test**:
1. Start fresh dose calculation
2. Complete dose successfully 
3. Go through feedback flow
4. **Verify**: No power user promotion modal appears

### ✅ Scenario 2: Eligible User - First Time Promotion
**Setup**: User with 4+ completed doses, never shown promotion
**Expected**: Power user promotion modal appears
**How to Test**:
1. Complete 4th dose successfully
2. Go through feedback flow
3. **Verify**: Modal appears with title "You've Become a SafeDose Power User!"
4. **Verify**: Shows "Great job on completing multiple doses!" message
5. **Verify**: Shows "Upgrade to Pro" and "Maybe later" buttons

### ✅ Scenario 3: Premium User - No Promotion
**Setup**: User with Pro/Plus subscription and 10+ doses
**Expected**: No promotion modal (already subscribed)
**How to Test**:
1. Set user to Pro/Plus plan in Firebase/storage
2. Complete multiple doses
3. **Verify**: No power user promotion modal appears

### ✅ Scenario 4: Recently Shown - No Promotion
**Setup**: User shown promotion within last 14 days
**Expected**: No promotion modal (too soon)
**How to Test**:
1. Manually set `lastShownDate` to 7 days ago in AsyncStorage
2. Complete doses (should have 4+)
3. **Verify**: No power user promotion modal appears

### ✅ Scenario 5: Cycling - Show Again After 2 Weeks
**Setup**: User shown promotion >14 days ago, still non-subscriber
**Expected**: Promotion modal appears again
**How to Test**:
1. Manually set `lastShownDate` to 20 days ago in AsyncStorage
2. Complete dose successfully
3. **Verify**: Modal appears again

### ✅ Scenario 6: Log Limit vs Power User Promotion
**Setup**: User hits actual log storage limit (10 logs)
**Expected**: Traditional log limit modal (different from promotion)
**How to Test**:
1. Fill user's log storage to limit (10 entries)
2. Try to save another dose
3. **Verify**: Modal shows "Unlock Your Full Dosing History" title
4. **Verify**: Shows "Continue without saving" button (not "Maybe later")

## Modal Content Differences

### Power User Promotion Modal
- **Title**: "You've Become a SafeDose Power User!"
- **Message**: "Great job on completing multiple doses! Upgrade to Pro..."
- **Buttons**: "Upgrade to Pro" + "Maybe later"
- **Behavior**: Dose is already logged, continues navigation on close

### Log Limit Modal
- **Title**: "Unlock Your Full Dosing History"
- **Message**: "You've become a SafeDose power user! Upgrade to Pro..."
- **Buttons**: "Upgrade to Pro" + "Continue without saving"
- **Behavior**: Dose not logged yet, offers to continue without saving

## Key Implementation Details

### Tracking Data Stored
```javascript
{
  doseCount: number,           // Incremented on each successful dose
  lastShownDate: string|null,  // ISO date when promotion was last shown
  hasActiveSubscription: boolean,
  plan: string                 // 'free', 'plus', 'pro'
}
```

### Trigger Conditions
1. `doseCount >= 4`
2. `hasActiveSubscription === false`
3. `lastShownDate === null` OR `daysSinceLastShown >= 14`

### Storage Keys
- AsyncStorage: `powerUserPromotion_${userId}`
- Firestore: User document `plan` field for subscription status

## Analytics Events
- `LIMIT_MODAL_VIEW` with type: `'power_user_promotion'` or `'log_limit'`
- `LIMIT_MODAL_ACTION` with action and type

## Testing Tools
- Use browser dev tools to modify AsyncStorage values
- Check console logs for detailed promotion logic decisions
- Run `validate-power-user-promotion.js` script for logic testing

## Edge Cases Covered
- Anonymous vs authenticated users
- Offline functionality (cached data)
- Network failures (graceful degradation)
- Multiple rapid dose completions
- User upgrading mid-session
- App state persistence across sessions