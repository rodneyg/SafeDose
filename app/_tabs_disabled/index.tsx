import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Camera, History, MessageCircle, Book } from 'lucide-react-native';

export default function HomeScreen() {
  const router = useRouter();

  const QuickAction = ({ icon: Icon, title, route }) => (
    <TouchableOpacity
      style={styles.actionButton}
      onPress={() => router.push(route)}>
      <Icon size={32} color="#007AFF" />
      <Text style={styles.actionText}>{title}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>SafeDose</Text>
        <Text style={styles.subtitle}>Your Medication Assistant</Text>
      </View>

      <View style={styles.actionsGrid}>
        <QuickAction
          icon={Camera}
          title="New Dose"
          route="/new-dose"
        />
        {/* <QuickAction
          icon={History}
          title="View Logs"
          route="/logs"
        />
        <QuickAction
          icon={MessageCircle}
          title="Chat"
          route="/chat"
        />
        <QuickAction
          icon={Book}
          title="Learn"
          route="/learn"
        /> */}
      </View>
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
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 16,
  },
  actionButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    width: '47%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  actionText: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '500',
    color: '#000000',
  },
});