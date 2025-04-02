// app/index.tsx (Workaround Idea)
import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
// import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AppEntry() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      // Replace with your actual logic
      // const onboardingComplete = await AsyncStorage.getItem('onboardingComplete');
      const onboardingComplete = false; // Assume not complete for testing

      if (onboardingComplete) {
        router.replace('/(tabs)'); // Go to tabs if complete
      } else {
        router.replace('/onboarding'); // Go to onboarding if not complete
      }
      // setIsLoading(false); // Not strictly needed if replacing
    };

    checkOnboardingStatus();
  }, [router]);

  // Optionally show a loading indicator
  if (isLoading) {
    return <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}><ActivityIndicator /></View>;
  }

  return null; // Or loading indicator
}