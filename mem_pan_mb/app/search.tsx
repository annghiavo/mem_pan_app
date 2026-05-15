import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, FlatList, ActivityIndicator, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { SearchBar } from '@/components/ui/SearchBar';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { searchCards, searchDecks, searchFolders, searchUsers } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useRouter } from 'expo-router';
import { WebContainer } from '@/components/ui/WebContainer';

const TABS = ['Bộ thẻ', 'Thẻ', 'Thư mục', 'Người dùng'];

export default function SearchScreen() {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [activeTab, setActiveTab] = useState(0);
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const backgroundColor = useThemeColor({}, 'background');

    const fetchResults = useCallback(async () => {
        if (!query.trim()) {
            setResults([]);
            return;
        }
        setLoading(true);
        try {
            let res: any;
            let items: any[] = [];
            if (activeTab === 0) {
                res = await searchDecks(query);
                items = res.decks || [];
            } else if (activeTab === 1) {
                res = await searchCards(query);
                items = res.cards || [];
            } else if (activeTab === 2) {
                res = await searchFolders(query);
                items = res.folders || [];
            } else if (activeTab === 3) {
                res = await searchUsers(query);
                items = res.users || [];
            }
            setResults(items);
        } catch (e) {
            console.warn('Search error: ', e);
            setResults([]);
        } finally {
            setLoading(false);
        }
    }, [query, activeTab]);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchResults();
        }, 500);
        return () => clearTimeout(delayDebounceFn);
    }, [query, activeTab, fetchResults]);

    const renderItem = ({ item }: { item: any }) => {
        if (activeTab === 0) {
            return (
                <TouchableOpacity onPress={() => router.push(`/module/${item.deckId}` as any)}>
                    <ThemedView style={styles.card}>
                        <ThemedText style={styles.title}>{item.name}</ThemedText>
                        {item.description ? <ThemedText style={styles.desc} numberOfLines={2}>{item.description}</ThemedText> : null}
                        <ThemedText style={styles.meta}><Ionicons name="documents-outline" /> {item.cardCount || 0} cards</ThemedText>
                    </ThemedView>
                </TouchableOpacity>
            );
        } else if (activeTab === 1) {
            return (
                <TouchableOpacity onPress={() => router.push(`/module/${item.deckId}` as any)}>
                    <ThemedView style={styles.card}>
                        <ThemedText style={styles.title} numberOfLines={2}>{item.contentFront}</ThemedText>
                        <ThemedText style={styles.desc} numberOfLines={2}>{item.contentBack}</ThemedText>
                    </ThemedView>
                </TouchableOpacity>
            );
        } else if (activeTab === 2) {
            return (
                <TouchableOpacity onPress={() => router.push(`/folder/${item.folderId}` as any)}>
                    <ThemedView style={styles.card}>
                        <ThemedText style={styles.title}><Ionicons name="folder-outline" /> {item.name}</ThemedText>
                        {item.description ? <ThemedText style={styles.desc}>{item.description}</ThemedText> : null}
                    </ThemedView>
                </TouchableOpacity>
            );
        } else if (activeTab === 3) {
            return (
                <TouchableOpacity onPress={() => router.push(`/user/${item.userId}` as any)}>
                    <ThemedView style={styles.card}>
                        <ThemedText style={styles.title}>{item.fullName || item.username}</ThemedText>
                        <ThemedText style={styles.meta}>@{item.username}</ThemedText>
                    </ThemedView>
                </TouchableOpacity>
            );
        }
        return null;
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top', 'left', 'right']}>
            <WebContainer maxWidth={900}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={useThemeColor({}, 'text')} />
                    </TouchableOpacity>
                    <ThemedText type="title">Tìm kiếm</ThemedText>
                </View>

                <View style={styles.searchSection}>
                    <SearchBar
                        autoFocus={true}
                        value={query}
                        onChangeText={setQuery}
                        placeholder={`Tìm kiếm ${TABS[activeTab].toLowerCase()}...`}
                    />
                </View>

                <SegmentedControl
                    tabs={TABS}
                    activeIndex={activeTab}
                    onChange={setActiveTab}
                />
            </WebContainer>

            <WebContainer maxWidth={900} style={{ flex: 1 }}>
                {loading ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color="#5865F2" />
                    </View>
                ) : (
                    <FlatList
                        data={results}
                        keyExtractor={(item, index) => item.deckId || item.cardId || item.folderId || item.userId || index.toString()}
                        renderItem={renderItem}
                        contentContainerStyle={styles.list}
                        ListEmptyComponent={
                            query ? <View style={styles.center}><ThemedText>Không tìm thấy kết quả</ThemedText></View> : null
                        }
                    />
                )}
            </WebContainer>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 5,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        marginRight: 16,
    },
    searchSection: {
        paddingHorizontal: 20,
        paddingBottom: 10,
    },
    list: {
        padding: 20,
        paddingBottom: 100, // accommodate tab bar
    },
    card: {
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#eaeaea',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    desc: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
    },
    meta: {
        fontSize: 12,
        color: '#999',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 50,
    }
});
