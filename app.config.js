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
    staticRendering: true,
    typedRoutes: true,
    sitemap: true
  },
  extra: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY,
  },
};