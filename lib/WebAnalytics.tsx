import { inject, pageview, type BeforeSend } from '@vercel/analytics';
import { usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

const stripUrlParameters: BeforeSend = (event) => ({
  ...event,
  // Password reset and other links can contain sensitive URL parameters.
  url: event.url.split(/[?#]/, 1)[0],
});

export function WebAnalytics() {
  return Platform.OS === 'web' ? <WebPageViews /> : null;
}

function WebPageViews() {
  const pathname = usePathname();
  const lastPathname = useRef<string | null>(null);

  useEffect(() => {
    inject({ disableAutoTrack: true, beforeSend: stripUrlParameters });
  }, []);

  // Expo Router can replace a history entry. Track its current pathname so
  // initial loads, pushes, replacements, and back navigation count.
  useEffect(() => {
    if (!pathname || pathname === lastPathname.current) return;
    lastPathname.current = pathname;
    pageview({ route: pathname, path: pathname });
  }, [pathname]);

  return null;
}
