
import { useState } from "react";

export type PaymentProvider = "stripe" | "lemonsqueezy" | "revenuecat" | "paddle";

interface PaymentProvidersProps {
  availableProviders: PaymentProvider[];
  selectedProvider: PaymentProvider;
  onSelectProvider: (provider: PaymentProvider) => void;
  showApplePay?: boolean;
  showGooglePay?: boolean;
}

const PaymentProviders = ({
  availableProviders,
  selectedProvider,
  onSelectProvider,
  showApplePay = true,
  showGooglePay = true,
}: PaymentProvidersProps) => {
  // Provider icons would be imported or loaded from your assets folder
  const providerIcons = {
    stripe: "/placeholder.svg", // Replace with actual paths
    lemonsqueezy: "/placeholder.svg",
    revenuecat: "/placeholder.svg",
    paddle: "/placeholder.svg",
    applepay: "/placeholder.svg",
    googlepay: "/placeholder.svg",
  };
  
  const getProviderName = (provider: PaymentProvider): string => {
    switch (provider) {
      case "stripe": return "Stripe";
      case "lemonsqueezy": return "Lemon Squeezy";
      case "revenuecat": return "RevenueCat";
      case "paddle": return "Paddle";
      default: return "";
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4 mb-12">
      <div className="flex flex-wrap justify-center gap-4">
        {availableProviders.map((provider) => (
          <button
            key={provider}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              selectedProvider === provider
                ? "border-brand bg-brand/5"
                : "border-gray-200 dark:border-gray-700"
            }`}
            onClick={() => onSelectProvider(provider)}
          >
            <div className="flex items-center gap-2">
              <img
                src={providerIcons[provider]}
                alt={getProviderName(provider)}
                className="h-5 w-5 object-contain"
              />
              <span>{getProviderName(provider)}</span>
            </div>
          </button>
        ))}
      </div>
      
      {(showApplePay || showGooglePay) && (
        <div className="flex items-center gap-2 mt-2">
          <span className="text-sm text-muted-foreground">Also supports:</span>
          <div className="flex gap-2">
            {showApplePay && (
              <div className="h-8 w-12 bg-black rounded-md flex items-center justify-center">
                <img
                  src={providerIcons.applepay}
                  alt="Apple Pay"
                  className="h-4 object-contain"
                />
              </div>
            )}
            {showGooglePay && (
              <div className="h-8 w-12 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md flex items-center justify-center">
                <img
                  src={providerIcons.googlepay}
                  alt="Google Pay"
                  className="h-4 object-contain"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentProviders;
