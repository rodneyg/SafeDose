import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal, ScrollView } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { ArrowRight, ArrowLeft, Calendar, Shield, X } from 'lucide-react-native';
import { logAnalyticsEvent, ANALYTICS_EVENTS } from '@/lib/analytics';
import { isMobileWeb } from '@/lib/utils';
import DatePickerSelect from '@/components/ui/DatePickerSelect';
import {
  calculateAge,
  validateBirthDate,
  getMonthOptions,
  getDayOptions,
  getYearOptions,
  formatBirthDateForDisplay
} from '@/lib/birthDateUtils';

export default function BirthDateCollection() {
  const router = useRouter();
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [validationError, setValidationError] = useState('');
  const [showSafetyModal, setShowSafetyModal] = useState(false);

  // Calculate if current selection is valid
  const isComplete = selectedMonth && selectedDay && selectedYear;
  const birthDate = isComplete ? `${selectedYear}-${selectedMonth}-${selectedDay}` : '';
  const validation = isComplete ? validateBirthDate(birthDate) : { isValid: false };
  const isValid = validation.isValid;

  const handleYearChange = useCallback((year: string) => {
    setSelectedYear(year);
    setValidationError('');
    
    // Reset month and day when year changes
    setSelectedMonth('');
    setSelectedDay('');
  }, []);

  const handleMonthChange = useCallback((month: string) => {
    setSelectedMonth(month);
    setValidationError('');
    
    // Reset day when month changes
    setSelectedDay('');
  }, []);

  const handleDayChange = useCallback((day: string) => {
    setSelectedDay(day);
    setValidationError('');
  }, []);

  const handleContinue = useCallback(() => {
    if (!isComplete) {
      setValidationError('Please select your complete birth date');
      return;
    }

    if (!isValid) {
      setValidationError(validation.error || 'Please enter a valid birth date');
      return;
    }

    const age = calculateAge(birthDate);
    
    // Log analytics
    logAnalyticsEvent(ANALYTICS_EVENTS.BIRTH_DATE_COLLECTION_COMPLETED, {
      age,
      birth_year: selectedYear,
      birth_month: selectedMonth,
      age_range: age < 18 ? 'minor' : age < 65 ? 'adult' : 'senior'
    });

    // Route based on age (same logic as before)
    if (age < 18) {
      // Route to child safety screen for minors
      router.push({
        pathname: '/onboarding/child-safety',
        params: { 
          age: age.toString(),
          birthDate: birthDate
        }
      });
    } else {
      // Route to demo for adults
      router.push({
        pathname: '/onboarding/demo',
        params: { 
          age: age.toString(),
          birthDate: birthDate
        }
      });
    }
  }, [isComplete, isValid, validation, birthDate, selectedYear, selectedMonth, router]);

  const handleSkip = useCallback(() => {
    // Show safety explanation modal instead of directly skipping
    setShowSafetyModal(true);
  }, []);

  const handleConfirmSkip = useCallback(() => {
    logAnalyticsEvent(ANALYTICS_EVENTS.BIRTH_DATE_COLLECTION_SKIPPED);
    setShowSafetyModal(false);
    // Continue to demo with limited functionality flag
    router.push({
      pathname: '/onboarding/demo',
      params: { 
        limitedFunctionality: 'true',
        reason: 'no_birth_date'
      }
    });
  }, [router]);

  const handleCancelSkip = useCallback(() => {
    setShowSafetyModal(false);
  }, []);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  React.useEffect(() => {
    logAnalyticsEvent(ANALYTICS_EVENTS.BIRTH_DATE_COLLECTION_SHOWN);
  }, []);

  // Progressive disclosure: show month picker after year is selected, day after month
  const showMonthPicker = selectedYear !== '';
  const showDayPicker = selectedMonth !== '' && selectedYear !== '';

  const yearOptions = getYearOptions();
  const monthOptions = getMonthOptions();
  const dayOptions = getDayOptions(selectedMonth, selectedYear);

  return (
    <View style={styles.container}>
      <View style={[styles.content, isMobileWeb && styles.contentMobile]}>
        <Animated.View entering={FadeIn.delay(300).duration(800)} style={styles.header}>
          <View style={[styles.iconContainer, isMobileWeb && styles.iconContainerMobile]}>
            <Calendar size={isMobileWeb ? 32 : 40} color="#007AFF" />
          </View>
          <Text style={[styles.title, isMobileWeb && styles.titleMobile]}>
            Welcome to SafeDose
          </Text>
          <Text style={[styles.subtitle, isMobileWeb && styles.subtitleMobile]}>
            To provide you with age-appropriate safety features, could you please share your birth date?
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(600).duration(800)} style={styles.inputSection}>
          <View style={[styles.datePickerContainer, isMobileWeb && styles.datePickerContainerMobile]}>
            {/* Year Picker - Select first */}
            <View style={styles.pickerWrapper}>
              <DatePickerSelect
                label="Year"
                value={selectedYear}
                onValueChange={handleYearChange}
                items={yearOptions}
                placeholder="Select year"
              />
            </View>

            {/* Month Picker - Progressive disclosure */}
            <View style={styles.pickerWrapper}>
              <DatePickerSelect
                label="Month"
                value={selectedMonth}
                onValueChange={handleMonthChange}
                items={monthOptions}
                placeholder="Select month"
                disabled={!showMonthPicker}
              />
            </View>

            {/* Day Picker - Progressive disclosure */}
            <View style={styles.pickerWrapper}>
              <DatePickerSelect
                label="Day"
                value={selectedDay}
                onValueChange={handleDayChange}
                items={dayOptions}
                placeholder="Select day"
                disabled={!showDayPicker}
              />
            </View>
          </View>

          {/* Birth Date Preview */}
          {isComplete && (
            <Animated.View entering={FadeIn.duration(300)} style={styles.previewContainer}>
              <Text style={[styles.previewLabel, isMobileWeb && styles.previewLabelMobile]}>
                Birth Date:
              </Text>
              <Text style={[styles.previewDate, isMobileWeb && styles.previewDateMobile]}>
                {formatBirthDateForDisplay(birthDate)}
              </Text>
              {isValid && (
                <Text style={[styles.ageText, isMobileWeb && styles.ageTextMobile]}>
                  Age: {calculateAge(birthDate)} years
                </Text>
              )}
            </Animated.View>
          )}

          {/* Error Message */}
          {validationError && (
            <Animated.View entering={FadeIn.duration(300)} style={styles.errorContainer}>
              <Text style={[styles.errorText, isMobileWeb && styles.errorTextMobile]}>
                {validationError}
              </Text>
            </Animated.View>
          )}
          
          <Text style={[styles.privacyNote, isMobileWeb && styles.privacyNoteMobile]}>
            This information helps us provide age-appropriate safety features and warnings.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(900).duration(800)} style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.continueButton,
              isMobileWeb && styles.continueButtonMobile,
              !isValid && styles.continueButtonDisabled
            ]}
            onPress={handleContinue}
            disabled={!isValid}
            accessibilityRole="button"
            accessibilityLabel="Continue with birth date"
            accessibilityHint="Proceed to next step"
          >
            <Text style={[
              styles.continueButtonText,
              isMobileWeb && styles.continueButtonTextMobile,
              !isValid && styles.continueButtonTextDisabled
            ]}>
              Continue
            </Text>
            <ArrowRight size={isMobileWeb ? 18 : 20} color={isValid ? "#FFFFFF" : "#8E8E93"} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.skipButton, isMobileWeb && styles.skipButtonMobile]}
            onPress={handleSkip}
            accessibilityRole="button"
            accessibilityLabel="Skip birth date entry"
            accessibilityHint="Continue without providing birth date"
          >
            <Text style={[styles.skipButtonText, isMobileWeb && styles.skipButtonTextMobile]}>
              Prefer not to answer
            </Text>
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity
          style={[styles.backButton, isMobileWeb && styles.backButtonMobile]}
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={isMobileWeb ? 18 : 20} color="#8E8E93" />
          <Text style={[styles.backButtonText, isMobileWeb && styles.backButtonTextMobile]}>
            Back
          </Text>
        </TouchableOpacity>
      </View>

      {/* Safety Information Modal */}
      <Modal
        visible={showSafetyModal}
        animationType="fade"
        transparent={true}
        onRequestClose={handleCancelSkip}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isMobileWeb && styles.modalContentMobile]}>
            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleCancelSkip}
                  accessibilityRole="button"
                  accessibilityLabel="Close modal"
                >
                  <X size={24} color="#8E8E93" />
                </TouchableOpacity>
              </View>

              <View style={[styles.modalIconContainer, isMobileWeb && styles.modalIconContainerMobile]}>
                <Shield size={isMobileWeb ? 32 : 40} color="#007AFF" />
              </View>

              <Text style={[styles.modalTitle, isMobileWeb && styles.modalTitleMobile]}>
                Why We Ask for Your Birth Date
              </Text>

              <Text style={[styles.modalText, isMobileWeb && styles.modalTextMobile]}>
                We ask for your birth date to ensure your safety, not for data collection or marketing purposes.
              </Text>

              <Text style={[styles.modalWarning, isMobileWeb && styles.modalWarningMobile]}>
                <Text style={styles.boldText}>Important:</Text> Without your birth date, SafeDose will have limited functionality to ensure your safety.
              </Text>

              <View style={[styles.safetyReasons, isMobileWeb && styles.safetyReasonsMobile]}>
                <Text style={[styles.limitationsTitle, isMobileWeb && styles.limitationsTitleMobile]}>
                  Why birth date is important:
                </Text>
                <View style={styles.reasonItem}>
                  <Text style={styles.bulletPoint}>•</Text>
                  <Text style={[styles.reasonText, isMobileWeb && styles.reasonTextMobile]}>
                    <Text style={styles.boldText}>Age-appropriate safety features:</Text> Different age groups require different safety considerations for medications
                  </Text>
                </View>
                <View style={styles.reasonItem}>
                  <Text style={styles.bulletPoint}>•</Text>
                  <Text style={[styles.reasonText, isMobileWeb && styles.reasonTextMobile]}>
                    <Text style={styles.boldText}>Enhanced protections:</Text> Minors receive additional safety resources and warnings
                  </Text>
                </View>
                <View style={styles.reasonItem}>
                  <Text style={styles.bulletPoint}>•</Text>
                  <Text style={[styles.reasonText, isMobileWeb && styles.reasonTextMobile]}>
                    <Text style={styles.boldText}>Age-specific context:</Text> Safety warnings and calculation examples can vary by age group
                  </Text>
                </View>
                
                <Text style={[styles.limitationsTitle, isMobileWeb && styles.limitationsTitleMobile, styles.limitationsSection]}>
                  Without birth date, you'll have:
                </Text>
                <View style={styles.reasonItem}>
                  <Text style={styles.limitationPoint}>⚠</Text>
                  <Text style={[styles.limitationText, isMobileWeb && styles.limitationTextMobile]}>
                    Limited safety warnings and age-specific features
                  </Text>
                </View>
                <View style={styles.reasonItem}>
                  <Text style={styles.limitationPoint}>⚠</Text>
                  <Text style={[styles.limitationText, isMobileWeb && styles.limitationTextMobile]}>
                    Generic calculation examples instead of age-appropriate context
                  </Text>
                </View>
                <View style={styles.reasonItem}>
                  <Text style={styles.limitationPoint}>⚠</Text>
                  <Text style={[styles.limitationText, isMobileWeb && styles.limitationTextMobile]}>
                    Reduced personalized safety features
                  </Text>
                </View>
              </View>

              <Text style={[styles.modalDisclaimer, isMobileWeb && styles.modalDisclaimerMobile]}>
                Your privacy is important to us. This information is only used to provide you with age-appropriate safety features.
              </Text>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.goBackButton, isMobileWeb && styles.goBackButtonMobile]}
                  onPress={handleCancelSkip}
                  accessibilityRole="button"
                  accessibilityLabel="Go back to provide birth date"
                >
                  <Text style={[styles.goBackButtonText, isMobileWeb && styles.goBackButtonTextMobile]}>
                    I'll Provide My Birth Date
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.proceedButton, isMobileWeb && styles.proceedButtonMobile]}
                  onPress={handleConfirmSkip}
                  accessibilityRole="button"
                  accessibilityLabel="Continue without providing birth date"
                >
                  <Text style={[styles.proceedButtonText, isMobileWeb && styles.proceedButtonTextMobile]}>
                    Accept Limited Functionality
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
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
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: '85%',
  },
  inputSection: {
    alignItems: 'center',
  },
  datePickerContainer: {
    width: '100%',
    maxWidth: 350,
    marginBottom: 24,
  },
  pickerWrapper: {
    marginBottom: 8,
  },
  previewContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 4,
  },
  previewDate: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  ageText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
  },
  errorContainer: {
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    textAlign: 'center',
    fontWeight: '500',
  },
  privacyNote: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: '80%',
  },
  buttonContainer: {
    alignItems: 'center',
    gap: 16,
  },
  continueButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 200,
    justifyContent: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: '#F2F2F7',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  continueButtonTextDisabled: {
    color: '#8E8E93',
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  skipButtonText: {
    color: '#8E8E93',
    fontSize: 16,
    fontWeight: '500',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    color: '#8E8E93',
    fontSize: 16,
    fontWeight: '500',
  },

  // Mobile-specific styles
  contentMobile: {
    paddingHorizontal: 20,
  },
  iconContainerMobile: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 20,
  },
  titleMobile: {
    fontSize: 24,
    marginBottom: 10,
  },
  subtitleMobile: {
    fontSize: 16,
    lineHeight: 22,
    maxWidth: '90%',
  },
  datePickerContainerMobile: {
    maxWidth: 320,
    marginBottom: 20,
  },
  previewLabelMobile: {
    fontSize: 13,
  },
  previewDateMobile: {
    fontSize: 16,
  },
  ageTextMobile: {
    fontSize: 13,
  },
  errorTextMobile: {
    fontSize: 13,
  },
  privacyNoteMobile: {
    fontSize: 13,
    lineHeight: 18,
    maxWidth: '85%',
  },
  continueButtonMobile: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    minWidth: 180,
  },
  continueButtonTextMobile: {
    fontSize: 16,
  },
  skipButtonMobile: {
    paddingVertical: 10,
  },
  skipButtonTextMobile: {
    fontSize: 15,
  },
  backButtonMobile: {
    paddingVertical: 10,
  },
  backButtonTextMobile: {
    fontSize: 15,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    maxWidth: 400,
    width: '100%',
    maxHeight: '85%',
  },
  modalScrollContent: {
    paddingBottom: 10,
  },
  modalHeader: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  closeButton: {
    padding: 8,
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 16,
  },
  modalWarning: {
    fontSize: 15,
    color: '#D97706',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 20,
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  safetyReasons: {
    marginBottom: 20,
  },
  limitationsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'left',
  },
  limitationsSection: {
    marginTop: 16,
  },
  limitationPoint: {
    fontSize: 16,
    color: '#D97706',
    fontWeight: '600',
    marginRight: 8,
    marginTop: 2,
  },
  limitationText: {
    fontSize: 15,
    color: '#D97706',
    lineHeight: 22,
    flex: 1,
    fontWeight: '500',
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bulletPoint: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
    marginRight: 8,
    marginTop: 2,
  },
  reasonText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    flex: 1,
  },
  boldText: {
    fontWeight: '600',
    color: '#000000',
  },
  modalDisclaimer: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 24,
  },
  modalButtons: {
    gap: 12,
  },
  goBackButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  goBackButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  proceedButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  proceedButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '500',
  },

  // Mobile modal styles
  modalContentMobile: {
    padding: 20,
    maxWidth: '100%',
  },
  modalIconContainerMobile: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginBottom: 16,
  },
  modalTitleMobile: {
    fontSize: 20,
    marginBottom: 14,
  },
  modalTextMobile: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 14,
  },
  modalWarningMobile: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 18,
  },
  safetyReasonsMobile: {
    marginBottom: 18,
  },
  limitationsTitleMobile: {
    fontSize: 15,
    marginBottom: 6,
  },
  limitationTextMobile: {
    fontSize: 14,
    lineHeight: 20,
  },
  reasonTextMobile: {
    fontSize: 14,
    lineHeight: 20,
  },
  modalDisclaimerMobile: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
  },
  goBackButtonMobile: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  goBackButtonTextMobile: {
    fontSize: 15,
  },
  proceedButtonMobile: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  proceedButtonTextMobile: {
    fontSize: 15,
  },
});