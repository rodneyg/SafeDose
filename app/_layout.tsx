// app/_layout.tsx
import { Slot, SplashScreen } from 'expo-router';
import { useEffect } from 'react';

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return <Slot />;
}