import { Exact } from './exact';
import { parseDoseInput } from './display';

export interface ReconstitutionPlannerParams {
  peptideAmountMg: number;
  targetDoseMg: number;
  preferredVolumeMl: number;
}

export interface ReconstitutionPlannerResult {
  bacWaterExact: string;
  concentrationExact: string;
  bacWaterToAdd: number; // mL
  concentration: number; // mg/mL
  injectionVolume: number; // mL (actual volume needed per dose)
}

export interface ReconstitutionInputs {
  peptideAmount: string;
  scannedPeptideAmount: string | null;
  peptideUnit: 'mg' | 'mcg';
  targetDose: string;
  targetDoseUnit: 'mg' | 'mcg';
  preferredVolume: string;
}

export function calculateReconstitution(params: ReconstitutionPlannerParams): ReconstitutionPlannerResult {
  const { peptideAmountMg, targetDoseMg, preferredVolumeMl } = params;

  if (![peptideAmountMg, targetDoseMg, preferredVolumeMl].every(value => Number.isFinite(value) && value > 0)) {
    throw new Error('Needs input: planner amounts and volume must be positive finite numbers.');
  }

  return calculateExactReconstitution(new Exact(peptideAmountMg), new Exact(targetDoseMg), new Exact(preferredVolumeMl));
}

function calculateExactReconstitution(peptideAmountMg: Exact, targetDoseMg: Exact, preferredVolumeMl: Exact): ReconstitutionPlannerResult {
  const concentration = targetDoseMg.div(preferredVolumeMl);
  const bacWater = peptideAmountMg.div(concentration);
  const bacWaterToAdd = bacWater.toNumber();
  const concentrationValue = concentration.toNumber();
  if (![bacWaterToAdd, concentrationValue].every(value => Number.isFinite(value) && value > 0)) {
    throw new Error('Needs input: planner values are outside the supported numeric range.');
  }
  return {
    bacWaterToAdd, concentration: concentrationValue, injectionVolume: preferredVolumeMl.toNumber(),
    concentrationExact: concentration.toString(), bacWaterExact: bacWater.toString(),
  };
}

export function getReconstitutionResult(input: ReconstitutionInputs): ReconstitutionPlannerResult | null {
  const peptideAmountValue = parseDoseInput(input.peptideAmount || input.scannedPeptideAmount || '0');
  const targetDoseValue = parseDoseInput(input.targetDose);
  const preferredVolumeValue = parseDoseInput(input.preferredVolume);

  if (!(peptideAmountValue > 0) || !(targetDoseValue > 0) || !(preferredVolumeValue > 0)) {
    return null;
  }

  // Convert peptide amount to mg if needed
  const peptideAmountMg = input.peptideUnit === 'mcg' ? new Exact(peptideAmountValue).div(1000) : new Exact(peptideAmountValue);

  // Convert target dose to mg if needed
  const targetDoseMg = input.targetDoseUnit === 'mcg' ? new Exact(targetDoseValue).div(1000) : new Exact(targetDoseValue);

  try {
    return calculateExactReconstitution(peptideAmountMg, targetDoseMg, new Exact(preferredVolumeValue));
  } catch {
    return null;
  }
}

export function getReconstitutionInputError(input: ReconstitutionInputs, result: ReconstitutionPlannerResult | null): string | null {
  const peptideAmountValue = parseDoseInput(input.peptideAmount || input.scannedPeptideAmount || '0');
  const targetDoseValue = parseDoseInput(input.targetDose);
  const preferredVolumeValue = parseDoseInput(input.preferredVolume);

  if (!peptideAmountValue || peptideAmountValue <= 0) {
    return 'Please enter a valid peptide amount greater than 0';
  }

  if (!targetDoseValue || targetDoseValue <= 0) {
    return 'Please enter a valid target dose greater than 0';
  }

  if (!preferredVolumeValue || preferredVolumeValue <= 0) {
    return 'Please enter a valid preferred volume greater than 0';
  }

  if (!result) return 'Needs input: planner values are outside the supported numeric range.';

  // Validate BAC water amount is reasonable (between 0.1 mL and 20 mL)
  if (new Exact(result.bacWaterExact).compare(0.1) < 0) {
    return 'Target dose is too high for this vial size - would require less than 0.1 mL of BAC water. Try a smaller dose or larger injection volume.';
  }
  if (new Exact(result.bacWaterExact).compare(20) > 0) {
    return 'Target dose is too low for this vial size - would require more than 20 mL of BAC water. Try a larger dose or smaller injection volume.';
  }

  return null;
}

/** Preserve exact concentration across navigation; BAC volume is only a display projection. */
export function getPlannerHandoff(result: ReconstitutionPlannerResult, unit: 'mg' | 'mcg' = 'mg') {
  return { solutionVolume: String(result.bacWaterToAdd), concentration: result.concentration,
    concentrationExact: new Exact(result.concentrationExact).mul(unit === 'mcg' ? 1000 : 1).toString() };
}
