import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, useColorScheme, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { createDeck, bulkCreateCards, parseImportFile } from '../../services/api';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

interface Term {
  id: string;
  term: string;
  definition: string;
}

export default function CreateModuleScreen() {
  const router = useRouter();

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const theme = {
    background: isDark ? '#111111' : '#f4f5f9',
    surface: isDark ? '#1c1c1e' : '#ffffff',
    text: isDark ? '#f4f4f5' : '#1f2937',
    textMuted: isDark ? '#a1a1aa' : '#9ca3af',
    border: isDark ? '#3f3f46' : '#e5e7eb',
    primary: isDark ? '#818cf8' : '#4255ff',
    iconColor: isDark ? '#f4f4f5' : '#1f2937',
    iconBg: isDark ? '#27272a' : '#ffffff',
  };

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [showDescription, setShowDescription] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [terms, setTerms] = useState<Term[]>([
    { id: '1', term: '', definition: '' },
    { id: '2', term: '', definition: '' },
  ]);

  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [termLang, setTermLang] = useState('Tiếng Anh');
  const [defLang, setDefLang] = useState('Tiếng Việt');
  const [whoCanView, setWhoCanView] = useState('Mọi người');
  const [whoCanEdit, setWhoCanEdit] = useState('Chỉ tôi');

  const langCodeMap: Record<string, string> = {
    'Tiếng Việt': 'vi',
    'Tiếng Anh': 'en',
    'Tiếng Tây Ban Nha': 'es',
    'Tiếng Pháp': 'fr',
    'Tiếng Ý': 'it',
    'Tiếng Đức': 'de',
    'Tiếng Nga': 'ru',
    'Tiếng Nhật': 'ja',
    'Tiếng Nhật (Romaji)': 'ja_romaji',
    'Tiếng Trung (Giản thể)': 'zh_hans',
    'Tiếng Trung (Phồn thể)': 'zh_hant',
    'Tiếng Trung (Pinyin)': 'zh_pinyin',
    'Tiếng Hàn': 'ko',
  };

  const addTerm = () => {
    setTerms([...terms, { id: Date.now().toString(), term: '', definition: '' }]);
  };

  const updateTerm = (id: string, field: 'term' | 'definition', value: string) => {
    setTerms(terms.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/tab-separated-values', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const file = result.assets[0];
      const uri = file.uri;
      
      let type: 'csv' | 'tsv' | 'pdf' = 'csv';
      if (file.name.toLowerCase().endsWith('.pdf')) type = 'pdf';
      else if (file.name.toLowerCase().endsWith('.tsv')) type = 'tsv';
      
      setIsLoading(true);
      const mimeType = file.mimeType || (type === 'pdf' ? 'application/pdf' : type === 'csv' ? 'text/csv' : 'text/tab-separated-values');
      
      const parsedData = await parseImportFile(uri, mimeType, file.name, type);
      
      if (parsedData.cards && parsedData.cards.length > 0) {
        const currentTerms = terms.filter(t => t.term.trim() || t.definition.trim());
        const newTerms = parsedData.cards.map((card: any, index: number) => ({
          id: Date.now().toString() + index,
          term: card.front || '',
          definition: card.back || ''
        }));
        
        setTerms([...currentTerms, ...newTerms]);
        Alert.alert('Thành công', `Đã nhập ${parsedData.total || newTerms.length} thẻ`);
      } else {
        Alert.alert('Thông báo', 'Không tìm thấy thẻ nào trong tệp');
      }
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể nhập tệp');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tiêu đề học phần');
      return;
    }

    const validTerms = terms.filter(t => t.term.trim() || t.definition.trim());
    if (validTerms.length === 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập ít nhất một thuật ngữ');
      return;
    }

    setIsLoading(true);
    try {
      // 1. Create Deck
      const isPublic = whoCanView === 'Mọi người';
      const deckRes = await createDeck(title.trim(), description.trim(), isPublic);
      const deckId = deckRes.deck.deckId;

      // 2. Add Cards to Deck
      const cardsData = validTerms.map(t => ({
        contentFront: t.term.trim(),
        contentBack: t.definition.trim(),
        imageUrl: '',
        langFront: langCodeMap[termLang] || 'en',
        langBack: langCodeMap[defLang] || 'vi',
      }));

      await bulkCreateCards(deckId, cardsData);

      Alert.alert('Thành công', 'Đã tạo học phần');
      router.back();
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể tạo học phần');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.background }]}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.iconButton, { backgroundColor: theme.iconBg }]}>
            <Ionicons name="close" size={24} color={theme.iconColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Tạo học phần</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={() => setIsSettingsVisible(true)} style={[styles.iconButton, { backgroundColor: theme.iconBg }]}>
              <Ionicons name="settings-outline" size={24} color={theme.iconColor} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} style={[styles.iconButton, { backgroundColor: theme.iconBg }]} disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator size="small" color={theme.iconColor} />
              ) : (
                <Ionicons name="checkmark" size={24} color={theme.iconColor} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
          {/* Info Section */}
          <View style={styles.infoSection}>
            <TextInput
              style={[styles.titleInput, { color: theme.text, borderBottomColor: theme.text }]}
              placeholder="Tiêu đề"
              placeholderTextColor={theme.textMuted}
              value={title}
              onChangeText={setTitle}
            />

            {showDescription ? (
              <TextInput
                style={[styles.descInput, { color: theme.text, borderBottomColor: theme.border }]}
                placeholder="Mô tả"
                placeholderTextColor={theme.textMuted}
                value={description}
                onChangeText={setDescription}
                multiline
              />
            ) : (
              <View style={styles.infoActions}>
                <TouchableOpacity style={styles.scanDocButton} onPress={handleImport}>
                  <Ionicons name="document-text-outline" size={20} color={theme.primary} />
                  <Text style={[styles.scanDocText, { color: theme.primary }]}>Import tệp</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowDescription(true)}>
                  <Text style={[styles.addDescText, { color: theme.primary }]}>+ Mô tả</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Terms Section */}
          <View style={styles.termsSection}>
            {terms.map((term, index) => (
              <View key={term.id} style={[styles.termCard, { backgroundColor: theme.surface }]}>
                <TextInput
                  style={[styles.termInput, { color: theme.text }]}
                  placeholder="Thuật ngữ"
                  placeholderTextColor={theme.textMuted}
                  value={term.term}
                  onChangeText={(val) => updateTerm(term.id, 'term', val)}
                />
                <View style={[styles.divider, { backgroundColor: theme.border }]} />
                <TextInput
                  style={[styles.termInput, { color: theme.text }]}
                  placeholder="Định nghĩa"
                  placeholderTextColor={theme.textMuted}
                  value={term.definition}
                  onChangeText={(val) => updateTerm(term.id, 'definition', val)}
                />
              </View>
            ))}
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Floating Add Button */}
        <TouchableOpacity style={[styles.fab, { backgroundColor: theme.primary, shadowColor: theme.primary }]} onPress={addTerm}>
          <Ionicons name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
      </KeyboardAvoidingView>

      {/* Settings Modal */}
      <Modal
        visible={isSettingsVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsSettingsVisible(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: theme.background }]}>
            <TouchableOpacity onPress={() => setIsSettingsVisible(false)} style={styles.modalBackButton}>
              <Ionicons name="arrow-back" size={24} color={theme.iconColor} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Cài đặt</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>Ngôn ngữ</Text>
            <View style={[styles.settingGroup, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <TouchableOpacity style={styles.settingRow} onPress={() => {
                Alert.alert('Chọn ngôn ngữ', '', [
                  { text: 'Tiếng Việt', onPress: () => setTermLang('Tiếng Việt') },
                  { text: 'Tiếng Anh', onPress: () => setTermLang('Tiếng Anh') },
                  { text: 'Tiếng Tây Ban Nha', onPress: () => setTermLang('Tiếng Tây Ban Nha') },
                  { text: 'Tiếng Pháp', onPress: () => setTermLang('Tiếng Pháp') },
                  { text: 'Tiếng Ý', onPress: () => setTermLang('Tiếng Ý') },
                  { text: 'Tiếng Đức', onPress: () => setTermLang('Tiếng Đức') },
                  { text: 'Tiếng Nga', onPress: () => setTermLang('Tiếng Nga') },
                  { text: 'Tiếng Nhật', onPress: () => setTermLang('Tiếng Nhật') },
                  { text: 'Tiếng Nhật (Romaji)', onPress: () => setTermLang('Tiếng Nhật (Romaji)') },
                  { text: 'Tiếng Trung (Giản thể)', onPress: () => setTermLang('Tiếng Trung (Giản thể)') },
                  { text: 'Tiếng Trung (Phồn thể)', onPress: () => setTermLang('Tiếng Trung (Phồn thể)') },
                  { text: 'Tiếng Trung (Pinyin)', onPress: () => setTermLang('Tiếng Trung (Pinyin)') },
                  { text: 'Tiếng Hàn', onPress: () => setTermLang('Tiếng Hàn') },
                  { text: 'Hủy', style: 'cancel' }
                ]);
              }}>
                <Text style={[styles.settingLabel, { color: theme.text }]}>Thuật ngữ</Text>
                <Text style={[styles.settingValue, { color: theme.primary }]}>{termLang}</Text>
              </TouchableOpacity>
              <View style={[styles.modalDivider, { backgroundColor: theme.border }]} />
              <TouchableOpacity style={styles.settingRow} onPress={() => {
                Alert.alert('Chọn ngôn ngữ', '', [
                  { text: 'Tiếng Việt', onPress: () => setDefLang('Tiếng Việt') },
                  { text: 'Tiếng Anh', onPress: () => setDefLang('Tiếng Anh') },
                  { text: 'Tiếng Tây Ban Nha', onPress: () => setDefLang('Tiếng Tây Ban Nha') },
                  { text: 'Tiếng Pháp', onPress: () => setDefLang('Tiếng Pháp') },
                  { text: 'Tiếng Ý', onPress: () => setDefLang('Tiếng Ý') },
                  { text: 'Tiếng Đức', onPress: () => setDefLang('Tiếng Đức') },
                  { text: 'Tiếng Nga', onPress: () => setDefLang('Tiếng Nga') },
                  { text: 'Tiếng Nhật', onPress: () => setDefLang('Tiếng Nhật') },
                  { text: 'Tiếng Nhật (Romaji)', onPress: () => setDefLang('Tiếng Nhật (Romaji)') },
                  { text: 'Tiếng Trung (Giản thể)', onPress: () => setDefLang('Tiếng Trung (Giản thể)') },
                  { text: 'Tiếng Trung (Phồn thể)', onPress: () => setDefLang('Tiếng Trung (Phồn thể)') },
                  { text: 'Tiếng Trung (Pinyin)', onPress: () => setDefLang('Tiếng Trung (Pinyin)') },
                  { text: 'Tiếng Hàn', onPress: () => setDefLang('Tiếng Hàn') },
                  { text: 'Hủy', style: 'cancel' }
                ]);
              }}>
                <Text style={[styles.settingLabel, { color: theme.text }]}>Định nghĩa</Text>
                <Text style={[styles.settingValue, { color: theme.primary }]}>{defLang}</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.sectionTitle, { color: theme.textMuted, marginTop: 24 }]}>Quyền riêng tư</Text>
            <View style={[styles.settingGroup, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <TouchableOpacity style={styles.settingRow} onPress={() => {
                Alert.alert('Ai có thể xem', '', [
                  { text: 'Mọi người', onPress: () => setWhoCanView('Mọi người') },
                  { text: 'Chỉ tôi', onPress: () => setWhoCanView('Chỉ tôi') },
                  { text: 'Hủy', style: 'cancel' }
                ]);
              }}>
                <Text style={[styles.settingLabel, { color: theme.text }]}>Ai có thể xem</Text>
                <Text style={[styles.settingValue, { color: theme.primary }]}>{whoCanView}</Text>
              </TouchableOpacity>
              <View style={[styles.modalDivider, { backgroundColor: theme.border }]} />
              <TouchableOpacity style={styles.settingRow} onPress={() => {
                Alert.alert('Ai có thể sửa', '', [
                  { text: 'Mọi người', onPress: () => setWhoCanEdit('Mọi người') },
                  { text: 'Chỉ tôi', onPress: () => setWhoCanEdit('Chỉ tôi') },
                  { text: 'Hủy', style: 'cancel' }
                ]);
              }}>
                <Text style={[styles.settingLabel, { color: theme.text }]}>Ai có thể sửa</Text>
                <Text style={[styles.settingValue, { color: theme.primary }]}>{whoCanEdit}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  iconButton: { padding: 8, borderRadius: 20, marginLeft: 8 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  headerRight: { flexDirection: 'row' },
  scrollContainer: { flex: 1 },
  scrollContent: { padding: 16 },
  infoSection: { marginBottom: 24 },
  titleInput: { fontSize: 18, fontWeight: '600', paddingVertical: 12, borderBottomWidth: 1, marginBottom: 16 },
  descInput: { fontSize: 16, paddingVertical: 12, borderBottomWidth: 1, marginBottom: 16 },
  infoActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scanDocButton: { flexDirection: 'row', alignItems: 'center' },
  scanDocText: { fontSize: 16, fontWeight: '600', marginLeft: 8 },
  addDescText: { fontSize: 16, fontWeight: '600' },
  termsSection: { gap: 16 },
  termCard: { borderRadius: 8, padding: 16, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  termInput: { fontSize: 16, paddingVertical: 8 },
  divider: { height: 1, marginVertical: 8 },
  fab: { position: 'absolute', bottom: 32, alignSelf: 'center', width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  modalBackButton: { padding: 8, marginLeft: -8, width: 40, alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalContent: { flex: 1, paddingTop: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginLeft: 16 },
  settingGroup: { borderTopWidth: 1, borderBottomWidth: 1 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  settingLabel: { fontSize: 16 },
  settingValue: { fontSize: 16, fontWeight: '500' },
  modalDivider: { height: 1, marginLeft: 16 },
});
