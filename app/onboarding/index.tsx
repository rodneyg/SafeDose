import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, useWindowDimensions, Image, Platform, TouchableOpacity } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Link, useRouter } from 'expo-router';
import Head from 'expo-router/head';
import { ArrowRight } from 'lucide-react-native';
import { ANALYTICS_EVENTS, logAnalyticsEvent } from '../../lib/analytics';
import { isMobileWeb } from '../../lib/utils';
import PublicLinks from '../../components/PublicLinks';
import { useAuth } from '../../contexts/AuthContext';
import { signInWithGoogle } from '../../lib/googleAuth';
import {
  assignLandingCtaArm,
  LANDING_CTA_LABELS,
  recordLandingCtaClick,
  recordLandingCtaExposure,
  recordLandingCtaStart,
} from '../../lib/landingCtaExperiment';
import { loadRemoteUserProfile, routeAfterGoogleSignIn } from '../../lib/onboardingState';
import { startFirstDoseTimer } from '../../lib/firstDoseExperiment';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=800';

export default function Welcome() {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const router = useRouter();
  const { auth } = useAuth();
  const [imageError, setImageError] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [signInError, setSignInError] = useState('');

  useEffect(() => { startFirstDoseTimer(); }, []);
  const [ctaArm, setCtaArm] = useState<ReturnType<typeof assignLandingCtaArm>>(null);
  const exposed = useRef(false);
  const ctaLabel = LANDING_CTA_LABELS[ctaArm ?? 'control'];

  useEffect(() => {
    if (exposed.current) return;
    exposed.current = true;
    const arm = assignLandingCtaArm();
    setCtaArm(arm);
    if (arm) recordLandingCtaExposure(arm);
  }, []);

  const handleStart = useCallback(() => {
    if (ctaArm) recordLandingCtaClick(ctaArm);
    router.navigate('/onboarding/age');
  }, [ctaArm, router]);

  const handleSignIn = useCallback(async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    setSignInError('');
    try {
      const result = await signInWithGoogle(auth);
      if (!result?.user) return; // redirect in progress
      const route = await routeAfterGoogleSignIn({
        user: result.user,
        loadRemoteProfile: loadRemoteUserProfile,
        fallbackRoute: '/onboarding/age',
      });
      router.replace(route as any);
    } catch (error) {
      const message = (error as { message?: string })?.message || 'Unable to sign in. Please try again.';
      setSignInError(message);
    } finally {
      setIsSigningIn(false);
    }
  }, [auth, isSigningIn, router]);

  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  return (
    <View style={styles.container} role={isWeb ? 'main' : undefined}>
      <Head><title>Welcome | SafeDose</title></Head>
      <Image
        source={{ 
          uri: imageError ? FALLBACK_IMAGE : 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&q=80&w=2532'
        }}
        onError={handleImageError}
        style={[styles.backgroundImage, { width }]}
        accessibilityLabel={isWeb ? undefined : "Medical professional preparing medication"}
        aria-hidden={isWeb ? true : undefined}
      />
      <View style={styles.overlay} />
      
      <View style={[styles.content, isMobileWeb && styles.contentMobile]}>
        <Animated.View entering={FadeIn.delay(300).duration(800)} style={styles.logoContainer}>
          <Text style={[styles.logo, isMobileWeb && styles.logoMobile]}>SafeDose</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(600).duration(800)} style={styles.mainContent}>
          <Text accessibilityRole="header" style={[styles.title, isMobileWeb && styles.titleMobile]}>Verify Materials{'\n'}Calculate Doses</Text>
          <Text style={[styles.description, isMobileWeb && styles.descriptionMobile]}>
            Reduce math errors when administering your prescription
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(900).duration(800)} style={[styles.footer, isMobileWeb && styles.footerMobile]}>
          <TouchableOpacity
            style={[styles.button, isWeb && styles.buttonWeb, isMobileWeb && styles.buttonMobile]}
            onPress={() => {
              logAnalyticsEvent(ANALYTICS_EVENTS.WELCOME_PRIMARY_CTA_CLICK);
              handleStart();
            }}
            testID="onboarding-primary-cta"
            accessibilityRole="button"
            accessibilityLabel={isWeb ? ctaLabel : 'Start demo'}
            accessibilityHint={ctaArm === 'variant' ? 'Opens onboarding before you can scan a vial' : 'Begins the SafeDose app demonstration'}>
            <Text style={[styles.buttonText, isMobileWeb && styles.buttonTextMobile]}>{ctaLabel}</Text>
            <ArrowRight size={isMobileWeb ? 18 : 20} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.accountLinks}>
            <TouchableOpacity
              onPress={handleSignIn}
              disabled={isSigningIn}
              accessibilityRole="button"
              accessibilityLabel="Sign in"
              accessibilityHint="Sign in with Google if you already have a SafeDose account"
              style={styles.signInLink}
            >
              <Text style={[styles.signInLinkText, isMobileWeb && styles.disclaimerMobile]}>
                {isSigningIn ? 'Signing in…' : 'Sign in'}
              </Text>
            </TouchableOpacity>
            <Link
              href={{ pathname: '/login', params: { from: 'welcome' } }}
              onPress={() => recordLandingCtaStart('signup')}
              style={[styles.signInLink, styles.signInLinkText, isMobileWeb && styles.disclaimerMobile]}
            >
              Create an account
            </Link>
          </View>
          {signInError ? (
            <Text style={[styles.signInError, isMobileWeb && styles.disclaimerMobile]}>{signInError}</Text>
          ) : (
            <Text style={[styles.disclaimer, isMobileWeb && styles.disclaimerMobile]}>No account needed to try</Text>
          )}
          <PublicLinks onDarkBackground showChangelog />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  backgroundImage: {
    height: '100%',
    position: 'absolute',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 24,
    paddingTop: 60,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logo: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  mainContent: {
    alignItems: 'center',
  },
  title: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    maxWidth: '80%',
    lineHeight: 28,
  },
  footer: {
    alignItems: 'center',
    gap: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 52, // Increased touch target
  },
  buttonWeb: {
    backgroundColor: '#0064D2',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  disclaimer: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  accountLinks: { flexDirection: 'row', alignItems: 'center' },
  signInLink: {
    padding: 12,
    minHeight: 44,
  },
  signInLinkText: {
    color: '#FFFFFF',
    fontSize: 15,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  signInError: {
    color: '#FFB4B4',
    fontSize: 15,
    textAlign: 'center',
  },
  // Mobile-specific styles
  contentMobile: {
    paddingHorizontal: 16,
    paddingTop: 40,
  },
  logoMobile: {
    fontSize: 28,
  },
  titleMobile: {
    fontSize: 36,
    marginBottom: 12,
  },
  descriptionMobile: {
    fontSize: 18,
    lineHeight: 24,
    maxWidth: '90%',
  },
  footerMobile: {
    gap: 12,
    paddingBottom: 20,
  },
  buttonMobile: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    minHeight: 48,
  },
  buttonTextMobile: {
    fontSize: 16,
  },
  disclaimerMobile: {
    fontSize: 14,
  },
});
