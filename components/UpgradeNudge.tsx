import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { claimUpgradeNudge, type UpgradeNudgeKind } from '../lib/upgradeNudges';

const messages: Record<UpgradeNudgeKind, string> = {
  firstScan: 'Want unlimited photo scans? Upgrade to SafeDose Photo Scan.',
  oneScanLeft: 'You have one free scan left this month. Get unlimited scans with SafeDose Photo Scan.',
  firstLogs: 'Dose logs are free. Want unlimited vial and syringe scans? Explore SafeDose Photo Scan.',
  manualEntry: 'Add a photo scan to your next calculation. SafeDose Photo Scan includes unlimited scans.',
};

export default function UpgradeNudge({ userId, kind }: { userId: string; kind: UpgradeNudgeKind }) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let active = true;
    claimUpgradeNudge(userId, kind, () => active).then(firstView => {
      if (active && firstView) setVisible(true);
    });
    return () => { active = false; };
  }, [userId, kind]);

  if (!visible) return null;
  return (
    <View style={styles.card}>
      <Text style={styles.message}>{messages[kind]}</Text>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" style={styles.button} onPress={() => setVisible(false)}>
          <Text style={styles.dismiss}>Not now</Text>
        </Pressable>
        <Pressable accessibilityRole="button" style={styles.button} onPress={() => {
          setVisible(false);
          router.push('/pricing');
        }}>
          <Text style={styles.upgrade}>Upgrade</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 14,
    paddingTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C9DAEA',
    backgroundColor: '#EFF6FD',
  },
  message: { color: '#17334C', fontSize: 15, lineHeight: 21 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap' },
  button: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 },
  dismiss: { color: '#394E61', fontWeight: '600' },
  upgrade: { color: '#0059A8', fontWeight: '700' },
});
