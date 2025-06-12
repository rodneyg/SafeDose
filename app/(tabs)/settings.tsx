import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { LogOut, CreditCard, User, AlertCircle, LogIn } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useUsageTracking } from '../../lib/hooks/useUsageTracking';
import { logAnalyticsEvent, ANALYTICS_EVENTS } from '../../lib/analytics';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  subscriptionStatus: string;
  plan: string;
  customerId: string | null;
  subscription?: {
    id: string;
    status: string;
    currentPeriodEnd: number;
    cancelAtPeriodEnd: boolean;
    priceId: string;
  } | null;
}

export default function SettingsScreen() {
  const { user, logout, isSigningOut, auth } = useAuth();
  const { usageData } = useUsageTracking();
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(false);
  const [isManagingSubscription, setIsManagingSubscription] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    if (user && !user.isAnonymous) {
      fetchSubscriptionStatus();
    }
  }, [user]);

  const fetchSubscriptionStatus = async () => {
    if (!user || user.isAnonymous) return;
    
    setIsLoadingSubscription(true);
    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/get-subscription-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
      });

      if (response.ok) {
        const data = await response.json();
        setSubscriptionStatus(data);
        console.log('Subscription status loaded:', data);
      } else {
        console.error('Failed to fetch subscription status:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching subscription status:', error);
    } finally {
      setIsLoadingSubscription(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!subscriptionStatus?.customerId) {
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
      const response = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: subscriptionStatus.customerId,
          returnUrl: typeof window !== 'undefined' ? window.location.href : 'https://safedose.app/settings',
        }),
      });

      if (response.ok) {
        const { url } = await response.json();
        
        // Handle opening portal based on platform
        if (typeof window !== 'undefined') {
          window.open(url, '_blank');
        } else {
          // For React Native, you could use Linking.openURL(url)
          console.log('Portal URL:', url);
          Alert.alert('Subscription Management', 'Portal URL generated. Check console for details.');
        }
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.error || 'Failed to open subscription management');
      }
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
              Alert.alert('Signed Out', 'You have been successfully signed out.');
            } catch (error) {
              console.error('Sign out error:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleSignIn = () => {
    setIsSigningIn(true);
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
        Alert.alert('Signed In', 'You have been successfully signed in with Google.');
      })
      .catch((error) => {
        logAnalyticsEvent(ANALYTICS_EVENTS.SIGN_IN_FAILURE, { 
          method: 'google', 
          error: error.message 
        });
        console.error('Google sign-in error:', error);
        Alert.alert('Sign In Error', error.message || 'Failed to sign in with Google');
      })
      .finally(() => {
        setIsSigningIn(false);
      });
  };

  const getPlanDisplayName = (plan: string) => {
    switch (plan) {
      case 'starter': return 'Starter';
      case 'basic-pro': return 'Basic Pro';
      case 'full-pro': return 'Full Pro';
      case 'free': return 'Free';
      default: return plan;
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

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
              {user?.isAnonymous ? 'Guest' : 'Signed In'}
            </Text>
            
            {user?.email && (
              <>
                <Text style={styles.label}>Email</Text>
                <Text style={styles.value}>{user.email}</Text>
              </>
            )}
            
            <Text style={styles.label}>Current Plan</Text>
            <Text style={styles.value}>{getPlanDisplayName(usageData.plan)}</Text>
            
            <Text style={styles.label}>Usage This Month</Text>
            <Text style={styles.value}>
              {usageData.scansUsed} / {usageData.limit === Infinity ? '∞' : usageData.limit} scans
            </Text>
          </View>
        </View>

        {/* Subscription Management */}
        {!user?.isAnonymous && (
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
                    <Text style={styles.label}>Next Billing Date</Text>
                    <Text style={styles.value}>
                      {formatDate(subscriptionStatus.subscription.currentPeriodEnd)}
                    </Text>
                    
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
                  onPress={fetchSubscriptionStatus}
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
