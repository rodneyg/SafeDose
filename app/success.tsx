import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import { useAuth } from '../contexts/AuthContext';
import { billingRequest } from '../lib/subscriptionStatus';

type CheckoutStatus = 'pending' | 'active' | 'failed' | 'inactive';
const messages = {
  loading: ['Checking your subscription', 'We are checking your account for Photo Scan access.'],
  pending: ['Waiting for payment confirmation', 'Photo Scan will activate when Stripe confirms payment.'],
  active: ['Photo Scan is active', 'Your SafeDose account now has unlimited photo scans.'],
  failed: ['Payment was not completed', 'You can return to pricing to try again.'],
  inactive: ['Photo Scan is inactive', 'Check your subscription in Settings.'],
  unavailable: ['Photo Scan status unavailable', 'Use the SafeDose account you checked out with to check your subscription.'],
};

export default function SuccessScreen() {
  const { session_id } = useLocalSearchParams<{ session_id?: string }>();
  const { user } = useAuth();
  const [status, setStatus] = useState<keyof typeof messages>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!user || user.isAnonymous || typeof session_id !== 'string') {
      setStatus('unavailable');
      return;
    }

    const controller = new AbortController();
    setStatus('loading');
    billingRequest<{ status: CheckoutStatus }>(user, 'validate-session', { session_id }, controller.signal)
      .then(result => {
        if (!controller.signal.aborted) setStatus(result.status);
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus('unavailable');
      });
    return () => controller.abort();
  }, [user, session_id, attempt]);

  const [title, message] = messages[status];
  return (
    <>
      <Head><title>Subscription status | SafeDose</title></Head>
      <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text>
      {(status === 'pending' || status === 'unavailable') && user && !user.isAnonymous && session_id && (
        <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={() => setAttempt(count => count + 1)}>
          <Text style={styles.buttonText}>Check again</Text>
        </TouchableOpacity>
      )}
      {status === 'failed' && (
        <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={() => router.replace('/pricing')}>
          <Text style={styles.buttonText}>Return to pricing</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={() => router.replace('/(tabs)/new-dose')}>
        <Text style={styles.buttonText}>Continue to SafeDose</Text>
      </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F7',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 20,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    marginBottom: 24,
    color: '#333333',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#005BC4',
    paddingVertical: 14,
    paddingHorizontal: 30,
    marginBottom: 12,
    borderRadius: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
