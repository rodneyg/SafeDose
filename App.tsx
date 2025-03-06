import React from 'react';
import { Text, View } from 'react-native';
import ScanningScreen from './screens/ScanningScreen'; // Adjust path if needed

export default function App() {
  return (
    <View style={{ flex: 1 }}>
      <ScanningScreen />
    </View>
  );
}