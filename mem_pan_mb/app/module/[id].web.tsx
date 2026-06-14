import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable, SafeAreaView, ActivityIndicator, Modal, TextInput, Alert, useColorScheme, Image, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { getDeck, getDeckCards, getDeckProgress, getDueCards, deleteDeck, updateDeck, updateDeckVisibility, getFolders, addDeckToFolder, deleteCard, updateCard, cloneDeck, getCurrentUser, upsertDeckReview, isPlusAccessError, PLUS_REQUIRED_MESSAGE, getDeckStudySettings, getMySubscription, normalizeSubscription } from '../../services/api';
import { devlog } from '../../services/devlog';
import Papa from 'papaparse';
import { ReportSheet } from '../../components/ui/ReportSheet';
import { formatNextReview } from '../../utils/timeFormatting';
import { PlusDeckBadge, isPlusDeck } from '../../components/ui/PlusDeckBadge';
import { SearchBar } from '../../components/ui/SearchBar';

function buildDeckShareUrl(deckId: string): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/module/${deckId}`;
  }
  return `/module/${deckId}`;
}

function getPreviewCardLimit(totalCards: number): number {
  if (totalCards <= 0) return 0;
  return Math.min(totalCards, Math.max(10, Math.ceil(totalCards * 0.1)));
}

// Reusable hoverable wrapper
function HoverableCard({ children, style, onPress, theme, disabled, ...rest }: any) {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <TouchableOpacity
      disabled={disabled}
      activeOpacity={0.8}
      onPress={onPress}
      // @ts-ignore
      onMouseEnter={() => !disabled && setIsHovered(true)}
      // @ts-ignore
      onMouseLeave={() => setIsHovered(false)}
      style={[
        style,
        { cursor: disabled ? 'default' : 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' } as any,
        (isHovered && !disabled) && { transform: [{ translateY: -2 }], boxShadow: `0 6px 12px ${theme.shadowColor}15` }
      ]}
      {...rest}
    >
      {children}
    </TouchableOpacity>
  );
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

export default function ModuleDetailWebScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;
  const isTablet = screenWidth >= 768 && screenWidth < 1100;

  const theme = {
    background: isDark ? '#111111' : '#f8f9fa',
    surface: isDark ? '#1c1c1e' : '#ffffff',
    text: isDark ? '#f4f4f5' : '#111827',
    textMuted: isDark ? '#a1a1aa' : '#6b7280',
    border: isDark ? '#27272a' : '#e5e7eb',
    primary: '#5865F2',
    iconBg: isDark ? '#27272a' : '#ffffff',
    iconColor: isDark ? '#f4f4f5' : '#1f2937',
    shadowColor: isDark ? '#000000' : '#000000',
  };

  const [deckData, setDeckData] = useState<any>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [cardSearchQuery, setCardSearchQuery] = useState('');
  const [cardsAccessBlocked, setCardsAccessBlocked] = useState(false);
  const [hasPlus, setHasPlus] = useState(false);
  const [progress, setProgress] = useState<any>(null);
  const [dueCount, setDueCount] = useState<number>(0);
  const [studySettings, setStudySettings] = useState<any>(null);
  // Re-render the next-review countdown over time; the label is derived from
  // the server's absolute timestamp, this tick just forces a recompute.
  const [nowTick, setNowTick] = useState(Date.now());
  const [creatorUsername, setCreatorUsername] = useState<string>('');
  const [creatorAvatar, setCreatorAvatar] = useState<string>('');
  const [currentUsername, setCurrentUsername] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Whether the signed-in user owns this deck. See app/module/[id].tsx for
  // the matching rule.
  const isOwner = (() => {
    if (!currentUsername) return false;
    if (!creatorUsername) return true;
    return creatorUsername === currentUsername;
  })();
  const deckIsPlus = isPlusDeck(deckData);

  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showReportSheet, setShowReportSheet] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFolderSelectModal, setShowFolderSelectModal] = useState(false);
  const [showVisibilityModal, setShowVisibilityModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [myRating, setMyRating] = useState(0);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [hasRatedDeck, setHasRatedDeck] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [folders, setFolders] = useState<any[]>([]);

  const [showCardEditModal, setShowCardEditModal] = useState(false);
  const [editingCard, setEditingCard] = useState<any>(null);
  const [cardFront, setCardFront] = useState('');
  const [cardBack, setCardBack] = useState('');
  const [cardImage, setCardImage] = useState<any>(null);
  const [isUpdatingCard, setIsUpdatingCard] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useFocusEffect(
    useCallback(() => {
      devlog.event('module:mount', { deckId: id });
      const fetchDeckData = async () => {
        try {
          setCardsAccessBlocked(false);
          const [deckRes, cardsRes, progressRes, dueRes, meRes, settingsRes, subscriptionRes] = await Promise.all([
            getDeck(id as string),
            getDeckCards(id as string).catch((error) => {
              if (isPlusAccessError(error)) {
                setCardsAccessBlocked(true);
                return { cards: [] };
              }
              throw error;
            }),
            getDeckProgress(id as string).catch((e) => { devlog.warn('module: getDeckProgress failed', { error: String(e?.message ?? e) }); return null; }),
            getDueCards(id as string).catch((e) => { devlog.warn('module: getDueCards failed', { error: String(e?.message ?? e) }); return { total: 0 }; }),
            getCurrentUser().catch(() => null),
            getDeckStudySettings(id as string).catch(() => null),
            getMySubscription(true).catch(() => null),
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
          devlog.info('module: deck loaded', { deckId: id, cardCount: cardsRes.cards?.length ?? 0, dueCount: dueRes?.total ?? 0 });
        } catch (error) {
          devlog.error('module: failed to load deck', error, { deckId: id });
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
    // RN Web's Alert.alert ignores the button array so the confirm callback
    // never fires. Use the browser's native confirm dialog instead.
    const confirmed = typeof window !== 'undefined'
      ? window.confirm('Bạn có chắc chắn muốn xóa học phần này?')
      : true;
    if (!confirmed) return;
    try {
      await deleteDeck(id as string);
      setShowOptionsModal(false);
      router.replace('/(tabs)/library' as any);
    } catch (error: any) {
      if (typeof window !== 'undefined') {
        window.alert(error.message || 'Không thể xóa học phần');
      }
    }
  };

  const handleUpdateDeck = async () => {
    try {
      await updateDeck(id as string, editName, editDesc);
      setDeckData({ ...deckData, name: editName, description: editDesc });
      setShowEditModal(false);
      setShowOptionsModal(false);
      Alert.alert('Thành công', 'Đã cập nhật học phần');
    } catch (error: any) { }
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

  const handleOpenFolderSelect = async () => {
    setShowOptionsModal(false);
    try {
      const res = await getFolders();
      setFolders(res.folders || []);
      setShowFolderSelectModal(true);
    } catch (error: any) { }
  };

  const handleAddToFolder = async (folderId: string) => {
    try {
      await addDeckToFolder(folderId, id as string);
      setShowFolderSelectModal(false);
      Alert.alert('Thành công', 'Đã thêm học phần vào thư mục');
    } catch (error: any) { }
  };

  const handleSubmitRating = async () => {
    if (myRating < 1 || myRating > 5 || isSubmittingRating) return;
    setIsSubmittingRating(true);
    try {
      const previousAvg = Number(deckData?.avgRating || 0);
      const previousTotal = Number(deckData?.totalReviews || 0);
      const response = await upsertDeckReview(id as string, myRating);
      const updatedDeck = response?.deck;
      setDeckData((prev: any) => {
        if (!prev) return prev;
        if (updatedDeck) return { ...prev, ...updatedDeck };
        const nextTotal = hasRatedDeck ? previousTotal : previousTotal + 1;
        const nextAvg = hasRatedDeck || previousTotal <= 0
          ? myRating
          : ((previousAvg * previousTotal) + myRating) / nextTotal;
        return { ...prev, avgRating: nextAvg, totalReviews: nextTotal };
      });
      setHasRatedDeck(true);
      setShowRatingModal(false);
      Alert.alert('Thành công', 'Cảm ơn bạn đã đánh giá học phần!');
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể gửi đánh giá.');
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const handleShareDeck = async () => {
    const url = buildDeckShareUrl(id as string);
    setShowOptionsModal(false);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
        Alert.alert('Đã sao chép', 'Đường dẫn học phần đã được sao chép.');
        return;
      } catch { }
    }
    Alert.alert('Đường dẫn', url);
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

  const handleExportCSV = () => {
    setShowOptionsModal(false);
    if (!cards || cards.length === 0) {
      window.alert('Không có thẻ nào để xuất.');
      return;
    }
    try {
      const csv = Papa.unparse(cards.map(c => ({
        'Thuật ngữ': c.contentFront,
        'Định nghĩa': c.contentBack
      })));
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${deckData.name.replace(/[^a-zA-Z0-9]/g, '_')}_cards.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error: any) {
      window.alert(error.message || 'Không thể xuất CSV');
    }
  };

  const handleExportPDF = () => {
    setShowOptionsModal(false);
    if (!cards || cards.length === 0) {
      window.alert('Không có thẻ nào để xuất.');
      return;
    }
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        window.alert('Trình duyệt đã chặn cửa sổ pop-up. Vui lòng cho phép để in PDF.');
        return;
      }
      const htmlContent = `
        <html>
          <head>
            <title>${deckData.name}</title>
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
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    } catch (error: any) {
      window.alert(error.message || 'Không thể xuất PDF');
    }
  };

  const handleOpenCardEdit = (card: any) => {
    devlog.event('card:edit:open', { cardId: card?.cardId });
    setEditingCard(card);
    setCardFront(card.contentFront);
    setCardBack(card.contentBack);
    setCardImage(null);
    setShowCardEditModal(true);
  };

  const handlePickCardImage = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const uri = URL.createObjectURL(file);
    setCardImage({
      uri,
      type: file.type || 'image/jpeg',
      name: file.name || `card_${Date.now()}.jpg`,
    });
    // Reset the input so the same file can be re-selected
    e.target.value = '';
  };

  const handleUpdateCard = async () => {
    devlog.event('card:edit:submit', { cardId: editingCard?.cardId });
    if (!cardFront.trim() || !cardBack.trim()) {
      devlog.warn('card:edit aborted — empty front/back');
      return;
    }
    setIsUpdatingCard(true);
    try {
      const res = await updateCard(editingCard.cardId, {
        contentFront: cardFront,
        contentBack: cardBack,
        image: cardImage || undefined,
      });
      const updatedCards = cards.map(c => c.cardId === editingCard.cardId ? { ...c, ...res.card } : c);
      setCards(updatedCards);
      setShowCardEditModal(false);
      devlog.info('card:edit:success', { cardId: editingCard.cardId });
    } catch (error: any) {
      devlog.error('card:edit:failed', error, { cardId: editingCard?.cardId });
    } finally {
      setIsUpdatingCard(false);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    devlog.event('card:delete:click', { cardId });
    // RN Web's Alert.alert ignores the button array, so the confirm callback
    // never fires. Use the browser's native confirm dialog instead.
    if (typeof window !== 'undefined' && !window.confirm('Bạn có chắc muốn xóa thẻ này?')) {
      devlog.info('card:delete cancelled by user', { cardId });
      return;
    }
    try {
      await deleteCard(cardId);
      setCards(cards.filter(c => c.cardId !== cardId));
      devlog.info('card:delete:success', { cardId });
    } catch (error: any) {
      devlog.error('card:delete:failed', error, { cardId });
      if (typeof window !== 'undefined') {
        window.alert(error?.message || 'Không thể xóa thẻ');
      }
    }
  };

  if (!deckData) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: theme.text }}>Không tìm thấy học phần</Text>
      </View>
    );
  }

  const totalCardCount = Number(deckData?.cardCount || cards.length || 0);
  const isPreviewMode = deckIsPlus && !hasPlus;
  const previewCardLimit = getPreviewCardLimit(totalCardCount);
  const previewLoadedCount = Math.min(cards.length, previewCardLimit);
  const canStartLearning = !isPreviewMode && cards.length > 0;
  const learningActionsDisabled = !canStartLearning;
  const learningActionsMuted = !canStartLearning;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border, paddingHorizontal: isMobile ? 12 : 32 }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.iconButton, { backgroundColor: theme.iconBg }]}>
          <Ionicons name="arrow-back" size={24} color={theme.iconColor} />
          <Text style={[styles.iconButtonText, { color: theme.iconColor }]}>Trở lại</Text>
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <TouchableOpacity style={[styles.iconButton, { backgroundColor: theme.iconBg }]} onPress={() => setShowOptionsModal(true)}>
            <Ionicons name="ellipsis-horizontal" size={24} color={theme.iconColor} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.contentWrapper, { paddingHorizontal: isMobile ? 16 : isTablet ? 24 : 32 }]}>

          <View style={[styles.heroSection, { flexDirection: isMobile ? 'column' : 'row' }]}>
            <View style={[styles.heroLeft]}>
              <View style={styles.moduleTitleRow}>
                <Text style={[styles.moduleTitle, { color: theme.text, fontSize: isMobile ? 22 : 36 }]}>{deckData.name}</Text>
                {deckIsPlus ? <PlusDeckBadge /> : null}
              </View>
              {deckData.description ? <Text style={[styles.moduleDesc, { color: theme.textMuted, fontSize: isMobile ? 15 : 18 }]}>{deckData.description}</Text> : null}

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

              <TouchableOpacity style={[styles.ratingPanel, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => setShowRatingModal(true)}>
                <View style={styles.ratingSummary}>
                  <Ionicons name="star" size={22} color="#f59e0b" />
                  <Text style={[styles.ratingValue, { color: theme.text }]}>
                    {typeof deckData.avgRating === 'number' ? deckData.avgRating.toFixed(1) : (deckData.avgRating || '0.0')}
                  </Text>
                  <Text style={[styles.ratingCount, { color: theme.textMuted }]}>({deckData.totalReviews || 0} đánh giá)</Text>
                </View>
                <View style={styles.ratingPrompt}>
                  <Text style={[styles.ratingPromptText, { color: theme.primary }]}>Đánh giá học phần</Text>
                  <Ionicons name="chevron-forward" size={18} color={theme.primary} />
                </View>
              </TouchableOpacity>

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

              {/* Action Buttons Grid */}
              <View style={[styles.actionsGridWeb, { gap: 10 }]}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {/* Thẻ ghi nhớ */}
                  <HoverableCard 
                    theme={theme} 
                    disabled={learningActionsDisabled} 
                    style={[styles.gridActionButtonWeb, { backgroundColor: theme.surface, borderColor: theme.border }]} 
                    onPress={() => router.push(`/flashcard/${id}` as any)}
                  >
                    <Ionicons name="albums" size={22} color={!learningActionsMuted ? "#3b82f6" : theme.textMuted} />
                    <Text numberOfLines={1} style={[styles.gridActionButtonTextWeb, { color: theme.text }, learningActionsMuted && { color: theme.textMuted }]}>
                      Thẻ ghi nhớ
                    </Text>
                  </HoverableCard>

                  {/* Kiểm tra */}
                  <HoverableCard 
                    theme={theme} 
                    disabled={learningActionsDisabled} 
                    style={[styles.gridActionButtonWeb, { backgroundColor: theme.surface, borderColor: theme.border }]} 
                    onPress={() => router.push(`/practice-setup/${id}` as any)}
                  >
                    <Ionicons name="document-text" size={22} color={!learningActionsMuted ? "#10b981" : theme.textMuted} />
                    <Text numberOfLines={1} style={[styles.gridActionButtonTextWeb, { color: theme.text }, learningActionsMuted && { color: theme.textMuted }]}>
                      Kiểm tra
                    </Text>
                  </HoverableCard>
                </View>
              </View>
            </View>

            {!isMobile && (
              <View style={styles.heroRight}>
                {cards.length > 0 ? (
                  <TouchableOpacity style={[styles.flashcardPreview, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => router.push(`/flashcard/${id}` as any)} disabled={isPreviewMode}>
                    <Text style={[styles.flashcardWord, { color: theme.text }]}>{cards[0].contentFront}</Text>
                    {!isPreviewMode ? <Ionicons name="scan-outline" size={20} color={theme.textMuted} style={styles.fullscreenIcon} /> : null}
                  </TouchableOpacity>
                ) : isPreviewMode || cardsAccessBlocked ? (
                  <View style={[styles.flashcardPreview, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <Text style={[styles.flashcardWord, { color: theme.text, textAlign: 'center' }]}>{PLUS_REQUIRED_MESSAGE}</Text>
                  </View>
                ) : (
                  <View style={[styles.flashcardPreview, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <Text style={[styles.flashcardWord, { color: theme.text }]}>Học phần trống</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Progress */}
          <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 16 }]}>Tiến độ</Text>

          <View style={[styles.progressStatsGrid, { flexWrap: isMobile ? 'wrap' : 'nowrap', gap: isMobile ? 10 : 24, flexDirection: isMobile ? 'column' : 'row' }]}>
            {/* Thẻ chưa học bao giờ */}
            <HoverableCard 
              theme={theme} 
              disabled={learningActionsDisabled} 
              style={[styles.statCardWeb, { backgroundColor: theme.surface, borderColor: theme.border }]} 
              onPress={() => router.push(`/quiz/${id}?newLimit=${studySettings?.newCardLimit ?? 20}&reviewLimit=0` as any)}
              // @ts-ignore
              title="Giới hạn bởi Daily Limits của bạn, dự kiến học trong hôm nay"
            >
              <View style={[styles.statRing, { borderColor: '#5865F2' }]}>
                <Text style={[styles.statNumber, { color: theme.text }]}>{progress?.newCount ?? 0}</Text>
              </View>
              <Text style={[styles.statLabel, { color: theme.text, marginLeft: 16 }]}>Chưa học</Text>
            </HoverableCard>

            {/* Thẻ đang học dở dang */}
            <HoverableCard 
              theme={theme} 
              disabled={learningActionsDisabled} 
              style={[styles.statCardWeb, { backgroundColor: theme.surface, borderColor: theme.border }]} 
              onPress={() => router.push(`/quiz/${id}?filterState=studying` as any)}
              // @ts-ignore
              title="Đang trong quá trình lặp lại ngắn hạn (1 phút, 10 phút) để ghi nhớ tạm thời"
            >
              <View style={[styles.statRing, { borderColor: '#f59e0b' }]}>
                <Text style={[styles.statNumber, { color: theme.text }]}>{progress?.learnCount ?? 0}</Text>
              </View>
              <Text style={[styles.statLabel, { color: theme.text, marginLeft: 16 }]}>Đang học</Text>
            </HoverableCard>

            {/* Thẻ cần ôn tập */}
            <HoverableCard 
              theme={theme} 
              disabled={learningActionsDisabled} 
              style={[styles.statCardWeb, { backgroundColor: theme.surface, borderColor: theme.border }]} 
              onPress={() => router.push(`/quiz/${id}?newLimit=0&reviewLimit=${studySettings?.reviewCardLimit ?? 200}` as any)}
              // @ts-ignore
              title="Đã thuộc trước đó nhưng đến hạn phải kiểm tra lại theo lịch FSRS để tránh quên"
            >
              <View style={[styles.statRing, { borderColor: '#10b981' }]}>
                <Text style={[styles.statNumber, { color: theme.text }]}>{dueCount ?? 0}</Text>
              </View>
              <Text style={[styles.statLabel, { color: theme.text, marginLeft: 16 }]}>Đến hạn</Text>
            </HoverableCard>
          </View>

          {/* Terms List Grid */}
          <View style={styles.termsHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {isPreviewMode ? 'Xem trước' : 'Thuật ngữ'} ({filteredCards.length}{cardSearchQuery.trim() ? `/${cards.length}` : ''}{isPreviewMode ? `/${totalCardCount}` : ''})
            </Text>
          </View>

          <SearchBar
            value={cardSearchQuery}
            onChangeText={setCardSearchQuery}
            placeholder="Tìm thuật ngữ hoặc định nghĩa"
            style={styles.searchBar}
          />

          <View style={styles.termsGrid}>
            {filteredCards.length === 0 ? (
              <View style={[styles.emptySearchState, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={[styles.emptySearchTitle, { color: theme.text }]}>Không tìm thấy thẻ phù hợp</Text>
                <Text style={[styles.emptySearchText, { color: theme.textMuted }]}>
                  Thử từ khóa khác hoặc xóa bộ lọc tìm kiếm.
                </Text>
              </View>
            ) : (
              filteredCards.map((item) => (
                <View key={item.cardId} style={[styles.termCardWeb, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <View style={styles.termCardContent}>
                    <View style={styles.termSide}>
                      {item.langFront ? <Text style={[styles.termLangLabel, { color: theme.primary }]}>{langNameMap[item.langFront] || item.langFront}</Text> : null}
                      <Text style={[styles.termText, { color: theme.text }]}>{item.contentFront}</Text>
                    </View>
                    <View style={[styles.termDivider, { backgroundColor: theme.border }]} />
                    <View style={styles.termSide}>
                      {item.langBack ? <Text style={[styles.termLangLabel, { color: theme.primary }]}>{langNameMap[item.langBack] || item.langBack}</Text> : null}
                      <Text style={[styles.termText, { color: theme.textMuted }]}>{item.contentBack}</Text>
                    </View>
                    {item.imageUrl ? (
                      <View style={styles.termImageSide}>
                        <Image source={{ uri: item.imageUrl }} style={styles.termImage} resizeMode="cover" />
                      </View>
                    ) : null}
                  </View>
                  {isOwner && (
                    <View style={styles.termActionsWeb}>
                      <TouchableOpacity style={styles.actionIconCell} onPress={() => handleOpenCardEdit(item)}>
                        <Ionicons name="pencil-outline" size={20} color={theme.textMuted} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionIconCell} onPress={() => handleDeleteCard(item.cardId)}>
                        <Ionicons name="trash-outline" size={20} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))
            )}
          </View>

          <View style={{ height: 60 }} />
        </View>
      </ScrollView>

      {/* Options Modal (web) */}
      <Modal visible={showOptionsModal} transparent={true} animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowOptionsModal(false)}>
          <View style={[styles.optionsModalContent, { backgroundColor: theme.background, borderColor: theme.border, width: isMobile ? screenWidth - 32 : 360 }]} onStartShouldSetResponder={() => true}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Tùy chọn</Text>
            <HoverableCard theme={theme} style={[styles.optionRow, { backgroundColor: theme.surface }]} onPress={handleOpenFolderSelect}>
              <Ionicons name="folder-outline" size={22} color={theme.textMuted} />
              <Text style={[styles.optionRowText, { color: theme.text }]}>Thêm vào thư mục</Text>
            </HoverableCard>
            {isOwner && (
              <HoverableCard theme={theme} style={[styles.optionRow, { backgroundColor: theme.surface }]} onPress={() => {
                setShowOptionsModal(false);
                router.push(`/module/create?id=${id}` as any);
              }}>
                <Ionicons name="pencil-outline" size={22} color={theme.textMuted} />
                <Text style={[styles.optionRowText, { color: theme.text }]}>Sửa</Text>
              </HoverableCard>
            )}
            {isOwner && (
              <HoverableCard theme={theme} style={[styles.optionRow, { backgroundColor: theme.surface }]} onPress={handleChangeVisibility}>
                <Ionicons name={deckData.isPublic ? 'globe-outline' : 'lock-closed-outline'} size={22} color={theme.textMuted} />
                <Text style={[styles.optionRowText, { color: theme.text }]}>Quyền riêng tư</Text>
                <Text style={{ color: theme.primary, marginLeft: 'auto', fontWeight: '600' } as any}>{deckData.isPublic ? 'Mọi người' : 'Chỉ tôi'}</Text>
              </HoverableCard>
            )}
            <HoverableCard theme={theme} style={[styles.optionRow, { backgroundColor: theme.surface }]} onPress={handleCloneDeck}>
              <Ionicons name="copy-outline" size={22} color={theme.textMuted} />
              <Text style={[styles.optionRowText, { color: theme.text }]}>Sao chép học phần</Text>
            </HoverableCard>
            <HoverableCard theme={theme} style={[styles.optionRow, { backgroundColor: theme.surface }]} onPress={handleExportCSV}>
              <Ionicons name="document-text-outline" size={22} color={theme.textMuted} />
              <Text style={[styles.optionRowText, { color: theme.text }]}>Xuất CSV</Text>
            </HoverableCard>
            <HoverableCard theme={theme} style={[styles.optionRow, { backgroundColor: theme.surface }]} onPress={handleExportPDF}>
              <Ionicons name="document-outline" size={22} color={theme.textMuted} />
              <Text style={[styles.optionRowText, { color: theme.text }]}>Xuất PDF</Text>
            </HoverableCard>
            <HoverableCard theme={theme} style={[styles.optionRow, { backgroundColor: theme.surface }]} onPress={handleShareDeck}>
              <Ionicons name="share-social-outline" size={22} color={theme.textMuted} />
              <Text style={[styles.optionRowText, { color: theme.text }]}>Chia sẻ</Text>
            </HoverableCard>
            <HoverableCard theme={theme} style={[styles.optionRow, { backgroundColor: theme.surface }]} onPress={() => {
              setShowOptionsModal(false);
              setShowReportSheet(true);
            }}>
              <Ionicons name="flag-outline" size={22} color="#ef4444" />
              <Text style={[styles.optionRowText, { color: '#ef4444' }]}>Báo cáo học phần này</Text>
            </HoverableCard>
            {isOwner && (
              <HoverableCard theme={theme} style={[styles.optionRow, { backgroundColor: theme.surface }]} onPress={handleDeleteDeck}>
                <Ionicons name="trash-outline" size={22} color="#ef4444" />
                <Text style={[styles.optionRowText, { color: '#ef4444' }]}>Xóa</Text>
              </HoverableCard>
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setShowOptionsModal(false)} style={styles.btnSecondary}>
                <Text style={{ color: theme.text }}>Đóng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Visibility Picker Modal (web) */}
      <Modal visible={showVisibilityModal} transparent={true} animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowVisibilityModal(false)}>
          <View style={[styles.optionsModalContent, { backgroundColor: theme.background, borderColor: theme.border, width: isMobile ? screenWidth - 32 : 360 }]} onStartShouldSetResponder={() => true}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Ai có thể xem</Text>
            <HoverableCard theme={theme} style={[styles.optionRow, { backgroundColor: theme.surface }]} onPress={() => applyVisibility(true)}>
              <Ionicons name="globe-outline" size={22} color={theme.textMuted} />
              <Text style={[styles.optionRowText, { color: theme.text }]}>Mọi người</Text>
              {deckData.isPublic ? <Ionicons name="checkmark" size={20} color={theme.primary} style={{ marginLeft: 'auto' } as any} /> : null}
            </HoverableCard>
            <HoverableCard theme={theme} style={[styles.optionRow, { backgroundColor: theme.surface }]} onPress={() => applyVisibility(false)}>
              <Ionicons name="lock-closed-outline" size={22} color={theme.textMuted} />
              <Text style={[styles.optionRowText, { color: theme.text }]}>Chỉ tôi</Text>
              {!deckData.isPublic ? <Ionicons name="checkmark" size={20} color={theme.primary} style={{ marginLeft: 'auto' } as any} /> : null}
            </HoverableCard>
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setShowVisibilityModal(false)} style={styles.btnSecondary}>
                <Text style={{ color: theme.text }}>Đóng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit Deck Modal reused minimally */}
      <Modal visible={showEditModal} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContentWeb, { backgroundColor: theme.background, borderColor: theme.border, width: isMobile ? screenWidth - 32 : 500 }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Sửa học phần</Text>
            <TextInput style={[styles.textInput, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]} value={editName} onChangeText={setEditName} placeholder="Nhập tên học phần" placeholderTextColor={theme.textMuted} />
            <TextInput style={[styles.textInput, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border, marginTop: 12 }]} value={editDesc} onChangeText={setEditDesc} placeholder="Nhập mô tả" placeholderTextColor={theme.textMuted} multiline />
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setShowEditModal(false)} style={styles.btnSecondary}><Text style={{ color: theme.text }}>Hủy</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleUpdateDeck} style={styles.btnPrimary}><Text style={{ color: '#fff' }}>Lưu</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showFolderSelectModal} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContentWeb, { backgroundColor: theme.background, borderColor: theme.border, width: isMobile ? screenWidth - 32 : 500 }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Thêm vào thư mục</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {folders.map((f) => (
                <HoverableCard key={f.folderId} theme={theme} style={[styles.folderSelectItem, { backgroundColor: theme.surface }]} onPress={() => handleAddToFolder(f.folderId)}>
                  <Ionicons name="folder-outline" size={24} color={theme.textMuted} />
                  <Text style={[styles.folderSelectItemText, { color: theme.text }]}>{f.name}</Text>
                </HoverableCard>
              ))}
            </ScrollView>
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setShowFolderSelectModal(false)} style={styles.btnSecondary}><Text style={{ color: theme.text }}>Đóng</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Rating Modal (web) */}
      <Modal visible={showRatingModal} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowRatingModal(false)} />
          <View style={[styles.ratingModalContent, { backgroundColor: theme.background, borderColor: theme.border, width: isMobile ? screenWidth - 32 : 420 }]}>
            <Text style={[styles.modalTitle, { color: theme.text, textAlign: 'center' }]}>Đánh giá học phần</Text>
            <Text style={[styles.ratingHelpText, { color: theme.textMuted }]}>Chọn số sao phù hợp với chất lượng nội dung học phần.</Text>
            <View style={styles.ratingStars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setMyRating(star)} style={styles.ratingStarButton} activeOpacity={0.7}>
                  <Ionicons name={star <= myRating ? 'star' : 'star-outline'} size={42} color="#f59e0b" />
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setShowRatingModal(false)} style={styles.btnSecondary} disabled={isSubmittingRating}>
                <Text style={{ color: theme.text }}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSubmitRating} style={[styles.btnPrimary, (myRating === 0 || isSubmittingRating) && { opacity: 0.55 }]} disabled={myRating === 0 || isSubmittingRating}>
                {isSubmittingRating ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Gửi đánh giá</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Hidden file input for web image picker */}
      {typeof document !== 'undefined' && (
        <input
          ref={fileInputRef as any}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileChange as any}
        />
      )}

      {/* Edit Card Modal (web) */}
      <Modal visible={showCardEditModal} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContentWeb, { backgroundColor: theme.background, borderColor: theme.border, width: isMobile ? screenWidth - 32 : 500 }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Sửa thẻ</Text>
            <Text style={[{ color: theme.text, marginBottom: 6, marginTop: 4 }]}>Thuật ngữ</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
              value={cardFront}
              onChangeText={setCardFront}
              placeholder="Nhập thuật ngữ"
              placeholderTextColor={theme.textMuted}
              multiline
            />
            <Text style={[{ color: theme.text, marginBottom: 6, marginTop: 12 }]}>Định nghĩa</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
              value={cardBack}
              onChangeText={setCardBack}
              placeholder="Nhập định nghĩa"
              placeholderTextColor={theme.textMuted}
              multiline
            />

            {/* Image section */}
            <Text style={[{ color: theme.text, marginBottom: 6, marginTop: 12, fontWeight: '600' as any }]}>Hình ảnh</Text>
            <View style={styles.cardEditImageContainer}>
              {cardImage ? (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: cardImage.uri }} style={styles.cardEditImage} resizeMode="contain" />
                  <TouchableOpacity style={styles.removeImageBtn} onPress={() => setCardImage(null)}>
                    <Ionicons name="close-circle" size={24} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ) : editingCard?.imageUrl ? (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: editingCard.imageUrl }} style={styles.cardEditImage} resizeMode="contain" />
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

            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setShowCardEditModal(false)} style={styles.btnSecondary} disabled={isUpdatingCard}>
                <Text style={{ color: theme.text }}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleUpdateCard} style={styles.btnPrimary} disabled={isUpdatingCard || !cardFront.trim() || !cardBack.trim()}>
                {isUpdatingCard ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ color: '#fff' }}>Lưu</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ReportSheet
        visible={showReportSheet}
        onClose={() => setShowReportSheet(false)}
        targetType="deck"
        targetId={id as string}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 32, paddingVertical: 16, borderBottomWidth: 1 },
  iconButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, gap: 8 },
  iconButtonText: { fontSize: 16, fontWeight: '500' },
  headerRight: { flexDirection: 'row' },
  scrollContent: { alignItems: 'center', paddingVertical: 24 },
  contentWrapper: { width: '100%', maxWidth: 1100 },

  heroSection: { gap: 32, marginBottom: 32 },
  heroLeft: { flex: 1 },
  heroRight: { flex: 1 },

  flashcardPreview: { height: 300, width: '100%', borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1, position: 'relative' },
  flashcardWord: { fontSize: 32, fontWeight: '500', textAlign: 'center', paddingHorizontal: 24 },
  fullscreenIcon: { position: 'absolute', bottom: 20, right: 20 },

  moduleTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  moduleTitle: { fontSize: 36, fontWeight: 'bold', flexShrink: 1 },
  moduleDesc: { fontSize: 18, marginBottom: 16 },
  authorContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 32 },
  authorAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#5865F2', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  authorAvatarImage: { width: 32, height: 32, borderRadius: 16, marginRight: 12 },
  authorAvatarText: { color: '#ffffff', fontSize: 14, fontWeight: 'bold' },
  authorName: { fontSize: 16, fontWeight: '600' },
  termCount: { fontSize: 16 },
  previewBanner: { flexDirection: 'row', alignItems: 'center', gap: 16, borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 20 },
  previewTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  previewText: { fontSize: 14, lineHeight: 20 },
  previewButton: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  previewButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  ratingPanel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 20, gap: 12 },
  ratingSummary: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ratingValue: { fontSize: 18, fontWeight: '800' },
  ratingCount: { fontSize: 14 },
  ratingPrompt: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingPromptText: { fontSize: 14, fontWeight: '700' },
  ratingModalContent: { borderRadius: 16, borderWidth: 1, padding: 24, zIndex: 1 },
  ratingHelpText: { fontSize: 14, textAlign: 'center', marginTop: -4, marginBottom: 18 },
  ratingStars: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 22 },
  ratingStarButton: { padding: 4, cursor: 'pointer' as any },

  actionsGrid: { flexDirection: 'row', gap: 12 },
  actionCard: { flex: 1, paddingVertical: 16, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, alignItems: 'center', gap: 8 },
  actionCardText: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  actionsGridWeb: { gap: 10, marginBottom: 24 },
  gridActionButtonWeb: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1 },
  gridActionButtonTextWeb: { marginLeft: 10, fontSize: 15, fontWeight: '600', flex: 1 },

  sectionTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  progressDesc: { fontSize: 16, marginBottom: 12 },
  nextReviewBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 20 },
  nextReviewLabel: { fontSize: 12, marginBottom: 2 },
  nextReviewValue: { fontSize: 16, fontWeight: '700' },
  progressStatsGrid: { flexDirection: 'row', gap: 16, marginBottom: 32 },
  statCardWeb: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, gap: 12 },
  statRing: { width: 44, height: 44, borderRadius: 22, borderWidth: 3, justifyContent: 'center', alignItems: 'center' },
  statNumber: { fontSize: 16, fontWeight: 'bold' },
  statLabel: { fontSize: 18, fontWeight: '600' },

  termsHeader: { marginBottom: 20 },
  searchBar: { marginBottom: 16 },
  termsGrid: { flexDirection: 'column', gap: 16 },
  emptySearchState: { borderRadius: 12, borderWidth: 1, padding: 20 },
  emptySearchTitle: { fontSize: 16, fontWeight: '600', marginBottom: 6 },
  emptySearchText: { fontSize: 14, lineHeight: 20 },
  termCardWeb: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  termCardContent: { flex: 1, flexDirection: 'row' },
  termSide: { flex: 1, padding: 20 },
  termImageSide: { padding: 20, justifyContent: 'center', alignItems: 'center' },
  termImage: { width: 96, height: 96, borderRadius: 8 },
  termDivider: { width: 1 },
  termLangLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  termText: { fontSize: 18, lineHeight: 26 },
  termActionsWeb: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8 },
  actionIconCell: { padding: 8, borderRadius: 8, cursor: 'pointer' as any },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject },
  modalContentWeb: { maxWidth: 500, padding: 24, borderRadius: 16, borderWidth: 1 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  textInput: { padding: 12, borderRadius: 8, fontSize: 16, borderWidth: 1 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 24 },
  btnSecondary: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: 'transparent' },
  btnPrimary: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, backgroundColor: '#5865F2' },

  folderSelectItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, marginBottom: 8 },
  folderSelectItemText: { flex: 1, fontSize: 16, marginLeft: 12 },

  optionsModalContent: { maxWidth: 360, padding: 20, borderRadius: 16, borderWidth: 1, gap: 8 },
  optionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, gap: 12 },
  optionRowText: { fontSize: 16, fontWeight: '500' },

  cardEditImageContainer: { marginTop: 4, alignItems: 'center' },
  cardEditImage: { width: '100%', height: 200, borderRadius: 12 },
  imagePreviewContainer: { width: '100%', position: 'relative' },
  removeImageBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: '#fff', borderRadius: 15 },
  changeImageBtn: { position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  addImageBtn: { width: '100%', height: 120, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed' as any, justifyContent: 'center', alignItems: 'center', cursor: 'pointer' as any },
});
