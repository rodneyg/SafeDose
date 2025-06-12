import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DosePreset } from '../../types/preset';

const STORAGE_KEY = 'dose_presets';
const MAX_PRESETS = 10;

export function usePresetStorage() {
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const savePreset = useCallback(async (presetData: Omit<DosePreset, 'id' | 'timestamp'>) => {
    setIsSaving(true);
    try {
      const existingData = await AsyncStorage.getItem(STORAGE_KEY);
      const presets: DosePreset[] = existingData ? JSON.parse(existingData) : [];
      
      if (presets.length >= MAX_PRESETS) {
        return { success: false, error: `Maximum ${MAX_PRESETS} presets allowed` };
      }

      const preset: DosePreset = {
        ...presetData,
        id: `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
      };

      presets.unshift(preset);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
      
      return { success: true };
    } catch (error) {
      console.error('Error saving preset:', error);
      return { success: false, error: 'Failed to save preset' };
    } finally {
      setIsSaving(false);
    }
  }, []);

  const getPresets = useCallback(async (): Promise<DosePreset[]> => {
    setIsLoading(true);
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading presets:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deletePreset = useCallback(async (presetId: string) => {
    try {
      const existingData = await AsyncStorage.getItem(STORAGE_KEY);
      const presets: DosePreset[] = existingData ? JSON.parse(existingData) : [];
      
      const updatedPresets = presets.filter(preset => preset.id !== presetId);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPresets));
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting preset:', error);
      return { success: false, error: 'Failed to delete preset' };
    }
  }, []);

  return {
    savePreset,
    getPresets,
    deletePreset,
    isSaving,
    isLoading,
    maxPresets: MAX_PRESETS,
  };
}