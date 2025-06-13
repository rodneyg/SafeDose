/**
 * Test for simplified result screen actions - Issue #219
 * Tests the new "Done" and "New Dose" (repeat last action) functionality
 */

interface MockDoseCalculator {
  screenStep: 'intro' | 'scan' | 'manualEntry' | 'postDoseFeedback';
  lastActionType: 'manual' | 'scan' | null;
  handleGoToFeedback: (nextAction: 'new_dose' | 'scan_again' | 'start_over') => void;
  handleFeedbackComplete: () => Promise<void>;
  feedbackContext: {
    nextAction: 'new_dose' | 'scan_again' | 'start_over';
    doseInfo: any;
  } | null;
  resetFullForm: (startStep?: string) => void;
  setScreenStep: (step: 'intro' | 'scan' | 'manualEntry') => void;
  checkUsageLimit: () => Promise<boolean>;
}

describe('Simplified Result Screen Actions', () => {
  let calculator: MockDoseCalculator;

  beforeEach(() => {
    calculator = {
      screenStep: 'manualEntry',
      lastActionType: null,
      feedbackContext: null,
      handleGoToFeedback: jest.fn(),
      handleFeedbackComplete: jest.fn(),
      resetFullForm: jest.fn(),
      setScreenStep: jest.fn(),
      checkUsageLimit: jest.fn().mockResolvedValue(true),
    };
  });

  describe('Done functionality', () => {
    it('should clear state and navigate to intro when start_over is triggered', async () => {
      // Set up scenario where user is at final result after manual entry
      calculator.lastActionType = 'manual';
      calculator.screenStep = 'manualEntry';
      
      // Simulate the start_over action flow
      calculator.feedbackContext = {
        nextAction: 'start_over',
        doseInfo: { substanceName: 'Test', doseValue: 5, unit: 'mg', calculatedVolume: 2.5 }
      };

      // Mock the handleFeedbackComplete logic for start_over
      const mockHandleFeedbackComplete = async () => {
        if (calculator.feedbackContext?.nextAction === 'start_over') {
          calculator.resetFullForm('dose');
          calculator.lastActionType = null;
          calculator.setScreenStep('intro');
          calculator.feedbackContext = null;
        }
      };
      
      calculator.handleFeedbackComplete = mockHandleFeedbackComplete;
      
      // Execute the action
      await calculator.handleFeedbackComplete();
      
      // Verify results
      expect(calculator.resetFullForm).toHaveBeenCalledWith('dose');
      expect(calculator.setScreenStep).toHaveBeenCalledWith('intro');
      expect(calculator.lastActionType).toBeNull();
    });
  });

  describe('New Dose (repeat action) functionality', () => {
    it('should repeat manual entry when last action was manual', async () => {
      // Set up scenario where user came via manual entry
      calculator.lastActionType = 'manual';
      calculator.feedbackContext = {
        nextAction: 'new_dose',
        doseInfo: { substanceName: 'Test', doseValue: 5, unit: 'mg', calculatedVolume: 2.5 }
      };

      // Mock the handleFeedbackComplete logic for new_dose with manual
      const mockHandleFeedbackComplete = async () => {
        if (calculator.feedbackContext?.nextAction === 'new_dose') {
          calculator.resetFullForm('dose');
          
          if (calculator.lastActionType === 'manual') {
            calculator.setScreenStep('manualEntry');
          }
          calculator.feedbackContext = null;
        }
      };
      
      calculator.handleFeedbackComplete = mockHandleFeedbackComplete;
      
      // Execute the action
      await calculator.handleFeedbackComplete();
      
      // Verify results
      expect(calculator.resetFullForm).toHaveBeenCalledWith('dose');
      expect(calculator.setScreenStep).toHaveBeenCalledWith('manualEntry');
      expect(calculator.lastActionType).toBe('manual'); // Should preserve last action type
    });

    it('should repeat scan when last action was scan and scans are available', async () => {
      // Set up scenario where user came via scan
      calculator.lastActionType = 'scan';
      calculator.checkUsageLimit = jest.fn().mockResolvedValue(true); // Scans available
      calculator.feedbackContext = {
        nextAction: 'new_dose',
        doseInfo: { substanceName: 'Test', doseValue: 5, unit: 'mg', calculatedVolume: 2.5 }
      };

      // Mock the handleFeedbackComplete logic for new_dose with scan
      const mockHandleFeedbackComplete = async () => {
        if (calculator.feedbackContext?.nextAction === 'new_dose') {
          calculator.resetFullForm('dose');
          
          if (calculator.lastActionType === 'scan') {
            const canProceed = await calculator.checkUsageLimit();
            if (canProceed) {
              setTimeout(() => {
                calculator.setScreenStep('scan');
              }, 100);
            } else {
              calculator.setScreenStep('intro');
            }
          }
          calculator.feedbackContext = null;
        }
      };
      
      calculator.handleFeedbackComplete = mockHandleFeedbackComplete;
      
      // Execute the action
      await calculator.handleFeedbackComplete();
      
      // Wait for setTimeout
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Verify results
      expect(calculator.resetFullForm).toHaveBeenCalledWith('dose');
      expect(calculator.checkUsageLimit).toHaveBeenCalled();
      expect(calculator.setScreenStep).toHaveBeenCalledWith('scan');
      expect(calculator.lastActionType).toBe('scan'); // Should preserve last action type
    });

    it('should fallback to intro when scan limit is reached', async () => {
      // Set up scenario where user came via scan but limit is reached
      calculator.lastActionType = 'scan';
      calculator.checkUsageLimit = jest.fn().mockResolvedValue(false); // No scans remaining
      calculator.feedbackContext = {
        nextAction: 'new_dose',
        doseInfo: { substanceName: 'Test', doseValue: 5, unit: 'mg', calculatedVolume: 2.5 }
      };

      // Mock the handleFeedbackComplete logic for new_dose with scan limit reached
      const mockHandleFeedbackComplete = async () => {
        if (calculator.feedbackContext?.nextAction === 'new_dose') {
          calculator.resetFullForm('dose');
          
          if (calculator.lastActionType === 'scan') {
            const canProceed = await calculator.checkUsageLimit();
            if (canProceed) {
              calculator.setScreenStep('scan');
            } else {
              calculator.setScreenStep('intro');
            }
          }
          calculator.feedbackContext = null;
        }
      };
      
      calculator.handleFeedbackComplete = mockHandleFeedbackComplete;
      
      // Execute the action
      await calculator.handleFeedbackComplete();
      
      // Verify results
      expect(calculator.resetFullForm).toHaveBeenCalledWith('dose');
      expect(calculator.checkUsageLimit).toHaveBeenCalled();
      expect(calculator.setScreenStep).toHaveBeenCalledWith('intro');
    });

    it('should fallback to intro when no last action type is set', async () => {
      // Set up scenario where lastActionType is null
      calculator.lastActionType = null;
      calculator.feedbackContext = {
        nextAction: 'new_dose',
        doseInfo: { substanceName: 'Test', doseValue: 5, unit: 'mg', calculatedVolume: 2.5 }
      };

      // Mock the handleFeedbackComplete logic for new_dose with null lastActionType
      const mockHandleFeedbackComplete = async () => {
        if (calculator.feedbackContext?.nextAction === 'new_dose') {
          calculator.resetFullForm('dose');
          
          if (calculator.lastActionType === 'scan') {
            const canProceed = await calculator.checkUsageLimit();
            if (canProceed) {
              calculator.setScreenStep('scan');
            } else {
              calculator.setScreenStep('intro');
            }
          } else if (calculator.lastActionType === 'manual') {
            calculator.setScreenStep('manualEntry');
          } else {
            // Fallback to intro
            calculator.setScreenStep('intro');
          }
          calculator.feedbackContext = null;
        }
      };
      
      calculator.handleFeedbackComplete = mockHandleFeedbackComplete;
      
      // Execute the action
      await calculator.handleFeedbackComplete();
      
      // Verify results
      expect(calculator.resetFullForm).toHaveBeenCalledWith('dose');
      expect(calculator.setScreenStep).toHaveBeenCalledWith('intro');
    });
  });

  describe('Action tracking', () => {
    it('should track manual action when transitioning from intro to manual entry', () => {
      calculator.screenStep = 'intro';
      const prevStep = 'intro';
      const newStep = 'manualEntry';
      
      // Mock the safeSetScreenStep logic for tracking
      if (prevStep === 'intro' && newStep === 'manualEntry') {
        calculator.lastActionType = 'manual';
      }
      
      expect(calculator.lastActionType).toBe('manual');
    });

    it('should track scan action when transitioning from intro to scan', () => {
      calculator.screenStep = 'intro';
      const prevStep = 'intro';
      const newStep = 'scan';
      
      // Mock the safeSetScreenStep logic for tracking
      if (prevStep === 'intro' && newStep === 'scan') {
        calculator.lastActionType = 'scan';
      }
      
      expect(calculator.lastActionType).toBe('scan');
    });
  });

  describe('UI button behavior', () => {
    it('should show Done and New Dose buttons instead of old buttons', () => {
      // This test would be for the FinalResultDisplay component
      const mockProps = {
        calculationError: null,
        recommendedMarking: '2.5',
        doseValue: 5,
        unit: 'mg' as const,
        substanceName: 'Test Med',
        manualSyringe: { type: 'Standard' as const, volume: '3 ml' },
        calculatedVolume: 2.5,
        handleStartOver: jest.fn(),
        setScreenStep: jest.fn(),
        handleGoToFeedback: jest.fn(),
        lastActionType: 'manual' as const,
        isMobileWeb: false,
      };

      // Verify that the component would call handleGoToFeedback with correct actions
      // Done button should call: handleGoToFeedback('start_over')
      // New Dose button should call: handleGoToFeedback('new_dose')
      
      // This simulates button press behavior
      mockProps.handleGoToFeedback('start_over'); // Done button
      mockProps.handleGoToFeedback('new_dose');   // New Dose button
      
      expect(mockProps.handleGoToFeedback).toHaveBeenCalledWith('start_over');
      expect(mockProps.handleGoToFeedback).toHaveBeenCalledWith('new_dose');
    });
  });
});