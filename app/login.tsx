import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { signInWithGoogle } from '../lib/googleAuth';
import { HOME_ROUTE, loadRemoteUserProfile, routeAfterGoogleSignIn } from '../lib/onboardingState';
import { logAnalyticsEvent, ANALYTICS_EVENTS } from '../lib/analytics';

export default function LoginScreen() {
  const { user, auth } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    logAnalyticsEvent(ANALYTICS_EVENTS.SIGN_IN_ATTEMPT, { method: 'google' });
    try {
      const result = await signInWithGoogle(auth);
      if (!result?.user) return;
      if (user?.isAnonymous) {
        logAnalyticsEvent(ANALYTICS_EVENTS.SIGN_UP_SUCCESS, { method: 'google' });
      } else {
        logAnalyticsEvent(ANALYTICS_EVENTS.SIGN_IN_SUCCESS, { method: 'google' });
      }
      const route = await routeAfterGoogleSignIn({
        user: result.user,
        loadRemoteProfile: loadRemoteUserProfile,
        fallbackRoute: HOME_ROUTE,
      });
      router.replace(route as any);
    } catch (error: any) {
      logAnalyticsEvent(ANALYTICS_EVENTS.SIGN_IN_FAILURE, {
        method: 'google',
        error: error.message,
      });
      setError(error.message || 'Failed to sign in with Google');
      console.error('Google sign-in error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign In</Text>
      {error && <Text style={styles.error}>{error}</Text>}
      <TouchableOpacity style={styles.button} onPress={handleGoogleSignIn}>
        <Text style={styles.buttonText}>Sign In with Google</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, styles.cancelButton]}
        onPress={() => router.back()}
      >
        <Text style={styles.buttonText}>Cancel</Text>
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
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 20,
  },
  button: {
    width: '80%',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  cancelButton: {
    backgroundColor: '#8E8E93',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  error: {
    color: '#FF3B30',
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'center',
  },
});