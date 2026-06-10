import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, useColorScheme, Image } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getCurrentUser } from '../../services/api';
import { WebContainer } from '../../components/ui/WebContainer';

export default function ProfileScreen() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const theme = {
        background: isDark ? '#111111' : '#f8f9fa',
        surface: isDark ? '#1c1c1e' : '#ffffff',
        text: isDark ? '#f4f4f5' : '#1f2937',
        textMuted: isDark ? '#a1a1aa' : '#6b7280',
        border: isDark ? '#27272a' : '#f3f4f6',
        borderStrong: isDark ? '#3f3f46' : '#e5e7eb',
        icon: isDark ? '#d4d4d8' : '#9ca3af',
        primary: '#5865F2',
    };

    useEffect(() => {
        fetchUser();
    }, []);

    const fetchUser = async () => {
        try {
            setLoading(true);
            const data = await getCurrentUser();
            const userData = data.user || data.data || data;
            setUser(userData);
        } catch (error) {
            console.error('Failed to fetch user', error);
        } finally {
            setLoading(false);
        }
    };

    const renderMenuItem = (title: string, icon: string, onPress: () => void) => (
        <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: theme.surface, shadowColor: isDark ? 'transparent' : '#000' }]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.menuItemLeft}>
                <View style={[styles.iconContainer, { backgroundColor: isDark ? '#27272a' : '#f3f4f6' }]}>
                    <Ionicons name={icon as any} size={22} color={theme.primary} />
                </View>
                <Text style={[styles.menuItemTitle, { color: theme.text }]}>{title}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.icon} />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <WebContainer maxWidth={720}>
                <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
                    <TouchableOpacity style={[styles.backButton, { backgroundColor: theme.surface, shadowColor: isDark ? 'transparent' : '#000' }]} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color={theme.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: theme.text }]}>Hồ sơ</Text>
                    <View style={{ width: 24 }} />
                </View>
            </WebContainer>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            ) : (
                <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                    <WebContainer maxWidth={720} paddingHorizontal={0}>
                        {/* Avatar Section */}
                        <View style={styles.avatarSection}>
                            <View style={styles.avatarWrapper}>
                                {user?.avatarUrl ? (
                                    <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
                                ) : (
                                    <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
                                        <Text style={styles.avatarInitial}>{(user?.username || 'U').charAt(0).toUpperCase()}</Text>
                                    </View>
                                )}
                            </View>
                            <Text style={[styles.avatarName, { color: theme.text }]}>{user?.username || 'Người dùng'}</Text>
                            <Text style={[styles.avatarEmail, { color: theme.textMuted }]}>{user?.email || ''}</Text>
                        </View>

                        <View style={styles.menuContainer}>
                            {renderMenuItem('Gói Plus', 'star', () => router.push('/(profile)/plus' as any))}
                            {renderMenuItem('Creator Dashboard', 'podium-outline', () => router.push('/(profile)/creator' as any))}
                            {renderMenuItem('Thành tựu', 'trophy-outline', () => router.push('/(profile)/achievements' as any))}
                            {renderMenuItem('Cài đặt', 'settings-outline', () => router.push('/(profile)/settings' as any))}
                        </View>
                    </WebContainer>
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
        borderRadius: 20,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: 16,
    },
    avatarSection: {
        alignItems: 'center',
        paddingVertical: 32,
    },
    avatarWrapper: {
        width: 100,
        height: 100,
        borderRadius: 50,
        overflow: 'hidden',
        marginBottom: 16,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    avatarImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    avatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarInitial: {
        color: '#ffffff',
        fontSize: 40,
        fontWeight: 'bold',
    },
    avatarName: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    avatarEmail: {
        fontSize: 16,
    },
    menuContainer: {
        marginTop: 8,
        gap: 12,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 16,
        elevation: 1,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    menuItemTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
});
