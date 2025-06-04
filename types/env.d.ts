// types/env.d.ts
declare module 'expo-constants' {
    interface Constants {
      expoConfig: {
        extra: {
          OPENAI_API_KEY: string;
          SENTRY_DSN: string;
          STRIPE_PUBLISHABLE_KEY: string;
          STRIPE_MODE: string;
          STRIPE_TEST_PUBLISHABLE_KEY: string;
          STRIPE_TEST_SECRET_KEY: string;
          STRIPE_LIVE_PUBLISHABLE_KEY: string;
          STRIPE_LIVE_SECRET_KEY: string;
          STRIPE_TEST_PRICE_ID: string;
          STRIPE_LIVE_PRICE_ID: string;
        };
      };
    }
  }