export const syringeOptions = {
  Insulin: {
    '0.3 ml': '5,10,15,20,25,30',
    '0.5 ml': '5,10,15,20,25,30,35,40,45,50',
    '1 ml': '10,20,30,40,50,60,70,80,90,100',
  },
  Standard: {
    '1 ml': '0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0',
    '3 ml': '0.5,1.0,1.5,2.0,2.5,3.0',
    '5 ml': '1.0,2.0,3.0,4.0,5.0',
  },
};

export const insulinVolumes = ['0.3 ml', '0.5 ml', '1 ml'];
export const standardVolumes = ['1 ml', '3 ml', '5 ml'];

export interface SyringeSelection {
  type: 'Insulin' | 'Standard';
  volume: string;
  insulinScale?: string;
  needsConfirmation?: boolean;
  needsScaleConfirmation?: boolean;
}

export const u40Markings: Record<string, string> = {
  '0.5 ml': Array.from({ length: 20 }, (_, index) => String(index + 1)).join(','),
  '1 ml': Array.from({ length: 40 }, (_, index) => String(index + 1)).join(','),
};

export function getSyringeMarkings(syringe: SyringeSelection): string | undefined {
  let markings: Record<string, string>;
  if (syringe.type === 'Insulin') {
    const scale = syringe.insulinScale || 'U-100';
    if (scale !== 'U-100' && scale !== 'U-40') return undefined;
    markings = scale === 'U-40' ? u40Markings : syringeOptions.Insulin;
  } else if (syringe.type === 'Standard') {
    markings = syringeOptions.Standard;
  } else {
    return undefined;
  }
  return Object.prototype.hasOwnProperty.call(markings, syringe.volume)
    ? markings[syringe.volume]
    : undefined;
}
