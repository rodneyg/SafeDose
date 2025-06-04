// app/_layout.tsx
import { Slot, SplashScreen } from 'expo-router';
import { useEffect } from 'react';
import { AuthProvider } from '../contexts/AuthContext';
import { UserProfileProvider } from '../contexts/UserProfileContext';
import { analytics } from '../lib/firebase';
import { initSentry } from '../lib/sentry';
import "../global.css";

export default function RootLayout() {
  console.log('[RootLayout] ========== ROOT LAYOUT RENDER ==========');
  
  useEffect(() => {
    console.log('[RootLayout] Root layout effect running - hiding splash screen');
    SplashScreen.hideAsync();
    
    // Initialize Sentry first
    initSentry();
    
    // Initialize Firebase Analytics
    if (analytics) {
      console.log('[Analytics] Firebase Analytics initialized');
    } else {
      console.log('[Analytics] Firebase Analytics not available (likely not web platform)');
    }
  }, []);
  
  console.log('[RootLayout] Rendering providers and slot');
  return (
    <AuthProvider>
      <UserProfileProvider>
        <Slot />
      </UserProfileProvider>
    </AuthProvider>
  );
}