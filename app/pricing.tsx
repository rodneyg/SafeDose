import { useState, useEffect, useRef } from "react";
import { loadStripe } from "@stripe/stripe-js";
import stripeConfig from "../lib/stripeConfig";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import { logAnalyticsEvent, ANALYTICS_EVENTS } from "../lib/analytics";
import { useUserProfile } from "../contexts/UserProfileContext";

// Initialize Stripe.js with the configuration, handling missing publishable key gracefully
const stripePromise = stripeConfig.publishableKey
  ? loadStripe(stripeConfig.publishableKey)
  : null;

// Base URL for your API
const API_BASE_URL = "https://app.safedoseai.com";

// Animated Header Icon Component
function AnimatedHeaderIcon() {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const createPulseAnimation = () => {
      return Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]);
    };

    const intervalId = setInterval(() => {
      createPulseAnimation().start();
    }, 2000); // Every 2 seconds

    return () => clearInterval(intervalId);
  }, [pulseAnim]);

  return (
    <Animated.View style={[styles.headerIcon, { transform: [{ scale: pulseAnim }] }]}>
      <Text style={styles.headerIconText}>💊</Text>
    </Animated.View>
  );
}

export default function PricingPage() {
  const { profile } = useUserProfile();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  
  const pricingPlansData = [
    {
      id: 'weekly',
      name: "Weekly",
      price: 7.99,
      originalPrice: 12.99,
      priceSuffix: "/week",
      subtext: "Perfect for trying SafeDose",
      priceId: stripeConfig.priceId, // Using existing config
      features: [
        { name: "12 AI scans/week", available: true },
        { name: "Unlimited manual calculations", available: true },
        { name: "Faster scans", available: true },
      ],
      badgeText: null, 
      isDefault: true,
      savingsPercent: 38,
    },
    {
      id: 'yearly',
      name: "Yearly",
      price: 149.99,
      originalPrice: 239.99,
      priceSuffix: "/year",
      subtext: "Best value for regular users",
      priceId: 'price_yearly_placeholder',
      features: [
        { name: "Unlimited AI scans", available: true },
        { name: "Unlimited manual calculations", available: true },
        { name: "Faster scans", available: true },
        { name: "Priority support", available: true },
      ],
      badgeText: "SAVE 37%",
      isDefault: false,
      savingsPercent: 37,
    },
  ];

  const defaultPlan = pricingPlansData.find(plan => plan.isDefault) || pricingPlansData[0];
  const [selectedPlan, setSelectedPlan] = useState(defaultPlan);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showCloseDelay, setShowCloseDelay] = useState(false);
  const [closeDelaySeconds, setCloseDelaySeconds] = useState(8);

  // Shimmer animation for CTA button
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  // Log view_pricing_page event when component mounts
  useEffect(() => {
    logAnalyticsEvent(ANALYTICS_EVENTS.VIEW_PRICING_PAGE);
    console.warn(
      "TODO: Replace placeholder Stripe Price IDs ('price_yearly_placeholder') in pricingPlansData with actual Price IDs from your Stripe dashboard."
    );

    // Start shimmer animation
    const shimmerAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    shimmerAnimation.start();

    return () => shimmerAnimation.stop();
  }, [shimmerAnim]);

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
    // Show close delay if user hasn't engaged much
    if (!showCloseDelay) {
      setShowCloseDelay(true);
      const interval = setInterval(() => {
        setCloseDelaySeconds(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            router.back();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      router.back();
    }
  };

  // Determine if trial is active (simplified logic)
  const isTrialActive = selectedPlan.id === 'weekly' || selectedPlan.price < 50;

  // Get personalized content based on user profile
  const getPersonalizedContent = () => {
    if (!profile) {
      return {
        title: "Choose Your SafeDose Plan",
        subtitle: "Get accurate medication dosing",
      };
    }
    
    if (profile.isLicensedProfessional) {
      return {
        title: "Professional-Grade Dosing",
        subtitle: "Clinical accuracy for healthcare professionals",
      };
    }
    
    if (profile.isPersonalUse) {
      return {
        title: "Safe Home Medication",
        subtitle: "Peace of mind for your family",
      };
    }
    
    return {
      title: "Choose Your SafeDose Plan", 
      subtitle: "Get accurate medication dosing",
    };
  };

  const personalizedContent = getPersonalizedContent();

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContentContainer}>
        {/* Animated Header Icon */}
        <AnimatedHeaderIcon />
        
        {/* Personalized Title */}
        <Text style={styles.title}>{personalizedContent.title}</Text>
        <Text style={styles.subtitle}>{personalizedContent.subtitle}</Text>

        {/* Feature List */}
        <View style={styles.featureListHeader}>
          <View style={styles.featureItemHeader}>
            <Text style={styles.featureIcon}>✓</Text>
            <Text style={styles.featureTextHeader}>AI-powered accuracy</Text>
          </View>
          <View style={styles.featureItemHeader}>
            <Text style={styles.featureIcon}>✓</Text>
            <Text style={styles.featureTextHeader}>Instant results</Text>
          </View>
          <View style={styles.featureItemHeader}>
            <Text style={styles.featureIcon}>✓</Text>
            <Text style={styles.featureTextHeader}>Professional-grade</Text>
          </View>
        </View>

        {/* Plan Cards - Vertical Stack */}
        {pricingPlansData.map((plan) => (
          <TouchableOpacity
            key={plan.id}
            style={[
              styles.planCard,
              plan.id === selectedPlan.id && styles.selectedPlanCard,
              { maxHeight: screenHeight * 0.4 } // 40% screen height max
            ]}
            onPress={() => setSelectedPlan(plan)}
          >
            {plan.badgeText && (
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>{plan.badgeText}</Text>
              </View>
            )}
            <Text style={styles.planName}>{plan.name}</Text>
            
            {/* Price with Strike-through */}
            <View style={styles.priceContainer}>
              {plan.originalPrice && (
                <View style={styles.originalPriceContainer}>
                  <Text style={styles.originalPrice}>${plan.originalPrice.toFixed(2)}</Text>
                  <Text style={styles.savingsBadge}>Save {plan.savingsPercent}%</Text>
                </View>
              )}
              <View style={styles.currentPriceContainer}>
                <Text style={styles.planPrice}>${plan.price.toFixed(2)}</Text>
                <Text style={styles.planPriceSuffix}>{plan.priceSuffix}</Text>
              </View>
            </View>
            
            <Text style={styles.planSubtext}>{plan.subtext}</Text>

            {/* Compact Feature List */}
            <View style={styles.featureList}>
              {plan.features.slice(0, 3).map((feature) => (
                <Text key={feature.name} style={styles.featureText}>• {feature.name}</Text>
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
      </ScrollView>

      {/* Sticky CTA Footer */}
      <View style={styles.stickyFooter}>
        {/* Trial Notice */}
        {isTrialActive && (
          <Text style={styles.trialNotice}>No payment now • 7-day free trial</Text>
        )}
        
        {/* Shimmer CTA Button */}
        <TouchableOpacity 
          style={styles.ctaButton} 
          onPress={initiateStripeCheckout}
          disabled={isLoading}
        >
          <Animated.View 
            style={[
              styles.shimmerOverlay,
              {
                opacity: shimmerAnim,
                transform: [
                  {
                    translateX: shimmerAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-100, 100],
                    }),
                  },
                ],
              },
            ]}
          />
          <Text style={styles.ctaButtonText}>
            {isLoading ? "Processing..." : "🙌 Continue"}
          </Text>
        </TouchableOpacity>

        {/* Trust Elements */}
        <Text style={styles.trustText}>Cancel anytime • App Store secured</Text>
        
        {/* Legal Links */}
        <View style={styles.legalLinks}>
          <TouchableOpacity>
            <Text style={styles.legalLink}>Privacy Policy</Text>
          </TouchableOpacity>
          <Text style={styles.legalSeparator}>•</Text>
          <TouchableOpacity>
            <Text style={styles.legalLink}>EULA</Text>
          </TouchableOpacity>
          <Text style={styles.legalSeparator}>•</Text>
          <TouchableOpacity>
            <Text style={styles.legalLink}>Restore</Text>
          </TouchableOpacity>
        </View>

        {/* Close Button with Optional Delay */}
        <TouchableOpacity style={styles.closeButton} onPress={handleCancel}>
          <Text style={styles.closeButtonText}>
            {showCloseDelay ? `Close (${closeDelaySeconds}s)` : "Close"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContentContainer: {
    padding: 20,
    paddingBottom: 200, // Space for sticky footer
  },
  
  // Header Animation
  headerIcon: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerIconText: {
    fontSize: 48,
    textAlign: 'center',
  },
  
  // Titles
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  
  // Header Feature List
  featureListHeader: {
    marginBottom: 32,
    alignItems: 'center',
  },
  featureItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureIcon: {
    fontSize: 16,
    color: '#10B981',
    marginRight: 8,
    fontWeight: '600',
  },
  featureTextHeader: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  
  // Plan Cards - Mobile First
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    position: 'relative',
    // Shadows
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  selectedPlanCard: {
    borderColor: '#8B5CF6',
    backgroundColor: '#FAFBFF',
    elevation: 6,
    shadowOpacity: 0.15,
  },
  
  // Badge
  badgeContainer: {
    position: 'absolute',
    top: -8,
    right: 16,
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Plan Details
  planName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 12,
  },
  
  // Pricing with Strike-through
  priceContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  originalPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  originalPrice: {
    fontSize: 16,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
    marginRight: 8,
  },
  savingsBadge: {
    backgroundColor: '#FEF3C7',
    color: '#D97706',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  currentPriceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  planPrice: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1F2937',
  },
  planPriceSuffix: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
    marginLeft: 4,
  },
  
  planSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  
  // Compact Feature List
  featureList: {
    marginBottom: 16,
  },
  featureText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  
  // Selection Indicator
  selectionIndicatorContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  selectionIndicator: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  selectedIndicatorText: {
    color: '#8B5CF6',
  },
  
  // Error
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 16,
  },
  
  // Sticky Footer
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    // Shadows
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  
  // Trial Notice
  trialNotice: {
    fontSize: 14,
    color: '#10B981',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 12,
  },
  
  // CTA Button with Shimmer
  ctaButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 16,
    paddingVertical: 16,
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 12,
    // Shadows
    shadowColor: '#8B5CF6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 100,
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  
  // Trust Elements
  trustText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  
  // Legal Links
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  legalLink: {
    fontSize: 12,
    color: '#8B5CF6',
    fontWeight: '500',
  },
  legalSeparator: {
    fontSize: 12,
    color: '#9CA3AF',
    marginHorizontal: 8,
  },
  
  // Close Button
  closeButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  closeButtonText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
});
