import { Tabs } from 'expo-router';
import { Camera, History, Chrome as Home, Book, MessageCircle } from 'lucide-react-native';
import { StyleSheet } from 'react-native';
import { useCallback } from 'react';

export default function TabLayout() {
  // Handle tab navigation events to ensure proper state management
  const handleTabPress = useCallback((e) => {
    console.log('[TabLayout] Tab pressed:', e.target);
    // No need to preventDefault() as we want default navigation behavior
    // Just logging the event for debugging purposes
  }, []);

  return (
    <Tabs
      initialRouteName="new-dose"
      screenOptions={{
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        headerShown: false,
      }}
      // Listener for tab navigation events
      tabBarOptions={{
        onTabPress: handleTabPress,
      }}
    >
      {/* <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      /> */}
      <Tabs.Screen
        name="new-dose"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Camera size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
});