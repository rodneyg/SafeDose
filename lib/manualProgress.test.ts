import { getManualProgress } from './manualProgress';

describe('getManualProgress', () => {
  it('uses the concentration step list by default', () => {
    expect(getManualProgress('dose', null)).toEqual({ currentStep: 1, totalSteps: 7 });
    expect(getManualProgress('concentrationInput', 'concentration')).toEqual({ currentStep: 3, totalSteps: 7 });
    expect(getManualProgress('totalAmountInput', null)).toEqual({ currentStep: 4, totalSteps: 7 });
    expect(getManualProgress('finalResult', null)).toEqual({ currentStep: 7, totalSteps: 7 });
  });

  it('uses the total amount step list when inputType is totalAmount', () => {
    expect(getManualProgress('totalAmountInput', 'totalAmount')).toEqual({ currentStep: 3, totalSteps: 7 });
    expect(getManualProgress('reconstitution', 'totalAmount')).toEqual({ currentStep: 4, totalSteps: 7 });
    expect(getManualProgress('syringe', 'totalAmount')).toEqual({ currentStep: 5, totalSteps: 7 });
  });

  it('only includes reconstitution in the total amount flow', () => {
    expect(getManualProgress('reconstitution', null).currentStep).toBe(1);
    expect(getManualProgress('concentrationInput', 'totalAmount').currentStep).toBe(1);
  });

  it('returns at least step 1 for an unknown step', () => {
    expect(getManualProgress('notAStep', null)).toEqual({ currentStep: 1, totalSteps: 7 });
    expect(getManualProgress('', 'totalAmount')).toEqual({ currentStep: 1, totalSteps: 7 });
  });
});
