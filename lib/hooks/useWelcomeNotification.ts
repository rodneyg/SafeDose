import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WELCOME_SHOWN_KEY = 'welcome_shown_';

export function useWelcomeNotification() {
  const { user } = useAuth();
  const previousUserRef = useRef<typeof user>(null);

  useEffect(() => {
    const handleUserTransition = async () => {
      const previousUser = previousUserRef.current;
      const currentUser = user;

      // Detect transition from anonymous to authenticated
      if (
        previousUser?.isAnonymous && 
        currentUser && 
        !currentUser.isAnonymous &&
        previousUser.uid !== currentUser.uid
      ) {
        console.log('[WelcomeNotification] Anonymous user became authenticated, showing welcome message');
        
        // Check if we've already shown the welcome for this user
        const welcomeShownKey = `${WELCOME_SHOWN_KEY}${currentUser.uid}`;
        
        try {
          const alreadyShown = await AsyncStorage.getItem(welcomeShownKey);
          
          if (!alreadyShown) {
            // Show welcome alert
            Alert.alert(
              "Welcome!",
              "You've got 15 free logs—upgrade to Pro for unlimited.",
              [{ text: "Got it!", style: "default" }],
              { cancelable: true }
            );
            
            // Mark as shown so we don't show it again
            await AsyncStorage.setItem(welcomeShownKey, 'true');
            
            console.log('[WelcomeNotification] Welcome alert shown and marked as displayed');
          } else {
            console.log('[WelcomeNotification] Welcome already shown for this user');
          }
        } catch (error) {
          console.error('[WelcomeNotification] Error handling welcome message:', error);
        }
      }

      // Update the ref for next comparison
      previousUserRef.current = currentUser;
    };

    handleUserTransition();
  }, [user]);
}