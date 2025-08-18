import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { ArrowRight, ArrowLeft, Calendar } from 'lucide-react-native';
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

  // Calculate if current selection is valid
  const isComplete = selectedMonth && selectedDay && selectedYear;
  const birthDate = isComplete ? `${selectedYear}-${selectedMonth}-${selectedDay}` : '';
  const validation = isComplete ? validateBirthDate(birthDate) : { isValid: false };
  const isValid = validation.isValid;

  const handleMonthChange = useCallback((month: string) => {
    setSelectedMonth(month);
    setValidationError('');
    
    // Reset day if it's invalid for the new month
    if (selectedDay && selectedYear && month) {
      const daysInMonth = getDayOptions(month, selectedYear);
      const dayExists = daysInMonth.some(day => day.value === selectedDay);
      if (!dayExists) {
        setSelectedDay('');
      }
    }
  }, [selectedDay, selectedYear]);

  const handleDayChange = useCallback((day: string) => {
    setSelectedDay(day);
    setValidationError('');
  }, []);

  const handleYearChange = useCallback((year: string) => {
    setSelectedYear(year);
    setValidationError('');
    
    // Reset day if it's invalid for the new year (e.g., Feb 29 in non-leap year)
    if (selectedDay && selectedMonth && year) {
      const daysInMonth = getDayOptions(selectedMonth, year);
      const dayExists = daysInMonth.some(day => day.value === selectedDay);
      if (!dayExists) {
        setSelectedDay('');
      }
    }
  }, [selectedDay, selectedMonth]);

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
    logAnalyticsEvent(ANALYTICS_EVENTS.BIRTH_DATE_COLLECTION_SKIPPED);
    // Continue to demo without birth date information
    router.push('/onboarding/demo');
  }, [router]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  React.useEffect(() => {
    logAnalyticsEvent(ANALYTICS_EVENTS.BIRTH_DATE_COLLECTION_SHOWN);
  }, []);

  // Progressive disclosure: only show day picker after month is selected
  const showDayPicker = selectedMonth !== '';
  // Only show year picker after both month and day are selected (optional UX choice)
  const showYearPicker = true; // We'll show all three for better UX

  const monthOptions = getMonthOptions();
  const dayOptions = getDayOptions(selectedMonth, selectedYear);
  const yearOptions = getYearOptions();

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
            To provide you with the most appropriate guidance, could you please share your birth date?
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(600).duration(800)} style={styles.inputSection}>
          <View style={[styles.datePickerContainer, isMobileWeb && styles.datePickerContainerMobile]}>
            {/* Month Picker */}
            <View style={styles.pickerWrapper}>
              <DatePickerSelect
                label="Month"
                value={selectedMonth}
                onValueChange={handleMonthChange}
                items={monthOptions}
                placeholder="Select month"
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

            {/* Year Picker */}
            <View style={styles.pickerWrapper}>
              <DatePickerSelect
                label="Year"
                value={selectedYear}
                onValueChange={handleYearChange}
                items={yearOptions}
                placeholder="Select year"
                disabled={!showYearPicker}
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
            This information helps us provide age-appropriate guidance and safety features.
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
});