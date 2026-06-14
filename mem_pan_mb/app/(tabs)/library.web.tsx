import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, useColorScheme, Modal, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { getDecks, getFolders, getAllLibraryDecks } from '../../services/api';
import { PlusDeckBadge, isPlusDeck } from '../../components/ui/PlusDeckBadge';

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
                { cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' } as any,
                isHovered && { transform: [{ translateY: -2 }], boxShadow: `0 6px 12px ${theme.shadowColor}15` } as any,
            ]}
        >
            {children}
        </TouchableOpacity>
    );
}

// Dropdown filter component
function FilterDropdown({ value, options, onChange, theme }: {
    value: string;
    options: { label: string; value: string }[];
    onChange: (v: string) => void;
    theme: any;
}) {
    const [open, setOpen] = useState(false);
    const selected = options.find(o => o.value === value);

    return (
        <View style={{ position: 'relative' as any, zIndex: 100 }}>
            <TouchableOpacity
                onPress={() => setOpen(!open)}
                style={[
                    styles.filterBtn,
                    { borderColor: open ? theme.primary : theme.border, backgroundColor: theme.surface }
                ]}
                activeOpacity={0.8}
            >
                <Text style={[styles.filterBtnText, { color: open ? theme.primary : theme.text }]}>
                    {selected?.label ?? value}
                </Text>
                <Ionicons
                    name={open ? 'chevron-up' : 'chevron-down'}
                    size={14}
                    color={open ? theme.primary : theme.textMuted}
                    style={{ marginLeft: 6 }}
                />
            </TouchableOpacity>

            {open && (
                <View style={[styles.dropdownMenu, { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.shadowColor }]}>
                    {options.map((opt, idx) => (
                        <TouchableOpacity
                            key={opt.value}
                            onPress={() => { onChange(opt.value); setOpen(false); }}
                            style={[
                                styles.dropdownItem,
                                idx < options.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
                                opt.value === value && { backgroundColor: theme.activeTabBg },
                            ]}
                        >
                            <Text style={[styles.dropdownItemText, { color: opt.value === value ? theme.primary : theme.text }]}>
                                {opt.label}
                            </Text>
                            {opt.value === value && (
                                <Ionicons name="checkmark" size={16} color={theme.primary} />
                            )}
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
    );
}

const DECK_FILTER_OPTIONS = [
    { label: 'Tất cả', value: 'all' },
    { label: 'Đã tạo', value: 'created' },
];

export default function LibraryWebScreen() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('Học phần');
    const [decks, setDecks] = useState<any[]>([]);
    const [folders, setFolders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [deckFilter, setDeckFilter] = useState('all');

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
                const res = await getAllLibraryDecks();
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

    // Apply deck filter
    const filteredDecks = deckFilter === 'created'
        ? decks.filter(d => d._isOwned && !d._isCloned)
        : decks;

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
                // Close dropdown when scrolling
            >
                <View style={styles.contentWrapper}>
                    {loading ? (
                        <View style={styles.centerContainer}>
                            <ActivityIndicator size="large" color={theme.primary} />
                        </View>
                    ) : (
                        <>
                            {/* Filter row: only for Học phần */}
                            {activeTab === 'Học phần' && (
                                <View style={styles.filterRow}>
                                    <FilterDropdown
                                        value={deckFilter}
                                        options={DECK_FILTER_OPTIONS}
                                        onChange={setDeckFilter}
                                        theme={theme}
                                    />
                                    <Text style={[styles.filterCount, { color: theme.textMuted }]}>
                                        {filteredDecks.length} học phần
                                    </Text>
                                </View>
                            )}

                            {activeTab === 'Học phần' ? (
                                <>
                                    {filteredDecks.length === 0 ? (
                                        <View style={styles.emptyContainer}>
                                            <Ionicons name="albums-outline" size={48} color={theme.textMuted} style={{ marginBottom: 12 }} />
                                            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                                                {deckFilter === 'created' ? 'Bạn chưa tạo học phần nào' : 'Chưa có học phần nào'}
                                            </Text>
                                        </View>
                                    ) : (
                                        <View style={styles.gridContainer}>
                                            {filteredDecks.map((deck) => (
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
                                                        <View style={styles.itemTitleRow}>
                                                            <Text style={[styles.itemTitle, { color: theme.text }]} numberOfLines={1}>{deck.name}</Text>
                                                            {isPlusDeck(deck) ? <PlusDeckBadge compact /> : null}
                                                        </View>
                                                        <Text style={[styles.itemSubtitle, { color: theme.textMuted }]}>
                                                            {deck._isCloned ? 'Sao chép' : (deck._isOwned ? 'Đã tạo' : 'Đã học')} • {deck.cardCount || 0} thuật ngữ
                                                        </Text>
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
                                            <Ionicons name="folder-outline" size={48} color={theme.textMuted} style={{ marginBottom: 12 }} />
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
        maxWidth: 1100,
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
        fontSize: 16,
        textAlign: 'center',
    },

    // Filter row
    filterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        gap: 16,
        zIndex: 100,
    },
    filterCount: {
        fontSize: 14,
        fontWeight: '500',
    },

    // Filter dropdown button
    filterBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderWidth: 1.5,
        borderRadius: 8,
        // @ts-ignore
        cursor: 'pointer',
    },
    filterBtnText: {
        fontSize: 14,
        fontWeight: '600',
    },

    // Dropdown menu
    dropdownMenu: {
        position: 'absolute' as any,
        top: 44,
        left: 0,
        minWidth: 160,
        borderRadius: 10,
        borderWidth: 1,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 8,
        overflow: 'hidden',
        zIndex: 999,
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        // @ts-ignore
        cursor: 'pointer',
    },
    dropdownItemText: {
        fontSize: 14,
        fontWeight: '500',
    },

    // Grid
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
    itemTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6,
    },
    itemTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        flex: 1,
    },
    itemSubtitle: {
        fontSize: 14,
    },
});
