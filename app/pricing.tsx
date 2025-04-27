import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { useToast } from "@/hooks/use-toast";
import Constants from "expo-constants";
import PricingCard, { PricingPlan } from "@/components/pricing/PricingCard";
import PriceToggle from "@/components/pricing/PriceToggle";
import PaymentProviders, { PaymentProvider } from "@/components/pricing/PaymentProviders";

// Read your publishable key from Expo constants
const stripePublishableKey =
  Constants.expoConfig?.extra?.STRIPE_PUBLISHABLE_KEY || "";
console.log("Stripe Publishable Key:", stripePublishableKey);

// Initialize Stripe.js
const stripePromise = stripePublishableKey
  ? loadStripe(stripePublishableKey)
  : Promise.reject(new Error("Stripe publishable key is missing"));

// Base URL for your API
const API_BASE_URL = "https://www.safedoseai.com";

const pricingPlans: PricingPlan[] = [
  {
    name: "Free",
    price: { monthly: 0, annual: 0 },
    description: "Manual calculations only, ideal for light or trial use",
    features: [
      { name: "30 AI scans/month", available: true },
      { name: "Unlimited manual calculations", available: true },
      { name: "Faster scans & no mid-session limits", available: false },
      { name: "Priority scan queue", available: false },
    ],
    cta: "Start Free",
    priceId: { monthly: null, annual: null },
  },
  {
    name: "Plus",
    price: { monthly: 20, annual: 240 },
    description: "For consistent at-home dosing",
    features: [
      { name: "150 AI scans/month", available: true },
      { name: "Unlimited manual calculations", available: true },
      { name: "Faster scans", available: true },
      { name: "No mid-session limits", available: true },
      { name: "Priority scan queue", available: false },
    ],
    cta: "Upgrade to Plus",
    badge: "popular",
    priceId: { monthly: "price_1REyzMPE5x6FmwJPyJVJIEXe", annual: "price_1REyzMPE5x6FmwJPyJVJIEXe" },
  },
  {
    name: "Pro",
    price: { monthly: 50, annual: 600 },
    description: "Clinical-grade volume and control",
    features: [
      { name: "500 AI scans/month", available: true },
      { name: "Unlimited manual calculations", available: true },
      { name: "Faster scans", available: true },
      { name: "No mid-session limits", available: true },
      { name: "Priority scan queue", available: true },
      { name: "Dedicated support line", available: true },
    ],
    cta: "Go Pro",
    badge: "best-value",
    priceId: { monthly: "price_1REyzMPE5x6FmwJPyJVJIEXe", annual: "price_1REyzMPE5x6FmwJPyJVJIEXe" },
  },
];

export default function PricingPage() {
  const { toast } = useToast();
  const [isAnnual, setIsAnnual] = useState(false);
  const [selectedPaymentProvider, setSelectedPaymentProvider] =
    useState<PaymentProvider>("stripe");

  const initiateStripeCheckout = async (plan: PricingPlan) => {
    console.log("initiateStripeCheckout called with plan:", plan);
    try {
      const stripe = await stripePromise;
      console.log("Stripe instance:", stripe);
      if (!stripe) {
        console.error("Stripe is not initialized");
        toast({
          title: "Error",
          description: "Stripe is not initialized. Please try again later.",
          variant: "destructive",
        });
        return;
      }

      const priceId = isAnnual ? plan.priceId.annual : plan.priceId.monthly;
      console.log("Using priceId:", priceId);
      if (!priceId) {
        console.log("Free plan selected, no checkout needed");
        toast({ title: "Free Plan Selected", description: "No checkout needed for Free plan." });
        return;
      }

      // Debug: show payload
      console.log(`Calling ${API_BASE_URL}/api/create-checkout-session with:`, {
        priceId,
        successUrl: `${API_BASE_URL}/success`,
        cancelUrl: `${API_BASE_URL}/pricing`,
      });

      const res = await fetch(
        `${API_BASE_URL}/api/create-checkout-session`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            priceId,
            successUrl: `${API_BASE_URL}/success`,
            cancelUrl: `${API_BASE_URL}/pricing`,
          }),
        }
      );
      console.log("create-checkout-session status:", res.status);

      const text = await res.text();
      console.log("create-checkout-session raw response:", text);
      let data: any;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error("Failed to parse JSON:", e);
        throw new Error("Invalid JSON from checkout session");
      }

      if (!res.ok) {
        console.error("Error response from API:", data);
        toast({
          title: "Checkout Error",
          description: data.error || "Failed to create checkout session",
          variant: "destructive",
        });
        return;
      }

      const { sessionId } = data;
      console.log("Received sessionId:", sessionId);

      console.log("Redirecting to Stripe Checkout...");
      const result = await stripe.redirectToCheckout({ sessionId });
      console.log("redirectToCheckout result:", result);
      if (result?.error) {
        console.error("Stripe redirectToCheckout error:", result.error);
        toast({
          title: "Stripe Redirect Error",
          description: result.error.message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Checkout error caught:", error);
      toast({
        title: "Checkout Error",
        description: error.message || "Unable to initiate checkout. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCheckout = (plan: PricingPlan) => {
    switch (selectedPaymentProvider) {
      case "stripe":
        initiateStripeCheckout(plan);
        break;
      case "lemonsqueezy":
        console.log("LemonSqueezy checkout:", plan.name);
        break;
      case "revenuecat":
        console.log("RevenueCat checkout:", plan.name);
        break;
      case "paddle":
        console.log("Paddle checkout:", plan.name);
        break;
      default:
        console.error("Unknown payment provider");
    }
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <h2 className="text-3xl font-bold text-center mb-8">SafeDose Pricing</h2>
      <div className="mb-8">
        <PaymentProviders
          availableProviders={[
            "stripe",
            "lemonsqueezy",
            "revenuecat",
            "paddle",
          ]}
          selectedProvider={selectedPaymentProvider}
          onSelectProvider={setSelectedPaymentProvider}
        />
      </div>
      <PriceToggle isAnnual={isAnnual} onToggle={setIsAnnual} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-6">
        {pricingPlans.map((plan, idx) => (
          <PricingCard key={idx} plan={plan} isAnnual={isAnnual} onSelectPlan={handleCheckout} />
        ))}
      </div>
    </div>
  );
}
