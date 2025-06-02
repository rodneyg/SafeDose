# Manual Testing Guide for Sign Out Button Fix

## Overview
This document describes how to test the sign out button fix that resolves the z-index issue preventing logout functionality.

## Problem Identified
The sign out button was not working because the `menuOverlay` component had a higher z-index (5) than the dropdown menus (elevation 4), causing the overlay to intercept all touch events.

## Test Steps

### Test 1: Verify Sign Out Button Works
1. Open the app and sign in with a Google account (not anonymous)
2. Tap the profile button to open the dropdown menu
3. Tap the "Sign Out" button
4. **Expected Console Logs** (in this order):
   ```
   [IntroScreen] ========== PROFILE MENU TOGGLE ==========
   [IntroScreen] Current isProfileMenuOpen: false
   [IntroScreen] Setting isProfileMenuOpen to: true
   [IntroScreen] ========== LOGOUT BUTTON PRESSED ==========
   [IntroScreen] Closing profile menu and initiating logout...
   [IntroScreen] Calling logout function...
   [AuthContext] ========== LOGOUT INITIATED ==========
   [AuthContext] Setting isSigningOut to true...
   [AuthContext] Calling Firebase signOut...
   [AuthContext] Logging analytics event...
   [AuthContext] ✅ Signed out successfully
   [IntroScreen] ✅ Logout completed successfully
   [AuthContext] ========== AUTH STATE CHANGED ==========
   [AuthContext] New user state: null
   [AuthContext] Current isSigningOut state: true
   [AuthContext] No user found - setting user to null
   [AuthContext] Currently signing out - will sign in anonymously after 2 second delay
   ```

5. **Expected UI Behavior**:
   - Menu should close immediately
   - Screen should show "Signed out successfully" message for 2 seconds
   - After 2 seconds, user should be signed in anonymously
   - UI should update to show anonymous user state

### Test 2: Verify Menu Doesn't Close Prematurely
1. Open the profile menu
2. Tap somewhere on the dropdown menu (not on the Sign Out button)
3. **Expected**: Menu should remain open until you tap outside or on a menu item

### Test 3: Verify Overlay Still Works
1. Open the profile menu
2. Tap outside the menu (on the transparent overlay area)
3. **Expected**: Menu should close immediately

## Key Indicators of Success

### ✅ Console Logs Appear
If you see the detailed console logs starting with `[IntroScreen] ========== LOGOUT BUTTON PRESSED ==========`, the fix is working.

### ❌ Previous Behavior (Fixed)
Before the fix, you would only see:
```
[IntroScreen] ========== PROFILE MENU TOGGLE ==========
[IntroScreen] Current isProfileMenuOpen: true
[IntroScreen] Setting isProfileMenuOpen to: false
```
No logout-related logs would appear because the overlay was intercepting the touch.

## Technical Details

### The Fix
Added `zIndex: 10` to both `profileMenu` and `authMenu` styles:

```typescript
profileMenu: {
  // ... other styles
  elevation: 6,
  zIndex: 10, // Ensure menu appears above the overlay
}
```

### Why This Works
- `menuOverlay`: `zIndex: 5`
- `profileMenu` and `authMenu`: `zIndex: 10` (now higher)
- This ensures dropdown menus appear above the overlay and can receive touch events

### Enhanced Debug Logging
The fix also includes comprehensive logging to help debug future issues:
- Profile menu toggle events
- Logout button press tracking
- AuthContext logout flow details
- Auth state change monitoring

## Automated Testing

While full UI testing is complex in React Native, the core logout functionality can be verified with unit tests that check:
- Logout function is called when expected
- UI state updates correctly during sign out
- Error handling works properly

See `components/IntroScreen.test.tsx` for automated test coverage.