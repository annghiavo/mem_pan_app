import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Platform, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();

  // Lift the floating tab bar above the OS navigation area (Android gesture /
  // 3-button bar, iOS home indicator) so it never sits under the system buttons.
  const bottomOffset = insets.bottom + (Platform.OS === 'ios' ? 12 : 16);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#5865F2', // Blue-indigo color
        tabBarInactiveTintColor: isDark ? '#a1a1aa' : '#6b7280',
        headerShown: false,
        tabBarStyle: [styles.tabBar, { backgroundColor: isDark ? '#1c1c1e' : '#ffffff', bottom: bottomOffset }],
        tabBarLabelStyle: styles.tabBarLabel,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Trang chủ',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: 'Tạo',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'add-circle' : 'add-circle-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Thư viện',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'folder' : 'folder-outline'} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    elevation: 10,
    zIndex: 10,
    borderRadius: 30,
    height: 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    borderTopWidth: 0,
    paddingBottom: Platform.OS === 'ios' ? 0 : 5,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
});
