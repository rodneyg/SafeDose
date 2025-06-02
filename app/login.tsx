import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { signInWithEmailAndPassword, GoogleAuthProvider, linkWithCredential, EmailAuthProvider, signInWithPopup } from 'firebase/auth';
import { logAnalyticsEvent, ANALYTICS_EVENTS } from '../lib/analytics';
import { LogIn, Mail, Lock, ArrowLeft, Eye, EyeOff } from 'lucide-react-native';

export default function LoginScreen() {
  const { user, auth } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailSignIn = async () => {
    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }

    setIsLoading(true);
    setError(null);
    logAnalyticsEvent(ANALYTICS_EVENTS.SIGN_IN_ATTEMPT, { method: 'email' });

    try {
      if (user?.isAnonymous) {
        // Link anonymous account to email
        const credential = EmailAuthProvider.credential(email, password);
        await linkWithCredential(user, credential);
        logAnalyticsEvent(ANALYTICS_EVENTS.SIGN_UP_SUCCESS, { method: 'email' });
        console.log('Linked anonymous account with email');
      } else {
        // Sign in with email
        await signInWithEmailAndPassword(auth, email, password);
        logAnalyticsEvent(ANALYTICS_EVENTS.SIGN_IN_SUCCESS, { method: 'email' });
        console.log('Signed in with email');
      }
      router.replace('/(tabs)/new-dose');
    } catch (err: any) {
      logAnalyticsEvent(ANALYTICS_EVENTS.SIGN_IN_FAILURE, { 
        method: 'email', 
        error: err.message 
      });
      let errorMessage = 'Failed to sign in with email';
      
      // Provide more user-friendly error messages
      if (err.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address';
      } else if (err.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      console.error('Email sign-in error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    setIsLoading(true);
    setError(null);
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
        
        let errorMessage = 'Failed to sign in with Google';
        if (error.code === 'auth/popup-blocked') {
          errorMessage = 'Popup was blocked. Please allow popups and try again';
        } else if (error.code === 'auth/popup-closed-by-user') {
          errorMessage = 'Sign in was cancelled';
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        setError(errorMessage);
        console.error('Google sign-in error:', error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.container}>
        {/* Header with back button */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.back()}>
            <ArrowLeft color="#64748b" size={24} />
          </TouchableOpacity>
          <Text style={styles.title}>Sign In</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Sign in form */}
        <View style={styles.formContainer}>
          {/* Email input */}
          <View style={styles.inputContainer}>
            <View style={styles.inputIconContainer}>
              <Mail color="#64748b" size={20} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Email address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              editable={!isLoading}
            />
          </View>

          {/* Password input */}
          <View style={styles.inputContainer}>
            <View style={styles.inputIconContainer}>
              <Lock color="#64748b" size={20} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="password"
              editable={!isLoading}
            />
            <TouchableOpacity 
              style={styles.passwordToggle}
              onPress={() => setShowPassword(!showPassword)}>
              {showPassword ? (
                <EyeOff color="#64748b" size={20} />
              ) : (
                <Eye color="#64748b" size={20} />
              )}
            </TouchableOpacity>
          </View>

          {/* Error message */}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Sign in buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.primaryButton, isLoading && styles.buttonDisabled]} 
              onPress={handleEmailSignIn}
              disabled={isLoading}>
              <Mail color="#ffffff" size={20} />
              <Text style={styles.primaryButtonText}>
                {isLoading ? 'Signing In...' : 'Sign In with Email'}
              </Text>
            </TouchableOpacity>

            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity 
              style={[styles.secondaryButton, isLoading && styles.buttonDisabled]} 
              onPress={handleGoogleSignIn}
              disabled={isLoading}>
              <LogIn color="#10b981" size={20} />
              <Text style={styles.secondaryButtonText}>Continue with Google</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40, // Same width as back button to center title
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputIconContainer: {
    padding: 16,
    borderRightWidth: 1,
    borderRightColor: '#F3F4F6',
  },
  input: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#1F2937',
  },
  passwordToggle: {
    padding: 16,
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '500',
  },
  buttonContainer: {
    gap: 16,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    gap: 8,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10B981',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    gap: 8,
  },
  secondaryButtonText: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
});