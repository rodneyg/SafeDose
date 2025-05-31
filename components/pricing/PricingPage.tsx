import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { useToast } from "@/hooks/use-toast";
import stripeConfig from "../../lib/stripeConfig";
import PricingCard, { PricingPlan } from "@/components/pricing/PricingCard";
import PaymentProviders, { PaymentProvider } from "@/components/pricing/PaymentProviders";

const stripePromise = stripeConfig.publishableKey
  ? loadStripe(stripeConfig.publishableKey)
  : Promise.reject(new Error("Stripe publishable key is missing"));

const pricingPlans: PricingPlan[] = [
  {
    name: "Monthly",
    price: { monthly: 20, annual: 20 },
    description: "Billed monthly. Cancel anytime.",
    features: [
      { name: "50 AI scans/month", available: true },
      { name: "Unlimited manual calculations", available: true },
      { name: "Faster scans", available: true },
      { name: "No mid-session limits", available: true },
      { name: "Priority scan queue", available: true },
    ],
    cta: "Try Free Now",
    badge: "popular",
    priceId: { monthly: "price_1REz2UAY2p4W374YGel1OISL", annual: "price_1REz2UAY2p4W374YGel1OISL" },
    isTrial: true,
  },
  {
    name: "Yearly",
    price: { monthly: 149.99, annual: 149.99 },
    description: "SAVE 38%",
    features: [
      { name: "50 AI scans/month", available: true },
      { name: "Unlimited manual calculations", available: true },
      { name: "Faster scans", available: true },
      { name: "No mid-session limits", available: true },
      { name: "Priority scan queue", available: true },
    ],
    cta: "Try Free Now",
    badge: "best-value",
    priceId: { monthly: "price_1REz24AY2p4W374Y0HsCxUre", annual: "price_1REz24AY2p4W374Y0HsCxUre" },
    isTrial: true,
  },
];

export default function PricingPage() {
  const { toast } = useToast();
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

      const priceId = plan.priceId.monthly;
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
    <div className="pricing-page container mx-auto px-4 py-12">
      <h2 className="text-3xl font-bold text-center mb-8">SafeDose Pricing</h2>
      <div className="mb-8">
        <PaymentProviders
          availableProviders={["stripe", "lemonsqueezy", "revenuecat", "paddle"]}
          selectedProvider={selectedPaymentProvider}
          onSelectProvider={setSelectedPaymentProvider}
        />
      </div>
      <div className="flex flex-col gap-8 max-w-md mx-auto">
        {pricingPlans.map((plan, idx) => (
          <PricingCard
            key={idx}
            plan={plan}
            isAnnual={plan.name === "Yearly"}
            onSelectPlan={handleCheckout}
          />
        ))}
      </div>
    </div>
  );
}