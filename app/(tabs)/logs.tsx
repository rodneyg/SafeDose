import { View, Text, StyleSheet, ScrollView } from 'react-native';

export default function LogsScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Logs</Text>
        <Text style={styles.subtitle}>Track your medication history</Text>
      </View>

      <ScrollView style={styles.logsList}>
        <Text style={styles.emptyText}>No logs yet</Text>
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
  logsList: {
    flex: 1,
    padding: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#8E8E93',
    fontSize: 17,
    marginTop: 40,
  },
});