import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useDoseLogging } from '../lib/hooks/useDoseLogging';
import {
  loadPrescribedProtocol, protocolOccurrence, upcomingPrescribedDoses, type PrescribedProtocol,
} from '../lib/prescribedProtocol';
import { localDateTimeFields } from '../lib/protocolPlan';
import type { DoseLog } from '../types/doseLog';

const dateLabel = new Intl.DateTimeFormat(undefined, {
  weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
});

export default function ProtocolScheduleRoute() {
  const { user } = useAuth();
  return <ProtocolSchedule key={user?.uid ?? 'anonymous'} uid={user?.uid} />;
}

function ProtocolSchedule({ uid }: { uid?: string }) {
  const router = useRouter();
  const { onboarding } = useLocalSearchParams<{ onboarding?: string }>();
  const { getDoseLogHistory } = useDoseLogging();
  const [data, setData] = useState<{ protocol: PrescribedProtocol | null; logs: DoseLog[] }>();
  const [loadingFailed, setLoadingFailed] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([loadPrescribedProtocol(uid), getDoseLogHistory()]).then(([protocol, logs]) => {
      if (active) setData({ protocol, logs });
    }).catch(() => {
      if (active) setLoadingFailed(true);
    });
    return () => { active = false; };
  }, [uid, getDoseLogHistory]);

  const { protocol, logs } = data ?? { protocol: null, logs: [] };
  const dates = protocol ? upcomingPrescribedDoses(protocol, logs) : [];
  const history = logs.filter(log => log.protocolOccurrence);
  const today = localDateTimeFields(new Date()).date;

  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>Protocol schedule</Text>
        {loadingFailed && <Text accessibilityRole="alert">Your schedule could not be loaded.</Text>}
        {!loadingFailed && !data && <Text>Loading your schedule…</Text>}
        {data && !protocol && <Text>No protocol schedule saved.</Text>}
        {protocol && (
          <>
            <Text style={styles.detail}>{protocol.medication} · {protocol.dose} {protocol.unit}</Text>
            <Text accessibilityRole="header" style={styles.heading}>Upcoming doses</Text>
            {dates.map((date, index) => (
              <View key={date} style={styles.card}>
                <Text style={styles.heading}>{index === 0 ? 'Next due' : 'Scheduled dose'}</Text>
                <Text style={styles.detail}>{dateLabel.format(new Date(date))}</Text>
                {index === 0 && date === today && (
                  <Pressable accessibilityRole="button" onPress={() => router.replace({
                    pathname: '/(tabs)/new-dose',
                    params: { scheduledDose: protocolOccurrence(protocol, date) },
                  })} style={styles.primary}>
                    <Text style={styles.primaryText}>Open dose guidance</Text>
                  </Pressable>
                )}
              </View>
            ))}
            <Text accessibilityRole="header" style={styles.heading}>Protocol history</Text>
            {!history.length && <Text style={styles.detail}>No scheduled doses logged yet.</Text>}
            {history.map(log => (
              <Text key={log.id} style={styles.detail}>
                {new Date(log.timestamp).toLocaleDateString()} · {log.substanceName} · {log.doseValue} {log.unit === 'units' ? 'IU' : log.unit}
              </Text>
            ))}
          </>
        )}
        <Pressable accessibilityRole="button" style={styles.link}
          onPress={() => router.replace('/(tabs)/new-dose?startScan=true')}>
          <Text style={styles.linkText}>Start a one-off scan</Text>
        </Pressable>
        {onboarding !== '1' && (
          <Link href={{ pathname: '/onboarding/protocol-setup', params: { settings: '1' } }} style={[styles.link, styles.linkText]}>
            {protocol ? 'Replace protocol schedule' : 'Set up a protocol'}
          </Link>
        )}
        {onboarding !== '1' && (
          <Pressable accessibilityRole="button" style={styles.link}
            onPress={() => router.replace('/(tabs)/settings')}>
            <Text style={styles.linkText}>Back to Settings</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F2F5FA' },
  content: { width: '100%', maxWidth: 500, alignSelf: 'center', padding: 24, gap: 14 },
  title: { color: '#111827', fontSize: 28, fontWeight: '700' },
  heading: { color: '#111827', fontSize: 17, fontWeight: '700' },
  detail: { color: '#475569', fontSize: 16 },
  card: { backgroundColor: '#fff', padding: 14, gap: 8, borderRadius: 10 },
  primary: { backgroundColor: '#1257B8', borderRadius: 8, padding: 12, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '700' },
  link: { paddingVertical: 12 },
  linkText: { color: '#1257B8', fontWeight: '600' },
});
