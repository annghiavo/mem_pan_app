import React, { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { confirmPayment, getMySubscription, normalizeSubscription } from '../../services/api';
import { WebContainer } from '../../components/ui/WebContainer';

export default function BillingReturnScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const theme = {
    background: isDark ? '#111111' : '#f8f9fa',
    surface: isDark ? '#1c1c1e' : '#ffffff',
    text: isDark ? '#f4f4f5' : '#1f2937',
    textMuted: isDark ? '#a1a1aa' : '#6b7280',
    border: isDark ? '#27272a' : '#e5e7eb',
    primary: '#5865F2',
  };

  useEffect(() => {
    let mounted = true;
    const activate = async () => {
      try {
        // Extract orderCode from URL params (PayOS sends it as ?orderCode=...)
        const orderCode = Number(params.orderCode);
        const status = params.status as string;

        if (orderCode) {
          // Actively confirm payment with backend (queries PayOS directly)
          const result = await confirmPayment(orderCode);
          if (!mounted) return;
          if (result?.active || result?.status === 'paid') {
            setActive(true);
            setStatusMessage('Tài khoản của bạn đã được nâng cấp lên Plus!');
            return;
          }
        }

        // Fallback: check subscription status directly
        const data = await getMySubscription();
        if (!mounted) return;
        const subscription = normalizeSubscription(data);
        const isActive = Boolean(subscription?.active || subscription?.status === 'active');
        setActive(isActive);
        setStatusMessage(
          isActive
            ? 'Tài khoản của bạn đã được nâng cấp lên Plus!'
            : 'Thanh toán đang được xử lý. Vui lòng đợi vài giây và kiểm tra lại.'
        );
      } catch (err) {
        console.error('Payment confirmation error:', err);
        if (mounted) {
          setActive(false);
          setStatusMessage('Không thể xác nhận thanh toán. Vui lòng kiểm tra lại trong hồ sơ.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    activate();
    return () => { mounted = false; };
  }, [params.orderCode, params.status]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <WebContainer maxWidth={560}>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {loading ? (
            <>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={[styles.description, { color: theme.textMuted, marginTop: 16 }]}>
                Đang xác nhận thanh toán với PayOS...
              </Text>
            </>
          ) : (
            <>
              <Ionicons name={active ? 'checkmark-circle' : 'time-outline'} size={56} color={active ? '#10b981' : '#f59e0b'} />
              <Text style={[styles.title, { color: theme.text }]}>
                {active ? 'MemPan Plus đã kích hoạt' : 'Đang xác nhận thanh toán'}
              </Text>
              <Text style={[styles.description, { color: theme.textMuted }]}>
                {statusMessage}
              </Text>
              <TouchableOpacity style={[styles.button, { backgroundColor: theme.primary }]} onPress={() => router.replace('/(profile)/plus' as any)}>
                <Text style={styles.buttonText}>Xem trạng thái Plus</Text>
              </TouchableOpacity>
            </>
          )}
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
