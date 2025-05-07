import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithCredential, linkWithCredential, EmailAuthProvider } from 'firebase/auth';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { user, auth } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Google Sign-In configuration
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: '704055775889-g0jt9ju51q3t5gl6lf9r3d53au2g49f0.apps.googleusercontent.com',
  });

  // Handle Google Sign-In response
  React.useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      handleAuthWithCredential(credential);
    }
  }, [response]);

  const handleAuthWithCredential = async (credential: any) => {
    try {
      if (user?.isAnonymous) {
        // Link anonymous account to Google
        await linkWithCredential(user, credential);
        console.log('Linked anonymous account with Google');
      } else {
        // Sign in with Google
        await signInWithCredential(auth, credential);
        console.log('Signed in with Google');
      }
      router.replace('/(tabs)/new-dose');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google');
      console.error('Google sign-in error:', err);
    }
  };

  const handleEmailSignIn = async () => {
    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }

    try {
      if (user?.isAnonymous) {
        // Link anonymous account to email
        const credential = EmailAuthProvider.credential(email, password);
        await linkWithCredential(user, credential);
        console.log('Linked anonymous account with email');
      } else {
        // Sign in with email
        await signInWithEmailAndPassword(auth, email, password);
        console.log('Signed in with email');
      }
      router.replace('/(tabs)/new-dose');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with email');
      console.error('Email sign-in error:', err);
    }
  };

  const handleGoogleSignIn = () => {
    if (request) {
      promptAsync();
    } else {
      setError('Google sign-in not ready');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign In</Text>
      {error && <Text style={styles.error}>{error}</Text>}
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
      />
      <TouchableOpacity style={styles.button} onPress={handleEmailSignIn}>
        <Text style={styles.buttonText}>Sign In with Email</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={handleGoogleSignIn} disabled={!request}>
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
  input: {
    width: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
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