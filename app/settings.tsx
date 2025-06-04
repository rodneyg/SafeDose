import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { logAnalyticsEvent, ANALYTICS_EVENTS } from '../lib/analytics';

export default function SettingsScreen() {
  const handleCancelSubscription = () => {
    // TODO: Add real cancellation or downgrade logic
    logAnalyticsEvent(ANALYTICS_EVENTS.CANCEL_SUBSCRIPTION);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <TouchableOpacity style={styles.button} onPress={handleCancelSubscription}>
        <Text style={styles.buttonText}>Cancel Subscription</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#FF3B30',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});
