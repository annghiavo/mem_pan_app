import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, useColorScheme, Modal } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { createDeck, bulkCreateCards, parseImportFile, createCard, getDeck, updateDeck, updateDeckVisibility, getDeckCards, updateCard, deleteCard, reorderCards, getCurrentUser } from '../../services/api';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Image } from 'react-native';
import { WebContainer } from '../../components/ui/WebContainer';
import { showAlert } from '../../utils/alert';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView, TouchableOpacity as RNGHTouchableOpacity } from 'react-native-gesture-handler';

interface Term {
  id: string;
  cardId?: string;
  term: string;
  definition: string;
  image?: { uri: string; type: string; name: string };
  imageUrl?: string;
}

interface OriginalCard {
  contentFront: string;
  contentBack: string;
  imageUrl: string;
}

export default function CreateModuleScreen() {
  const router = useRouter();
  const { id: editIdParam } = useLocalSearchParams();
  const editId = typeof editIdParam === 'string' ? editIdParam : '';
  const isEditMode = !!editId;

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
  const [originalCards, setOriginalCards] = useState<Record<string, OriginalCard>>({});

  const [importingFileName, setImportingFileName] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importDone, setImportDone] = useState(false);
  const importIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (importIntervalRef.current) clearInterval(importIntervalRef.current);
    };
  }, []);

  // In edit mode, hydrate the form from the existing deck + its cards.
  useEffect(() => {
    if (!isEditMode) return;
    let cancelled = false;
    (async () => {
      try {
        const [deckRes, cardsRes, meRes]: [any, any, any] = await Promise.all([
          getDeck(editId),
          getDeckCards(editId).catch(() => ({ cards: [] })),
          getCurrentUser().catch(() => null),
        ]);
        if (cancelled) return;
        const d = deckRes?.deck;
        if (!d) return;

        // Reject if signed-in user isn't the creator. The deck-detail screen
        // now hides the edit entry point for non-owners, but defend this
        // route in case someone reaches it directly (URL, deep link).
        const me = meRes?.user || meRes?.data || meRes;
        const myName: string = me?.username || '';
        const creator: string = deckRes?.creatorUsername || '';
        if (myName && creator && creator !== myName) {
          showAlert('Không có quyền', 'Bạn không phải là chủ sở hữu của học phần này.', () => router.back());
          return;
        }
        setTitle(d.name || '');
        setDescription(d.description || '');
        if (d.description) setShowDescription(true);
        setWhoCanView(d.isPublic ? 'Mọi người' : 'Chỉ tôi');

        const existing = (cardsRes?.cards || []) as any[];
        if (existing.length > 0) {
          const hydrated: Term[] = existing.map((c: any) => ({
            id: c.cardId,
            cardId: c.cardId,
            term: c.contentFront || '',
            definition: c.contentBack || '',
            imageUrl: c.imageUrl || undefined,
          }));
          setTerms(hydrated);
          const origMap: Record<string, OriginalCard> = {};
          existing.forEach((c: any) => {
            origMap[c.cardId] = {
              contentFront: c.contentFront || '',
              contentBack: c.contentBack || '',
              imageUrl: c.imageUrl || '',
            };
          });
          setOriginalCards(origMap);
          // Pick up the deck's existing card languages so newly-added cards in
          // edit mode default to the same pair instead of en/vi.
          const firstWithLang = existing.find((c: any) => c.langFront || c.langBack);
          if (firstWithLang) {
            const fLang = Object.entries(langCodeMap).find(([, v]) => v === firstWithLang.langFront)?.[0];
            const bLang = Object.entries(langCodeMap).find(([, v]) => v === firstWithLang.langBack)?.[0];
            if (fLang) setTermLang(fLang);
            if (bLang) setDefLang(bLang);
          }
        }
      } catch (error: any) {
        showAlert('Lỗi', error.message || 'Không thể tải học phần');
      }
    })();
    return () => { cancelled = true; };
  }, [editId, isEditMode]);

  const stopProgress = () => {
    if (importIntervalRef.current) {
      clearInterval(importIntervalRef.current);
      importIntervalRef.current = null;
    }
  };

  const hideImportOverlay = () => {
    setImportingFileName(null);
    setImportProgress(0);
    setImportDone(false);
  };

  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [termLang, setTermLang] = useState('Tiếng Anh');
  const [defLang, setDefLang] = useState('Tiếng Việt');
  const [whoCanView, setWhoCanView] = useState('Mọi người');
  const [whoCanEdit, setWhoCanEdit] = useState('Chỉ tôi');
  const [langPickerTarget, setLangPickerTarget] = useState<'term' | 'def' | null>(null);

  const LANGUAGE_OPTIONS = [
    'Tiếng Việt', 'Tiếng Anh', 'Tiếng Tây Ban Nha', 'Tiếng Pháp', 'Tiếng Ý',
    'Tiếng Đức', 'Tiếng Nga', 'Tiếng Nhật', 'Tiếng Nhật (Romaji)',
    'Tiếng Trung (Giản thể)', 'Tiếng Trung (Phồn thể)', 'Tiếng Trung (Pinyin)', 'Tiếng Hàn',
  ];

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

  const pickImage = async (id: string) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      setTerms(terms.map(t => t.id === id ? {
        ...t,
        image: {
          uri: asset.uri,
          type: asset.mimeType || 'image/jpeg',
          name: asset.fileName || `image_${Date.now()}.jpg`
        }
      } : t));
    }
  };

  const removeImage = (id: string) => {
    setTerms(terms.map(t => t.id === id ? { ...t, image: undefined, imageUrl: undefined } : t));
  };

  const removeTerm = (id: string) => {
    setTerms(prev => (prev.length > 1 ? prev.filter(t => t.id !== id) : prev));
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

      let type: 'csv' | 'tsv' | 'pdf' = 'csv';
      if (file.name.toLowerCase().endsWith('.pdf')) type = 'pdf';
      else if (file.name.toLowerCase().endsWith('.tsv')) type = 'tsv';

      const mimeType = file.mimeType || (type === 'pdf' ? 'application/pdf' : type === 'csv' ? 'text/csv' : 'text/tab-separated-values');

      // On web, expo-document-picker exposes a real File via asset.file; the
      // uri is a blob: URL that FormData can't append directly. Fall back to
      // fetching the blob URL if asset.file is missing for any reason.
      let fileSource: string | Blob = file.uri;
      if (Platform.OS === 'web') {
        const webFile: Blob | undefined = (file as any).file;
        if (webFile) {
          fileSource = webFile;
        } else if (file.uri) {
          try {
            fileSource = await fetch(file.uri).then(r => r.blob());
          } catch {
            // keep uri fallback; server will likely reject but we let it surface
          }
        }
      }

      // Show notification + virtual progress bar
      setImportingFileName(file.name);
      setImportProgress(0);
      setImportDone(false);
      setIsLoading(true);

      stopProgress();
      importIntervalRef.current = setInterval(() => {
        setImportProgress(prev => {
          if (prev >= 90) return 90;
          // Ease-out: bigger jumps early, smaller as we approach 90.
          const increment = Math.max(0.6, (90 - prev) * 0.06);
          return Math.min(90, prev + increment);
        });
      }, 150);

      let parsedData: any;
      try {
        parsedData = await parseImportFile(fileSource, mimeType, file.name, type);
      } catch (err) {
        stopProgress();
        hideImportOverlay();
        throw err;
      }

      // Server returned — complete the bar to 100%, hold briefly, then hide.
      stopProgress();
      setImportProgress(100);
      setImportDone(true);

      if (parsedData.cards && parsedData.cards.length > 0) {
        const currentTerms = terms.filter(t => t.term.trim() || t.definition.trim());
        const newTerms = parsedData.cards.map((card: any, index: number) => ({
          id: Date.now().toString() + index,
          term: card.front || '',
          definition: card.back || ''
        }));

        setTerms([...currentTerms, ...newTerms]);
        setTimeout(() => {
          hideImportOverlay();
          showAlert('Thành công', `Đã nhập ${parsedData.total || newTerms.length} thẻ`);
        }, 600);
      } else {
        setTimeout(() => {
          hideImportOverlay();
          showAlert('Thông báo', 'Không tìm thấy thẻ nào trong tệp');
        }, 600);
      }
    } catch (error: any) {
      stopProgress();
      hideImportOverlay();
      showAlert('Lỗi', error.message || 'Không thể nhập tệp');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      showAlert('Lỗi', 'Vui lòng nhập tiêu đề học phần');
      return;
    }

    // Validate completeness BEFORE any backend call. A card counts as "filled"
    // if either side has content; every filled card must have BOTH sides.
    // Otherwise createDeck would succeed first and only the cards would fail
    // server-side validation, leaving an orphaned empty deck behind.
    const filledTerms = terms.filter(t => t.term.trim() || t.definition.trim());
    if (filledTerms.length === 0) {
      showAlert('Lỗi', 'Vui lòng nhập ít nhất một thuật ngữ');
      return;
    }
    const hasIncompleteTerm = filledTerms.some(t => !t.term.trim() || !t.definition.trim());
    if (hasIncompleteTerm) {
      showAlert('Lỗi', 'Vui lòng nhập đầy đủ cả thuật ngữ và định nghĩa cho mỗi thẻ');
      return;
    }

    if (isEditMode) {
      const validTerms = terms.filter(t => t.term.trim() || t.definition.trim());
      const keptCardIds = new Set(validTerms.filter(t => t.cardId).map(t => t.cardId as string));
      const removedCardIds = Object.keys(originalCards).filter(cid => !keptCardIds.has(cid));

      setIsLoading(true);
      try {
        await updateDeck(editId, title.trim(), description.trim());
        await updateDeckVisibility(editId, whoCanView === 'Mọi người');

        // Delete removed cards.
        for (const cid of removedCardIds) {
          await deleteCard(cid);
        }

        // Persist drag-and-drop order for all remaining cards that have a cardId.
        const existingCardIds = validTerms.filter(t => t.cardId).map(t => t.cardId as string);
        if (existingCardIds.length > 0) {
          await reorderCards(editId, existingCardIds);
        }

        // Update modified existing cards.
        for (const t of validTerms) {
          if (!t.cardId) continue;
          const orig = originalCards[t.cardId];
          if (!orig) continue;
          const front = t.term.trim();
          const back = t.definition.trim();
          const hasNewImage = !!t.image;
          const imageCleared = !!orig.imageUrl && !t.imageUrl && !t.image;
          const textChanged = front !== orig.contentFront || back !== orig.contentBack;
          if (!hasNewImage && !imageCleared && !textChanged) continue;

          const payload: any = { contentFront: front, contentBack: back };
          if (hasNewImage) payload.image = t.image;
          else if (imageCleared) payload.imageUrl = '';
          await updateCard(t.cardId, payload);
        }

        // Create newly added cards — use their index in validTerms as position
        // so they slot into the correct spot in the ordering.
        const newTermsWithIndex = validTerms
          .map((t, i) => ({ t, i }))
          .filter(({ t }) => !t.cardId);

        const newWithImages = newTermsWithIndex.filter(({ t }) => !!t.image);
        const newWithoutImages = newTermsWithIndex.filter(({ t }) => !t.image);

        if (newWithoutImages.length > 0) {
          await bulkCreateCards(editId, newWithoutImages.map(({ t, i }) => ({
            contentFront: t.term.trim(),
            contentBack: t.definition.trim(),
            imageUrl: '',
            langFront: langCodeMap[termLang] || 'en',
            langBack: langCodeMap[defLang] || 'vi',
            position: i,
          })));
        }
        for (const { t, i } of newWithImages) {
          await createCard(editId, {
            contentFront: t.term.trim(),
            contentBack: t.definition.trim(),
            image: t.image,
            langFront: langCodeMap[termLang] || 'en',
            langBack: langCodeMap[defLang] || 'vi',
            position: i,
          });
        }

        if (Platform.OS === 'web') {
          showAlert('Thành công', 'Đã cập nhật học phần', () => router.back());
        } else {
          showAlert('Thành công', 'Đã cập nhật học phần');
          router.back();
        }
      } catch (error: any) {
        showAlert('Lỗi', error.message || 'Không thể cập nhật học phần');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    const validTerms = filledTerms;

    setIsLoading(true);
    try {
      // 1. Create Deck
      const isPublic = whoCanView === 'Mọi người';
      const deckRes = await createDeck(title.trim(), description.trim(), isPublic);
      const deckId = deckRes.deck.deckId;

      // 2. Add Cards to Deck
      // bulkCreateCards sets position = array-index, so send cards without images
      // in their original order. Cards with images are sent individually.
      // After all cards are created, call reorderCards to enforce the exact
      // drag-and-drop order for the full list (including image cards).
      const cardsWithoutImages = validTerms
        .map((t, i) => ({ t, i }))
        .filter(({ t }) => !t.image);

      const cardsWithImages = validTerms
        .map((t, i) => ({ t, i }))
        .filter(({ t }) => !!t.image);

      // Track created card IDs indexed by their position in validTerms
      const createdCardIds: string[] = new Array(validTerms.length).fill('');

      if (cardsWithoutImages.length > 0) {
        const bulkData = cardsWithoutImages.map(({ t }) => ({
          contentFront: t.term.trim(),
          contentBack: t.definition.trim(),
          imageUrl: '',
          langFront: langCodeMap[termLang] || 'en',
          langBack: langCodeMap[defLang] || 'vi',
        }));
        const bulkRes = await bulkCreateCards(deckId, bulkData);
        // Map returned cards back to original positions
        const returnedCards: any[] = bulkRes?.cards || [];
        returnedCards.forEach((card: any, idx: number) => {
          const origIdx = cardsWithoutImages[idx]?.i;
          if (origIdx !== undefined) createdCardIds[origIdx] = card.cardId;
        });
      }

      for (const { t, i } of cardsWithImages) {
        const res = await createCard(deckId, {
          contentFront: t.term.trim(),
          contentBack: t.definition.trim(),
          image: t.image,
          langFront: langCodeMap[termLang] || 'en',
          langBack: langCodeMap[defLang] || 'vi',
        });
        if (res?.card?.cardId) createdCardIds[i] = res.card.cardId;
      }

      // 3. Enforce final order with reorderCards
      const orderedIds = createdCardIds.filter(Boolean);
      if (orderedIds.length > 1) {
        await reorderCards(deckId, orderedIds);
      }

      if (Platform.OS === 'web') {
        showAlert('Thành công', 'Đã tạo học phần', () => router.back());
      } else {
        showAlert('Thành công', 'Đã tạo học phần');
        router.back();
      }
    } catch (error: any) {
      showAlert('Lỗi', error.message || 'Không thể tạo học phần');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <WebContainer>
          <View style={[styles.header, { backgroundColor: theme.background }]}>
            <TouchableOpacity onPress={() => router.back()} style={[styles.iconButton, { backgroundColor: theme.iconBg }]}>
              <Ionicons name="close" size={24} color={theme.iconColor} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.text }]}>{isEditMode ? 'Sửa học phần' : 'Tạo học phần'}</Text>
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
        </WebContainer>

        <GestureHandlerRootView style={{ flex: 1 }}>
          <DraggableFlatList
            data={terms}
            onDragEnd={({ data }) => setTerms(data)}
            keyExtractor={(item) => item.id}
            activationDistance={Platform.OS === 'web' ? 10 : undefined}
            contentContainerStyle={styles.scrollContent}
            ListHeaderComponent={
              <WebContainer>
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
                      {!isEditMode && (
                        <TouchableOpacity style={styles.scanDocButton} onPress={handleImport}>
                          <Ionicons name="document-text-outline" size={20} color={theme.primary} />
                          <Text style={[styles.scanDocText, { color: theme.primary }]}>Import tệp</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity onPress={() => setShowDescription(true)}>
                        <Text style={[styles.addDescText, { color: theme.primary }]}>+ Mô tả</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </WebContainer>
            }
            ListFooterComponent={
              <WebContainer>
                <View style={{ height: 100 }} />
              </WebContainer>
            }
            renderItem={({ item: term, drag, isActive }) => {
              const previewUri = term.image?.uri || term.imageUrl;
              return (
                <ScaleDecorator>
                  <WebContainer>
                    <View style={[styles.termCard, { backgroundColor: theme.surface, marginBottom: 16, opacity: isActive ? 0.9 : 1, elevation: isActive ? 4 : 1 }]}>
                      <View style={styles.termCardHeader}>
                        <View style={{ flex: 1 }}>
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
                        <View style={styles.termCardActions}>
                          <RNGHTouchableOpacity onPressIn={drag} style={[styles.dragHandleBtn, { marginBottom: 8, ...(Platform.OS === 'web' ? { cursor: 'grab' } : {}) } as any]}>
                            <Ionicons name="menu" size={24} color={theme.textMuted} />
                          </RNGHTouchableOpacity>
                          {previewUri ? (
                            <View style={styles.imagePreviewContainer}>
                              <TouchableOpacity onPress={() => pickImage(term.id)}>
                                <Image source={{ uri: previewUri }} style={styles.imagePreview} />
                              </TouchableOpacity>
                              <TouchableOpacity style={styles.removeImageBtn} onPress={() => removeImage(term.id)}>
                                <Ionicons name="close-circle" size={20} color="#ef4444" />
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <TouchableOpacity style={styles.addImageBtn} onPress={() => pickImage(term.id)}>
                              <Ionicons name="image-outline" size={24} color={theme.primary} />
                            </TouchableOpacity>
                          )}
                          {terms.length > 1 && (
                            <TouchableOpacity style={styles.deleteTermBtn} onPress={() => removeTerm(term.id)}>
                              <Ionicons name="trash-outline" size={20} color="#ef4444" />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    </View>
                  </WebContainer>
                </ScaleDecorator>
              );
            }}
          />
        </GestureHandlerRootView>

        <TouchableOpacity style={[styles.fab, { backgroundColor: theme.primary, shadowColor: theme.primary }]} onPress={addTerm}>
          <Ionicons name="add" size={24} color="#ffffff" />
        </TouchableOpacity>

        {/* Import progress notification */}
        {importingFileName && (
          <View pointerEvents="none" style={styles.importOverlay}>
            <View style={[styles.importCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Ionicons
                name={importDone ? 'checkmark-circle' : 'document-text-outline'}
                size={24}
                color={importDone ? '#10b981' : theme.primary}
              />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.importFileName, { color: theme.text }]} numberOfLines={1}>
                  {importingFileName}
                </Text>
                <Text style={[styles.importStatus, { color: theme.textMuted }]}>
                  {importDone
                    ? 'Hoàn tất'
                    : importProgress >= 90
                      ? 'Đang xử lý trên máy chủ...'
                      : `Đang tải lên... ${Math.floor(importProgress)}%`}
                </Text>
                <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${importProgress}%`,
                        backgroundColor: importDone ? '#10b981' : theme.primary,
                      },
                    ]}
                  />
                </View>
              </View>
            </View>
          </View>
        )}
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
            {!isEditMode && (
              <>
                <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>Ngôn ngữ</Text>
                <View style={[styles.settingGroup, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <TouchableOpacity style={styles.settingRow} onPress={() => setLangPickerTarget('term')}>
                    <Text style={[styles.settingLabel, { color: theme.text }]}>Thuật ngữ</Text>
                    <Text style={[styles.settingValue, { color: theme.primary }]}>{termLang}</Text>
                  </TouchableOpacity>
                  <View style={[styles.modalDivider, { backgroundColor: theme.border }]} />
                  <TouchableOpacity style={styles.settingRow} onPress={() => setLangPickerTarget('def')}>
                    <Text style={[styles.settingLabel, { color: theme.text }]}>Định nghĩa</Text>
                    <Text style={[styles.settingValue, { color: theme.primary }]}>{defLang}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            <Text style={[styles.sectionTitle, { color: theme.textMuted, marginTop: isEditMode ? 0 : 24 }]}>Quyền riêng tư</Text>
            <View style={[styles.settingGroup, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <TouchableOpacity style={styles.settingRow} onPress={() => setWhoCanView('Mọi người')}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="globe-outline" size={20} color={theme.textMuted} style={{ marginRight: 12 }} />
                  <Text style={[styles.settingLabel, { color: theme.text }]}>Mọi người</Text>
                </View>
                {whoCanView === 'Mọi người' && <Ionicons name="checkmark" size={22} color={theme.primary} />}
              </TouchableOpacity>
              <View style={[styles.modalDivider, { backgroundColor: theme.border }]} />
              <TouchableOpacity style={styles.settingRow} onPress={() => setWhoCanView('Chỉ tôi')}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="lock-closed-outline" size={20} color={theme.textMuted} style={{ marginRight: 12 }} />
                  <Text style={[styles.settingLabel, { color: theme.text }]}>Chỉ tôi</Text>
                </View>
                {whoCanView === 'Chỉ tôi' && <Ionicons name="checkmark" size={22} color={theme.primary} />}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Language picker — list of options shown inline. Avoids Alert.alert,
          which on web only supports OK/Cancel and silently drops multi-option
          onPress callbacks. */}
      <Modal
        visible={langPickerTarget !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setLangPickerTarget(null)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.langPickerOverlay}
          onPress={() => setLangPickerTarget(null)}
        >
          <View style={[styles.langPickerSheet, { backgroundColor: theme.surface }]}>
            <Text style={[styles.langPickerTitle, { color: theme.text }]}>Chọn ngôn ngữ</Text>
            <ScrollView>
              {LANGUAGE_OPTIONS.map(lang => {
                const selected = langPickerTarget === 'term' ? termLang === lang : defLang === lang;
                return (
                  <TouchableOpacity
                    key={lang}
                    style={[styles.langPickerRow, { borderBottomColor: theme.border }]}
                    onPress={() => {
                      if (langPickerTarget === 'term') setTermLang(lang);
                      else if (langPickerTarget === 'def') setDefLang(lang);
                      setLangPickerTarget(null);
                    }}
                  >
                    <Text style={[styles.settingLabel, { color: theme.text }]}>{lang}</Text>
                    {selected && <Ionicons name="checkmark" size={22} color={theme.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
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
  termCardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  termCardActions: { marginLeft: 12, alignItems: 'center', justifyContent: 'center' },
  dragHandleBtn: { width: 44, height: 32, justifyContent: 'center', alignItems: 'center' },
  addImageBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(66, 85, 255, 0.1)', justifyContent: 'center', alignItems: 'center' },
  deleteTermBtn: { marginTop: 8, width: 44, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  imagePreviewContainer: { position: 'relative' },
  imagePreview: { width: 60, height: 60, borderRadius: 8 },
  removeImageBtn: { position: 'absolute', top: -10, right: -10, backgroundColor: '#fff', borderRadius: 10 },
  termInput: { fontSize: 16, paddingVertical: 8 },
  divider: { height: 1, marginVertical: 8 },
  fab: { position: 'absolute', bottom: 32, alignSelf: 'center', width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  importOverlay: { position: 'absolute', top: 72, left: 16, right: 16, zIndex: 100, alignItems: 'center' },
  importCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, width: '100%', maxWidth: 480, borderWidth: 1, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 6 },
  importFileName: { fontSize: 14, fontWeight: '600' },
  importStatus: { fontSize: 12, marginTop: 2 },
  progressTrack: { height: 4, borderRadius: 2, marginTop: 8, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
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
  langPickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  langPickerSheet: { width: '100%', maxWidth: 420, maxHeight: '80%', borderRadius: 16, padding: 16 },
  langPickerTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  langPickerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 8, borderBottomWidth: 1 },
});
