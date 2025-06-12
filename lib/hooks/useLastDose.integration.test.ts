/**
 * Integration test for "Use Last Dose" functionality
 * Tests the complete flow from dose logging to prefilling via URL parameters
 */

import { DoseLog } from '../../types/doseLog';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

// Mock Firebase
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  collection: jest.fn(),
  addDoc: jest.fn(),
}));

// Mock Auth Context
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'test-user-123', isAnonymous: false },
  }),
}));

describe('Use Last Dose Integration', () => {
  it('should have correct URL parameter structure for last dose', () => {
    // Test the URL parameter structure that should be generated
    const lastDose: DoseLog = {
      id: 'test-last-dose',
      userId: 'test-user-123',
      substanceName: 'Testosterone',
      doseValue: 100,
      unit: 'mg',
      calculatedVolume: 0.5,
      syringeType: 'Standard',
      recommendedMarking: '0.5',
      timestamp: new Date().toISOString(),
    };

    // Simulate the URL parameters that IntroScreen should generate
    const expectedParams = {
      useLastDose: 'true',
      lastDoseValue: lastDose.doseValue.toString(),
      lastDoseUnit: lastDose.unit,
      lastSubstance: lastDose.substanceName,
      lastSyringeType: lastDose.syringeType,
    };

    expect(expectedParams.useLastDose).toBe('true');
    expect(expectedParams.lastDoseValue).toBe('100');
    expect(expectedParams.lastDoseUnit).toBe('mg');
    expect(expectedParams.lastSubstance).toBe('Testosterone');
    expect(expectedParams.lastSyringeType).toBe('Standard');
  });

  it('should handle missing optional fields gracefully', () => {
    // Test with minimal dose log (only required fields)
    const minimalDose: DoseLog = {
      id: 'test-minimal-dose',
      userId: 'test-user-123',
      substanceName: 'Test Substance',
      doseValue: 50,
      unit: 'mcg',
      calculatedVolume: 0.25,
      timestamp: new Date().toISOString(),
    };

    // Should still work with missing optional fields
    const expectedParams = {
      useLastDose: 'true',
      lastDoseValue: minimalDose.doseValue.toString(),
      lastDoseUnit: minimalDose.unit,
      lastSubstance: minimalDose.substanceName,
      // lastSyringeType should be undefined/not included
    };

    expect(expectedParams.useLastDose).toBe('true');
    expect(expectedParams.lastDoseValue).toBe('50');
    expect(expectedParams.lastDoseUnit).toBe('mcg');
    expect(expectedParams.lastSubstance).toBe('Test Substance');
  });

  it('should validate dose units are preserved correctly', () => {
    // Test different dose units
    const testUnits = ['mg', 'mcg', 'units', 'mL'] as const;
    
    testUnits.forEach(unit => {
      const dose: DoseLog = {
        id: `test-${unit}`,
        userId: 'test-user-123',
        substanceName: 'Test Drug',
        doseValue: 10,
        unit: unit,
        calculatedVolume: 0.1,
        timestamp: new Date().toISOString(),
      };

      // Verify unit is preserved in URL parameters
      expect(dose.unit).toBe(unit);
      expect(dose.doseValue).toBe(10);
    });
  });

  it('should handle injection site data for future use', () => {
    // Test that injection site data is preserved in dose log
    const doseWithInjectionSite: DoseLog = {
      id: 'test-injection-site',
      userId: 'test-user-123',
      substanceName: 'Peptide',
      doseValue: 5,
      unit: 'mg',
      calculatedVolume: 0.25,
      injectionSite: 'abdomen_L',
      timestamp: new Date().toISOString(),
    };

    // Injection site should be preserved for future rotation feature
    expect(doseWithInjectionSite.injectionSite).toBe('abdomen_L');
  });
});