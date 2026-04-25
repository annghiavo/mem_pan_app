import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, Modal, TextInput, Alert, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getFolder, deleteFolder, updateFolder } from '../../services/api';

export default function FolderDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const theme = {
    background: isDark ? '#111111' : '#f8f9fa',
    surface: isDark ? '#1c1c1e' : '#ffffff',
    text: isDark ? '#f4f4f5' : '#111827',
    textMuted: isDark ? '#a1a1aa' : '#6b7280',
    border: isDark ? '#27272a' : '#e5e7eb',
    iconBg: isDark ? '#27272a' : '#ffffff',
    iconColor: isDark ? '#f4f4f5' : '#1f2937',
    primary: '#5865F2',
  };

  const [folderData, setFolderData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

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
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </SafeAreaView>
    );
  }

  const handleDeleteFolder = async () => {
    Alert.alert('Xác nhận', 'Bạn có chắc chắn muốn xóa thư mục này?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: async () => {
        try {
          await deleteFolder(id as string);
          setShowOptionsModal(false);
          router.replace('/(tabs)/library' as any);
        } catch (error: any) {
          Alert.alert('Lỗi', error.message || 'Không thể xóa thư mục');
        }
      }}
    ]);
  };

  const handleUpdateFolder = async () => {
    try {
      await updateFolder(id as string, editName, editDesc);
      setFolderData({ ...folderData, folder: { ...folderData.folder, name: editName, description: editDesc } });
      setShowEditModal(false);
      setShowOptionsModal(false);
      Alert.alert('Thành công', 'Đã cập nhật thư mục');
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể cập nhật thư mục');
    }
  };

  if (!folderData || !folderData.folder) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: theme.text }}>Không tìm thấy thư mục</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: theme.primary }}>Quay lại</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const { folder, decks } = folderData;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.iconButton, { backgroundColor: theme.iconBg }]}>
          <Ionicons name="arrow-back" size={24} color={theme.iconColor} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.iconButton, { backgroundColor: theme.iconBg }]} onPress={() => setShowOptionsModal(true)}>
          <Ionicons name="ellipsis-horizontal" size={24} color={theme.iconColor} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.folderHeader}>
          <Text style={[styles.folderTitle, { color: theme.text }]}>{folder.name}</Text>
          <View style={styles.authorInfo}>
            <View style={styles.avatar}><Text style={styles.avatarText}>B</Text></View>
            <Text style={[styles.authorName, { color: theme.textMuted }]}>bạn</Text>
          </View>
        </View>

        <View style={[styles.statsContainer, { borderBottomColor: theme.border }]}>
          <Text style={[styles.statsText, { color: theme.text }]}>{decks?.length || 0} Học phần</Text>
        </View>

        {/* Modules in folder */}
        {decks && decks.length > 0 ? decks.map((item: any) => (
          <TouchableOpacity key={item.deckId} style={[styles.moduleCard, { backgroundColor: theme.surface }]} onPress={() => router.push(`/module/${item.deckId}` as any)}>
            <View style={styles.moduleContent}>
              <Text style={[styles.moduleTitle, { color: theme.text }]}>{item.name}</Text>
              <Text style={[styles.moduleSubtitle, { color: theme.textMuted }]}>{item.cardCount || 0} thuật ngữ • bạn</Text>
            </View>
            <View style={styles.moduleIcon}>
              <Ionicons name="albums-outline" size={24} color={theme.textMuted} />
            </View>
          </TouchableOpacity>
        )) : (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Text style={{ color: theme.textMuted }}>Chưa có học phần nào trong thư mục này</Text>
          </View>
        )}
      </ScrollView>

      {/* Options Modal */}
      <Modal visible={showOptionsModal} transparent={true} animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowOptionsModal(false)}>
          <View style={[styles.bottomSheet, { backgroundColor: theme.surface }]}>
            <View style={[styles.bottomSheetHandle, { backgroundColor: theme.border }]} />
            <TouchableOpacity style={[styles.optionItem, { borderBottomColor: theme.border }]} onPress={() => {
              setEditName(folder.name);
              setEditDesc(folder.description || '');
              setShowOptionsModal(false);
              setShowEditModal(true);
            }}>
              <Ionicons name="pencil-outline" size={24} color={theme.textMuted} />
              <Text style={[styles.optionText, { color: theme.text }]}>Sửa thư mục</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.optionItem, { borderBottomColor: theme.border }]}>
              <Ionicons name="share-social-outline" size={24} color={theme.textMuted} />
              <Text style={[styles.optionText, { color: theme.text }]}>Chia sẻ</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.optionItem, { borderBottomColor: theme.border }]} onPress={handleDeleteFolder}>
              <Ionicons name="trash-outline" size={24} color="#ef4444" />
              <Text style={[styles.optionText, { color: '#ef4444' }]}>Xóa thư mục</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit Folder Modal */}
      <Modal visible={showEditModal} transparent={true} animationType="slide">
        <View style={[styles.fullScreenModal, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <Text style={[styles.cancelText, { color: theme.textMuted }]}>Hủy</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Sửa thư mục</Text>
            <TouchableOpacity onPress={handleUpdateFolder}>
              <Text style={styles.saveText}>Lưu</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>Tên thư mục</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
              value={editName}
              onChangeText={setEditName}
              placeholder="Nhập tên thư mục"
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  iconButton: { padding: 8, borderRadius: 20 },
  scrollContent: { padding: 16 },
  folderHeader: { marginBottom: 24 },
  folderTitle: { fontSize: 26, fontWeight: 'bold', marginBottom: 12 },
  authorInfo: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#0ea5e9', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  avatarText: { color: '#ffffff', fontSize: 12, fontWeight: 'bold' },
  authorName: { fontSize: 16, fontWeight: '500' },
  statsContainer: { marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1 },
  statsText: { fontSize: 16, fontWeight: '600' },
  moduleCard: { flexDirection: 'row', padding: 16, borderRadius: 12, marginBottom: 12, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  moduleContent: { flex: 1 },
  moduleTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  moduleSubtitle: { fontSize: 14 },
  moduleIcon: { justifyContent: 'center', alignItems: 'center', paddingLeft: 16 },
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
  textInput: { padding: 16, borderRadius: 12, fontSize: 16, borderWidth: 1 }
});
