import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ReconstitutionPlanner from '../components/ReconstitutionPlanner';
import { useAuth } from '../contexts/AuthContext';

export default function ReconstitutionScreen() {
  const { user } = useAuth();
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ReconstitutionPlanner scanDisabled={true} accountId={user?.isAnonymous ? undefined : user?.uid} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  container: {
    flex: 1,
  },
});