// app/index.tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import AnimatedSplashScreen from '../components/AnimatedSplashScreen';
import { useAuth } from '../contexts/AuthContext';
import { loadRemoteUserProfile, resolveLaunchRoute } from '../lib/onboardingState';

export default function InitialScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [isChecking, setIsChecking] = useState(true);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    async function checkAppState() {
      try {
        const route = await resolveLaunchRoute({
          user,
          loadRemoteProfile: loadRemoteUserProfile,
        });
        console.log('[InitialScreen] Launch route', {
          route,
          uid: user?.uid,
          isAnonymous: user?.isAnonymous,
        });
        router.replace(route as any);
      } catch (e) {
        console.error('[InitialScreen] ERROR checking app state:', e);
        router.replace('/onboarding');
      } finally {
        setIsChecking(false);
      }
    }
    checkAppState();
  }, [router, user?.uid, user?.isAnonymous]);

  const handleSplashComplete = () => {
    if (!isChecking) {
      setShowSplash(false);
    }
  };

  if (isChecking || showSplash) {
    return <AnimatedSplashScreen onAnimationComplete={handleSplashComplete} />;
  }

  return null;
}
