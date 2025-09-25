import { useState, useCallback } from 'react';
import { getFirestore, collection } from 'firebase/firestore';
import { addDocWithEnv } from '../firestoreWithEnv';
import { useAuth } from '../../contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logAnalyticsEvent, ANALYTICS_EVENTS } from '../analytics';
import * as FileSystem from 'expo-file-system';

interface EvaluationDataPoint {
  id: string;
  userId: string | null;
  timestamp: number;
  sessionId: string;
  
  // Input data
  image?: {
    uri: string;
    base64?: string;
    mimeType: string;
    size?: number;
  };
  prompt: string;
  userIntent: 'scan' | 'manual_entry';
  
  // Context data
  inputParameters: {
    doseValue?: number;
    unit?: string;
    substanceName?: string;
    concentration?: number;
    concentrationUnit?: string;
    syringeType?: string;
    syringeVolume?: string;
  };
  
  // Output/Result data
  result: {
    calculatedVolume?: number | null;
    recommendedMarking?: string | null;
    calculationError?: string | null;
    scanResult?: any; // AI scan results
    success: boolean;
  };
  
  // Metadata for evaluation use
  evaluationMetadata: {
    captureReason: 'user_interaction' | 'evaluation_run' | 'manual_addition';
    qualityScore?: number; // 0-1 score for data quality
    verified?: boolean; // Whether result was verified by user
    corrected?: boolean; // Whether user corrected the result
    feedbackProvided?: boolean;
  };
}

export function useEvaluationDataCapture() {
  const { user } = useAuth();
  const db = getFirestore();
  const [isCapturing, setIsCapturing] = useState(false);

  // Generate unique session ID for grouping related interactions
  const generateSessionId = useCallback(() => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Save evaluation data point locally
  const saveEvaluationDataLocally = useCallback(async (dataPoint: EvaluationDataPoint) => {
    try {
      const storageKey = `evaluation_data_${user?.uid || 'anonymous'}`;
      console.log('[useEvaluationDataCapture] Saving evaluation data locally');
      
      const existingData = await AsyncStorage.getItem(storageKey);
      const dataList: EvaluationDataPoint[] = existingData ? JSON.parse(existingData) : [];
      
      dataList.unshift(dataPoint); // Add to beginning for recent-first order
      
      // Keep only the last 500 data points to prevent storage bloat
      // but maintain enough for meaningful evaluation dataset
      if (dataList.length > 500) {
        dataList.splice(500);
      }
      
      await AsyncStorage.setItem(storageKey, JSON.stringify(dataList));
      console.log('[useEvaluationDataCapture] Evaluation data saved locally:', dataPoint.id);
      
      return true;
    } catch (error) {
      console.error('[useEvaluationDataCapture] Error saving evaluation data locally:', error);
      return false;
    }
  }, [user]);

  // Save evaluation data to Firestore (for authenticated users)
  const saveEvaluationDataToFirestore = useCallback(async (dataPoint: EvaluationDataPoint): Promise<string | null> => {
    if (!user || user.isAnonymous) {
      console.log('[useEvaluationDataCapture] Skipping Firestore save for anonymous user');
      return null;
    }

    try {
      const evaluationDataCollection = collection(db, 'evaluation_data');
      
      // Don't save sensitive image data to Firestore for privacy
      const firestoreData = {
        ...dataPoint,
        image: dataPoint.image ? {
          hasImage: true,
          mimeType: dataPoint.image.mimeType,
          size: dataPoint.image.size
        } : undefined
      };
      
      const docRef = await addDocWithEnv(evaluationDataCollection, firestoreData);
      console.log('[useEvaluationDataCapture] Evaluation data saved to Firestore:', dataPoint.id);
      return docRef.id;
    } catch (error) {
      console.error('[useEvaluationDataCapture] Error saving evaluation data to Firestore:', error);
      return null;
    }
  }, [user, db]);

  // Main function to capture user interaction data
  const captureUserInteraction = useCallback(async ({
    image,
    prompt,
    userIntent,
    inputParameters,
    result,
    sessionId,
    verified = false,
    corrected = false,
    feedbackProvided = false
  }: {
    image?: { uri: string; base64?: string; mimeType: string; size?: number };
    prompt: string;
    userIntent: 'scan' | 'manual_entry';
    inputParameters: any;
    result: any;
    sessionId?: string;
    verified?: boolean;
    corrected?: boolean;
    feedbackProvided?: boolean;
  }) => {
    if (isCapturing) {
      console.log('[useEvaluationDataCapture] Already capturing, skipping duplicate');
      return null;
    }

    setIsCapturing(true);
    
    try {
      const dataPoint: EvaluationDataPoint = {
        id: `eval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: user?.uid || null,
        timestamp: Date.now(),
        sessionId: sessionId || generateSessionId(),
        
        image,
        prompt,
        userIntent,
        inputParameters,
        result: {
          ...result,
          success: !result.calculationError && !result.scanError
        },
        
        evaluationMetadata: {
          captureReason: 'user_interaction',
          qualityScore: calculateQualityScore(inputParameters, result, image),
          verified,
          corrected,
          feedbackProvided
        }
      };

      // Save locally first (always works)
      const localSaved = await saveEvaluationDataLocally(dataPoint);
      
      // Try to save to Firestore if user is authenticated
      const firestoreId = await saveEvaluationDataToFirestore(dataPoint);
      
      // Log analytics event
      logAnalyticsEvent(ANALYTICS_EVENTS.EVALUATION_DATA_CAPTURED || 'evaluation_data_captured', {
        user_intent: userIntent,
        has_image: !!image,
        result_success: dataPoint.result.success,
        quality_score: dataPoint.evaluationMetadata.qualityScore,
        local_saved: localSaved,
        firestore_saved: !!firestoreId
      });

      console.log('[useEvaluationDataCapture] Successfully captured user interaction:', dataPoint.id);
      return dataPoint.id;
      
    } catch (error) {
      console.error('[useEvaluationDataCapture] Error capturing user interaction:', error);
      return null;
    } finally {
      setIsCapturing(false);
    }
  }, [user, isCapturing, saveEvaluationDataLocally, saveEvaluationDataToFirestore, generateSessionId]);

  // Calculate quality score for data point (0-1)
  const calculateQualityScore = useCallback((inputParameters: any, result: any, image?: any): number => {
    let score = 0.5; // Base score
    
    // Increase score for complete input data
    if (inputParameters.doseValue && inputParameters.substanceName) score += 0.2;
    if (inputParameters.concentration && inputParameters.concentrationUnit) score += 0.1;
    if (inputParameters.syringeType && inputParameters.syringeVolume) score += 0.1;
    
    // Increase score for successful results
    if (result.success && result.calculatedVolume) score += 0.2;
    if (result.recommendedMarking) score += 0.1;
    
    // Decrease score for errors or missing data
    if (result.calculationError || result.scanError) score -= 0.2;
    if (!inputParameters.substanceName) score -= 0.1;
    
    // Bonus for having image data (useful for AI training)
    if (image && image.uri) score += 0.1;
    
    return Math.max(0, Math.min(1, score)); // Clamp between 0 and 1
  }, []);

  // Export evaluation data for fine-tuning (admin function)
  const exportEvaluationData = useCallback(async (minQualityScore: number = 0.6) => {
    try {
      const storageKey = `evaluation_data_${user?.uid || 'anonymous'}`;
      const data = await AsyncStorage.getItem(storageKey);
      
      if (!data) {
        console.log('[useEvaluationDataCapture] No evaluation data found for export');
        return null;
      }
      
      const dataList: EvaluationDataPoint[] = JSON.parse(data);
      
      // Filter by quality score and convert to evaluation format
      const highQualityData = dataList
        .filter(point => point.evaluationMetadata.qualityScore >= minQualityScore)
        .map(point => ({
          id: point.id,
          category: point.userIntent === 'scan' ? 'ai_scanning' : 'dose_calculation',
          description: `User interaction: ${point.prompt}`,
          image: point.image?.uri || null,
          prompt: point.prompt,
          expected_output: {
            calculatedVolume: point.result.calculatedVolume,
            recommendedMarking: point.result.recommendedMarking,
            calculationError: point.result.calculationError,
            scanResult: point.result.scanResult
          },
          metadata: {
            timestamp: point.timestamp,
            quality_score: point.evaluationMetadata.qualityScore,
            verified: point.evaluationMetadata.verified,
            corrected: point.evaluationMetadata.corrected
          }
        }));
      
      console.log(`[useEvaluationDataCapture] Exported ${highQualityData.length} high-quality data points`);
      return highQualityData;
      
    } catch (error) {
      console.error('[useEvaluationDataCapture] Error exporting evaluation data:', error);
      return null;
    }
  }, [user]);

  // Get statistics about captured data
  const getDataStatistics = useCallback(async () => {
    try {
      const storageKey = `evaluation_data_${user?.uid || 'anonymous'}`;
      const data = await AsyncStorage.getItem(storageKey);
      
      if (!data) return { total: 0, byIntent: {}, byQuality: {}, recent: 0 };
      
      const dataList: EvaluationDataPoint[] = JSON.parse(data);
      const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      
      const stats = {
        total: dataList.length,
        byIntent: {
          scan: dataList.filter(d => d.userIntent === 'scan').length,
          manual_entry: dataList.filter(d => d.userIntent === 'manual_entry').length
        },
        byQuality: {
          high: dataList.filter(d => d.evaluationMetadata.qualityScore >= 0.8).length,
          medium: dataList.filter(d => d.evaluationMetadata.qualityScore >= 0.6).length,
          low: dataList.filter(d => d.evaluationMetadata.qualityScore < 0.6).length
        },
        recent: dataList.filter(d => d.timestamp > weekAgo).length
      };
      
      return stats;
    } catch (error) {
      console.error('[useEvaluationDataCapture] Error getting data statistics:', error);
      return { total: 0, byIntent: {}, byQuality: {}, recent: 0 };
    }
  }, [user]);

  return {
    captureUserInteraction,
    exportEvaluationData,
    getDataStatistics,
    isCapturing,
    generateSessionId
  };
}