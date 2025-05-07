import { useState, useEffect } from 'react';
import { getFirestore, doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';

export function useUsageTracking() {
  const { user } = useAuth();
  const db = getFirestore();
  const [usageData, setUsageData] = useState({ scansUsed: 0, plan: 'free', limit: 30 });

  useEffect(() => {
    const fetchUsageData = async () => {
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        const data = userDoc.data() || { scansUsed: 0, plan: 'free' };
        const limit = data.plan === 'free' ? (user.isAnonymous ? 30 : 50) : data.plan === 'plus' ? 150 : 500;
        setUsageData({ scansUsed: data.scansUsed, plan: data.plan, limit });
      }
    };
    fetchUsageData();
  }, [user]);

  const checkUsageLimit = async () => {
    if (usageData.scansUsed >= usageData.limit) {
      return false;
    }
    return true;
  };

  const incrementScansUsed = async () => {
    if (user) {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, { scansUsed: increment(1) });
      setUsageData(prev => ({ ...prev, scansUsed: prev.scansUsed + 1 }));
    }
  };

  return { usageData, checkUsageLimit, incrementScansUsed };
}