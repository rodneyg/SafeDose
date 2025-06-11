import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword } from 'firebase/auth';
import { logAnalyticsEvent, ANALYTICS_EVENTS } from '../../lib/analytics';
import { Mail } from 'lucide-react-native';

export default function SignUpScreen() {
  const { user, auth } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailSignUp = async () => {
    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      logAnalyticsEvent(ANALYTICS_EVENTS.SIGN_IN_ATTEMPT, { method: 'email' });

      if (user?.isAnonymous) {
        // For anonymous users, create new account and the system will handle linking
        await createUserWithEmailAndPassword(auth, email, password);
        logAnalyticsEvent(ANALYTICS_EVENTS.SIGN_UP_SUCCESS, { method: 'email' });
        console.log('Linked anonymous account with email/password');
      } else {
        // Create new account
        await createUserWithEmailAndPassword(auth, email, password);
        logAnalyticsEvent(ANALYTICS_EVENTS.SIGN_UP_SUCCESS, { method: 'email' });
        console.log('Created new email/password account');
      }

      router.replace('/(tabs)/new-dose');
    } catch (error: any) {
      logAnalyticsEvent(ANALYTICS_EVENTS.SIGN_IN_FAILURE, { 
        method: 'email', 
        error: error.message 
      });
      setError(error.message || 'Failed to create account');
      console.error('Email sign-up error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = () => {
    const provider = new GoogleAuthProvider();
    
    logAnalyticsEvent(ANALYTICS_EVENTS.SIGN_IN_ATTEMPT, { method: 'google' });
    
    signInWithPopup(auth, provider)
      .then((result) => {
        console.log('Google Sign-Up successful', result.user);
        if (user?.isAnonymous) {
          // The anonymous account will be automatically linked to the signed-in account
          logAnalyticsEvent(ANALYTICS_EVENTS.SIGN_UP_SUCCESS, { method: 'google' });
          console.log('Linked anonymous account with Google');
        } else {
          logAnalyticsEvent(ANALYTICS_EVENTS.SIGN_UP_SUCCESS, { method: 'google' });
          console.log('Signed up with Google');
        }
        router.replace('/(tabs)/new-dose');
      })
      .catch((error) => {
        logAnalyticsEvent(ANALYTICS_EVENTS.SIGN_IN_FAILURE, { 
          method: 'google', 
          error: error.message 
        });
        setError(error.message || 'Failed to sign up with Google');
        console.error('Google sign-up error:', error);
      });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign Up Free</Text>
      <Text style={styles.subtitle}>
        Save your dose calculations and get unlimited logging
      </Text>
      
      {error && <Text style={styles.error}>{error}</Text>}
      
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#8E8E93"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#8E8E93"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
        
        <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          placeholderTextColor="#8E8E93"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
        
        <TouchableOpacity 
          style={[styles.button, styles.emailButton, isLoading && styles.disabledButton]} 
          onPress={handleEmailSignUp}
          disabled={isLoading}
        >
          <Mail size={16} color="#FFFFFF" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>
            {isLoading ? 'Creating Account...' : 'Sign Up with Email'}
          </Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>
      
      <TouchableOpacity 
        style={[styles.button, styles.googleButton]} 
        onPress={handleGoogleSignUp}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>Continue with Google</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.button, styles.cancelButton]}
        onPress={() => router.back()}
        disabled={isLoading}
      >
        <Text style={[styles.buttonText, styles.cancelButtonText]}>Maybe Later</Text>
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
    fontSize: 28,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    width: '100%',
    maxWidth: 350,
    marginBottom: 20,
  },
  input: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 16,
    color: '#000000',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  button: {
    width: '100%',
    maxWidth: 350,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  emailButton: {
    backgroundColor: '#007AFF',
    marginTop: 8,
  },
  googleButton: {
    backgroundColor: '#4285F4',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#8E8E93',
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  cancelButtonText: {
    color: '#8E8E93',
  },
  buttonIcon: {
    marginRight: 8,
  },
  error: {
    color: '#FF3B30',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
    maxWidth: 350,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 350,
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E5EA',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#8E8E93',
    fontSize: 14,
  },
});