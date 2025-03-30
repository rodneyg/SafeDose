import { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, useWindowDimensions, TouchableOpacity, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInRight } from 'react-native-reanimated';
import { Camera, History, MessageCircle, Book, ArrowRight, Check } from 'lucide-react-native';

const features = [
  {
    icon: Camera,
    title: 'Smart Dose Recognition',
    description: 'Our AI-powered camera helps you measure and verify medication doses with precision.',
  },
  {
    icon: History,
    title: 'Medication Tracking',
    description: 'Keep a detailed log of your medication schedule and history.',
  },
  {
    icon: MessageCircle,
    title: 'Expert Guidance',
    description: 'Get real-time answers about your medication from our AI assistant.',
  },
  {
    icon: Book,
    title: 'Educational Resources',
    description: 'Access comprehensive guides and information about your medication.',
  },
];

export default function Features() {
  const { width } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const router = useRouter();

  const handleNext = useCallback(() => {
    if (currentIndex < features.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
      setCurrentIndex(currentIndex + 1);
    } else {
      router.push('/(tabs)');
    }
  }, [currentIndex, router]);

  const renderFeature = useCallback(({ item, index }) => {
    const Icon = item.icon;
    return (
      <Animated.View 
        entering={FadeInRight.delay(index * 100).duration(500)}
        style={[styles.slide, { width }]}
      >
        <View style={styles.featureIcon}>
          <Icon size={32} color="#007AFF" />
        </View>
        <Text style={styles.featureTitle}>{item.title}</Text>
        <Text style={styles.featureDescription}>{item.description}</Text>
      </Animated.View>
    );
  }, [width]);

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeIn} style={styles.header}>
        <Text style={styles.headerTitle}>Key Features</Text>
        <Text style={styles.headerSubtitle}>
          Discover what SafeDose can do for you
        </Text>
      </Animated.View>

      <FlatList
        ref={flatListRef}
        data={features}
        renderItem={renderFeature}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(newIndex);
        }}
      />

      <View style={styles.pagination}>
        {features.map((_, index) => (
          <View
            key={index}
            style={[
              styles.paginationDot,
              index === currentIndex && styles.paginationDotActive,
            ]}
          />
        ))}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.button} onPress={handleNext}>
          <Text style={styles.buttonText}>
            {currentIndex === features.length - 1 ? 'Get Started' : 'Next'}
          </Text>
          {currentIndex === features.length - 1 ? (
            <Check size={20} color="#FFFFFF" />
          ) : (
            <ArrowRight size={20} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    padding: 24,
    paddingTop: 60,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 17,
    color: '#6B6B6B',
    marginTop: 8,
    textAlign: 'center',
  },
  slide: {
    padding: 24,
    alignItems: 'center',
  },
  featureIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  featureTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 12,
  },
  featureDescription: {
    fontSize: 17,
    color: '#6B6B6B',
    textAlign: 'center',
    maxWidth: '80%',
    lineHeight: 24,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 32,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E5EA',
  },
  paginationDotActive: {
    backgroundColor: '#007AFF',
    width: 24,
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});