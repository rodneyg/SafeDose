import { formatDrawToText, formatConcentration } from '../../lib/dosing';
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Trash2, Calendar, Pill } from 'lucide-react-native';
import { useIsFocused } from '@react-navigation/native';
import { useFocusEffect } from 'expo-router';
import { useDoseLogging } from '../../lib/hooks/useDoseLogging';
import { DoseLog } from '../../types/doseLog';
import { formatInjectionSiteForDisplay } from '../../lib/injectionSites';
import { useAuth } from '../../contexts/AuthContext';
import { useUsageTracking } from '../../lib/hooks/useUsageTracking';
import { useWebOffline } from '../../lib/hooks/useWebOffline';
import { isFreeScanPlan } from '../../lib/upgradeNudges';
import UpgradeNudge from '../../components/UpgradeNudge';

export default function LogsScreen() {
  const { user } = useAuth();
  const isFocused = useIsFocused();
  const offline = useWebOffline();
  const { usageData, hasVerifiedUsage } = useUsageTracking();
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
    if (Number.isNaN(date.getTime())) return null;

    const now = new Date();
    const localCalendarDay = (value: Date) =>
      Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());
    const daysAgo = (localCalendarDay(now) - localCalendarDay(date)) / 86_400_000;
    if (daysAgo === 1) return 'Yesterday';
    if (daysAgo > 1) return daysAgo < 7 ? `${daysAgo} days ago` : date.toLocaleDateString();

    const minutesAgo = Math.floor((now.getTime() - date.getTime()) / 60_000);
    if (minutesAgo < 1) return 'Just now';
    return minutesAgo < 60 ? `${minutesAgo}m ago` : `${Math.floor(minutesAgo / 60)}h ago`;
  };

  const formatTime = (timestamp: string) =>
    new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const getDisplaySubstanceName = (substanceName: string) => {
    if (!substanceName || substanceName.trim() === '' || substanceName.toLowerCase() === 'unknown') {
      return 'Peptide Injection';
    }
    return substanceName;
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
        {isFocused && !offline && user?.uid && hasVerifiedUsage && isFreeScanPlan(usageData) && (
          <UpgradeNudge key={user.uid} userId={user.uid} kind="firstLogs" />
        )}
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
              const dateLabel = formatDate(log.timestamp);
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
                        {dateLabel ? `${dateLabel} at ${formatTime(log.timestamp)}` : 'Date unavailable'}
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