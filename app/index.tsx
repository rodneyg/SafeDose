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
        console.log('[InitialScreen] ========== CHECKING APP STATE START ==========');
        console.log('[InitialScreen] Fetching onboardingComplete and userProfile from AsyncStorage...');
        
        const [onboardingComplete, userProfile] = await Promise.all([
          AsyncStorage.getItem('onboardingComplete'),
          AsyncStorage.getItem('userProfile')
        ]);

        console.log('[InitialScreen] Raw AsyncStorage values:', {
          onboardingComplete,
          userProfile
        });

        console.log('[InitialScreen] Parsed AsyncStorage analysis:', {
          onboardingComplete,
          onboardingCompleteCheck: onboardingComplete === 'true',
          onboardingCompleteType: typeof onboardingComplete,
          userProfile: userProfile ? 'exists' : 'null',
          userProfileLength: userProfile?.length,
          userProfileParsed: userProfile ? JSON.parse(userProfile) : null
        });

        if (onboardingComplete !== 'true') {
          // Onboarding not complete, start from beginning
          console.log('[InitialScreen] 🎯 ROUTING DECISION: Onboarding not complete');
          console.log('[InitialScreen] 🚀 ROUTING TO: /onboarding');
          router.replace('/onboarding');
        } else if (!userProfile) {
          // Onboarding complete but no user profile, go to user type setup
          console.log('[InitialScreen] 🎯 ROUTING DECISION: Onboarding complete but no user profile');
          console.log('[InitialScreen] 🚀 ROUTING TO: /onboarding/userType');
          router.replace('/onboarding/userType');
        } else {
          // Both onboarding and user profile complete, go to main app
          console.log('[InitialScreen] 🎯 ROUTING DECISION: Both onboarding and user profile complete');
          console.log('[InitialScreen] 🚀 ROUTING TO: /(tabs)/new-dose (intro screen)');
          router.replace('/(tabs)/new-dose');
        }
        
        console.log('[InitialScreen] ========== ROUTING DECISION COMPLETE ==========');
      } catch (e) {
        console.error('[InitialScreen] ❌ ERROR checking app state:', e);
        console.error('[InitialScreen] Error stack:', e instanceof Error ? e.stack : 'No stack');
        console.log('[InitialScreen] 🚀 FALLBACK ROUTING TO: /onboarding');
        router.replace('/onboarding'); // Default to onboarding on error
      } finally {
        console.log('[InitialScreen] Setting isChecking to false...');
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