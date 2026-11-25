import { Link } from 'expo-router';
import SignInError from '../../components/SignInError';
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, Linking } from 'react-native';
import { LogOut, CreditCard, User, AlertCircle, LogIn } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useUsageTracking } from '../../lib/hooks/useUsageTracking';
import { logAnalyticsEvent, ANALYTICS_EVENTS } from '../../lib/analytics';
import { signInWithGoogle } from '../../lib/googleAuth';
import { formatPlanDisplayName } from '../../lib/plans';

import { billingRequest, getSubscriptionStatus, SubscriptionStatus } from '../../lib/subscriptionStatus';
import { getApiBaseUrl } from '../../lib/apiBase';

export default function SettingsScreen() {
  const { user, logout, isSigningOut, auth } = useAuth();
  const { usageData } = useUsageTracking();
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(false);
  const [subscriptionAttempt, setSubscriptionAttempt] = useState(0);
  const [isManagingSubscription, setIsManagingSubscription] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    setSubscriptionStatus(null);
    setIsLoadingSubscription(false);
    if (!user || user.isAnonymous) return;

    const controller = new AbortController();
    setIsLoadingSubscription(true);
    getSubscriptionStatus(user, controller.signal).then(data => {
      if (!controller.signal.aborted) setSubscriptionStatus(data);
    }).catch(() => {
      if (!controller.signal.aborted) console.warn('Could not load subscription status.');
    }).finally(() => {
      if (!controller.signal.aborted) setIsLoadingSubscription(false);
    });
    return () => controller.abort();
  }, [user, subscriptionAttempt]);

  const handleManageSubscription = async () => {
    if (!user || user.isAnonymous || !subscriptionStatus?.customerId) {
      Alert.alert(
        'No Subscription Found',
        'You don\'t have an active subscription to manage. You can upgrade from the pricing page.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsManagingSubscription(true);
    logAnalyticsEvent(ANALYTICS_EVENTS.CANCEL_SUBSCRIPTION);

    try {
      const { url } = await billingRequest<{ url: string }>(user, 'create-portal-session', {
        returnUrl: `${getApiBaseUrl()}/settings`,
      });
      if (typeof window !== 'undefined') window.location.assign(url);
      else await Linking.openURL(url);

    } catch (error) {
      console.error('Error creating portal session:', error);
      Alert.alert('Error', 'Failed to open subscription management. Please try again.');
    } finally {
      setIsManagingSubscription(false);
    }
  };

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

  const [signInFailed, setSignInFailed] = useState(false);

  const handleSignIn = useCallback(async () => {
    if (isSigningIn) return;
    setSignInFailed(false);
    console.log('[SettingsScreen] ========== SIGN-IN INITIATED ==========');
    setIsSigningIn(true);
    logAnalyticsEvent(ANALYTICS_EVENTS.SIGN_IN_ATTEMPT, { method: 'google' });
    try {
      const result = await signInWithGoogle(auth);
      if (!result?.user) return;
      if (user?.isAnonymous) {
        logAnalyticsEvent(ANALYTICS_EVENTS.SIGN_UP_SUCCESS, { method: 'google' });
      } else {
        logAnalyticsEvent(ANALYTICS_EVENTS.SIGN_IN_SUCCESS, { method: 'google' });
      }
    } catch (error: any) {
      console.error('[SettingsScreen] ❌ Google Sign-In error:', error.code, error.message);
      logAnalyticsEvent(ANALYTICS_EVENTS.SIGN_IN_FAILURE, {
        method: 'google',
        error: error.message,
      });
      setSignInFailed(true);
    } finally {
      setIsSigningIn(false);
    }
  }, [auth, user, isSigningIn]);

  const getPlanDisplayName = (plan: string) => formatPlanDisplayName(plan);


  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Link href="/changelog" style={{ color: '#007AFF', marginBottom: 24 }}>Changelog</Link>
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
            
            <Text style={styles.label}>Current Plan</Text>
            <Text style={styles.value}>{getPlanDisplayName(usageData?.plan || 'free')}</Text>
            
            <Text style={styles.label}>Usage This Month</Text>
            <Text style={styles.value}>
              {usageData?.scansUsed || 0} / {(usageData?.limit ?? 0) < 0 || usageData?.limit === Infinity ? '∞' : (usageData?.limit || 3)} scans
            </Text>
            <Link href="/support" style={styles.billingHelpLink}>Get billing help</Link>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.card}>
            <Link href="/protocol-schedule" style={styles.protocolLink}>Protocol schedule</Link>
            <Link href="/protocol" style={styles.protocolLink}>Dose schedule preview</Link>
          </View>
        </View>

        {/* Subscription Management */}
        {user && !user.isAnonymous && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <CreditCard size={20} color="#007AFF" />
              <Text style={styles.sectionTitle}>Subscription</Text>
            </View>
            
            {isLoadingSubscription ? (
              <View style={styles.card}>
                <ActivityIndicator size="small" color="#007AFF" />
                <Text style={styles.loadingText}>Loading subscription...</Text>
              </View>
            ) : subscriptionStatus ? (
              <View style={styles.card}>
                <Text style={styles.label}>Status</Text>
                <Text style={[styles.value, { 
                  color: subscriptionStatus.hasActiveSubscription ? '#34C759' : '#FF3B30' 
                }]}>
                  {subscriptionStatus.hasActiveSubscription ? 'Active' : 'No Active Subscription'}
                </Text>
                
                {subscriptionStatus.subscription && (
                  <>
                    {subscriptionStatus.hasActiveSubscription && subscriptionStatus.subscription.currentPeriodEnd != null && (
                      <>
                        <Text style={styles.label}>Next Billing Date</Text>
                        <Text style={styles.value}>{formatDate(subscriptionStatus.subscription.currentPeriodEnd)}</Text>
                      </>
                    )}
                    
                    {subscriptionStatus.subscription.cancelAtPeriodEnd && (
                      <View style={styles.warningContainer}>
                        <AlertCircle size={16} color="#FF9500" />
                        <Text style={styles.warningText}>
                          Subscription will cancel at the end of the current period
                        </Text>
                      </View>
                    )}
                  </>
                )}
                
                <TouchableOpacity 
                  style={[styles.subscriptionButton, isManagingSubscription && styles.disabledButton]} 
                  accessibilityRole="button"
                  accessibilityLabel={subscriptionStatus.hasActiveSubscription ? 'Manage Subscription' : 'View Billing'}
                  aria-busy={isManagingSubscription}
                  onPress={handleManageSubscription}
                  disabled={isManagingSubscription}
                >
                  {isManagingSubscription ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.subscriptionButtonText}>
                      {subscriptionStatus.hasActiveSubscription ? 'Manage Subscription' : 'View Billing'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.card}>
                <Text style={styles.value}>No subscription information available</Text>
                <TouchableOpacity 
                  style={styles.subscriptionButton} 
                  accessibilityRole="button"
                  accessibilityLabel="Refresh subscription status"
                  onPress={() => setSubscriptionAttempt(attempt => attempt + 1)}
                >
                  <Text style={styles.subscriptionButtonText}>Refresh</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Sign In/Out */}
        <View style={styles.section}>
          {user && !user.isAnonymous ? (
            // Show sign out button for signed in users
            <TouchableOpacity 
              style={[styles.signOutButton, isSigningOut && styles.disabledButton]} 
              accessibilityRole="button"
              accessibilityLabel="Sign Out"
              aria-busy={isSigningOut}
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
              accessibilityRole="button"
              accessibilityLabel="Sign In with Google"
              aria-busy={isSigningIn}
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
          {(!user || user.isAnonymous) && signInFailed && <SignInError onRetry={handleSignIn} disabled={isSigningIn} />}
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
  protocolLink: { paddingVertical: 8, color: '#007AFF', fontSize: 17, fontWeight: '600' },
  billingHelpLink: {
    alignSelf: 'flex-start',
    paddingVertical: 12,
    color: '#005DBF',
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
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
