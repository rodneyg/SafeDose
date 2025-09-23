import { useCallback, useState, useEffect } from 'react';
import { View, Text, StyleSheet, useWindowDimensions, Image, TouchableOpacity, Alert } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import { isMobileWeb } from '../../lib/utils';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=800';

export default function Welcome() {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const [imageError, setImageError] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  useEffect(() => {
    console.log('[Welcome] Component mounted');
    setDebugInfo(prev => [...prev, `Welcome screen loaded at ${new Date().toISOString()}`]);
  }, []);

  const addDebugInfo = useCallback((info: string) => {
    console.log(`[Welcome] ${info}`);
    setDebugInfo(prev => [...prev, `${new Date().toISOString()}: ${info}`]);
  }, []);

  const handleStart = useCallback(async () => {
    try {
      setIsNavigating(true);
      addDebugInfo('User clicked Try Now button');
      
      // Add a small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 100));
      
      addDebugInfo('Attempting navigation to /onboarding/age');
      router.push('/onboarding/age');
      addDebugInfo('Navigation call completed');
      
    } catch (error) {
      setIsNavigating(false);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addDebugInfo(`Navigation error: ${errorMessage}`);
      console.error('[Welcome] Navigation error:', error);
      
      Alert.alert(
        'Navigation Error',
        `Failed to start onboarding: ${errorMessage}\n\nDebug info:\n${debugInfo.slice(-3).join('\n')}`,
        [
          { text: 'Retry', onPress: () => handleStart() },
          { text: 'Report Issue', onPress: () => showDebugInfo() }
        ]
      );
    }
  }, [router, addDebugInfo, debugInfo]);

  const handleImageError = useCallback(() => {
    addDebugInfo('Main image failed to load, using fallback');
    setImageError(true);
  }, [addDebugInfo]);

  const showDebugInfo = useCallback(() => {
    Alert.alert(
      'Debug Information',
      debugInfo.slice(-10).join('\n'),
      [{ text: 'OK' }]
    );
  }, [debugInfo]);

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
      
      <View style={[styles.content, isMobileWeb && styles.contentMobile]}>
        <Animated.View entering={FadeIn.delay(300).duration(800)} style={styles.logoContainer}>
          <Text style={[styles.logo, isMobileWeb && styles.logoMobile]}>SafeDose</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(600).duration(800)} style={styles.mainContent}>
          <Text style={[styles.title, isMobileWeb && styles.titleMobile]}>Medication{'\n'}Made Simple</Text>
          <Text style={[styles.description, isMobileWeb && styles.descriptionMobile]}>
            Let's try it together with a quick demo
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(900).duration(800)} style={[styles.footer, isMobileWeb && styles.footerMobile]}>
          <TouchableOpacity 
            style={[
              styles.button, 
              isMobileWeb && styles.buttonMobile,
              isNavigating && styles.buttonDisabled
            ]} 
            onPress={handleStart}
            disabled={isNavigating}
            accessibilityRole="button"
            accessibilityLabel="Start demo"
            accessibilityHint="Begins the SafeDose app demonstration">
            <Text style={[styles.buttonText, isMobileWeb && styles.buttonTextMobile]}>
              {isNavigating ? 'Starting...' : 'Try Now'}
            </Text>
            {!isNavigating && <ArrowRight size={isMobileWeb ? 18 : 20} color="#FFFFFF" />}
          </TouchableOpacity>
          <Text style={[styles.disclaimer, isMobileWeb && styles.disclaimerMobile]}>No account needed</Text>
          
          {/* Debug button for development */}
          {__DEV__ && (
            <TouchableOpacity 
              style={styles.debugButton} 
              onPress={showDebugInfo}
              accessibilityLabel="Show debug information"
            >
              <Text style={styles.debugButtonText}>Debug Info ({debugInfo.length})</Text>
            </TouchableOpacity>
          )}
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
  buttonDisabled: {
    opacity: 0.7,
  },
  debugButton: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
  },
  debugButtonText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
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