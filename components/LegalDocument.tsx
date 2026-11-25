import { Link } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SeoHead from './SeoHead';

type LegalDocumentProps = {
  title: string;
  path: string;
  sections: readonly { title: string; body: string }[];
};

export default function LegalDocument({ title, path, sections }: LegalDocumentProps) {
  return (
    <SafeAreaView style={styles.screen}>
      <SeoHead path={path} title={`${title}`} description={`${title}. Effective November 18, 2026.`} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.document}>
          <Link href="/pricing" style={styles.link}>Back to pricing</Link>
          <Text accessibilityRole="header" style={styles.title}>{title}</Text>
          <Text style={styles.notice}>Effective November 18, 2026</Text>
          {sections.map((section) => (
            <View key={section.title} style={styles.section}>
              <Text accessibilityRole="header" style={styles.heading}>{section.title}</Text>
              <Text style={styles.body}>{section.body}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { paddingHorizontal: 24, paddingVertical: 32 },
  document: { width: '100%', maxWidth: 720, alignSelf: 'center' },
  link: { color: '#1d4ed8', alignSelf: 'flex-start', marginBottom: 24 },
  title: { fontSize: 32, fontWeight: '700', color: '#111827' },
  notice: { fontSize: 16, color: '#4b5563', marginTop: 8 },
  section: { marginTop: 24 },
  heading: { fontSize: 20, fontWeight: '600', color: '#111827', marginBottom: 8 },
  body: { fontSize: 16, lineHeight: 24, color: '#1f2937' },
});
