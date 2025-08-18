import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Heart, Phone, ArrowRight, Shield } from 'lucide-react-native';
import { logAnalyticsEvent, ANALYTICS_EVENTS } from '@/lib/analytics';
import { isMobileWeb } from '@/lib/utils';

export default function ChildSafety() {
  const router = useRouter();
  const { age } = useLocalSearchParams<{ age: string }>();

  const handleContinue = useCallback(() => {
    logAnalyticsEvent(ANALYTICS_EVENTS.CHILD_SAFETY_CONTINUE, {
      age: age ? parseInt(age) : null
    });
    
    // Continue to demo with age information
    router.push({
      pathname: '/onboarding/demo',
      params: { age: age || '' }
    });
  }, [age, router]);

  const handleSeekHelp = useCallback(async () => {
    logAnalyticsEvent(ANALYTICS_EVENTS.CHILD_SAFETY_SEEK_HELP, {
      age: age ? parseInt(age) : null
    });

    // On web, show information about seeking help
    // On mobile, this could potentially open relevant apps or websites
    const helpMessage = `
Important Resources for Young People:

• Talk to a trusted adult (parent, guardian, teacher, or school counselor)
• Consult with your doctor or healthcare provider
• Call your local poison control center if you have medication questions
• In emergencies, always call 911

Remember: Medication safety is serious, and it's always best to have adult guidance.
    `.trim();

    if (isMobileWeb) {
      alert(helpMessage);
    } else {
      // On native mobile, we could potentially open health apps or websites
      alert(helpMessage);
    }
  }, [age]);

  React.useEffect(() => {
    logAnalyticsEvent(ANALYTICS_EVENTS.CHILD_SAFETY_SCREEN_SHOWN, {
      age: age ? parseInt(age) : null
    });
  }, [age]);

  return (
    <View style={styles.container}>
      <View style={[styles.content, isMobileWeb && styles.contentMobile]}>
        <Animated.View entering={FadeIn.delay(300).duration(800)} style={styles.header}>
          <View style={[styles.iconContainer, isMobileWeb && styles.iconContainerMobile]}>
            <Shield size={isMobileWeb ? 32 : 40} color="#007AFF" />
          </View>
          <Text style={[styles.title, isMobileWeb && styles.titleMobile]}>
            Your Safety Matters
          </Text>
          <Text style={[styles.subtitle, isMobileWeb && styles.subtitleMobile]}>
            We care about keeping you safe and healthy
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(600).duration(800)} style={styles.messageContainer}>
          <View style={[styles.messageCard, isMobileWeb && styles.messageCardMobile]}>
            <View style={[styles.cardIcon, isMobileWeb && styles.cardIconMobile]}>
              <Heart size={isMobileWeb ? 20 : 24} color="#FF6B6B" />
            </View>
            <Text style={[styles.messageTitle, isMobileWeb && styles.messageTitleMobile]}>
              Important Guidance
            </Text>
            <Text style={[styles.messageText, isMobileWeb && styles.messageTextMobile]}>
              Medication safety is very important, especially for young people. We strongly recommend talking with:
            </Text>
            
            <View style={[styles.recommendationsList, isMobileWeb && styles.recommendationsListMobile]}>
              <View style={styles.recommendationItem}>
                <Text style={styles.bulletPoint}>•</Text>
                <Text style={[styles.recommendationText, isMobileWeb && styles.recommendationTextMobile]}>
                  Your parents or guardian
                </Text>
              </View>
              <View style={styles.recommendationItem}>
                <Text style={styles.bulletPoint}>•</Text>
                <Text style={[styles.recommendationText, isMobileWeb && styles.recommendationTextMobile]}>
                  Your doctor or healthcare provider
                </Text>
              </View>
              <View style={styles.recommendationItem}>
                <Text style={styles.bulletPoint}>•</Text>
                <Text style={[styles.recommendationText, isMobileWeb && styles.recommendationTextMobile]}>
                  A pharmacist or school nurse
                </Text>
              </View>
            </View>

            <Text style={[styles.disclaimerText, isMobileWeb && styles.disclaimerTextMobile]}>
              This app provides educational information, but it's not a substitute for professional medical advice.
            </Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(900).duration(800)} style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.helpButton, isMobileWeb && styles.helpButtonMobile]}
            onPress={handleSeekHelp}
            accessibilityRole="button"
            accessibilityLabel="Get help and resources"
            accessibilityHint="View resources for getting help with medication questions"
          >
            <Phone size={isMobileWeb ? 18 : 20} color="#FFFFFF" />
            <Text style={[styles.helpButtonText, isMobileWeb && styles.helpButtonTextMobile]}>
              Find Help & Resources
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.continueButton, isMobileWeb && styles.continueButtonMobile]}
            onPress={handleContinue}
            accessibilityRole="button"
            accessibilityLabel="Continue to app"
            accessibilityHint="Proceed to the main application"
          >
            <Text style={[styles.continueButtonText, isMobileWeb && styles.continueButtonTextMobile]}>
              I Understand, Continue
            </Text>
            <ArrowRight size={isMobileWeb ? 18 : 20} color="#007AFF" />
          </TouchableOpacity>
        </Animated.View>

        <Text style={[styles.footerNote, isMobileWeb && styles.footerNoteMobile]}>
          Remember: When in doubt, always ask a trusted adult for help
        </Text>
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
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 17,
    color: '#6B7280',
    textAlign: 'center',
  },
  messageContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  messageCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFE5E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    alignSelf: 'center',
  },
  messageTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 12,
  },
  messageText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 20,
  },
  recommendationsList: {
    marginBottom: 20,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  bulletPoint: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    marginRight: 12,
    marginTop: 2,
  },
  recommendationText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 22,
    flex: 1,
  },
  disclaimerText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  buttonContainer: {
    alignItems: 'center',
    gap: 16,
    paddingBottom: 20,
  },
  helpButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 240,
    justifyContent: 'center',
  },
  helpButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  continueButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 240,
    justifyContent: 'center',
  },
  continueButtonText: {
    color: '#007AFF',
    fontSize: 17,
    fontWeight: '600',
  },
  footerNote: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
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
    marginBottom: 6,
  },
  messageCardMobile: {
    padding: 20,
    borderRadius: 12,
  },
  cardIconMobile: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 12,
  },
  messageTitleMobile: {
    fontSize: 18,
    marginBottom: 10,
  },
  messageTextMobile: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  recommendationsListMobile: {
    marginBottom: 16,
  },
  recommendationTextMobile: {
    fontSize: 15,
    lineHeight: 20,
  },
  disclaimerTextMobile: {
    fontSize: 13,
    lineHeight: 18,
  },
  helpButtonMobile: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    minWidth: 220,
  },
  helpButtonTextMobile: {
    fontSize: 16,
  },
  continueButtonMobile: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    minWidth: 220,
  },
  continueButtonTextMobile: {
    fontSize: 16,
  },
  footerNoteMobile: {
    fontSize: 13,
    lineHeight: 18,
  },
});