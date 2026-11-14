import { calculateDose, CalculateDoseParams, parsePlannerScan, parseScannedSyringe, parseScannedConcentration } from '..';
import cases from '../../../tests/fixtures/dosing-cases.json';

// The fixture oracle is independent of application code. Owner review is pending.
for (const fixture of cases) {
  it(`${fixture.id}: ${fixture.description}`, () => {
    expect(fixture.verified_by).toBe('pending-rodney');
    if ('operation' in fixture) {
      let result;
      if (fixture.operation === 'plannerScan') result = parsePlannerScan(fixture.inputs);
      else if (fixture.operation === 'syringeScan') result = parseScannedSyringe(fixture.inputs);
      else result = parseScannedConcentration(fixture.inputs.text!);
      expect(result).toMatchObject(fixture.expected);
      return;
    }
    const result = calculateDose(fixture.inputs as CalculateDoseParams);
    expect(result.calculatedVolume).toBe(fixture.expected.volume_mL);
    expect(result.recommendedMarking).toBe(fixture.expected.marking);
    if ('calculatedConcentration' in fixture.expected) {
      expect(result.calculatedConcentration).toBe(fixture.expected.calculatedConcentration);
    }
    if ('guidance' in fixture.expected) {
      expect(result.guidance).toBe(fixture.expected.guidance);
      expect(result.calculationError).toBeNull();
    }
    if ('error_contains' in fixture.expected) expect(result.calculationError).toContain(fixture.expected.error_contains);
  });
}
