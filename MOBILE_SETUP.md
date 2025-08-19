# Mobile Development Setup Guide

## Running the App on iOS and Android

The SafeDose app supports two mobile development workflows:

### Option 1: Using Expo Go (Recommended for Testing)

**Easiest setup for testing and development:**

1. Install Expo Go on your mobile device:
   - [iOS App Store](https://apps.apple.com/app/expo-go/id982107779)
   - [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. Start the development server:
   ```bash
   npm run start:expo-go
   ```

3. Scan the QR code with:
   - **iOS**: Camera app or Expo Go app
   - **Android**: Expo Go app

4. The app will load directly on your device

### Option 2: Development Builds (Advanced)

**For production builds or custom native modules:**

1. **Prerequisites:**
   - Android Studio (for Android)
   - Xcode (for iOS)
   - Physical device or emulator

2. **Android Setup:**
   ```bash
   # Start Android emulator or connect device
   npm run android
   ```

3. **iOS Setup:**
   ```bash
   # Start iOS simulator or connect device  
   npm run ios
   ```

## Troubleshooting

### "App not loading on iOS and Android natively in terminal"

This typically means:

1. **No device/emulator connected**: 
   - For development builds: Set up Android Studio or Xcode
   - For Expo Go: Use `npm run start:expo-go` instead

2. **expo-dev-client requires development build**:
   - Use Expo Go workflow with `npm run start:expo-go`
   - Or set up proper development environment

3. **Network issues**:
   - Ensure your mobile device and computer are on the same WiFi network
   - Try `expo start --tunnel` for remote testing

### Command Reference

```bash
# Web development
npm run web                 # Start web version

# Expo Go (recommended for most development)
npm run start:expo-go       # Start for Expo Go app
npm run android:expo-go     # Instructions for Android + Expo Go  
npm run ios:expo-go         # Instructions for iOS + Expo Go

# Development builds (advanced)
npm run start:dev-build     # Start with dev client
npm run android             # Build and run on Android
npm run ios                 # Build and run on iOS
```

## Dependencies Note

The app includes `expo-dev-client` for advanced features, but can run in Expo Go for most development tasks. If you only need basic functionality, you can remove `expo-dev-client` from package.json for a simpler setup.