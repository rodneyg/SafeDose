const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Exclude test files from the bundle
config.resolver.blockList = [
  /.*\.test\.(js|ts|tsx)$/,
  /.*\.spec\.(js|ts|tsx)$/,
];

module.exports = withNativeWind(config, { input: './global.css' });