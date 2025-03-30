import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Send } from 'lucide-react-native';

export default function ChatScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Chat</Text>
        <Text style={styles.subtitle}>Ask questions about your medication</Text>
      </View>

      <ScrollView style={styles.chatContainer}>
        <Text style={styles.welcomeMessage}>
          Hi! I'm your SafeDose assistant. How can I help you today?
        </Text>
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type your message..."
          placeholderTextColor="#8E8E93"
          multiline
        />
        <TouchableOpacity style={styles.sendButton}>
          <Send size={24} color="#FFFFFF" />
        </TouchableOpacity>
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
  chatContainer: {
    flex: 1,
    padding: 16,
  },
  welcomeMessage: {
    backgroundColor: '#E8E8ED',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    fontSize: 15,
    color: '#000000',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  input: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    padding: 12,
    marginRight: 12,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
});