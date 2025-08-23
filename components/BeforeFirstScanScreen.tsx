import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, CheckCircle, ArrowRight, X } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { isMobileWeb } from '../lib/utils';

interface BeforeFirstScanScreenProps {
  onContinue: () => void;
  onBack: () => void;
  onDontShowAgain?: () => void;
  showDontShowAgain?: boolean;
}

export default function BeforeFirstScanScreen({
  onContinue,
  onBack,
  onDontShowAgain,
  showDontShowAgain = false,
}: BeforeFirstScanScreenProps) {
  return (
    <SafeAreaView style={styles.container}>
      <Animated.View entering={FadeIn.duration(300)} style={styles.content}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header with camera icon */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Camera color="#007AFF" size={32} />
            </View>
            <Text style={styles.title}>Before you scan</Text>
            <Text style={styles.subtitle}>Let's make sure you have what you need</Text>
          </View>

          {/* Materials list */}
          <View style={styles.materialsContainer}>
            <Text style={styles.materialsTitle}>Have these ready (more items = better results):</Text>
            
            <View style={styles.materialsList}>
              <View style={styles.materialItem}>
                <CheckCircle color="#34C759" size={20} />
                <Text style={styles.materialText}>Medication vial with clear labels</Text>
              </View>
              
              <View style={styles.materialItem}>
                <CheckCircle color="#34C759" size={20} />
                <Text style={styles.materialText}>Syringe with visible markings</Text>
              </View>
              
              <View style={styles.materialItem}>
                <CheckCircle color="#34C759" size={20} />
                <Text style={styles.materialText}>Prescription box or label</Text>
              </View>
            </View>

            {/* General rule */}
            <View style={styles.ruleContainer}>
              <Text style={styles.ruleTitle}>General rule:</Text>
              <Text style={styles.ruleText}>
                SafeDose works best with multiple items in the photo, but requires at least one solid baseline reference. 
                Clear text and markings help ensure accurate readings.
              </Text>
            </View>
          </View>

          {/* Action buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.continueButton, isMobileWeb && styles.continueButtonMobile]}
              onPress={onContinue}
              accessibilityRole="button"
              accessibilityLabel="Continue to scan"
            >
              <Text style={styles.continueButtonText}>Continue to Scan</Text>
              <ArrowRight color="#FFFFFF" size={18} style={styles.buttonIcon} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.backButton, isMobileWeb && styles.backButtonMobile]}
              onPress={onBack}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>

            {/* Don't show again option (only after first view) */}
            {showDontShowAgain && onDontShowAgain && (
              <TouchableOpacity
                style={styles.dontShowButton}
                onPress={onDontShowAgain}
                accessibilityRole="button"
                accessibilityLabel="Don't show this again"
              >
                <X color="#8E8E93" size={14} style={styles.dontShowIcon} />
                <Text style={styles.dontShowText}>Don't show again</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 30,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1D1D1F',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 17,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
  materialsContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  materialsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 16,
  },
  materialsList: {
    marginBottom: 20,
  },
  materialItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  materialText: {
    fontSize: 16,
    color: '#1D1D1F',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  ruleContainer: {
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingTop: 16,
  },
  ruleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 8,
  },
  ruleText: {
    fontSize: 15,
    color: '#48484A',
    lineHeight: 20,
  },
  buttonContainer: {
    marginTop: 'auto',
    paddingTop: 20,
  },
  continueButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  continueButtonMobile: {
    shadowOpacity: 0,
    elevation: 0,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    marginRight: 8,
  },
  buttonIcon: {
    marginTop: 1,
  },
  backButton: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  backButtonMobile: {
    backgroundColor: '#E5E5EA',
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 17,
    fontWeight: '500',
  },
  dontShowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  dontShowIcon: {
    marginRight: 6,
  },
  dontShowText: {
    color: '#8E8E93',
    fontSize: 14,
    fontWeight: '500',
  },
});