import { Exact } from './exact';
import { parseInputNumber } from './inputs';
export function parseDoseInput(value: string): number {
  return parseInputNumber(value);
}

export function formatDoseNumber(value: number, digits: number): string {
  return new Exact(value).fixed(digits);
}

export function concentrationFromDose(dose: number, volume: number): number {
  return new Exact(dose).div(volume).toNumber();
}

export function formatDrawToText(log: { recommendedMarking?: string; syringeType?: 'Insulin' | 'Standard' }): string | null {
  if (!log.recommendedMarking || !log.syringeType) {
    return null;
  }
  const unit = log.syringeType === 'Insulin' ? 'units' : 'ml';
  const value = new Exact(log.recommendedMarking).fixed(2);
  return `Draw to ${value} ${unit}`;
}

export function formatConcentration(doseValue: number, unit: string, calculatedVolume: number): string | null {
  if (unit === 'mL') {
    return null;
  }
  if (!calculatedVolume || calculatedVolume <= 0) {
    return null;
  }
  const concentration = new Exact(doseValue).div(calculatedVolume);
  const concentrationUnit = unit === 'units' ? 'units/mL' : `${unit}/mL`;
  const formattedConcentration = concentration.compare(1) < 0
    ? concentration.fixed(3).replace(/\.?0+$/, '')
    : concentration.fixed(1).replace(/\.?0+$/, '');
  return `${formattedConcentration} ${concentrationUnit}`;
}
