import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerTitleAlign: 'center',
        headerShadowVisible: false,
        headerRight: () => (
          <TouchableOpacity onPress={() => console.log('Settings pressed')}>
            <Ionicons name="settings" size={24} color="black" style={{ marginRight: 15 }} />
          </TouchableOpacity>
        ),
        tabBarActiveTintColor: '#37eb34',
        tabBarInactiveTintColor: 'gray',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="metrics"
        options={{
          title: '',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="analytics" size={size} color={color} />
          ),
          headerTitle: 'Metrics', // Display "Metrics" in the header
        }}
      />
      <Tabs.Screen
        name="camera"
        options={{
          title: '',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="camera-outline" size={size} color={color} />
          ),
          headerTitle: 'Camera', // Display "Camera" in the header
        }}
      />
      <Tabs.Screen
        name="social"
        options={{
          title: '',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="clipboard-outline" size={size} color={color} />
          ),
          headerTitle: 'Social', // Display "Social" in the header
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
          headerTitle: 'Profile', // Display "Profile" in the header
        }}
      />
    </Tabs>
  );
}