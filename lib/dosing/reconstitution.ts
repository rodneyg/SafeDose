import { parseDoseInput } from './display';

export interface ReconstitutionPlannerParams {
  peptideAmountMg: number;
  targetDoseMg: number;
  preferredVolumeMl: number;
}

export interface ReconstitutionPlannerResult {
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

  // Calculate required concentration: target dose (mg) / preferred volume (mL)
  const requiredConcentration = targetDoseMg / preferredVolumeMl;

  // Calculate BAC water to add: peptide amount (mg) / required concentration (mg/mL)
  const bacWaterToAdd = peptideAmountMg / requiredConcentration;

  // Actual injection volume will be the preferred volume (since we calculated concentration to achieve this)
  const injectionVolume = preferredVolumeMl;

  return {
    bacWaterToAdd,
    concentration: requiredConcentration,
    injectionVolume,
  };
}

export function getReconstitutionResult(input: ReconstitutionInputs): ReconstitutionPlannerResult | null {
  const peptideAmountValue = parseDoseInput(input.peptideAmount || input.scannedPeptideAmount || '0');
  const targetDoseValue = parseDoseInput(input.targetDose);
  const preferredVolumeValue = parseDoseInput(input.preferredVolume);

  if (!peptideAmountValue || !targetDoseValue || !preferredVolumeValue) {
    return null;
  }

  // Convert peptide amount to mg if needed
  const peptideAmountMg = input.peptideUnit === 'mcg' ? peptideAmountValue / 1000 : peptideAmountValue;

  // Convert target dose to mg if needed
  const targetDoseMg = input.targetDoseUnit === 'mcg' ? targetDoseValue / 1000 : targetDoseValue;

  return calculateReconstitution({
    peptideAmountMg,
    targetDoseMg,
    preferredVolumeMl: preferredVolumeValue,
  });
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

  // Validate BAC water amount is reasonable (between 0.1 mL and 20 mL)
  if (result) {
    if (result.bacWaterToAdd < 0.1) {
      return 'Target dose is too high for this vial size - would require less than 0.1 mL of BAC water. Try a smaller dose or larger injection volume.';
    }
    if (result.bacWaterToAdd > 20) {
      return 'Target dose is too low for this vial size - would require more than 20 mL of BAC water. Try a larger dose or smaller injection volume.';
    }
  }

  return null;
}
