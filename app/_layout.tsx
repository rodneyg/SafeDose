// app/_layout.tsx
import { Slot, SplashScreen } from 'expo-router';
import { useEffect } from 'react';
import { AuthProvider } from '../contexts/AuthContext';
import { UserProfileProvider } from '../contexts/UserProfileContext';
import { analytics } from '../lib/firebase';
import { logAnalyticsEvent, trackRetention, ANALYTICS_EVENTS } from '../lib/analytics';
import "../global.css";

export default function RootLayout() {
  console.log('[RootLayout] ========== ROOT LAYOUT RENDER ==========');
  
  useEffect(() => {
    console.log('[RootLayout] Root layout effect running - hiding splash screen');
    SplashScreen.hideAsync();
    
    // Initialize Firebase Analytics
    if (analytics) {
      console.log('[Analytics] Firebase Analytics initialized');
    } else {
      console.log('[Analytics] Firebase Analytics not available (likely not web platform)');
    }

    // Track app opened event for retention analysis
    logAnalyticsEvent(ANALYTICS_EVENTS.APP_OPENED, { timestamp: new Date().toISOString() });
    
    // Simple retention tracking based on last visit (simplified version)
    const checkRetention = () => {
      const lastVisit = localStorage?.getItem('lastAppVisit');
      const now = Date.now();
      
      if (lastVisit) {
        const daysSinceLastVisit = Math.floor((now - parseInt(lastVisit)) / (1000 * 60 * 60 * 24));
        if (daysSinceLastVisit >= 1 && daysSinceLastVisit < 2) {
          trackRetention(1);
        } else if (daysSinceLastVisit >= 7 && daysSinceLastVisit < 8) {
          trackRetention(7);
        } else if (daysSinceLastVisit >= 30 && daysSinceLastVisit < 31) {
          trackRetention(30);
        }
      }
      
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('lastAppVisit', now.toString());
      }
    };
    
    checkRetention();
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