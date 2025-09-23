import { InjectionSite } from './doseLog';

// Core recommendation types
export interface PersonalizedRecommendation {
  id: string;
  userId: string;
  timestamp: string;
  
  // Recommendation content
  suggestedDose: number;
  suggestedUnit: 'mg' | 'mcg' | 'units' | 'mL';
  confidence: number; // 0-1, how confident the AI is in this recommendation
  reasoning: string; // Human-readable explanation of why this dose was recommended
  
  // Related to user's current context
  substanceName: string;
  userAge?: number;
  userWeight?: number;
  
  // Historical analysis factors
  recentDoseHistory: HistoricalDosePattern;
  injectionSiteRecommendation?: InjectionSiteRecommendation;
  sideEffectPrediction?: SideEffectPrediction;
  
  // External data factors (optional)
  healthMetrics?: HealthMetrics;
  
  // Recommendation metadata
  modelVersion: string;
  recommendationType: 'ai_generated' | 'rule_based_fallback';
  disclaimerLevel: 'standard' | 'enhanced' | 'critical';
}

// Historical dose analysis
export interface HistoricalDosePattern {
  averageDose: number;
  doseVariability: number; // Standard deviation of recent doses
  adherenceScore: number; // 0-1, how consistent user is with logging
  trendDirection: 'increasing' | 'decreasing' | 'stable';
  lastDoseTimestamp?: string;
  totalDosesLogged: number;
}

// Injection site rotation recommendations
export interface InjectionSiteRecommendation {
  recommendedSite: InjectionSite;
  sitesUsedRecently: InjectionSite[];
  rotationScore: number; // 0-1, how well user is rotating sites
  warningMessage?: string; // If user is overusing one site
}

// Side effect risk prediction
export interface SideEffectPrediction {
  overallRisk: 'low' | 'moderate' | 'high';
  specificRisks: {
    type: 'hypoglycemia' | 'injection_site_reaction' | 'allergic_reaction' | 'other';
    probability: number; // 0-1
    description: string;
  }[];
  riskFactors: string[]; // List of factors contributing to risk
}

// Health metrics from wearables/external APIs
export interface HealthMetrics {
  heartRate?: number;
  bloodGlucose?: number;
  activityLevel?: 'low' | 'moderate' | 'high';
  sleepQuality?: 'poor' | 'fair' | 'good';
  stressLevel?: number; // 0-10 scale
  timestamp: string;
  source: 'apple_health' | 'google_fit' | 'manual_entry';
}

// User analytics and engagement data
export interface UserAnalytics {
  userId: string;
  profileCompleteness: number; // 0-1, how complete their profile is
  engagementScore: number; // 0-1, how actively they use the app
  streakDays: number; // Current streak of consistent logging
  totalBadgesEarned: number;
  feedbackQuality: number; // 0-1, how useful their feedback has been
  premiumUser: boolean;
  
  // Learning patterns
  preferredDoseTime?: 'morning' | 'afternoon' | 'evening';
  averageSessionDuration: number; // in minutes
  featuresUsed: string[]; // List of app features they use regularly
}

// Gamification elements
export interface GamificationData {
  currentStreak: number;
  longestStreak: number;
  badges: Badge[];
  totalPoints: number;
  level: number;
  nextReward?: Reward;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  iconName: string;
  earnedDate: string;
  category: 'consistency' | 'safety' | 'community' | 'learning';
}

export interface Reward {
  id: string;
  name: string;
  description: string;
  type: 'badge' | 'premium_content' | 'feature_unlock';
  requirement: string; // Description of what's needed to earn it
  pointValue: number;
}

// Community features
export interface CommunityTip {
  id: string;
  authorId: string; // Anonymous hash
  content: string;
  category: 'storage' | 'injection_technique' | 'safety' | 'general';
  upvotes: number;
  sentiment: 'positive' | 'neutral' | 'negative'; // AI sentiment analysis
  verified: boolean; // Has been reviewed by medical professionals
  timestamp: string;
  tags: string[];
}

// Recommendation request/response types
export interface RecommendationRequest {
  userId: string;
  currentDoseContext: {
    substanceName: string;
    intendedDose?: number;
    unit?: string;
    injectionSite?: InjectionSite;
  };
  includeHealthMetrics?: boolean;
  includeCommunityTips?: boolean;
}

export interface RecommendationResponse {
  recommendation: PersonalizedRecommendation;
  communityTips?: CommunityTip[];
  gamificationUpdate?: GamificationData;
  warnings?: string[];
  disclaimers: string[];
}

// ML Model types
export interface MLModelConfig {
  modelName: string;
  version: string;
  inputFeatures: string[];
  outputType: 'regression' | 'classification';
  confidenceThreshold: number;
  lastUpdated: string;
  performance: {
    accuracy?: number;
    mse?: number; // Mean squared error for regression
    validationScore: number;
  };
}

// Settings and preferences
export interface RecommendationSettings {
  userId: string;
  enableAIRecommendations: boolean;
  includeHealthData: boolean;
  enableGamification: boolean;
  shareCommunityTips: boolean;
  shareAnonymizedData: boolean; // For improving global models
  reminderFrequency: 'none' | 'daily' | 'weekly';
  privacyLevel: 'minimal' | 'standard' | 'enhanced';
}