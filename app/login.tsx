import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import Head from 'expo-router/head';
import { useAuth } from '../contexts/AuthContext';
import { signInWithGoogle } from '../lib/googleAuth';
import { HOME_ROUTE, loadRemoteUserProfile, routeAfterGoogleSignIn } from '../lib/onboardingState';
import { logAnalyticsEvent, ANALYTICS_EVENTS } from '../lib/analytics';

export default function LoginScreen() {
  const { user, auth } = useAuth();
  const router = useRouter();
  const { from, offer, session_id } = useLocalSearchParams<{ from?: string; offer?: string; session_id?: string }>();
  const [error, setError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    if (from === 'pricing' && user && !user.isAnonymous) {
      router.replace({ pathname: '/pricing', params: offer ? { offer } : {} });
    } else if (from === 'success' && user && !user.isAnonymous) {
      router.replace({ pathname: '/success', params: typeof session_id === 'string' ? { session_id } : {} });
    }
  }, [from, offer, router, session_id, user]);

  const handleGoogleSignIn = async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    setError(null);
    logAnalyticsEvent(ANALYTICS_EVENTS.SIGN_IN_ATTEMPT, { method: 'google' });
    try {
      const result = await signInWithGoogle(auth);
      if (!result?.user) return;
      if (user?.isAnonymous) {
        logAnalyticsEvent(ANALYTICS_EVENTS.SIGN_UP_SUCCESS, { method: 'google' });
      } else {
        logAnalyticsEvent(ANALYTICS_EVENTS.SIGN_IN_SUCCESS, { method: 'google' });
      }
      if (from === 'pricing') return;
      if (from === 'success') {
        router.replace({ pathname: '/success', params: typeof session_id === 'string' ? { session_id } : {} });
        return;
      }
      const route = await routeAfterGoogleSignIn({
        user: result.user,
        loadRemoteProfile: loadRemoteUserProfile,
        fallbackRoute: from === 'welcome' ? '/onboarding/age' : HOME_ROUTE,
      });
      router.replace(route as any);
    } catch (error: any) {
      logAnalyticsEvent(ANALYTICS_EVENTS.SIGN_IN_FAILURE, {
        method: 'google',
        error: error.message,
      });
      setError('Could not sign in with Google. Please try again.');
      console.error('Google sign-in error:', error);
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <>
      <Head><title>Sign In | SafeDose</title></Head>
      <View style={styles.container}>
      <Text style={styles.title}>Sign In</Text>
      <Text style={styles.description}>Continue with Google to sign in or create your SafeDose account.</Text>
      {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Sign In with Google"
        aria-busy={isSigningIn}
        style={styles.button}
        onPress={handleGoogleSignIn}
        disabled={isSigningIn}
      >
        <Text style={styles.buttonText}>{isSigningIn ? 'Signing in…' : 'Sign In with Google'}</Text>
      </TouchableOpacity>
      <Link href="/reset-password" style={styles.helpLink}>Forgot your password?</Link>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Cancel"
        style={[styles.button, styles.cancelButton]}
        onPress={() => router.canGoBack() ? router.back() : router.replace('/')}
      >
        <Text style={styles.buttonText}>Cancel</Text>
      </TouchableOpacity>
      </View>
    </>
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
    marginBottom: 12,
  },
  description: { color: '#374151', textAlign: 'center', marginBottom: 16, maxWidth: 400 },
  helpLink: { color: '#1d4ed8', paddingVertical: 12, marginBottom: 10, textDecorationLine: 'underline' },
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
