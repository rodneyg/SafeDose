import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router'; // Import useRouter
import { getMedicationLogs, MedicationLogEntry } from '../../lib/logUtils'; // Adjust path as needed
import { RefreshCw, Settings } from 'lucide-react-native'; // For refresh and settings icons

// Helper to format Firestore Timestamps
const formatDate = (timestamp: any): string => {
  if (!timestamp || !timestamp.toDate) {
    return 'Invalid date';
  }
  try {
    const date = timestamp.toDate();
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  } catch (e) {
    console.error("Error formatting date:", e);
    // If it's already a Date object or string for some reason (e.g., during optimistic update)
    if (timestamp instanceof Date) {
        return timestamp.toLocaleDateString() + ' ' + timestamp.toLocaleTimeString();
    }
    return 'Date unavailable';
  }
};

export default function LogsScreen() {
  const router = useRouter(); // Initialize router
  const [logs, setLogs] = useState<MedicationLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedLogs = await getMedicationLogs();
      setLogs(fetchedLogs);
    } catch (e: any) {
      console.error("Failed to fetch logs:", e);
      setError(e.message || 'An unexpected error occurred while fetching logs.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchLogs();
    }, [fetchLogs])
  );

  const renderLogItem = ({ item }: { item: MedicationLogEntry }) => (
    <View style={styles.logItemContainer}>
      <Text style={styles.logItemTitle}>{item.medicationName || 'Unknown Medication'}</Text>
      <Text style={styles.logItemDate}>{formatDate(item.timestamp)}</Text>

      <View style={styles.logDetailRow}>
        <Text style={styles.logDetailLabel}>Prescribed:</Text>
        <Text style={styles.logDetailValue}>
          {item.doseParams.doseValue} {item.doseParams.unit}
        </Text>
      </View>

      <View style={styles.logDetailRow}>
        <Text style={styles.logDetailLabel}>Calculated:</Text>
        <Text style={styles.logDetailValue}>
          Draw to {item.doseResult.recommendedMarking} mark
          {item.doseResult.calculatedVolume !== null && ` (${item.doseResult.calculatedVolume.toFixed(2)} mL)`}
        </Text>
      </View>

      {item.doseParams.manualSyringe && (
        <View style={styles.logDetailRow}>
          <Text style={styles.logDetailLabel}>Syringe:</Text>
          <Text style={styles.logDetailValue}>
            {item.doseParams.manualSyringe.type} {item.doseParams.manualSyringe.volume}
          </Text>
        </View>
      )}

      {item.doseResult.calculatedConcentration !== null && item.doseParams.concentrationUnit && (
         <View style={styles.logDetailRow}>
          <Text style={styles.logDetailLabel}>Final Concentration:</Text>
          <Text style={styles.logDetailValue}>
            {item.doseResult.calculatedConcentration?.toFixed(2)} {item.doseParams.concentrationUnit}
          </Text>
        </View>
      )}

      {item.calculationWarning && (
        <View style={styles.warningContainer}>
          <Text style={styles.warningText}>Note: {item.calculationWarning}</Text>
        </View>
      )}
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading logs...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Medication Logs</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={fetchLogs} style={styles.headerButton}>
            <RefreshCw size={20} color="#007AFF" />
            {/* <Text style={styles.refreshButtonText}>Refresh</Text> */}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/syringe-profiles')} style={styles.headerButton}>
            <Settings size={22} color="#007AFF" />
            {/* <Text style={styles.refreshButtonText}>Syringes</Text> */}
          </TouchableOpacity>
        </View>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchLogs}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {!error && logs.length === 0 && (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No medication logs found.</Text>
          <Text style={styles.emptyHelpText}>Calculated doses that you save will appear here.</Text>
        </View>
      )}

      {!error && logs.length > 0 && (
        <FlatList
          data={logs}
          renderItem={renderLogItem}
          keyExtractor={(item) => item.id || String(Date.now() + Math.random())} // Ensure key is always unique
          contentContainerStyle={styles.logsList}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 50, // Increased top padding for status bar area
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#D1D1D6',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    marginLeft: 16, // Space between buttons
    padding: 6,
    // backgroundColor: '#EFEFF4', // Optional background
    // borderRadius: 8,
  },
  refreshButtonText: { // Kept if you want text next to icons
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 4,
  },
  logsList: {
    padding: 16,
  },
  logItemContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  logItemTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  logItemDate: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 12,
  },
  logDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
    paddingVertical: 2,
  },
  logDetailLabel: {
    fontSize: 14,
    color: '#3A3A3C',
    fontWeight: '500',
    flex: 1, // Allow label to take space
  },
  logDetailValue: {
    fontSize: 14,
    color: '#3A3A3C',
    fontWeight: '400',
    flex: 1.5, // Allow value to take more space
    textAlign: 'right',
  },
  warningContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#FFFBEB', // Light yellow
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#FBBF24', // Amber
  },
  warningText: {
    fontSize: 13,
    color: '#B45309', // Darker amber/brown
    fontStyle: 'italic',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6B6B6B',
  },
  emptyText: {
    textAlign: 'center',
    color: '#8E8E93',
    fontSize: 18, // Slightly larger
    fontWeight: '500',
    marginBottom: 8,
  },
  emptyHelpText: {
    textAlign: 'center',
    color: '#AEAEB2',
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: { // Reusing this style name, but making it specific for this context
    fontSize: 16,
    color: '#D32F2F', // Material Design error color
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  }
});
