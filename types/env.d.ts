// types/env.d.ts
declare module 'expo-constants' {
    interface Constants {
      expoConfig: {
        extra: {
          OPENAI_API_KEY: string;
          STRIPE_PUBLISHABLE_KEY: string;
        };
      };
    }
  }