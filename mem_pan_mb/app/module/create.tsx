import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
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
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
            <Ionicons name="close" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tạo học phần</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="settings-outline" size={24} color="#1f2937" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} style={styles.iconButton} disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator size="small" color="#1f2937" />
              ) : (
                <Ionicons name="checkmark" size={24} color="#1f2937" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
          {/* Info Section */}
          <View style={styles.infoSection}>
            <TextInput
              style={styles.titleInput}
              placeholder="Tiêu đề"
              placeholderTextColor="#9ca3af"
              value={title}
              onChangeText={setTitle}
            />
            
            {showDescription ? (
              <TextInput
                style={styles.descInput}
                placeholder="Mô tả"
                placeholderTextColor="#9ca3af"
                value={description}
                onChangeText={setDescription}
                multiline
              />
            ) : (
              <View style={styles.infoActions}>
                <TouchableOpacity style={styles.scanDocButton}>
                  <Ionicons name="scan-outline" size={20} color="#4255ff" />
                  <Text style={styles.scanDocText}>Quét tài liệu</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowDescription(true)}>
                  <Text style={styles.addDescText}>+ Mô tả</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Terms Section */}
          <View style={styles.termsSection}>
            {terms.map((term, index) => (
              <View key={term.id} style={styles.termCard}>
                <TextInput
                  style={styles.termInput}
                  placeholder="Thuật ngữ"
                  placeholderTextColor="#9ca3af"
                  value={term.term}
                  onChangeText={(val) => updateTerm(term.id, 'term', val)}
                />
                <View style={styles.divider} />
                <TextInput
                  style={styles.termInput}
                  placeholder="Định nghĩa"
                  placeholderTextColor="#9ca3af"
                  value={term.definition}
                  onChangeText={(val) => updateTerm(term.id, 'definition', val)}
                />
              </View>
            ))}
          </View>
          
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Floating Add Button */}
        <TouchableOpacity style={styles.fab} onPress={addTerm}>
          <Ionicons name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f5f9' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#f4f5f9' },
  iconButton: { padding: 8, backgroundColor: '#ffffff', borderRadius: 20, marginLeft: 8 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
  headerRight: { flexDirection: 'row' },
  scrollContainer: { flex: 1 },
  scrollContent: { padding: 16 },
  infoSection: { marginBottom: 24 },
  titleInput: { fontSize: 18, fontWeight: '600', color: '#1f2937', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1f2937', marginBottom: 16 },
  descInput: { fontSize: 16, color: '#1f2937', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', marginBottom: 16 },
  infoActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scanDocButton: { flexDirection: 'row', alignItems: 'center' },
  scanDocText: { fontSize: 16, fontWeight: '600', color: '#4255ff', marginLeft: 8 },
  addDescText: { fontSize: 16, fontWeight: '600', color: '#4255ff' },
  termsSection: { gap: 16 },
  termCard: { backgroundColor: '#ffffff', borderRadius: 8, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  termInput: { fontSize: 16, color: '#1f2937', paddingVertical: 8 },
  divider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 8 },
  fab: { position: 'absolute', bottom: 32, alignSelf: 'center', width: 48, height: 48, borderRadius: 24, backgroundColor: '#4255ff', justifyContent: 'center', alignItems: 'center', shadowColor: '#4255ff', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
});
