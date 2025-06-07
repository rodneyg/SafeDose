import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import stripeConfig from "../lib/stripeConfig";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { router } from "expo-router";
import { logAnalyticsEvent, ANALYTICS_EVENTS } from "../lib/analytics";

// Initialize Stripe.js with the configuration, handling missing publishable key gracefully
const stripePromise = stripeConfig.publishableKey
  ? loadStripe(stripeConfig.publishableKey)
  : null;

// Base URL for your API
const API_BASE_URL = "https://app.safedoseai.com";

export default function PricingPage() {
  const pricingPlansData = [
    {
      id: 'monthly',
      name: "Monthly Plan",
      price: 20,
      priceSuffix: "/month",
      subtext: "Billed monthly. Cancel anytime.",
      priceId: stripeConfig.priceId, // Existing one
      features: [
        { name: "50 AI scans/month", available: true },
        { name: "Unlimited manual calculations", available: true },
        { name: "Faster scans", available: true },
        { name: "No mid-session limits", available: true },
      ],
      badgeText: "Most Popular",
      isDefault: true,
    },
    {
      id: 'yearly',
      name: "Yearly Plan",
      price: 149.99,
      priceSuffix: "/year",
      subtext: "SAVE 38%",
      priceId: 'price_yearly_placeholder',
      features: [
        { name: "600 AI scans/year", available: true }, // Or "50 AI scans/month"
        { name: "Unlimited manual calculations", available: true },
        { name: "Faster scans", available: true },
        { name: "No mid-session limits", available: true },
      ],
      badgeText: "SAVE 38%",
      isDefault: false,
    },
  ];

  const defaultPlan = pricingPlansData.find(plan => plan.isDefault) || pricingPlansData[0];
  const [selectedPlan, setSelectedPlan] = useState(defaultPlan);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Log view_pricing_page event when component mounts
  useEffect(() => {
    logAnalyticsEvent(ANALYTICS_EVENTS.VIEW_PRICING_PAGE);
    console.warn(
      "TODO: Replace placeholder Stripe Price IDs ('price_yearly_placeholder') in pricingPlansData with actual Price IDs from your Stripe dashboard."
    );
  }, []);

  const initiateStripeCheckout = async () => {
    console.log(`initiateStripeCheckout called for ${selectedPlan.name}`);
    logAnalyticsEvent(ANALYTICS_EVENTS.INITIATE_UPGRADE, { plan: selectedPlan.id });
    
    setIsLoading(true);
    setErrorMessage("");
    
    try {
      // Check if publishable key is missing before proceeding
      if (!stripeConfig.publishableKey) {
        console.error("Stripe publishable key is missing");
        setErrorMessage("Payment system configuration error. Please contact support - Stripe publishable key is missing.");
        logAnalyticsEvent(ANALYTICS_EVENTS.UPGRADE_FAILURE, {
          plan: selectedPlan.id,
          error: 'Stripe publishable key is missing'
        });
        return;
      }

      const stripe = await stripePromise;
      console.log("Stripe instance:", stripe);
      if (!stripe) {
        console.error("Stripe is not initialized");
        setErrorMessage("Stripe is not initialized. Please try again later.");
        logAnalyticsEvent(ANALYTICS_EVENTS.UPGRADE_FAILURE, {
          plan: selectedPlan.id,
          error: 'Stripe not initialized'
        });
        return;
      }

      const priceId = selectedPlan.priceId;
      console.log("Using priceId:", priceId);

      // Debug: show payload
      console.log(`Calling ${API_BASE_URL}/api/create-checkout-session with:`, {
        priceId,
        successUrl: `${API_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${API_BASE_URL}/pricing`,
      });

      const res = await fetch(
        `${API_BASE_URL}/api/create-checkout-session`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            priceId,
            successUrl: `${API_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
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
        
        // Provide specific error messages for common configuration issues
        let userFriendlyMessage = data.error || "Failed to create checkout session";
        
        if (data.error && data.error.includes("publishable API key")) {
          userFriendlyMessage = "Payment system configuration error. Please contact support - this issue has been logged for immediate attention.";
          console.error("CRITICAL: Stripe configuration error detected - publishable key used as secret key");
        } else if (data.error && data.error.includes("secret key")) {
          userFriendlyMessage = "Payment system temporarily unavailable. Please try again later or contact support.";
          console.error("CRITICAL: Stripe secret key configuration error");
        } else if (res.status === 500) {
          userFriendlyMessage = "Payment system temporarily unavailable. Please try again in a few moments.";
        }
        
        setErrorMessage(userFriendlyMessage);
        logAnalyticsEvent(ANALYTICS_EVENTS.UPGRADE_FAILURE, {
          plan: selectedPlan.id,
          error: data.error || 'Failed to create checkout session',
          userMessage: userFriendlyMessage
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
        setErrorMessage(result.error.message);
        logAnalyticsEvent(ANALYTICS_EVENTS.UPGRADE_FAILURE, {
          plan: selectedPlan.id,
          error: result.error.message
        });
      }
    } catch (error: any) {
      console.error("Checkout error caught:", error);
      setErrorMessage(error.message || "Unable to initiate checkout. Please try again.");
      logAnalyticsEvent(ANALYTICS_EVENTS.UPGRADE_FAILURE, {
        plan: selectedPlan.id,
        error: error.message || 'Unable to initiate checkout'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContentContainer}>
      <Text style={styles.title}>Choose Your Plan</Text>

      {pricingPlansData.map((plan) => (
        <TouchableOpacity
          key={plan.id}
          style={[
            styles.planCard,
            plan.id === selectedPlan.id && styles.selectedPlanCard, // Placeholder style
          ]}
          onPress={() => setSelectedPlan(plan)}
        >
          {plan.badgeText && (
            <View style={[
              styles.badgeContainer,
              plan.badgeText === "Most Popular" ? styles.mostPopularBadge : styles.discountBadge
            ]}>
              <Text style={styles.badgeText}>{plan.badgeText}</Text>
            </View>
          )}
          <Text style={styles.planName}>{plan.name}</Text>
          <View style={styles.priceContainer}>
            <Text style={styles.planPrice}>${plan.price.toFixed(2)}</Text>
            <Text style={styles.planPriceSuffix}>{plan.priceSuffix}</Text>
          </View>
          <Text style={styles.planSubtext}>{plan.subtext}</Text>

          <View style={styles.featureList}>
            {plan.features.map((feature) => (
              <View key={feature.name} style={styles.featureItem}>
                <Text style={styles.featureText}>• {feature.name}</Text>
              </View>
            ))}
          </View>
          <View style={styles.selectionIndicatorContainer}>
            <Text style={[
              styles.selectionIndicator,
              plan.id === selectedPlan.id && styles.selectedIndicatorText
            ]}>
              {plan.id === selectedPlan.id ? "✓ Selected" : "Select"}
            </Text>
          </View>
        </TouchableOpacity>
      ))}

      {errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : null}

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.upgradeButton} 
          onPress={initiateStripeCheckout}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? "Processing..." : "Try Free Now"}
          </Text>
        </TouchableOpacity>
        
        {selectedPlan.id === 'monthly' && (
          <Text style={styles.ctaSubtext}>1 week free trial, then $20/month</Text>
        )}

        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollViewContentContainer: {
    padding: 24,
    alignItems: 'center',
    flexGrow: 1, // Ensures content expands if shorter than screen
  },
  // container style is now applied to scrollViewContentContainer or scrollView itself
  // We might not need a separate 'container' style anymore, or it can be merged/adjusted.
  // For now, let's assume padding and alignItems are for the content within ScrollView.
  title: {
    fontSize: 20, // text-xl equivalent (~20px)
    fontWeight: '600', // font-semibold
    color: '#000000',
    marginBottom: 24,
    textAlign: 'center',
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 32, // Keep horizontal padding
    paddingVertical: 24, // Reduced vertical padding
    width: '100%',
    maxWidth: 400,
    marginBottom: 16, // Reduced margin bottom
    alignItems: 'center',
    // Add soft shadow
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    position: 'relative',
  },
  selectedPlanCard: {
    borderColor: '#8B5CF6',
    borderWidth: 2,
    elevation: 10, // Increased elevation for selected card
    shadowOpacity: 0.25, // Slightly stronger shadow
    shadowRadius: 10,
  },
  badgeContainer: {
    position: 'absolute',
    top: 12, // Adjusted for better visual placement
    right: 12, // Adjusted for better visual placement
    paddingHorizontal: 10, // Increased padding
    paddingVertical: 5, // Increased padding
    borderRadius: 16, // More rounded
    zIndex: 1,
    elevation: 5, // Ensure badge is above card content slightly
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Specific badge styles
  mostPopularBadge: {
    backgroundColor: '#8B5CF6', // brand color
  },
  discountBadge: {
    backgroundColor: '#10B981', // A green color for discounts/savings
  },
  planName: {
    fontSize: 22, // Slightly larger
    fontWeight: '600',
    color: '#1F2937', // Darker gray
    marginBottom: 8,
    textAlign: 'center',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline', // Align text baselines
    marginBottom: 8,
    justifyContent: 'center',
  },
  planPrice: {
    fontSize: 40, // Larger for emphasis
    fontWeight: 'bold',
    color: '#000000',
  },
  planPriceSuffix: {
    fontSize: 18, // Slightly larger
    fontWeight: '500',
    color: '#4B5563', // Medium gray
    marginLeft: 5, // Adjusted spacing
    // marginBottom: 5, // Removed, baseline alignment handles this
  },
  planSubtext: {
    fontSize: 14,
    color: '#4B5563', // Medium gray
    marginBottom: 20, // Increased spacing before features
    textAlign: 'center',
  },
  featureList: {
    width: '100%',
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 16, // text-base
    fontWeight: '500',
    color: '#374151', // Slightly darker gray for feature text
  },
  selectionIndicatorContainer: {
    flexDirection: 'row', // To allow icon and text if needed
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20, // Increased spacing
    paddingVertical: 10, // Add some padding
    // backgroundColor: '#F3F4F6', // Optional: very light background for this section
    borderRadius: 12,
    width: '80%', // Take some width
  },
  selectionIndicator: { // For "Select" text
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280', // Default gray for "Select"
  },
  selectedIndicatorText: { // For "✓ Selected" text
    color: '#8B5CF6', // Brand color for selected state
    fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
    marginBottom: 16,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 400,
    gap: 12,
  },
  upgradeButton: {
    backgroundColor: '#8B5CF6', // brand color from tailwind config
    paddingVertical: 16, // Increased padding
    borderRadius: 16, // More rounded for modern look
    alignItems: 'center',
    marginBottom: 12,
    // Add subtle elevation/shadow for hover effect
    shadowColor: '#8B5CF6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  cancelButton: {
    backgroundColor: 'transparent', // Outline style
    borderWidth: 1,
    borderColor: '#8E8E93',
    paddingVertical: 16,
    borderRadius: 16, // Match primary button
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: '#8E8E93', // Lighter text for outline button
    fontSize: 16,
    fontWeight: '600',
  },
  ctaSubtext: {
    fontSize: 12,
    color: '#555555', // Dark gray for readability
    textAlign: 'center',
    marginTop: 8, // Spacing from the main CTA button
    marginBottom: 8, // Spacing before the cancel button if visible
  },
});
