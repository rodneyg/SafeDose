import { useState, useEffect, useRef } from "react";
import { loadStripe } from "@stripe/stripe-js";
import stripeConfig from "../lib/stripeConfig";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Animated, Easing, ActivityIndicator, Platform } from "react-native";
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
      originalPrice: 240, // Added original price (20 * 12)
      subtext: "Best value for long-term access.", // Updated subtext
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
  const [isTrialActive, setIsTrialActive] = useState(true); // Simulate trial active

  const [showCloseSpinner, setShowCloseSpinner] = useState(false);
  const [isClosingProcessActive, setIsClosingProcessActive] = useState(false);
  const closeTimerId = useRef<NodeJS.Timeout | null>(null);

  const iconAnimatedValue = useRef(new Animated.Value(1)).current;
  const shimmerAnimatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Icon animation
    const iconAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(iconAnimatedValue, {
          toValue: 1.2,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(iconAnimatedValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    iconAnimation.start();

    // Shimmer animation for CTA
    const shimmerAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnimatedValue, {
          toValue: 1,
          duration: 800, // Slightly faster for shimmer
          easing: Easing.linear,
          useNativeDriver: false, // backgroundColor animation not supported by native driver
        }),
        Animated.timing(shimmerAnimatedValue, {
          toValue: 0,
          duration: 800,
          easing: Easing.linear,
          useNativeDriver: false,
        }),
      ]),
      { iterations: -1 } // Loop indefinitely
    );
    shimmerAnimation.start();

    return () => {
      iconAnimation.stop();
      iconAnimatedValue.setValue(1);
      shimmerAnimation.stop();
      shimmerAnimatedValue.setValue(0);
      if (closeTimerId.current) {
        clearTimeout(closeTimerId.current);
      }
    };
  }, [iconAnimatedValue, shimmerAnimatedValue]); // Removed closeTimerId from deps, managed by ref

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

  const animatedShimmerStyle = {
    backgroundColor: shimmerAnimatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: ['#8B5CF6', '#A47CF8'], // Normal to lighter purple
    }),
  };

  const handleDelayedClose = () => {
    if (isClosingProcessActive) {
      return;
    }
    setIsClosingProcessActive(true);
    setShowCloseSpinner(true);

    closeTimerId.current = setTimeout(() => {
      router.back();
      // Reset states, important if user navigates back to this page
      setShowCloseSpinner(false);
      setIsClosingProcessActive(false);
      closeTimerId.current = null;
    }, 8000); // 8 seconds
  };

  return (
    <View style={styles.pageContainer}>
      <View style={styles.headerCloseButtonContainer}>
        <TouchableOpacity onPress={handleDelayedClose} disabled={isClosingProcessActive && showCloseSpinner} style={styles.closeButton}>
          {showCloseSpinner ? (
            <ActivityIndicator size="small" color="#333333" />
          ) : (
            <Text style={styles.closeButtonText}>✕</Text>
          )}
        </TouchableOpacity>
      </View>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContentContainer}
      >
        {/* Add a spacer view at the top of ScrollView if close button is absolute and overlays content */}
        {/* This spacer would be roughly the height of the close button area */}
        <View style={{ height: Platform.OS === 'ios' ? 40 : 20 }} />
        <Animated.Image
          source={require('../assets/images/icon.png')}
          style={[styles.headerIcon, { transform: [{ scale: iconAnimatedValue }] }]}
        />
        <Text style={styles.benefitCta}>Unlock Accurate Dosing, Instantly!</Text>
        <Text style={styles.title}>Choose Your Plan</Text>

        <View style={styles.mainFeatureListContainer}>
          <Text style={styles.mainFeatureListItem}>✅ Unlimited AI-powered medication scans</Text>
          <Text style={styles.mainFeatureListItem}>✅ Blazing fast calculation results</Text>
          <Text style={styles.mainFeatureListItem}>✅ Access to all advanced features</Text>
          <Text style={styles.mainFeatureListItem}>✅ Priority customer support</Text>
        </View>

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
                styles.badgeContainer,
                plan.badgeText === "Most Popular" ? styles.mostPopularBadge : styles.discountBadge
              ]}>
                <Text style={styles.badgeText}>{plan.badgeText}</Text>
              </View>
            )}
            <Text style={styles.planName}>{plan.name}</Text>
            <View style={styles.priceContainer}>
              {plan.originalPrice && (
                <Text style={styles.originalPriceText}>
                  ${plan.originalPrice.toFixed(2)}
                </Text>
              )}
              <Text style={styles.planPrice}>${plan.price.toFixed(2)}</Text>
              <Text style={styles.planPriceSuffix}>{plan.priceSuffix}</Text>
            </View>
            {(plan.subtext !== plan.badgeText || plan.id === 'monthly') && (
              <Text style={styles.planSubtext}>{plan.subtext}</Text>
            )}
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
      </ScrollView>

      <View style={styles.stickyButtonOuterContainer}>
        <View style={styles.stickyButtonInnerContainer}>
          {isTrialActive && (
            <Text style={styles.trialNoticeText}>
              ✓ No payment required today
            </Text>
          )}
          {selectedPlan.id === 'monthly' && (
            <Text style={styles.ctaSubtext}>1 week free trial, then $20/month</Text>
          )}
          <Animated.View style={[styles.upgradeButton, animatedShimmerStyle]}>
            <TouchableOpacity onPress={initiateStripeCheckout} disabled={isLoading} style={styles.touchableOpacityFull}>
              <Text style={styles.buttonText}>
                {isLoading ? "Processing..." : "🙌 Continue"}
              </Text>
            </TouchableOpacity>
          </Animated.View>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.reassuranceText}>
            Cancel anytime. App Store secured.
          </Text>
          <View style={styles.legalLinksContainer}>
            <Text style={styles.legalLinkText}>Privacy Policy</Text>
            <Text style={styles.legalLinkSeparator}>|</Text>
            <Text style={styles.legalLinkText}>EULA</Text>
            <Text style={styles.legalLinkSeparator}>|</Text>
            <Text style={styles.legalLinkText}>Restore</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pageContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7', // Match default screen background
    // paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0, // Basic status bar handling
  },
  headerCloseButtonContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 44 : 10, // Adjust for status bar, notch etc.
    right: 10,
    zIndex: 10, // Ensure it's above other content
  },
  closeButton: {
    padding: 10,
    borderRadius: 20, // Make it roundish
    backgroundColor: 'rgba(0,0,0,0.05)', // Slight background for visibility
  },
  closeButtonText: {
    fontSize: 18, // Slightly smaller for '✕'
    color: '#333333', // Darker grey for better contrast on light bg
    fontWeight: 'bold',
  },
  scrollView: {
    // flex: 1, // ScrollView will take available space if pageContainer is flex:1 and footer has fixed height
    backgroundColor: '#F2F2F7', // Ensure consistency
  },
  scrollViewContentContainer: {
    padding: 24,
    alignItems: 'center',
    flexGrow: 1,
    paddingBottom: 220, // Slightly increased padding for new footer text
  },
  headerIcon: {
    width: 60,
    height: 60,
    marginBottom: 16,
    // alignSelf: 'center', // Not strictly necessary due to parent alignItems: 'center'
                         // but good for clarity if this component was ever moved.
  },
  benefitCta: {
    fontSize: 26, // Larger than title
    fontWeight: 'bold',
    color: '#1F2937', // Darker gray, almost black
    textAlign: 'center',
    marginBottom: 8, // Space before the original title
    paddingHorizontal: 16, // Ensure it doesn't touch edges on smaller screens if text is long
  },
  // container style is now applied to scrollViewContentContainer or scrollView itself
  // We might not need a separate 'container' style anymore, or it can be merged/adjusted.
  // For now, let's assume padding and alignItems are for the content within ScrollView.
  title: {
    fontSize: 20, // text-xl equivalent (~20px)
    fontWeight: '600', // font-semibold
    color: '#000000',
    marginBottom: 16, // Reduced margin as feature list will add space
    textAlign: 'center',
  },
  mainFeatureListContainer: {
    marginBottom: 24, // Space before the plan cards
    paddingHorizontal: 20, // Padding for the container
    width: '100%', // Take full width to center content text
    maxWidth: 400, // Consistent with other elements
    alignItems: 'flex-start', // Align items to the start (left) for list appearance
  },
  mainFeatureListItem: {
    fontSize: 16,
    color: '#374151', // Dark gray
    marginBottom: 8,
    lineHeight: 22, // For better readability
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20, // Slightly smaller radius for a tighter look
    paddingHorizontal: 24, // Reduced horizontal padding
    paddingVertical: 16, // Reduced vertical padding
    width: '100%',
    maxWidth: 400, // Max width remains the same
    marginBottom: 16, // Spacing between cards
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
    top: 10, // Adjust if necessary based on new padding
    right: 10, // Adjust if necessary
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12, // Slightly smaller to match overall compactness
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
    fontSize: 20, // Reduced font size
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6, // Reduced margin
    textAlign: 'center',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline', // Important for aligning normal and strikethrough text
    marginBottom: 6, // Reduced margin
    justifyContent: 'center',
    flexWrap: 'wrap', // Allow price to wrap if it gets too long with original price
  },
  originalPriceText: {
    fontSize: 16,
    color: '#6B7280', // A muted gray
    textDecorationLine: 'line-through',
    marginRight: 8, // Space between strikethrough and actual price
    // Align with the baseline of the main price if possible, or just visually center
  },
  planPrice: {
    fontSize: 36, // Reduced font size
    fontWeight: 'bold',
    color: '#000000',
  },
  planPriceSuffix: {
    fontSize: 16, // Reduced font size
    fontWeight: '500',
    color: '#4B5563',
    marginLeft: 4, // Slightly reduced margin
  },
  planSubtext: {
    fontSize: 13, // Slightly reduced font size for compactness
    color: '#4B5563',
    marginBottom: 12, // Reduced margin
    textAlign: 'center',
  },
  featureList: {
    width: '100%', // Keep features full width for alignment
    marginBottom: 12, // Reduced margin
    paddingHorizontal: 8, // Add some padding so text isn't wall-to-wall
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6, // Reduced margin
  },
  featureText: {
    fontSize: 14, // Reduced font size for compactness
    fontWeight: '500',
    color: '#374151',
    marginLeft: 4, // Space after bullet/icon if one was used in data
  },
  selectionIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16, // Reduced margin
    paddingVertical: 8, // Reduced padding
    borderRadius: 10, // Slightly smaller
    width: '80%',
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
  stickyButtonOuterContainer: {
    paddingVertical: 20, // Ample padding
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF', // White background for the footer area
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0', // Softer border color
    // shadowColor: '#000', // Optional: shadow for footer
    // shadowOffset: { width: 0, height: -2 },
    // shadowOpacity: 0.1,
    // shadowRadius: 4,
    // elevation: 5,
  },
  stickyButtonInnerContainer: {
    width: '100%',
    maxWidth: 400, // Max width for content within footer
    alignSelf: 'center',
    gap: 12, // Spacing between elements in the footer
    flexDirection: 'column',
  },
  // upgradeButton is now an Animated.View, TouchableOpacity is inside
  upgradeButton: {
    // backgroundColor is now animated via animatedShimmerStyle
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    // marginBottom: 12, // Removed as gap in stickyButtonInnerContainer handles it
    // Shadow properties can remain if desired, but ensure they look good with animation
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden', // For borderRadius with TouchableOpacity inside
  },
  touchableOpacityFull: { // To make touch target full size of Animated.View
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16, // This padding was originally on upgradeButton, move to touchable for hit area
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
    color: '#555555',
    textAlign: 'center',
    // marginTop and marginBottom handled by gap in stickyButtonInnerContainer
  },
  trialNoticeText: {
    fontSize: 14,
    color: '#10B981', // Green color, consistent with discount/savings
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 12, // Space before the main CTA button
  },
  reassuranceText: {
    fontSize: 12,
    color: '#6B7280', // Muted grey
    textAlign: 'center',
    // marginTop handled by gap in stickyButtonInnerContainer
  },
  legalLinksContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 0, // Relies on gap from parent, or adjust if too much space
    flexWrap: 'wrap',
  },
  legalLinkText: {
    fontSize: 11, // Made slightly smaller
    color: '#007AFF', // Standard iOS blue for links
    marginHorizontal: 6, // Increased spacing around links
  },
  legalLinkSeparator: {
    fontSize: 11, // Match link text
    color: '#AEAEB2', // Lighter grey for separator
    marginHorizontal: 2,
  },
});
