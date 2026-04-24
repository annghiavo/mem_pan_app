import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function ModuleDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const terms = [
    { id: '1', term: 'ambitious', pos: 'adjective', definition: 'Describing someone or something that wants to succeed.' },
    { id: '2', term: 'creative', pos: 'adjective', definition: 'Relating to or involving the imagination or original ideas.' },
    { id: '3', term: 'diligent', pos: 'adjective', definition: 'Having or showing care and conscientiousness in one\'s work or duties.' }
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="bookmark-outline" size={24} color="#1f2937" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="ellipsis-horizontal" size={24} color="#1f2937" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Flashcard Preview */}
        <TouchableOpacity 
          style={styles.flashcardPreview} 
          onPress={() => router.push(`/flashcard/${id}` as any)}
        >
          <Text style={styles.flashcardWord}>ambitious</Text>
          <Ionicons name="scan-outline" size={20} color="#9ca3af" style={styles.fullscreenIcon} />
        </TouchableOpacity>

        {/* Module Info */}
        <Text style={styles.moduleTitle}>TOEIC: Intermediate Personal Qualities Vocabulary Set 1</Text>
        <View style={styles.authorContainer}>
          <View style={styles.authorAvatar}>
            <Text style={styles.authorAvatarText}>Q</Text>
          </View>
          <Text style={styles.authorName}>Quizlet</Text>
          <Ionicons name="checkmark-circle" size={16} color="#10b981" style={{ marginLeft: 4 }} />
          <Text style={styles.termCount}> | 69 thuật ngữ</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={() => router.push(`/flashcard/${id}` as any)}>
            <Ionicons name="albums" size={24} color="#3b82f6" />
            <Text style={styles.actionButtonText}>Flashcard</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => router.push(`/quiz/${id}` as any)}>
            <Ionicons name="refresh-circle" size={24} color="#8b5cf6" />
            <Text style={styles.actionButtonText}>Câu hỏi ôn tập</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="document-text" size={24} color="#3b82f6" />
            <Text style={styles.actionButtonText}>Đề thi thử</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="copy" size={24} color="#06b6d4" />
            <Text style={styles.actionButtonText}>Nối 2 mặt thẻ</Text>
          </TouchableOpacity>
        </View>

        {/* Progress */}
        <Text style={styles.sectionTitle}>Tiến độ của bạn</Text>
        <Text style={styles.progressDesc}>
          Tiến độ của bạn dựa trên hai lần cuối cùng bạn học mỗi thuật ngữ ở tất cả các chế độ, ngoại trừ trò chơi.
        </Text>
        <View style={styles.progressStats}>
          <View style={styles.statCard}>
            <View style={[styles.statRing, { borderColor: '#5865F2' }]}>
              <Text style={styles.statNumber}>66</Text>
            </View>
            <Text style={styles.statLabel}>Chưa học</Text>
            <Ionicons name="arrow-forward" size={20} color="#9ca3af" />
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statRing, { borderColor: '#f59e0b', borderRightColor: '#f3f4f6' }]}>
              <Text style={styles.statNumber}>3</Text>
            </View>
            <Text style={styles.statLabel}>Đang học</Text>
            <Ionicons name="arrow-forward" size={20} color="#9ca3af" />
          </View>
          <View style={[styles.statCard, { opacity: 0.5 }]}>
            <View style={[styles.statRing, { borderColor: '#d1d5db' }]}>
              <Text style={styles.statNumber}>0</Text>
            </View>
            <Text style={styles.statLabel}>Thành thạo</Text>
            <Ionicons name="arrow-forward" size={20} color="#9ca3af" />
          </View>
        </View>

        {/* Terms List */}
        <View style={styles.termsHeader}>
          <Text style={styles.sectionTitle}>Thuật ngữ</Text>
          <Text style={styles.sortText}>Thứ tự gốc <Ionicons name="filter" size={14} /></Text>
        </View>
        
        {terms.map((item) => (
          <View key={item.id} style={styles.termCard}>
            <View style={styles.termCardHeader}>
              <Text style={styles.termWord}>{item.term}</Text>
              <View style={styles.termActions}>
                <TouchableOpacity style={{ marginRight: 16 }}>
                  <Ionicons name="volume-medium" size={24} color="#4b5563" />
                </TouchableOpacity>
                <TouchableOpacity>
                  <Ionicons name="star-outline" size={24} color="#4b5563" />
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.termDefinition}>({item.pos}) {item.definition}</Text>
          </View>
        ))}
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  iconButton: { padding: 8, backgroundColor: '#ffffff', borderRadius: 20, marginLeft: 8 },
  headerRight: { flexDirection: 'row' },
  scrollContent: { padding: 16 },
  flashcardPreview: { backgroundColor: '#ffffff', height: 220, borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3, marginBottom: 24, position: 'relative' },
  flashcardWord: { fontSize: 28, fontWeight: '500', color: '#1f2937' },
  fullscreenIcon: { position: 'absolute', bottom: 16, right: 16 },
  moduleTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 12 },
  authorContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  authorAvatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#5865F2', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  authorAvatarText: { color: '#ffffff', fontSize: 12, fontWeight: 'bold' },
  authorName: { fontSize: 16, fontWeight: '600', color: '#374151' },
  termCount: { fontSize: 16, color: '#6b7280' },
  actionsContainer: { marginBottom: 32 },
  actionButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', padding: 16, borderRadius: 12, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  actionButtonText: { marginLeft: 16, fontSize: 16, fontWeight: '600', color: '#374151', flex: 1 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 12 },
  progressDesc: { fontSize: 15, color: '#4b5563', lineHeight: 22, marginBottom: 16 },
  progressStats: { marginBottom: 32 },
  statCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', padding: 16, borderRadius: 12, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  statRing: { width: 40, height: 40, borderRadius: 20, borderWidth: 3, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  statNumber: { fontSize: 14, fontWeight: 'bold', color: '#1f2937' },
  statLabel: { flex: 1, fontSize: 16, fontWeight: '600', color: '#374151' },
  termsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sortText: { fontSize: 14, color: '#6b7280', fontWeight: '500' },
  termCard: { backgroundColor: '#ffffff', padding: 16, borderRadius: 12, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  termCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  termWord: { fontSize: 18, fontWeight: '500', color: '#1f2937', flex: 1 },
  termActions: { flexDirection: 'row' },
  termDefinition: { fontSize: 16, color: '#374151', lineHeight: 24 }
});
