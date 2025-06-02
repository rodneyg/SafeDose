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
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.safedoseapp.boltexponativewind',
    infoPlist: {
      NSCameraUsageDescription:
        'This app uses the camera to scan your syringe and medication vial for preparation guidance.',
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
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    // Legacy Stripe keys for backward compatibility
    STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY,
    // New Stripe configuration with feature flag support
    STRIPE_MODE: process.env.STRIPE_MODE || 'test',
    STRIPE_TEST_PUBLISHABLE_KEY: process.env.STRIPE_TEST_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY,
    STRIPE_TEST_SECRET_KEY: process.env.STRIPE_TEST_SECRET_KEY || process.env.STRIPE_SECRET_KEY,
    STRIPE_LIVE_PUBLISHABLE_KEY: process.env.STRIPE_LIVE_PUBLISHABLE_KEY,
    STRIPE_LIVE_SECRET_KEY: process.env.STRIPE_LIVE_SECRET_KEY,
    STRIPE_TEST_PRICE_ID: process.env.STRIPE_TEST_PRICE_ID || 'price_1REyzMPE5x6FmwJPyJVJIEXe',
    STRIPE_LIVE_PRICE_ID: process.env.STRIPE_LIVE_PRICE_ID,
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
        production: "https://app.safedoseai.com/__/auth/handler"
      }
    },
    googleAuth: {
      webClientId: process.env.GOOGLE_WEB_CLIENT_ID,
      androidClientId: process.env.GOOGLE_ANDROID_CLIENT_ID,
      iosClientId: process.env.GOOGLE_IOS_CLIENT_ID,
    }
  },
};