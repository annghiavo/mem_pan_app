import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { createDeck, bulkCreateCards } from '../../services/api';

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

  const addTerm = () => {
    setTerms([...terms, { id: Date.now().toString(), term: '', definition: '' }]);
  };

  const updateTerm = (id: string, field: 'term' | 'definition', value: string) => {
    setTerms(terms.map(t => t.id === id ? { ...t, [field]: value } : t));
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
      const deckRes = await createDeck(title.trim(), description.trim(), true);
      const deckId = deckRes.deck.deckId;

      // 2. Add Cards to Deck
      const cardsData = validTerms.map(t => ({
        contentFront: t.term.trim(),
        contentBack: t.definition.trim(),
        imageUrl: '',
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
            <TouchableOpacity style={[styles.iconButton, { backgroundColor: theme.iconBg }]}>
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
                <TouchableOpacity style={styles.scanDocButton}>
                  <Ionicons name="scan-outline" size={20} color={theme.primary} />
                  <Text style={[styles.scanDocText, { color: theme.primary }]}>Quét tài liệu</Text>
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
});
