import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { useToast } from "@/hooks/use-toast";
import stripeConfig from "../../lib/stripeConfig";
import PricingCard, { PricingPlan } from "@/components/pricing/PricingCard";
import PriceToggle from "@/components/pricing/PriceToggle";
import PaymentProviders, { PaymentProvider } from "@/components/pricing/PaymentProviders";
import {
  FREE_SCAN_LIMIT,
  PHOTO_CHECK_MONTHLY_AMOUNT,
  PHOTO_CHECK_ANNUAL_AMOUNT,
} from "../../lib/plans";

const stripePromise = stripeConfig.publishableKey
  ? loadStripe(stripeConfig.publishableKey)
  : Promise.reject(new Error("Stripe publishable key is missing"));

const pricingPlans: PricingPlan[] = [
  {
    name: "Free",
    price: { monthly: 0, annual: 0 },
    description: "The calculator, reconstitution, and on-device logs stay free",
    features: [
      { name: `${FREE_SCAN_LIMIT} AI photo scans/month`, available: true },
      { name: "Manual calculator", available: true },
      { name: "On-device dose logs", available: true },
      { name: "Unlimited photo checks", available: false },
    ],
    cta: "Start Free",
    priceId: { monthly: null, annual: null },
  },
  {
    name: "Photo Check",
    price: { monthly: PHOTO_CHECK_MONTHLY_AMOUNT, annual: PHOTO_CHECK_ANNUAL_AMOUNT },
    description: "Unlimited web photo checks after the free monthly cap",
    features: [
      { name: "Unlimited AI photo scans", available: true },
      { name: "Manual calculator", available: true },
      { name: "On-device dose logs", available: true },
      { name: "Web checkout, cancel anytime", available: true },
    ],
    cta: "Get Photo Check",
    badge: "popular",
    priceId: { monthly: null, annual: null },
    offerKey: { monthly: "photo_check_monthly", annual: "photo_check_annual" },
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

      const offerKey = isAnnual ? plan.offerKey?.annual : plan.offerKey?.monthly;
      const priceId = isAnnual ? plan.priceId.annual : plan.priceId.monthly;
      if (!offerKey && !priceId) {
        toast({
          title: "Free Plan Selected",
          description: "No checkout needed for the free calculator.",
        });
        return;
      }

      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offerKey,
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
      <h2 className="text-3xl font-bold text-center mb-4">SafeDose Pricing</h2>
      <p className="text-center text-muted-foreground mb-8">
        The calculator stays free. Optional photo checks are ${PHOTO_CHECK_MONTHLY_AMOUNT}/month
        after {FREE_SCAN_LIMIT} free scans, or ${PHOTO_CHECK_ANNUAL_AMOUNT}/year.
      </p>
      <div className="mb-8">
        <PaymentProviders
          availableProviders={["stripe"]}
          selectedProvider={selectedPaymentProvider}
          onSelectProvider={setSelectedPaymentProvider}
        />
      </div>
      <PriceToggle isAnnual={isAnnual} onToggle={setIsAnnual} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6 max-w-4xl mx-auto">
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