import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Camera, Syringe, FlaskRound as Flask, ArrowRight, ChevronRight, Check, Award, ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import Animated, { FadeIn, FadeInRight } from 'react-native-reanimated';

const ACHIEVEMENTS = [
  { id: 1, title: 'First Steps', description: 'Complete your first guided dose preparation', icon: Award },
  { id: 2, title: 'Precision Master', description: 'Achieve perfect measurement accuracy', icon: Check },
  { id: 3, title: 'Safety First', description: 'Follow all safety protocols correctly', icon: ShieldCheck },
];

export default function NewDoseScreen() {
  const [step, setStep] = useState<'intro' | 'scan' | 'guide' | 'success'>('intro');
  const [score, setScore] = useState(0);
  const [achievements, setAchievements] = useState<number[]>([]);

  const handleSuccess = () => {
    setScore(prev => prev + 100);
    if (!achievements.includes(1)) {
      setAchievements([...achievements, 1]);
    }
    setStep('success');
  };

  const renderIntro = () => (
    <View style={styles.contentContainer}>
      <View style={styles.scoreContainer}>
        <Text style={styles.scoreLabel}>Safety Score</Text>
        <Text style={styles.scoreValue}>{score}</Text>
        {achievements.length > 0 && (
          <View style={styles.achievementBadge}>
            <Award size={16} color="#FFD700" />
            <Text style={styles.achievementCount}>{achievements.length}</Text>
          </View>
        )}
      </View>

      <View style={styles.cardsContainer}>
        <TouchableOpacity 
          style={styles.optionCard}
          onPress={() => setStep('scan')}
        >
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=800' }}
            style={styles.cardImage}
          />
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Prepare Medication</Text>
            <Text style={styles.cardDescription}>Master the art of precise dose preparation</Text>
            <View style={styles.cardAction}>
              <Text style={styles.cardActionText}>Start Challenge</Text>
              <ArrowRight size={20} color="#007AFF" />
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.optionCard}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&q=80&w=800' }}
            style={styles.cardImage}
          />
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Advanced Techniques</Text>
            <Text style={styles.cardDescription}>Unlock new skills and achievements</Text>
            <View style={styles.cardAction}>
              <Text style={styles.cardActionText}>Coming Soon</Text>
              <ChevronRight size={20} color="#8E8E93" />
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {achievements.length > 0 && (
        <View style={styles.achievementsContainer}>
          <Text style={styles.achievementsTitle}>Your Achievements</Text>
          {ACHIEVEMENTS.filter(a => achievements.includes(a.id)).map(achievement => (
            <View key={achievement.id} style={styles.achievementItem}>
              <achievement.icon size={24} color="#FFD700" />
              <View style={styles.achievementContent}>
                <Text style={styles.achievementTitle}>{achievement.title}</Text>
                <Text style={styles.achievementDescription}>{achievement.description}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderScan = () => (
    <View style={styles.scanContainer}>
      <View style={styles.cameraPreview}>
        <View style={styles.scanOverlay}>
          <View style={styles.scanArea}>
            <Camera size={48} color="#FFFFFF" />
            <Text style={styles.scanText}>Position your medication and syringe in frame</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.instructions}>
        <View style={styles.progressBar}>
          <Animated.View 
            entering={FadeInRight.duration(1000)}
            style={[styles.progressFill, { width: '33%' }]} 
          />
        </View>
        
        <View style={styles.instructionStep}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>1</Text>
          </View>
          <Syringe size={24} color="#007AFF" />
          <Text style={styles.instructionText}>Place your syringe on a clean surface</Text>
          <TouchableOpacity 
            style={styles.checkButton}
            onPress={() => handleSuccess()}
          >
            <Check size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => setStep('intro')}
      >
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSuccess = () => (
    <Animated.View 
      entering={FadeIn.duration(500)}
      style={styles.successContainer}
    >
      <View style={styles.successContent}>
        <View style={styles.trophyContainer}>
          <Award size={64} color="#FFD700" />
        </View>
        <Text style={styles.congratsTitle}>Excellent Work!</Text>
        <Text style={styles.congratsText}>You've mastered the basics of dose preparation</Text>
        
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>100</Text>
            <Text style={styles.statLabel}>Points Earned</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>1</Text>
            <Text style={styles.statLabel}>Achievement</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.continueButton}
          onPress={() => setStep('intro')}
        >
          <Text style={styles.continueButtonText}>Continue Learning</Text>
          <ArrowRight size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>New Dose</Text>
        <Text style={styles.subtitle}>
          {step === 'intro' 
            ? "Master the art of medication preparation"
            : step === 'success'
            ? "Achievement Unlocked!"
            : "Follow the guide to earn points"}
        </Text>
      </View>

      {step === 'intro' && renderIntro()}
      {step === 'scan' && renderScan()}
      {step === 'success' && renderSuccess()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: '#000000',
  },
  subtitle: {
    fontSize: 17,
    color: '#6B6B6B',
    marginTop: 4,
  },
  contentContainer: {
    flex: 1,
    padding: 16,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  scoreLabel: {
    fontSize: 17,
    color: '#6B6B6B',
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 8,
  },
  achievementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    padding: 8,
    borderRadius: 20,
    marginLeft: 'auto',
  },
  achievementCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFB100',
    marginLeft: 4,
  },
  cardsContainer: {
    gap: 16,
  },
  optionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  cardImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  cardContent: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 15,
    color: '#6B6B6B',
    marginBottom: 16,
  },
  cardAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardActionText: {
    fontSize: 17,
    fontWeight: '500',
    color: '#007AFF',
    marginRight: 4,
  },
  achievementsContainer: {
    marginTop: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  achievementsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#FFF9E6',
    padding: 12,
    borderRadius: 12,
  },
  achievementContent: {
    marginLeft: 12,
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  achievementDescription: {
    fontSize: 14,
    color: '#6B6B6B',
    marginTop: 2,
  },
  scanContainer: {
    flex: 1,
  },
  cameraPreview: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scanOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 280,
    height: 280,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  scanText: {
    color: '#FFFFFF',
    fontSize: 17,
    textAlign: 'center',
    marginTop: 16,
  },
  instructions: {
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  instructionStep: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  instructionText: {
    flex: 1,
    fontSize: 15,
    color: '#000000',
    marginLeft: 12,
  },
  checkButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  backButtonText: {
    fontSize: 17,
    fontWeight: '500',
    color: '#007AFF',
    textAlign: 'center',
  },
  successContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  successContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  trophyContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFF9E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  congratsTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
  },
  congratsText: {
    fontSize: 17,
    color: '#6B6B6B',
    textAlign: 'center',
    marginBottom: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 32,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 15,
    color: '#6B6B6B',
    marginTop: 4,
  },
  continueButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});