import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';

interface AnimatedSplashScreenProps {
  onAnimationComplete?: () => void;
}

export default function AnimatedSplashScreen({ onAnimationComplete }: AnimatedSplashScreenProps) {
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.8);
  const taglineOpacity = useSharedValue(0);
  const containerOpacity = useSharedValue(1);

  useEffect(() => {
    // Logo fade in and scale up
    logoOpacity.value = withDelay(
      300,
      withTiming(1, {
        duration: 800,
        easing: Easing.out(Easing.cubic),
      })
    );
    
    logoScale.value = withDelay(
      300,
      withSequence(
        withTiming(1.05, {
          duration: 800,
          easing: Easing.out(Easing.cubic),
        }),
        withTiming(1, {
          duration: 200,
          easing: Easing.inOut(Easing.ease),
        })
      )
    );

    // Tagline fade in
    taglineOpacity.value = withDelay(
      900,
      withTiming(1, {
        duration: 600,
        easing: Easing.out(Easing.cubic),
      })
    );

    // Fade out everything after a delay
    const fadeOutTimeout = setTimeout(() => {
      containerOpacity.value = withTiming(
        0,
        {
          duration: 400,
          easing: Easing.in(Easing.cubic),
        },
        (finished) => {
          if (finished && onAnimationComplete) {
            onAnimationComplete();
          }
        }
      );
    }, 2200); // Show for 2.2 seconds total before fade out

    return () => clearTimeout(fadeOutTimeout);
  }, [logoOpacity, logoScale, taglineOpacity, containerOpacity, onAnimationComplete]);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const taglineAnimatedStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  return (
    <Animated.View style={[styles.container, containerAnimatedStyle]}>
      <View style={styles.content}>
        <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
          <Text style={styles.logo}>SafeDose</Text>
        </Animated.View>
        
        <Animated.View style={[styles.taglineContainer, taglineAnimatedStyle]}>
          <Text style={styles.tagline}>Verify Materials • Calculate Doses</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logo: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  taglineContainer: {
    paddingHorizontal: 16,
  },
  tagline: {
    fontSize: 16,
    color: '#A0A0A0',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});
