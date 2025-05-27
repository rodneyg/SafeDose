import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { doc, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../lib/firebase'; // Adjust import path as needed

export default function SuccessScreen() {
  useEffect(() => {
    const updateUserPlan = async () => {
      const auth = getAuth();
      const user = auth.currentUser;
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, { plan: 'plus', limit: 150, scansUsed: 0 }, { merge: true });
        router.push('/(tabs)/new-dose');
      }
    };
    updateUserPlan();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upgrade Successful!</Text>
      <Text style={styles.message}>You're now a Premium user with 150 scans per month.</Text>
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
    marginBottom: 30 
  },
});