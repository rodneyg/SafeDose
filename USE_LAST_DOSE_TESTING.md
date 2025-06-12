# "Use Last Dose" Feature - Manual Testing Guide

## Overview
This guide provides steps to manually test the "Use Last Dose" shortcut functionality.

## Prerequisites
- App must be running with at least one completed dose in the log history
- User should be on the IntroScreen (main screen)

## Test Scenarios

### Scenario 1: Button Visibility
**Expected Behavior**: "Use Last Dose" button should only appear when user has previous dose logs

**Test Steps**:
1. Open the app as a new user (no dose history)
2. Verify "Use Last Dose" button is NOT visible on IntroScreen
3. Complete a dose calculation (scan or manual) and save it
4. Return to IntroScreen
5. Verify "Use Last Dose" button IS now visible

### Scenario 2: Dose Prefilling
**Expected Behavior**: Button should prefill the dose screen with values from the most recent dose

**Test Steps**:
1. Complete a dose with known values:
   - Substance: "Testosterone" 
   - Dose: 100mg
   - Syringe: Standard 3ml
2. Save the dose to logs
3. Return to IntroScreen
4. Click "Use Last Dose" button
5. Verify app navigates to new-dose screen
6. Verify dose field is prefilled with 100mg
7. Verify substance field shows "Testosterone" (if visible)
8. Verify syringe type is set to Standard

### Scenario 3: User Can Adjust Values
**Expected Behavior**: User should be able to modify prefilled values before saving

**Test Steps**:
1. Click "Use Last Dose" from IntroScreen
2. Modify the prefilled dose value (e.g., change from 100mg to 150mg)
3. Continue through the dose calculation process
4. Verify the calculation uses the modified value, not the original
5. Complete and save the new dose
6. Verify the new dose (150mg) appears in logs as a separate entry

### Scenario 4: Different Dose Units
**Expected Behavior**: Should work with different units (mg, mcg, units, mL)

**Test Steps**:
1. Complete doses with different units:
   - 50 mcg peptide
   - 10 units insulin  
   - 2 mL solution
2. Test "Use Last Dose" with each different unit type
3. Verify units are preserved correctly in prefill

### Scenario 5: Multiple Users
**Expected Behavior**: Should only show doses for the current user

**Test Steps**:
1. Sign in as User A, complete a dose
2. Sign out and sign in as User B
3. Verify "Use Last Dose" button does NOT appear (no history for User B)
4. Complete a dose as User B
5. Verify "Use Last Dose" now appears for User B's dose only

## Error Scenarios

### Scenario E1: No Recent Dose
**Expected Behavior**: Should handle gracefully if no recent dose is found

**Test Steps**:
1. Manually trigger the getMostRecentDose function when no doses exist
2. Verify no errors are thrown
3. Verify appropriate logging occurs

### Scenario E2: Corrupted Dose Data
**Expected Behavior**: Should handle missing or invalid dose data gracefully

**Test Steps**:
1. Test with dose logs missing required fields
2. Verify app doesn't crash
3. Verify appropriate fallbacks are used

## Success Criteria
- [ ] Button only appears when user has dose history
- [ ] Button properly prefills dose screen with last dose values
- [ ] User can modify prefilled values before saving
- [ ] Works with all supported dose units
- [ ] Preserves user isolation (no cross-user data)
- [ ] No existing functionality is broken
- [ ] No crashes or errors during normal usage

## UI/UX Validation
- [ ] Button has appropriate styling (green theme with RotateCcw icon)
- [ ] Button text is clear: "Use Last Dose"
- [ ] Button is properly positioned between welcome and action buttons
- [ ] Button is responsive on mobile/web
- [ ] Proper accessibility labels are present

## Performance Validation
- [ ] Fast response when clicking "Use Last Dose"
- [ ] Minimal loading time when checking for recent doses
- [ ] No memory leaks from dose log retrieval
- [ ] Works offline (uses local storage fallback)