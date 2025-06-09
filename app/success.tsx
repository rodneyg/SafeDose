import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { doc, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../lib/firebase';
import Constants from 'expo-constants';
import { logAnalyticsEvent, setAnalyticsUserProperties, trackRevenue, ANALYTICS_EVENTS, USER_PROPERTIES } from '../lib/analytics';

// Base URL for API
const API_BASE_URL = "https://app.safedoseai.com";

export default function SuccessScreen() {
  const { session_id } = useLocalSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState<boolean>(false);
  const [shouldRedirect, setShouldRedirect] = useState<boolean>(false);

  // Handle redirection separately from validation logic
  useEffect(() => {
    if (shouldRedirect) {
      // Use setTimeout to ensure navigation happens after component is fully mounted
      setTimeout(() => {
        router.replace('/(tabs)/new-dose');
      }, 100);
    }
  }, [shouldRedirect]);

  useEffect(() => {
    const validatePaymentAndUpdatePlan = async () => {
      // Set redirect flag if no session_id is provided
      if (!session_id) {
        console.log('[SuccessScreen] No session_id provided, setting redirect flag');
        setShouldRedirect(true);
        return;
      }

      try {
        // Call our API to validate the payment session
        const response = await fetch(`${API_BASE_URL}/api/validate-session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ session_id }),
        });

        const data = await response.json();
        console.log('[SuccessScreen] Session validation response:', data);
        
        // Check if the response indicates a valid payment
        if (!response.ok || !data.isValid) {
          console.log('[SuccessScreen] Invalid session or payment not completed, setting redirect flag');
          logAnalyticsEvent(ANALYTICS_EVENTS.UPGRADE_FAILURE, { 
            plan: 'plus', 
            error: 'Invalid session or payment not completed' 
          });
          setShouldRedirect(true);
          return;
        }
        
        // Payment is valid, mark as valid
        setIsValid(true);
        
        // Log successful upgrade
        logAnalyticsEvent(ANALYTICS_EVENTS.UPGRADE_SUCCESS, { plan: 'plus' });
        logAnalyticsEvent(ANALYTICS_EVENTS.SUBSCRIPTION_STARTED, { plan_type: 'plus' });
        
        // Track revenue - assuming Plus plan is $29.99/month
        trackRevenue(29.99, 'USD', 'plus');
        
        // Update user plan in Firestore since payment is confirmed
        const auth = getAuth();
        const user = auth.currentUser;
        if (user) {
          const userRef = doc(db, 'users', user.uid);
          await setDoc(userRef, { plan: 'plus', limit: 150, scansUsed: 0 }, { merge: true });
          
          // Set user properties for analytics
          setAnalyticsUserProperties({
            [USER_PROPERTIES.PLAN_TYPE]: 'plus',
            [USER_PROPERTIES.IS_ANONYMOUS]: user.isAnonymous,
            [USER_PROPERTIES.SUBSCRIPTION_STATUS]: 'active',
          });
          
          console.log('[SuccessScreen] User plan updated to premium');
        } else {
          throw new Error('No authenticated user found');
        }
      } catch (err) {
        console.error('[SuccessScreen] Error validating payment or updating user:', err);
        logAnalyticsEvent(ANALYTICS_EVENTS.UPGRADE_FAILURE, { 
          plan: 'plus', 
          error: err instanceof Error ? err.message : 'Unknown error' 
        });
        setError('Failed to process your upgrade. Please try again.');
        setShouldRedirect(true);
      }
    };
    
    validatePaymentAndUpdatePlan();
  }, [session_id]);

  const handleContinue = () => {
    router.push('/(tabs)/new-dose');
  };
  
  // Show nothing while validating or redirecting
  if (!isValid) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upgrade Successful!</Text>
      <Text style={styles.message}>You're now a Premium user with 150 scans per month.</Text>
      {error && <Text style={styles.error}>{error}</Text>}
      <TouchableOpacity style={styles.button} onPress={handleContinue}>
        <Text style={styles.buttonText}>Continue to SafeDose</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 20, 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#F2F2F7' 
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#34C759', 
    marginBottom: 20 
  },
  message: { 
    fontSize: 16, 
    textAlign: 'center', 
    marginBottom: 30,
    color: '#333333'
  },
  error: {
    fontSize: 14,
    color: '#f87171',
    marginBottom: 20,
    textAlign: 'center'
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 12
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  },
});