import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getDeck, getDeckCards } from '../../services/api';

export default function ModuleDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [deckData, setDeckData] = useState<any>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDeckData = async () => {
      try {
        const [deckRes, cardsRes] = await Promise.all([
          getDeck(id as string),
          getDeckCards(id as string)
        ]);
        setDeckData(deckRes.deck);
        setCards(cardsRes.cards || []);
      } catch (error) {
        console.error('Error fetching deck:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDeckData();
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#5865F2" />
      </SafeAreaView>
    );
  }

  if (!deckData) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text>Không tìm thấy học phần</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: '#5865F2' }}>Quay lại</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

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
        {cards.length > 0 ? (
          <TouchableOpacity 
            style={styles.flashcardPreview} 
            onPress={() => router.push(`/flashcard/${id}` as any)}
          >
            <Text style={styles.flashcardWord}>{cards[0].contentFront}</Text>
            <Ionicons name="scan-outline" size={20} color="#9ca3af" style={styles.fullscreenIcon} />
          </TouchableOpacity>
        ) : (
          <View style={styles.flashcardPreview}>
            <Text style={styles.flashcardWord}>Học phần trống</Text>
          </View>
        )}

        {/* Module Info */}
        <Text style={styles.moduleTitle}>{deckData.name}</Text>
        {deckData.description ? <Text style={styles.moduleDesc}>{deckData.description}</Text> : null}
        
        <View style={styles.authorContainer}>
          <View style={styles.authorAvatar}>
            <Text style={styles.authorAvatarText}>Q</Text>
          </View>
          <Text style={styles.authorName}>Bạn</Text>
          <Ionicons name="checkmark-circle" size={16} color="#10b981" style={{ marginLeft: 4 }} />
          <Text style={styles.termCount}> | {cards.length} thuật ngữ</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={() => router.push(`/flashcard/${id}` as any)} disabled={cards.length === 0}>
            <Ionicons name="albums" size={24} color={cards.length > 0 ? "#3b82f6" : "#9ca3af"} />
            <Text style={[styles.actionButtonText, cards.length === 0 && { color: '#9ca3af' }]}>Flashcard</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => router.push(`/quiz/${id}` as any)} disabled={cards.length === 0}>
            <Ionicons name="refresh-circle" size={24} color={cards.length > 0 ? "#8b5cf6" : "#9ca3af"} />
            <Text style={[styles.actionButtonText, cards.length === 0 && { color: '#9ca3af' }]}>Câu hỏi ôn tập</Text>
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
              <Text style={styles.statNumber}>{cards.length}</Text>
            </View>
            <Text style={styles.statLabel}>Chưa học</Text>
            <Ionicons name="arrow-forward" size={20} color="#9ca3af" />
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statRing, { borderColor: '#f59e0b', borderRightColor: '#f3f4f6' }]}>
              <Text style={styles.statNumber}>0</Text>
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
          <Text style={styles.sectionTitle}>Thuật ngữ ({cards.length})</Text>
          <Text style={styles.sortText}>Thứ tự gốc <Ionicons name="filter" size={14} /></Text>
        </View>
        
        {cards.map((item) => (
          <View key={item.cardId} style={styles.termCard}>
            <View style={styles.termCardHeader}>
              <Text style={styles.termWord}>{item.contentFront}</Text>
              <View style={styles.termActions}>
                <TouchableOpacity style={{ marginRight: 16 }}>
                  <Ionicons name="volume-medium" size={24} color="#4b5563" />
                </TouchableOpacity>
                <TouchableOpacity>
                  <Ionicons name="star-outline" size={24} color="#4b5563" />
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.termDefinition}>{item.contentBack}</Text>
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
  flashcardWord: { fontSize: 28, fontWeight: '500', color: '#1f2937', textAlign: 'center', paddingHorizontal: 20 },
  fullscreenIcon: { position: 'absolute', bottom: 16, right: 16 },
  moduleTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  moduleDesc: { fontSize: 16, color: '#4b5563', marginBottom: 12 },
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
