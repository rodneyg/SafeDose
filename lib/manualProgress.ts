export function getManualProgress(step: string, inputType: string | null) {
  const steps = ['dose', 'medicationSource',
    ...(inputType === 'totalAmount' ? ['totalAmountInput', 'reconstitution'] : ['concentrationInput', 'totalAmountInput']),
    'syringe', 'preDoseConfirmation', 'finalResult'];
  return { currentStep: Math.max(1, steps.indexOf(step) + 1), totalSteps: steps.length };
}
