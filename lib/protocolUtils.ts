import { DosingProtocol, NextDose } from '../types/protocol';

/**
 * Fills dose calculator form with protocol data for the next scheduled dose
 */
export function fillDoseFromProtocol(protocol: DosingProtocol, nextDose: NextDose): {
  substanceName: string;
  dose: string;
  unit: string;
  concentrationAmount: string;
  concentrationUnit: string;
  medicationInputType: 'concentration';
} {
  const doseInfo = nextDose.doseInfo;
  
  return {
    substanceName: protocol.compoundName,
    dose: doseInfo.amountPerDose.toString(),
    unit: protocol.weeklyTargetUnit,
    concentrationAmount: protocol.concentration.toString(),
    concentrationUnit: protocol.concentrationUnit,
    medicationInputType: 'concentration'
  };
}

/**
 * Format dose timing information for display
 */
export function formatDoseTime(dateTime: string): string {
  const date = new Date(dateTime);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  const isTomorrow = date.toDateString() === new Date(today.getTime() + 86400000).toDateString();
  
  let dayText = '';
  if (isToday) dayText = 'Today';
  else if (isTomorrow) dayText = 'Tomorrow';
  else dayText = date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'short', 
    day: 'numeric' 
  });
  
  const timeText = date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
  
  return `${dayText} at ${timeText}`;
}

/**
 * Check if a dose is due soon (within next 2 hours)
 */
export function isDoseDueSoon(dateTime: string): boolean {
  const doseTime = new Date(dateTime);
  const now = new Date();
  const timeDiff = doseTime.getTime() - now.getTime();
  const hoursDiff = timeDiff / (1000 * 60 * 60);
  
  return hoursDiff > 0 && hoursDiff <= 2;
}

/**
 * Check if a dose is overdue
 */
export function isDoseOverdue(dateTime: string): boolean {
  const doseTime = new Date(dateTime);
  const now = new Date();
  
  return now.getTime() > doseTime.getTime();
}