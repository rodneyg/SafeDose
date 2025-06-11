# Manual Testing Checklist for Smart Upgrade Teaser UX

## Prerequisites
- [ ] User has remaining free scans (not at limit)
- [ ] Application is running in development mode
- [ ] Browser dev tools open to monitor console logs

## Test Scenario 1: Manual User with Successful Calculation
**Goal**: Verify teaser appears for manual users after successful dose calculation

### Steps:
1. [ ] Open the app and go to the intro screen
2. [ ] Click the "Manual" button (NOT the scan button)
3. [ ] Complete the manual dose calculation flow:
   - [ ] Enter dose: `5 mg`
   - [ ] Enter substance name: `Test Medication`
   - [ ] Select medication source: `Concentration`
   - [ ] Enter concentration: `1 mg/ml`
   - [ ] Select syringe: `Standard 3ml`
   - [ ] Complete calculation
4. [ ] **VERIFY**: On the final result screen, check that:
   - [ ] Calculation result shows (e.g., "Draw to 5.0 ml")
   - [ ] Teaser text appears: "Want to double-check with a vial/syringe photo?"
   - [ ] "Try AI Scan" button is visible with camera icon
   - [ ] Teaser is positioned between disclaimer and action buttons
   - [ ] Styling is subtle (small text, compact button)

### Expected Result:
✅ Teaser should be visible and properly styled

## Test Scenario 2: Scan User Should Not See Teaser
**Goal**: Verify teaser does NOT appear for users who started with scan

### Steps:
1. [ ] Open the app and go to the intro screen
2. [ ] Click the "Scan" button (camera icon)
3. [ ] If scan succeeds, continue to manual entry
4. [ ] If scan fails, complete manual entry
5. [ ] Complete the calculation
6. [ ] **VERIFY**: On the final result screen:
   - [ ] Calculation result shows
   - [ ] Teaser text does NOT appear
   - [ ] Only normal action buttons are visible

### Expected Result:
✅ Teaser should NOT be visible

## Test Scenario 3: User with No Remaining Scans
**Goal**: Verify teaser does not appear when user has reached scan limit

### Steps:
1. [ ] Use up all available scans (use dev tools to modify usage data if needed)
2. [ ] Start fresh dose calculation via Manual button
3. [ ] Complete manual calculation successfully
4. [ ] **VERIFY**: On final result screen:
   - [ ] Calculation result shows
   - [ ] Teaser does NOT appear (user has no scans left)

### Expected Result:
✅ Teaser should NOT be visible

## Test Scenario 4: Calculation Error Cases
**Goal**: Verify teaser does not appear when calculation fails

### Steps:
1. [ ] Start manual dose calculation
2. [ ] Enter invalid data that causes calculation error:
   - [ ] Try dose: `0 mg` or very large dose
   - [ ] Or enter incompatible units
3. [ ] **VERIFY**: On result screen:
   - [ ] Error message is shown
   - [ ] Teaser does NOT appear

### Expected Result:
✅ Teaser should NOT be visible when there are errors

## Test Scenario 5: Teaser Functionality
**Goal**: Verify clicking the teaser works correctly

### Steps:
1. [ ] Complete Test Scenario 1 to get teaser visible
2. [ ] Click the "Try AI Scan" button
3. [ ] **VERIFY**:
   - [ ] Screen transitions to scan mode
   - [ ] Camera interface appears
   - [ ] OR if no scans remaining, limit modal appears

### Expected Result:
✅ Clicking teaser should trigger scan functionality or show limit modal

## Test Scenario 6: Responsive Design
**Goal**: Verify teaser works on different screen sizes

### Steps:
1. [ ] Complete Test Scenario 1 on desktop browser
2. [ ] Resize browser window to mobile width
3. [ ] **VERIFY**:
   - [ ] Teaser remains visible and properly formatted
   - [ ] Text remains readable
   - [ ] Button remains clickable

### Expected Result:
✅ Teaser should be responsive

## Analytics Verification
**Goal**: Ensure teaser interaction is properly tracked

### Steps:
1. [ ] Open browser dev tools, go to Console tab
2. [ ] Complete Test Scenario 1
3. [ ] Click the "Try AI Scan" button
4. [ ] **VERIFY** in console:
   - [ ] Analytics events are logged for teaser interaction
   - [ ] Scan attempt events are triggered

### Expected Result:
✅ Analytics should track teaser usage

## Edge Cases
**Goal**: Test unusual scenarios

### Steps:
1. [ ] **Offline Mode**: Disconnect internet, complete manual calc
   - [ ] Verify teaser behavior when offline
2. [ ] **Anonymous User**: Test with anonymous user vs signed-in user
   - [ ] Verify usage limits are respected
3. [ ] **Plan Upgrades**: Test with different user plans (free, plus, pro)
   - [ ] Verify appropriate scan limits

### Expected Result:
✅ Teaser should handle edge cases gracefully

## Final Validation
- [ ] Teaser appears only for manual users with successful calculations and remaining scans
- [ ] Teaser is subtle and non-intrusive
- [ ] Text matches requirements exactly
- [ ] Functionality integrates properly with existing scan flow
- [ ] No regressions in existing functionality
- [ ] Performance impact is minimal