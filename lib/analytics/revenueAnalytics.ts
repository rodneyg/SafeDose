import { getFirestore, collection, doc, getDoc, setDoc, updateDoc, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { trackRevenue, trackSubscriptionEvent, logAnalyticsEvent, ANALYTICS_EVENTS } from '../analytics';

const db = getFirestore();

export interface RevenueMetrics {
  totalRevenue: number;
  monthlyRevenue: number;
  averageRevenuePerUser: number;
  conversionRate: number;
  churnRate: number;
  customerLifetimeValue: number;
}

export interface SubscriptionData {
  userId: string;
  customerId: string;
  subscriptionId: string;
  planType: string;
  status: 'active' | 'cancelled' | 'past_due' | 'incomplete';
  amount: number;
  currency: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  createdAt: Date;
  cancelledAt?: Date;
}

// Track revenue from Stripe webhooks
export const recordRevenue = async (revenueData: {
  userId?: string;
  customerId?: string;
  amount: number;
  currency: string;
  subscriptionId?: string;
  invoiceId?: string;
  planType?: string;
  transactionType: 'subscription' | 'one_time' | 'refund';
}) => {
  try {
    // Create revenue record in Firestore
    const revenueRef = collection(db, 'revenue');
    const revenueRecord = {
      ...revenueData,
      timestamp: new Date(),
      processed: true,
    };
    
    await setDoc(doc(revenueRef), revenueRecord);
    
    // Track in analytics
    trackRevenue(revenueData.amount, revenueData.currency, revenueData.invoiceId, revenueData.transactionType);
    
    console.log('Revenue recorded:', revenueRecord);
    return revenueRecord;
  } catch (error) {
    console.error('Error recording revenue:', error);
    throw error;
  }
};

// Update subscription data
export const updateSubscriptionData = async (subscriptionData: SubscriptionData) => {
  try {
    const subscriptionRef = doc(db, 'subscriptions', subscriptionData.subscriptionId);
    await setDoc(subscriptionRef, {
      ...subscriptionData,
      updatedAt: new Date(),
    }, { merge: true });
    
    console.log('Subscription data updated:', subscriptionData);
    return subscriptionData;
  } catch (error) {
    console.error('Error updating subscription data:', error);
    throw error;
  }
};

// Calculate revenue metrics
export const calculateRevenueMetrics = async (): Promise<RevenueMetrics> => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    
    // Get all revenue records
    const revenueQuery = query(
      collection(db, 'revenue'),
      where('timestamp', '>=', sixtyDaysAgo),
      orderBy('timestamp', 'desc')
    );
    const revenueSnapshot = await getDocs(revenueQuery);
    
    let totalRevenue = 0;
    let monthlyRevenue = 0;
    const users = new Set<string>();
    
    revenueSnapshot.forEach((doc) => {
      const data = doc.data();
      const amount = data.amount || 0;
      
      if (data.transactionType !== 'refund') {
        totalRevenue += amount;
        
        if (data.timestamp.toDate() >= thirtyDaysAgo) {
          monthlyRevenue += amount;
        }
        
        if (data.userId) {
          users.add(data.userId);
        }
      }
    });
    
    // Get subscription data for churn calculation
    const subscriptionsQuery = query(collection(db, 'subscriptions'));
    const subscriptionsSnapshot = await getDocs(subscriptionsQuery);
    
    let activeSubscriptions = 0;
    let cancelledSubscriptions = 0;
    
    subscriptionsSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.status === 'active') {
        activeSubscriptions++;
      } else if (data.status === 'cancelled' && data.cancelledAt?.toDate() >= thirtyDaysAgo) {
        cancelledSubscriptions++;
      }
    });
    
    // Calculate metrics
    const averageRevenuePerUser = users.size > 0 ? totalRevenue / users.size : 0;
    const churnRate = (activeSubscriptions + cancelledSubscriptions) > 0 
      ? cancelledSubscriptions / (activeSubscriptions + cancelledSubscriptions) 
      : 0;
    
    // Simple conversion rate calculation (would need more user data for accuracy)
    const conversionRate = 0.05; // Placeholder - would calculate from actual user journey data
    
    // Simple CLV calculation (average revenue per user / churn rate)
    const customerLifetimeValue = churnRate > 0 ? averageRevenuePerUser / churnRate : averageRevenuePerUser * 12;
    
    return {
      totalRevenue,
      monthlyRevenue,
      averageRevenuePerUser,
      conversionRate,
      churnRate,
      customerLifetimeValue,
    };
  } catch (error) {
    console.error('Error calculating revenue metrics:', error);
    return {
      totalRevenue: 0,
      monthlyRevenue: 0,
      averageRevenuePerUser: 0,
      conversionRate: 0,
      churnRate: 0,
      customerLifetimeValue: 0,
    };
  }
};

// Track user conversion funnel
export const trackConversionFunnel = async (userId: string, event: 'signup' | 'trial_start' | 'trial_end' | 'first_payment' | 'subscription_active') => {
  try {
    const funnelRef = doc(db, 'conversion_funnel', userId);
    const currentData = await getDoc(funnelRef);
    
    const funnelData = currentData.exists() ? currentData.data() : {};
    funnelData[event] = new Date();
    funnelData.lastUpdated = new Date();
    
    await setDoc(funnelRef, funnelData, { merge: true });
    
    // Track analytics events
    switch (event) {
      case 'trial_start':
        logAnalyticsEvent(ANALYTICS_EVENTS.TRIAL_STARTED);
        break;
      case 'trial_end':
        logAnalyticsEvent(ANALYTICS_EVENTS.TRIAL_ENDED);
        break;
      case 'first_payment':
        logAnalyticsEvent(ANALYTICS_EVENTS.TRIAL_CONVERTED);
        logAnalyticsEvent(ANALYTICS_EVENTS.FREE_TO_PAID_CONVERSION);
        break;
    }
    
    console.log('Conversion funnel updated:', { userId, event, data: funnelData });
  } catch (error) {
    console.error('Error tracking conversion funnel:', error);
  }
};

// Calculate cohort retention
export const calculateCohortRetention = async (cohortMonth: string) => {
  try {
    // Get all users from the cohort month
    const usersQuery = query(
      collection(db, 'users'),
      where('createdAt', '>=', new Date(`${cohortMonth}-01`)),
      where('createdAt', '<', new Date(`${cohortMonth}-01T00:00:00.000Z`).getTime() + 30 * 24 * 60 * 60 * 1000)
    );
    
    const usersSnapshot = await getDocs(usersQuery);
    const cohortSize = usersSnapshot.size;
    
    if (cohortSize === 0) return { cohortSize: 0, retention: {} };
    
    // Calculate retention for different periods
    const now = new Date();
    const retention: Record<string, number> = {};
    
    // Calculate monthly retention for up to 12 months
    for (let month = 1; month <= 12; month++) {
      const retentionDate = new Date(new Date(`${cohortMonth}-01`).getTime() + month * 30 * 24 * 60 * 60 * 1000);
      if (retentionDate > now) break;
      
      let activeUsers = 0;
      
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const lastActiveDate = userData.lastActiveDate?.toDate();
        
        if (lastActiveDate && lastActiveDate >= retentionDate) {
          activeUsers++;
        }
      }
      
      retention[`month_${month}`] = cohortSize > 0 ? (activeUsers / cohortSize) * 100 : 0;
    }
    
    return { cohortSize, retention };
  } catch (error) {
    console.error('Error calculating cohort retention:', error);
    return { cohortSize: 0, retention: {} };
  }
};