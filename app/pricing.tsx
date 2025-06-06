import { useState, useEffect, useRef } from "react";
import { loadStripe } from "@stripe/stripe-js";
import stripeConfig from "../lib/stripeConfig";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from "react-native";
import { router } from "expo-router";
import { logAnalyticsEvent, ANALYTICS_EVENTS } from "../lib/analytics";
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withSequence, 
  withTiming,
  withSpring
} from 'react-native-reanimated';
import { X, Shield, Clock, Star } from 'lucide-react-native';

// Initialize Stripe.js with the configuration, handling missing publishable key gracefully
const stripePromise = stripeConfig.publishableKey
  ? loadStripe(stripeConfig.publishableKey)
  : null;

// Base URL for your API
const API_BASE_URL = "https://app.safedoseai.com";

export default function PricingPage() {
  const pricingPlansData = [
    {
      id: 'weekly',
      name: "Weekly",
      price: 6.99,
      originalPrice: 9.99,
      priceSuffix: "/week",
      subtext: "Perfect for trying out",
      priceId: stripeConfig.priceId, // Existing one
      features: [
        { name: "12 AI scans/week", available: true },
        { name: "Unlimited manual calculations", available: true },
        { name: "Faster scans", available: true },
      ],
      badgeText: "30% OFF",
      isDefault: false,
      hasTrial: true,
    },
    {
      id: 'yearly',
      name: "Yearly",
      price: 149.99,
      originalPrice: 240,
      priceSuffix: "/year",
      subtext: "Best value - save 38%",
      priceId: 'price_yearly_placeholder',
      features: [
        { name: "600 AI scans/year", available: true },
        { name: "Unlimited manual calculations", available: true },
        { name: "Faster scans", available: true },
        { name: "No mid-session limits", available: true },
        { name: "Priority support", available: true },
      ],
      badgeText: "SAVE 38%",
      isDefault: true,
      hasTrial: false,
    },
  ];

  const defaultPlan = pricingPlansData.find(plan => plan.isDefault) || pricingPlansData[0];
  const [selectedPlan, setSelectedPlan] = useState(defaultPlan);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showCloseDelay, setShowCloseDelay] = useState(false);
  const [closeDelayCount, setCloseDelayCount] = useState(8);
  
  // Animation values
  const headerIconScale = useSharedValue(1);
  const shimmerOpacity = useSharedValue(0.5);
  const closeButtonOpacity = useSharedValue(0);
  
  // Get screen dimensions for responsive design
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const isMobile = screenWidth < 768;

  // Log view_pricing_page event when component mounts
  useEffect(() => {
    logAnalyticsEvent(ANALYTICS_EVENTS.VIEW_PRICING_PAGE);
    console.warn(
      "TODO: Replace placeholder Stripe Price IDs ('price_yearly_placeholder') in pricingPlansData with actual Price IDs from your Stripe dashboard."
    );
    
    // Start header icon animation (pulse every 2 seconds)
    headerIconScale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 300 }),
        withTiming(1, { duration: 300 })
      ),
      -1,
      false
    );
    
    // Start shimmer animation
    shimmerOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000 }),
        withTiming(0.5, { duration: 1000 })
      ),
      -1,
      true
    );
    
    // Show close button after 8 seconds
    const closeTimer = setTimeout(() => {
      setShowCloseDelay(true);
      closeButtonOpacity.value = withSpring(1);
    }, 8000);
    
    return () => {
      clearTimeout(closeTimer);
    };
  }, []);
  
  // Close delay countdown
  useEffect(() => {
    if (showCloseDelay && closeDelayCount > 0) {
      const timer = setTimeout(() => {
        setCloseDelayCount(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [showCloseDelay, closeDelayCount]);

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
        setErrorMessage(result.error.message || "An error occurred");
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
  
  // Animated styles
  const animatedHeaderIconStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: headerIconScale.value }],
    };
  });
  
  const animatedShimmerStyle = useAnimatedStyle(() => {
    return {
      opacity: shimmerOpacity.value,
    };
  });
  
  const animatedCloseButtonStyle = useAnimatedStyle(() => {
    return {
      opacity: closeButtonOpacity.value,
    };
  });

  return (
    <View style={styles.container}>
      {/* Close button with delay */}
      <Animated.View style={[styles.closeButtonContainer, animatedCloseButtonStyle]}>
        <TouchableOpacity style={styles.closeButton} onPress={handleCancel}>
          <X size={24} color="#666" />
          {closeDelayCount > 0 && (
            <Text style={styles.closeDelayText}>{closeDelayCount}</Text>
          )}
        </TouchableOpacity>
      </Animated.View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with animated icon */}
        <View style={styles.header}>
          <Animated.View style={[styles.iconContainer, animatedHeaderIconStyle]}>
            <Shield size={48} color="#8B5CF6" />
          </Animated.View>
          <Text style={styles.headline}>Unlock Your Full Potential</Text>
        </View>

        {/* Feature list */}
        <View style={styles.featureSection}>
          <View style={styles.featureItem}>
            <Star size={20} color="#8B5CF6" />
            <Text style={styles.featureText}>AI-powered medication scanning</Text>
          </View>
          <View style={styles.featureItem}>
            <Clock size={20} color="#8B5CF6" />
            <Text style={styles.featureText}>Instant dosage calculations</Text>
          </View>
          <View style={styles.featureItem}>
            <Shield size={20} color="#8B5CF6" />
            <Text style={styles.featureText}>FDA-approved safety checks</Text>
          </View>
        </View>

        {/* Plan cards - compact vertical stack */}
        <View style={styles.planContainer}>
          {pricingPlansData.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              style={[
                styles.planCard,
                plan.id === selectedPlan.id && styles.selectedPlanCard,
              ]}
              onPress={() => setSelectedPlan(plan)}
            >
              {plan.badgeText && (
                <View style={[
                  styles.badge,
                  plan.isDefault ? styles.mostPopularBadge : styles.discountBadge
                ]}>
                  <Text style={styles.badgeText}>{plan.badgeText}</Text>
                </View>
              )}
              
              <View style={styles.planHeader}>
                <Text style={styles.planName}>{plan.name}</Text>
                <View style={styles.priceSection}>
                  {plan.originalPrice && (
                    <Text style={styles.originalPrice}>${plan.originalPrice}</Text>
                  )}
                  <Text style={styles.planPrice}>${plan.price.toFixed(2)}</Text>
                  <Text style={styles.priceSuffix}>{plan.priceSuffix}</Text>
                </View>
                <Text style={styles.planSubtext}>{plan.subtext}</Text>
              </View>

              <View style={styles.featureList}>
                {plan.features.slice(0, 3).map((feature, index) => (
                  <Text key={index} style={styles.compactFeature}>
                    ✓ {feature.name}
                  </Text>
                ))}
              </View>

              <View style={styles.selectionIndicator}>
                <Text style={[
                  styles.selectionText,
                  plan.id === selectedPlan.id && styles.selectedText
                ]}>
                  {plan.id === selectedPlan.id ? "✓ Selected" : "Select"}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}

        {/* Spacer to push footer to bottom on scroll */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Sticky CTA Footer */}
      <View style={styles.stickyFooter}>
        {/* Reassurance text */}
        <Text style={styles.reassuranceText}>
          {selectedPlan.hasTrial 
            ? "✨ No payment now • 7-day free trial" 
            : "🛡️ Cancel anytime • App Store secured"
          }
        </Text>
        
        {/* Main CTA Button with shimmer */}
        <TouchableOpacity 
          style={styles.ctaButton} 
          onPress={initiateStripeCheckout}
          disabled={isLoading}
        >
          <Animated.View style={[styles.shimmerOverlay, animatedShimmerStyle]} />
          <Text style={styles.ctaButtonText}>
            {isLoading ? "Processing..." : "🙌 Continue"}
          </Text>
        </TouchableOpacity>

        {/* Footer links */}
        <View style={styles.footerLinks}>
          <TouchableOpacity>
            <Text style={styles.footerLink}>Privacy Policy</Text>
          </TouchableOpacity>
          <Text style={styles.footerSeparator}>•</Text>
          <TouchableOpacity>
            <Text style={styles.footerLink}>Terms</Text>
          </TouchableOpacity>
          <Text style={styles.footerSeparator}>•</Text>
          <TouchableOpacity>
            <Text style={styles.footerLink}>Restore</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  
  // Close button
  closeButtonContainer: {
    position: 'absolute',
    top: 50,
    right: 16,
    zIndex: 100,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  closeDelayText: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#8B5CF6',
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 20,
  },

  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingTop: 80,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  // Header section
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    marginBottom: 16,
  },
  headline: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    lineHeight: 34,
  },

  // Feature section
  featureSection: {
    marginBottom: 32,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  featureText: {
    fontSize: 16,
    color: '#4B5563',
    marginLeft: 12,
    fontWeight: '500',
  },

  // Plan cards
  planContainer: {
    gap: 12,
    marginBottom: 32,
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
    maxHeight: '40%', // 40% of screen height max
  },
  selectedPlanCard: {
    borderColor: '#8B5CF6',
    backgroundColor: '#F9FAFB',
    shadowOpacity: 0.15,
    elevation: 8,
  },

  // Badge
  badge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  mostPopularBadge: {
    backgroundColor: '#8B5CF6',
  },
  discountBadge: {
    backgroundColor: '#10B981',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },

  // Plan content
  planHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  planName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  priceSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  originalPrice: {
    fontSize: 16,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
    marginRight: 8,
  },
  planPrice: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  priceSuffix: {
    fontSize: 16,
    color: '#6B7280',
    marginLeft: 4,
  },
  planSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },

  // Compact features
  featureList: {
    marginBottom: 16,
  },
  compactFeature: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 4,
    textAlign: 'center',
  },

  // Selection indicator
  selectionIndicator: {
    alignItems: 'center',
  },
  selectionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  selectedText: {
    color: '#8B5CF6',
  },

  // Error message
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },

  // Sticky footer
  stickyFooter: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  
  reassuranceText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 12,
  },

  // CTA Button
  ctaButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },

  // Footer links
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerLink: {
    fontSize: 12,
    color: '#6B7280',
  },
  footerSeparator: {
    fontSize: 12,
    color: '#D1D5DB',
    marginHorizontal: 8,
  },
});
