import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, useWindowDimensions, Image, TouchableOpacity } from 'react-native';
import { scaleFont } from '../../lib/responsive';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=800';

export default function Welcome() {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const [imageError, setImageError] = useState(false);

  const handleStart = useCallback(() => {
    router.push('/onboarding/demo');
  }, [router]);

  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  return (
    <View style={styles.container}>
      <Image
        source={{ 
          uri: imageError ? FALLBACK_IMAGE : 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&q=80&w=2532'
        }}
        onError={handleImageError}
        style={[styles.backgroundImage, { width }]}
        accessibilityLabel="Medical professional preparing medication"
      />
      <View style={styles.overlay} />
      
      <View style={styles.content}>
        <Animated.View entering={FadeIn.delay(300).duration(800)} style={styles.logoContainer}>
          <Text style={styles.logo}>SafeDose</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(600).duration(800)} style={styles.mainContent}>
          <Text style={styles.title}>Medication{'\n'}Made Simple</Text>
          <Text style={styles.description}>
            Let's try it together with a quick demo
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(900).duration(800)} style={styles.footer}>
          <TouchableOpacity 
            style={styles.button} 
            onPress={handleStart}
            accessibilityRole="button"
            accessibilityLabel="Start demo"
            accessibilityHint="Begins the SafeDose app demonstration">
            <Text style={styles.buttonText}>Try Now</Text>
            <ArrowRight size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.disclaimer}>No account needed</Text>
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
    fontSize: scaleFont(32),
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  mainContent: {
    alignItems: 'center',
  },
  title: {
    fontSize: scaleFont(48),
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: scaleFont(20),
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
  buttonText: {
    color: '#FFFFFF',
    fontSize: scaleFont(17),
    fontWeight: '600',
  },
  disclaimer: {
    fontSize: scaleFont(15),
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
});