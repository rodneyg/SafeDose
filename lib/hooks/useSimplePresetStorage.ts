// Simple test version of preset storage hook that focuses on local storage only
import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DosePreset } from '../../types/preset';

const MAX_PRESETS = 10;

export function useSimplePresetStorage() {
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Save preset to local storage only
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
    console.log('[SimplePresetStorage] Saving preset:', presetData.name);
    setIsSaving(true);
    
    try {
      const storageKey = 'simple_dose_presets';
      const existingPresets = await AsyncStorage.getItem(storageKey);
      const presetsList: DosePreset[] = existingPresets ? JSON.parse(existingPresets) : [];
      
      console.log('[SimplePresetStorage] Found', presetsList.length, 'existing presets');
      
      if (presetsList.length >= MAX_PRESETS) {
        console.warn('[SimplePresetStorage] Preset limit reached');
        return { success: false, error: `Maximum ${MAX_PRESETS} presets allowed.` };
      }

      const preset: DosePreset = {
        id: `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        ...presetData,
      };

      presetsList.unshift(preset);
      await AsyncStorage.setItem(storageKey, JSON.stringify(presetsList));
      
      console.log('[SimplePresetStorage] Preset saved successfully:', preset.id);
      return { success: true };
    } catch (error) {
      console.error('[SimplePresetStorage] Error saving preset:', error);
      return { success: false, error: 'Failed to save preset' };
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Get presets from local storage only
  const getPresets = useCallback(async (): Promise<DosePreset[]> => {
    console.log('[SimplePresetStorage] Loading presets...');
    try {
      setIsLoading(true);
      
      const storageKey = 'simple_dose_presets';
      const existingPresets = await AsyncStorage.getItem(storageKey);
      const presetsList: DosePreset[] = existingPresets ? JSON.parse(existingPresets) : [];
      
      console.log('[SimplePresetStorage] Loaded', presetsList.length, 'presets');
      return presetsList.slice(0, MAX_PRESETS);
    } catch (error) {
      console.error('[SimplePresetStorage] Error loading presets:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Delete a preset
  const deletePreset = useCallback(async (presetId: string) => {
    console.log('[SimplePresetStorage] Deleting preset:', presetId);
    try {
      const storageKey = 'simple_dose_presets';
      const existingPresets = await AsyncStorage.getItem(storageKey);
      const presetsList: DosePreset[] = existingPresets ? JSON.parse(existingPresets) : [];
      
      const updatedPresets = presetsList.filter(preset => preset.id !== presetId);
      await AsyncStorage.setItem(storageKey, JSON.stringify(updatedPresets));
      
      console.log('[SimplePresetStorage] Preset deleted successfully');
      return { success: true };
    } catch (error) {
      console.error('[SimplePresetStorage] Error deleting preset:', error);
      return { success: false, error: 'Failed to delete preset' };
    }
  }, []);

  return {
    savePreset,
    getPresets,
    deletePreset,
    updatePreset: deletePreset, // Simple alias for now
    isSaving,
    isLoading,
    maxPresets: MAX_PRESETS,
  };
}