import { useState } from "react";
import { router } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";
import { billingRequest } from "../../lib/subscriptionStatus";
import { getCheckoutStripe, STRIPE_LOAD_ERROR } from "../../lib/checkoutStripe";
import { useToast } from "@/hooks/use-toast";
import PricingCard, { PricingPlan } from "@/components/pricing/PricingCard";
import PriceToggle from "@/components/pricing/PriceToggle";
import PaymentProviders, { PaymentProvider } from "@/components/pricing/PaymentProviders";
import {
  FREE_SCAN_LIMIT,
  PHOTO_CHECK_MONTHLY_AMOUNT,
  PHOTO_CHECK_ANNUAL_AMOUNT,
} from "../../lib/plans";



const pricingPlans: PricingPlan[] = [
  {
    name: "Free",
    price: { monthly: 0, annual: 0 },
    description: "The calculator, reconstitution, and on-device logs stay free",
    features: [
      { name: `${FREE_SCAN_LIMIT} AI photo scans/month`, available: true },
      { name: "Manual calculator", available: true },
      { name: "On-device dose logs", available: true },
      { name: "Unlimited photo scans", available: false },
    ],
    cta: "Start Free",
    priceId: { monthly: null, annual: null },
  },
  {
    name: "Photo Scan",
    price: { monthly: PHOTO_CHECK_MONTHLY_AMOUNT, annual: PHOTO_CHECK_ANNUAL_AMOUNT },
    description: "Unlimited web photo scans after the free monthly cap",
    features: [
      { name: "Unlimited AI photo scans", available: true },
      { name: "Manual calculator", available: true },
      { name: "On-device dose logs", available: true },
      { name: "Web checkout, cancel anytime", available: true },
    ],
    cta: "Get Photo Scan",
    badge: "popular",
    priceId: { monthly: null, annual: null },
    offerKey: { monthly: "photo_check_monthly", annual: "photo_check_annual" },
  },
];

export default function PricingPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isAnnual, setIsAnnual] = useState(false);
  const [selectedPaymentProvider, setSelectedPaymentProvider] =
    useState<PaymentProvider>("stripe");

  const initiateStripeCheckout = async (plan: PricingPlan) => {
    try {
      const offerKey = isAnnual ? plan.offerKey?.annual : plan.offerKey?.monthly;
      const priceId = isAnnual ? plan.priceId.annual : plan.priceId.monthly;
      if (!offerKey && !priceId) {
        toast({
          title: "Free Plan Selected",
          description: "No checkout needed for the free calculator.",
        });
        return;
      }

      if (!user || user.isAnonymous) {
        router.push({ pathname: '/login', params: { from: 'pricing', ...(offerKey && { offer: offerKey }) } });
        return;
      }

      const stripe = await getCheckoutStripe();
      const { sessionId } = await billingRequest<{ sessionId: string }>(user, 'create-checkout-session', {
        offerKey,
        priceId,
        successUrl: `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${window.location.origin}/pricing`,
        hasTrial: Boolean(plan.trialDays),
      });
      const { error } = await stripe.redirectToCheckout({ sessionId });
      if (error) throw new Error(error.message);
    } catch (error) {
      console.error("Checkout error:", error);
      
      // Provide user-friendly error messages
      let description = "Unable to initiate checkout. Please try again.";
      if (error instanceof Error && error.message === STRIPE_LOAD_ERROR) {
        description = STRIPE_LOAD_ERROR;
      } else if (error instanceof Error && error.message.includes("configuration error")) {
        description = "Payment system configuration error. Please contact support - this issue has been logged.";
      } else if (error instanceof Error && error.message.includes("temporarily unavailable")) {
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
        return initiateStripeCheckout(plan);
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
        The calculator stays free. Optional photo scans are ${PHOTO_CHECK_MONTHLY_AMOUNT}/month
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