import type { ReactNode } from 'react';
import { Link, type Href } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type HelpPageProps = {
  title: string;
  backHref: Href;
  backLabel: string;
  description: string;
  children: ReactNode;
};

export default function HelpPage({ title, backHref, backLabel, description, children }: HelpPageProps) {
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Link href={backHref} style={helpLinkStyle}>{backLabel}</Link>
          <Text accessibilityRole="header" style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
          {children}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { paddingHorizontal: 24, paddingVertical: 32 },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', gap: 16 },
  title: { fontSize: 32, fontWeight: '700', color: '#111827' },
  description: { fontSize: 16, lineHeight: 24, color: '#1f2937' },
  link: { color: '#1d4ed8', alignSelf: 'flex-start', paddingVertical: 6, textDecorationLine: 'underline' },
});

export const helpLinkStyle = styles.link;
