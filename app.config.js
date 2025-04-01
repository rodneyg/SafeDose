require('dotenv').config(); // Load .env file

module.exports = {
  name: 'SafeDose',
  slug: 'SafeDose',
  platforms: ['ios', 'android', 'web'], // Include 'web'
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
    output: 'single',
    favicon: './assets/images/favicon.png',
  },
  plugins: ['expo-router', 'expo-dev-client'],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY, // Pull from .env
  },
};