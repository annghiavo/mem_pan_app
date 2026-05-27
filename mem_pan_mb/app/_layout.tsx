import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { bootstrapNotifications } from '@/services/notifications';
import { installGlobalErrorHandlers, devlog } from '@/services/devlog';

// Install once at module load so we capture errors that happen before
// any component mounts (e.g. during initial async imports).
installGlobalErrorHandlers();

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  // Register FCM token + report device timezone once the app is mounted.
  // Safe to run before login: bootstrapNotifications no-ops if auth is missing.
  useEffect(() => {
    devlog.event('app:mount');
    bootstrapNotifications();
    return () => devlog.event('app:unmount');
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="search" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
