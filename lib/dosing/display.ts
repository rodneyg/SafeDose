/** Preserve parseFloat's existing acceptance of numeric prefixes. */
export function parseDoseInput(value: string): number {
  return parseFloat(value);
}

export function formatDoseNumber(value: number, digits: number): string {
  return value.toFixed(digits);
}

export function concentrationFromDose(dose: number, volume: number): number {
  return dose / volume;
}

export function formatDrawToText(log: { recommendedMarking?: string; syringeType?: 'Insulin' | 'Standard' }): string | null {
  if (!log.recommendedMarking || !log.syringeType) {
    return null;
  }
  const unit = log.syringeType === 'Insulin' ? 'units' : 'ml';
  const value = parseDoseInput(log.recommendedMarking).toFixed(2);
  return `Draw to ${value} ${unit}`;
}

export function formatConcentration(doseValue: number, unit: string, calculatedVolume: number): string | null {
  if (unit === 'mL') {
    return null;
  }
  if (!calculatedVolume || calculatedVolume <= 0) {
    return null;
  }
  const concentration = concentrationFromDose(doseValue, calculatedVolume);
  const concentrationUnit = unit === 'units' ? 'units/mL' : `${unit}/mL`;
  const formattedConcentration = concentration < 1
    ? concentration.toFixed(3).replace(/\.?0+$/, '')
    : concentration.toFixed(1).replace(/\.?0+$/, '');
  return `${formattedConcentration} ${concentrationUnit}`;
}
