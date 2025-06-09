import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { TrendingUp, DollarSign, Users, Repeat, BarChart3, Calendar } from 'lucide-react-native';
import { calculateRevenueMetrics, calculateCohortRetention, type RevenueMetrics } from '../../lib/analytics/revenueAnalytics';

interface AnalyticsDashboardProps {
  adminMode?: boolean;
}

interface DashboardMetrics extends RevenueMetrics {
  totalUsers: number;
  activeUsers: number;
  trialUsers: number;
}

const MetricCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ComponentType<any>;
  color: string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
}> = ({ title, value, icon: Icon, color, subtitle, trend }) => (
  <View style={[styles.metricCard, { borderLeftColor: color }]}>
    <View style={styles.metricHeader}>
      <Icon size={20} color={color} />
      <Text style={styles.metricTitle}>{title}</Text>
    </View>
    <Text style={styles.metricValue}>{value}</Text>
    {subtitle && (
      <Text style={[styles.metricSubtitle, trend === 'up' ? styles.trendUp : trend === 'down' ? styles.trendDown : styles.trendNeutral]}>
        {subtitle}
      </Text>
    )}
  </View>
);

const CohortRetentionChart: React.FC<{ cohortData: any }> = ({ cohortData }) => {
  if (!cohortData || Object.keys(cohortData.retention || {}).length === 0) {
    return (
      <View style={styles.cohortContainer}>
        <Text style={styles.cohortTitle}>Cohort Retention</Text>
        <Text style={styles.cohortEmpty}>No cohort data available</Text>
      </View>
    );
  }

  return (
    <View style={styles.cohortContainer}>
      <Text style={styles.cohortTitle}>Cohort Retention</Text>
      <Text style={styles.cohortSubtitle}>Cohort Size: {cohortData.cohortSize} users</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.cohortChart}>
          {Object.entries(cohortData.retention).map(([month, percentage]) => (
            <View key={month} style={styles.cohortBar}>
              <View 
                style={[
                  styles.cohortBarFill, 
                  { height: `${Math.max(percentage as number, 5)}%` }
                ]} 
              />
              <Text style={styles.cohortBarLabel}>{month.replace('month_', 'M')}</Text>
              <Text style={styles.cohortBarValue}>{Math.round(percentage as number)}%</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ adminMode = false }) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [cohortData, setCohortData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    loadAnalyticsData();
  }, [selectedPeriod]);

  const loadAnalyticsData = async () => {
    if (!adminMode) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Load revenue metrics
      const revenueMetrics = await calculateRevenueMetrics();
      
      // Load cohort retention for current month
      const currentMonth = new Date().toISOString().substring(0, 7);
      const cohortRetention = await calculateCohortRetention(currentMonth);
      
      // Mock additional user metrics (would be calculated from actual user data)
      const dashboardMetrics: DashboardMetrics = {
        ...revenueMetrics,
        totalUsers: 1250, // Would fetch from users collection
        activeUsers: 890,  // Users active in last 30 days
        trialUsers: 45,    // Users currently on trial
      };
      
      setMetrics(dashboardMetrics);
      setCohortData(cohortRetention);
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  if (!adminMode) {
    return (
      <View style={styles.restrictedContainer}>
        <Text style={styles.restrictedText}>Analytics Dashboard</Text>
        <Text style={styles.restrictedSubtext}>Admin access required</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  if (!metrics) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load analytics data</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadAnalyticsData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Analytics Dashboard</Text>
        
        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {(['7d', '30d', '90d'] as const).map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && styles.periodButtonActive
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text style={[
                styles.periodButtonText,
                selectedPeriod === period && styles.periodButtonTextActive
              ]}>
                {period}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Revenue Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Revenue</Text>
        <View style={styles.metricsGrid}>
          <MetricCard
            title="Monthly Revenue"
            value={formatCurrency(metrics.monthlyRevenue)}
            icon={DollarSign}
            color="#34C759"
            subtitle="This month"
          />
          <MetricCard
            title="Total Revenue"
            value={formatCurrency(metrics.totalRevenue)}
            icon={TrendingUp}
            color="#007AFF"
            subtitle="All time"
          />
          <MetricCard
            title="ARPU"
            value={formatCurrency(metrics.averageRevenuePerUser)}
            icon={BarChart3}
            color="#FF9500"
            subtitle="Avg revenue per user"
          />
          <MetricCard
            title="Customer LTV"
            value={formatCurrency(metrics.customerLifetimeValue)}
            icon={Repeat}
            color="#AF52DE"
            subtitle="Lifetime value"
          />
        </View>
      </View>

      {/* User Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Users</Text>
        <View style={styles.metricsGrid}>
          <MetricCard
            title="Total Users"
            value={metrics.totalUsers.toLocaleString()}
            icon={Users}
            color="#007AFF"
            subtitle="Registered users"
          />
          <MetricCard
            title="Active Users"
            value={metrics.activeUsers.toLocaleString()}
            icon={Users}
            color="#34C759"
            subtitle="Last 30 days"
          />
          <MetricCard
            title="Trial Users"
            value={metrics.trialUsers.toLocaleString()}
            icon={Calendar}
            color="#FF9500"
            subtitle="Currently on trial"
          />
          <MetricCard
            title="Churn Rate"
            value={formatPercentage(metrics.churnRate)}
            icon={TrendingUp}
            color="#FF3B30"
            subtitle="Monthly churn"
            trend={metrics.churnRate > 0.1 ? 'down' : 'neutral'}
          />
        </View>
      </View>

      {/* Conversion Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Conversion</Text>
        <View style={styles.metricsGrid}>
          <MetricCard
            title="Conversion Rate"
            value={formatPercentage(metrics.conversionRate)}
            icon={TrendingUp}
            color="#34C759"
            subtitle="Free to paid"
          />
        </View>
      </View>

      {/* Cohort Retention Chart */}
      <CohortRetentionChart cohortData={cohortData} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#007AFF',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    flex: 1,
    minWidth: '47%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
    marginLeft: 8,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  metricSubtitle: {
    fontSize: 12,
    color: '#888888',
  },
  trendUp: {
    color: '#34C759',
  },
  trendDown: {
    color: '#FF3B30',
  },
  trendNeutral: {
    color: '#888888',
  },
  cohortContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cohortTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  cohortSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 16,
  },
  cohortEmpty: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
    paddingVertical: 20,
  },
  cohortChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 120,
    paddingTop: 20,
  },
  cohortBar: {
    width: 40,
    height: 100,
    marginHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  cohortBarFill: {
    width: 20,
    backgroundColor: '#007AFF',
    borderRadius: 2,
    marginBottom: 4,
  },
  cohortBarLabel: {
    fontSize: 10,
    color: '#666666',
    marginBottom: 2,
  },
  cohortBarValue: {
    fontSize: 10,
    color: '#333333',
    fontWeight: '500',
  },
  restrictedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  restrictedText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  restrictedSubtext: {
    fontSize: 16,
    color: '#666666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});