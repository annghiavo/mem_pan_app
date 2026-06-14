import React from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { WebContainer } from '../../components/ui/WebContainer';

export default function BillingCancelScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = {
    background: isDark ? '#111111' : '#f8f9fa',
    surface: isDark ? '#1c1c1e' : '#ffffff',
    text: isDark ? '#f4f4f5' : '#1f2937',
    textMuted: isDark ? '#a1a1aa' : '#6b7280',
    border: isDark ? '#27272a' : '#e5e7eb',
    primary: '#5865F2',
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <WebContainer maxWidth={560}>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="close-circle" size={56} color="#ef4444" />
          <Text style={[styles.title, { color: theme.text }]}>Thanh toán đã hủy</Text>
          <Text style={[styles.description, { color: theme.textMuted }]}>
            Bạn chưa bị trừ tiền. Có thể quay lại trang Plus để tạo liên kết PayOS mới khi cần.
          </Text>
          <TouchableOpacity style={[styles.button, { backgroundColor: theme.primary }]} onPress={() => router.replace('/(profile)/plus' as any)}>
            <Text style={styles.buttonText}>Quay lại Plus</Text>
          </TouchableOpacity>
        </View>
      </WebContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { marginTop: 80, padding: 28, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  title: { marginTop: 16, fontSize: 24, fontWeight: '700', textAlign: 'center' },
  description: { marginTop: 10, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  button: { marginTop: 24, borderRadius: 8, paddingHorizontal: 20, paddingVertical: 12 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
