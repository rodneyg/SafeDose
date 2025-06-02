# Google Sign-In Setup Guide

This document outlines the configuration required for Google Sign-In to work properly in the SafeDose application.

## Overview

Google Sign-In was previously working but stopped functioning after commit `8e8b846` which removed the Google OAuth configuration. This guide explains how to restore and properly configure Google Sign-In.

## Root Cause of Regression

The regression occurred when:
1. **Commit 67834f6**: Added proper Google OAuth configuration with `expo-auth-session`
2. **Commit 8e8b846**: Reverted to `signInWithPopup` but removed Google OAuth configuration
3. **Result**: Firebase's `signInWithPopup` no longer had the required configuration to work

## Required Configuration

### 1. Environment Variables

Add these to your `.env` file:

```bash
# Google OAuth Configuration (for Google Sign-In)
GOOGLE_WEB_CLIENT_ID=your_google_web_client_id.apps.googleusercontent.com
GOOGLE_ANDROID_CLIENT_ID=your_google_android_client_id.apps.googleusercontent.com
GOOGLE_IOS_CLIENT_ID=your_google_ios_client_id.apps.googleusercontent.com
```

### 2. Google Cloud Console Setup

1. **Create/Configure OAuth 2.0 Client IDs:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Navigate to "APIs & Services" > "Credentials"
   - Create OAuth 2.0 Client IDs for:
     - **Web application** (for web/browser)
     - **Android** (for Android app)
     - **iOS** (for iOS app)

2. **Configure Authorized Domains:**
   For the **Web Client ID**, add these authorized domains:
   - `localhost` (for local development)
   - `safe-dose-d3kui9xhc-rodneygs-projects.vercel.app` (current Vercel deployment)
   - `app.safedoseai.com` (production domain)

3. **Configure Authorized Redirect URIs:**
   For the **Web Client ID**, add these redirect URIs:
   - `http://localhost:8081/__/auth/handler` (local development)
   - `https://safe-dose-d3kui9xhc-rodneygs-projects.vercel.app/__/auth/handler` (current deployment)
   - `https://app.safedoseai.com/__/auth/handler` (production)

### 3. Firebase Console Setup

1. **Enable Google Sign-In:**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Navigate to "Authentication" > "Sign-in method"
   - Enable "Google" provider
   - Use the Web Client ID from Google Cloud Console

2. **Configure Authorized Domains:**
   - In "Authentication" > "Settings" > "Authorized domains"
   - Add the same domains as in Google Cloud Console:
     - `localhost`
     - `safe-dose-d3kui9xhc-rodneygs-projects.vercel.app`
     - `app.safedoseai.com`

## Testing the Configuration

### 1. Local Testing
```bash
# Set environment variables
export GOOGLE_WEB_CLIENT_ID="your_web_client_id"

# Start development server
npm run dev
```

### 2. Check for Common Errors

When testing Google Sign-In, watch for these error codes in the console:

- **`auth/popup-blocked`**: Browser is blocking popups - user needs to allow popups
- **`auth/popup-closed-by-user`**: User closed popup before completing sign-in
- **`auth/operation-not-allowed`**: Google Sign-In not enabled in Firebase Console
- **`auth/unauthorized-domain`**: Domain not authorized in Firebase/Google Cloud Console
- **`auth/invalid-api-key`**: Firebase API key is incorrect
- **`auth/network-request-failed`**: Network connectivity issues

### 3. Validation Checklist

- [ ] Google Cloud Console OAuth client IDs created
- [ ] Authorized domains configured in Google Cloud Console
- [ ] Authorized redirect URIs configured in Google Cloud Console
- [ ] Google Sign-In enabled in Firebase Console
- [ ] Authorized domains configured in Firebase Console
- [ ] Environment variables set correctly
- [ ] Web client ID matches between Google Cloud and Firebase

## Implementation Notes

The current implementation uses:
- `signInWithPopup(auth, provider)` for web-based sign-in
- Enhanced error handling and logging for debugging
- Graceful fallback for authentication failures

## Prevention of Future Regressions

1. **Document OAuth setup** in repository README
2. **Include .env.example** with all required variables
3. **Test sign-in flow** before deploying configuration changes
4. **Monitor console errors** in production for authentication issues

## Support

If Google Sign-In continues to fail after following this setup:
1. Check browser console for specific error codes
2. Verify domain authorization in both Google Cloud and Firebase consoles
3. Ensure environment variables are properly loaded
4. Test with different browsers/incognito mode to rule out browser-specific issues