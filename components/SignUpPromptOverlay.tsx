import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Mail, X } from 'lucide-react-native';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';
import { isMobileWeb } from '../lib/utils';
import { logAnalyticsEvent, ANALYTICS_EVENTS } from '../lib/analytics';

interface SignUpPromptOverlayProps {
  visible: boolean;
  onSignUpPress: () => void;
  onDismiss: () => void;
}

export default function SignUpPromptOverlay({ 
  visible, 
  onSignUpPress, 
  onDismiss 
}: SignUpPromptOverlayProps) {
  const handleSignUpPress = useCallback(() => {
    logAnalyticsEvent(ANALYTICS_EVENTS.SIGNUP_PROMPT_CLICKED, {
      source: 'signup_prompt'
    });
    onSignUpPress();
  }, [onSignUpPress]);

  const handleDismiss = useCallback(() => {
    logAnalyticsEvent(ANALYTICS_EVENTS.SIGNUP_PROMPT_DISMISSED, {
      source: 'signup_prompt'
    });
    onDismiss();
  }, [onDismiss]);

  if (!visible) return null;

  return (
    <Animated.View 
      entering={FadeInUp.duration(300)} 
      exiting={FadeOutDown.duration(200)}
      style={[
        styles.overlay,
        isMobileWeb && styles.overlayMobile,
        Platform.OS === 'web' && styles.overlayWeb
      ]}
    >
      <View style={[styles.container, isMobileWeb && styles.containerMobile]}>
        {/* Close button */}
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={handleDismiss}
          accessibilityRole="button"
          accessibilityLabel="Close sign-up prompt"
          accessibilityHint="Dismiss this prompt for 24 hours"
        >
          <X color="#8E8E93" size={16} />
        </TouchableOpacity>

        {/* Main content */}
        <View style={styles.content}>
          <Text style={[styles.text, isMobileWeb && styles.textMobile]}>
            Save your dosing history and get more free logs—sign up now!
          </Text>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.signUpButton, isMobileWeb && styles.signUpButtonMobile]}
              onPress={handleSignUpPress}
              accessibilityRole="button"
              accessibilityLabel="Sign up free"
              accessibilityHint="Sign up with Google to save your progress"
            >
              <Mail color="#ffffff" size={16} />
              <Text style={[styles.signUpButtonText, isMobileWeb && styles.signUpButtonTextMobile]}>
                Sign Up Free
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.maybeLaterButton}
              onPress={handleDismiss}
              accessibilityRole="button"
              accessibilityLabel="Maybe later"
              accessibilityHint="Dismiss this prompt for 24 hours"
            >
              <Text style={[styles.maybeLaterText, isMobileWeb && styles.maybeLaterTextMobile]}>
                Maybe Later
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 34, // Safe area padding for home indicator
    zIndex: 1000,
  },
  overlayMobile: {
    paddingBottom: 20,
  },
  overlayWeb: {
    paddingBottom: 20,
  },
  container: {
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    position: 'relative',
  },
  containerMobile: {
    borderRadius: 12,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 16,
  },
  text: {
    fontSize: 15,
    lineHeight: 20,
    color: '#1C1C1E',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '500',
  },
  textMobile: {
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 14,
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  signUpButton: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    gap: 8,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  signUpButtonMobile: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    gap: 6,
  },
  signUpButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  signUpButtonTextMobile: {
    fontSize: 14,
  },
  maybeLaterButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  maybeLaterText: {
    color: '#8E8E93',
    fontSize: 15,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  maybeLaterTextMobile: {
    fontSize: 14,
  },
});