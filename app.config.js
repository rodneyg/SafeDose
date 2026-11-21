require('dotenv').config();

module.exports = {
  name: 'SafeDose',
  slug: 'SafeDose',
  platforms: ['ios', 'android', 'web'],
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'myapp',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/images/icon.png',
    resizeMode: 'contain',
    backgroundColor: '#000000',
  },
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.safedoseapp.boltexponativewind',
    infoPlist: {
      NSCameraUsageDescription:
        'SafeDose uses the camera to read details from your syringe or medication vial for you to review.',
    },
  },
  android: {
    package: 'com.safedoseapp.boltexponativewind',
    permissions: ['android.permission.CAMERA'],
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/favicon.png',
    publicPath: "/_expo"
  },
  plugins: ['expo-router'],
  experiments: {
    typedRoutes: true
  },
  extra: {
    scanQualityPrecheck: process.env.EXPO_PUBLIC_SCAN_QUALITY_PRECHECK === 'true',
    NEXTPUBLIC_ENVIRONMENT: process.env.NEXTPUBLIC_ENVIRONMENT || 'production',
    // Never put OPENAI_API_KEY (or other secrets) in extra — Expo bakes extra into the client bundle.
    // Scan analysis reads process.env.OPENAI_API_KEY only in /api/analyze-scan on the server.
    // Legacy Stripe keys for backward compatibility
    STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY,
    // New Stripe configuration with feature flag support
    STRIPE_MODE: process.env.STRIPE_MODE || 'test',
    STRIPE_TEST_PUBLISHABLE_KEY: process.env.STRIPE_TEST_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY,
    // Never put Stripe secret keys in extra — Expo bakes extra into the client bundle.
    // Server routes read STRIPE_*_SECRET_KEY from process.env via lib/stripeConfig.server.js.
    STRIPE_LIVE_PUBLISHABLE_KEY: process.env.STRIPE_LIVE_PUBLISHABLE_KEY,
    STRIPE_TEST_PRICE_ID: process.env.STRIPE_TEST_PRICE_ID || 'price_1REyzMPE5x6FmwJPyJVJIEXe',
    STRIPE_LIVE_PRICE_ID: process.env.STRIPE_LIVE_PRICE_ID,
    // Public price IDs only (not secret keys). Optional; checkout can also resolve by lookup key.
    STRIPE_PHOTO_CHECK_MONTHLY_PRICE_ID: process.env.STRIPE_PHOTO_CHECK_MONTHLY_PRICE_ID,
    STRIPE_PHOTO_CHECK_ANNUAL_PRICE_ID: process.env.STRIPE_PHOTO_CHECK_ANNUAL_PRICE_ID,
    TEST_LOGIN: process.env.REACT_APP_TEST_LOGIN === 'true', // Environment flag for auto-login testing
    firebase: {
      apiKey: process.env.FIREBASE_API_KEY || "AIzaSyCOcwQe3AOdanV43iSwYlNxhzSKSRIOq34",
      authDomain: process.env.FIREBASE_AUTH_DOMAIN || "safedose-e320d.firebaseapp.com",
      projectId: process.env.FIREBASE_PROJECT_ID || "safedose-e320d",
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "safedose-e320d.firebasestorage.app",
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "704055775889",
      appId: process.env.FIREBASE_APP_ID || "1:704055775889:web:6ff0d3de5fea40b5b56530",
      measurementId: process.env.FIREBASE_MEASUREMENT_ID || "G-WRY88Q57KK"
    },
    auth: {
      // Google Sign-In redirect URIs
      redirectUris: {
        local: "http://localhost:8081/__/auth/handler",
        production: "https://safedose.rodneygainous.com/__/auth/handler",
        fallback: "https://safe-dose.vercel.app/__/auth/handler"
      }
    },
    googleAuth: {
      webClientId: process.env.GOOGLE_WEB_CLIENT_ID,
      androidClientId: process.env.GOOGLE_ANDROID_CLIENT_ID,
      iosClientId: process.env.GOOGLE_IOS_CLIENT_ID,
    }
  },
};