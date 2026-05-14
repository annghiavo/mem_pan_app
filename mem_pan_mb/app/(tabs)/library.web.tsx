import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { getDecks, getFolders } from '../../services/api';

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
                isHovered && { transform: [{ translateY: -2 }], boxShadow: `0 6px 12px ${theme.shadowColor}15` }
            ]}
        >
            {children}
        </TouchableOpacity>
    );
}

export default function LibraryWebScreen() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('Học phần');
    const [decks, setDecks] = useState<any[]>([]);
    const [folders, setFolders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const theme = {
        background: isDark ? '#111111' : '#f8f9fa',
        surface: isDark ? '#1c1c1e' : '#ffffff',
        text: isDark ? '#f4f4f5' : '#1f2937',
        textMuted: isDark ? '#a1a1aa' : '#6b7280',
        border: isDark ? '#27272a' : '#e5e7eb',
        primary: '#5865F2',
        activeTabBg: isDark ? 'rgba(88, 101, 242, 0.15)' : 'rgba(88, 101, 242, 0.1)',
        iconBg: isDark ? '#0c4a6e' : '#e0f2fe',
        folderBg: isDark ? '#3f3f46' : '#f3f4f6',
        moreBtn: isDark ? '#27272a' : '#f3f4f6',
        shadowColor: isDark ? '#000000' : '#000000',
    };

    const tabs = ['Học phần', 'Thư mục'];

    const fetchData = async () => {
        try {
            if (activeTab === 'Học phần') {
                const res = await getDecks();
                setDecks(res.decks || []);
            } else if (activeTab === 'Thư mục') {
                const res = await getFolders();
                setFolders(res.folders || []);
            }
        } catch (error) {
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            setLoading(true);
            fetchData();
        }, [activeTab])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Header Tabs */}
            <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
                <View style={styles.contentWrapper}>
                    <View style={styles.tabsContainer}>
                        <Text style={[styles.pageTitle, { color: theme.text }]}>Thư viện</Text>
                        <View style={{ width: 32 }} />
                        {tabs.map((tab) => (
                            <TouchableOpacity
                                key={tab}
                                style={[
                                    styles.tab,
                                    activeTab === tab && { backgroundColor: theme.activeTabBg }
                                ]}
                                onPress={() => setActiveTab(tab)}
                            >
                                <Text style={[styles.tabText, { color: activeTab === tab ? theme.primary : theme.textMuted }]}>
                                    {tab}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
                }
            >
                <View style={styles.contentWrapper}>
                    {loading ? (
                        <View style={styles.centerContainer}>
                            <ActivityIndicator size="large" color={theme.primary} />
                        </View>
                    ) : (
                        <>
                            {/* Content logic specific to web */}
                            <View style={styles.filterRow}>
                                <View style={styles.filterContainer}>
                                    <Text style={[styles.filterText, { color: theme.textMuted }]}>Tất cả</Text>
                                    <Ionicons name="chevron-down" size={16} color={theme.textMuted} />
                                </View>
                                <View style={styles.filterContainer}>
                                    <Text style={[styles.filterText, { color: theme.textMuted }]}>Gần đây</Text>
                                    <Ionicons name="chevron-down" size={16} color={theme.textMuted} />
                                </View>
                            </View>

                            {activeTab === 'Học phần' ? (
                                <>
                                    {decks.length === 0 ? (
                                        <View style={styles.emptyContainer}>
                                            <Text style={[styles.emptyText, { color: theme.textMuted }]}>Chưa có học phần nào</Text>
                                        </View>
                                    ) : (
                                        <View style={styles.gridContainer}>
                                            {decks.map((deck) => (
                                                <HoverableCard
                                                    key={deck.deckId}
                                                    theme={theme}
                                                    style={[styles.itemCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                                                    onPress={() => router.push(`/module/${deck.deckId}` as any)}
                                                >
                                                    <View style={[styles.itemIconContainer, { backgroundColor: theme.iconBg }]}>
                                                        <Ionicons name="albums-outline" size={24} color={isDark ? '#38bdf8' : '#0284c7'} />
                                                    </View>
                                                    <View style={styles.itemInfo}>
                                                        <Text style={[styles.itemTitle, { color: theme.text }]} numberOfLines={1}>{deck.name}</Text>
                                                        <Text style={[styles.itemSubtitle, { color: theme.textMuted }]}>Học phần • {deck.cardCount || 0} thuật ngữ</Text>
                                                    </View>
                                                </HoverableCard>
                                            ))}
                                        </View>
                                    )}
                                </>
                            ) : null}

                            {activeTab === 'Thư mục' ? (
                                <>
                                    {folders.length === 0 ? (
                                        <View style={styles.emptyContainer}>
                                            <Text style={[styles.emptyText, { color: theme.textMuted }]}>Chưa có thư mục nào</Text>
                                        </View>
                                    ) : (
                                        <View style={styles.gridContainer}>
                                            {folders.map((folder) => (
                                                <HoverableCard
                                                    key={folder.folderId}
                                                    theme={theme}
                                                    style={[styles.itemCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                                                    onPress={() => router.push(`/folder/${folder.folderId}` as any)}
                                                >
                                                    <View style={[styles.folderIconContainer, { backgroundColor: theme.folderBg }]}>
                                                        <Ionicons name="folder-outline" size={24} color={theme.textMuted} />
                                                    </View>
                                                    <View style={styles.itemInfo}>
                                                        <Text style={[styles.itemTitle, { color: theme.text }]} numberOfLines={1}>{folder.name}</Text>
                                                        <Text style={[styles.itemSubtitle, { color: theme.textMuted }]}>Thư mục</Text>
                                                    </View>
                                                </HoverableCard>
                                            ))}
                                        </View>
                                    )}
                                </>
                            ) : null}

                            <View style={{ height: 100 }} />
                        </>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        alignItems: 'center',
    },
    contentWrapper: {
        width: '100%',
        maxWidth: 1100, // Constrain width on large displays
        paddingHorizontal: 32,
    },
    tabsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    pageTitle: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    tab: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginRight: 8,
        // @ts-ignore
        cursor: 'pointer',
    },
    tabText: {
        fontSize: 16,
        fontWeight: '600',
    },
    scrollContent: {
        alignItems: 'center',
        paddingVertical: 32,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 100,
    },
    emptyContainer: {
        padding: 60,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 18,
    },
    filterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        marginBottom: 24,
        gap: 16,
    },
    filterContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 8,
        // @ts-ignore
        cursor: 'pointer',
    },
    filterText: {
        fontSize: 14,
        fontWeight: '600',
        marginRight: 8,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 20,
    },
    itemCard: {
        width: 320,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    itemIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    folderIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    itemInfo: {
        flex: 1,
    },
    itemTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 6,
    },
    itemSubtitle: {
        fontSize: 14,
    },
});
