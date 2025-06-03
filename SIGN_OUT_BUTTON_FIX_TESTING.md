# Manual Testing Guide for Sign Out Button Fix

## Overview
This document describes how to test the sign out button fix that resolves the z-index issue preventing logout functionality.

## Problem Identified
The sign out button was not working because the `menuOverlay` component had a higher z-index (5) than the dropdown menus (elevation 4), causing the overlay to intercept all touch events.

## Test Steps

### Test 1: Verify Enhanced Sign Out Button Works
1. Open the app and sign in with a Google account (not anonymous)
2. Tap the "Sign Out" button 
3. **Expected Console Logs** (in this order):
   ```
   [IntroScreen] ========== LOGOUT BUTTON PRESSED ==========
   [IntroScreen] Current user state: {uid: "...", isAnonymous: false, ...}
   [IntroScreen] Alert availability check: function
   [IntroScreen] Platform info: {isMobileWeb: true/false}
   [IntroScreen] Showing confirmation dialog...
   [IntroScreen] Alert.alert() called successfully
   ```
4. **Confirm the logout** in the dialog that appears
5. **Expected Console Logs** (continuing from above):
   ```
   [IntroScreen] ========== USER CONFIRMED LOGOUT ==========
   [IntroScreen] User confirmed logout, initiating...
   [IntroScreen] Calling logout function...
   [AuthContext] ========== LOGOUT INITIATED ==========
   [AuthContext] Current user before logout: {uid: "...", ...}
   [AuthContext] Setting isSigningOut to true...
   [AuthContext] Calling Firebase signOut...
   [AuthContext] Firebase signOut completed successfully
   [AuthContext] ✅ Signed out successfully - logout function complete
   [IntroScreen] ✅ Logout completed successfully
   [AuthContext] ========== AUTH STATE CHANGED ==========
   [AuthContext] New user state: null
   [AuthContext] Currently signing out - will sign in anonymously after 2 second delay
   [AuthContext] ========== AUTH STATE CHANGE COMPLETE ==========
   ```

6. **Expected UI Behavior**:
   - Confirmation dialog appears and responds to user input
   - Screen shows "Signed out successfully" message for 2 seconds
   - After 2 seconds, user is signed in anonymously
   - UI updates to show anonymous user state

### Test 2: Verify Alert Fallback for Web Platform
1. If testing on web platform where Alert.alert might not work
2. Tap the "Sign Out" button
3. **Expected Console Logs** (if Alert fails):
   ```
   [IntroScreen] ========== LOGOUT BUTTON PRESSED ==========
   [IntroScreen] Alert availability check: undefined
   [IntroScreen] ❌ Error showing alert dialog: Error: Alert.alert is not available
   [IntroScreen] Alert failed, attempting direct logout confirmation...
   [IntroScreen] Fallback confirmation result: true/false
   ```
4. Browser's native `confirm()` dialog should appear
5. If confirmed, logout should proceed normally

### Test 3: Verify Cancellation Works
1. Tap the "Sign Out" button
2. **Cancel** the logout in the confirmation dialog
3. **Expected Console Logs**:
   ```
   [IntroScreen] ========== LOGOUT BUTTON PRESSED ==========
   [IntroScreen] Alert.alert() called successfully
   [IntroScreen] User cancelled logout
   ```
4. **Expected**: User remains signed in, no logout occurs

### Test 4: Verify Error Handling
1. Test with network disconnected or Firebase issues
2. Tap "Sign Out" and confirm
3. **Expected Console Logs** (if error occurs):
   ```
   [IntroScreen] ========== USER CONFIRMED LOGOUT ==========
   [AuthContext] ========== LOGOUT INITIATED ==========
   [AuthContext] ❌ Error signing out: [Error details]
   [AuthContext] Error details: {message: "...", code: "...", name: "..."}
   [IntroScreen] ❌ Logout error: [Error details]
   ```
4. Error dialog should appear with retry option

### Test 2: Verify Menu Doesn't Close Prematurely
1. Open the profile menu
2. Tap somewhere on the dropdown menu (not on the Sign Out button)
3. **Expected**: Menu should remain open until you tap outside or on a menu item

### Test 3: Verify Overlay Still Works
1. Open the profile menu
2. Tap outside the menu (on the transparent overlay area)
3. **Expected**: Menu should close immediately

## Key Indicators of Success

### ✅ Enhanced Console Logs Appear
If you see the comprehensive console logs starting with detailed user state and Alert availability checks, the enhanced debugging is working.

### ✅ Confirmation Dialog Functions
The Alert.alert confirmation dialog should appear and respond properly. If not available, the web fallback should activate.

### ✅ Complete Logout Flow Logging
You should see every step of the logout process logged with detailed information about user state, Firebase calls, and auth state changes.

### ❌ Previous Behavior (Now Enhanced)
Before this fix, you would only see basic logout logs. Now you get:
```
[IntroScreen] ========== LOGOUT BUTTON PRESSED ==========
[IntroScreen] Current user state: {detailed user info}
[IntroScreen] Alert availability check: function
[IntroScreen] Platform info: {platform details}
[IntroScreen] Alert.alert() called successfully
```

### 🆘 Troubleshooting
If logout still doesn't work, the enhanced logs will show exactly where it fails:
- **No button press logs**: Button not responding - check UI rendering
- **Alert availability = undefined**: Alert.alert not available - fallback should activate
- **No user confirmation**: User cancelled or dialog not showing
- **Firebase errors**: Detailed error with code and message will be logged

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