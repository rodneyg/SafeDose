import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

export default function LearnScreen() {
  const articles = [
    {
      title: 'Understanding TRT Dosages',
      description: 'Learn about common TRT dosages and administration methods.',
    },
    {
      title: 'Safe Injection Techniques',
      description: 'Step-by-step guide for safe and proper injection methods.',
    },
    {
      title: 'Monitoring Your Progress',
      description: 'How to track and assess your TRT journey effectively.',
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Learn</Text>
        <Text style={styles.subtitle}>Educational resources and guides</Text>
      </View>

      <ScrollView style={styles.articlesList}>
        {articles.map((article, index) => (
          <TouchableOpacity key={index} style={styles.articleCard}>
            <View style={styles.articleContent}>
              <Text style={styles.articleTitle}>{article.title}</Text>
              <Text style={styles.articleDescription}>{article.description}</Text>
            </View>
            <ChevronRight size={24} color="#8E8E93" />
          </TouchableOpacity>
        ))}
      </ScrollView>
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
  articlesList: {
    flex: 1,
    padding: 16,
  },
  articleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  articleContent: {
    flex: 1,
    marginRight: 16,
  },
  articleTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  articleDescription: {
    fontSize: 15,
    color: '#6B6B6B',
  },
});