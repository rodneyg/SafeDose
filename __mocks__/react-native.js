// __mocks__/react-native.js

// Mock the Platform module
const Platform = {
  OS: 'jest', // Indicate that we are in a Jest environment
  select: jest.fn(specifics => specifics.jest || specifics.default || specifics.ios || specifics.android),
  Version: 'testVersion',
};

// Mock any other react-native exports that might be minimally needed by dependencies
const StyleSheet = {
  create: jest.fn(obj => obj),
  flatten: jest.fn(style => Array.isArray(style)
    ? Object.assign({}, ...style.map(item => StyleSheet.flatten(item))) : style),
  hairlineWidth: 1,
};

const View = 'View';
const Text = 'Text';
const TouchableOpacity = 'TouchableOpacity';
const ActivityIndicator = 'ActivityIndicator';
const Modal = ({ visible = true, children, ...props }) => visible
  ? require('react').createElement('Modal', props, children) : null;
const SafeAreaView = 'SafeAreaView';
const NativeModules = {};

module.exports = {
  Platform,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  NativeModules,
  ScrollView: 'ScrollView', TextInput: 'TextInput', Image: 'Image', Switch: 'Switch',
  Pressable: 'Pressable', FlatList: 'FlatList', KeyboardAvoidingView: 'KeyboardAvoidingView',
  TouchableWithoutFeedback: 'TouchableWithoutFeedback',
  Dimensions: { get: () => ({ width: 375, height: 812 }), addEventListener: () => ({ remove() {} }) },
  useWindowDimensions: () => ({ width: 375, height: 812, scale: 1, fontScale: 1 }),
  Appearance: { getColorScheme: () => 'light', addChangeListener: () => ({ remove() {} }) },
  useColorScheme: () => 'light',
  Alert: { alert: jest.fn() }, Linking: { openURL: jest.fn() },
  PixelRatio: { get: () => 1, getFontScale: () => 1, roundToNearestPixel: n => n },
  // Default export for general react-native import (if any code does `import ReactNative from 'react-native'`)
  default: {
    Platform,
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    Modal,
    SafeAreaView,
    NativeModules,
  }
};
