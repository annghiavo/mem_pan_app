import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable, SafeAreaView, ActivityIndicator, Modal, TextInput, Alert, useColorScheme, Image, Share, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { getDeck, getDeckCards, getDeckProgress, getDueCards, deleteDeck, updateDeck, updateDeckVisibility, updateDeckAccessLevel, getFolders, addDeckToFolder, deleteCard, updateCard, cloneDeck, getCurrentUser, upsertDeckReview, getMySubscription, normalizeSubscription, isPlusAccessError, PLUS_REQUIRED_MESSAGE, getDeckStudySettings } from '../../services/api';
import * as ImagePicker from 'expo-image-picker';
import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import Papa from 'papaparse';
import { ReportSheet } from '../../components/ui/ReportSheet';
import { formatNextReview } from '../../utils/timeFormatting';
import { PlusDeckBadge, isPlusDeck as isPlusDeckRecord } from '../../components/ui/PlusDeckBadge';
import { SearchBar } from '../../components/ui/SearchBar';

// Build a shareable URL for a deck. On web we use the current origin so the
// link is directly visitable; on native we fall back to a deep link.
function buildDeckShareUrl(deckId: string): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/module/${deckId}`;
  }
  return `mempanmb://module/${deckId}`;
}

function getPreviewCardLimit(totalCards: number): number {
  if (totalCards <= 0) return 0;
  return Math.min(totalCards, Math.max(10, Math.ceil(totalCards * 0.1)));
}

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
  const [cardSearchQuery, setCardSearchQuery] = useState('');
  const [progress, setProgress] = useState<any>(null);
  const [dueCount, setDueCount] = useState<number>(0);
  const [hasPlus, setHasPlus] = useState(false);
  const [studySettings, setStudySettings] = useState<any>(null);
  const [creatorUsername, setCreatorUsername] = useState<string>('');
  const [creatorAvatar, setCreatorAvatar] = useState<string>('');
  const [currentUsername, setCurrentUsername] = useState<string>('');
  const [loading, setLoading] = useState(true);
  // Re-render the next-review countdown over time. The label is derived from
  // the server's absolute timestamp; this tick just forces a recompute.
  const [nowTick, setNowTick] = useState(Date.now());

  // Whether the signed-in user owns this deck. When the API returns no
  // creatorUsername (current convention for own decks — see (tabs)/index.tsx),
  // treat that as owned. Otherwise compare usernames. Defaults to false until
  // we know who the user is, so destructive UI doesn't flash for non-owners.
  const isOwner = (() => {
    if (!currentUsername) return false;
    if (!creatorUsername) return true;
    return creatorUsername === currentUsername;
  })();
  const isPlusDeck = isPlusDeckRecord(deckData);

  const navigateToLearning = (route: string) => {
    if (isPlusDeck && !hasPlus) {
      Alert.alert(
        'Cần MemPan Plus',
        PLUS_REQUIRED_MESSAGE
      );
      return;
    }
    router.push(route as any);
  };

  // Modal States
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showReportSheet, setShowReportSheet] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFolderSelectModal, setShowFolderSelectModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [folders, setFolders] = useState<any[]>([]);

  // Visibility Picker
  const [showVisibilityModal, setShowVisibilityModal] = useState(false);

  // Access Level Picker
  const [showAccessLevelModal, setShowAccessLevelModal] = useState(false);

  // Card Edit States
  const [showCardEditModal, setShowCardEditModal] = useState(false);
  const [editingCard, setEditingCard] = useState<any>(null);
  const [cardFront, setCardFront] = useState('');
  const [cardBack, setCardBack] = useState('');
  const [cardImage, setCardImage] = useState<any>(null);
  const [isUpdatingCard, setIsUpdatingCard] = useState(false);

  // Rating State
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showQuizModeModal, setShowQuizModeModal] = useState(false);
  const [myRating, setMyRating] = useState(0);
  const [hasRatedDeck, setHasRatedDeck] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const fetchDeckData = async () => {
        try {
          const [deckRes, cardsRes, progressRes, dueRes, meRes, subscriptionRes, settingsRes] = await Promise.all([
            getDeck(id as string),
            getDeckCards(id as string).catch((error) => {
              if (isPlusAccessError(error)) return { cards: [] };
              throw error;
            }),
            getDeckProgress(id as string).catch(() => null),
            getDueCards(id as string).catch(() => ({ total: 0 })),
            getCurrentUser(true).catch(() => null),
            getMySubscription(true).catch(() => null),
            getDeckStudySettings(id as string).catch(() => null),
          ]);
          setDeckData(deckRes.deck);
          setCreatorUsername(deckRes.creatorUsername || '');
          setCreatorAvatar(deckRes.creatorAvatar || '');
          setCards(cardsRes.cards || []);
          setProgress(progressRes);
          setDueCount(dueRes?.total || 0);
          setStudySettings(settingsRes?.settings || null);
          const me = meRes?.user || meRes?.data || meRes;
          if (me?.username) setCurrentUsername(me.username);
          const subscription = normalizeSubscription(subscriptionRes);
          setHasPlus(Boolean(subscription?.active || subscription?.status === 'active'));
        } catch (error) {
          console.error('Error fetching deck:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchDeckData();
    }, [id])
  );

  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const filteredCards = useMemo(() => {
    const query = cardSearchQuery.trim().toLowerCase();
    if (!query) return cards;
    return cards.filter((card) => {
      const front = String(card.contentFront || '').toLowerCase();
      const back = String(card.contentBack || '').toLowerCase();
      return front.includes(query) || back.includes(query);
    });
  }, [cards, cardSearchQuery]);

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
      {
        text: 'Xóa', style: 'destructive', onPress: async () => {
          try {
            await deleteDeck(id as string);
            setShowOptionsModal(false);
            router.replace('/(tabs)/library' as any);
          } catch (error: any) {
            Alert.alert('Lỗi', error.message || 'Không thể xóa học phần');
          }
        }
      }
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

  const handleShareDeck = async () => {
    const url = buildDeckShareUrl(id as string);
    setShowOptionsModal(false);
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
        Alert.alert('Đã sao chép', 'Đường dẫn học phần đã được sao chép.');
      } catch {
        Alert.alert('Đường dẫn', url);
      }
      return;
    }
    try {
      await Share.share({ message: url, url });
    } catch {
      Alert.alert('Đường dẫn', url);
    }
  };

  const handleCloneDeck = async () => {
    setShowOptionsModal(false);
    try {
      const res = await cloneDeck(id as string);
      const newId = res?.deck?.deckId;
      if (newId) {
        Alert.alert('Đã sao chép', 'Bản sao học phần đã được tạo.', [
          { text: 'OK', onPress: () => router.replace(`/module/${newId}` as any) },
        ]);
      } else {
        Alert.alert('Đã sao chép', 'Bản sao học phần đã được tạo.');
      }
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể sao chép học phần');
    }
  };

  const handleExportCSV = async () => {
    setShowOptionsModal(false);
    if (!cards || cards.length === 0) {
      Alert.alert('Lỗi', 'Không có thẻ nào để xuất.');
      return;
    }
    try {
      const csv = Papa.unparse(cards.map(c => ({
        'Thuật ngữ': c.contentFront,
        'Định nghĩa': c.contentBack
      })));
      const fileName = `${deckData.name.replace(/[^a-zA-Z0-9]/g, '_')}_cards.csv`;
      const file = new File(Paths.document, fileName);
      file.write(csv, { encoding: 'utf8' });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, { UTI: 'public.comma-separated-values-text', mimeType: 'text/csv', dialogTitle: 'Xuất CSV' });
      } else {
        Alert.alert('Chia sẻ không khả dụng', 'Tính năng chia sẻ không hoạt động trên thiết bị này.');
      }
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể xuất CSV');
    }
  };

  const handleExportPDF = async () => {
    setShowOptionsModal(false);
    if (!cards || cards.length === 0) {
      Alert.alert('Lỗi', 'Không có thẻ nào để xuất.');
      return;
    }
    try {
      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: Helvetica, sans-serif; padding: 20px; }
              h1 { text-align: center; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
              th { background-color: #f2f2f2; }
            </style>
          </head>
          <body>
            <h1>${deckData.name}</h1>
            <p>${deckData.description || ''}</p>
            <table>
              <tr><th>Thuật ngữ</th><th>Định nghĩa</th></tr>
              ${cards.map(c => "<tr><td>" + c.contentFront + "</td><td>" + c.contentBack + "</td></tr>").join('')}
            </table>
          </body>
        </html>
      `;
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { UTI: 'com.adobe.pdf', mimeType: 'application/pdf', dialogTitle: 'Xuất PDF' });
      } else {
        Alert.alert('Chia sẻ không khả dụng', 'Tính năng chia sẻ không hoạt động trên thiết bị này.');
      }
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể xuất PDF');
    }
  };

  const applyVisibility = async (isPublic: boolean) => {
    setShowVisibilityModal(false);
    if (deckData?.isPublic === isPublic) return;
    try {
      const res = await updateDeckVisibility(id as string, isPublic);
      setDeckData({ ...deckData, ...(res?.deck || { isPublic }) });
      Alert.alert('Thành công', isPublic ? 'Học phần đã được đặt công khai' : 'Học phần đã được đặt riêng tư');
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể cập nhật quyền riêng tư');
    }
  };

  const handleChangeVisibility = () => {
    setShowOptionsModal(false);
    setShowVisibilityModal(true);
  };

  const applyAccessLevel = async (level: 'free' | 'plus') => {
    setShowAccessLevelModal(false);
    if ((deckData?.accessLevel || deckData?.access_level || 'free') === level) return;
    try {
      const res = await updateDeckAccessLevel(id as string, level);
      setDeckData({ ...deckData, ...(res?.deck || { accessLevel: level }) });
      Alert.alert('Thành công', level === 'plus' ? 'Học phần đã được nâng cấp Plus' : 'Học phần đã chuyển về Miễn phí');
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể cập nhật gói học phần');
    }
  };

  const handleChangeAccessLevel = () => {
    setShowOptionsModal(false);
    setShowAccessLevelModal(true);
  };

  const handleOpenCardEdit = (card: any) => {
    setEditingCard(card);
    setCardFront(card.contentFront);
    setCardBack(card.contentBack);
    setCardImage(null);
    setShowCardEditModal(true);
  };

  const handlePickCardImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      setCardImage({
        uri: asset.uri,
        type: asset.mimeType || 'image/jpeg',
        name: asset.fileName || `card_${Date.now()}.jpg`
      });
    }
  };

  const handleUpdateCard = async () => {
    if (!cardFront.trim() || !cardBack.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thuật ngữ và định nghĩa');
      return;
    }

    setIsUpdatingCard(true);
    try {
      const res = await updateCard(editingCard.cardId, {
        contentFront: cardFront,
        contentBack: cardBack,
        image: cardImage || undefined,
      });

      // Update local state
      const updatedCards = cards.map(c =>
        c.cardId === editingCard.cardId
          ? { ...c, ...res.card }
          : c
      );
      setCards(updatedCards);
      setShowCardEditModal(false);
      Alert.alert('Thành công', 'Đã cập nhật thẻ');
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể cập nhật thẻ');
    } finally {
      setIsUpdatingCard(false);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    Alert.alert('Xác nhận', 'Bạn có chắc chắn muốn xóa thẻ này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa', style: 'destructive', onPress: async () => {
          try {
            await deleteCard(cardId);
            setCards(cards.filter(c => c.cardId !== cardId));
          } catch (error: any) {
            Alert.alert('Lỗi', error.message || 'Không thể xóa thẻ');
          }
        }
      }
    ]);
  };

  const handleSubmitRating = async () => {
    if (myRating < 1 || myRating > 5) return;
    try {
      const previousAvg = Number(deckData?.avgRating || 0);
      const previousTotal = Number(deckData?.totalReviews || 0);
      const response = await upsertDeckReview(id as string, myRating);
      setShowRatingModal(false);
      Alert.alert('Thành công', 'Cảm ơn bạn đã đánh giá học phần!');
      setDeckData((prev: any) => {
        if (!prev) return prev;
        if (response?.deck) return { ...prev, ...response.deck };
        const nextTotal = hasRatedDeck ? previousTotal : previousTotal + 1;
        const nextAvg = hasRatedDeck || previousTotal <= 0
          ? myRating
          : ((previousAvg * previousTotal) + myRating) / nextTotal;
        return { ...prev, avgRating: nextAvg, totalReviews: nextTotal };
      });
      setHasRatedDeck(true);
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể gửi đánh giá.');
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

  const totalCardCount = Number(deckData?.cardCount || cards.length || 0);
  const isPreviewMode = isPlusDeck && !hasPlus;
  const previewCardLimit = getPreviewCardLimit(totalCardCount);
  const previewLoadedCount = Math.min(cards.length, previewCardLimit);
  const canStartLearning = !isPreviewMode && cards.length > 0;
  const learningActionsDisabled = !canStartLearning;
  const learningActionsMuted = !canStartLearning;

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
            onPress={() => navigateToLearning(`/flashcard/${id}`)}
            disabled={isPreviewMode}
          >
            <Text style={[styles.flashcardWord, { color: theme.text }]}>{cards[0].contentFront}</Text>
            {!isPreviewMode ? <Ionicons name="scan-outline" size={20} color={theme.textMuted} style={styles.fullscreenIcon} /> : null}
          </TouchableOpacity>
        ) : isPreviewMode ? (
          <View style={[styles.flashcardPreview, { backgroundColor: theme.surface, shadowColor: isDark ? 'transparent' : '#000' }]}>
            <Text style={[styles.flashcardWord, { color: theme.text, textAlign: 'center' }]}>{PLUS_REQUIRED_MESSAGE}</Text>
          </View>
        ) : (
          <View style={[styles.flashcardPreview, { backgroundColor: theme.surface, shadowColor: isDark ? 'transparent' : '#000' }]}>
            <Text style={[styles.flashcardWord, { color: theme.text }]}>Học phần trống</Text>
          </View>
        )}

        {/* Module Info */}
        <View style={styles.moduleTitleRow}>
          <Text style={[styles.moduleTitle, { color: theme.text }]}>{deckData.name}</Text>
          {isPlusDeck ? <PlusDeckBadge /> : null}
        </View>
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
          <Text style={[styles.termCount, { color: theme.textMuted }]}> | {totalCardCount} thuật ngữ</Text>
        </View>

        {/* Deck Info: Rating & Access Level */}
        <View style={styles.deckStatsContainer}>
          <TouchableOpacity style={styles.ratingBadge} onPress={() => setShowRatingModal(true)}>
             <Ionicons name="star" size={16} color="#f59e0b" />
             <Text style={[styles.ratingText, { color: theme.text }]}>
               {typeof deckData.avgRating === 'number' ? deckData.avgRating.toFixed(1) : (deckData.avgRating || '0.0')} ({deckData.totalReviews || 0})
             </Text>
             <Ionicons name="chevron-forward" size={14} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        {isPreviewMode ? (
          <View style={[styles.previewBanner, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.previewTitle, { color: theme.text }]}>Xem trước học phần Plus</Text>
              <Text style={[styles.previewText, { color: theme.textMuted }]}>
                Bạn có thể xem trước tối đa {previewCardLimit} thẻ ({previewLoadedCount}/{totalCardCount} đang hiển thị). Cần Plus để bắt đầu học và ôn tập.
              </Text>
            </View>
            <TouchableOpacity style={[styles.previewButton, { backgroundColor: theme.primary }]} onPress={() => router.push('/(profile)/plus' as any)}>
              <Text style={styles.previewButtonText}>Mở Plus</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Action Buttons */}
        <View style={[styles.actionsContainer, { gap: 10 }]}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {/* Thẻ ghi nhớ */}
            <TouchableOpacity 
              style={[styles.gridActionButton, { backgroundColor: theme.surface, shadowColor: isDark ? 'transparent' : '#000' }]} 
              onPress={() => navigateToLearning(`/flashcard/${id}`)} 
              disabled={learningActionsDisabled}
            >
              <Ionicons name="albums" size={22} color={!learningActionsMuted ? "#3b82f6" : theme.textMuted} />
              <Text numberOfLines={1} style={[styles.gridActionButtonText, { color: theme.text }, learningActionsMuted && { color: theme.textMuted }]}>
                Thẻ ghi nhớ
              </Text>
            </TouchableOpacity>

            {/* Kiểm tra */}
            <TouchableOpacity 
              style={[styles.gridActionButton, { backgroundColor: theme.surface, shadowColor: isDark ? 'transparent' : '#000' }]} 
              onPress={() => navigateToLearning(`/practice-setup/${id}`)} 
              disabled={learningActionsDisabled}
            >
              <Ionicons name="document-text" size={22} color={!learningActionsMuted ? "#10b981" : theme.textMuted} />
              <Text numberOfLines={1} style={[styles.gridActionButtonText, { color: theme.text }, learningActionsMuted && { color: theme.textMuted }]}>
                Kiểm tra
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Progress */}
        <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 16 }]}>Tiến độ của bạn</Text>
        <View style={styles.progressStats}>
          {/* Chưa học */}
          <TouchableOpacity 
            style={[styles.statCard, { backgroundColor: theme.surface, shadowColor: isDark ? 'transparent' : '#000' }]} 
            onPress={() => navigateToLearning(`/quiz/${id}?newLimit=${studySettings?.newCardLimit ?? 20}&reviewLimit=0`)} 
            disabled={learningActionsDisabled}
          >
            <View style={[styles.statRing, { borderColor: '#5865F2' }]}>
              <Text style={[styles.statNumber, { color: theme.text }]}>{progress?.newCount ?? 0}</Text>
            </View>
            <Text style={[styles.statLabel, { color: theme.text }]}>Chưa học</Text>
            <Ionicons name="arrow-forward" size={20} color="#5865F2" />
          </TouchableOpacity>

          {/* Đang học */}
          <TouchableOpacity 
            style={[styles.statCard, { backgroundColor: theme.surface, shadowColor: isDark ? 'transparent' : '#000' }]} 
            onPress={() => navigateToLearning(`/quiz/${id}?filterState=studying`)} 
            disabled={learningActionsDisabled}
          >
            <View style={[styles.statRing, { borderColor: '#f59e0b', borderRightColor: isDark ? '#3f3f46' : '#f3f4f6' }]}>
              <Text style={[styles.statNumber, { color: theme.text }]}>{progress?.learnCount ?? 0}</Text>
            </View>
            <Text style={[styles.statLabel, { color: theme.text }]}>Đang học</Text>
            <Ionicons name="arrow-forward" size={20} color="#f59e0b" />
          </TouchableOpacity>

          {/* Đến hạn */}
          <TouchableOpacity 
            style={[styles.statCard, { backgroundColor: theme.surface, shadowColor: isDark ? 'transparent' : '#000' }]} 
            onPress={() => navigateToLearning(`/quiz/${id}?newLimit=0&reviewLimit=${studySettings?.reviewCardLimit ?? 200}`)} 
            disabled={learningActionsDisabled}
          >
            <View style={[styles.statRing, { borderColor: '#10b981' }]}>
              <Text style={[styles.statNumber, { color: theme.text }]}>{dueCount ?? 0}</Text>
            </View>
            <Text style={[styles.statLabel, { color: theme.text }]}>Đến hạn</Text>
            <Ionicons name="arrow-forward" size={20} color="#10b981" />
          </TouchableOpacity>
        </View>

        {/* Terms List */}
        <View style={styles.termsHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {isPreviewMode ? 'Xem trước' : 'Thuật ngữ'} ({filteredCards.length}{cardSearchQuery.trim() ? `/${cards.length}` : ''}{isPreviewMode ? `/${totalCardCount}` : ''})
          </Text>
          <Text style={[styles.sortText, { color: theme.textMuted }]}>Thứ tự gốc <Ionicons name="filter" size={14} /></Text>
        </View>

        <SearchBar
          value={cardSearchQuery}
          onChangeText={setCardSearchQuery}
          placeholder="Tìm thuật ngữ hoặc định nghĩa"
          style={styles.searchBar}
        />

        {filteredCards.length === 0 ? (
          <View style={[styles.emptySearchState, { backgroundColor: theme.surface }]}>
            <Text style={[styles.emptySearchTitle, { color: theme.text }]}>Không tìm thấy thẻ phù hợp</Text>
            <Text style={[styles.emptySearchText, { color: theme.textMuted }]}>
              Thử từ khóa khác hoặc xóa bộ lọc tìm kiếm.
            </Text>
          </View>
        ) : (
          filteredCards.map((item) => (
            <View key={item.cardId} style={[styles.termCard, { backgroundColor: theme.surface, shadowColor: isDark ? 'transparent' : '#000' }]}>
              <View style={styles.termCardHeader}>
                <View style={{ flex: 1 }}>
                  {item.langFront ? (
                    <Text style={[styles.termLangLabel, { color: theme.primary }]}>{langNameMap[item.langFront] || item.langFront}</Text>
                  ) : null}
                  <Text style={[styles.termWord, { color: theme.text }]}>{item.contentFront}</Text>
                </View>
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.termImage} />
                ) : null}
                {isOwner && (
                  <View style={styles.termActions}>
                    <TouchableOpacity style={{ marginRight: 16 }} onPress={() => handleOpenCardEdit(item)}>
                      <Ionicons name="pencil-outline" size={24} color={theme.textMuted} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteCard(item.cardId)}>
                      <Ionicons name="trash-outline" size={24} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
              {item.langBack ? (
                <Text style={[styles.termLangLabel, { color: theme.primary, marginTop: 8 }]}>{langNameMap[item.langBack] || item.langBack}</Text>
              ) : null}
              <Text style={[styles.termDefinition, { color: theme.textMuted }]}>{item.contentBack}</Text>
            </View>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Quiz Mode Selection Modal */}
      <Modal visible={showQuizModeModal} transparent={true} animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowQuizModeModal(false)}>
          <View style={[styles.bottomSheet, { backgroundColor: theme.surface, paddingBottom: 30 }]}>
            <View style={[styles.bottomSheetHandle, { backgroundColor: theme.border }]} />
            <Text style={{ color: theme.textMuted, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15, fontSize: 16, fontWeight: 'bold' }}>Chọn chế độ ôn tập</Text>
            
            <TouchableOpacity style={[styles.optionItem, { borderBottomColor: theme.border, paddingHorizontal: 20 }]} onPress={() => {
              setShowQuizModeModal(false);
              navigateToLearning(`/quiz/${id}?newLimit=${studySettings?.newCardLimit ?? 20}&reviewLimit=0`);
            }}>
              <Ionicons name="sparkles-outline" size={24} color="#3b82f6" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600' }}>Học thẻ mới</Text>
                <Text style={{ color: theme.textMuted, fontSize: 13, marginTop: 2 }}>Chỉ học các thẻ mới chưa từng học (Giới hạn {studySettings?.newCardLimit ?? 20} thẻ)</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.optionItem, { borderBottomColor: theme.border, paddingHorizontal: 20 }]} onPress={() => {
              setShowQuizModeModal(false);
              navigateToLearning(`/quiz/${id}?newLimit=0&reviewLimit=${studySettings?.reviewCardLimit ?? 200}`);
            }}>
              <Ionicons name="repeat-outline" size={24} color="#10b981" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600' }}>Ôn tập thẻ cũ</Text>
                <Text style={{ color: theme.textMuted, fontSize: 13, marginTop: 2 }}>Ôn tập các thẻ đã học đến hạn (Giới hạn {studySettings?.reviewCardLimit ?? 200} thẻ)</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.optionItem, { borderBottomColor: theme.border, paddingHorizontal: 20 }]} onPress={() => {
              setShowQuizModeModal(false);
              navigateToLearning(`/quiz/${id}?newLimit=${studySettings?.newCardLimit ?? 20}&reviewLimit=${studySettings?.reviewCardLimit ?? 200}`);
            }}>
              <Ionicons name="shuffle-outline" size={24} color="#8b5cf6" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600' }}>Học hỗn hợp</Text>
                <Text style={{ color: theme.textMuted, fontSize: 13, marginTop: 2 }}>Trộn lẫn thẻ mới và thẻ cũ cùng ôn tập</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Options Modal */}
      <Modal visible={showOptionsModal} transparent={true} animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowOptionsModal(false)}>
          <View style={[styles.bottomSheet, { backgroundColor: theme.surface }]}>
            <View style={[styles.bottomSheetHandle, { backgroundColor: theme.border }]} />
            <TouchableOpacity style={[styles.optionItem, { borderBottomColor: theme.border }]} onPress={handleOpenFolderSelect}>
              <Ionicons name="folder-outline" size={24} color={theme.textMuted} />
              <Text style={[styles.optionText, { color: theme.text }]}>Thêm vào thư mục</Text>
            </TouchableOpacity>
            {isOwner && (
              <TouchableOpacity style={[styles.optionItem, { borderBottomColor: theme.border }]} onPress={() => {
                setShowOptionsModal(false);
                router.push(`/module/create?id=${id}` as any);
              }}>
                <Ionicons name="pencil-outline" size={24} color={theme.textMuted} />
                <Text style={[styles.optionText, { color: theme.text }]}>Sửa</Text>
              </TouchableOpacity>
            )}
            {isOwner && (
              <TouchableOpacity style={[styles.optionItem, { borderBottomColor: theme.border }]} onPress={handleChangeVisibility}>
                <Ionicons name={deckData.isPublic ? 'globe-outline' : 'lock-closed-outline'} size={24} color={theme.textMuted} />
                <Text style={[styles.optionText, { color: theme.text }]}>Quyền riêng tư</Text>
                <Text style={[styles.optionValue, { color: theme.primary }]}>{deckData.isPublic ? 'Mọi người' : 'Chỉ tôi'}</Text>
              </TouchableOpacity>
            )}
            {isOwner && (
              <TouchableOpacity style={[styles.optionItem, { borderBottomColor: theme.border }]} onPress={handleChangeAccessLevel}>
                <Ionicons name={isPlusDeck ? 'star' : 'star-outline'} size={24} color={theme.textMuted} />
                <Text style={[styles.optionText, { color: theme.text }]}>Loại học phần</Text>
                <Text style={[styles.optionValue, { color: isPlusDeck ? '#f59e0b' : theme.primary }]}>{isPlusDeck ? 'Plus' : 'Miễn phí'}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.optionItem, { borderBottomColor: theme.border }]} onPress={handleCloneDeck}>
              <Ionicons name="copy-outline" size={24} color={theme.textMuted} />
              <Text style={[styles.optionText, { color: theme.text }]}>Sao chép học phần</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.optionItem, { borderBottomColor: theme.border }]} onPress={handleExportCSV}>
              <Ionicons name="document-text-outline" size={24} color={theme.textMuted} />
              <Text style={[styles.optionText, { color: theme.text }]}>Xuất CSV</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.optionItem, { borderBottomColor: theme.border }]} onPress={handleExportPDF}>
              <Ionicons name="document-outline" size={24} color={theme.textMuted} />
              <Text style={[styles.optionText, { color: theme.text }]}>Xuất PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.optionItem, { borderBottomColor: theme.border }]} onPress={handleShareDeck}>
              <Ionicons name="share-social-outline" size={24} color={theme.textMuted} />
              <Text style={[styles.optionText, { color: theme.text }]}>Chia sẻ</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.optionItem, { borderBottomColor: theme.border }]} onPress={() => {
              setShowOptionsModal(false);
              setShowReportSheet(true);
            }}>
              <Ionicons name="flag-outline" size={24} color="#ef4444" />
              <Text style={[styles.optionText, { color: '#ef4444' }]}>Báo cáo học phần này</Text>
            </TouchableOpacity>
            {isOwner && (
              <TouchableOpacity style={[styles.optionItem, { borderBottomColor: theme.border }]} onPress={handleDeleteDeck}>
                <Ionicons name="trash-outline" size={24} color="#ef4444" />
                <Text style={[styles.optionText, { color: '#ef4444' }]}>Xóa</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Visibility Picker Modal */}
      <Modal visible={showVisibilityModal} transparent={true} animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowVisibilityModal(false)}>
          <View style={[styles.bottomSheet, { backgroundColor: theme.surface }]}>
            <View style={[styles.bottomSheetHandle, { backgroundColor: theme.border }]} />
            <Text style={[styles.visibilityTitle, { color: theme.textMuted }]}>Ai có thể xem</Text>
            <TouchableOpacity style={[styles.optionItem, { borderBottomColor: theme.border }]} onPress={() => applyVisibility(true)}>
              <Ionicons name="globe-outline" size={24} color={theme.textMuted} />
              <Text style={[styles.optionText, { color: theme.text }]}>Mọi người</Text>
              {deckData.isPublic ? <Ionicons name="checkmark" size={22} color={theme.primary} /> : null}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.optionItem, { borderBottomColor: theme.border }]} onPress={() => applyVisibility(false)}>
              <Ionicons name="lock-closed-outline" size={24} color={theme.textMuted} />
              <Text style={[styles.optionText, { color: theme.text }]}>Chỉ tôi</Text>
              {!deckData.isPublic ? <Ionicons name="checkmark" size={22} color={theme.primary} /> : null}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Access Level Picker Modal */}
      <Modal visible={showAccessLevelModal} transparent={true} animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowAccessLevelModal(false)}>
          <View style={[styles.bottomSheet, { backgroundColor: theme.surface }]}>
            <View style={[styles.bottomSheetHandle, { backgroundColor: theme.border }]} />
            <Text style={[styles.visibilityTitle, { color: theme.textMuted }]}>Loại học phần</Text>
            <TouchableOpacity style={[styles.optionItem, { borderBottomColor: theme.border }]} onPress={() => applyAccessLevel('free')}>
              <Ionicons name="star-outline" size={24} color={theme.textMuted} />
              <Text style={[styles.optionText, { color: theme.text }]}>Miễn phí</Text>
              {!isPlusDeck ? <Ionicons name="checkmark" size={22} color={theme.primary} /> : null}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.optionItem, { borderBottomColor: theme.border }]} onPress={() => applyAccessLevel('plus')}>
              <Ionicons name="star" size={24} color="#f59e0b" />
              <Text style={[styles.optionText, { color: theme.text }]}>Plus</Text>
              {isPlusDeck ? <Ionicons name="checkmark" size={22} color={theme.primary} /> : null}
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

      {/* Edit Card Modal */}
      <Modal visible={showCardEditModal} transparent={true} animationType="slide">
        <View style={[styles.fullScreenModal, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => setShowCardEditModal(false)}>
              <Text style={[styles.cancelText, { color: theme.textMuted }]}>Hủy</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Sửa thẻ</Text>
            <TouchableOpacity onPress={handleUpdateCard} disabled={isUpdatingCard}>
              {isUpdatingCard ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <Text style={styles.saveText}>Lưu</Text>
              )}
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>Thuật ngữ</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
              value={cardFront}
              onChangeText={setCardFront}
              placeholder="Nhập thuật ngữ"
              placeholderTextColor={theme.textMuted}
              multiline
            />
            <Text style={[styles.inputLabel, { color: theme.text }]}>Định nghĩa</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
              value={cardBack}
              onChangeText={setCardBack}
              placeholder="Nhập định nghĩa"
              placeholderTextColor={theme.textMuted}
              multiline
            />

            <Text style={[styles.inputLabel, { color: theme.text }]}>Hình ảnh</Text>
            <View style={styles.cardEditImageContainer}>
              {cardImage ? (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: cardImage.uri }} style={styles.cardEditImage} />
                  <TouchableOpacity style={styles.removeImageBtn} onPress={() => setCardImage(null)}>
                    <Ionicons name="close-circle" size={24} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ) : editingCard?.imageUrl ? (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: editingCard.imageUrl }} style={styles.cardEditImage} />
                  <TouchableOpacity style={styles.changeImageBtn} onPress={handlePickCardImage}>
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Thay đổi</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={[styles.addImageBtn, { borderColor: theme.border }]} onPress={handlePickCardImage}>
                  <Ionicons name="image-outline" size={32} color={theme.textMuted} />
                  <Text style={{ color: theme.textMuted, marginTop: 8 }}>Thêm hình ảnh</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>

      <ReportSheet
        visible={showReportSheet}
        onClose={() => setShowReportSheet(false)}
        targetType="deck"
        targetId={id as string}
      />

      {/* Rating Modal */}
      <Modal visible={showRatingModal} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowRatingModal(false)} />
          <View style={[styles.bottomSheet, { backgroundColor: theme.surface }]}>
            <View style={[styles.bottomSheetHandle, { backgroundColor: theme.border }]} />
            <Text style={[styles.modalTitle, { color: theme.text, textAlign: 'center', marginBottom: 16 }]}>Đánh giá học phần</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 24, gap: 12 }}>
              {[1, 2, 3, 4, 5].map(star => (
                <TouchableOpacity key={star} onPress={() => setMyRating(star)} activeOpacity={0.7}>
                  <Ionicons name={star <= myRating ? "star" : "star-outline"} size={40} color="#f59e0b" />
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity 
              style={{ backgroundColor: myRating > 0 ? theme.primary : theme.border, padding: 16, borderRadius: 12, alignItems: 'center' }} 
              onPress={handleSubmitRating} 
              disabled={myRating === 0}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>Gửi đánh giá</Text>
            </TouchableOpacity>
          </View>
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
  moduleTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  moduleTitle: { fontSize: 24, fontWeight: 'bold', flexShrink: 1 },
  moduleDesc: { fontSize: 16, marginBottom: 12 },
  authorContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  authorAvatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#5865F2', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  authorAvatarImage: { width: 24, height: 24, borderRadius: 12, marginRight: 8 },
  authorAvatarText: { color: '#ffffff', fontSize: 12, fontWeight: 'bold' },
  authorName: { fontSize: 16, fontWeight: '600' },
  termCount: { fontSize: 16 },
  deckStatsContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 12 },
  previewBanner: { flexDirection: 'row', gap: 16, alignItems: 'center', borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 24 },
  previewTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  previewText: { fontSize: 14, lineHeight: 20 },
  previewButton: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  previewButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 14, fontWeight: '600' },
  actionsContainer: { marginBottom: 32 },
  actionButton: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 12, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  actionButtonText: { marginLeft: 16, fontSize: 16, fontWeight: '600', flex: 1 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  progressDesc: { fontSize: 15, lineHeight: 22, marginBottom: 12 },
  nextReviewBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, marginBottom: 16, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 },
  nextReviewLabel: { fontSize: 12, marginBottom: 2 },
  nextReviewValue: { fontSize: 16, fontWeight: '700' },
  progressStats: { marginBottom: 32 },
  statCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 12, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  statRing: { width: 40, height: 40, borderRadius: 20, borderWidth: 3, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  statNumber: { fontSize: 14, fontWeight: 'bold' },
  statLabel: { flex: 1, fontSize: 16, fontWeight: '600' },
  termsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  searchBar: { marginBottom: 16 },
  sortText: { fontSize: 14, fontWeight: '500' },
  termCard: { padding: 16, borderRadius: 12, marginBottom: 12, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  termCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  termWord: { fontSize: 18, fontWeight: '500', flex: 1 },
  termImage: { width: 60, height: 60, borderRadius: 8, marginRight: 12 },
  termActions: { flexDirection: 'row' },
  termDefinition: { fontSize: 16, lineHeight: 24 },
  termLangLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  emptySearchState: { borderRadius: 12, padding: 20, marginBottom: 12 },
  emptySearchTitle: { fontSize: 16, fontWeight: '600', marginBottom: 6 },
  emptySearchText: { fontSize: 14, lineHeight: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject },
  bottomSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  bottomSheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  optionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1 },
  optionText: { fontSize: 18, marginLeft: 16, flex: 1 },
  optionValue: { fontSize: 15, fontWeight: '500' },
  gridActionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  gridActionButtonText: { marginLeft: 10, fontSize: 15, fontWeight: '600', flex: 1 },
  visibilityTitle: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', marginBottom: 4, marginLeft: 4 },
  fullScreenModal: { flex: 1, paddingTop: 50 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1 },
  cancelText: { fontSize: 16 },
  saveText: { fontSize: 16, color: '#5865F2', fontWeight: 'bold' },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalBody: { padding: 16 },
  inputLabel: { fontSize: 16, fontWeight: '600', marginBottom: 8, marginTop: 16 },
  textInput: { padding: 16, borderRadius: 12, fontSize: 16, borderWidth: 1 },
  folderSelectItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 12 },
  folderSelectItemText: { flex: 1, fontSize: 16, marginLeft: 16 },
  cardEditImageContainer: { marginTop: 8, alignItems: 'center' },
  cardEditImage: { width: '100%', height: 200, borderRadius: 12 },
  imagePreviewContainer: { width: '100%', position: 'relative' },
  removeImageBtn: { position: 'absolute', top: 10, right: 10, backgroundColor: '#fff', borderRadius: 15 },
  changeImageBtn: { position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  addImageBtn: { width: '100%', height: 150, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
});
