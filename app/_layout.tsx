// app/_layout.tsx
import { Slot, SplashScreen } from 'expo-router';
import { useEffect } from 'react';
import { AuthProvider } from '../contexts/AuthContext';
import { analytics } from '../lib/firebase';
import { Toaster } from '@/components/ui/toaster'; // Import Toaster
import "../global.css";

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
    
    // Initialize Firebase Analytics
    if (analytics) {
      console.log('[Analytics] Firebase Analytics initialized');
    } else {
      console.log('[Analytics] Firebase Analytics not available (likely not web platform)');
    }
  }, []);
  
  return (
    <AuthProvider>
      <Slot />
      <Toaster /> {/* Add Toaster here */}
    </AuthProvider>
  );
}