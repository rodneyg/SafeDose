import { useState, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, addDoc, getDocs, query, where, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { DosePreset } from '../../types/preset';

const MAX_PRESETS = 10; // Keep UX clean as specified

export function usePresetStorage() {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Save preset to local storage
  const savePresetLocally = useCallback(async (preset: DosePreset) => {
    console.log('[usePresetStorage] savePresetLocally called for:', preset.name);
    try {
      const storageKey = `dose_presets_${user?.uid || 'anonymous'}`;
      console.log('[usePresetStorage] Using storage key:', storageKey);
      
      const existingPresets = await AsyncStorage.getItem(storageKey);
      const presetsList: DosePreset[] = existingPresets ? JSON.parse(existingPresets) : [];
      console.log('[usePresetStorage] Found', presetsList.length, 'existing presets');
      
      // Check if we're at the limit
      if (presetsList.length >= MAX_PRESETS) {
        console.warn('[usePresetStorage] Preset limit reached:', presetsList.length, '>=', MAX_PRESETS);
        return { success: false, error: `Maximum ${MAX_PRESETS} presets allowed. Please delete an existing preset first.` };
      }
      
      presetsList.unshift(preset); // Add to beginning for recent-first order
      console.log('[usePresetStorage] Adding preset, new total:', presetsList.length);
      
      await AsyncStorage.setItem(storageKey, JSON.stringify(presetsList));
      console.log('[usePresetStorage] Preset saved locally:', preset.id);
      return { success: true };
    } catch (error) {
      console.error('[usePresetStorage] Error saving preset locally:', error);
      return { success: false, error: 'Failed to save preset' };
    }
  }, [user]);

  // Save preset to Firestore (for authenticated users)
  const savePresetToFirestore = useCallback(async (preset: DosePreset): Promise<string | null> => {
    if (!user || user.isAnonymous) {
      console.log('[usePresetStorage] Skipping Firestore save for anonymous user');
      return null;
    }

    try {
      console.log('[usePresetStorage] Attempting to save to Firestore...');
      
      // Check if Firebase is available
      if (!db) {
        console.warn('[usePresetStorage] Firestore db not available, skipping');
        return null;
      }
      
      const presetsCollection = collection(db, 'dose_presets');
      const docRef = await addDoc(presetsCollection, {
        ...preset,
        userId: user.uid,
      });
      console.log('[usePresetStorage] Preset saved to Firestore:', preset.id, 'Document ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('[usePresetStorage] Error saving preset to Firestore:', error);
      // Don't throw error - local storage is the fallback
      return null;
    }
  }, [user]);

  // Load presets from Firestore (for authenticated users)
  const loadPresetsFromFirestore = useCallback(async (): Promise<DosePreset[]> => {
    if (!user || user.isAnonymous) {
      console.log('[usePresetStorage] Skipping Firestore load for anonymous user');
      return [];
    }

    try {
      console.log('[usePresetStorage] Loading presets from Firestore for user:', user.uid);
      
      // Check if Firebase is available
      if (!db) {
        console.warn('[usePresetStorage] Firestore db not available, skipping');
        return [];
      }
      
      const presetsCollection = collection(db, 'dose_presets');
      const q = query(
        presetsCollection,
        where('userId', '==', user.uid),
        orderBy('timestamp', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      const presets: DosePreset[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        presets.push({
          id: data.id,
          userId: data.userId,
          name: data.name,
          substanceName: data.substanceName,
          doseValue: data.doseValue,
          unit: data.unit,
          concentrationValue: data.concentrationValue,
          concentrationUnit: data.concentrationUnit,
          totalAmount: data.totalAmount,
          totalAmountUnit: data.totalAmountUnit,
          solutionVolume: data.solutionVolume,
          notes: data.notes,
          timestamp: data.timestamp,
          firestoreId: doc.id, // Store the Firestore document ID
        });
      });
      
      console.log('[usePresetStorage] Loaded', presets.length, 'presets from Firestore');
      return presets;
    } catch (error) {
      console.error('[usePresetStorage] Error loading presets from Firestore:', error);
      return [];
    }
  }, [user]);

  // Delete preset from Firestore
  const deletePresetFromFirestore = useCallback(async (firestoreId: string): Promise<boolean> => {
    if (!user || user.isAnonymous) {
      console.log('Skipping Firestore delete for anonymous user');
      return true;
    }

    try {
      const presetDoc = doc(db, 'dose_presets', firestoreId);
      await deleteDoc(presetDoc);
      console.log('Preset deleted from Firestore:', firestoreId);
      return true;
    } catch (error) {
      console.error('Error deleting preset from Firestore:', error);
      return false;
    }
  }, [user]);

  // Get all presets from both local storage and Firestore, merging intelligently
  const getPresets = useCallback(async (): Promise<DosePreset[]> => {
    console.log('[usePresetStorage] Getting presets...');
    try {
      setIsLoading(true);
      
      // Always try to load from local storage first (most reliable)
      console.log('[usePresetStorage] Loading from local storage...');
      const localPresets = await getPresetsFromLocal();
      console.log('[usePresetStorage] Found', localPresets.length, 'local presets');
      
      // For anonymous users, just return local presets
      if (!user || user.isAnonymous) {
        console.log('[usePresetStorage] Anonymous user, returning local presets only');
        return localPresets.slice(0, MAX_PRESETS);
      }
      
      // For authenticated users, try to load from Firestore but don't fail if it doesn't work
      try {
        console.log('[usePresetStorage] Authenticated user, trying Firestore...');
        const firestorePresets = await loadPresetsFromFirestore();
        console.log('[usePresetStorage] Found', firestorePresets.length, 'Firestore presets');
        
        // If we have Firestore presets, use them as source of truth and sync to local
        if (firestorePresets.length > 0) {
          console.log('[usePresetStorage] Using Firestore presets as source of truth');
          // Store Firestore presets locally for offline access
          const storageKey = `dose_presets_${user?.uid || 'anonymous'}`;
          await AsyncStorage.setItem(storageKey, JSON.stringify(firestorePresets));
          return firestorePresets.slice(0, MAX_PRESETS);
        }
      } catch (firestoreError) {
        console.warn('[usePresetStorage] Firestore failed, using local presets as fallback:', firestoreError);
      }
      
      // Fall back to local presets if Firestore fails or is empty
      console.log('[usePresetStorage] Using local presets as fallback');
      return localPresets.slice(0, MAX_PRESETS);
    } catch (error) {
      console.error('[usePresetStorage] Error loading presets:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [user, getPresetsFromLocal, loadPresetsFromFirestore]);

  // Helper to get presets from local storage only
  const getPresetsFromLocal = useCallback(async (): Promise<DosePreset[]> => {
    try {
      const storageKey = `dose_presets_${user?.uid || 'anonymous'}`;
      console.log('[usePresetStorage] Loading from storage key:', storageKey);
      
      const existingPresets = await AsyncStorage.getItem(storageKey);
      console.log('[usePresetStorage] Raw storage data:', existingPresets ? 'found data' : 'no data');
      
      const presetsList: DosePreset[] = existingPresets ? JSON.parse(existingPresets) : [];
      console.log('[usePresetStorage] Parsed', presetsList.length, 'presets from local storage');
      
      return presetsList;
    } catch (error) {
      console.error('[usePresetStorage] Error loading presets from local storage:', error);
      return [];
    }
  }, [user]);

  // Delete a preset by ID
  const deletePreset = useCallback(async (presetId: string) => {
    try {
      // Find the preset to get its Firestore ID
      const localPresets = await getPresetsFromLocal();
      const presetToDelete = localPresets.find(preset => preset.id === presetId);
      
      // Delete from Firestore if it has a Firestore ID
      if (presetToDelete?.firestoreId) {
        const firestoreDeleteSuccess = await deletePresetFromFirestore(presetToDelete.firestoreId);
        if (!firestoreDeleteSuccess) {
          console.warn('Failed to delete preset from Firestore, continuing with local delete');
        }
      }
      
      // Delete from local storage
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
  }, [user, getPresetsFromLocal, deletePresetFromFirestore]);

  // Update a preset (for rename functionality)
  const updatePreset = useCallback(async (presetId: string, updates: Partial<DosePreset>) => {
    try {
      // Update in local storage
      const storageKey = `dose_presets_${user?.uid || 'anonymous'}`;
      const existingPresets = await AsyncStorage.getItem(storageKey);
      const presetsList: DosePreset[] = existingPresets ? JSON.parse(existingPresets) : [];
      
      const presetIndex = presetsList.findIndex(preset => preset.id === presetId);
      if (presetIndex === -1) {
        return { success: false, error: 'Preset not found' };
      }
      
      const updatedPreset = { ...presetsList[presetIndex], ...updates };
      presetsList[presetIndex] = updatedPreset;
      
      await AsyncStorage.setItem(storageKey, JSON.stringify(presetsList));
      
      // Update in Firestore if it has a Firestore ID
      if (updatedPreset.firestoreId && !user?.isAnonymous) {
        try {
          const presetDoc = doc(db, 'dose_presets', updatedPreset.firestoreId);
          await updateDoc(presetDoc, updates);
          console.log('Preset updated in Firestore:', presetId);
        } catch (firestoreError) {
          console.warn('Failed to update preset in Firestore:', firestoreError);
          // Continue anyway since local update succeeded
        }
      }
      
      console.log('Preset updated:', presetId);
      return { success: true };
    } catch (error) {
      console.error('Error updating preset:', error);
      return { success: false, error: 'Failed to update preset' };
    }
  }, [user]);

  // Main save function that generates ID and saves to both local and Firestore
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
    console.log('[usePresetStorage] Saving preset:', presetData.name);
    setIsSaving(true);
    
    try {
      // Check local limit first
      const existingLocalPresets = await getPresetsFromLocal();
      if (existingLocalPresets.length >= MAX_PRESETS) {
        console.warn('[usePresetStorage] Preset limit reached:', existingLocalPresets.length);
        return { success: false, error: `Maximum ${MAX_PRESETS} presets allowed. Please delete an existing preset first.` };
      }

      const preset: DosePreset = {
        id: `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: user?.uid,
        timestamp: new Date().toISOString(),
        ...presetData,
      };

      console.log('[usePresetStorage] Created preset with ID:', preset.id);

      // Save to local storage first (primary storage)
      console.log('[usePresetStorage] Saving to local storage...');
      const localResult = await savePresetLocally(preset);
      if (!localResult.success) {
        console.error('[usePresetStorage] Local save failed:', localResult.error);
        return localResult;
      }
      console.log('[usePresetStorage] Local save successful');

      // Try to save to Firestore for authenticated users (but don't fail if it doesn't work)
      if (!user?.isAnonymous) {
        try {
          console.log('[usePresetStorage] Attempting Firestore save...');
          const firestoreId = await savePresetToFirestore(preset);
          if (firestoreId) {
            console.log('[usePresetStorage] Firestore save successful:', firestoreId);
            // Update the local copy with the Firestore ID for future operations
            preset.firestoreId = firestoreId;
            await savePresetLocally(preset); // Re-save with Firestore ID
          } else {
            console.warn('[usePresetStorage] Firestore save returned null, continuing with local save');
          }
        } catch (firestoreError) {
          console.warn('[usePresetStorage] Firestore save failed, continuing with local save:', firestoreError);
        }
      }

      console.log('[usePresetStorage] Preset save completed successfully');
      return { success: true };
    } catch (error) {
      console.error('[usePresetStorage] Error in savePreset:', error);
      return { success: false, error: 'Failed to save preset' };
    } finally {
      setIsSaving(false);
    }
  }, [user, savePresetLocally, savePresetToFirestore, getPresetsFromLocal]);

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