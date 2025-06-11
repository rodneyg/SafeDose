import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Mail } from 'lucide-react-native';

interface SignUpPromptProps {
  visible: boolean;
  onSignUp: () => void;
  onDismiss: () => void;
  onShow: () => void;
}

export default function SignUpPrompt({ visible, onSignUp, onDismiss, onShow }: SignUpPromptProps) {
  const router = useRouter();
  const slideAnim = React.useRef(new Animated.Value(100)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Call onShow when the prompt becomes visible
      onShow();
      
      // Animate in
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate out
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 100,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, opacityAnim, onShow]);

  const handleSignUp = () => {
    onSignUp();
    router.push('/login');
  };

  if (!visible) return null;

  return (
    <Animated.View 
      style={[
        styles.container, 
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        }
      ]}
    >
      <View style={styles.content}>
        <View style={styles.textContainer}>
          <Text style={styles.message}>
            Save your dosing history and get more free logs—sign up now!
          </Text>
        </View>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.signUpButton} 
            onPress={handleSignUp}
            activeOpacity={0.8}
          >
            <Mail size={16} color="#FFFFFF" style={styles.icon} />
            <Text style={styles.signUpButtonText}>Sign Up Free</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.dismissButton} 
            onPress={onDismiss}
            activeOpacity={0.6}
          >
            <Text style={styles.dismissButtonText}>Maybe Later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 10, // For Android
  },
  content: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginHorizontal: 0,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8, // For Android
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  textContainer: {
    marginBottom: 16,
  },
  message: {
    fontSize: 13,
    color: '#333333',
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  signUpButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20, // Pill-shaped
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    maxWidth: 140,
  },
  signUpButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  icon: {
    marginRight: 2,
  },
  dismissButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dismissButtonText: {
    color: '#8E8E93',
    fontSize: 13,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});