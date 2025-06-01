// app/index.tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export default function InitialScreen() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    async function checkAppState() {
      try {
        const [onboardingComplete, userProfile] = await Promise.all([
          AsyncStorage.getItem('onboardingComplete'),
          AsyncStorage.getItem('userProfile')
        ]);

        if (onboardingComplete !== 'true') {
          // Onboarding not complete, start from beginning
          router.replace('/onboarding');
        } else if (!userProfile) {
          // Onboarding complete but no user profile, go to user type setup
          router.replace('/onboarding/userType');
        } else {
          // Both onboarding and user profile complete, go to main app
          router.replace('/(tabs)/new-dose');
        }
      } catch (e) {
        console.warn('Error checking app state:', e);
        router.replace('/onboarding'); // Default to onboarding on error
      } finally {
        setIsChecking(false);
      }
    }
    checkAppState();
  }, [router]);

  if (isChecking) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});