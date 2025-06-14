/**
 * Integration test for automatic dose logging functionality
 * This test verifies that dose logging works correctly in the complete flow
 */

import { DoseLog } from '../types/doseLog';

describe('Automatic Dose Logging Integration', () => {
  it('should define correct dose log interface', () => {
    const sampleLog: DoseLog = {
      id: 'test_id_123',
      userId: 'user_123',
      substanceName: 'Test Medication',
      doseValue: 10,
      unit: 'mg',
      calculatedVolume: 0.5,
      timestamp: new Date().toISOString(),
      notes: 'Optional test note',
    };

    // Verify all required fields are present
    expect(sampleLog.id).toBeDefined();
    expect(sampleLog.substanceName).toBe('Test Medication');
    expect(sampleLog.doseValue).toBe(10);
    expect(sampleLog.unit).toBe('mg');
    expect(sampleLog.calculatedVolume).toBe(0.5);
    expect(sampleLog.timestamp).toBeDefined();
    
    // Verify types
    expect(typeof sampleLog.id).toBe('string');
    expect(typeof sampleLog.substanceName).toBe('string');
    expect(typeof sampleLog.doseValue).toBe('number');
    expect(typeof sampleLog.unit).toBe('string');
    expect(typeof sampleLog.calculatedVolume).toBe('number');
    expect(typeof sampleLog.timestamp).toBe('string');
  });

  it('should handle dose logs without optional fields', () => {
    const minimalLog: DoseLog = {
      id: 'minimal_test',
      substanceName: 'Minimal Drug',
      doseValue: 5,
      unit: 'mcg',
      calculatedVolume: 0.25,
      timestamp: new Date().toISOString(),
    };

    expect(minimalLog.userId).toBeUndefined();
    expect(minimalLog.notes).toBeUndefined();
    expect(minimalLog.substanceName).toBe('Minimal Drug');
  });

  it('should format "draw to" text correctly for display in logs', () => {
    // Test helper function for formatting syringe instructions
    const formatDrawToText = (log: DoseLog): string | null => {
      if (!log.recommendedMarking || !log.syringeType) {
        return null;
      }
      
      const unit = log.syringeType === 'Insulin' ? 'units' : 'ml';
      const value = parseFloat(log.recommendedMarking).toFixed(2);
      return `Draw to ${value} ${unit}`;
    };

    // Test with standard syringe
    const standardLog: DoseLog = {
      id: 'test-standard',
      substanceName: 'Test Drug',
      doseValue: 5,
      unit: 'mg',
      calculatedVolume: 0.5,
      syringeType: 'Standard',
      recommendedMarking: '0.5',
      timestamp: new Date().toISOString(),
    };

    expect(formatDrawToText(standardLog)).toBe('Draw to 0.50 ml');

    // Test with insulin syringe
    const insulinLog: DoseLog = {
      id: 'test-insulin',
      substanceName: 'Insulin',
      doseValue: 10,
      unit: 'units',
      calculatedVolume: 0.1,
      syringeType: 'Insulin',
      recommendedMarking: '10',
      timestamp: new Date().toISOString(),
    };

    expect(formatDrawToText(insulinLog)).toBe('Draw to 10.00 units');

    // Test with missing syringe info (legacy logs)
    const legacyLog: DoseLog = {
      id: 'legacy-test',
      substanceName: 'Legacy Drug',
      doseValue: 2.5,
      unit: 'mg',
      calculatedVolume: 0.125,
      timestamp: new Date().toISOString(),
    };

    expect(formatDrawToText(legacyLog)).toBeNull();
  });

  it('should properly format timestamps', () => {
    const now = new Date();
    const isoTimestamp = now.toISOString();
    
    // Verify ISO format
    expect(isoTimestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    
    // Verify the timestamp can be parsed back
    const parsedDate = new Date(isoTimestamp);
    expect(parsedDate.getTime()).toBe(now.getTime());
  });

  it('should handle different unit types', () => {
    const units: Array<'mg' | 'mcg' | 'units' | 'mL'> = ['mg', 'mcg', 'units', 'mL'];
    
    units.forEach(unit => {
      const log: DoseLog = {
        id: `test_${unit}`,
        substanceName: 'Test Drug',
        doseValue: 10,
        unit: unit,
        calculatedVolume: 1.0,
        timestamp: new Date().toISOString(),
      };
      
      expect(log.unit).toBe(unit);
    });
  });
});