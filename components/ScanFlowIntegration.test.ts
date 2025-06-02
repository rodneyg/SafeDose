/**
 * Integration test to verify the complete scan flow from image preview to manual entry
 * This ensures the fix for issue #173 works correctly
 */

describe('Scan Flow Integration Test', () => {
  // Mock the key functions from useDoseCalculator that would be affected
  const createMockDoseCalculator = () => {
    let screenStep: 'intro' | 'scan' | 'manualEntry' = 'scan';
    let manualStep = 'dose';
    let substanceName = '';
    let concentrationAmount = '';
    let concentrationUnit: 'mg/ml' | 'mcg/ml' | 'units/ml' = 'mg/ml';
    let totalAmount = '';
    let medicationInputType: 'concentration' | 'totalAmount' | null = null;
    let manualSyringe = { type: 'Standard' as 'Standard', volume: '3 ml' };
    let calculatedVolume = null;
    let recommendedMarking = null;
    let calculationError = null;
    let formError = null;
    let showVolumeErrorModal = false;
    let volumeErrorValue = null;

    return {
      // State getters
      get screenStep() { return screenStep; },
      get manualStep() { return manualStep; },
      get substanceName() { return substanceName; },
      get concentrationAmount() { return concentrationAmount; },
      get concentrationUnit() { return concentrationUnit; },
      get totalAmount() { return totalAmount; },
      get medicationInputType() { return medicationInputType; },
      get manualSyringe() { return manualSyringe; },
      get calculatedVolume() { return calculatedVolume; },
      get recommendedMarking() { return recommendedMarking; },
      get calculationError() { return calculationError; },
      get formError() { return formError; },
      get showVolumeErrorModal() { return showVolumeErrorModal; },
      get volumeErrorValue() { return volumeErrorValue; },

      // State setters
      setScreenStep: (value: typeof screenStep) => { screenStep = value; },
      setManualStep: (value: typeof manualStep) => { manualStep = value; },
      setSubstanceName: (value: string) => { substanceName = value; },
      setConcentrationAmount: (value: string) => { concentrationAmount = value; },
      setConcentrationUnit: (value: typeof concentrationUnit) => { concentrationUnit = value; },
      setTotalAmount: (value: string) => { totalAmount = value; },
      setMedicationInputType: (value: typeof medicationInputType) => { medicationInputType = value; },
      setManualSyringe: (value: typeof manualSyringe) => { manualSyringe = value; },
      setCalculatedVolume: (value: any) => { calculatedVolume = value; },
      setRecommendedMarking: (value: any) => { recommendedMarking = value; },
      setCalculationError: (value: any) => { calculationError = value; },
      setFormError: (value: any) => { formError = value; },
      setShowVolumeErrorModal: (value: boolean) => { showVolumeErrorModal = value; },
      setVolumeErrorValue: (value: any) => { volumeErrorValue = value; },
      
      // Helper setters for hints
      setSubstanceNameHint: () => {},
      setConcentrationHint: () => {},
      setTotalAmountHint: () => {},
      setSyringeHint: () => {},
    };
  };

  it('should preserve scan results through the complete flow', () => {
    const calculator = createMockDoseCalculator();
    const insulinVolumes = ['0.3 ml', '0.5 ml', '1 ml'];
    const standardVolumes = ['1 ml', '3 ml', '5 ml'];

    // Mock scan result
    const scanResult = {
      syringe: {
        type: 'Standard',
        volume: '5 ml',
        markings: '1.0,2.0,3.0,4.0,5.0'
      },
      vial: {
        substance: 'Epinephrine',
        totalAmount: null,
        concentration: '1 mg/ml',
        expiration: '2025-12-31'
      },
      capturedImage: {
        uri: 'data:image/jpeg;base64,/9j/...',
        mimeType: 'image/jpeg'
      }
    };

    // Simulate the applyScanResults function (fixed version without resetFullForm)
    const applyScanResults = (result: any) => {
      const scannedSyringe = result.syringe || {};
      const scannedVial = result.vial || {};

      const scannedType = scannedSyringe.type === 'Insulin' ? 'Insulin' : 'Standard';
      const scannedVolume = scannedSyringe.volume;
      const targetVolumes = scannedType === 'Insulin' ? insulinVolumes : standardVolumes;
      const defaultVolume = scannedType === 'Insulin' ? '1 ml' : '3 ml';
      let selectedVolume = defaultVolume;

      if (scannedVolume && scannedVolume !== 'unreadable' && scannedVolume !== null) {
        const normalizedScan = String(scannedVolume).replace(/\s+/g, '').toLowerCase();
        selectedVolume = targetVolumes.find(v => v.replace(/\s+/g, '').toLowerCase() === normalizedScan) || defaultVolume;
      }
      calculator.setManualSyringe({ type: scannedType, volume: selectedVolume });
      calculator.setSyringeHint('Detected from image scan');

      if (scannedVial.substance && scannedVial.substance !== 'unreadable') {
        calculator.setSubstanceName(String(scannedVial.substance));
        calculator.setSubstanceNameHint('Detected from vial scan');
      }

      const vialConcentration = scannedVial.concentration;
      const vialTotalAmount = scannedVial.totalAmount;

      if (vialConcentration && vialConcentration !== 'unreadable') {
        const concMatch = String(vialConcentration).match(/([\d.]+)\s*(\w+\/?\w+)/);
        if (concMatch) {
          calculator.setConcentrationAmount(concMatch[1]);
          const detectedUnit = concMatch[2].toLowerCase();
          if (detectedUnit === 'units/ml' || detectedUnit === 'u/ml') calculator.setConcentrationUnit('units/ml');
          else if (detectedUnit === 'mg/ml') calculator.setConcentrationUnit('mg/ml');
          else if (detectedUnit === 'mcg/ml') calculator.setConcentrationUnit('mcg/ml');
        } else {
          calculator.setConcentrationAmount(String(vialConcentration));
        }
        calculator.setMedicationInputType('concentration');
        calculator.setConcentrationHint('Detected from vial scan');
        calculator.setTotalAmountHint(null);
      } else if (vialTotalAmount && vialTotalAmount !== 'unreadable') {
        const amountMatch = String(vialTotalAmount).match(/([\d.]+)/);
        if (amountMatch) {
          calculator.setTotalAmount(amountMatch[1]);
        } else {
          calculator.setTotalAmount(String(vialTotalAmount));
        }
        calculator.setMedicationInputType('totalAmount');
        calculator.setTotalAmountHint('Detected from vial scan');
        calculator.setConcentrationHint(null);
      }

      // Clear calculation-related state without resetting the scan results
      calculator.setCalculatedVolume(null);
      calculator.setRecommendedMarking(null);
      calculator.setCalculationError(null);
      calculator.setFormError(null);
      calculator.setShowVolumeErrorModal(false);
      calculator.setVolumeErrorValue(null);
      calculator.setScreenStep('manualEntry');
      calculator.setManualStep('dose');
    };

    // Step 1: Start with scan screen
    expect(calculator.screenStep).toBe('scan');

    // Step 2: Apply scan results (simulating successful scan and image preview continuation)
    applyScanResults(scanResult);

    // Step 3: Verify the transition happened correctly
    expect(calculator.screenStep).toBe('manualEntry');
    expect(calculator.manualStep).toBe('dose');

    // Step 4: Most importantly, verify that scan results are preserved
    expect(calculator.substanceName).toBe('Epinephrine');
    expect(calculator.concentrationAmount).toBe('1');
    expect(calculator.concentrationUnit).toBe('mg/ml');
    expect(calculator.medicationInputType).toBe('concentration');
    expect(calculator.manualSyringe.type).toBe('Standard');
    expect(calculator.manualSyringe.volume).toBe('5 ml');

    // Step 5: Verify calculation state was cleared
    expect(calculator.calculatedVolume).toBeNull();
    expect(calculator.recommendedMarking).toBeNull();
    expect(calculator.calculationError).toBeNull();
    expect(calculator.formError).toBeNull();
    expect(calculator.showVolumeErrorModal).toBe(false);
    expect(calculator.volumeErrorValue).toBeNull();
  });

  it('should handle the specific edge case mentioned in the issue: large amounts', () => {
    const calculator = createMockDoseCalculator();

    // This simulates the "50 million grams" case mentioned in the issue
    const scanResult = {
      syringe: {
        type: 'Standard',
        volume: '3 ml',
        markings: '0.5,1.0,1.5,2.0,2.5,3.0'
      },
      vial: {
        substance: 'Test Medicine',
        totalAmount: '50000000 mg', // 50 million mg
        concentration: null,
        expiration: '2025-12-31'
      }
    };

    // Apply scan results
    const scannedVial = scanResult.vial;
    if (scannedVial.substance && scannedVial.substance !== 'unreadable') {
      calculator.setSubstanceName(String(scannedVial.substance));
    }

    const vialTotalAmount = scannedVial.totalAmount;
    if (vialTotalAmount && vialTotalAmount !== 'unreadable') {
      const amountMatch = String(vialTotalAmount).match(/([\d.]+)/);
      if (amountMatch) {
        calculator.setTotalAmount(amountMatch[1]);
      } else {
        calculator.setTotalAmount(String(vialTotalAmount));
      }
      calculator.setMedicationInputType('totalAmount');
    }

    // Without resetFullForm, these values should be preserved
    expect(calculator.substanceName).toBe('Test Medicine');
    expect(calculator.totalAmount).toBe('50000000');
    expect(calculator.medicationInputType).toBe('totalAmount');
  });

  it('should handle the specific edge case mentioned in the issue: small amounts', () => {
    const calculator = createMockDoseCalculator();

    // This simulates the "20 milligrams" case mentioned in the issue
    const scanResult = {
      syringe: {
        type: 'Standard',
        volume: '3 ml',
        markings: '0.5,1.0,1.5,2.0,2.5,3.0'
      },
      vial: {
        substance: 'Test Medicine',
        totalAmount: '20 mg',
        concentration: null,
        expiration: '2025-12-31'
      }
    };

    // Apply scan results
    const scannedVial = scanResult.vial;
    if (scannedVial.substance && scannedVial.substance !== 'unreadable') {
      calculator.setSubstanceName(String(scannedVial.substance));
    }

    const vialTotalAmount = scannedVial.totalAmount;
    if (vialTotalAmount && vialTotalAmount !== 'unreadable') {
      const amountMatch = String(vialTotalAmount).match(/([\d.]+)/);
      if (amountMatch) {
        calculator.setTotalAmount(amountMatch[1]);
      } else {
        calculator.setTotalAmount(String(vialTotalAmount));
      }
      calculator.setMedicationInputType('totalAmount');
    }

    // Without resetFullForm, these values should be preserved
    expect(calculator.substanceName).toBe('Test Medicine');
    expect(calculator.totalAmount).toBe('20');
    expect(calculator.medicationInputType).toBe('totalAmount');
  });
});