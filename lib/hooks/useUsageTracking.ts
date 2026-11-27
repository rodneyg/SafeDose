import { useCallback, useEffect, useRef, useState } from 'react';
import { getFirestore, doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { setDocWithEnv } from '../firestoreWithEnv';
import { useAuth } from '../../contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getNetworkStateAsync } from 'expo-network';
import { setAnalyticsUserProperties, USER_PROPERTIES } from '../analytics';
import { FREE_SCAN_LIMIT, getLimitForPlan, hasScanCapacity, isPaidPlan } from '../plans';
import { getSubscriptionStatus } from '../subscriptionStatus';

type ScanCounts = { scansUsed: number; lastReset: string | null };
export type ScanUsage = ScanCounts & { plan: string; limit: number };
const EMPTY_USAGE: ScanUsage = { scansUsed: 0, lastReset: null, plan: 'free', limit: FREE_SCAN_LIMIT };

function monthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

async function cachedScans(uid: string): Promise<ScanCounts> {
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

async function saveCachedScans(uid: string, { scansUsed, lastReset }: ScanCounts) {
  try {
    await AsyncStorage.setItem(`usage_${uid}`, JSON.stringify({ scansUsed, lastReset }));
  } catch {
    console.warn('Could not cache scan usage.');
  }
}

async function readScans(db: Firestore, uid: string): Promise<ScanCounts | null> {
  const ref = doc(db, 'users', uid);
  const snapshot = await getDoc(ref);
  if (snapshot.metadata.fromCache) return null;
  const data = snapshot.data();
  const start = monthStart();
  if (!data?.lastReset || data.lastReset < start) {
    const reset = { scansUsed: 0, lastReset: start };
    await setDocWithEnv(ref, reset, { merge: true });
    return reset;
  }
  return { scansUsed: data.scansUsed || 0, lastReset: data.lastReset };
}

// Unpaid users (anonymous or signed-in) share a monthly gpt-4o photo-scan cap.
// Paid photo-scan and legacy paid plans are not limited by that cap. Limits live in lib/plans.js.
/** Tracks photo-scan usage, connectivity, and plan capacity for the current user. */
export function useUsageTracking() {
  const { user, auth } = useAuth();
  const db = getFirestore();
  const [state, setState] = useState<{ uid: string; usage: ScanUsage; verified: boolean }>();
  const stateRef = useRef(state);
  stateRef.current = state;
  const [isOnline, setIsOnline] = useState(true);
  const currentUsage = state?.uid === user?.uid ? state : undefined;
  const usageData = currentUsage?.usage ?? EMPTY_USAGE;

  const readUsage = useCallback(async (account: User, signal?: AbortSignal) => {
    const [scans, subscription] = await Promise.all([
      isOnline ? readScans(db, account.uid).catch(() => null) : null,
      account.isAnonymous || !isOnline ? null : getSubscriptionStatus(account, signal).catch(() => null),
    ]);
    const counts = scans ?? await cachedScans(account.uid);
    const plan = subscription?.hasActiveSubscription && isPaidPlan(subscription.plan) ? subscription.plan : 'free';
    return {
      uid: account.uid,
      usage: { ...counts, plan, limit: getLimitForPlan(plan, account.isAnonymous) },
      verified: scans !== null && (account.isAnonymous || subscription !== null),
    };
  }, [db, isOnline]);

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
    readUsage(user, controller.signal).then(result => {
      if (controller.signal.aborted) return;
      setState(result);
      void saveCachedScans(user.uid, result.usage);
      setAnalyticsUserProperties({
        [USER_PROPERTIES.PLAN_TYPE]: result.usage.plan,
        [USER_PROPERTIES.IS_ANONYMOUS]: user.isAnonymous,
      });
    });
    return () => controller.abort();
  }, [user, readUsage]);

  const checkUsageLimit = async (onVerifiedUsage?: (usage: ScanUsage) => void) => {
    if (!user?.uid) return false;

    const result = await readUsage(user);
    if (auth && auth.currentUser?.uid !== user.uid) return false;
    stateRef.current = result;
    setState(result);
    await saveCachedScans(user.uid, result.usage);
    if (auth && auth.currentUser?.uid !== user.uid) return false;
    if (result.verified) onVerifiedUsage?.(result.usage);
    return hasScanCapacity(result.usage.scansUsed, result.usage.limit);
  };

  const incrementScansUsed = async () => {
    if (!user?.uid || !isOnline) return;

    try {
      const uid = user.uid;
      if (auth && auth.currentUser?.uid !== uid) return;
      await updateDoc(doc(db, 'users', uid), { scansUsed: increment(1) });
      if (auth && auth.currentUser?.uid !== uid) return;
      const latest = stateRef.current?.uid === uid ? stateRef.current : undefined;
      const usage = { ...(latest?.usage ?? EMPTY_USAGE), scansUsed: (latest?.usage.scansUsed ?? 0) + 1 };
      const nextState = { uid, usage, verified: latest?.verified ?? false };
      stateRef.current = nextState;
      setState(nextState);
      await saveCachedScans(uid, usage);
    } catch {
      console.warn('Could not update scan usage.');
    }
  };

  return { usageData, hasVerifiedUsage: currentUsage?.verified ?? false, checkUsageLimit, incrementScansUsed };
}
