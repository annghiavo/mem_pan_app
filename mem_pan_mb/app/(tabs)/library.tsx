import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, RefreshControl, useColorScheme, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getDecks, getFolders, getAllLibraryDecks } from '../../services/api';
import { PlusDeckBadge, isPlusDeck } from '../../components/ui/PlusDeckBadge';

const DECK_FILTER_OPTIONS = [
  { label: 'Tất cả', value: 'all' },
  { label: 'Đã tạo', value: 'created' },
];

export default function LibraryScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('Học phần');
  const [decks, setDecks] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deckFilter, setDeckFilter] = useState('all');
  const [showFilterModal, setShowFilterModal] = useState(false);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const theme = {
    background: isDark ? '#111111' : '#f8f9fa',
    surface: isDark ? '#1c1c1e' : '#ffffff',
    text: isDark ? '#f4f4f5' : '#1f2937',
    textMuted: isDark ? '#a1a1aa' : '#6b7280',
    border: isDark ? '#27272a' : '#f3f4f6',
    primary: '#5865F2',
    activeTabBg: isDark ? '#312e81' : '#EEF2FF',
    iconBg: isDark ? '#0c4a6e' : '#e0f2fe',
    folderBg: isDark ? '#3f3f46' : '#f3f4f6',
    moreBtn: isDark ? '#27272a' : '#f3f4f6',
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
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [activeTab]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  return (
    <>
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View style={styles.tabsContainer}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tab, 
                activeTab === tab && { backgroundColor: theme.activeTabBg, borderColor: theme.primary, borderWidth: 1 }
              ]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, { color: activeTab === tab ? theme.primary : theme.textMuted }]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={[styles.moreButton, { backgroundColor: theme.moreBtn }]}>
          <Ionicons name="ellipsis-horizontal" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
          }
        >
          {activeTab === 'Học phần' ? (
            <>
              <View style={styles.filterContainer}>
                <TouchableOpacity
                  onPress={() => setShowFilterModal(true)}
                  style={{ flexDirection: 'row', alignItems: 'center' }}
                >
                  <Text style={[styles.filterText, { color: theme.primary }]}>
                    {DECK_FILTER_OPTIONS.find(o => o.value === deckFilter)?.label ?? 'Tất cả'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={theme.primary} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.dateHeader, { color: theme.textMuted, fontSize: 13 }]}>
                {(() => {
                  const filtered = deckFilter === 'created' ? decks.filter(d => d._isOwned && !d._isCloned) : decks;
                  return `${filtered.length} học phần`;
                })()}
              </Text>
              {(() => {
                const filtered = deckFilter === 'created' ? decks.filter(d => d._isOwned && !d._isCloned) : decks;
                return filtered.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                      {deckFilter === 'created' ? 'Bạn chưa tạo học phần nào' : 'Chưa có học phần nào'}
                    </Text>
                  </View>
                ) : (
                  filtered.map((deck) => (
                    <TouchableOpacity key={deck.deckId} style={[styles.itemCard, { backgroundColor: theme.surface, shadowColor: isDark ? 'transparent' : '#000' }]} onPress={() => router.push(`/module/${deck.deckId}` as any)}>
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
                    </TouchableOpacity>
                  ))
                );
              })()}
            </>
          ) : null}

          {activeTab === 'Thư mục' ? (
            <>
              {folders.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyText, { color: theme.textMuted }]}>Chưa có thư mục nào</Text>
                </View>
              ) : (
                folders.map((folder) => (
                  <TouchableOpacity key={folder.folderId} style={[styles.itemCard, { backgroundColor: theme.surface, shadowColor: isDark ? 'transparent' : '#000' }]} onPress={() => router.push(`/folder/${folder.folderId}` as any)}>
                    <View style={[styles.folderIconContainer, { backgroundColor: theme.folderBg }]}>
                      <Ionicons name="folder-outline" size={24} color={theme.textMuted} />
                    </View>
                    <View style={styles.itemInfo}>
                      <Text style={[styles.itemTitle, { color: theme.text }]} numberOfLines={1}>{folder.name}</Text>
                      <Text style={[styles.itemSubtitle, { color: theme.textMuted }]}>Thư mục</Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </>
          ) : null}
          
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </SafeAreaView>

    {/* Filter picker modal */}
    <Modal
      visible={showFilterModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowFilterModal(false)}
    >
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 }}
        activeOpacity={1}
        onPress={() => setShowFilterModal(false)}
      >
        <View style={{ width: '100%', maxWidth: 320, backgroundColor: theme.surface, borderRadius: 16, overflow: 'hidden' }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text, padding: 16, paddingBottom: 8 }}>Hiển thị</Text>
          {DECK_FILTER_OPTIONS.map((opt, idx) => (
            <TouchableOpacity
              key={opt.value}
              onPress={() => { setDeckFilter(opt.value); setShowFilterModal(false); }}
              style={[
                { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
                idx < DECK_FILTER_OPTIONS.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
                opt.value === deckFilter && { backgroundColor: isDark ? 'rgba(88,101,242,0.15)' : 'rgba(88,101,242,0.08)' },
              ]}
            >
              <Text style={{ fontSize: 16, color: opt.value === deckFilter ? theme.primary : theme.text, fontWeight: opt.value === deckFilter ? '600' : '400' }}>
                {opt.label}
              </Text>
              {opt.value === deckFilter && <Ionicons name="checkmark" size={20} color={theme.primary} />}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
    </>
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
  tabsContainer: {
    flexDirection: 'row',
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
  },
  moreButton: {
    padding: 8,
    borderRadius: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
  scrollContent: {
    padding: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  filterText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 4,
  },
  dateHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    marginTop: 8,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
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
    marginBottom: 4,
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
