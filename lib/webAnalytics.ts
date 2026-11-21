import { inject } from '@vercel/analytics';
import { Platform } from 'react-native';

export function initializeWebAnalytics() {
  if (Platform.OS !== 'web') return;

  inject({
    beforeSend: (event) => ({
      ...event,
      // Password reset and other links can contain sensitive URL parameters.
      url: event.url.split(/[?#]/, 1)[0],
    }),
  });
}
