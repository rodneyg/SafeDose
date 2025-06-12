import { useState, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DosePreset } from '../../types/preset';

const MAX_PRESETS = 10; // Keep UX clean as specified

export function usePresetStorage() {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Save preset to local storage
  const savePresetLocally = useCallback(async (preset: DosePreset) => {
    try {
      const storageKey = `dose_presets_${user?.uid || 'anonymous'}`;
      const existingPresets = await AsyncStorage.getItem(storageKey);
      const presetsList: DosePreset[] = existingPresets ? JSON.parse(existingPresets) : [];
      
      // Check if we're at the limit
      if (presetsList.length >= MAX_PRESETS) {
        return { success: false, error: `Maximum ${MAX_PRESETS} presets allowed. Please delete an existing preset first.` };
      }
      
      presetsList.unshift(preset); // Add to beginning for recent-first order
      
      await AsyncStorage.setItem(storageKey, JSON.stringify(presetsList));
      console.log('Preset saved locally:', preset.id);
      return { success: true };
    } catch (error) {
      console.error('Error saving preset locally:', error);
      return { success: false, error: 'Failed to save preset' };
    }
  }, [user]);

  // Get all presets from local storage
  const getPresets = useCallback(async (): Promise<DosePreset[]> => {
    try {
      setIsLoading(true);
      const storageKey = `dose_presets_${user?.uid || 'anonymous'}`;
      const existingPresets = await AsyncStorage.getItem(storageKey);
      const presetsList: DosePreset[] = existingPresets ? JSON.parse(existingPresets) : [];
      return presetsList;
    } catch (error) {
      console.error('Error loading presets:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Delete a preset by ID
  const deletePreset = useCallback(async (presetId: string) => {
    try {
      const storageKey = `dose_presets_${user?.uid || 'anonymous'}`;
      const existingPresets = await AsyncStorage.getItem(storageKey);
      const presetsList: DosePreset[] = existingPresets ? JSON.parse(existingPresets) : [];
      
      const updatedPresets = presetsList.filter(preset => preset.id !== presetId);
      
      await AsyncStorage.setItem(storageKey, JSON.stringify(updatedPresets));
      console.log('Preset deleted:', presetId);
      return { success: true };
    } catch (error) {
      console.error('Error deleting preset:', error);
      return { success: false, error: 'Failed to delete preset' };
    }
  }, [user]);

  // Update a preset (for rename functionality)
  const updatePreset = useCallback(async (presetId: string, updates: Partial<DosePreset>) => {
    try {
      const storageKey = `dose_presets_${user?.uid || 'anonymous'}`;
      const existingPresets = await AsyncStorage.getItem(storageKey);
      const presetsList: DosePreset[] = existingPresets ? JSON.parse(existingPresets) : [];
      
      const presetIndex = presetsList.findIndex(preset => preset.id === presetId);
      if (presetIndex === -1) {
        return { success: false, error: 'Preset not found' };
      }
      
      presetsList[presetIndex] = { ...presetsList[presetIndex], ...updates };
      
      await AsyncStorage.setItem(storageKey, JSON.stringify(presetsList));
      console.log('Preset updated:', presetId);
      return { success: true };
    } catch (error) {
      console.error('Error updating preset:', error);
      return { success: false, error: 'Failed to update preset' };
    }
  }, [user]);

  // Main save function that generates ID and calls savePresetLocally
  const savePreset = useCallback(async (presetData: {
    name: string;
    substanceName: string;
    doseValue: number;
    unit: 'mg' | 'mcg' | 'units' | 'mL';
    concentrationValue?: number | null;
    concentrationUnit?: 'mg/ml' | 'mcg/ml' | 'units/ml';
    totalAmount?: number | null;
    totalAmountUnit?: 'mg' | 'mcg' | 'units';
    solutionVolume?: number | null;
    notes?: string;
  }) => {
    setIsSaving(true);
    try {
      const preset: DosePreset = {
        id: `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: user?.uid,
        timestamp: new Date().toISOString(),
        ...presetData,
      };

      const result = await savePresetLocally(preset);
      return result;
    } catch (error) {
      console.error('Error in savePreset:', error);
      return { success: false, error: 'Failed to save preset' };
    } finally {
      setIsSaving(false);
    }
  }, [user, savePresetLocally]);

  return {
    savePreset,
    getPresets,
    deletePreset,
    updatePreset,
    isSaving,
    isLoading,
    maxPresets: MAX_PRESETS,
  };
}