import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { useToast } from "@/hooks/use-toast";
import stripeConfig from "@/lib/stripeConfig";
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
      { name: "50 AI scans/month", available: true },
      { name: "Unlimited manual calculations", available: true },
      { name: "Faster scans", available: true },
      { name: "No mid-session limits", available: true },
      { name: "Priority scan queue", available: false },
    ],
    cta: "Upgrade to Plus",
    badge: "popular",
    priceId: { monthly: "price_1REz2UAY2p4W374YGel1OISL", annual: "price_1REz2UAY2p4W374YGel1OISL" },
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
    priceId: { monthly: "price_1REz24AY2p4W374Y0HsCxUre", annual: "price_1REz24AY2p4W374Y0HsCxUre" },
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
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to create checkout session");
      }

      const { sessionId } = await res.json();
      await stripe.redirectToCheckout({ sessionId });
    } catch (error) {
      console.error("Checkout error:", error);
      toast({
        title: "Checkout Error",
        description: "Unable to initiate checkout. Please try again.",
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