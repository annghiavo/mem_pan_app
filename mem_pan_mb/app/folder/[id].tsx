import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function FolderDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

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
          <Text style={styles.folderTitle}>A2-3 MARUGOTO VOCABULARY</Text>
          <View style={styles.authorInfo}>
            <View style={styles.avatar}><Text style={styles.avatarText}>B</Text></View>
            <Text style={styles.authorName}>bạn</Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>3 Học phần</Text>
        </View>

        {/* Modules in folder */}
        {[1, 2, 3].map((item) => (
          <TouchableOpacity key={item} style={styles.moduleCard} onPress={() => router.push(`/module/${item}` as any)}>
            <View style={styles.moduleContent}>
              <Text style={styles.moduleTitle}>Bài {item} - Từ vựng</Text>
              <Text style={styles.moduleSubtitle}>{item * 20 + 15} thuật ngữ • bạn</Text>
            </View>
            <View style={styles.moduleIcon}>
              <Ionicons name="albums-outline" size={24} color="#4b5563" />
            </View>
          </TouchableOpacity>
        ))}
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
