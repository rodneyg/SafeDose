// Augment the installed Expo declarations instead of shadowing the module.
import 'expo-constants';
declare module 'expo-constants' {
    interface Constants {
      expoConfig: {
        extra: {
          STRIPE_PUBLISHABLE_KEY: string;
          STRIPE_MODE: string;
          STRIPE_TEST_PUBLISHABLE_KEY: string;
          STRIPE_LIVE_PUBLISHABLE_KEY: string;
          STRIPE_TEST_PRICE_ID: string;
          STRIPE_LIVE_PRICE_ID: string;
        };
      };
    }
  }