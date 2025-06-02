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
  flatten: jest.fn(arr => arr.reduce((acc, val) => ({ ...acc, ...val }), {})),
  hairlineWidth: 1,
};

const View = 'View';
const Text = 'Text';
const TouchableOpacity = 'TouchableOpacity';
const ActivityIndicator = 'ActivityIndicator';
const Modal = 'Modal';
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
