import React, { createContext, useContext, useState } from 'react';

type OnboardingDetails = {
  age: number | null;
  birthDate: string | null;
  limitedFunctionality: boolean;
};
const initialDetails: OnboardingDetails = { age: null, birthDate: null, limitedFunctionality: false };
const OnboardingContext = createContext<{
  details: OnboardingDetails;
  setDetails: (details: OnboardingDetails) => void;
} | null>(null);

// Personal onboarding answers stay in memory, never in route parameters.
export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [details, setDetails] = useState(initialDetails);
  return <OnboardingContext.Provider value={{ details, setDetails }}>{children}</OnboardingContext.Provider>;
}

export function useOnboardingDetails() {
  const context = useContext(OnboardingContext);
  if (!context) throw new Error('OnboardingProvider is required');
  return context;
}
