import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import stripeConfig from "../lib/stripeConfig";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { logAnalyticsEvent, ANALYTICS_EVENTS } from "../lib/analytics";

// Initialize Stripe.js with the configuration, handling missing publishable key gracefully
const stripePromise = stripeConfig.publishableKey
  ? loadStripe(stripeConfig.publishableKey)
  : null;

// Base URL for your API
const API_BASE_URL = "https://app.safedoseai.com";

// Premium plan details
const premiumPlan = {
  name: "Premium Plan",
  price: 20, // $20/month
  description: "50 Scans per Month",
  features: [
    { name: "50 AI scans/month", available: true },
    { name: "Unlimited manual calculations", available: true },
    { name: "Faster scans", available: true },
    { name: "No mid-session limits", available: true },
  ],
  priceId: stripeConfig.priceId,
};

export default function PricingPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Log view_pricing_page event when component mounts
  useEffect(() => {
    logAnalyticsEvent(ANALYTICS_EVENTS.VIEW_PRICING_PAGE);
  }, []);

  const initiateStripeCheckout = async () => {
    console.log("initiateStripeCheckout called for Premium plan");
    logAnalyticsEvent(ANALYTICS_EVENTS.INITIATE_UPGRADE, { plan: 'plus' });
    
    setIsLoading(true);
    setErrorMessage("");
    
    try {
      // Check if publishable key is missing before proceeding
      if (!stripeConfig.publishableKey) {
        console.error("Stripe publishable key is missing");
        setErrorMessage("Payment system configuration error. Please contact support - Stripe publishable key is missing.");
        logAnalyticsEvent(ANALYTICS_EVENTS.UPGRADE_FAILURE, { 
          plan: 'plus', 
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
          plan: 'plus', 
          error: 'Stripe not initialized' 
        });
        return;
      }

      const priceId = premiumPlan.priceId;
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
          plan: 'plus', 
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
          plan: 'plus', 
          error: result.error.message 
        });
      }
    } catch (error: any) {
      console.error("Checkout error caught:", error);
      setErrorMessage(error.message || "Unable to initiate checkout. Please try again.");
      logAnalyticsEvent(ANALYTICS_EVENTS.UPGRADE_FAILURE, { 
        plan: 'plus', 
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
    <View style={styles.container}>
      <Text style={styles.title}>Upgrade to Premium</Text>
      
      <View style={styles.planCard}>
        <Text style={styles.planTitle}>{premiumPlan.description}</Text>
        <Text style={styles.planPrice}>${premiumPlan.price}/month</Text>
        
        <View style={styles.featureList}>
          {premiumPlan.features.map((feature, idx) => (
            <View key={idx} style={styles.featureItem}>
              <Text style={styles.featureText}>• {feature.name}</Text>
            </View>
          ))}
        </View>
      </View>

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
            {isLoading ? "Processing..." : "Buy Now"}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 20, // text-xl equivalent (~20px)
    fontWeight: '600', // font-semibold
    color: '#000000',
    marginBottom: 24,
    textAlign: 'center',
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24, // 2xl rounded corners
    padding: 32, // Increased vertical padding
    width: '100%',
    maxWidth: 400,
    marginBottom: 24,
    alignItems: 'center',
    // Add soft shadow
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4, // For Android
  },
  planTitle: {
    fontSize: 18, // text-base equivalent (~18px) 
    fontWeight: '500', // font-medium
    color: '#000000',
    marginBottom: 16, // Increased spacing
    textAlign: 'center',
  },
  planPrice: {
    fontSize: 30, // text-3xl equivalent (~30px)
    fontWeight: 'bold', // font-bold
    color: '#000000',
    marginBottom: 20, // Increased spacing
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
    fontWeight: '500', // font-medium
    color: '#333333',
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
});
