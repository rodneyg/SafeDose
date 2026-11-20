import { useEffect, useState } from 'react';
import { getFirestore, doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { setDocWithEnv } from '../firestoreWithEnv';
import { useAuth } from '../../contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getNetworkStateAsync } from 'expo-network';
import { setAnalyticsUserProperties, USER_PROPERTIES } from '../analytics';
import { FREE_SCAN_LIMIT, getLimitForPlan, hasScanCapacity, isPaidPlan } from '../plans';
import { getSubscriptionStatus } from '../subscriptionStatus';

type ScanUsage = { scansUsed: number; lastReset: string | null };
type UsageData = ScanUsage & { plan: string; limit: number };
const EMPTY_USAGE: UsageData = { scansUsed: 0, lastReset: null, plan: 'free', limit: FREE_SCAN_LIMIT };

function monthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

async function cachedScans(uid: string): Promise<ScanUsage> {
  try {
    const cached = JSON.parse((await AsyncStorage.getItem(`usage_${uid}`)) || 'null');
    if (cached?.lastReset >= monthStart()) {
      return { scansUsed: Number(cached.scansUsed) || 0, lastReset: cached.lastReset };
    }
  } catch {
    console.warn('Could not read cached scan usage.');
  }
  return EMPTY_USAGE;
}

async function saveCachedScans(uid: string, { scansUsed, lastReset }: ScanUsage) {
  try {
    await AsyncStorage.setItem(`usage_${uid}`, JSON.stringify({ scansUsed, lastReset }));
  } catch {
    console.warn('Could not cache scan usage.');
  }
}

export function useUsageTracking() {
  const { user, auth } = useAuth();
  const db = getFirestore();
  const [state, setState] = useState<{ uid: string; usage: UsageData }>();
  const [isOnline, setIsOnline] = useState(true);
  const usageData = state && state.uid === user?.uid ? state.usage : EMPTY_USAGE;

  async function readScans(uid: string): Promise<ScanUsage> {
    if (!isOnline) return cachedScans(uid);
    try {
      const ref = doc(db, 'users', uid);
      const data = (await getDoc(ref)).data();
      const start = monthStart();
      if (!data?.lastReset || data.lastReset < start) {
        const reset = { scansUsed: 0, lastReset: start };
        await setDocWithEnv(ref, reset, { merge: true });
        return reset;
      }
      return { scansUsed: data.scansUsed || 0, lastReset: data.lastReset };
    } catch {
      return cachedScans(uid);
    }
  }

  async function readUsage(account: NonNullable<typeof user>, signal?: AbortSignal): Promise<UsageData> {
    const [scans, subscription] = await Promise.all([
      readScans(account.uid),
      account.isAnonymous || !isOnline ? null : getSubscriptionStatus(account, signal).catch(() => null),
    ]);
    const plan = subscription?.hasActiveSubscription && isPaidPlan(subscription.plan) ? subscription.plan : 'free';
    return { ...scans, plan, limit: getLimitForPlan(plan, account.isAnonymous) };
  }

  useEffect(() => {
    let canceled = false;
    getNetworkStateAsync().then(network => {
      if (!canceled) setIsOnline(network.isConnected ?? true);
    }).catch(() => {
      if (!canceled) setIsOnline(false);
    });
    return () => { canceled = true; };
  }, [user]);

  useEffect(() => {
    if (!user?.uid) return;

    const controller = new AbortController();
    readUsage(user, controller.signal).then(usage => {
      if (controller.signal.aborted) return;
      setState({ uid: user.uid, usage });
      void saveCachedScans(user.uid, usage);
      setAnalyticsUserProperties({
        [USER_PROPERTIES.PLAN_TYPE]: usage.plan,
        [USER_PROPERTIES.IS_ANONYMOUS]: user.isAnonymous,
      });
    });
    return () => controller.abort();
  }, [user, db, isOnline]);

  const checkUsageLimit = async () => {
    if (!user?.uid) return false;

    const usage = await readUsage(user);
    if (auth && auth.currentUser?.uid !== user.uid) return false;
    setState({ uid: user.uid, usage });
    await saveCachedScans(user.uid, usage);
    return hasScanCapacity(usage.scansUsed, usage.limit);
  };

  const incrementScansUsed = async () => {
    if (!user?.uid || !isOnline) return;

    try {
      await updateDoc(doc(db, 'users', user.uid), { scansUsed: increment(1) });
      const usage = { ...usageData, scansUsed: usageData.scansUsed + 1 };
      setState({ uid: user.uid, usage });
      await saveCachedScans(user.uid, usage);
    } catch {
      console.warn('Could not update scan usage.');
    }
  };

  return { usageData, checkUsageLimit, incrementScansUsed };
}
