import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Appearance, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Index() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const theme = {
    background: isDark ? '#111111' : '#ffffff',
    primary: '#5865F2',
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        const savedTheme = await AsyncStorage.getItem('theme');
        if (savedTheme) {
          Appearance.setColorScheme(savedTheme as any);
        }
        
        if (token) {
          // If token exists, go to main app
          router.replace('/(tabs)');
        } else {
          // Otherwise, go to login
          router.replace('/(auth)/login');
        }
      } catch (error) {
        console.error('Error checking auth token:', error);
        router.replace('/(auth)/login');
      }
    };

    checkAuth();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ActivityIndicator size="large" color={theme.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
