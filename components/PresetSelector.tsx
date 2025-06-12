import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, Modal } from 'react-native';
import { Bookmark, Trash2, X } from 'lucide-react-native';
import { usePresetStorage } from '../lib/hooks/usePresetStorage';
import { DosePreset } from '../types/preset';

type Props = {
  onPresetSelected: (preset: DosePreset) => void;
  onClose: () => void;
};

export default function PresetSelector({ onPresetSelected, onClose }: Props) {
  const { getPresets, deletePreset, isLoading } = usePresetStorage();
  const [presets, setPresets] = useState<DosePreset[]>([]);

  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = async () => {
    console.log('[PresetSelector] Loading presets...');
    try {
      const loadedPresets = await getPresets();
      console.log('[PresetSelector] Loaded', loadedPresets.length, 'presets');
      setPresets(loadedPresets);
    } catch (error) {
      console.error('[PresetSelector] Error loading presets:', error);
      Alert.alert('Error', 'Failed to load presets');
    }
  };

  const handleDeletePreset = (preset: DosePreset) => {
    Alert.alert(
      'Delete Preset',
      `Are you sure you want to delete "${preset.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deletePreset(preset.id);
            if (result.success) {
              await loadPresets(); // Reload presets
            } else {
              Alert.alert('Error', 'Failed to delete preset');
            }
          },
        },
      ]
    );
  };

  const handlePresetSelect = (preset: DosePreset) => {
    console.log('[PresetSelector] Preset selected:', preset.name);
    onPresetSelected(preset);
    onClose();
  };

  if (isLoading) {
    return (
      <Modal animationType="slide" transparent={true} visible={true} onRequestClose={onClose}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.loadingText}>Loading presets...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal animationType="slide" transparent={true} visible={true} onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Dose Presets</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X color="#6B7280" size={24} />
            </TouchableOpacity>
          </View>

          {presets.length === 0 ? (
            <View style={styles.emptyState}>
              <Bookmark color="#9CA3AF" size={48} />
              <Text style={styles.emptyStateTitle}>No Presets Saved</Text>
              <Text style={styles.emptyStateText}>
                Save your frequently used doses as presets for quick access.
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.presetList} showsVerticalScrollIndicator={false}>
              {presets.map((preset) => (
                <View key={preset.id} style={styles.presetCard}>
                  <TouchableOpacity
                    style={styles.presetContent}
                    onPress={() => handlePresetSelect(preset)}
                  >
                    <View style={styles.presetHeader}>
                      <Text style={styles.presetName}>{preset.name}</Text>
                      <TouchableOpacity
                        onPress={() => handleDeletePreset(preset)}
                        style={styles.deleteButton}
                      >
                        <Trash2 color="#EF4444" size={18} />
                      </TouchableOpacity>
                    </View>
                    
                    <View style={styles.presetDetails}>
                      <Text style={styles.presetDetailText}>
                        {preset.substanceName} • {preset.doseValue} {preset.unit}
                      </Text>
                      {preset.concentrationValue && preset.concentrationUnit && (
                        <Text style={styles.presetDetailText}>
                          Concentration: {preset.concentrationValue} {preset.concentrationUnit}
                        </Text>
                      )}
                      {preset.totalAmount && preset.totalAmountUnit && (
                        <Text style={styles.presetDetailText}>
                          Total: {preset.totalAmount} {preset.totalAmountUnit}
                        </Text>
                      )}
                      {preset.notes && (
                        <Text style={styles.presetNotes}>{preset.notes}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Tap a preset to load it, or the trash icon to delete.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#065F46',
  },
  closeButton: {
    padding: 4,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  presetList: {
    maxHeight: 400,
  },
  presetCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  presetContent: {
    padding: 16,
  },
  presetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  presetName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#065F46',
    flex: 1,
  },
  deleteButton: {
    padding: 4,
  },
  presetDetails: {
    gap: 4,
  },
  presetDetailText: {
    fontSize: 14,
    color: '#374151',
  },
  presetNotes: {
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 4,
  },
  footer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  footerText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
});