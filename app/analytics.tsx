import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AnalyticsDashboard } from '../components/analytics/AnalyticsDashboard';
import { useAuth } from '../contexts/AuthContext';

export default function AnalyticsScreen() {
  const { user } = useAuth();
  
  // Check if user is admin (in a real app, you'd check against a proper admin role)
  const isAdmin = user?.email === 'admin@safedoseai.com' || user?.email === 'rodneyg@gmail.com';
  
  return (
    <View style={styles.container}>
      <AnalyticsDashboard adminMode={isAdmin} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
});