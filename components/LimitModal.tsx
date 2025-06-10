import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { logAnalyticsEvent, ANALYTICS_EVENTS } from '../lib/analytics';
import { saveLead, isValidEmail } from '../lib/leads';

interface LimitModalProps {
  visible: boolean;
  isAnonymous: boolean;
  isPremium?: boolean;
  onClose: () => void;
}

export default function LimitModal({ visible, isAnonymous, isPremium = false, onClose }: LimitModalProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [exitSurvey, setExitSurvey] = useState('');
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
  const [emailSubmitted, setEmailSubmitted] = useState(false);

  console.log('[LimitModal] Rendering', { visible, isAnonymous, isPremium });

  React.useEffect(() => {
    if (visible) {
      logAnalyticsEvent(ANALYTICS_EVENTS.LIMIT_MODAL_VIEW);
    }
  }, [visible]);

  const handleSignIn = () => {
    console.log('[LimitModal] Sign In button pressed');
    logAnalyticsEvent(ANALYTICS_EVENTS.LIMIT_MODAL_ACTION, { action: 'sign_in' });
    router.push('/login');
    onClose();
  };

  const handleUpgrade = () => {
    console.log('[LimitModal] Upgrade button pressed');
    logAnalyticsEvent(ANALYTICS_EVENTS.LIMIT_MODAL_ACTION, { action: 'upgrade' });
    router.push('/pricing');
    onClose();
  };

  const handleCancel = () => {
    console.log('[LimitModal] Cancel button pressed');
    logAnalyticsEvent(ANALYTICS_EVENTS.LIMIT_MODAL_ACTION, { action: 'cancel' });
    onClose();
  };

  const handleEmailSubmit = async () => {
    if (!email.trim()) {
      Alert.alert('Email Required', 'Please enter your email address.');
      return;
    }

    if (!isValidEmail(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setIsSubmittingEmail(true);
    
    try {
      await saveLead(email.trim(), isAnonymous, exitSurvey.trim() || undefined);
      setEmailSubmitted(true);
      
      // Show success message briefly, then allow user to continue
      setTimeout(() => {
        setEmailSubmitted(false);
        setEmail('');
        setExitSurvey('');
      }, 2000);
      
    } catch (error) {
      console.error('[LimitModal] Failed to submit email:', error);
      Alert.alert(
        'Submission Failed',
        'We couldn\'t save your email right now. Please try again later.'
      );
    } finally {
      setIsSubmittingEmail(false);
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>
            {isAnonymous ? 'Free Scan Limit Reached' : 'Plan Limit Reached'}
          </Text>
          <Text style={styles.message}>
            {isAnonymous
              ? 'You’ve used all 3 free scans. Sign in to get 10 scans per month or upgrade for more.'
              : 'You’ve reached your plan’s scan limit. Upgrade to a premium plan for additional scans.'}
          </Text>
          {/* Email capture section */}
          {!emailSubmitted && (
            <View style={styles.emailSection}>
              <Text style={styles.emailLabel}>
                Enter your email to hear about promos, updates, or request features
              </Text>
              <TextInput
                style={styles.emailInput}
                value={email}
                onChangeText={setEmail}
                placeholder="your@email.com"
                placeholderTextColor="#999999"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              
              {/* Exit survey */}
              <Text style={styles.surveyLabel}>
                What would make this worth paying for?
              </Text>
              <TextInput
                style={styles.surveyInput}
                value={exitSurvey}
                onChangeText={(text) => {
                  if (text.length <= 100) {
                    setExitSurvey(text);
                  }
                }}
                placeholder="Tell us what you'd like to see..."
                placeholderTextColor="#999999"
                multiline
                maxLength={100}
              />
              <Text style={styles.charCount}>
                {exitSurvey.length}/100
              </Text>

              {email.trim() && (
                <TouchableOpacity 
                  style={[styles.button, styles.emailButton]} 
                  onPress={handleEmailSubmit}
                  disabled={isSubmittingEmail}
                >
                  <Text style={styles.buttonText}>
                    {isSubmittingEmail ? 'Submitting...' : 'Submit'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Success message */}
          {emailSubmitted && (
            <>
              <Text style={styles.successTitle}>Got it!</Text>
              <Text style={styles.successMessage}>
                We'll keep you in the loop with updates, promos, and new features.
              </Text>
            </>
          )}
          <View style={styles.buttonContainer}>
            {isAnonymous && (
              <TouchableOpacity style={[styles.button, styles.signInButton]} onPress={handleSignIn}>
                <Text style={styles.buttonText}>Sign In</Text>
              </TouchableOpacity>
            )}
            {!isPremium && (
              <TouchableOpacity style={[styles.button, styles.upgradeButton]} onPress={handleUpgrade}>
                <Text style={styles.buttonText}>Upgrade</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={handleCancel}>
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: '#333333',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'column',
    gap: 12,
    width: '100%',
  },
  button: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  signInButton: {
    backgroundColor: '#007AFF',
  },
  upgradeButton: {
    backgroundColor: '#34C759',
  },
  cancelButton: {
    backgroundColor: '#8E8E93',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emailSection: {
    width: '100%',
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  emailLabel: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 8,
    fontWeight: '500',
  },
  emailInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  surveyLabel: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 8,
    fontWeight: '500',
  },
  surveyInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 4,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'right',
    marginBottom: 12,
  },
  emailButton: {
    backgroundColor: '#FF6B35',
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#34C759',
    textAlign: 'center',
    marginBottom: 12,
  },
  successMessage: {
    fontSize: 16,
    color: '#333333',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
});