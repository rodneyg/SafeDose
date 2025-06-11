// app/_layout.tsx
import { Slot, SplashScreen } from 'expo-router';
import { useEffect } from 'react';
import { AuthProvider } from '../contexts/AuthContext';
import { UserProfileProvider } from '../contexts/UserProfileContext';
import { initializeAnalytics } from '../lib/analytics';
import "../global.css";

export default function RootLayout() {
  console.log('[RootLayout] ========== ROOT LAYOUT RENDER ==========');
  
  useEffect(() => {
    console.log('[RootLayout] Root layout effect running - hiding splash screen');
    SplashScreen.hideAsync();
    
    // Phase 2: Initialize Firebase Analytics after app stabilization
    if (typeof window !== "undefined") {
      console.log('[RootLayout] Browser environment detected, scheduling Analytics initialization');
      // Delay to ensure app is fully rendered and stabilized
      setTimeout(async () => {
        try {
          console.log('[RootLayout] Initializing Firebase Analytics (Phase 2)...');
          await initializeAnalytics();
          console.log('[RootLayout] ✅ Firebase Analytics initialized successfully');
        } catch (error) {
          console.error('[RootLayout] ❌ Failed to initialize Analytics:', error);
        }
      }, 3000); // 3 second delay to ensure app stability
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