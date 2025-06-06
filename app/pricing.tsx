import { useState, useEffect, useRef } from "react";
import { loadStripe } from "@stripe/stripe-js";
import stripeConfig from "../lib/stripeConfig";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, ActivityIndicator, Dimensions } from "react-native";
import { router } from "expo-router";
import { logAnalyticsEvent, ANALYTICS_EVENTS } from "../lib/analytics";
import { useUserProfile } from "../contexts/UserProfileContext";
import { CheckCircle, Shield, Star, Clock, Zap } from "lucide-react-native";

// Initialize Stripe.js with the configuration, handling missing publishable key gracefully
const stripePromise = stripeConfig.publishableKey
  ? loadStripe(stripeConfig.publishableKey)
  : null;

// Base URL for your API
const API_BASE_URL = "https://app.safedoseai.com";

// Get screen dimensions for mobile-first responsive design
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function PricingPage() {
  const { profile } = useUserProfile();
  
  // Enhanced pricing plans with mobile-first design specifications
  const pricingPlansData = [
    {
      id: 'monthly',
      name: "Plus Plan",
      price: 20,
      originalPrice: 25,
      priceSuffix: "/month",
      subtext: "Perfect for regular users",
      priceId: stripeConfig.priceId,
      features: [
        { name: "50 AI scans per month", available: true, icon: "scan" },
        { name: "Unlimited manual calculations", available: true, icon: "calculator" },
        { name: "Priority scan processing", available: true, icon: "speed" },
        { name: "No session limits", available: true, icon: "unlimited" },
      ],
      badgeText: "Most Popular",
      isDefault: true,
      savings: 20,
      backgroundColor: '#FFFFFF',
      isPrimary: true,
    },
    {
      id: 'yearly',
      name: "Pro Plan",
      price: 149.99,
      originalPrice: 240,
      priceSuffix: "/year",
      subtext: "Best value for professionals",
      priceId: 'price_yearly_placeholder',
      features: [
        { name: "500 AI scans per month", available: true, icon: "scan" },
        { name: "Unlimited manual calculations", available: true, icon: "calculator" },
        { name: "Lightning-fast processing", available: true, icon: "speed" },
        { name: "Professional features", available: true, icon: "pro" },
      ],
      badgeText: "SAVE 38%",
      isDefault: false,
      savings: 38,
      backgroundColor: '#1F2937',
      isPrimary: false,
    },
  ];

  const defaultPlan = pricingPlansData.find(plan => plan.isDefault) || pricingPlansData[0];
  const [selectedPlan, setSelectedPlan] = useState(defaultPlan);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showCloseSpinner, setShowCloseSpinner] = useState(false);
  
  // Animation refs
  const iconPulseAnim = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const planScaleAnim = useRef(new Animated.Value(1)).current;
  
  // User state for dynamic content
  const [trialActive] = useState(true); // Would be connected to actual trial status
  const [engagementScore] = useState(0.2); // Would be calculated from user behavior
  
  // Get personalized content based on user profile
  const getPersonalizedHeadline = () => {
    if (!profile) return "Unlock Professional-Grade Dose Calculations";
    
    if (profile.isLicensedProfessional) {
      return "Professional Tools for Accurate Dosing";
    } else if (profile.isPersonalUse && !profile.isCosmeticUse) {
      return "Safe, Reliable Dose Calculations";
    } else {
      return "Precision Dosing Made Simple";
    }
  };

  // Animation effects
  useEffect(() => {
    // App icon pulse animation (every 2 seconds)
    const pulseAnimation = () => {
      Animated.sequence([
        Animated.timing(iconPulseAnim, {
          toValue: 1.1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(iconPulseAnim, {
          toValue: 1.0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    };

    const pulseInterval = setInterval(pulseAnimation, 2000);

    // CTA shimmer animation (every 3 seconds)
    const shimmerAnimation = () => {
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      }).start(() => {
        shimmerAnim.setValue(0);
      });
    };

    const shimmerInterval = setInterval(shimmerAnimation, 3000);

    return () => {
      clearInterval(pulseInterval);
      clearInterval(shimmerInterval);
    };
  }, []);

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
        setErrorMessage(result.error.message || "Payment error occurred");
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
    // Implement 8-second delay with spinner for low engagement users
    if (engagementScore < 0.3) {
      setShowCloseSpinner(true);
      setTimeout(() => {
        setShowCloseSpinner(false);
        router.back();
      }, 8000);
    } else {
      router.back();
    }
  };

  const handlePlanSelection = (plan: any) => {
    // Plan selection animation
    Animated.timing(planScaleAnim, {
      toValue: 1.02,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      Animated.timing(planScaleAnim, {
        toValue: 1.0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });
    
    setSelectedPlan(plan);
  };

  const getFeatureIcon = (iconType: string) => {
    const iconProps = { size: 16, color: '#10B981' };
    switch (iconType) {
      case 'scan': return <Zap {...iconProps} />;
      case 'calculator': return <CheckCircle {...iconProps} />;
      case 'speed': return <Clock {...iconProps} />;
      case 'unlimited': return <Star {...iconProps} />;
      case 'pro': return <Shield {...iconProps} />;
      default: return <CheckCircle {...iconProps} />;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollViewContentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Animated App Icon */}
        <Animated.View 
          style={[
            styles.iconContainer,
            { transform: [{ scale: iconPulseAnim }] }
          ]}
        >
          <View style={styles.appIcon}>
            <Shield size={24} color="#8B5CF6" />
          </View>
        </Animated.View>

        {/* Benefit-focused Headline */}
        <Text style={styles.headline} numberOfLines={2}>
          {getPersonalizedHeadline()}
        </Text>

        {/* Key Features */}
        <View style={styles.featuresContainer}>
          <View style={styles.featureRow}>
            {getFeatureIcon('scan')}
            <Text style={styles.featureText}>AI-powered precision</Text>
          </View>
          <View style={styles.featureRow}>
            {getFeatureIcon('speed')}
            <Text style={styles.featureText}>Instant calculations</Text>
          </View>
          <View style={styles.featureRow}>
            {getFeatureIcon('unlimited')}
            <Text style={styles.featureText}>Professional accuracy</Text>
          </View>
          <View style={styles.featureRow}>
            {getFeatureIcon('pro')}
            <Text style={styles.featureText}>Secure & trusted</Text>
          </View>
        </View>

        {/* Plan Cards */}
        <View style={styles.planCardsContainer}>
          {pricingPlansData.map((plan) => (
            <Animated.View
              key={plan.id}
              style={[
                { transform: [{ scale: planScaleAnim }] }
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.planCard,
                  { backgroundColor: plan.backgroundColor },
                  plan.id === selectedPlan.id && styles.selectedPlanCard,
                ]}
                onPress={() => handlePlanSelection(plan)}
                activeOpacity={0.95}
              >
                {/* Badge */}
                {plan.badgeText && (
                  <View style={[
                    styles.badge,
                    plan.badgeText === "Most Popular" ? styles.popularBadge : styles.savingsBadge
                  ]}>
                    <Text style={styles.badgeText}>{plan.badgeText}</Text>
                  </View>
                )}

                {/* Plan Content */}
                <View style={styles.planHeader}>
                  <Text style={[
                    styles.planName,
                    { color: plan.backgroundColor === '#1F2937' ? '#FFFFFF' : '#1F2937' }
                  ]}>
                    {plan.name}
                  </Text>
                  
                  {/* Pricing with strike-through */}
                  <View style={styles.pricingContainer}>
                    <View style={styles.priceRow}>
                      <Text style={[
                        styles.originalPrice,
                        { color: plan.backgroundColor === '#1F2937' ? '#9CA3AF' : '#6B7280' }
                      ]}>
                        ${plan.originalPrice}
                      </Text>
                      <View style={styles.savingsBox}>
                        <Text style={styles.savingsText}>Save {plan.savings}%</Text>
                      </View>
                    </View>
                    <View style={styles.currentPriceRow}>
                      <Text style={[
                        styles.currentPrice,
                        { color: plan.backgroundColor === '#1F2937' ? '#FFFFFF' : '#1F2937' }
                      ]}>
                        ${plan.price}
                      </Text>
                      <Text style={[
                        styles.priceSuffix,
                        { color: plan.backgroundColor === '#1F2937' ? '#D1D5DB' : '#6B7280' }
                      ]}>
                        {plan.priceSuffix}
                      </Text>
                    </View>
                  </View>
                  
                  <Text style={[
                    styles.planSubtext,
                    { color: plan.backgroundColor === '#1F2937' ? '#D1D5DB' : '#6B7280' }
                  ]}>
                    {plan.subtext}
                  </Text>
                </View>

                {/* Features */}
                <View style={styles.planFeatures}>
                  {plan.features.map((feature, index) => (
                    <View key={index} style={styles.planFeatureRow}>
                      {getFeatureIcon(feature.icon)}
                      <Text style={[
                        styles.planFeatureText,
                        { color: plan.backgroundColor === '#1F2937' ? '#E5E7EB' : '#374151' }
                      ]}>
                        {feature.name}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Selection Indicator */}
                <View style={styles.selectionContainer}>
                  <Text style={[
                    styles.selectionText,
                    plan.id === selectedPlan.id && styles.selectedText,
                    { color: plan.backgroundColor === '#1F2937' ? '#FFFFFF' : '#8B5CF6' }
                  ]}>
                    {plan.id === selectedPlan.id ? "✓ Selected" : "Select Plan"}
                  </Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        {/* Trust Elements */}
        <View style={styles.trustContainer}>
          <View style={styles.securityBadge}>
            <Shield size={16} color="#10B981" />
            <Text style={styles.securityText}>SSL Secured • PCI Compliant</Text>
          </View>
          
          <View style={styles.footerLinks}>
            <TouchableOpacity style={styles.footerLink}>
              <Text style={styles.footerLinkText}>Privacy Policy</Text>
            </TouchableOpacity>
            <Text style={styles.footerSeparator}>•</Text>
            <TouchableOpacity style={styles.footerLink}>
              <Text style={styles.footerLinkText}>Terms</Text>
            </TouchableOpacity>
            <Text style={styles.footerSeparator}>•</Text>
            <TouchableOpacity style={styles.footerLink}>
              <Text style={styles.footerLinkText}>Restore Purchase</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.storeLogos}>
            <Text style={styles.storeText}>Available on App Store & Google Play</Text>
          </View>
        </View>

        {/* Error Message */}
        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}

        {/* Spacing for sticky button */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Sticky CTA Button */}
      <View style={styles.stickyCtaContainer}>
        {trialActive && (
          <Text style={styles.noPaymentText}>No payment required today</Text>
        )}
        
        <Animated.View
          style={[
            styles.ctaButtonContainer,
            {
              opacity: shimmerAnim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [1, 0.8, 1],
              }),
            },
          ]}
        >
          <TouchableOpacity 
            style={styles.ctaButton} 
            onPress={initiateStripeCheckout}
            disabled={isLoading}
            activeOpacity={0.9}
          >
            <Text style={styles.ctaButtonText}>
              {isLoading ? "Processing..." : "🎉 Continue"}
            </Text>
          </TouchableOpacity>
        </Animated.View>
        
        <Text style={styles.cancelAnytimeText}>Cancel anytime</Text>
        
        <TouchableOpacity 
          style={styles.cancelButton} 
          onPress={handleCancel}
          disabled={showCloseSpinner}
        >
          {showCloseSpinner ? (
            <ActivityIndicator size="small" color="#8E8E93" />
          ) : (
            <Text style={styles.cancelButtonText}>Close</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    maxHeight: screenHeight * 0.9, // 90% viewport height
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContentContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 120, // Space for sticky CTA
  },
  
  // Animated App Icon
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  appIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Benefit-focused Headline
  headline: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 34,
    paddingHorizontal: 8,
  },
  
  // Key Features Section
  featuresContainer: {
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingLeft: 8,
  },
  featureText: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 12,
    fontWeight: '500',
  },
  
  // Plan Cards Container
  planCardsContainer: {
    marginBottom: 32,
  },
  planCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    maxHeight: screenHeight * 0.4, // Max 40% screen height
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  selectedPlanCard: {
    borderWidth: 2,
    borderColor: '#8B5CF6',
    shadowOpacity: 0.2,
    elevation: 8,
  },
  
  // Badge Styles
  badge: {
    position: 'absolute',
    top: -8,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    zIndex: 1,
  },
  popularBadge: {
    backgroundColor: '#8B5CF6',
  },
  savingsBadge: {
    backgroundColor: '#10B981',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  // Plan Header
  planHeader: {
    marginBottom: 20,
  },
  planName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  
  // Pricing Container with Strike-through
  pricingContainer: {
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  originalPrice: {
    fontSize: 16,
    textDecorationLine: 'line-through',
    marginRight: 12,
  },
  savingsBox: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  savingsText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: 'bold',
  },
  currentPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currentPrice: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  priceSuffix: {
    fontSize: 16,
    marginLeft: 4,
    fontWeight: '500',
  },
  planSubtext: {
    fontSize: 14,
    marginTop: 4,
  },
  
  // Plan Features
  planFeatures: {
    marginBottom: 20,
  },
  planFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  planFeatureText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  
  // Selection Container
  selectionContainer: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  selectionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  selectedText: {
    color: '#8B5CF6',
  },
  
  // Trust Elements
  trustContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
  },
  securityText: {
    fontSize: 12,
    color: '#166534',
    marginLeft: 6,
    fontWeight: '500',
  },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  footerLink: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 44, // Accessibility minimum touch target
    minHeight: 44,
    justifyContent: 'center',
  },
  footerLinkText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  footerSeparator: {
    fontSize: 12,
    color: '#D1D5DB',
    marginHorizontal: 4,
  },
  storeLogos: {
    alignItems: 'center',
  },
  storeText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  
  // Error Message
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  
  // Bottom spacing for sticky button
  bottomSpacing: {
    height: 20,
  },
  
  // Sticky CTA Container
  stickyCtaContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16, // 32px total padding (16px each side)
    paddingTop: 16,
    paddingBottom: 34, // Safe area bottom padding
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  noPaymentText: {
    fontSize: 12,
    color: '#059669',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '500',
  },
  ctaButtonContainer: {
    marginBottom: 8,
  },
  ctaButton: {
    backgroundColor: '#8B5CF6',
    height: 56, // Specified height
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    minWidth: 44, // Accessibility minimum
    minHeight: 44,
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelAnytimeText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    paddingVertical: 12,
    alignItems: 'center',
    minWidth: 44, // Accessibility minimum
    minHeight: 44,
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#8E8E93',
    fontSize: 14,
    fontWeight: '500',
  },
});
