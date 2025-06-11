import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { InjectionSite, DoseLog } from '../types/doseLog';
import { 
  INJECTION_SITES, 
  InjectionSiteInfo,
  getLeastRecentlyUsedSite, 
  wasSiteUsedRecently,
  getLastUsedDate 
} from '../lib/injectionSites';

interface InjectionSiteSelectorProps {
  doseHistory: DoseLog[];
  selectedSite: InjectionSite | null;
  onSiteSelect: (site: InjectionSite) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function InjectionSiteSelector({
  doseHistory,
  selectedSite,
  onSiteSelect,
  onConfirm,
  onCancel,
}: InjectionSiteSelectorProps) {
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');

  // Auto-select least recently used site on mount
  useEffect(() => {
    if (!selectedSite) {
      const suggestedSite = getLeastRecentlyUsedSite(doseHistory);
      onSiteSelect(suggestedSite);
    }
  }, [doseHistory, selectedSite, onSiteSelect]);

  // Check for rotation warning when site is selected
  useEffect(() => {
    if (selectedSite) {
      const wasUsedRecently = wasSiteUsedRecently(selectedSite, doseHistory, 7);
      if (wasUsedRecently) {
        const lastUsed = getLastUsedDate(selectedSite, doseHistory);
        const daysAgo = lastUsed ? Math.floor((Date.now() - lastUsed.getTime()) / (1000 * 60 * 60 * 24)) : 0;
        setWarningMessage(`Consider rotating to reduce scar tissue. Last used ${daysAgo} day${daysAgo === 1 ? '' : 's'} ago.`);
        setShowWarning(true);
      } else {
        setShowWarning(false);
        setWarningMessage('');
      }
    }
  }, [selectedSite, doseHistory]);

  const renderSiteButton = (site: InjectionSiteInfo) => {
    const isSelected = selectedSite === site.id;
    const lastUsed = getLastUsedDate(site.id, doseHistory);
    const wasUsedRecently = wasSiteUsedRecently(site.id, doseHistory, 7);
    
    return (
      <TouchableOpacity
        key={site.id}
        style={[
          styles.siteButton,
          isSelected && styles.selectedSiteButton,
          wasUsedRecently && !isSelected && styles.recentlyUsedButton,
        ]}
        onPress={() => onSiteSelect(site.id)}
      >
        <Text style={styles.siteEmoji}>{site.emoji}</Text>
        <Text style={[
          styles.siteLabel,
          isSelected && styles.selectedSiteLabel,
        ]}>
          {site.label}
        </Text>
        {lastUsed && (
          <Text style={[
            styles.lastUsedText,
            isSelected && styles.selectedLastUsedText,
          ]}>
            {formatLastUsed(lastUsed)}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const formatLastUsed = (date: Date): string => {
    const daysAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (daysAgo === 0) return 'Today';
    if (daysAgo === 1) return '1 day ago';
    if (daysAgo < 7) return `${daysAgo} days ago`;
    return `${Math.floor(daysAgo / 7)}w ago`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Select Injection Site</Text>
        <Text style={styles.subtitle}>Choose where you'll inject to help track rotation</Text>
      </View>

      {/* 2×4 Grid Layout */}
      <View style={styles.gridContainer}>
        <View style={styles.gridRow}>
          {INJECTION_SITES.slice(0, 4).map(renderSiteButton)}
        </View>
        <View style={styles.gridRow}>
          {INJECTION_SITES.slice(4, 8).map(renderSiteButton)}
        </View>
      </View>

      {/* Rotation Warning */}
      {showWarning && (
        <View style={styles.warningContainer}>
          <AlertTriangle color="#F59E0B" size={16} />
          <Text style={styles.warningText}>{warningMessage}</Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onCancel}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.confirmButton,
            !selectedSite && styles.disabledButton,
          ]}
          onPress={onConfirm}
          disabled={!selectedSite}
        >
          <Text style={[
            styles.confirmButtonText,
            !selectedSite && styles.disabledButtonText,
          ]}>
            Continue
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    padding: 20,
  },
  header: {
    marginBottom: 32,
    paddingTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 17,
    color: '#6B6B6B',
    lineHeight: 22,
  },
  gridContainer: {
    marginBottom: 24,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  siteButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E5EA',
    minHeight: 80,
    justifyContent: 'center',
  },
  selectedSiteButton: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  recentlyUsedButton: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFFDF7',
  },
  siteEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  siteLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 2,
  },
  selectedSiteLabel: {
    color: '#007AFF',
  },
  lastUsedText: {
    fontSize: 10,
    color: '#8E8E93',
    textAlign: 'center',
  },
  selectedLastUsedText: {
    color: '#007AFF',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    marginLeft: 8,
    lineHeight: 18,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 'auto',
    paddingBottom: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#8E8E93',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 2,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#C7C7CC',
  },
  disabledButtonText: {
    color: '#FFFFFF',
  },
});