import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { LogOut, User, LogIn } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useUsageTracking } from '../../lib/hooks/useUsageTracking';
import { logAnalyticsEvent, ANALYTICS_EVENTS } from '../../lib/analytics';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

export default function SettingsScreen() {
  const { user, logout, isSigningOut, auth } = useAuth();
  const { usageData } = useUsageTracking();
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      user?.isAnonymous 
        ? 'Are you sure you want to start a new guest session? Your current usage will be reset.'
        : 'Are you sure you want to sign out? You can sign back in anytime.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              // Removed redundant success alert - the UI will update automatically
            } catch (error) {
              console.error('Sign out error:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleSignIn = useCallback(() => {
    console.log('[SettingsScreen] ========== SIGN-IN INITIATED ==========');
    console.log('[SettingsScreen] Current user before sign-in:', user ? {
      uid: user.uid,
      isAnonymous: user.isAnonymous,
      displayName: user.displayName,
      email: user.email
    } : 'No user');
    
    setIsSigningIn(true);
    const provider = new GoogleAuthProvider();
    
    logAnalyticsEvent(ANALYTICS_EVENTS.SIGN_IN_ATTEMPT, { method: 'google' });
    
    signInWithPopup(auth, provider)
      .then((result) => {
        console.log('[SettingsScreen] ✅ Google Sign-In successful:', {
          uid: result.user.uid,
          displayName: result.user.displayName,
          email: result.user.email,
          isAnonymous: result.user.isAnonymous
        });
        console.log('[SettingsScreen] AuthContext should update automatically via onAuthStateChanged');
        
        if (user?.isAnonymous) {
          // The anonymous account will be automatically linked to the signed-in account
          logAnalyticsEvent(ANALYTICS_EVENTS.SIGN_UP_SUCCESS, { method: 'google' });
          console.log('[SettingsScreen] Linked anonymous account with Google');
        } else {
          logAnalyticsEvent(ANALYTICS_EVENTS.SIGN_IN_SUCCESS, { method: 'google' });
          console.log('[SettingsScreen] Signed in with Google');
        }
        // Removed redundant success alert - the UI will update automatically
      })
      .catch((error) => {
        console.error('[SettingsScreen] ❌ Google Sign-In error:', error.code, error.message);
        console.error('[SettingsScreen] Sign-in error details:', {
          code: error.code,
          message: error.message,
          name: error.name
        });
        logAnalyticsEvent(ANALYTICS_EVENTS.SIGN_IN_FAILURE, { 
          method: 'google', 
          error: error.message 
        });
        Alert.alert('Sign In Error', error.message || 'Failed to sign in with Google');
      })
      .finally(() => {
        setIsSigningIn(false);
      });
  }, [auth, user]);



  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Account Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <User size={20} color="#007AFF" />
            <Text style={styles.sectionTitle}>Account</Text>
          </View>
          
          <View style={styles.card}>
            <Text style={styles.label}>Account Type</Text>
            <Text style={styles.value}>
              {user ? (user.isAnonymous ? 'Guest' : 'Signed In') : 'Guest'}
            </Text>
            
            {user?.email && (
              <>
                <Text style={styles.label}>Email</Text>
                <Text style={styles.value}>{user.email}</Text>
              </>
            )}
            
            <Text style={styles.label}>Usage This Month</Text>
            <Text style={styles.value}>
              {usageData?.scansUsed || 0} / {usageData?.limit === Infinity ? '∞' : (usageData?.limit || 3)} scans
            </Text>
          </View>
        </View>



        {/* Sign In/Out */}
        <View style={styles.section}>
          {user && !user.isAnonymous ? (
            // Show sign out button for signed in users
            <TouchableOpacity 
              style={[styles.signOutButton, isSigningOut && styles.disabledButton]} 
              onPress={handleSignOut}
              disabled={isSigningOut}
            >
              <View style={styles.buttonContent}>
                {isSigningOut ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <LogOut size={20} color="#FFFFFF" />
                )}
                <Text style={styles.signOutButtonText}>
                  {isSigningOut ? 'Signing Out...' : 'Sign Out'}
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            // Show sign in button for guest users or not logged in
            <TouchableOpacity 
              style={[styles.signInButton, isSigningIn && styles.disabledButton]} 
              onPress={handleSignIn}
              disabled={isSigningIn}
            >
              <View style={styles.buttonContent}>
                {isSigningIn ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <LogIn size={20} color="#FFFFFF" />
                )}
                <Text style={styles.signInButtonText}>
                  {isSigningIn ? 'Signing In...' : 'Sign In with Google'}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginLeft: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
    marginTop: 12,
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: '#000000',
    marginBottom: 8,
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 8,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF4E6',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#FF9500',
    marginLeft: 8,
    flex: 1,
  },
  subscriptionButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'center',
  },
  subscriptionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  signOutButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  signInButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  signOutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
});
