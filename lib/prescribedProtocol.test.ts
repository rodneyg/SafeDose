import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  matchPrescribedDose, loadPrescribedProtocol, protocolOccurrence, upcomingPrescribedDoses, type PrescribedProtocol,
} from './prescribedProtocol';
import type { DoseLog } from '../types/doseLog';

const protocol: PrescribedProtocol = {
  type: 'custom', medication: 'Example', dose: '.25', unit: 'mL',
  cadenceDays: 14, firstDate: '2026-10-18', savedAt: 12345,
};
const today = new Date(2026, 10, 1, 13);

it('keeps scheduled dates on the local calendar across the DST transition', () => {
  expect(upcomingPrescribedDoses(protocol, [], today))
    .toEqual(['2026-11-01', '2026-11-15', '2026-11-29', '2026-12-13']);
  expect(upcomingPrescribedDoses({ ...protocol, cadenceDays: 7 }, [], today)[1]).toBe('2026-11-08');
  expect(upcomingPrescribedDoses({ ...protocol, cadenceDays: 1 }, [], today)[1]).toBe('2026-11-02');
});

it('moves next due past a logged occurrence while retaining dates logged as one-off doses', () => {
  const oneOff: DoseLog = {
    id: 'one-off', substanceName: 'Example', doseValue: .25, unit: 'mL',
    calculatedVolume: .25, timestamp: today.toISOString(),
  };
  expect(upcomingPrescribedDoses(protocol, [oneOff], today)[0]).toBe('2026-11-01');
  const scheduled = { ...oneOff, protocolOccurrence: protocolOccurrence(protocol, '2026-11-01') };
  expect(upcomingPrescribedDoses(protocol, [scheduled], today)[0]).toBe('2026-11-15');
  expect(upcomingPrescribedDoses({ ...protocol, savedAt: 54321 }, [scheduled], today)[0]).toBe('2026-11-01');
});

it('only associates a confirmed log when the medication, prescribed amount and unit match', () => {
  const log = { substanceName: ' example ', doseValue: .25, unit: 'mL', calculatedVolume: .25 };
  expect(matchPrescribedDose(protocol, log)).toBe(true);
  expect(matchPrescribedDose(protocol, { ...log, substanceName: 'Other' })).toBe(false);
  expect(matchPrescribedDose(protocol, { ...log, doseValue: .5 })).toBe(false);
  expect(matchPrescribedDose(protocol, { ...log, unit: 'mg' })).toBe(false);
  expect(matchPrescribedDose({ ...protocol, unit: 'IU' }, { ...log, unit: 'units' })).toBe(true);
});

it('reads owner-specific schedules and leaves an older form without a start date alone', async () => {
  jest.mocked(AsyncStorage.getItem).mockResolvedValueOnce(JSON.stringify(protocol));
  expect(await loadPrescribedProtocol('abc')).toEqual(protocol);
  expect(AsyncStorage.getItem).toHaveBeenLastCalledWith('@safedose/onboarding-protocol:abc');
  jest.mocked(AsyncStorage.getItem).mockResolvedValueOnce(JSON.stringify({
    ...protocol, firstDate: undefined, frequency: 'weekly',
  }));
  expect(await loadPrescribedProtocol('abc')).toBeNull();
  expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
});
