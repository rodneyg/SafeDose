import AsyncStorage from '@react-native-async-storage/async-storage';
import { isPaidPlan } from './plans';
import type { ScanUsage } from './hooks/useUsageTracking';

export type UpgradeNudgeKind = 'firstScan' | 'oneScanLeft' | 'firstLogs' | 'manualEntry';

const seenThisSession = new Set<string>();

export function isFreeScanPlan({ plan, limit }: ScanUsage) {
  return !isPaidPlan(plan) && Number.isFinite(limit) && limit > 0;
}

export function photoUpgradeNudge(usage: ScanUsage, firstLocalScan: boolean) {
  if (!isFreeScanPlan(usage)) return null;
  const remaining = usage.limit - usage.scansUsed - 1;
  if (remaining === 1) return 'oneScanLeft';
  if (remaining > 0 && usage.scansUsed === 0 && firstLocalScan) return 'firstScan';
  return null;
}

async function rememberOnce(key: string, isActive: () => boolean) {
  if (seenThisSession.has(key)) return false;
  try {
    const stored = await AsyncStorage.getItem(key);
    if (stored === 'true' || !isActive() || seenThisSession.has(key)) return false;
    seenThisSession.add(key);
    // Keep the in-memory record if persistence fails.
    void AsyncStorage.setItem(key, 'true').catch(() => {});
    return true;
  } catch {
    return false;
  }
}

const scanHistoryKey = (userId: string) => `upgradeNudge:${userId}:hasScanned`;

export function recordSuccessfulScan(userId: string) {
  return rememberOnce(scanHistoryKey(userId), () => true);
}

export async function claimUpgradeNudge(userId: string, kind: UpgradeNudgeKind, isActive: () => boolean) {
  const key = `upgradeNudge:${userId}:${kind}`;
  if (kind !== 'manualEntry') return rememberOnce(key, isActive);

  const historyKey = scanHistoryKey(userId);
  try {
    if (seenThisSession.has(historyKey) || await AsyncStorage.getItem(historyKey) === 'true') return false;
    return rememberOnce(key, () => isActive() && !seenThisSession.has(historyKey));
  } catch {
    return false;
  }
}
