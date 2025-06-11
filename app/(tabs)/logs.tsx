import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Trash2, Calendar, Pill } from 'lucide-react-native';
import { useFocusEffect } from 'expo-router';
import { useDoseLogging } from '../../lib/hooks/useDoseLogging';
import { DoseLog } from '../../types/doseLog';
import { formatInjectionSiteForDisplay } from '../../lib/injectionSites';

// Helper function to format the "Draw to" text
function formatDrawToText(log: DoseLog): string | null {
  if (!log.recommendedMarking || !log.syringeType) {
    return null;
  }
  
  const unit = log.syringeType === 'Insulin' ? 'units' : 'ml';
  const value = parseFloat(log.recommendedMarking).toFixed(2);
  return `Draw to ${value} ${unit}`;
}

export default function LogsScreen() {
  const { getDoseLogHistory, deleteDoseLog } = useDoseLogging();
  const [logs, setLogs] = useState<DoseLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadLogs = useCallback(async () => {
    try {
      setIsLoading(true);
      const logHistory = await getDoseLogHistory();
      setLogs(logHistory);
    } catch (error) {
      console.error('Error loading dose logs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [getDoseLogHistory]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Reload logs when tab gains focus
  useFocusEffect(
    useCallback(() => {
      loadLogs();
    }, [loadLogs])
  );

  const handleDeleteLog = useCallback((log: DoseLog) => {
    const displayName = getDisplaySubstanceName(log.substanceName);
    Alert.alert(
      'Delete Log Entry',
      `Are you sure you want to delete this dose log?\n\n${displayName} - ${log.doseValue} ${log.unit}`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoseLog(log.id);
              await loadLogs(); // Refresh the list
            } catch (error) {
              console.error('Error deleting log:', error);
              Alert.alert('Error', 'Failed to delete log entry. Please try again.');
            }
          },
        },
      ]
    );
  }, [deleteDoseLog, loadLogs]);

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return diffMinutes < 1 ? 'Just now' : `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getDisplaySubstanceName = (substanceName: string) => {
    if (!substanceName || substanceName.trim() === '' || substanceName.toLowerCase() === 'unknown') {
      return 'Peptide Injection';
    }
    return substanceName;
  };

  const formatConcentration = (doseValue: number, unit: string, calculatedVolume: number) => {
    if (unit === 'mL') {
      return null; // No concentration for volume-based doses
    }
    
    if (!calculatedVolume || calculatedVolume <= 0) {
      return null; // Avoid division by zero
    }
    
    const concentration = doseValue / calculatedVolume;
    const concentrationUnit = unit === 'units' ? 'units/mL' : `${unit}/mL`;
    
    // Round to appropriate precision
    const formattedConcentration = concentration < 1 
      ? concentration.toFixed(3).replace(/\.?0+$/, '') 
      : concentration.toFixed(1).replace(/\.?0+$/, '');
    
    return `${formattedConcentration} ${concentrationUnit}`;
  };

  const formatInjectionSite = (injectionSite: string): string => {
    try {
      return formatInjectionSiteForDisplay(injectionSite as any);
    } catch (error) {
      return injectionSite; // Fallback to raw value if formatting fails
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Recent Doses</Text>
          <Text style={styles.subtitle}>Your medication history</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Recent Doses</Text>
        <Text style={styles.subtitle}>Your medication history</Text>
      </View>

      <ScrollView style={styles.logsList}>
        {logs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Pill color="#8E8E93" size={48} style={styles.emptyIcon} />
            <Text style={styles.emptyText}>No doses logged yet</Text>
            <Text style={styles.emptySubtext}>
              Completed doses will automatically appear here
            </Text>
          </View>
        ) : (
          <>
            {logs.map((log, index) => {
              const concentration = formatConcentration(log.doseValue, log.unit, log.calculatedVolume);
              const drawToText = formatDrawToText(log);
              return (
                <View key={log.id} style={[styles.logCard, index === 0 && styles.mostRecentCard]}>
                  <View style={styles.logHeader}>
                    <View style={styles.logInfo}>
                      <Text style={styles.substanceName}>{getDisplaySubstanceName(log.substanceName)}</Text>
                      <View style={styles.doseInfo}>
                        <Text style={styles.doseAmount}>
                          {log.doseValue} {log.unit}
                        </Text>
                        <Text style={styles.volumeAmount}>
                          → {log.calculatedVolume} mL
                        </Text>
                        {log.injectionSite && (
                          <Text style={styles.injectionSiteText}>
                            — {formatInjectionSite(log.injectionSite)}
                          </Text>
                        )}
                      </View>
                      {drawToText && (
                        <View style={styles.drawToInfo}>
                          <Text style={styles.drawToText}>
                            {drawToText}
                          </Text>
                        </View>
                      )}
                      {concentration && (
                        <View style={styles.concentrationInfo}>
                          <Text style={styles.concentrationText}>
                            Concentration: {concentration}
                          </Text>
                        </View>
                      )}
                    </View>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteLog(log)}
                    >
                      <Trash2 color="#F87171" size={20} />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.logFooter}>
                    <View style={styles.timeInfo}>
                      <Calendar color="#8E8E93" size={14} />
                      <Text style={styles.timeText}>
                        {formatDate(log.timestamp)} at {formatTime(log.timestamp)}
                      </Text>
                    </View>
                    {index === 0 && (
                      <View style={styles.recentBadge}>
                        <Text style={styles.recentBadgeText}>Most Recent</Text>
                      </View>
                    )}
                  </View>

                  {log.notes && (
                    <View style={styles.notesContainer}>
                      <Text style={styles.notesLabel}>Notes:</Text>
                      <Text style={styles.notesText}>{log.notes}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: '#000000',
  },
  subtitle: {
    fontSize: 17,
    color: '#6B6B6B',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 17,
    color: '#8E8E93',
  },
  logsList: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#8E8E93',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    textAlign: 'center',
    color: '#8E8E93',
    fontSize: 15,
  },
  logCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  mostRecentCard: {
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  logInfo: {
    flex: 1,
  },
  substanceName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  doseInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  doseAmount: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
    marginRight: 8,
  },
  volumeAmount: {
    fontSize: 16,
    color: '#10B981',
    fontWeight: '500',
  },
  injectionSiteText: {
    fontSize: 15,
    color: '#007AFF',
    fontWeight: '500',
  },
  concentrationInfo: {
    marginTop: 4,
  },
  concentrationText: {
    fontSize: 14,
    color: '#6B6B6B',
    fontStyle: 'italic',
  },
  drawToInfo: {
    marginTop: 4,
  },
  drawToText: {
    fontSize: 15,
    color: '#FF0000',
    fontWeight: '600',
  },
  deleteButton: {
    padding: 8,
    marginLeft: 12,
  },
  logFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 4,
  },
  recentBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  recentBadgeText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  notesContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B6B6B',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#000000',
    lineHeight: 20,
  },
});