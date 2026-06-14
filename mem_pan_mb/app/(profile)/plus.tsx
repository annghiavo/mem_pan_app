import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, useColorScheme, Alert, Linking, Platform, AppState, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getMySubscription, checkoutPlus, normalizeCheckoutUrl, normalizeSubscription, confirmPayment } from '../../services/api';
import { WebContainer } from '../../components/ui/WebContainer';
import AsyncStorage from '@react-native-async-storage/async-storage';

const getBillingCallbackUrls = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
        const origin = window.location.origin;
        return {
            origin,
            returnUrl: `${origin}/billing/return`,
            cancelUrl: `${origin}/billing/cancel`,
        };
    }

    return {
        returnUrl: 'mempanmb://billing/return',
        cancelUrl: 'mempanmb://billing/cancel',
    };
};

export default function PlusScreen() {
    const router = useRouter();
    const [subscription, setSubscription] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const [hasPendingPayment, setHasPendingPayment] = useState(false);
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const isWeb = Platform.OS === 'web';

    const theme = {
        background: isDark ? '#111111' : '#f8f9fa',
        surface: isDark ? '#1c1c1e' : '#ffffff',
        text: isDark ? '#f4f4f5' : '#1f2937',
        textMuted: isDark ? '#a1a1aa' : '#6b7280',
        border: isDark ? '#27272a' : '#f3f4f6',
        primary: '#5865F2',
        plusGold: '#f59e0b',
    };

    useEffect(() => {
        fetchSubscription();

        const sub = AppState.addEventListener('change', (nextAppState) => {
            if (nextAppState === 'active') {
                fetchSubscription();
            }
        });

        return () => sub.remove();
    }, []);

    const fetchSubscription = async (isRefresh = false) => {
        try {
            if (!isRefresh) setLoading(true);

            // Check if there is a pending payment to confirm
            const pendingOrderStr = await AsyncStorage.getItem('pending_plus_order_code');
            if (pendingOrderStr) {
                setHasPendingPayment(true);
                try {
                    const orderCode = Number(pendingOrderStr);
                    const result = await confirmPayment(orderCode);
                    // Only remove if it's a final state. If it's still pending, keep it
                    // so we can re-check next time they return to the app.
                    if (['paid', 'cancelled', 'expired'].includes(result?.status)) {
                        await AsyncStorage.removeItem('pending_plus_order_code');
                        setHasPendingPayment(false);
                    }
                } catch (e) {
                    console.log('Error confirming pending payment', e);
                }
            } else {
                setHasPendingPayment(false);
            }

            const data = await getMySubscription(isRefresh); // quiet if refresh
            setSubscription(normalizeSubscription(data));
        } catch (error) {
            console.error('Failed to fetch subscription', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchSubscription(true);
    };

    const handleSubscribe = async (planCode: string) => {
        setCheckoutLoading(true);
        try {
            const callbackUrls = getBillingCallbackUrls();
            const data = await checkoutPlus({
                planCode,
                returnUrl: callbackUrls.returnUrl,
                cancelUrl: callbackUrls.cancelUrl,
                origin: callbackUrls.origin,
            });
            console.log('Checkout API response:', data);
            const checkoutUrl = normalizeCheckoutUrl(data);
            console.log('Normalized Checkout URL:', checkoutUrl);

            if (checkoutUrl) {
                const orderCode = data?.order_code || data?.orderCode || data?.OrderCode;
                if (orderCode) {
                    await AsyncStorage.setItem('pending_plus_order_code', orderCode.toString());
                }

                if (Platform.OS === 'web') {
                    window.location.href = checkoutUrl;
                } else {
                    Linking.openURL(checkoutUrl);
                }
            } else {
                Alert.alert('Lỗi', 'Không thể tạo link thanh toán. Phản hồi: ' + JSON.stringify(data));
            }
        } catch (error: any) {
            Alert.alert('Lỗi', error.message || 'Có lỗi xảy ra.');
        } finally {
            setCheckoutLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <WebContainer maxWidth={720}>
                <View style={[styles.header, { borderBottomColor: theme.border }]}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color={theme.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: theme.text }]}>Gói Plus</Text>
                    <View style={{ width: 40 }} />
                </View>
            </WebContainer>

            {loading && !refreshing ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            ) : (
                <ScrollView
                    style={styles.content}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
                    }
                >
                    <WebContainer maxWidth={720} paddingHorizontal={0}>
                        <View style={styles.heroSection}>
                            <Ionicons name="star" size={64} color={theme.plusGold} style={{ marginBottom: 16 }} />
                            <Text style={[styles.heroTitle, { color: theme.text }]}>MemPan Plus</Text>
                            <Text style={[styles.heroDesc, { color: theme.textMuted }]}>
                                Mở khóa toàn bộ học phần chất lượng cao từ các Creator hàng đầu.
                            </Text>
                        </View>

                        {subscription?.active || subscription?.status === 'active' ? (
                            <View style={[styles.statusCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                                <View style={styles.statusHeader}>
                                    <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                                    <Text style={[styles.statusText, { color: theme.text }]}>Gói Plus Đang Hoạt Động</Text>
                                </View>
                                <Text style={[styles.statusDetail, { color: theme.textMuted }]}>
                                    Hiệu lực đến: {new Date(subscription.currentPeriodEnd).toLocaleDateString('vi-VN')}
                                </Text>
                                {!isWeb && (
                                    <TouchableOpacity
                                        style={[styles.buyButton, { backgroundColor: theme.primary, marginTop: 16 }]}
                                        onPress={() => router.replace('/(tabs)' as any)}
                                    >
                                        <Text style={styles.buyButtonText}>Mở ứng dụng</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        ) : (
                            <View style={styles.pricingSection}>
                                {hasPendingPayment && (
                                    <View style={[styles.pendingCard, { backgroundColor: '#fffbeb', borderColor: '#fef3c7' }]}>
                                        <Ionicons name="time-outline" size={24} color="#d97706" />
                                        <View style={{ flex: 1, marginLeft: 12 }}>
                                            <Text style={{ color: '#92400e', fontWeight: 'bold', fontSize: 15 }}>Giao dịch đang chờ xử lý</Text>
                                            <Text style={{ color: '#92400e', fontSize: 13, marginTop: 4 }}>Ngân hàng có thể mất vài phút. Hãy vuốt màn hình xuống để kiểm tra lại trạng thái nhé.</Text>
                                        </View>
                                    </View>
                                )}
                                <View style={[styles.planCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                                    <Text style={[styles.planName, { color: theme.text }]}>Gói 1 Tháng</Text>
                                    <Text style={[styles.planPrice, { color: theme.plusGold }]}>49.000 ₫</Text>
                                    <TouchableOpacity 
                                        style={[styles.buyButton, { backgroundColor: theme.plusGold }]} 
                                        onPress={() => handleSubscribe('plus_monthly')}
                                        disabled={checkoutLoading}
                                    >
                                        {checkoutLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buyButtonText}>Đăng ký ngay</Text>}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </WebContainer>
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
    backButton: { padding: 8, marginLeft: -8 },
    headerTitle: { fontSize: 18, fontWeight: 'bold' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { flex: 1, padding: 20 },
    heroSection: { alignItems: 'center', paddingVertical: 40 },
    heroTitle: { fontSize: 28, fontWeight: 'bold', marginBottom: 8 },
    heroDesc: { fontSize: 16, textAlign: 'center', paddingHorizontal: 20 },
    pendingCard: { flexDirection: 'row', padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 16, alignItems: 'center' },
    statusCard: { padding: 20, borderRadius: 16, borderWidth: 1, alignItems: 'center', marginBottom: 20 },
    statusHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    statusText: { fontSize: 18, fontWeight: 'bold', marginLeft: 8 },
    statusDetail: { fontSize: 14 },
    pricingSection: { marginTop: 20 },
    planCard: { padding: 24, borderRadius: 16, borderWidth: 1, alignItems: 'center', marginBottom: 16 },
    planName: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
    planPrice: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
    buyButton: { paddingVertical: 14, paddingHorizontal: 32, borderRadius: 24, width: '100%', alignItems: 'center' },
    buyButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
