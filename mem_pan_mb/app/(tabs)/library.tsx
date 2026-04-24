import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function LibraryScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('Học phần');

  const tabs = ['Học phần', 'Lớp học', 'Thư mục'];

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

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {activeTab === 'Học phần' && (
          <>
            <View style={styles.filterContainer}>
              <Text style={styles.filterText}>Tất cả</Text>
              <Ionicons name="chevron-down" size={16} color="#6b7280" />
            </View>
            <Text style={styles.dateHeader}>Hôm nay</Text>
            <TouchableOpacity style={styles.itemCard} onPress={() => router.push('/module/1' as any)}>
              <View style={styles.itemIconContainer}>
                <Ionicons name="albums-outline" size={24} color="#0284c7" />
              </View>
              <View style={styles.itemInfo}>
                <Text style={styles.itemTitle}>TOEIC: Intermediate Personal...</Text>
                <Text style={styles.itemSubtitle}>Học phần • 69 thuật ngữ • Tác giả: Quizlet</Text>
              </View>
            </TouchableOpacity>

            <Text style={styles.dateHeader}>tháng 3 năm 2026</Text>
            <TouchableOpacity style={styles.itemCard} onPress={() => router.push('/module/2' as any)}>
              <View style={styles.itemIconContainer}>
                <Ionicons name="albums-outline" size={24} color="#0284c7" />
              </View>
              <View style={styles.itemInfo}>
                <Text style={styles.itemTitle}>KANJI MARUGOTO A2-3 TO...</Text>
                <Text style={styles.itemSubtitle}>Học phần • 544 thuật ngữ • Tác giả: bạn</Text>
              </View>
            </TouchableOpacity>
          </>
        )}

        {activeTab === 'Thư mục' && (
          <>
            <TouchableOpacity style={styles.itemCard} onPress={() => router.push('/folder/1' as any)}>
              <View style={styles.folderIconContainer}>
                <Ionicons name="folder-outline" size={24} color="#4b5563" />
              </View>
              <View style={styles.itemInfo}>
                <Text style={styles.itemTitle}>A2-3 MARUGOTO VOCABUL...</Text>
                <Text style={styles.itemSubtitle}>Thư mục • Tác giả: bạn</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.itemCard} onPress={() => router.push('/folder/2' as any)}>
              <View style={styles.folderIconContainer}>
                <Ionicons name="folder-outline" size={24} color="#4b5563" />
              </View>
              <View style={styles.itemInfo}>
                <Text style={styles.itemTitle}>A2-3 MARUGOTO KANJI</Text>
                <Text style={styles.itemSubtitle}>Thư mục • Tác giả: bạn</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.itemCard} onPress={() => router.push('/folder/3' as any)}>
              <View style={styles.folderIconContainer}>
                <Ionicons name="folder-outline" size={24} color="#4b5563" />
              </View>
              <View style={styles.itemInfo}>
                <Text style={styles.itemTitle}>N-3</Text>
                <Text style={styles.itemSubtitle}>Thư mục • Tác giả: bạn</Text>
              </View>
            </TouchableOpacity>
          </>
        )}
        
        {/* Lớp học is empty for now */}
        {activeTab === 'Lớp học' && (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Text style={{ color: '#6b7280' }}>Chưa có lớp học nào</Text>
          </View>
        )}
        
        <View style={{ height: 100 }} />
      </ScrollView>
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
