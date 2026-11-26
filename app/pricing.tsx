import { useState, useEffect, useRef } from "react";
import { getCheckoutStripe } from "../lib/checkoutStripe";
import { useAuth } from "../contexts/AuthContext";
import { billingRequest } from "../lib/subscriptionStatus";
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, Image, Platform } from "react-native";
import { Link, router, useLocalSearchParams } from "expo-router";
import PublicLinks from "../components/PublicLinks";
import UpgradeEmailForm from "../components/UpgradeEmailForm";
import { logAnalyticsEvent, ANALYTICS_EVENTS } from "../lib/analytics";
import { useUserProfile } from "../contexts/UserProfileContext";
import { CheckCircle, Shield, Zap, Clock, LucideIcon } from "lucide-react-native";
import { getApiBaseUrl } from "../lib/apiBase";
import {
  assignPricingDefault,
  pricingEvent,
  type PricingDefault,
} from "../lib/pricingDefault";
import {
  PHOTO_CHECK_MONTHLY_AMOUNT,
  PHOTO_CHECK_ANNUAL_AMOUNT,
  PHOTO_CHECK_ANNUAL_SAVINGS_PERCENT,
  FREE_SCAN_LIMIT,
} from "../lib/plans";



// Get screen dimensions for responsive design
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const pricingPlansData = [
  {
    id: 'photo_check_monthly',
    name: "Photo Scan",
    price: PHOTO_CHECK_MONTHLY_AMOUNT,
    priceSuffix: "/month",
    subtext: "Unlimited photo scans",
    offerKey: 'photo_check_monthly',
    badgeText: "Web",
    planType: 'photo_check',
    isMonthly: true,
    hasTrial: false,
  },
  {
    id: 'photo_check_yearly',
    name: "Photo Scan",
    price: PHOTO_CHECK_ANNUAL_AMOUNT,
    originalPrice: 35.88,
    priceSuffix: "/year",
    subtext: `Save ${PHOTO_CHECK_ANNUAL_SAVINGS_PERCENT}%`,
    offerKey: 'photo_check_annual',
    badgeText: "Best Value",
    savings: PHOTO_CHECK_ANNUAL_SAVINGS_PERCENT,
    planType: 'photo_check',
    isMonthly: false,
    hasTrial: false,
  },
];

const [monthlyPlan, annualPlan] = pricingPlansData;

type PricingPlan = (typeof pricingPlansData)[number];

export default function PricingPage() {
  const { profile } = useUserProfile();
  const { user } = useAuth();
  const { offer } = useLocalSearchParams<{ offer?: string }>();
  const isWeb = Platform.OS === 'web';
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const getKeyFeatures = (planType: string): { icon: LucideIcon; text: string; color: string; disabled?: boolean }[] => {
    if (planType === 'photo_check') {
      return [
        { icon: Zap, text: "Unlimited photo scans", color: "#FF6B6B" },
        { icon: CheckCircle, text: "Calculator stays free", color: "#4ECDC4" },
        { icon: Clock, text: `${FREE_SCAN_LIMIT} photo scans/month on Free`, color: "#45B7D1" },
        { icon: Shield, text: "Web checkout, cancel anytime", color: "#96CEB4" },
      ];
    }
    return [
      { icon: Zap, text: `${FREE_SCAN_LIMIT} AI scans/month`, color: "#FF6B6B" },
      { icon: CheckCircle, text: "Calculator stays free", color: "#4ECDC4" },
      { icon: Clock, text: "Manual calculations", color: "#45B7D1" },
      { icon: Shield, text: "On-device dose logs with a monthly limit", color: "#96CEB4" },
    ];
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

  const [pricingDefault, setPricingDefault] = useState<PricingDefault | null | undefined>(
    isWeb ? undefined : null,
  );
  const [chosenPlan, setChosenPlan] = useState<PricingPlan | null>(null);
  const requestedPlan = pricingPlansData.find(plan => plan.offerKey === offer);
  const selectedPlan = chosenPlan ?? requestedPlan ?? (pricingDefault === 'annual' ? annualPlan : monthlyPlan);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Get current key features based on selected plan type
  const keyFeatures = getKeyFeatures(selectedPlan.planType);

  const pricingViewLogged = useRef(false);
  useEffect(() => {
    if (pricingViewLogged.current) return;
    pricingViewLogged.current = true;
    const arm = isWeb ? assignPricingDefault() : null;
    setPricingDefault(arm);
    logAnalyticsEvent(ANALYTICS_EVENTS.VIEW_PRICING_PAGE);
    if (arm) logAnalyticsEvent(pricingEvent(arm, 'view'));
  }, [isWeb]);

  const selectPlan = (plan: PricingPlan) => {
    setChosenPlan(plan);
    if (pricingDefault) {
      logAnalyticsEvent(pricingEvent(pricingDefault, plan.isMonthly ? 'select_mo' : 'select_yr'));
    }
  };

  useEffect(() => {
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
    if (!user || user.isAnonymous) {
      router.push({ pathname: '/login', params: { from: 'pricing', offer: selectedPlan.offerKey } });
      return;
    }

    logAnalyticsEvent(ANALYTICS_EVENTS.INITIATE_UPGRADE, { plan: selectedPlan.id });
    setIsLoading(true);
    setErrorMessage("");
    try {
      const stripe = await getCheckoutStripe();
      const origin = getApiBaseUrl();
      const { sessionId } = await billingRequest<{ sessionId: string }>(user, 'create-checkout-session', {
        offerKey: selectedPlan.offerKey,
        successUrl: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${origin}/pricing`,
        hasTrial: selectedPlan.hasTrial,
      });

      if (typeof sessionId !== 'string' || !sessionId) {
        throw new Error("Unable to open checkout. Please try again.");
      }

      if (pricingDefault) {
        logAnalyticsEvent(pricingEvent(pricingDefault, 'checkout_start'), { plan: selectedPlan.offerKey });
      }
      const result = await stripe.redirectToCheckout({ sessionId });
      if (result.error) throw new Error(result.error.message);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to initiate checkout. Please try again.";
      setErrorMessage(message);
      logAnalyticsEvent(ANALYTICS_EVENTS.UPGRADE_FAILURE, { plan: selectedPlan.id, error: message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
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
      <Text style={styles.subheadline}>
        The calculator stays free. Guests get {FREE_SCAN_LIMIT} free photo scans each month.
        {' '}Saved dose logs have a separate monthly limit on Free and Photo Scan.
      </Text>

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

      {/* Single Photo Scan offer (monthly / yearly chosen below) */}
      <View style={styles.planTypesContainer}>
        <View style={[styles.planTypeBox, styles.selectedPlanTypeBox, { flex: 1 }]}>
          <Text style={[styles.planTypeName, styles.selectedPlanTypeName]}>Photo Scan</Text>
          <Text style={styles.planTypePrice}>${PHOTO_CHECK_MONTHLY_AMOUNT}/mo or ${PHOTO_CHECK_ANNUAL_AMOUNT}/yr</Text>
        </View>
      </View>

      {/* Monthly/Yearly Toggle */}
      <View style={styles.plansContainer}>
        {pricingPlansData.map((plan) => (
          <TouchableOpacity
            key={plan.id}
            style={[
              styles.planBox,
              plan.id === selectedPlan.id && styles.selectedPlanBox,
            ]}
            onPress={() => selectPlan(plan)}
            disabled={pricingDefault === undefined}
            accessibilityRole="button"
            aria-pressed={isWeb ? plan.id === selectedPlan.id : undefined}
            accessibilityState={isWeb ? undefined : { selected: plan.id === selectedPlan.id }}
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
        accessibilityRole="button"
        disabled={isLoading || pricingDefault === undefined}
        activeOpacity={0.9}
      >
        <Text style={styles.ctaButtonText}>
          {isLoading ? "Processing..." : selectedPlan.isMonthly ? `Get Photo Scan for $${PHOTO_CHECK_MONTHLY_AMOUNT}/mo` : `Get Photo Scan for $${PHOTO_CHECK_ANNUAL_AMOUNT}/yr`}
        </Text>
      </TouchableOpacity>

      {/* Trial Info */}
      <Text style={styles.trialInfo}>
        {user && !user.isAnonymous ? "Web checkout · Cancel anytime" : "Sign in to link Photo Scan to your account."}
      </Text>

      {/* Error Message */}
      {errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : null}

      {user && (
        <UpgradeEmailForm getIdToken={() => user.getIdToken()} onClose={() => {}} />
      )}

      {/* Footer Actions */}
      <View style={styles.footerActions}>
        <TouchableOpacity onPress={handleCancel}>
          <Text style={styles.footerLink}>Maybe Later</Text>
        </TouchableOpacity>
        
        <View style={styles.footerSeparator} />
        
        <Link href="/settings" style={styles.footerLink}>Manage subscription</Link>
      </View>

      <PublicLinks />
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

  // Badge text (shared)
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
