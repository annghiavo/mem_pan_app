import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, useColorScheme, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getRecentDecks, getDeck, getDeckProgress, getCurrentUser, getDecks } from '../../services/api';

// Web specific hoverable wrapper
function HoverableCard({ children, style, onPress, theme }: any) {
    const [isHovered, setIsHovered] = useState(false);
    return (
        <TouchableOpacity
            activeOpacity={0.8}
            onPress={onPress}
            // @ts-ignore
            onMouseEnter={() => setIsHovered(true)}
            // @ts-ignore
            onMouseLeave={() => setIsHovered(false)}
            style={[
                style,
                { cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' },
                isHovered && { transform: [{ translateY: -4 }], boxShadow: `0 8px 16px ${theme.shadowColor}15` }
            ]}
        >
            {children}
        </TouchableOpacity>
    );
}

export default function HomeWebScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const theme = {
        background: isDark ? '#111111' : '#f8f9fa',
        surface: isDark ? '#1c1c1e' : '#ffffff',
        text: isDark ? '#f4f4f5' : '#111827',
        textMuted: isDark ? '#a1a1aa' : '#6b7280',
        border: isDark ? '#27272a' : '#f3f4f6',
        primary: '#5865F2',
        shadowColor: isDark ? '#000000' : '#000000',
    };

    const [studySessions, setStudySessions] = useState<any[]>([]);
    const [recentDecks, setRecentDecks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [username, setUsername] = useState('M');

    const fetchData = useCallback(async () => {
        try {
            try {
                const res = await getRecentDecks();
                if (res.decks && res.decks.length > 0) {
                    const sessionPromises = res.decks.slice(0, 8).map(async (d: any) => {
                        try {
                            const deckRes = await getDeck(d.deckId);
                            const progressRes = await getDeckProgress(d.deckId).catch(() => null);
                            return {
                                ...d,
                                ...deckRes.deck,
                                progress: progressRes
                            };
                        } catch (e) {
                            return null;
                        }
                    });
                    const details = await Promise.all(sessionPromises);
                    setStudySessions(details.filter(d => d !== null));
                }
            } catch (error) { }

            try {
                const res = await getDecks(1, 10);
                if (res.decks && res.decks.length > 0) {
                    setRecentDecks(res.decks);
                }
            } catch (error) { }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchData();
    }, [fetchData]);

    React.useEffect(() => {
        fetchData();
        getCurrentUser().then(data => {
            const u = data.user || data.data || data;
            if (u?.username) setUsername(u.username);
        }).catch(() => { });
    }, [fetchData]);

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
            >
                <View style={styles.contentWrapper}>

                    {/* Header */}
                    <View style={styles.header}>
                        <View>
                            <Text style={[styles.greeting, { color: theme.text }]}>Chào mừng trở lại,</Text>
                            <Text style={[styles.username, { color: theme.primary }]}>{username}</Text>
                        </View>
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => router.push('/search' as any)}
                            style={[styles.searchContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}
                        >
                            <Ionicons name="search" size={20} color={theme.textMuted} />
                            <Text style={[styles.searchInput, { color: theme.textMuted }]}>Tìm kiếm học phần, thư mục...</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Học tiếp - Study Sessions with Progress */}
                    {studySessions.length > 0 && (
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.text }]}>Học tiếp</Text>
                            <View style={styles.gridContainer}>
                                {studySessions.map((session, idx) => {
                                    const progressPercent = session.progress?.totalCount > 0
                                        ? Math.round((session.progress.memorizedCount / session.progress.totalCount) * 100)
                                        : 0;
                                    return (
                                        <HoverableCard
                                            key={`session-${idx}`}
                                            theme={theme}
                                            style={[styles.continueCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                                            onPress={() => router.push(`/module/${session.deckId}` as any)}
                                        >
                                            <View style={styles.cardHeader}>
                                                <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={2}>{session.name}</Text>
                                            </View>
                                            <View style={{ flex: 1 }} />
                                            <View style={styles.progressContainer}>
                                                <View style={[styles.progressBarBg, { backgroundColor: theme.border }]}>
                                                    <View style={[styles.progressBarFill, { width: `${progressPercent}%`, backgroundColor: theme.primary }]} />
                                                </View>
                                                <Text style={[styles.progressText, { color: theme.textMuted }]}>{progressPercent}% hoàn thành</Text>
                                            </View>
                                            <TouchableOpacity
                                                style={[styles.continueButton, { backgroundColor: theme.primary }]}
                                                onPress={(e) => {
                                                    e.stopPropagation();
                                                    router.push(`/quiz/${session.deckId}` as any);
                                                }}
                                            >
                                                <Text style={styles.continueButtonText}>Tiếp tục</Text>
                                            </TouchableOpacity>
                                        </HoverableCard>
                                    );
                                })}
                            </View>
                        </View>
                    )}

                    {/* Gần đây - Recent Decks from Library */}
                    {recentDecks.length > 0 && (
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.text }]}>Đã xem gần đây</Text>
                            <View style={styles.gridContainerSmall}>
                                {recentDecks.map((deck, idx) => (
                                    <HoverableCard
                                        key={`recent-${idx}`}
                                        theme={theme}
                                        style={[styles.recentItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
                                        onPress={() => router.push(`/module/${deck.deckId}` as any)}
                                    >
                                        <View style={[styles.recentIcon, { backgroundColor: isDark ? '#115e59' : '#e0f2f1' }]}>
                                            <Text style={{ color: isDark ? '#5eead4' : '#008080', fontWeight: 'bold', fontSize: 18 }}>{(deck.name || 'D').charAt(0).toUpperCase()}</Text>
                                        </View>
                                        <View style={styles.recentInfo}>
                                            <Text style={[styles.recentTitle, { color: theme.text }]} numberOfLines={1}>{deck.name}</Text>
                                            <Text style={[styles.recentSubtitle, { color: theme.textMuted }]}>{deck.cardCount || 0} thuật ngữ</Text>
                                        </View>
                                    </HoverableCard>
                                ))}
                            </View>
                        </View>
                    )}

                    <View style={{ height: 60 }} />
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: 32,
        alignItems: 'center', // Center the wrapper
    },
    contentWrapper: {
        width: '100%',
        maxWidth: 1100, // Constrain width on large displays
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 40,
        marginTop: 10,
        flexWrap: 'wrap',
        gap: 24,
    },
    greeting: {
        fontSize: 16,
        marginBottom: 4,
    },
    username: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 1,
        minWidth: 320,
        cursor: 'pointer',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
    },
    searchInput: {
        flex: 1,
        marginLeft: 12,
        fontSize: 16,
    },
    section: {
        marginBottom: 40,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 24,
    },
    continueCard: {
        width: 280, // Fixed width for wrap layout
        minHeight: 220,
        borderRadius: 16,
        padding: 24,
        borderWidth: 1,
        flexDirection: 'column',
        // @ts-ignore
        boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
    },
    cardHeader: {
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        lineHeight: 24,
    },
    progressContainer: {
        marginBottom: 16,
    },
    progressBarBg: {
        height: 8,
        borderRadius: 4,
        marginBottom: 8,
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    progressText: {
        fontSize: 14,
    },
    continueButton: {
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
    },
    continueButtonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    gridContainerSmall: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    recentItem: {
        width: 320,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        // @ts-ignore
        boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
    },
    recentIcon: {
        width: 48,
        height: 48,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    recentInfo: {
        flex: 1,
    },
    recentTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    recentSubtitle: {
        fontSize: 14,
    },
});
