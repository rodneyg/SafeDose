const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Add resolver to handle potential CSS parsing issues
config.resolver = config.resolver || {};
config.resolver.sourceExts = [...(config.resolver.sourceExts || []), 'css'];

// Add transformer to handle potential aspect-ratio issues
config.transformer = config.transformer || {};
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

module.exports = withNativeWind(config, { input: './global.css' });