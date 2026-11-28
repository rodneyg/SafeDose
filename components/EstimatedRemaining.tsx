import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { estimatedRemaining, HalfLifeUnit } from '../lib/estimatedRemaining';
import { loadPrescribedProtocol, upcomingPrescribedDoses } from '../lib/prescribedProtocol';
import type { DoseLog } from '../types/doseLog';

export default function EstimatedRemaining({ logs, uid }: { logs: DoseLog[]; uid?: string }) {
  const [selected, setSelected] = useState('');
  const [values, setValues] = useState<Record<string, { value: string; unit: HalfLifeUnit }>>({});
  const [loaded, setLoaded] = useState(false);
  const [next, setNext] = useState<string | null>(null);
  const key = `@safedose/half-lives:${uid ?? 'anonymous'}`;
  const names = Array.from(new Set(logs.map(l => l.substanceName.trim()).filter(Boolean)));
  useEffect(() => { let active = true; setLoaded(false); setValues({}); setSelected('');
    AsyncStorage.getItem(key).then(raw => { if (active && raw) { try { const parsed = JSON.parse(raw); if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) setValues(parsed); } catch {} } }).finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, [key]);
  useEffect(() => { let active = true; loadPrescribedProtocol(uid).then(protocol => {
    if (!active || !protocol || protocol.medication.trim().toLowerCase() !== selected.toLowerCase() || !upcomingPrescribedDoses(protocol, logs).length) { if (active) setNext(null); return; }
    const log = logs.find(l => l.substanceName.trim().toLowerCase() === selected.toLowerCase() && l.medicationInputType === 'totalAmount' && l.syringeType === 'Insulin' && Number(l.totalAmount) > 0 && Number(l.solutionVolume) > 0 && Number(l.insulinScale) > 0 && l.totalAmountUnit === (protocol.unit === 'IU' ? 'units' : protocol.unit));
    const units = log ? Number(protocol.dose) * Number(log.solutionVolume) / Number(log.totalAmount) * Number(log.insulinScale) : NaN;
    setNext(Number.isFinite(units) && units > 0 ? `Next scheduled dose: ${Number(units.toFixed(2))} syringe units using your last saved reconstitution inputs. Verify against your vial and syringe.` : null);
  }).catch(() => { if (active) setNext(null); }); return () => { active = false; }; }, [uid, selected, logs]);
  const entry = values[selected] ?? { value: '', unit: 'hours' as HalfLifeUnit };
  const update = (patch: Partial<typeof entry>) => { const updated = { ...values, [selected]: { ...entry, ...patch } }; setValues(updated); void AsyncStorage.setItem(key, JSON.stringify(updated)); };
  const matching = logs.filter(l => l.substanceName.trim().toLowerCase() === selected.toLowerCase());
  const outputUnit = matching[0]?.unit ?? '';
  const now = Date.now();
  const estimate = outputUnit ? estimatedRemaining(matching, new Date(now), Number(entry.value), entry.unit, outputUnit) : null;
  if (!logs.length || !loaded) return null;
  return <View style={{ backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 12, gap: 8 }}>
    <Text accessibilityRole="header" style={{ fontSize: 18, fontWeight: '600' }}>Estimated amount remaining</Text>
    <Text>Estimate from the half-life you entered. Not medical advice. Do not change a dose based on this.</Text>
    <Text>Select a compound:</Text>
    {names.map(name => <Pressable key={name} accessibilityRole="button" accessibilityState={{ selected: selected === name }} onPress={() => setSelected(name)}><Text style={{ color: '#005DBF', paddingVertical: 4 }}>{selected === name ? 'Selected: ' : ''}{name}</Text></Pressable>)}
    {!!selected && <><Text>Half-life (optional)</Text><TextInput accessibilityLabel="Half-life" keyboardType="decimal-pad" value={entry.value} onChangeText={value => update({ value })} placeholder="Enter a value" style={{ borderWidth: 1, borderColor: '#62626D', padding: 8 }} />
      <Pressable accessibilityRole="button" accessibilityLabel={`Half-life unit: ${entry.unit}. Change unit`} onPress={() => update({ unit: entry.unit === 'hours' ? 'days' : 'hours' })}><Text style={{ color: '#005DBF' }}>Unit: {entry.unit} (tap to change)</Text></Pressable>
      {estimate !== null && <><Text>Estimates from logged doses only. Future scheduled doses are not included.</Text>{Array.from({ length: 15 }, (_, day) => <Text key={day}>{day === 0 ? 'Now' : `Day ${day}`}: {Number((estimatedRemaining(matching, new Date(now + day * 86400000), Number(entry.value), entry.unit, outputUnit) ?? 0).toPrecision(4))} {outputUnit}</Text>)}</>}
      {next && <Text>{next}</Text>}</>}
  </View>;
}
