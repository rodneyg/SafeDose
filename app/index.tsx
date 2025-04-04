// app/index.tsx
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export default function InitialScreen() {
  const router = useRouter();

  useEffect(() => {
    async function checkOnboarding() {
      try {
        const value = await AsyncStorage.getItem('onboardingComplete');
        if (value === 'true') {
          router.replace('/new-dose');
        } else {
          router.replace('/onboarding');
        }
      } catch (e) {
        console.warn('Error checking onboarding status:', e);
        router.replace('/onboarding'); // Default to onboarding on error
      }
    }
    checkOnboarding();
  }, [router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});