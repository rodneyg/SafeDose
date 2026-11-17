import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import Head from 'expo-router/head';
import entries from '../lib/changelog.json';

export default function Changelog() {
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.scroll}>
      <Head><title>Changelog | SafeDose</title><meta name="description" content="New features, improvements, and fixes in each SafeDose release." /></Head>
      <View style={styles.content}>
        <Link href="/" style={styles.link}>SafeDose</Link>
        <Text accessibilityRole="header" style={styles.title}>Changelog</Text>
        <Text style={styles.subtitle}>New features, improvements, and fixes in each release.</Text>
        {entries.map(entry => (
          <View key={entry.id} style={styles.entry}>
            <Text style={styles.date}>{new Date(`${entry.date}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}</Text>
            <Text accessibilityRole="header" style={styles.headline}>{entry.title}</Text>
            {Object.entries(entry.sections as Record<string, string[]>).filter(([, bullets]) => bullets.length).map(([group, bullets]) => (
              <View key={group} style={styles.group}>
                <Text accessibilityRole="header" style={styles.groupTitle}>{group}</Text>
                {bullets.map((bullet, index) => <Text key={index} style={styles.bullet}>{'\u2022'} {bullet}</Text>)}
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FAFAF8' },
  scroll: { paddingHorizontal: 24, paddingVertical: 48 },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center' },
  link: { color: '#166654', fontSize: 16, marginBottom: 32 },
  title: { color: '#172C27', fontSize: 40, fontWeight: '700', marginBottom: 12 },
  subtitle: { color: '#52635E', fontSize: 18, lineHeight: 28, marginBottom: 48 },
  entry: { borderTopWidth: 1, borderTopColor: '#D9E1DC', paddingVertical: 32 },
  date: { color: '#52635E', fontSize: 14, marginBottom: 12 },
  headline: { color: '#172C27', fontSize: 26, lineHeight: 34, fontWeight: '600', marginBottom: 8 },
  group: { marginTop: 20 },
  groupTitle: { color: '#172C27', fontSize: 17, fontWeight: '600', marginBottom: 8 },
  bullet: { color: '#354A43', fontSize: 16, lineHeight: 26, marginBottom: 6 },
});
