import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Brain, TrendingUp, MapPin, AlertTriangle, Award, Target, RefreshCw } from 'lucide-react-native';
import { usePersonalizedRecommendations } from '../lib/hooks/usePersonalizedRecommendations';
import { PersonalizedRecommendation, RecommendationRequest } from '../types/personalizedRecommendations';

interface RecommendationDashboardProps {
  substanceName: string;
  currentDose?: number;
  currentUnit?: string;
  onAcceptRecommendation?: (recommendation: PersonalizedRecommendation) => void;
  onProvideFeedback?: () => void;
  onViewDetails?: (recommendation: PersonalizedRecommendation) => void;
}

const RecommendationDashboard: React.FC<RecommendationDashboardProps> = ({
  substanceName,
  currentDose,
  currentUnit = 'mg',
  onAcceptRecommendation,
  onProvideFeedback,
  onViewDetails
}) => {
  const {
    isLoading,
    settings,
    gamificationData,
    generateRecommendation
  } = usePersonalizedRecommendations();

  const [recommendation, setRecommendation] = useState<PersonalizedRecommendation | null>(null);
  const [disclaimers, setDisclaimers] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);

  // Generate recommendation when component mounts or inputs change
  useEffect(() => {
    if (substanceName && settings.enableAIRecommendations) {
      handleGenerateRecommendation();
    }
  }, [substanceName, currentDose, currentUnit, handleGenerateRecommendation, settings.enableAIRecommendations]);

  const handleGenerateRecommendation = useCallback(async () => {
    try {
      const request: RecommendationRequest = {
        userId: settings.userId,
        currentDoseContext: {
          substanceName,
          intendedDose: currentDose,
          unit: currentUnit
        },
        includeHealthMetrics: settings.includeHealthData,
        includeCommunityTips: settings.shareCommunityTips
      };

      const response = await generateRecommendation(request);
      setRecommendation(response.recommendation);
      setDisclaimers(response.disclaimers || []);
      setWarnings(response.warnings || []);
    } catch (error) {
      console.error('Error generating recommendation:', error);
      Alert.alert(
        'Recommendation Error',
        'Unable to generate AI recommendation. Please use manual calculation.',
        [{ text: 'OK' }]
      );
    }
  }, [substanceName, currentDose, currentUnit, settings, generateRecommendation]);

  const handleAcceptRecommendation = useCallback(() => {
    if (recommendation && onAcceptRecommendation) {
      onAcceptRecommendation(recommendation);
    }
  }, [recommendation, onAcceptRecommendation]);

  const handleViewDetails = useCallback(() => {
    if (recommendation && onViewDetails) {
      onViewDetails(recommendation);
    }
  }, [recommendation, onViewDetails]);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.7) return '#10B981'; // Green
    if (confidence >= 0.4) return '#F59E0B'; // Amber
    return '#EF4444'; // Red
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 0.7) return 'High Confidence';
    if (confidence >= 0.4) return 'Medium Confidence';
    return 'Low Confidence';
  };

  if (!settings.enableAIRecommendations) {
    return (
      <View style={styles.disabledContainer}>
        <Brain size={24} color="#9CA3AF" />
        <Text style={styles.disabledText}>AI Recommendations Disabled</Text>
        <Text style={styles.disabledSubtext}>Enable in settings to get personalized suggestions</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <RefreshCw size={24} color="#6366F1" style={styles.spinningIcon} />
        <Text style={styles.loadingText}>Analyzing your data...</Text>
      </View>
    );
  }

  if (!recommendation) {
    return (
      <View style={styles.errorContainer}>
        <AlertTriangle size={24} color="#EF4444" />
        <Text style={styles.errorText}>Unable to generate recommendation</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleGenerateRecommendation}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Main Recommendation Card */}
      <LinearGradient
        colors={['#6366F1', '#8B5CF6']}
        style={styles.recommendationCard}
      >
        <View style={styles.cardHeader}>
          <Brain size={24} color="white" />
          <Text style={styles.cardTitle}>AI Recommendation</Text>
          <View style={[styles.confidenceBadge, { backgroundColor: getConfidenceColor(recommendation.confidence) }]}>
            <Text style={styles.confidenceText}>{Math.round(recommendation.confidence * 100)}%</Text>
          </View>
        </View>

        <View style={styles.recommendationContent}>
          <Text style={styles.suggestedDose}>
            {recommendation.suggestedDose} {recommendation.suggestedUnit}
          </Text>
          <Text style={styles.confidenceLevel}>
            {getConfidenceText(recommendation.confidence)}
          </Text>
          <Text style={styles.reasoning}>
            {recommendation.reasoning}
          </Text>
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.acceptButton} onPress={handleAcceptRecommendation}>
            <Target size={16} color="white" />
            <Text style={styles.acceptButtonText}>Accept Recommendation</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.detailsButton} onPress={handleViewDetails}>
            <Text style={styles.detailsButtonText}>View Details</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Warnings */}
      {warnings.length > 0 && (
        <View style={styles.warningsContainer}>
          <View style={styles.warningHeader}>
            <AlertTriangle size={20} color="#EF4444" />
            <Text style={styles.warningTitle}>Important Warnings</Text>
          </View>
          {warnings.map((warning, index) => (
            <Text key={index} style={styles.warningText}>• {warning}</Text>
          ))}
        </View>
      )}

      {/* Historical Trends */}
      {recommendation.recentDoseHistory && recommendation.recentDoseHistory.totalDosesLogged > 0 && (
        <View style={styles.trendsContainer}>
          <View style={styles.trendsHeader}>
            <TrendingUp size={20} color="#6366F1" />
            <Text style={styles.trendsTitle}>Your Dosing Trends</Text>
          </View>
          <View style={styles.trendsGrid}>
            <View style={styles.trendItem}>
              <Text style={styles.trendLabel}>Average Dose</Text>
              <Text style={styles.trendValue}>
                {recommendation.recentDoseHistory.averageDose.toFixed(1)} {recommendation.suggestedUnit}
              </Text>
            </View>
            <View style={styles.trendItem}>
              <Text style={styles.trendLabel}>Consistency</Text>
              <Text style={styles.trendValue}>
                {Math.round(recommendation.recentDoseHistory.adherenceScore * 100)}%
              </Text>
            </View>
            <View style={styles.trendItem}>
              <Text style={styles.trendLabel}>Trend</Text>
              <Text style={[styles.trendValue, { 
                color: recommendation.recentDoseHistory.trendDirection === 'increasing' ? '#10B981' : 
                       recommendation.recentDoseHistory.trendDirection === 'decreasing' ? '#EF4444' : '#6B7280'
              }]}>
                {recommendation.recentDoseHistory.trendDirection}
              </Text>
            </View>
            <View style={styles.trendItem}>
              <Text style={styles.trendLabel}>Total Logged</Text>
              <Text style={styles.trendValue}>
                {recommendation.recentDoseHistory.totalDosesLogged}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Injection Site Recommendation */}
      {recommendation.injectionSiteRecommendation && (
        <View style={styles.injectionSiteContainer}>
          <View style={styles.injectionSiteHeader}>
            <MapPin size={20} color="#10B981" />
            <Text style={styles.injectionSiteTitle}>Injection Site Rotation</Text>
          </View>
          <Text style={styles.injectionSiteRecommendation}>
            Recommended: {recommendation.injectionSiteRecommendation.recommendedSite.replace('_', ' ').toUpperCase()}
          </Text>
          <Text style={styles.rotationScore}>
            Rotation Score: {Math.round(recommendation.injectionSiteRecommendation.rotationScore * 100)}%
          </Text>
          {recommendation.injectionSiteRecommendation.warningMessage && (
            <Text style={styles.injectionSiteWarning}>
              ⚠️ {recommendation.injectionSiteRecommendation.warningMessage}
            </Text>
          )}
        </View>
      )}

      {/* Gamification */}
      {gamificationData && settings.enableGamification && (
        <View style={styles.gamificationContainer}>
          <View style={styles.gamificationHeader}>
            <Award size={20} color="#F59E0B" />
            <Text style={styles.gamificationTitle}>Your Progress</Text>
          </View>
          <View style={styles.gamificationGrid}>
            <View style={styles.gamificationItem}>
              <Text style={styles.gamificationLabel}>Current Streak</Text>
              <Text style={styles.gamificationValue}>{gamificationData.currentStreak} days</Text>
            </View>
            <View style={styles.gamificationItem}>
              <Text style={styles.gamificationLabel}>Level</Text>
              <Text style={styles.gamificationValue}>{gamificationData.level}</Text>
            </View>
            <View style={styles.gamificationItem}>
              <Text style={styles.gamificationLabel}>Points</Text>
              <Text style={styles.gamificationValue}>{gamificationData.totalPoints}</Text>
            </View>
            <View style={styles.gamificationItem}>
              <Text style={styles.gamificationLabel}>Badges</Text>
              <Text style={styles.gamificationValue}>{gamificationData.badges.length}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Disclaimers */}
      <View style={styles.disclaimersContainer}>
        <Text style={styles.disclaimersTitle}>Important Disclaimers</Text>
        {disclaimers.map((disclaimer, index) => (
          <Text key={index} style={styles.disclaimerText}>• {disclaimer}</Text>
        ))}
      </View>

      {/* Feedback Action */}
      {onProvideFeedback && (
        <TouchableOpacity style={styles.feedbackButton} onPress={onProvideFeedback}>
          <Text style={styles.feedbackButtonText}>Provide Feedback on This Recommendation</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F9FAFB',
  },
  
  // Disabled state
  disabledContainer: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    margin: 16,
  },
  disabledText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 8,
  },
  disabledSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
  },

  // Loading state
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    margin: 16,
  },
  spinningIcon: {
    transform: [{ rotate: '45deg' }], // Simple rotation effect
  },
  loadingText: {
    fontSize: 16,
    color: '#6366F1',
    marginTop: 8,
    fontWeight: '500',
  },

  // Error state
  errorContainer: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    margin: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
    marginTop: 8,
    fontWeight: '500',
  },
  retryButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#EF4444',
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
  },

  // Main recommendation card
  recommendationCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    marginLeft: 8,
    flex: 1,
  },
  confidenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  recommendationContent: {
    marginBottom: 20,
  },
  suggestedDose: {
    fontSize: 32,
    fontWeight: '800',
    color: 'white',
    textAlign: 'center',
  },
  confidenceLevel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginTop: 4,
  },
  reasoning: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  acceptButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  detailsButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  detailsButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 14,
  },

  // Warnings
  warningsContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
    marginLeft: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#7F1D1D',
    lineHeight: 20,
  },

  // Trends
  trendsContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  trendsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  trendsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  trendsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  trendItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
  },
  trendLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  trendValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },

  // Injection site
  injectionSiteContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  injectionSiteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  injectionSiteTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  injectionSiteRecommendation: {
    fontSize: 18,
    fontWeight: '600',
    color: '#10B981',
    marginBottom: 4,
  },
  rotationScore: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  injectionSiteWarning: {
    fontSize: 14,
    color: '#DC2626',
    fontStyle: 'italic',
  },

  // Gamification
  gamificationContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  gamificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  gamificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  gamificationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gamificationItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
  },
  gamificationLabel: {
    fontSize: 12,
    color: '#92400E',
    marginBottom: 4,
  },
  gamificationValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#B45309',
  },

  // Disclaimers
  disclaimersContainer: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  disclaimersTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  disclaimerText: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
    marginBottom: 4,
  },

  // Feedback button
  feedbackButton: {
    backgroundColor: '#6366F1',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 32,
  },
  feedbackButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default RecommendationDashboard;