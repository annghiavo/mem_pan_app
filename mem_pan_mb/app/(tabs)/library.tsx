import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { getDecks, getFolders } from '../../services/api';

export default function LibraryScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('Học phần');
  const [decks, setDecks] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
      console.error('Error fetching data:', error);
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.tabsContainer}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-horizontal" size={24} color="#1f2937" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#5865F2" />
        </View>
      ) : (
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {activeTab === 'Học phần' && (
            <>
              <View style={styles.filterContainer}>
                <Text style={styles.filterText}>Tất cả</Text>
                <Ionicons name="chevron-down" size={16} color="#6b7280" />
              </View>
              <Text style={styles.dateHeader}>Gần đây</Text>
              {decks.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Chưa có học phần nào</Text>
                </View>
              ) : (
                decks.map((deck) => (
                  <TouchableOpacity key={deck.deckId} style={styles.itemCard} onPress={() => router.push(`/module/${deck.deckId}` as any)}>
                    <View style={styles.itemIconContainer}>
                      <Ionicons name="albums-outline" size={24} color="#0284c7" />
                    </View>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemTitle} numberOfLines={1}>{deck.name}</Text>
                      <Text style={styles.itemSubtitle}>Học phần • {deck.cardCount || 0} thuật ngữ</Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </>
          )}

          {activeTab === 'Thư mục' && (
            <>
              {folders.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Chưa có thư mục nào</Text>
                </View>
              ) : (
                folders.map((folder) => (
                  <TouchableOpacity key={folder.folderId} style={styles.itemCard} onPress={() => router.push(`/folder/${folder.folderId}` as any)}>
                    <View style={styles.folderIconContainer}>
                      <Ionicons name="folder-outline" size={24} color="#4b5563" />
                    </View>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemTitle} numberOfLines={1}>{folder.name}</Text>
                      <Text style={styles.itemSubtitle}>Thư mục</Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </>
          )}
          

          
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor: '#ffffff',
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
  activeTab: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#5865F2',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
  },
  activeTabText: {
    color: '#5865F2',
  },
  moreButton: {
    padding: 8,
    backgroundColor: '#f3f4f6',
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
    color: '#6b7280',
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
    color: '#4b5563',
    marginRight: 4,
  },
  dateHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4b5563',
    marginBottom: 12,
    marginTop: 8,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  itemIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: '#e0f2fe',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  folderIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: '#f3f4f6',
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
    color: '#1f2937',
    marginBottom: 4,
  },
  itemSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
});
