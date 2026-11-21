import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  adjustProtocolTime, DoseTimeOffsets, localDateTimeFields, parseProtocolStart,
  protocolDoseTime, ProtocolFrequency, protocolInterval, upcomingProtocolTimes,
} from '../lib/protocolPlan';

type Props = {
  start: Date;
  frequency: ProtocolFrequency;
  offsets: DoseTimeOffsets;
  onChange: (offsets: DoseTimeOffsets) => void;
};

const dateLabel = new Intl.DateTimeFormat(undefined, {
  weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
});

function formatGap(milliseconds: number) {
  const totalMinutes = Math.round(milliseconds / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

export default function ProtocolSchedulePreview({ start, frequency, offsets, onChange }: Props) {
  const [now] = useState(Date.now);
  const [edit, setEdit] = useState<{ index: number; date: string; time: string } | null>(null);
  const [invalidEdit, setInvalidEdit] = useState(false);
  const upcoming = upcomingProtocolTimes(start, frequency, offsets, now);
  const interval = protocolInterval(frequency);
  const cadence = frequency === 1 ? 'Same local time each week' : `Every ${formatGap(interval)}`;

  function saveAdjustment() {
    if (!edit) return;
    const date = parseProtocolStart(edit.date, edit.time);
    const next = date && adjustProtocolTime(start, frequency, offsets, edit.index, date.getTime(), Date.now());
    if (!next) {
      setInvalidEdit(true);
      return;
    }
    onChange(next);
    setEdit(null);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text accessibilityRole="header" style={styles.heading}>Upcoming doses</Text>
          <Text style={styles.detail}>{cadence} · Local time</Text>
        </View>
        {Object.keys(offsets).length > 0 && (
          <Pressable accessibilityRole="button" onPress={() => { onChange({}); setEdit(null); }}>
            <Text style={styles.action}>Reset to even spacing</Text>
          </Pressable>
        )}
      </View>

      {upcoming.map(({ index, time }, position) => (
        <View key={index} style={styles.dose}>
          <View style={styles.row}>
            <View style={styles.doseText}>
              <Text style={styles.date}>{dateLabel.format(time)}</Text>
              <Text style={styles.detail}>
                {index === 0 ? 'First dose' : `${formatGap(time - protocolDoseTime(start, frequency, offsets, index - 1))} after previous dose`}
              </Text>
            </View>
            {index > 0 && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Adjust dose ${position + 1}`}
                onPress={() => {
                  setInvalidEdit(false);
                  setEdit({ index, ...localDateTimeFields(new Date(time)) });
                }}
              >
                <Text style={styles.action}>Adjust</Text>
              </Pressable>
            )}
          </View>
          {edit?.index === index && (
            <View style={styles.edit}>
              <Text style={styles.detail}>Change this dose only. Keep it between its neighboring doses.</Text>
              <View style={styles.row}>
                <TextInput
                  accessibilityLabel="Adjusted date"
                  placeholder="YYYY-MM-DD"
                  value={edit.date}
                  onChangeText={date => setEdit({ ...edit, date })}
                  autoCapitalize="none"
                  style={styles.input}
                />
                <TextInput
                  accessibilityLabel="Adjusted time"
                  placeholder="HH:MM"
                  value={edit.time}
                  onChangeText={time => setEdit({ ...edit, time })}
                  style={styles.input}
                />
              </View>
              {invalidEdit && <Text accessibilityRole="alert" style={styles.error}>Enter a future date and time between the neighboring doses.</Text>}
              <View style={styles.row}>
                <Pressable accessibilityRole="button" onPress={() => setEdit(null)}><Text style={styles.action}>Cancel</Text></Pressable>
                <Pressable accessibilityRole="button" onPress={saveAdjustment}><Text style={styles.action}>Apply time</Text></Pressable>
              </View>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  heading: { color: '#111827', fontSize: 19, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  dose: { backgroundColor: '#F4F7FB', borderRadius: 10, padding: 12, gap: 12 },
  doseText: { flex: 1, gap: 4 },
  date: { color: '#111827', fontSize: 15, fontWeight: '600' },
  detail: { color: '#475569', fontSize: 13 },
  action: { color: '#1257B8', fontWeight: '600', paddingVertical: 6 },
  edit: { gap: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: '#94A3B8', borderRadius: 8, padding: 9, color: '#111827', backgroundColor: '#FFFFFF' },
  error: { color: '#991B1B', fontSize: 13 },
});
