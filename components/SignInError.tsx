import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

export default function SignInError({ onRetry, disabled = false }: { onRetry: () => void; disabled?: boolean }) {
  return (
    <View>
      <Text accessibilityRole="alert">Could not sign in with Google. Please try again.</Text>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Retry Google sign in" onPress={onRetry} disabled={disabled}>
        <Text>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}
