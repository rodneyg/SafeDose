import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useDoseLogging } from './useDoseLogging';
import { useFeedbackStorage } from './useFeedbackStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  PersonalizedRecommendation, 
  RecommendationRequest,
  RecommendationResponse,
  HistoricalDosePattern,
  InjectionSiteRecommendation,
  SideEffectPrediction,
  UserAnalytics,
  GamificationData,
  RecommendationSettings,
  MLModelConfig
} from '../../types/personalizedRecommendations';
import { InjectionSite } from '../../types/doseLog';

// Default settings for new users
const DEFAULT_SETTINGS: RecommendationSettings = {
  userId: '',
  enableAIRecommendations: true,
  includeHealthData: false, // Conservative default
  enableGamification: true,
  shareCommunityTips: false, // User must opt-in
  shareAnonymizedData: false, // User must opt-in
  reminderFrequency: 'none',
  privacyLevel: 'standard'
};

// Simplified ML model for initial implementation
const DEFAULT_MODEL_CONFIG: MLModelConfig = {
  modelName: 'basic_dose_recommender',
  version: '1.0.0',
  inputFeatures: ['historical_average', 'user_age', 'substance_type', 'time_since_last'],
  outputType: 'regression',
  confidenceThreshold: 0.7,
  lastUpdated: new Date().toISOString(),
  performance: {
    validationScore: 0.85 // Mock score for initial implementation
  }
};

export function usePersonalizedRecommendations() {
  const { user } = useAuth();
  const { getDoseLogHistory } = useDoseLogging();
  const { getFeedbackHistory } = useFeedbackStorage();
  
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<RecommendationSettings>(DEFAULT_SETTINGS);
  const [userAnalytics, setUserAnalytics] = useState<UserAnalytics | null>(null);
  const [gamificationData, setGamificationData] = useState<GamificationData | null>(null);
  const [lastRecommendation, setLastRecommendation] = useState<PersonalizedRecommendation | null>(null);

  // Load user settings and analytics on initialization
  useEffect(() => {
    if (user?.uid) {
      loadUserSettings();
      loadUserAnalytics();
      loadGamificationData();
    }
  }, [user?.uid, loadUserSettings, loadUserAnalytics, loadGamificationData]);

  // Load user recommendation settings
  const loadUserSettings = useCallback(async () => {
    try {
      const storageKey = `recommendation_settings_${user?.uid || 'anonymous'}`;
      const settingsData = await AsyncStorage.getItem(storageKey);
      
      if (settingsData) {
        const parsedSettings = JSON.parse(settingsData);
        setSettings({ ...DEFAULT_SETTINGS, ...parsedSettings, userId: user?.uid || '' });
      } else {
        setSettings({ ...DEFAULT_SETTINGS, userId: user?.uid || '' });
      }
    } catch (error) {
      console.error('Error loading recommendation settings:', error);
      setSettings({ ...DEFAULT_SETTINGS, userId: user?.uid || '' });
    }
  }, [user?.uid]);

  // Save user settings
  const saveUserSettings = useCallback(async (newSettings: Partial<RecommendationSettings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      setSettings(updatedSettings);
      
      const storageKey = `recommendation_settings_${user?.uid || 'anonymous'}`;
      await AsyncStorage.setItem(storageKey, JSON.stringify(updatedSettings));
    } catch (error) {
      console.error('Error saving recommendation settings:', error);
    }
  }, [settings, user?.uid]);

  // Analyze historical dose patterns
  const analyzeHistoricalPatterns = useCallback(async (substanceName: string): Promise<HistoricalDosePattern> => {
    try {
      const doseLogs = await getDoseLogHistory();
      const relevantLogs = doseLogs
        .filter(log => log.substanceName.toLowerCase() === substanceName.toLowerCase())
        .slice(0, 20); // Last 20 doses for analysis

      if (relevantLogs.length === 0) {
        return {
          averageDose: 0,
          doseVariability: 0,
          adherenceScore: 0,
          trendDirection: 'stable',
          totalDosesLogged: 0
        };
      }

      const doses = relevantLogs.map(log => log.doseValue).filter(dose => dose > 0);
      const averageDose = doses.reduce((sum, dose) => sum + dose, 0) / doses.length;
      
      // Calculate variability (standard deviation)
      const variance = doses.reduce((sum, dose) => sum + Math.pow(dose - averageDose, 2), 0) / doses.length;
      const doseVariability = Math.sqrt(variance);
      
      // Calculate adherence score (how consistently user logs doses)
      const totalDaysSpan = relevantLogs.length > 1 ? 
        Math.ceil((new Date(relevantLogs[0].timestamp).getTime() - new Date(relevantLogs[relevantLogs.length - 1].timestamp).getTime()) / (1000 * 60 * 60 * 24)) : 1;
      const adherenceScore = Math.min(relevantLogs.length / Math.max(totalDaysSpan, 1), 1);
      
      // Determine trend direction
      let trendDirection: 'increasing' | 'decreasing' | 'stable' = 'stable';
      if (relevantLogs.length >= 3) {
        const recentAvg = relevantLogs.slice(0, 3).reduce((sum, log) => sum + log.doseValue, 0) / 3;
        const olderAvg = relevantLogs.slice(-3).reduce((sum, log) => sum + log.doseValue, 0) / 3;
        const changePercent = (recentAvg - olderAvg) / olderAvg;
        
        if (changePercent > 0.1) trendDirection = 'increasing';
        else if (changePercent < -0.1) trendDirection = 'decreasing';
      }

      return {
        averageDose,
        doseVariability,
        adherenceScore,
        trendDirection,
        lastDoseTimestamp: relevantLogs[0]?.timestamp,
        totalDosesLogged: relevantLogs.length
      };
    } catch (error) {
      console.error('Error analyzing historical patterns:', error);
      return {
        averageDose: 0,
        doseVariability: 0,
        adherenceScore: 0,
        trendDirection: 'stable',
        totalDosesLogged: 0
      };
    }
  }, [getDoseLogHistory]);

  // Analyze injection site rotation
  const analyzeInjectionSiteRotation = useCallback(async (): Promise<InjectionSiteRecommendation | undefined> => {
    try {
      const doseLogs = await getDoseLogHistory();
      const recentLogsWithSites = doseLogs
        .filter(log => log.injectionSite)
        .slice(0, 10); // Last 10 injections

      if (recentLogsWithSites.length === 0) {
        return undefined;
      }

      const siteCounts: Record<InjectionSite, number> = {} as Record<InjectionSite, number>;
      const sitesUsedRecently: InjectionSite[] = [];

      recentLogsWithSites.forEach(log => {
        if (log.injectionSite) {
          siteCounts[log.injectionSite] = (siteCounts[log.injectionSite] || 0) + 1;
          if (!sitesUsedRecently.includes(log.injectionSite)) {
            sitesUsedRecently.push(log.injectionSite);
          }
        }
      });

      // Find the least used site for recommendation
      const allSites: InjectionSite[] = ['abdomen_L', 'abdomen_R', 'thigh_L', 'thigh_R', 'glute_L', 'glute_R', 'arm_L', 'arm_R'];
      const leastUsedSites = allSites.filter(site => !sitesUsedRecently.includes(site));
      const recommendedSite = leastUsedSites.length > 0 ? leastUsedSites[0] : 
        allSites.reduce((min, site) => (siteCounts[site] || 0) < (siteCounts[min] || 0) ? site : min);

      // Calculate rotation score
      const uniqueSites = Object.keys(siteCounts).length;
      const rotationScore = Math.min(uniqueSites / 4, 1); // Good rotation uses at least 4 different sites

      // Check for overuse warning
      let warningMessage: string | undefined;
      const maxUsage = Math.max(...Object.values(siteCounts));
      if (maxUsage > recentLogsWithSites.length * 0.5) {
        const overusedSite = Object.entries(siteCounts).find(([_, count]) => count === maxUsage)?.[0] as InjectionSite;
        warningMessage = `Consider rotating away from ${overusedSite.replace('_', ' ')} - used ${maxUsage} times recently`;
      }

      return {
        recommendedSite,
        sitesUsedRecently,
        rotationScore,
        warningMessage
      };
    } catch (error) {
      console.error('Error analyzing injection site rotation:', error);
      return undefined;
    }
  }, [getDoseLogHistory]);

  // Generate basic side effect prediction
  const predictSideEffects = useCallback(async (substanceName: string, proposedDose: number): Promise<SideEffectPrediction> => {
    try {
      const feedbackHistory = await getFeedbackHistory();
      const recentFeedback = feedbackHistory.filter(fb => 
        fb.doseInfo.substanceName.toLowerCase() === substanceName.toLowerCase()
      ).slice(0, 10);

      const negativeReactions = recentFeedback.filter(fb => fb.feedbackType === 'mild_side_effects' || fb.feedbackType === 'something_wrong');
      const riskLevel = negativeReactions.length > recentFeedback.length * 0.3 ? 'high' : 
                      negativeReactions.length > recentFeedback.length * 0.1 ? 'moderate' : 'low';

      // Basic risk assessment based on substance type and dose
      const specificRisks = [];
      if (substanceName.toLowerCase().includes('insulin')) {
        specificRisks.push({
          type: 'hypoglycemia' as const,
          probability: proposedDose > 20 ? 0.3 : 0.1,
          description: 'Risk of low blood sugar, especially with higher doses'
        });
      }

      return {
        overallRisk: riskLevel,
        specificRisks,
        riskFactors: negativeReactions.length > 0 ? ['Previous negative reactions reported'] : []
      };
    } catch (error) {
      console.error('Error predicting side effects:', error);
      return {
        overallRisk: 'low',
        specificRisks: [],
        riskFactors: []
      };
    }
  }, [getFeedbackHistory]);

  // Generate personalized recommendation
  const generateRecommendation = useCallback(async (request: RecommendationRequest): Promise<RecommendationResponse> => {
    setIsLoading(true);
    
    try {
      if (!settings.enableAIRecommendations) {
        throw new Error('AI recommendations are disabled');
      }

      // Analyze historical patterns
      const historicalPattern = await analyzeHistoricalPatterns(request.currentDoseContext.substanceName);
      
      // Analyze injection site rotation
      const injectionSiteRec = await analyzeInjectionSiteRotation();
      
      // Predict side effects
      const proposedDose = request.currentDoseContext.intendedDose || historicalPattern.averageDose;
      const sideEffectPrediction = await predictSideEffects(request.currentDoseContext.substanceName, proposedDose);

      // Simple recommendation logic (rule-based for initial implementation)
      let suggestedDose = historicalPattern.averageDose || proposedDose;
      let confidence = 0.5; // Start with medium confidence
      let reasoning = 'Based on your dosing history';

      if (historicalPattern.totalDosesLogged > 5) {
        confidence += 0.2;
        reasoning = `Based on your average of ${historicalPattern.totalDosesLogged} previous doses`;
        
        // Adjust for trend
        if (historicalPattern.trendDirection === 'increasing' && historicalPattern.doseVariability < suggestedDose * 0.1) {
          suggestedDose *= 1.05; // Slight increase if trending up consistently
          reasoning += ', with slight upward adjustment for recent trend';
        } else if (historicalPattern.trendDirection === 'decreasing' && historicalPattern.doseVariability < suggestedDose * 0.1) {
          suggestedDose *= 0.95; // Slight decrease if trending down consistently
          reasoning += ', with slight downward adjustment for recent trend';
        }
      } else {
        reasoning = 'Conservative estimate - consider consulting healthcare provider for new medication';
        confidence = 0.3;
      }

      // Adjust confidence based on variability
      if (historicalPattern.doseVariability < suggestedDose * 0.1) {
        confidence += 0.2; // More confident if doses are consistent
      } else if (historicalPattern.doseVariability > suggestedDose * 0.3) {
        confidence -= 0.2; // Less confident if doses vary widely
      }

      confidence = Math.max(0.1, Math.min(0.9, confidence)); // Clamp between 0.1 and 0.9

      const recommendation: PersonalizedRecommendation = {
        id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: user?.uid || 'anonymous',
        timestamp: new Date().toISOString(),
        suggestedDose: Math.round(suggestedDose * 100) / 100, // Round to 2 decimal places
        suggestedUnit: (request.currentDoseContext.unit as any) || 'mg',
        confidence,
        reasoning,
        substanceName: request.currentDoseContext.substanceName,
        recentDoseHistory: historicalPattern,
        injectionSiteRecommendation: injectionSiteRec,
        sideEffectPrediction,
        modelVersion: DEFAULT_MODEL_CONFIG.version,
        recommendationType: 'rule_based_fallback', // Will be 'ai_generated' when ML is implemented
        disclaimerLevel: sideEffectPrediction.overallRisk === 'high' ? 'critical' : 'standard'
      };

      // Generate disclaimers
      const disclaimers = [
        'This recommendation is generated by AI and should not replace professional medical advice.',
        'Always verify calculations and consult your healthcare provider before making changes.',
      ];

      if (recommendation.disclaimerLevel === 'critical') {
        disclaimers.unshift('⚠️ HIGH RISK: Previous reactions noted - consult healthcare provider immediately.');
      }

      if (confidence < 0.5) {
        disclaimers.push('Low confidence recommendation - consider professional consultation.');
      }

      setLastRecommendation(recommendation);

      return {
        recommendation,
        disclaimers,
        warnings: sideEffectPrediction.riskFactors
      };
    } catch (error) {
      console.error('Error generating recommendation:', error);
      
      // Fallback to rule-based calculation
      const fallbackDose = request.currentDoseContext.intendedDose || 1;
      const fallbackRecommendation: PersonalizedRecommendation = {
        id: `fallback_${Date.now()}`,
        userId: user?.uid || 'anonymous',
        timestamp: new Date().toISOString(),
        suggestedDose: fallbackDose,
        suggestedUnit: (request.currentDoseContext.unit as any) || 'mg',
        confidence: 0.2,
        reasoning: 'Fallback calculation - AI recommendations unavailable',
        substanceName: request.currentDoseContext.substanceName,
        recentDoseHistory: {
          averageDose: fallbackDose,
          doseVariability: 0,
          adherenceScore: 0,
          trendDirection: 'stable',
          totalDosesLogged: 0
        },
        modelVersion: 'fallback',
        recommendationType: 'rule_based_fallback',
        disclaimerLevel: 'critical'
      };

      return {
        recommendation: fallbackRecommendation,
        disclaimers: [
          '⚠️ AI recommendations temporarily unavailable - using basic calculation.',
          'Please verify this calculation independently and consult your healthcare provider.'
        ],
        warnings: ['Recommendation system error - use with extreme caution.']
      };
    } finally {
      setIsLoading(false);
    }
  }, [settings.enableAIRecommendations, analyzeHistoricalPatterns, analyzeInjectionSiteRotation, predictSideEffects, user?.uid]);

  // Load user analytics (placeholder for future implementation)
  const loadUserAnalytics = useCallback(async () => {
    // This will be implemented with actual analytics collection
    const mockAnalytics: UserAnalytics = {
      userId: user?.uid || 'anonymous',
      profileCompleteness: 0.7,
      engagementScore: 0.6,
      streakDays: 5,
      totalBadgesEarned: 2,
      feedbackQuality: 0.8,
      premiumUser: false,
      averageSessionDuration: 3.5,
      featuresUsed: ['dose_calculator', 'dose_logging']
    };
    setUserAnalytics(mockAnalytics);
  }, [user?.uid]);

  // Load gamification data (placeholder for future implementation)
  const loadGamificationData = useCallback(async () => {
    const mockGamification: GamificationData = {
      currentStreak: 5,
      longestStreak: 12,
      badges: [
        {
          id: 'first_dose',
          name: 'First Steps',
          description: 'Logged your first dose',
          iconName: 'award',
          earnedDate: new Date().toISOString(),
          category: 'consistency'
        }
      ],
      totalPoints: 150,
      level: 2,
      nextReward: {
        id: 'consistency_badge',
        name: '7-Day Streak',
        description: 'Log doses for 7 consecutive days',
        type: 'badge',
        requirement: 'Log doses for 7 days in a row',
        pointValue: 100
      }
    };
    setGamificationData(mockGamification);
  }, []);

  return {
    // State
    isLoading,
    settings,
    userAnalytics,
    gamificationData,
    lastRecommendation,
    
    // Methods
    generateRecommendation,
    saveUserSettings,
    loadUserSettings,
    
    // Analysis methods (exposed for testing/debugging)
    analyzeHistoricalPatterns,
    analyzeInjectionSiteRotation,
    predictSideEffects,
  };
}