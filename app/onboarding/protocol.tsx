import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Pill, ArrowRight } from 'lucide-react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { isMobileWeb } from '../../lib/utils';
import ProtocolSetupScreen from '../../components/ProtocolSetupScreen';

export default function ProtocolOnboarding() {
  const router = useRouter();
  const [showSetup, setShowSetup] = useState(false);

  const handleSetupProtocol = useCallback(() => {
    setShowSetup(true);
  }, []);

  const handleSkipProtocol = useCallback(async () => {
    try {
      // Mark protocol setup as skipped
      await AsyncStorage.setItem('protocolSetupSkipped', 'true');
      router.replace('/(tabs)/new-dose');
    } catch (error) {
      console.error('[ProtocolOnboarding] Error skipping protocol:', error);
      router.replace('/(tabs)/new-dose');
    }
  }, [router]);

  const handleProtocolComplete = useCallback(async () => {
    try {
      // Mark protocol setup as completed
      await AsyncStorage.setItem('protocolSetupCompleted', 'true');
      router.replace('/(tabs)/new-dose');
    } catch (error) {
      console.error('[ProtocolOnboarding] Error completing protocol:', error);
      router.replace('/(tabs)/new-dose');
    }
  }, [router]);

  if (showSetup) {
    return (
      <ProtocolSetupScreen 
        onComplete={handleProtocolComplete}
        onSkip={handleSkipProtocol}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.container, isMobileWeb && styles.containerMobile]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeIn.delay(200)} style={styles.header}>
          <Pill size={isMobileWeb ? 32 : 40} color="#007AFF" />
          <Text style={[styles.title, isMobileWeb && styles.titleMobile]}>
            Set up a dosing protocol?
          </Text>
          <Text style={[styles.subtitle, isMobileWeb && styles.subtitleMobile]}>
            SafeDose can create an intelligent schedule that calculates your doses and reminds you when it's time.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400)} style={[styles.features, isMobileWeb && styles.featuresMobile]}>
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Text style={styles.featureIconText}>🎯</Text>
            </View>
            <View style={styles.featureContent}>
              <Text style={[styles.featureTitle, isMobileWeb && styles.featureTitleMobile]}>
                Auto-Calculate Doses
              </Text>
              <Text style={[styles.featureDescription, isMobileWeb && styles.featureDescriptionMobile]}>
                Enter weekly targets, we'll split into perfect per-dose amounts and show exact syringe markings
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Text style={styles.featureIconText}>⏰</Text>
            </View>
            <View style={styles.featureContent}>
              <Text style={[styles.featureTitle, isMobileWeb && styles.featureTitleMobile]}>
                Smart Scheduling
              </Text>
              <Text style={[styles.featureDescription, isMobileWeb && styles.featureDescriptionMobile]}>
                Just pick your first dose time, we'll automatically calculate optimal spacing (3.5 days for 2x/week, etc.)
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Text style={styles.featureIconText}>📅</Text>
            </View>
            <View style={styles.featureContent}>
              <Text style={[styles.featureTitle, isMobileWeb && styles.featureTitleMobile]}>
                Next Dose Preview
              </Text>
              <Text style={[styles.featureDescription, isMobileWeb && styles.featureDescriptionMobile]}>
                See exactly when your next dose is due with editable reminders
              </Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(600)} style={[styles.examples, isMobileWeb && styles.examplesMobile]}>
          <Text style={[styles.examplesTitle, isMobileWeb && styles.examplesTitleMobile]}>
            Perfect for:
          </Text>
          <Text style={[styles.exampleText, isMobileWeb && styles.exampleTextMobile]}>
            • TRT (2×/week) → Mon 10 AM, Fri 10 PM{'\n'}
            • Peptides (3×/week) → Wed 8 AM, Fri 8 PM, Mon 8 AM{'\n'}
            • Daily protocols → Same time every day
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(800)} style={[styles.actions, isMobileWeb && styles.actionsMobile]}>
          <TouchableOpacity
            style={[styles.setupButton, isMobileWeb && styles.setupButtonMobile]}
            onPress={handleSetupProtocol}
          >
            <Text style={[styles.setupButtonText, isMobileWeb && styles.setupButtonTextMobile]}>
              Set Up Protocol
            </Text>
            <ArrowRight size={isMobileWeb ? 16 : 18} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.skipButton, isMobileWeb && styles.skipButtonMobile]}
            onPress={handleSkipProtocol}
          >
            <Text style={[styles.skipButtonText, isMobileWeb && styles.skipButtonTextMobile]}>
              Skip for now
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  containerMobile: {
    paddingHorizontal: 0,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1C1C1E',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  titleMobile: {
    fontSize: 28,
    marginTop: 20,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: '90%',
  },
  subtitleMobile: {
    fontSize: 16,
    lineHeight: 22,
  },
  features: {
    gap: 24,
    marginBottom: 32,
  },
  featuresMobile: {
    gap: 20,
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
  },
  featureIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureIconText: {
    fontSize: 20,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  featureTitleMobile: {
    fontSize: 16,
  },
  featureDescription: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 20,
  },
  featureDescriptionMobile: {
    fontSize: 14,
    lineHeight: 18,
  },
  examples: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 32,
  },
  examplesMobile: {
    marginBottom: 24,
    padding: 16,
  },
  examplesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  examplesTitleMobile: {
    fontSize: 16,
    marginBottom: 8,
  },
  exampleText: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 22,
  },
  exampleTextMobile: {
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    gap: 16,
  },
  actionsMobile: {
    gap: 12,
  },
  setupButton: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  setupButtonMobile: {
    paddingVertical: 16,
    borderRadius: 12,
  },
  setupButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  setupButtonTextMobile: {
    fontSize: 16,
  },
  skipButton: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  skipButtonMobile: {
    paddingVertical: 16,
  },
  skipButtonText: {
    color: '#6B7280',
    fontSize: 17,
    fontWeight: '500',
  },
  skipButtonTextMobile: {
    fontSize: 15,
  },
});