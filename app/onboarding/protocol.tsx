import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInRight } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Check, ArrowRight, ArrowLeft, Syringe, Pill, Activity, Plus } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import { Protocol, ProtocolType, PROTOCOL_TEMPLATES, ProtocolTemplate } from '@/types/protocol';
import { logAnalyticsEvent, ANALYTICS_EVENTS } from '@/lib/analytics';
import { isMobileWeb } from '@/lib/utils';

interface ProtocolSetupData {
  type: ProtocolType | null;
  medication: string;
  dosage: string;
  unit: 'mg' | 'mL' | 'IU' | 'mcg';
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom';
  customFrequencyDays?: number;
}

export default function ProtocolSetup() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile, saveProfile } = useUserProfile();
  const [currentStep, setCurrentStep] = useState(0);
  const [setupData, setSetupData] = useState<ProtocolSetupData>({
    type: null,
    medication: '',
    dosage: '',
    unit: 'mg',
    frequency: 'weekly',
  });

  // Log analytics when step starts
  React.useEffect(() => {
    logAnalyticsEvent(ANALYTICS_EVENTS.ONBOARDING_STEP_START, {
      step: currentStep + 1,
      step_name: getStepName(currentStep),
      flow: 'protocol_setup'
    });
  }, [currentStep]);

  const getStepName = (step: number): string => {
    switch (step) {
      case 0: return 'protocol_type_selection';
      case 1: return 'medication_details';
      default: return 'unknown';
    }
  };

  const handleProtocolTypeSelect = useCallback((type: ProtocolType) => {
    setSetupData(prev => ({ ...prev, type }));
    
    // Log the selection
    logAnalyticsEvent(ANALYTICS_EVENTS.ONBOARDING_STEP_COMPLETE, {
      step: currentStep + 1,
      step_name: getStepName(currentStep),
      question: 'protocol_type',
      answer: type,
      flow: 'protocol_setup'
    });
  }, [currentStep]);

  const handleNext = useCallback(() => {
    if (currentStep < 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  }, [currentStep]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      // Go back to user type screen
      router.back();
    }
  }, [currentStep, router]);

  const handleSkipProtocol = useCallback(async () => {
    try {
      console.log('[ProtocolSetup] User chose to skip protocol setup');
      
      // Update profile to indicate no protocol setup
      if (profile) {
        const updatedProfile = {
          ...profile,
          hasSetupProtocol: false,
        };
        await saveProfile(updatedProfile);
      }
      
      // Log skip event
      logAnalyticsEvent('protocol_setup_skipped', {
        flow: 'protocol_setup'
      });
      
      // Navigate to main app
      router.replace('/(tabs)/new-dose');
    } catch (error) {
      console.error('[ProtocolSetup] Error skipping protocol:', error);
      router.replace('/(tabs)/new-dose');
    }
  }, [profile, saveProfile, router]);

  const handleComplete = useCallback(async () => {
    try {
      console.log('[ProtocolSetup] Starting protocol completion...');
      
      // Validate required fields
      if (!setupData.type || !setupData.medication || !setupData.dosage) {
        Alert.alert(
          'Missing Information',
          'Please fill in all required fields to complete your protocol setup.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Create protocol object
      const protocol: Protocol = {
        id: `protocol_${Date.now()}`,
        name: PROTOCOL_TEMPLATES.find(t => t.type === setupData.type)?.name || 'Custom Protocol',
        medication: setupData.medication,
        dosage: setupData.dosage,
        unit: setupData.unit,
        frequency: setupData.frequency,
        customFrequencyDays: setupData.customFrequencyDays,
        startDate: new Date().toISOString(),
        isActive: true,
        dateCreated: new Date().toISOString(),
        userId: user?.uid,
      };

      // Save protocol to storage
      const existingProtocols = await AsyncStorage.getItem('userProtocols');
      const protocols = existingProtocols ? JSON.parse(existingProtocols) : [];
      protocols.push(protocol);
      await AsyncStorage.setItem('userProtocols', JSON.stringify(protocols));

      // Update user profile to indicate protocol setup is complete
      if (profile) {
        const updatedProfile = {
          ...profile,
          hasSetupProtocol: true,
        };
        await saveProfile(updatedProfile);
      }

      // Log completion
      logAnalyticsEvent('protocol_setup_complete', {
        protocol_type: setupData.type,
        medication: setupData.medication,
        frequency: setupData.frequency,
        unit: setupData.unit,
        flow: 'protocol_setup'
      });

      console.log('[ProtocolSetup] Protocol setup completed successfully');
      
      // Navigate to main app
      router.replace('/(tabs)/new-dose');
    } catch (error) {
      console.error('[ProtocolSetup] Error completing protocol setup:', error);
      Alert.alert(
        'Setup Error',
        'There was an error saving your protocol. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }, [setupData, user?.uid, profile, saveProfile, router]);

  const isCurrentStepComplete = (): boolean => {
    switch (currentStep) {
      case 0: return setupData.type !== null;
      case 1: return setupData.medication.trim() !== '' && setupData.dosage.trim() !== '';
      default: return false;
    }
  };

  const getSelectedTemplate = (): ProtocolTemplate | null => {
    return PROTOCOL_TEMPLATES.find(t => t.type === setupData.type) || null;
  };

  const renderProtocolTypeStep = () => (
    <Animated.View entering={FadeInRight.duration(500)} style={[styles.stepContainer, isMobileWeb && styles.stepContainerMobile]}>
      <Text style={[styles.stepTitle, isMobileWeb && styles.stepTitleMobile]}>Choose Your Protocol Type</Text>
      <Text style={[styles.stepDescription, isMobileWeb && styles.stepDescriptionMobile]}>
        Select the type of medication protocol you're following for personalized guidance.
      </Text>
      
      <View style={[styles.optionsContainer, isMobileWeb && styles.optionsContainerMobile]}>
        {PROTOCOL_TEMPLATES.map((template) => {
          const isSelected = setupData.type === template.type;
          const IconComponent = template.type === 'trt' ? Activity : 
                              template.type === 'peptides' ? Syringe :
                              template.type === 'insulin' ? Pill : Plus;
          
          return (
            <TouchableOpacity
              key={template.type}
              style={[
                styles.protocolCard,
                isMobileWeb && styles.protocolCardMobile,
                isSelected && styles.protocolCardSelected,
              ]}
              onPress={() => handleProtocolTypeSelect(template.type)}
              accessibilityRole="button"
              accessibilityLabel={template.name}
            >
              <View style={styles.protocolCardHeader}>
                <IconComponent 
                  size={isMobileWeb ? 20 : 24} 
                  color={isSelected ? "#007AFF" : "#6B6B6B"} 
                />
                {isSelected && <Check size={isMobileWeb ? 18 : 20} color="#007AFF" />}
              </View>
              <Text style={[
                styles.protocolTitle,
                isMobileWeb && styles.protocolTitleMobile,
                isSelected && styles.protocolTitleSelected,
              ]}>
                {template.name}
              </Text>
              <Text style={[styles.protocolDescription, isMobileWeb && styles.protocolDescriptionMobile]}>
                {template.description}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </Animated.View>
  );

  const renderMedicationDetailsStep = () => {
    const selectedTemplate = getSelectedTemplate();
    
    return (
      <Animated.View entering={FadeInRight.duration(500)} style={[styles.stepContainer, isMobileWeb && styles.stepContainerMobile]}>
        <Text style={[styles.stepTitle, isMobileWeb && styles.stepTitleMobile]}>Protocol Details</Text>
        <Text style={[styles.stepDescription, isMobileWeb && styles.stepDescriptionMobile]}>
          Enter your medication details to complete your {selectedTemplate?.name} protocol setup.
        </Text>
        
        <View style={[styles.formContainer, isMobileWeb && styles.formContainerMobile]}>
          {/* Medication Name */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, isMobileWeb && styles.fieldLabelMobile]}>Medication Name</Text>
            <TextInput
              style={[styles.textInput, isMobileWeb && styles.textInputMobile]}
              value={setupData.medication}
              onChangeText={(text) => setSetupData(prev => ({ ...prev, medication: text }))}
              placeholder={selectedTemplate?.commonMedications[0] || "Enter medication name"}
              placeholderTextColor="#A1A1A1"
            />
          </View>

          {/* Dosage */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, isMobileWeb && styles.fieldLabelMobile]}>Standard Dose</Text>
            <View style={styles.dosageContainer}>
              <TextInput
                style={[styles.textInput, styles.dosageInput, isMobileWeb && styles.textInputMobile]}
                value={setupData.dosage}
                onChangeText={(text) => setSetupData(prev => ({ ...prev, dosage: text }))}
                placeholder="0.5"
                placeholderTextColor="#A1A1A1"
                keyboardType="numeric"
              />
              <View style={styles.unitPicker}>
                {selectedTemplate?.defaultUnits.map((unit) => (
                  <TouchableOpacity
                    key={unit}
                    style={[
                      styles.unitOption,
                      setupData.unit === unit && styles.unitOptionSelected
                    ]}
                    onPress={() => setSetupData(prev => ({ ...prev, unit }))}
                  >
                    <Text style={[
                      styles.unitOptionText,
                      setupData.unit === unit && styles.unitOptionTextSelected
                    ]}>
                      {unit}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Frequency */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, isMobileWeb && styles.fieldLabelMobile]}>Frequency</Text>
            <View style={styles.frequencyContainer}>
              {selectedTemplate?.commonFrequencies.map((freq) => (
                <TouchableOpacity
                  key={freq}
                  style={[
                    styles.frequencyOption,
                    setupData.frequency === freq && styles.frequencyOptionSelected
                  ]}
                  onPress={() => setSetupData(prev => ({ ...prev, frequency: freq }))}
                >
                  <Text style={[
                    styles.frequencyOptionText,
                    setupData.frequency === freq && styles.frequencyOptionTextSelected
                  ]}>
                    {freq.charAt(0).toUpperCase() + freq.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Animated.View>
    );
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0: return renderProtocolTypeStep();
      case 1: return renderMedicationDetailsStep();
      default: return null;
    }
  };

  const getProgressWidth = () => {
    return ((currentStep + 1) / 2) * 100;
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={[styles.scrollContent, isMobileWeb && styles.scrollContentMobile]}>
        <Animated.View entering={FadeIn.delay(100).duration(800)} style={[styles.header, isMobileWeb && styles.headerMobile]}>
          <Text style={[styles.title, isMobileWeb && styles.titleMobile]}>Set Up Your Protocol</Text>
          <Text style={[styles.subtitle, isMobileWeb && styles.subtitleMobile]}>
            Step {currentStep + 1} of 2
          </Text>
          
          {/* Progress bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBackground}>
              <Animated.View 
                style={[styles.progressBar, { width: `${getProgressWidth()}%` }]}
                entering={FadeInRight.duration(300)}
              />
            </View>
            <Text style={styles.progressLabel}>
              {Math.round(getProgressWidth())}% Complete
            </Text>
          </View>
        </Animated.View>

        {renderCurrentStep()}
      </ScrollView>

      <Animated.View entering={FadeInDown.delay(400).duration(800)} style={[styles.footer, isMobileWeb && styles.footerMobile]}>
        <View style={[styles.buttonContainer, isMobileWeb && styles.buttonContainerMobile]}>
          <TouchableOpacity
            style={[styles.backButton, isMobileWeb && styles.backButtonMobile]}
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={isMobileWeb ? 18 : 20} color="#007AFF" />
            <Text style={[styles.backButtonText, isMobileWeb && styles.backButtonTextMobile]}>Back</Text>
          </TouchableOpacity>

          <View style={styles.rightButtons}>
            <TouchableOpacity
              style={[styles.skipButton, isMobileWeb && styles.skipButtonMobile]}
              onPress={handleSkipProtocol}
              accessibilityRole="button"
              accessibilityLabel="Skip protocol setup"
            >
              <Text style={[styles.skipButtonText, isMobileWeb && styles.skipButtonTextMobile]}>Skip for now</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.nextButton,
                isMobileWeb && styles.nextButtonMobile,
                !isCurrentStepComplete() && styles.nextButtonDisabled,
              ]}
              onPress={handleNext}
              disabled={!isCurrentStepComplete()}
              accessibilityRole="button"
              accessibilityLabel={currentStep === 1 ? "Complete setup" : "Next step"}
            >
              <Text style={[
                styles.nextButtonText,
                isMobileWeb && styles.nextButtonTextMobile,
                !isCurrentStepComplete() && styles.nextButtonTextDisabled,
              ]}>
                {currentStep === 1 ? 'Complete' : 'Next'}
              </Text>
              <ArrowRight 
                size={isMobileWeb ? 18 : 20} 
                color={isCurrentStepComplete() ? "#FFFFFF" : "#A1A1A1"} 
              />
            </TouchableOpacity>
          </View>
        </View>
        
        <Text style={[styles.privacyText, isMobileWeb && styles.privacyTextMobile]}>
          Your protocol information is stored securely and only used to provide personalized guidance.
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 40,
    paddingHorizontal: 24,
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 17,
    color: '#6B6B6B',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 12,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 16,
  },
  progressBackground: {
    width: '100%',
    height: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  progressLabel: {
    fontSize: 12,
    color: '#6B6B6B',
    marginTop: 8,
  },
  stepContainer: {
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 12,
  },
  stepDescription: {
    fontSize: 16,
    color: '#6B6B6B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  optionsContainer: {
    gap: 16,
  },
  protocolCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E5EA',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
  },
  protocolCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F7F9FF',
  },
  protocolCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  protocolTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  protocolTitleSelected: {
    color: '#007AFF',
  },
  protocolDescription: {
    fontSize: 14,
    color: '#6B6B6B',
    lineHeight: 20,
  },
  formContainer: {
    gap: 24,
  },
  fieldContainer: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#000000',
    backgroundColor: '#FFFFFF',
  },
  dosageContainer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  dosageInput: {
    flex: 1,
  },
  unitPicker: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 4,
  },
  unitOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  unitOptionSelected: {
    backgroundColor: '#007AFF',
  },
  unitOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B6B6B',
  },
  unitOptionTextSelected: {
    color: '#FFFFFF',
  },
  frequencyContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  frequencyOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
  },
  frequencyOptionSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#007AFF',
  },
  frequencyOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B6B6B',
  },
  frequencyOptionTextSelected: {
    color: '#FFFFFF',
  },
  footer: {
    padding: 24,
    paddingTop: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
  },
  rightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B6B6B',
  },
  nextButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 48,
  },
  nextButtonDisabled: {
    backgroundColor: '#E5E5EA',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButtonTextDisabled: {
    color: '#A1A1A1',
  },
  privacyText: {
    fontSize: 12,
    color: '#A1A1A1',
    textAlign: 'center',
    lineHeight: 16,
  },
  // Mobile-specific styles
  stepContainerMobile: {
    marginBottom: 20,
  },
  headerMobile: {
    marginBottom: 20,
  },
  titleMobile: {
    fontSize: 24,
    marginBottom: 8,
  },
  subtitleMobile: {
    fontSize: 16,
    marginBottom: 8,
  },
  stepTitleMobile: {
    fontSize: 20,
    marginBottom: 8,
  },
  stepDescriptionMobile: {
    fontSize: 14,
    marginBottom: 24,
  },
  scrollContentMobile: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  optionsContainerMobile: {
    gap: 12,
  },
  protocolCardMobile: {
    padding: 16,
    marginBottom: 8,
  },
  protocolTitleMobile: {
    fontSize: 16,
  },
  protocolDescriptionMobile: {
    fontSize: 13,
  },
  formContainerMobile: {
    gap: 20,
  },
  fieldLabelMobile: {
    fontSize: 14,
  },
  textInputMobile: {
    padding: 12,
    fontSize: 14,
  },
  footerMobile: {
    padding: 16,
    paddingTop: 12,
  },
  buttonContainerMobile: {
    marginBottom: 12,
  },
  backButtonMobile: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonTextMobile: {
    fontSize: 14,
  },
  skipButtonMobile: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  skipButtonTextMobile: {
    fontSize: 14,
  },
  nextButtonMobile: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    minHeight: 42,
  },
  nextButtonTextMobile: {
    fontSize: 14,
  },
  privacyTextMobile: {
    fontSize: 11,
  },
});