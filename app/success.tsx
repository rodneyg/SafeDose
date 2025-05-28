import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { doc, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../lib/firebase';

export default function SuccessScreen() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const updateUserPlan = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (user) {
          const userRef = doc(db, 'users', user.uid);
          await setDoc(userRef, { plan: 'plus', limit: 150, scansUsed: 0 }, { merge: true });
          console.log('[SuccessScreen] User plan updated to premium');
        } else {
          throw new Error('No authenticated user found');
        }
      } catch (err) {
        console.error('[SuccessScreen] Error updating user plan:', err);
        setError('Failed to update your plan. Please try again.');
      }
    };
    updateUserPlan();
  }, []);

  const handleContinue = () => {
    router.push('/(tabs)/new-dose');
  };

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