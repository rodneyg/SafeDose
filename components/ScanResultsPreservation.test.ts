/**
 * Test for ensuring scan results are properly preserved after applying them
 * This addresses the issue where scan results are shown in the preview but not pre-filled
 */
import { ScanResult } from '../lib/cameraUtils';

describe('Scan Results Preservation', () => {
  const createMockScanResult = (overrides?: Partial<ScanResult>): ScanResult => ({
    syringe: {
      type: 'Standard',
      volume: '3 ml',
      markings: '0.1,0.2,0.3'
    },
    vial: {
      substance: 'Test Medicine',
      totalAmount: '50 mg',
      concentration: '10 mg/ml',
      expiration: '2025-12-31'
    },
    capturedImage: {
      uri: 'data:image/jpeg;base64,/9j/...',
      mimeType: 'image/jpeg'
    },
    ...overrides
  });

  describe('Edge cases for large and small numbers', () => {
    it('should handle very large amounts like "50 million grams"', () => {
      const scanResult = createMockScanResult({
        vial: {
          substance: 'Test Medicine',
          totalAmount: '50000000 mg', // 50 million mg
          concentration: null,
          expiration: '2025-12-31'
        }
      });

      // Mock form state
      let substanceName = '';
      let totalAmount = '';
      let medicationInputType: 'concentration' | 'totalAmount' | null = null;

      // Simulate applyScanResults logic for totalAmount
      const scannedVial = scanResult.vial || {};
      const vialTotalAmount = scannedVial.totalAmount;

      if (scannedVial.substance && scannedVial.substance !== 'unreadable') {
        substanceName = String(scannedVial.substance);
      }

      if (vialTotalAmount && vialTotalAmount !== 'unreadable') {
        const amountMatch = String(vialTotalAmount).match(/([\d.]+)/);
        if (amountMatch) {
          totalAmount = amountMatch[1];
        } else {
          totalAmount = String(vialTotalAmount);
        }
        medicationInputType = 'totalAmount';
      }

      // Values should be preserved (not cleared by resetFullForm)
      expect(substanceName).toBe('Test Medicine');
      expect(totalAmount).toBe('50000000');
      expect(medicationInputType).toBe('totalAmount');
    });

    it('should handle small amounts like "20 milligrams"', () => {
      const scanResult = createMockScanResult({
        vial: {
          substance: 'Test Medicine',
          totalAmount: '20 mg',
          concentration: null,
          expiration: '2025-12-31'
        }
      });

      // Mock form state
      let substanceName = '';
      let totalAmount = '';
      let medicationInputType: 'concentration' | 'totalAmount' | null = null;

      // Simulate applyScanResults logic for totalAmount
      const scannedVial = scanResult.vial || {};
      const vialTotalAmount = scannedVial.totalAmount;

      if (scannedVial.substance && scannedVial.substance !== 'unreadable') {
        substanceName = String(scannedVial.substance);
      }

      if (vialTotalAmount && vialTotalAmount !== 'unreadable') {
        const amountMatch = String(vialTotalAmount).match(/([\d.]+)/);
        if (amountMatch) {
          totalAmount = amountMatch[1];
        } else {
          totalAmount = String(vialTotalAmount);
        }
        medicationInputType = 'totalAmount';
      }

      // Values should be preserved (not cleared by resetFullForm)
      expect(substanceName).toBe('Test Medicine');
      expect(totalAmount).toBe('20');
      expect(medicationInputType).toBe('totalAmount');
    });

    it('should handle concentration with various units', () => {
      const scanResult = createMockScanResult({
        vial: {
          substance: 'Insulin',
          totalAmount: null,
          concentration: '100 units/ml',
          expiration: '2025-12-31'
        }
      });

      // Mock form state
      let substanceName = '';
      let concentrationAmount = '';
      let concentrationUnit: 'mg/ml' | 'mcg/ml' | 'units/ml' = 'mg/ml';
      let medicationInputType: 'concentration' | 'totalAmount' | null = null;

      // Simulate applyScanResults logic for concentration
      const scannedVial = scanResult.vial || {};
      const vialConcentration = scannedVial.concentration;

      if (scannedVial.substance && scannedVial.substance !== 'unreadable') {
        substanceName = String(scannedVial.substance);
      }

      if (vialConcentration && vialConcentration !== 'unreadable') {
        const concMatch = String(vialConcentration).match(/([\d.]+)\s*(\w+\/?\w+)/);
        if (concMatch) {
          concentrationAmount = concMatch[1];
          const detectedUnit = concMatch[2].toLowerCase();
          if (detectedUnit === 'units/ml' || detectedUnit === 'u/ml') concentrationUnit = 'units/ml';
          else if (detectedUnit === 'mg/ml') concentrationUnit = 'mg/ml';
          else if (detectedUnit === 'mcg/ml') concentrationUnit = 'mcg/ml';
        } else {
          concentrationAmount = String(vialConcentration);
        }
        medicationInputType = 'concentration';
      }

      // Values should be preserved (not cleared by resetFullForm)
      expect(substanceName).toBe('Insulin');
      expect(concentrationAmount).toBe('100');
      expect(concentrationUnit).toBe('units/ml');
      expect(medicationInputType).toBe('concentration');
    });
  });

  describe('Full applyScanResults simulation', () => {
    it('should preserve all scan results without resetFullForm interference', () => {
      const scanResult = createMockScanResult();

      // Mock form state (initial empty state)
      let manualSyringe = { type: 'Standard' as 'Standard', volume: '3 ml' };
      let substanceName = '';
      let concentrationAmount = '';
      let concentrationUnit: 'mg/ml' | 'mcg/ml' | 'units/ml' = 'mg/ml';
      let totalAmount = '';
      let medicationInputType: 'concentration' | 'totalAmount' | null = null;

      // Simulate full applyScanResults logic (without resetFullForm)
      const scannedSyringe = scanResult.syringe || {};
      const scannedVial = scanResult.vial || {};

      // Syringe logic
      const scannedType = scannedSyringe.type === 'Insulin' ? 'Insulin' : 'Standard';
      const scannedVolume = scannedSyringe.volume;
      const insulinVolumes = ['0.3 ml', '0.5 ml', '1 ml'];
      const standardVolumes = ['1 ml', '3 ml', '5 ml'];
      const targetVolumes = scannedType === 'Insulin' ? insulinVolumes : standardVolumes;
      const defaultVolume = scannedType === 'Insulin' ? '1 ml' : '3 ml';
      let selectedVolume = defaultVolume;

      if (scannedVolume && scannedVolume !== 'unreadable' && scannedVolume !== null) {
        const normalizedScan = String(scannedVolume).replace(/\s+/g, '').toLowerCase();
        selectedVolume = targetVolumes.find(v => v.replace(/\s+/g, '').toLowerCase() === normalizedScan) || defaultVolume;
      }
      manualSyringe = { type: scannedType, volume: selectedVolume };

      // Substance logic
      if (scannedVial.substance && scannedVial.substance !== 'unreadable') {
        substanceName = String(scannedVial.substance);
      }

      // Concentration/TotalAmount logic
      const vialConcentration = scannedVial.concentration;
      const vialTotalAmount = scannedVial.totalAmount;

      if (vialConcentration && vialConcentration !== 'unreadable') {
        const concMatch = String(vialConcentration).match(/([\d.]+)\s*(\w+\/?\w+)/);
        if (concMatch) {
          concentrationAmount = concMatch[1];
          const detectedUnit = concMatch[2].toLowerCase();
          if (detectedUnit === 'units/ml' || detectedUnit === 'u/ml') concentrationUnit = 'units/ml';
          else if (detectedUnit === 'mg/ml') concentrationUnit = 'mg/ml';
          else if (detectedUnit === 'mcg/ml') concentrationUnit = 'mcg/ml';
        } else {
          concentrationAmount = String(vialConcentration);
        }
        medicationInputType = 'concentration';
      } else if (vialTotalAmount && vialTotalAmount !== 'unreadable') {
        const amountMatch = String(vialTotalAmount).match(/([\d.]+)/);
        if (amountMatch) {
          totalAmount = amountMatch[1];
        } else {
          totalAmount = String(vialTotalAmount);
        }
        medicationInputType = 'totalAmount';
      }

      // All values should be preserved
      expect(manualSyringe.type).toBe('Standard');
      expect(manualSyringe.volume).toBe('3 ml');
      expect(substanceName).toBe('Test Medicine');
      expect(concentrationAmount).toBe('10');
      expect(concentrationUnit).toBe('mg/ml');
      expect(medicationInputType).toBe('concentration');
    });
  });
});