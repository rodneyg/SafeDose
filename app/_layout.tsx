// app/_layout.tsx
import { Slot, SplashScreen } from 'expo-router';
import { useEffect } from 'react';
import "../global.css";

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return <Slot />;
}