import { useState, useEffect, useRef } from "react";
import { loadStripe } from "@stripe/stripe-js";
import stripeConfig from "../lib/stripeConfig";
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, Image } from "react-native";
import { router } from "expo-router";
import { logAnalyticsEvent, ANALYTICS_EVENTS } from "../lib/analytics";
import { useUserProfile } from "../contexts/UserProfileContext";
import { CheckCircle, Shield, Zap, Clock } from "lucide-react-native";

// Initialize Stripe.js with the configuration, handling missing publishable key gracefully
const stripePromise = stripeConfig.publishableKey
  ? loadStripe(stripeConfig.publishableKey)
  : null;

// Base URL for your API
const API_BASE_URL = "https://app.safedoseai.com";

// Get screen dimensions for responsive design
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function PricingPage() {
  const { profile } = useUserProfile();
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  // Updated pricing plans with new 4-tier structure and Stripe Price IDs
  const pricingPlansData = [
    {
      id: 'starter_monthly',
      name: "Starter",
      price: 4.99,
      priceSuffix: "/month",
      subtext: "20 saved doses, 10 AI scans",
      priceId: 'price_1RYgx7AY2p4W374YR9UxS0vr',
      badgeText: "Entry Level",
      isDefault: false,
      planType: 'starter',
      isMonthly: true,
    },
    {
      id: 'starter_yearly',
      name: "Starter",
      price: 44.99,
      originalPrice: 59.88,
      priceSuffix: "/year",
      subtext: "Save 25%",
      priceId: 'price_1RYgx7AY2p4W374Yy23EtyIm',
      badgeText: "Entry Level",
      isDefault: false,
      savings: 25,
      planType: 'starter',
      isMonthly: false,
    },
    {
      id: 'basic_pro_monthly',
      name: "Basic Pro",
      price: 9.99,
      priceSuffix: "/month",
      subtext: "Unlimited logs, 20 AI scans",
      priceId: 'price_1RYgyPAY2p4W374YNbpBpbqv',
      badgeText: "Popular",
      isDefault: true,
      planType: 'basic_pro',
      isMonthly: true,
    },
    {
      id: 'basic_pro_yearly',
      name: "Basic Pro",
      price: 89.99,
      originalPrice: 119.88,
      priceSuffix: "/year",
      subtext: "Save 25%",
      priceId: 'price_1RYgyPAY2p4W374YJOhwDafY',
      badgeText: "Popular",
      isDefault: false,
      savings: 25,
      planType: 'basic_pro',
      isMonthly: false,
    },
    {
      id: 'full_pro_monthly',
      name: "Full Pro",
      price: 20,
      priceSuffix: "/month",
      subtext: "7-day free trial",
      priceId: 'price_1RUHgxAY2p4W374Yb5EWEtZ0',
      badgeText: "Best Value",
      isDefault: false,
      planType: 'full_pro',
      isMonthly: true,
      hasTrial: true,
    },
    {
      id: 'full_pro_yearly',
      name: "Full Pro",
      price: 179.99,
      originalPrice: 240,
      priceSuffix: "/year",
      subtext: "7-day free trial, Save 25%",
      priceId: 'price_1RYgzUAY2p4W374YHiBBHvuX',
      badgeText: "Best Value",
      isDefault: false,
      savings: 25,
      planType: 'full_pro',
      isMonthly: false,
      hasTrial: true,
    },
  ];

  // Key features for compact display - updated for new pricing structure
  const getKeyFeatures = (planType) => {
    switch (planType) {
      case 'starter':
        return [
          { icon: Zap, text: "10 AI scans/month", color: "#FF6B6B" },
          { icon: CheckCircle, text: "20 saved doses", color: "#4ECDC4" },
          { icon: Clock, text: "Manual calculations", color: "#45B7D1" },
          { icon: Shield, text: "Basic support", color: "#96CEB4" },
        ];
      case 'basic_pro':
        return [
          { icon: Zap, text: "20 AI scans/month", color: "#FF6B6B" },
          { icon: CheckCircle, text: "Unlimited logs", color: "#4ECDC4" },
          { icon: Clock, text: "Manual calculations", color: "#45B7D1" },
          { icon: Shield, text: "Priority support", color: "#96CEB4" },
        ];
      case 'full_pro':
        return [
          { icon: Zap, text: "Unlimited AI scans", color: "#FF6B6B" },
          { icon: CheckCircle, text: "Unlimited logs", color: "#4ECDC4" },
          { icon: Clock, text: "Priority processing", color: "#45B7D1" },
          { icon: Shield, text: "Premium support", color: "#96CEB4" },
        ];
      default:
        return [
          { icon: Zap, text: "3 AI scans/month", color: "#FF6B6B" },
          { icon: CheckCircle, text: "10 saved doses", color: "#4ECDC4" },
          { icon: Clock, text: "Manual calculations", color: "#45B7D1" },
          { icon: Shield, text: "Basic support", color: "#96CEB4" },
        ];
    }
  };

  // Dynamic headline based on user profile
  const getPersonalizedHeadline = () => {
    if (profile?.isLicensedProfessional) {
      return "Professional Tools for Accurate Dosing";
    } else if (profile?.isPersonalUse && !profile?.isCosmeticUse) {
      return "Safe, Reliable Dose Calculations";
    } else {
      return "Precision Dosing Made Simple";
    }
  };

  const defaultPlan = pricingPlansData.find(plan => plan.isDefault) || pricingPlansData[0];
  const [selectedPlan, setSelectedPlan] = useState(defaultPlan);
  const [selectedPlanType, setSelectedPlanType] = useState(defaultPlan.planType);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Get current key features based on selected plan type
  const keyFeatures = getKeyFeatures(selectedPlanType);

  // Log view_pricing_page event when component mounts
  useEffect(() => {
    logAnalyticsEvent(ANALYTICS_EVENTS.VIEW_PRICING_PAGE);
    
    // Start entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Start pulse animation for icon
    const pulseLoop = () => {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(() => pulseLoop());
    };
    
    const pulseTimer = setTimeout(pulseLoop, 1000);
    return () => clearTimeout(pulseTimer);
  }, [fadeAnim, scaleAnim, pulseAnim]);

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
        hasTrial: selectedPlan.hasTrial,
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
            hasTrial: selectedPlan.hasTrial,
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
    <Animated.View 
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      {/* App Icon with Pulse Animation */}
      <Animated.View style={[styles.iconContainer, { transform: [{ scale: pulseAnim }] }]}>
        <View style={styles.iconBackground}>
          <Image 
            source={require('../assets/images/icon.png')} 
            style={styles.appIcon}
            resizeMode="contain"
          />
        </View>
      </Animated.View>

      {/* Personalized Headline */}
      <Text style={styles.headline}>{getPersonalizedHeadline()}</Text>
      <Text style={styles.subheadline}>Upgrade to unlock premium features</Text>

      {/* Key Features Grid */}
      <View style={styles.featuresContainer}>
        {keyFeatures.map((feature, index) => (
          <View key={index} style={styles.featureItem}>
            <View style={[
              styles.featureIcon, 
              { backgroundColor: feature.color + '20' },
              feature.disabled && styles.featureIconDisabled
            ]}>
              <feature.icon size={screenHeight <= 667 ? 14 : 16} color={feature.color} />
            </View>
            <Text style={[
              styles.featureText,
              feature.disabled && styles.featureTextDisabled
            ]}>{feature.text}</Text>
          </View>
        ))}
      </View>

      {/* Plan Type Selection */}
      <View style={styles.planTypesContainer}>
        {['starter', 'basic_pro', 'full_pro'].map((planType) => {
          const planData = pricingPlansData.find(p => p.planType === planType && p.isMonthly);
          return (
            <TouchableOpacity
              key={planType}
              style={[
                styles.planTypeBox,
                selectedPlanType === planType && styles.selectedPlanTypeBox,
              ]}
              onPress={() => {
                setSelectedPlanType(planType);
                const newPlan = pricingPlansData.find(p => p.planType === planType && p.isMonthly);
                setSelectedPlan(newPlan);
              }}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.planTypeName,
                selectedPlanType === planType && styles.selectedPlanTypeName
              ]}>{planData.name}</Text>
              <Text style={styles.planTypePrice}>${planData.price}/mo</Text>
              {planData.hasTrial && (
                <Text style={styles.planTypeTrialBadge}>Free Trial</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Monthly/Yearly Toggle */}
      <View style={styles.plansContainer}>
        {pricingPlansData.filter(plan => plan.planType === selectedPlanType).map((plan) => (
          <TouchableOpacity
            key={plan.id}
            style={[
              styles.planBox,
              plan.id === selectedPlan.id && styles.selectedPlanBox,
            ]}
            onPress={() => setSelectedPlan(plan)}
            activeOpacity={0.8}
          >
            {plan.badgeText && plan.id === selectedPlan.id && (
              <View style={styles.planBadge}>
                <Text style={styles.badgeText}>{plan.badgeText}</Text>
              </View>
            )}
            
            <Text style={styles.planName}>{plan.isMonthly ? 'Monthly' : 'Yearly'}</Text>
            
            <View style={styles.priceRow}>
              {plan.originalPrice && (
                <Text style={styles.originalPrice}>${plan.originalPrice}</Text>
              )}
              <Text style={styles.planPrice}>${plan.price}</Text>
            </View>
            
            <Text style={styles.planPeriod}>{plan.priceSuffix}</Text>
            <Text style={styles.planSubtext}>{plan.subtext}</Text>
            
            {plan.savings && (
              <View style={styles.savingsContainer}>
                <Text style={styles.savingsText}>Save {plan.savings}%</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Primary CTA */}
      <TouchableOpacity 
        style={styles.ctaButton} 
        onPress={initiateStripeCheckout}
        disabled={isLoading}
        activeOpacity={0.9}
      >
        <Text style={styles.ctaButtonText}>
          {isLoading ? "Processing..." : selectedPlan.hasTrial ? "Start Free Trial" : `Upgrade to ${selectedPlan.name}`}
        </Text>
      </TouchableOpacity>

      {/* Trial Info */}
      <Text style={styles.trialInfo}>
        {selectedPlan.hasTrial 
          ? "7-day free trial • Cancel anytime • No payment required today"
          : `Start with ${selectedPlan.name} plan • Cancel anytime`
        }
      </Text>

      {/* Error Message */}
      {errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : null}

      {/* Footer Actions */}
      <View style={styles.footerActions}>
        <TouchableOpacity onPress={handleCancel}>
          <Text style={styles.footerLink}>Maybe Later</Text>
        </TouchableOpacity>
        
        <View style={styles.footerSeparator} />
        
        <TouchableOpacity>
          <Text style={styles.footerLink}>Restore Purchase</Text>
        </TouchableOpacity>
      </View>

      {/* Privacy Links */}
      <View style={styles.privacyLinks}>
        <TouchableOpacity>
          <Text style={styles.privacyText}>Privacy Policy</Text>
        </TouchableOpacity>
        <Text style={styles.privacySeparator}> • </Text>
        <TouchableOpacity>
          <Text style={styles.privacyText}>Terms of Service</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: screenHeight <= 667 ? 20 : Math.max(50, screenHeight * 0.08), // Further reduced top padding for iPhone SE
    paddingBottom: screenHeight <= 667 ? 10 : 30, // Further reduced bottom padding for iPhone SE
    justifyContent: screenHeight <= 667 ? 'flex-start' : 'space-between', // Change layout strategy for small screens
    alignItems: 'center',
  },

  // App Icon Section
  iconContainer: {
    marginBottom: screenHeight <= 667 ? 8 : 20, // Further reduced margin for iPhone SE
  },
  iconBackground: {
    width: screenHeight <= 667 ? 64 : 80, // Smaller icon for iPhone SE
    height: screenHeight <= 667 ? 64 : 80,
    borderRadius: screenHeight <= 667 ? 16 : 20,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  appIcon: {
    width: screenHeight <= 667 ? 48 : 60, // Smaller icon for iPhone SE
    height: screenHeight <= 667 ? 48 : 60,
  },

  // Headlines
  headline: {
    fontSize: screenHeight <= 667 ? 20 : 24, // Smaller font for iPhone SE
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 6, // Reduced margin
    letterSpacing: -0.5,
  },
  subheadline: {
    fontSize: screenHeight <= 667 ? 14 : 16, // Smaller font for iPhone SE
    color: '#666666',
    textAlign: 'center',
    marginBottom: screenHeight <= 667 ? 16 : 32, // Further reduced margin for iPhone SE
    lineHeight: screenHeight <= 667 ? 18 : 22,
  },

  // Features Section
  featuresContainer: {
    width: '100%',
    marginBottom: screenHeight <= 667 ? 16 : 32, // Further reduced margin for iPhone SE
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: screenHeight <= 667 ? 6 : 12, // Further reduced margin for iPhone SE
    paddingHorizontal: 8,
  },
  featureIcon: {
    width: screenHeight <= 667 ? 28 : 32, // Smaller icons for iPhone SE
    height: screenHeight <= 667 ? 28 : 32,
    borderRadius: screenHeight <= 667 ? 14 : 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureText: {
    fontSize: screenHeight <= 667 ? 14 : 15, // Smaller font for iPhone SE
    color: '#333333',
    fontWeight: '500',
    flex: 1,
  },
  featureIconDisabled: {
    opacity: 0.5,
  },
  featureTextDisabled: {
    opacity: 0.5,
    textDecorationLine: 'line-through',
  },

  // Plan Types Section
  planTypesContainer: {
    width: '100%',
    marginBottom: screenHeight <= 667 ? 12 : 16,
  },
  planTypeBox: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedPlanTypeBox: {
    backgroundColor: '#FFFFFF',
    borderColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  planTypeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1,
  },
  selectedPlanTypeName: {
    color: '#007AFF',
  },
  planTypePrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
    marginRight: 8,
  },
  planTypeTrialBadge: {
    fontSize: 10,
    color: '#34C759',
    fontWeight: '600',
    backgroundColor: '#34C759' + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },

  // Plans Section  
  plansContainer: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: screenHeight <= 667 ? 12 : 24, // Further reduced margin for iPhone SE
    gap: 12,
  },
  planBox: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: screenHeight <= 667 ? 12 : 16, // Reduced padding for iPhone SE
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
    minHeight: screenHeight <= 667 ? 110 : 140, // Reduced height for iPhone SE
  },
  selectedPlanBox: {
    backgroundColor: '#FFFFFF',
    borderColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  planBadge: {
    position: 'absolute',
    top: -8,
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  planName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
    marginTop: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  originalPrice: {
    fontSize: 14,
    color: '#999999',
    textDecorationLine: 'line-through',
    marginRight: 4,
  },
  planPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  planPeriod: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  planSubtext: {
    fontSize: 11,
    color: '#007AFF',
    fontWeight: '500',
    textAlign: 'center',
  },
  savingsContainer: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#34C759',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  savingsText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // CTA Button
  ctaButton: {
    width: '100%',
    backgroundColor: '#007AFF',
    paddingVertical: screenHeight <= 667 ? 14 : 16, // Slightly reduced padding for iPhone SE
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: screenHeight <= 667 ? 8 : 12, // Reduced margin for iPhone SE
    marginTop: screenHeight <= 667 ? 8 : 0, // Add small top margin for iPhone SE
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.3,
  },

  // Trial Info
  trialInfo: {
    fontSize: screenHeight <= 667 ? 12 : 13, // Smaller font for iPhone SE
    color: '#666666',
    textAlign: 'center',
    marginBottom: screenHeight <= 667 ? 12 : 20, // Reduced margin for iPhone SE
    lineHeight: screenHeight <= 667 ? 16 : 18,
  },

  // Error
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
    paddingHorizontal: 16,
  },

  // Footer
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: screenHeight <= 667 ? 8 : 16, // Reduced margin for iPhone SE
  },
  footerLink: {
    color: '#007AFF',
    fontSize: screenHeight <= 667 ? 14 : 15, // Smaller font for iPhone SE
    fontWeight: '500',
  },
  footerSeparator: {
    width: 1,
    height: 16,
    backgroundColor: '#E5E5EA',
    marginHorizontal: 16,
  },

  // Privacy
  privacyLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: screenHeight <= 667 ? 10 : 0, // Add small bottom margin for iPhone SE
  },
  privacyText: {
    color: '#8E8E93',
    fontSize: 12,
  },
  privacySeparator: {
    color: '#8E8E93',
    fontSize: 12,
  },

  // Badge text (shared)
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
