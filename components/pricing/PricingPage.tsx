import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { useToast } from "@/hooks/use-toast";
import stripeConfig from "../../lib/stripeConfig";
import PricingCard, { PricingPlan } from "@/components/pricing/PricingCard";
import PriceToggle from "@/components/pricing/PriceToggle";
import PaymentProviders, { PaymentProvider } from "@/components/pricing/PaymentProviders";

const stripePromise = stripeConfig.publishableKey
  ? loadStripe(stripeConfig.publishableKey)
  : Promise.reject(new Error("Stripe publishable key is missing"));

const pricingPlans: PricingPlan[] = [
  {
    name: "Free",
    price: { monthly: 0, annual: 0 },
    description: "Manual calculations only, ideal for light or trial use",
    features: [
      { name: "3 AI scans/month", available: true },
      { name: "10 saved doses", available: true },
      { name: "Manual calculations", available: true },
      { name: "Basic support", available: true },
      { name: "Faster scans & no mid-session limits", available: false },
      { name: "Priority scan queue", available: false },
    ],
    cta: "Start Free",
    priceId: { monthly: null, annual: null },
  },
  {
    name: "Starter",
    price: { monthly: 4.99, annual: 44.99 },
    description: "For occasional dosing with basic AI assistance",
    features: [
      { name: "10 AI scans/month", available: true },
      { name: "20 saved doses", available: true },
      { name: "Manual calculations", available: true },
      { name: "Basic support", available: true },
      { name: "Priority processing", available: false },
      { name: "Priority scan queue", available: false },
    ],
    cta: "Upgrade to Starter",
    priceId: { 
      monthly: "price_1RYgx7AY2p4W374YR9UxS0vr", 
      annual: "price_1RYgx7AY2p4W374Yy23EtyIm" 
    },
  },
  {
    name: "Basic Pro",
    price: { monthly: 9.99, annual: 89.99 },
    description: "For consistent logging with AI scan assistance",
    features: [
      { name: "20 AI scans/month", available: true },
      { name: "Unlimited logs", available: true },
      { name: "Manual calculations", available: true },
      { name: "Priority support", available: true },
      { name: "Priority processing", available: false },
      { name: "Priority scan queue", available: false },
    ],
    cta: "Upgrade to Basic Pro",
    badge: "popular",
    priceId: { 
      monthly: "price_1RYgyPAY2p4W374YNbpBpbqv", 
      annual: "price_1RYgyPAY2p4W374YJOhwDafY" 
    },
  },
  {
    name: "Full Pro",
    price: { monthly: 20, annual: 179.99 },
    description: "Complete solution with unlimited AI scans and logs",
    features: [
      { name: "Unlimited AI scans", available: true },
      { name: "Unlimited logs", available: true },
      { name: "Manual calculations", available: true },
      { name: "Priority processing", available: true },
      { name: "Priority scan queue", available: true },
      { name: "Premium support", available: true },
    ],
    cta: "Start Free Trial",
    badge: "best-value",
    trialDays: 7,
    priceId: { 
      monthly: "price_1RUHgxAY2p4W374Yb5EWEtZ0", 
      annual: "price_1RYgzUAY2p4W374YHiBBHvuX" 
    },
  },
];

export default function PricingPage() {
  const { toast } = useToast();
  const [isAnnual, setIsAnnual] = useState(false);
  const [selectedPaymentProvider, setSelectedPaymentProvider] =
    useState<PaymentProvider>("stripe");

  const initiateStripeCheckout = async (plan: PricingPlan) => {
    try {
      const stripe = await stripePromise;
      if (!stripe) {
        toast({
          title: "Error",
          description: "Stripe is not initialized. Please try again later.",
          variant: "destructive",
        });
        return;
      }

      const priceId = isAnnual ? plan.priceId.annual : plan.priceId.monthly;
      if (!priceId) {
        toast({
          title: "Free Plan Selected",
          description: "No checkout needed for Free plan.",
        });
        return;
      }

      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId,
          successUrl: `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${window.location.origin}/pricing`,
          hasTrial: plan.trialDays ? true : false,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        
        // Provide specific error messages for common configuration issues
        if (errorData.error && errorData.error.includes("publishable API key")) {
          throw new Error("Payment system configuration error. Please contact support.");
        } else if (errorData.error && errorData.error.includes("secret key")) {
          throw new Error("Payment system temporarily unavailable. Please try again later.");
        } else {
          throw new Error(errorData.error || "Failed to create checkout session");
        }
      }

      const { sessionId } = await res.json();
      await stripe.redirectToCheckout({ sessionId });
    } catch (error) {
      console.error("Checkout error:", error);
      
      // Provide user-friendly error messages
      let description = "Unable to initiate checkout. Please try again.";
      if (error.message.includes("configuration error")) {
        description = "Payment system configuration error. Please contact support - this issue has been logged.";
      } else if (error.message.includes("temporarily unavailable")) {
        description = "Payment system temporarily unavailable. Please try again in a few moments.";
      }
      
      toast({
        title: "Checkout Error",
        description,
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
          availableProviders={["stripe", "lemonsqueezy", "revenuecat", "paddle"]}
          selectedProvider={selectedPaymentProvider}
          onSelectProvider={setSelectedPaymentProvider}
        />
      </div>
      <PriceToggle isAnnual={isAnnual} onToggle={setIsAnnual} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-6">
        {pricingPlans.map((plan, idx) => (
          <PricingCard
            key={idx}
            plan={plan}
            isAnnual={isAnnual}
            onSelectPlan={handleCheckout}
          />
        ))}
      </div>
    </div>
  );
}