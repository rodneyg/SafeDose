import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { logAnalyticsEvent, ANALYTICS_EVENTS } from '../lib/analytics';

export default function LoginScreen() {
  const { user, auth } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = () => {
    const provider = new GoogleAuthProvider();
    
    logAnalyticsEvent(ANALYTICS_EVENTS.SIGN_IN_ATTEMPT, { method: 'google' });
    
    signInWithPopup(auth, provider)
      .then((result) => {
        console.log('Google Sign-In successful', result.user);
        if (user?.isAnonymous) {
          // The anonymous account will be automatically linked to the signed-in account
          logAnalyticsEvent(ANALYTICS_EVENTS.SIGN_UP_SUCCESS, { method: 'google' });
          console.log('Linked anonymous account with Google');
        } else {
          logAnalyticsEvent(ANALYTICS_EVENTS.SIGN_IN_SUCCESS, { method: 'google' });
          console.log('Signed in with Google');
        }
        router.replace('/(tabs)/new-dose');
      })
      .catch((error) => {
        logAnalyticsEvent(ANALYTICS_EVENTS.SIGN_IN_FAILURE, { 
          method: 'google', 
          error: error.message 
        });
        setError(error.message || 'Failed to sign in with Google');
        console.error('Google sign-in error:', error);
      });
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