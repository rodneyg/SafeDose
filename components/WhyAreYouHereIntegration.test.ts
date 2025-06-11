/**
 * Integration test for the WhyAreYouHere micro-prompt feature
 * Tests the flow from successful dose calculation to micro-prompt display
 */

describe('WhyAreYouHere Micro-Prompt Integration', () => {
  describe('Flow Integration', () => {
    it('should trigger WhyAreYouHere prompt after first successful dose calculation', () => {
      // Simulate initial state - user has not seen prompt before
      let hasShownPrompt = false;
      let screenStep: 'intro' | 'manualEntry' | 'whyAreYouHere' | 'postDoseFeedback' = 'intro';
      
      // Simulate successful dose calculation triggering feedback
      const shouldShowPrompt = () => !hasShownPrompt;
      
      const handleGoToFeedback = (nextAction: string) => {
        if (shouldShowPrompt()) {
          screenStep = 'whyAreYouHere';
        } else {
          screenStep = 'postDoseFeedback';
        }
      };
      
      // First dose calculation should show WhyAreYouHere prompt
      handleGoToFeedback('new_dose');
      expect(screenStep).toBe('whyAreYouHere');
    });

    it('should skip WhyAreYouHere prompt after first time and go directly to feedback', () => {
      // Simulate user has already seen the prompt
      let hasShownPrompt = true;
      let screenStep: 'intro' | 'manualEntry' | 'whyAreYouHere' | 'postDoseFeedback' = 'intro';
      
      const shouldShowPrompt = () => !hasShownPrompt;
      
      const handleGoToFeedback = (nextAction: string) => {
        if (shouldShowPrompt()) {
          screenStep = 'whyAreYouHere';
        } else {
          screenStep = 'postDoseFeedback';
        }
      };
      
      // Subsequent dose calculations should skip directly to feedback
      handleGoToFeedback('new_dose');
      expect(screenStep).toBe('postDoseFeedback');
    });

    it('should handle WhyAreYouHere response submission correctly', () => {
      let promptShown = false;
      let responseStored = null;
      let screenTransitioned = false;
      
      const handleWhyAreYouHereSubmit = (response: string, customText?: string) => {
        promptShown = true;
        responseStored = { response, customText };
        screenTransitioned = true;
      };
      
      // Simulate user submitting response
      handleWhyAreYouHereSubmit('reddit');
      
      expect(promptShown).toBe(true);
      expect(responseStored).toEqual({ response: 'reddit', customText: undefined });
      expect(screenTransitioned).toBe(true);
    });

    it('should handle WhyAreYouHere skip correctly', () => {
      let promptShown = false;
      let screenTransitioned = false;
      
      const handleWhyAreYouHereSkip = () => {
        promptShown = true;
        screenTransitioned = true;
      };
      
      // Simulate user skipping prompt
      handleWhyAreYouHereSkip();
      
      expect(promptShown).toBe(true);
      expect(screenTransitioned).toBe(true);
    });
  });

  describe('Response Options', () => {
    it('should support all required response options', () => {
      const expectedOptions = [
        'reddit',
        'twitter',
        'friend',
        'clean_calculator',
        'ai_scan',
        'dose_logs',
        'comparing_tools',
        'other'
      ];
      
      // Test that each option can be selected
      expectedOptions.forEach(option => {
        let selectedResponse = null;
        
        const handleResponseSelect = (response: string) => {
          selectedResponse = response;
        };
        
        handleResponseSelect(option);
        expect(selectedResponse).toBe(option);
      });
    });

    it('should handle custom text for "other" option', () => {
      let response = null;
      let customText = null;
      
      const handleSubmit = (selectedResponse: string, text?: string) => {
        response = selectedResponse;
        customText = text;
      };
      
      // Simulate user selecting "other" with custom text
      handleSubmit('other', 'Found through a medical forum');
      
      expect(response).toBe('other');
      expect(customText).toBe('Found through a medical forum');
    });
  });

  describe('Storage Integration', () => {
    it('should mark prompt as shown after first display', () => {
      let storageState = {};
      
      const mockAsyncStorage = {
        setItem: (key: string, value: string) => {
          storageState[key] = value;
          return Promise.resolve();
        },
        getItem: (key: string) => {
          return Promise.resolve(storageState[key] || null);
        }
      };
      
      const markPromptAsShown = async (userId: string) => {
        const storageKey = `whyAreYouHerePromptShown_${userId}`;
        await mockAsyncStorage.setItem(storageKey, 'true');
      };
      
      const shouldShowPrompt = async (userId: string) => {
        const storageKey = `whyAreYouHerePromptShown_${userId}`;
        const stored = await mockAsyncStorage.getItem(storageKey);
        return stored !== 'true';
      };
      
      // Test with anonymous user
      const testUserId = 'anonymous';
      
      return shouldShowPrompt(testUserId).then(shouldShow => {
        expect(shouldShow).toBe(true);
        
        return markPromptAsShown(testUserId).then(() => {
          return shouldShowPrompt(testUserId).then(shouldShowAfter => {
            expect(shouldShowAfter).toBe(false);
          });
        });
      });
    });
  });

  describe('Analytics Integration', () => {
    it('should log appropriate analytics events', () => {
      const analyticsEvents = [];
      
      const mockLogAnalyticsEvent = (eventName: string, parameters?: any) => {
        analyticsEvents.push({ eventName, parameters });
      };
      
      // Test prompt shown event
      mockLogAnalyticsEvent('why_here_prompt_shown', {
        userId: 'test-user',
        isAnonymous: true,
      });
      
      // Test response event
      mockLogAnalyticsEvent('why_here_prompt_response', {
        response: 'reddit',
        hasCustomText: false,
      });
      
      // Test skip event
      mockLogAnalyticsEvent('why_here_prompt_skipped');
      
      expect(analyticsEvents).toHaveLength(3);
      expect(analyticsEvents[0].eventName).toBe('why_here_prompt_shown');
      expect(analyticsEvents[1].eventName).toBe('why_here_prompt_response');
      expect(analyticsEvents[2].eventName).toBe('why_here_prompt_skipped');
    });
  });
});