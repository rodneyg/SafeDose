// app/index.tsx
import { startTransition, useEffect, useState } from 'react';
import { Redirect, type Href } from 'expo-router';
import SeoHead from '../components/SeoHead';
import AnimatedSplashScreen from '../components/AnimatedSplashScreen';
import { useAuth } from '../contexts/AuthContext';
import { loadRemoteUserProfile, ONBOARDING_ROUTE, resolveLaunchRoute } from '../lib/onboardingState';

export default function InitialScreen() {
  const { user } = useAuth();
  const [launchRoute, setLaunchRoute] = useState<Href | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function checkAppState() {
      let route: Href = ONBOARDING_ROUTE;
      try {
        route = await resolveLaunchRoute({
          user,
          loadRemoteProfile: loadRemoteUserProfile,
        }) as Href;
      } catch (e) {
        console.error('[InitialScreen] ERROR checking app state:', e);
      }
      if (!cancelled) {
        // Commit the launch route after the web Suspense boundary can hydrate.
        startTransition(() => setLaunchRoute(route));
      }
    }
    checkAppState();
    return () => { cancelled = true; };
  }, [user]);

  return (
    <>
      <SeoHead path="/" title="SafeDose | Syringe unit and reconstitution calculator" description="SafeDose helps you work out syringe units and reconstitution doses. Education only, not medical advice." />
      {launchRoute ? <Redirect href={launchRoute} /> : <AnimatedSplashScreen />}
    </>
  );
}
