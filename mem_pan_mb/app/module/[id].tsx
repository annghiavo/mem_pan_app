import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, Modal, TextInput, Alert, useColorScheme, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getDeck, getDeckCards, getDeckProgress, getDueCards, deleteDeck, updateDeck, getFolders, addDeckToFolder, deleteCard } from '../../services/api';

const langNameMap: Record<string, string> = {
  vi: 'Tiếng Việt',
  en: 'Tiếng Anh',
  es: 'Tiếng Tây Ban Nha',
  fr: 'Tiếng Pháp',
  it: 'Tiếng Ý',
  de: 'Tiếng Đức',
  ru: 'Tiếng Nga',
  ja: 'Tiếng Nhật',
  ja_romaji: 'Tiếng Nhật (Romaji)',
  zh_hans: 'Tiếng Trung (Giản thể)',
  zh_hant: 'Tiếng Trung (Phồn thể)',
  zh_pinyin: 'Tiếng Trung (Pinyin)',
  ko: 'Tiếng Hàn',
};

export default function ModuleDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const theme = {
    background: isDark ? '#111111' : '#f8f9fa',
    surface: isDark ? '#1c1c1e' : '#ffffff',
    text: isDark ? '#f4f4f5' : '#111827',
    textMuted: isDark ? '#a1a1aa' : '#6b7280',
    border: isDark ? '#27272a' : '#f3f4f6',
    primary: '#5865F2',
    iconBg: isDark ? '#27272a' : '#ffffff',
    iconColor: isDark ? '#f4f4f5' : '#1f2937',
  };

  const [deckData, setDeckData] = useState<any>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [progress, setProgress] = useState<any>(null);
  const [dueCount, setDueCount] = useState<number>(0);
  const [creatorUsername, setCreatorUsername] = useState<string>('');
  const [creatorAvatar, setCreatorAvatar] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Modal States
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFolderSelectModal, setShowFolderSelectModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [folders, setFolders] = useState<any[]>([]);

  useEffect(() => {
    const fetchDeckData = async () => {
      try {
        const [deckRes, cardsRes, progressRes, dueRes] = await Promise.all([
          getDeck(id as string),
          getDeckCards(id as string),
          getDeckProgress(id as string).catch(() => null),
          getDueCards(id as string).catch(() => ({ total: 0 }))
        ]);
        setDeckData(deckRes.deck);
        setCreatorUsername(deckRes.creatorUsername || '');
        setCreatorAvatar(deckRes.creatorAvatar || '');
        setCards(cardsRes.cards || []);
        setProgress(progressRes || { newCount: cardsRes.cards?.length || 0, studyingCount: 0, memorizedCount: 0 });
        setDueCount(dueRes?.total || 0);
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
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </SafeAreaView>
    );
  }

  const handleDeleteDeck = async () => {
    Alert.alert('Xác nhận', 'Bạn có chắc chắn muốn xóa học phần này?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: async () => {
        try {
          await deleteDeck(id as string);
          setShowOptionsModal(false);
          router.replace('/(tabs)/library' as any);
        } catch (error: any) {
          Alert.alert('Lỗi', error.message || 'Không thể xóa học phần');
        }
      }}
    ]);
  };

  const handleUpdateDeck = async () => {
    try {
      await updateDeck(id as string, editName, editDesc);
      setDeckData({ ...deckData, name: editName, description: editDesc });
      setShowEditModal(false);
      setShowOptionsModal(false);
      Alert.alert('Thành công', 'Đã cập nhật học phần');
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể cập nhật học phần');
    }
  };

  const handleOpenFolderSelect = async () => {
    setShowOptionsModal(false);
    try {
      const res = await getFolders();
      setFolders(res.folders || []);
      setShowFolderSelectModal(true);
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể tải danh sách thư mục');
    }
  };

  const handleAddToFolder = async (folderId: string) => {
    try {
      await addDeckToFolder(folderId, id as string);
      setShowFolderSelectModal(false);
      Alert.alert('Thành công', 'Đã thêm học phần vào thư mục');
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể thêm vào thư mục');
    }
  };

  if (!deckData) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: theme.text }}>Không tìm thấy học phần</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: theme.primary }}>Quay lại</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.iconButton, { backgroundColor: theme.iconBg }]}>
          <Ionicons name="arrow-back" size={24} color={theme.iconColor} />
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <TouchableOpacity style={[styles.iconButton, { backgroundColor: theme.iconBg }]}>
            <Ionicons name="bookmark-outline" size={24} color={theme.iconColor} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconButton, { backgroundColor: theme.iconBg }]} onPress={() => setShowOptionsModal(true)}>
            <Ionicons name="ellipsis-horizontal" size={24} color={theme.iconColor} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Flashcard Preview */}
        {cards.length > 0 ? (
          <TouchableOpacity 
            style={[styles.flashcardPreview, { backgroundColor: theme.surface, shadowColor: isDark ? 'transparent' : '#000' }]} 
            onPress={() => router.push(`/flashcard/${id}` as any)}
          >
            <Text style={[styles.flashcardWord, { color: theme.text }]}>{cards[0].contentFront}</Text>
            <Ionicons name="scan-outline" size={20} color={theme.textMuted} style={styles.fullscreenIcon} />
          </TouchableOpacity>
        ) : (
          <View style={[styles.flashcardPreview, { backgroundColor: theme.surface, shadowColor: isDark ? 'transparent' : '#000' }]}>
            <Text style={[styles.flashcardWord, { color: theme.text }]}>Học phần trống</Text>
          </View>
        )}

        {/* Module Info */}
        <Text style={[styles.moduleTitle, { color: theme.text }]}>{deckData.name}</Text>
        {deckData.description ? <Text style={[styles.moduleDesc, { color: theme.textMuted }]}>{deckData.description}</Text> : null}
        
        <View style={styles.authorContainer}>
          {creatorAvatar ? (
            <Image source={{ uri: creatorAvatar }} style={styles.authorAvatarImage} />
          ) : (
            <View style={styles.authorAvatar}>
              <Text style={styles.authorAvatarText}>{(creatorUsername || 'U').charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <Text style={[styles.authorName, { color: theme.text }]}>{creatorUsername || 'Bạn'}</Text>
          <Ionicons name="checkmark-circle" size={16} color="#10b981" style={{ marginLeft: 4 }} />
          <Text style={[styles.termCount, { color: theme.textMuted }]}> | {cards.length} thuật ngữ</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.surface, shadowColor: isDark ? 'transparent' : '#000' }]} onPress={() => router.push(`/flashcard/${id}` as any)} disabled={cards.length === 0}>
            <Ionicons name="albums" size={24} color={cards.length > 0 ? "#3b82f6" : theme.textMuted} />
            <Text style={[styles.actionButtonText, { color: theme.text }, cards.length === 0 && { color: theme.textMuted }]}>Flashcard</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.surface, shadowColor: isDark ? 'transparent' : '#000' }]} onPress={() => router.push(`/quiz/${id}` as any)} disabled={cards.length === 0}>
            <Ionicons name="refresh-circle" size={24} color={cards.length > 0 ? "#8b5cf6" : theme.textMuted} />
            <Text style={[styles.actionButtonText, { color: theme.text }, cards.length === 0 && { color: theme.textMuted }]}>Câu hỏi ôn tập</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.surface, shadowColor: isDark ? 'transparent' : '#000' }]} onPress={() => router.push(`/practice-setup/${id}` as any)} disabled={cards.length === 0}>
            <Ionicons name="document-text" size={24} color={cards.length > 0 ? "#10b981" : theme.textMuted} />
            <Text style={[styles.actionButtonText, { color: theme.text }, cards.length === 0 && { color: theme.textMuted }]}>Bài kiểm tra</Text>
          </TouchableOpacity>
        </View>

        {/* Progress */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Tiến độ của bạn</Text>
        <Text style={[styles.progressDesc, { color: theme.textMuted }]}>
          Số thẻ cần ôn hiện tại: <Text style={{fontWeight: 'bold', color: '#f59e0b'}}>{dueCount}</Text> thẻ
        </Text>
        <View style={styles.progressStats}>
          <View style={[styles.statCard, { backgroundColor: theme.surface, shadowColor: isDark ? 'transparent' : '#000' }]}>
            <View style={[styles.statRing, { borderColor: '#5865F2' }]}>
              <Text style={[styles.statNumber, { color: theme.text }]}>{progress?.newCount || 0}</Text>
            </View>
            <Text style={[styles.statLabel, { color: theme.text }]}>Chưa học</Text>
            <Ionicons name="arrow-forward" size={20} color={theme.textMuted} />
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.surface, shadowColor: isDark ? 'transparent' : '#000' }]}>
            <View style={[styles.statRing, { borderColor: '#f59e0b', borderRightColor: isDark ? '#3f3f46' : '#f3f4f6' }]}>
              <Text style={[styles.statNumber, { color: theme.text }]}>{progress?.studyingCount || 0}</Text>
            </View>
            <Text style={[styles.statLabel, { color: theme.text }]}>Đang học</Text>
            <Ionicons name="arrow-forward" size={20} color={theme.textMuted} />
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.surface, shadowColor: isDark ? 'transparent' : '#000' }, { opacity: (progress?.memorizedCount || 0) > 0 ? 1 : 0.5 }]}>
            <View style={[styles.statRing, { borderColor: '#10b981' }]}>
              <Text style={[styles.statNumber, { color: theme.text }]}>{progress?.memorizedCount || 0}</Text>
            </View>
            <Text style={[styles.statLabel, { color: theme.text }]}>Thành thạo</Text>
            <Ionicons name="arrow-forward" size={20} color={theme.textMuted} />
          </View>
        </View>

        {/* Terms List */}
        <View style={styles.termsHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Thuật ngữ ({cards.length})</Text>
          <Text style={[styles.sortText, { color: theme.textMuted }]}>Thứ tự gốc <Ionicons name="filter" size={14} /></Text>
        </View>
        
        {cards.map((item) => (
          <View key={item.cardId} style={[styles.termCard, { backgroundColor: theme.surface, shadowColor: isDark ? 'transparent' : '#000' }]}>
            <View style={styles.termCardHeader}>
              <View style={{ flex: 1 }}>
                {item.langFront ? (
                  <Text style={[styles.termLangLabel, { color: theme.primary }]}>{langNameMap[item.langFront] || item.langFront}</Text>
                ) : null}
                <Text style={[styles.termWord, { color: theme.text }]}>{item.contentFront}</Text>
              </View>
              <View style={styles.termActions}>
                <TouchableOpacity style={{ marginRight: 16 }}>
                  <Ionicons name="volume-medium" size={24} color={theme.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity>
                  <Ionicons name="star-outline" size={24} color={theme.textMuted} />
                </TouchableOpacity>
              </View>
            </View>
            {item.langBack ? (
              <Text style={[styles.termLangLabel, { color: theme.primary, marginTop: 8 }]}>{langNameMap[item.langBack] || item.langBack}</Text>
            ) : null}
            <Text style={[styles.termDefinition, { color: theme.textMuted }]}>{item.contentBack}</Text>
          </View>
        ))}
        
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Options Modal */}
      <Modal visible={showOptionsModal} transparent={true} animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowOptionsModal(false)}>
          <View style={[styles.bottomSheet, { backgroundColor: theme.surface }]}>
            <View style={[styles.bottomSheetHandle, { backgroundColor: theme.border }]} />
            <TouchableOpacity style={[styles.optionItem, { borderBottomColor: theme.border }]} onPress={handleOpenFolderSelect}>
              <Ionicons name="folder-outline" size={24} color={theme.textMuted} />
              <Text style={[styles.optionText, { color: theme.text }]}>Thêm vào thư mục</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.optionItem, { borderBottomColor: theme.border }]} onPress={() => {
              setEditName(deckData.name);
              setEditDesc(deckData.description || '');
              setShowOptionsModal(false);
              setShowEditModal(true);
            }}>
              <Ionicons name="pencil-outline" size={24} color={theme.textMuted} />
              <Text style={[styles.optionText, { color: theme.text }]}>Sửa</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.optionItem, { borderBottomColor: theme.border }]}>
              <Ionicons name="share-social-outline" size={24} color={theme.textMuted} />
              <Text style={[styles.optionText, { color: theme.text }]}>Chia sẻ</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.optionItem, { borderBottomColor: theme.border }]} onPress={handleDeleteDeck}>
              <Ionicons name="trash-outline" size={24} color="#ef4444" />
              <Text style={[styles.optionText, { color: '#ef4444' }]}>Xóa</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit Deck Modal */}
      <Modal visible={showEditModal} transparent={true} animationType="slide">
        <View style={[styles.fullScreenModal, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <Text style={[styles.cancelText, { color: theme.textMuted }]}>Hủy</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Sửa học phần</Text>
            <TouchableOpacity onPress={handleUpdateDeck}>
              <Text style={styles.saveText}>Lưu</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>Tên học phần</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
              value={editName}
              onChangeText={setEditName}
              placeholder="Nhập tên học phần"
              placeholderTextColor={theme.textMuted}
            />
            <Text style={[styles.inputLabel, { color: theme.text }]}>Mô tả</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
              value={editDesc}
              onChangeText={setEditDesc}
              placeholder="Nhập mô tả"
              placeholderTextColor={theme.textMuted}
              multiline
            />
          </View>
        </View>
      </Modal>

      {/* Select Folder Modal */}
      <Modal visible={showFolderSelectModal} transparent={true} animationType="slide">
        <View style={[styles.fullScreenModal, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => setShowFolderSelectModal(false)}>
              <Text style={[styles.cancelText, { color: theme.textMuted }]}>Đóng</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Thêm vào thư mục</Text>
            <View style={{ width: 40 }} />
          </View>
          <ScrollView style={styles.modalBody}>
            {folders.length === 0 ? (
              <Text style={{ textAlign: 'center', marginTop: 20, color: theme.textMuted }}>Bạn chưa có thư mục nào.</Text>
            ) : (
              folders.map((f) => (
                <TouchableOpacity key={f.folderId} style={[styles.folderSelectItem, { backgroundColor: theme.surface }]} onPress={() => handleAddToFolder(f.folderId)}>
                  <Ionicons name="folder-outline" size={24} color={theme.textMuted} />
                  <Text style={[styles.folderSelectItemText, { color: theme.text }]}>{f.name}</Text>
                  <Ionicons name="add-circle-outline" size={24} color={theme.primary} />
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  iconButton: { padding: 8, borderRadius: 20, marginLeft: 8 },
  headerRight: { flexDirection: 'row' },
  scrollContent: { padding: 16 },
  flashcardPreview: { height: 220, borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3, marginBottom: 24, position: 'relative' },
  flashcardWord: { fontSize: 28, fontWeight: '500', textAlign: 'center', paddingHorizontal: 20 },
  fullscreenIcon: { position: 'absolute', bottom: 16, right: 16 },
  moduleTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  moduleDesc: { fontSize: 16, marginBottom: 12 },
  authorContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  authorAvatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#5865F2', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  authorAvatarImage: { width: 24, height: 24, borderRadius: 12, marginRight: 8 },
  authorAvatarText: { color: '#ffffff', fontSize: 12, fontWeight: 'bold' },
  authorName: { fontSize: 16, fontWeight: '600' },
  termCount: { fontSize: 16 },
  actionsContainer: { marginBottom: 32 },
  actionButton: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 12, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  actionButtonText: { marginLeft: 16, fontSize: 16, fontWeight: '600', flex: 1 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  progressDesc: { fontSize: 15, lineHeight: 22, marginBottom: 16 },
  progressStats: { marginBottom: 32 },
  statCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 12, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  statRing: { width: 40, height: 40, borderRadius: 20, borderWidth: 3, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  statNumber: { fontSize: 14, fontWeight: 'bold' },
  statLabel: { flex: 1, fontSize: 16, fontWeight: '600' },
  termsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sortText: { fontSize: 14, fontWeight: '500' },
  termCard: { padding: 16, borderRadius: 12, marginBottom: 12, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  termCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  termWord: { fontSize: 18, fontWeight: '500', flex: 1 },
  termActions: { flexDirection: 'row' },
  termDefinition: { fontSize: 16, lineHeight: 24 },
  termLangLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  bottomSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  bottomSheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  optionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1 },
  optionText: { fontSize: 18, marginLeft: 16 },
  fullScreenModal: { flex: 1, paddingTop: 50 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1 },
  cancelText: { fontSize: 16 },
  saveText: { fontSize: 16, color: '#5865F2', fontWeight: 'bold' },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalBody: { padding: 16 },
  inputLabel: { fontSize: 16, fontWeight: '600', marginBottom: 8, marginTop: 16 },
  textInput: { padding: 16, borderRadius: 12, fontSize: 16, borderWidth: 1 },
  folderSelectItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 12 },
  folderSelectItemText: { flex: 1, fontSize: 16, marginLeft: 16 }
});
