import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { View, Text, StyleSheet, Image, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInRight, FadeInLeft } from 'react-native-reanimated';
import { Camera, Check, ArrowRight } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=800';

export default function Demo() {
  const [step, setStep] = useState(0);
  const [imageError, setImageError] = useState(false);
  const router = useRouter();
  const { width } = useWindowDimensions();

  const handleNext = useCallback(async () => {
    if (step < 2) {
      setStep(step + 1);
    } else {
      try {
        // Persist onboarding completion status
        await AsyncStorage.setItem('onboardingComplete', 'true');
        // Navigate to user type segmentation screen
        router.replace('/onboarding/userType');
      } catch (e) {
        console.warn('Error completing onboarding:', e);
        // Fallback navigation in case of error
        router.replace('/onboarding/userType');
      }
    }
  }, [step, router]);

  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <Animated.View 
            entering={FadeInRight.duration(500)} 
            style={[styles.stepContainer, { width: width - 48 }]}
          >
            <View style={styles.imageContainer}>
              <Image 
                source={{ 
                  uri: imageError ? FALLBACK_IMAGE : 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=2426'
                }}
                onError={handleImageError}
                style={styles.image}
                accessibilityLabel="Camera scanning medication"
              />
              <View style={styles.imageOverlay}>
                {Platform.OS === "web" ? (
                  <Text style={{ color: '#FFFFFF', fontSize: 24 }}>📷</Text>
                ) : (
                  <Camera size={48} color="#FFFFFF" />
                )}
              </View>
            </View>
            <Text style={styles.stepTitle}>Smart Recognition</Text>
            <Text style={styles.stepDescription}>
              Point your camera at your medication and syringe. Our AI will guide you through the process.
            </Text>
          </Animated.View>
        );
      case 1:
        return (
          <Animated.View 
            entering={FadeInRight.duration(500)}
            style={[styles.stepContainer, { width: width - 48 }]}
          >
            <View style={styles.doseContainer}>
              <View style={styles.doseCircle}>
                <Text style={styles.doseText}>0.5ml</Text>
              </View>
              <View style={styles.doseLine} />
              <Text style={styles.doseLabel}>Recommended Dose</Text>
            </View>
            <Text style={styles.stepTitle}>Real-time Guidance</Text>
            <Text style={styles.stepDescription}>
              Get precise measurements and instant verification of your medication dose.
            </Text>
          </Animated.View>
        );
      case 2:
        return (
          <Animated.View 
            entering={FadeInRight.duration(500)}
            style={[styles.stepContainer, { width: width - 48 }]}
          >
            <View style={styles.successContainer}>
              <View style={styles.successCircle}>
                {Platform.OS === "web" ? (
                  <Text style={{ color: '#FFFFFF', fontSize: 24 }}>✔</Text>
                ) : (
                  <Check size={48} color="#FFFFFF" />
                )}
              </View>
              <Text style={styles.stepTitle}>Ready to Start</Text>
              <Text style={styles.stepDescription}>
                Let's prepare your first dose together with real-time guidance.
              </Text>
            </View>
          </Animated.View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeIn} style={styles.header}>
        <Text style={styles.headerTitle}>How It Works</Text>
      </Animated.View>

      <View style={styles.content}>
        {renderStep()}
      </View>

      <Animated.View entering={FadeInLeft.delay(300)} style={styles.footer}>
        <View style={styles.progress}>
          {[0, 1, 2].map((index) => (
            <View
              key={index}
              style={[
                styles.progressDot,
                index === step && styles.progressDotActive,
              ]}
            />
          ))}
        </View>

        <TouchableOpacity 
          style={styles.button} 
          onPress={handleNext}
          accessibilityRole="button"
          accessibilityLabel={step === 2 ? "Start using SafeDose" : "Next step"}
          accessibilityHint={step === 2 ? "Begins using the SafeDose app" : "Shows the next demonstration step"}
        >
          <Text style={styles.buttonText}>
            {step === 2 ? "Let's Start" : "Next"}
          </Text>
          {step === 2 ? (
            Platform.OS === "web" ? (
              <Text style={{ color: '#FFFFFF', fontSize: 20 }}>✔</Text>
            ) : (
              <Check size={20} color="#FFFFFF" />
            )
          ) : (
            Platform.OS === "web" ? (
              <Text style={{ color: '#FFFFFF', fontSize: 20 }}>→</Text>
            ) : (
              <ArrowRight size={20} color="#FFFFFF" />
            )
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    padding: 24,
    paddingTop: 60,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: '#000000',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepContainer: {
    alignItems: 'center',
    padding: 24,
  },
  imageContainer: {
    width: '100%',
    height: 300,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 32,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 12,
  },
  stepDescription: {
    fontSize: 17,
    color: '#6B6B6B',
    textAlign: 'center',
    maxWidth: '80%',
    lineHeight: 24,
  },
  doseContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  doseCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  doseText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  doseLine: {
    width: 2,
    height: 40,
    backgroundColor: '#007AFF',
    marginVertical: 16,
  },
  doseLabel: {
    fontSize: 17,
    color: '#007AFF',
    fontWeight: '500',
  },
  successContainer: {
    alignItems: 'center',
  },
  successCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  footer: {
    padding: 24,
    alignItems: 'center',
    gap: 24,
  },
  progress: {
    flexDirection: 'row',
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E5EA',
  },
  progressDotActive: {
    backgroundColor: '#007AFF',
    width: 24,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});