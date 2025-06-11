// app/_layout.tsx
import { Slot, SplashScreen } from 'expo-router';
import { useEffect } from 'react';
import { AuthProvider } from '../contexts/AuthContext';
import { UserProfileProvider } from '../contexts/UserProfileContext';
import { activateAnalytics } from '../lib/analytics';
import "../global.css";

export default function RootLayout() {
  console.log('[RootLayout] ========== ROOT LAYOUT RENDER ==========');
  
  useEffect(() => {
    console.log('[RootLayout] Root layout effect running - hiding splash screen');
    SplashScreen.hideAsync();
    
    // Kick off the safe, asynchronous activation of the real analytics.
    activateAnalytics();
  }, []); // Run only once
  
  console.log('[RootLayout] Rendering providers and slot');
  return (
    <AuthProvider>
      <UserProfileProvider>
        <Slot />
      </UserProfileProvider>
    </AuthProvider>
  );
}