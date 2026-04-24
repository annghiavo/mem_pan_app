import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getFolder } from '../../services/api';

export default function FolderDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [folderData, setFolderData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFolder = async () => {
      try {
        const res = await getFolder(id as string);
        setFolderData(res.data);
      } catch (error) {
        console.error('Error fetching folder:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchFolder();
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#5865F2" />
      </SafeAreaView>
    );
  }

  if (!folderData || !folderData.folder) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text>Không tìm thấy thư mục</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: '#5865F2' }}>Quay lại</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const { folder, decks } = folderData;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="ellipsis-horizontal" size={24} color="#1f2937" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.folderHeader}>
          <Text style={styles.folderTitle}>{folder.name}</Text>
          <View style={styles.authorInfo}>
            <View style={styles.avatar}><Text style={styles.avatarText}>B</Text></View>
            <Text style={styles.authorName}>bạn</Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>{decks?.length || 0} Học phần</Text>
        </View>

        {/* Modules in folder */}
        {decks && decks.length > 0 ? decks.map((item: any) => (
          <TouchableOpacity key={item.deckId} style={styles.moduleCard} onPress={() => router.push(`/module/${item.deckId}` as any)}>
            <View style={styles.moduleContent}>
              <Text style={styles.moduleTitle}>{item.name}</Text>
              <Text style={styles.moduleSubtitle}>{item.cardCount || 0} thuật ngữ • bạn</Text>
            </View>
            <View style={styles.moduleIcon}>
              <Ionicons name="albums-outline" size={24} color="#4b5563" />
            </View>
          </TouchableOpacity>
        )) : (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Text style={{ color: '#6b7280' }}>Chưa có học phần nào trong thư mục này</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  iconButton: { padding: 8, backgroundColor: '#ffffff', borderRadius: 20 },
  scrollContent: { padding: 16 },
  folderHeader: { marginBottom: 24 },
  folderTitle: { fontSize: 26, fontWeight: 'bold', color: '#111827', marginBottom: 12 },
  authorInfo: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#0ea5e9', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  avatarText: { color: '#ffffff', fontSize: 12, fontWeight: 'bold' },
  authorName: { fontSize: 16, fontWeight: '500', color: '#4b5563' },
  statsContainer: { marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  statsText: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  moduleCard: { flexDirection: 'row', backgroundColor: '#ffffff', padding: 16, borderRadius: 12, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  moduleContent: { flex: 1 },
  moduleTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginBottom: 8 },
  moduleSubtitle: { fontSize: 14, color: '#6b7280' },
  moduleIcon: { justifyContent: 'center', alignItems: 'center', paddingLeft: 16 }
});
