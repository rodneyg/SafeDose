# Fix for Issue #208: Scan Again Camera Preview

## Problem Summary
After a successful scan and entering details, clicking "Scan Again" on the final step does not show the live camera preview. The user has to cancel and click scan again on the home screen for the live preview to work again.

## Root Cause Analysis
The issue was caused by stale closures in a useEffect hook that manages camera permissions and stream re-establishment:

1. **Incomplete Dependencies**: The useEffect only had `[screenStep]` as dependencies
2. **Stale Closures**: Variables `permissionStatus` and `webCameraStreamRef.current` could become stale
3. **Declaration Order**: `requestWebCameraPermission` was used before it was declared

## Technical Fix
### Changes Made in `/app/(tabs)/new-dose.tsx`:

1. **Fixed useEffect dependencies**:
   ```typescript
   // BEFORE (incomplete dependencies)
   }, [screenStep]);
   
   // AFTER (complete dependencies)
   }, [screenStep, permissionStatus, isWeb, requestWebCameraPermission]);
   ```

2. **Moved function declaration**:
   ```typescript
   // Moved requestWebCameraPermission before the useEffect that uses it
   const requestWebCameraPermission = useCallback(async () => { ... }, [isWeb]);
   ```

3. **Enhanced logging**:
   ```typescript
   console.log("[WebCamera] Scan screen active, checking camera state", { 
     permissionStatus, 
     hasStream: !!webCameraStreamRef.current 
   });
   ```

4. **Clear scan errors when navigating to scan again**:
   ```typescript
   // Clear any scan errors before navigating
   setScanError(null);
   ```

### Changes Made in `/lib/hooks/useDoseCalculator.ts`:

1. **Enhanced logging in handleFeedbackComplete**:
   ```typescript
   console.log('[useDoseCalculator] Scan again requested');
   console.log('[useDoseCalculator] Navigating to scan screen');
   ```

## User Flow Fix
The fix ensures this flow works correctly:

1. User scans and completes dose calculation → Final Result screen
2. User clicks "Scan Again" → Post-Dose Feedback screen
3. User submits/skips feedback → **Scan screen with live camera preview** ✅

### Before Fix:
- Camera preview would not appear on step 3
- User would see permission request or blank screen
- Had to cancel and start over from home screen

### After Fix:
- Camera preview appears immediately on step 3
- No additional permission requests
- Seamless user experience

## Testing
Created comprehensive test coverage:

1. **`ScanAgainFlow.test.ts`** - General workflow testing
2. **`ScanAgainCameraFix.test.ts`** - Camera state management integration tests
3. **`Issue208Fix.test.ts`** - Specific bug reproduction and validation
4. **`test-scan-again-fix.js`** - Manual testing script

## Validation Steps
To verify the fix works:

1. Start app in web browser (`npm run web`)
2. Navigate to New Dose → Scan
3. Grant camera permission and verify preview works
4. Complete scan and manual entry to final result
5. Click "Scan Again"
6. **Verify**: Camera preview appears immediately ✅

## Edge Cases Handled
- Permission previously granted but stream is null
- Multiple "Scan Again" actions in sequence
- Camera permission denied scenarios
- Non-web environments (mobile app)

## Files Modified
- `app/(tabs)/new-dose.tsx` - Main fix implementation
- `lib/hooks/useDoseCalculator.ts` - Enhanced logging
- Added 4 new test files for comprehensive coverage

## Impact
- ✅ Fixes the reported issue
- ✅ Maintains backward compatibility
- ✅ Improves user experience
- ✅ Adds debugging capabilities
- ✅ No breaking changes