import { Tabs, useRouter } from 'expo-router';
import { Camera, History } from 'lucide-react-native';
import { StyleSheet } from 'react-native';
import { useEffect } from 'react';
import { trackScreenView } from '../../lib/analytics';

export default function TabLayout() {
  console.log('[TabLayout] ========== TAB LAYOUT RENDER ==========');
  console.log('[TabLayout] Rendering tab layout with initialRouteName: new-dose');
  
  const router = useRouter();
  
  useEffect(() => {
    // Track initial screen view
    trackScreenView('new-dose');
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
        listeners={{
          tabPress: () => trackScreenView('new-dose'),
        }}
      />
      <Tabs.Screen
        name="logs"
        options={{
          title: 'Log',
          tabBarIcon: ({ color, size }) => <History size={size} color={color} />,
        }}
        listeners={{
          tabPress: () => trackScreenView('logs'),
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
    height: 49, // Reduced from default (~84px) to make more room for content
  },
});