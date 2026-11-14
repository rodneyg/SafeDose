import { calculateDose, CalculateDoseParams } from '..';
import cases from '../../../tests/fixtures/dosing-cases.json';

// The fixture oracle was calculated using exact rational arithmetic, never calculateDose.
// These are arithmetic examples, not prescribing recommendations. Rodney review is pending.
for (const fixture of cases) {
  const verify = () => {
    const result = calculateDose(fixture.inputs as CalculateDoseParams);
    expect(result.calculatedVolume).toBe(fixture.expected.volume_mL);
    expect(result.recommendedMarking).toBe(fixture.expected.marking);
  };
  if ('known_bug' in fixture) {
    it.failing(`${fixture.id}: ${fixture.description} [${fixture.known_bug}]`, verify);
  } else {
    it(`${fixture.id}: ${fixture.description}`, verify);
  }
}
