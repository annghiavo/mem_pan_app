import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, Modal, TextInput, Alert, useColorScheme, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { getDeck, getDeckCards, getDeckProgress, getDueCards, deleteDeck, updateDeck, updateDeckVisibility, getFolders, addDeckToFolder, deleteCard, updateCard, cloneDeck, getCurrentUser } from '../../services/api';
import { devlog } from '../../services/devlog';
import Papa from 'papaparse';
import { ReportSheet } from '../../components/ui/ReportSheet';
import { formatNextReview } from '../../utils/timeFormatting';

function buildDeckShareUrl(deckId: string): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/module/${deckId}`;
  }
  return `/module/${deckId}`;
}

// Reusable hoverable wrapper
function HoverableCard({ children, style, onPress, theme, disabled }: any) {
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
  const [progress, setProgress] = useState<any>(null);
  const [dueCount, setDueCount] = useState<number>(0);
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

  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showReportSheet, setShowReportSheet] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFolderSelectModal, setShowFolderSelectModal] = useState(false);
  const [showVisibilityModal, setShowVisibilityModal] = useState(false);
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
          const [deckRes, cardsRes, progressRes, dueRes, meRes] = await Promise.all([
            getDeck(id as string),
            getDeckCards(id as string),
            getDeckProgress(id as string).catch((e) => { devlog.warn('module: getDeckProgress failed', { error: String(e?.message ?? e) }); return null; }),
            getDueCards(id as string).catch((e) => { devlog.warn('module: getDueCards failed', { error: String(e?.message ?? e) }); return { total: 0 }; }),
            getCurrentUser().catch(() => null),
          ]);
          setDeckData(deckRes.deck);
          setCreatorUsername(deckRes.creatorUsername || '');
          setCreatorAvatar(deckRes.creatorAvatar || '');
          setCards(cardsRes.cards || []);
          setProgress(progressRes);
          setDueCount(dueRes?.total || 0);
          const me = meRes?.user || meRes?.data || meRes;
          if (me?.username) setCurrentUsername(me.username);
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

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
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
        <View style={styles.contentWrapper}>

          <View style={styles.heroSection}>
            <View style={styles.heroLeft}>
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

              <View style={styles.actionsGrid}>
                <HoverableCard theme={theme} disabled={cards.length === 0} style={[styles.actionCard, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => router.push(`/flashcard/${id}` as any)}>
                  <Ionicons name="albums" size={32} color={cards.length > 0 ? "#3b82f6" : theme.textMuted} />
                  <Text style={[styles.actionCardText, { color: theme.text }, cards.length === 0 && { color: theme.textMuted }]}>Flashcard</Text>
                </HoverableCard>
                <HoverableCard theme={theme} disabled={cards.length === 0} style={[styles.actionCard, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => router.push(`/quiz/${id}` as any)}>
                  <Ionicons name="refresh-circle" size={32} color={cards.length > 0 ? "#8b5cf6" : theme.textMuted} />
                  <Text style={[styles.actionCardText, { color: theme.text }, cards.length === 0 && { color: theme.textMuted }]}>Ôn tập</Text>
                </HoverableCard>
                <HoverableCard theme={theme} disabled={cards.length === 0} style={[styles.actionCard, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => router.push(`/practice-setup/${id}` as any)}>
                  <Ionicons name="document-text" size={32} color={cards.length > 0 ? "#10b981" : theme.textMuted} />
                  <Text style={[styles.actionCardText, { color: theme.text }, cards.length === 0 && { color: theme.textMuted }]}>Kiểm tra</Text>
                </HoverableCard>
              </View>
            </View>

            <View style={styles.heroRight}>
              {cards.length > 0 ? (
                <TouchableOpacity style={[styles.flashcardPreview, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => router.push(`/flashcard/${id}` as any)}>
                  <Text style={[styles.flashcardWord, { color: theme.text }]}>{cards[0].contentFront}</Text>
                  <Ionicons name="scan-outline" size={20} color={theme.textMuted} style={styles.fullscreenIcon} />
                </TouchableOpacity>
              ) : (
                <View style={[styles.flashcardPreview, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Text style={[styles.flashcardWord, { color: theme.text }]}>Học phần trống</Text>
                </View>
              )}
            </View>
          </View>

          {/* Progress */}
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Tiến độ</Text>
          <Text style={[styles.progressDesc, { color: theme.textMuted }]}>
            Thẻ cần ôn: <Text style={{ fontWeight: 'bold', color: '#f59e0b' }}>{dueCount}</Text>
          </Text>

          {(() => {
            const nextReview = formatNextReview(progress?.nextReviewDate, progress?.dueNow, nowTick);
            const toneColor = nextReview.tone === 'due' ? '#f59e0b' : nextReview.tone === 'soon' ? theme.primary : theme.textMuted;
            const icon = nextReview.tone === 'due' ? 'alarm' : nextReview.tone === 'soon' ? 'time-outline' : 'calendar-outline';
            return (
              <View style={[styles.nextReviewBanner, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Ionicons name={icon as any} size={20} color={toneColor} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.nextReviewLabel, { color: theme.textMuted }]}>Lần ôn tập tiếp theo</Text>
                  <Text style={[styles.nextReviewValue, { color: toneColor }]}>{nextReview.label}</Text>
                </View>
              </View>
            );
          })()}

          <View style={styles.progressStatsGrid}>
            <HoverableCard theme={theme} disabled={cards.length === 0} style={[styles.statCardWeb, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => router.push(`/quiz/${id}?filterState=new` as any)}>
              <View style={[styles.statRing, { borderColor: '#5865F2' }]}>
                <Text style={[styles.statNumber, { color: theme.text }]}>{progress?.newCount ?? 0}</Text>
              </View>
              <Text style={[styles.statLabel, { color: theme.text }]}>Chưa học</Text>
            </HoverableCard>
            <HoverableCard theme={theme} disabled={cards.length === 0} style={[styles.statCardWeb, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => router.push(`/quiz/${id}?filterState=studying` as any)}>
              <View style={[styles.statRing, { borderColor: '#f59e0b' }]}>
                <Text style={[styles.statNumber, { color: theme.text }]}>{progress?.learnCount ?? 0}</Text>
              </View>
              <Text style={[styles.statLabel, { color: theme.text }]}>Đang học</Text>
            </HoverableCard>
            <HoverableCard theme={theme} disabled={(progress?.memorizedCount ?? 0) === 0} style={[styles.statCardWeb, { backgroundColor: theme.surface, borderColor: theme.border }, { opacity: (progress?.memorizedCount ?? 0) > 0 ? 1 : 0.5 }]} onPress={() => router.push(`/quiz/${id}?filterState=memorized` as any)}>
              <View style={[styles.statRing, { borderColor: '#10b981' }]}>
                <Text style={[styles.statNumber, { color: theme.text }]}>{progress?.memorizedCount ?? 0}</Text>
              </View>
              <Text style={[styles.statLabel, { color: theme.text }]}>Thành thạo</Text>
            </HoverableCard>
          </View>

          {/* Terms List Grid */}
          <View style={styles.termsHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Thuật ngữ ({cards.length})</Text>
          </View>

          <View style={styles.termsGrid}>
            {cards.map((item) => (
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
            ))}
          </View>

          <View style={{ height: 60 }} />
        </View>
      </ScrollView>

      {/* Options Modal (web) */}
      <Modal visible={showOptionsModal} transparent={true} animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowOptionsModal(false)}>
          <View style={[styles.optionsModalContent, { backgroundColor: theme.background, borderColor: theme.border }]} onStartShouldSetResponder={() => true}>
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
          <View style={[styles.optionsModalContent, { backgroundColor: theme.background, borderColor: theme.border }]} onStartShouldSetResponder={() => true}>
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
          <View style={[styles.modalContentWeb, { backgroundColor: theme.background, borderColor: theme.border }]}>
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
          <View style={[styles.modalContentWeb, { backgroundColor: theme.background, borderColor: theme.border }]}>
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
          <View style={[styles.modalContentWeb, { backgroundColor: theme.background, borderColor: theme.border }]}>
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
  scrollContent: { alignItems: 'center', paddingVertical: 32 },
  contentWrapper: { width: '100%', maxWidth: 1100, paddingHorizontal: 32 },

  heroSection: { flexDirection: 'row', gap: 40, flexWrap: 'wrap', marginBottom: 40 },
  heroLeft: { flex: 1, minWidth: 400 },
  heroRight: { flex: 1, minWidth: 350 },

  flashcardPreview: { height: 300, width: '100%', borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1, position: 'relative' },
  flashcardWord: { fontSize: 32, fontWeight: '500', textAlign: 'center', paddingHorizontal: 24 },
  fullscreenIcon: { position: 'absolute', bottom: 20, right: 20 },

  moduleTitle: { fontSize: 36, fontWeight: 'bold', marginBottom: 12 },
  moduleDesc: { fontSize: 18, marginBottom: 16 },
  authorContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 32 },
  authorAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#5865F2', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  authorAvatarImage: { width: 32, height: 32, borderRadius: 16, marginRight: 12 },
  authorAvatarText: { color: '#ffffff', fontSize: 14, fontWeight: 'bold' },
  authorName: { fontSize: 16, fontWeight: '600' },
  termCount: { fontSize: 16 },

  actionsGrid: { flexDirection: 'row', gap: 16 },
  actionCard: { flex: 1, paddingVertical: 24, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, alignItems: 'center', gap: 12 },
  actionCardText: { fontSize: 16, fontWeight: '600' },

  sectionTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  progressDesc: { fontSize: 16, marginBottom: 12 },
  nextReviewBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 20 },
  nextReviewLabel: { fontSize: 12, marginBottom: 2 },
  nextReviewValue: { fontSize: 16, fontWeight: '700' },
  progressStatsGrid: { flexDirection: 'row', gap: 24, marginBottom: 40 },
  statCardWeb: { flex: 1, minWidth: 200, flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 12, borderWidth: 1, gap: 16 },
  statRing: { width: 44, height: 44, borderRadius: 22, borderWidth: 3, justifyContent: 'center', alignItems: 'center' },
  statNumber: { fontSize: 16, fontWeight: 'bold' },
  statLabel: { fontSize: 18, fontWeight: '600' },

  termsHeader: { marginBottom: 20 },
  termsGrid: { flexDirection: 'column', gap: 16 },
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
  modalContentWeb: { width: 500, padding: 24, borderRadius: 16, borderWidth: 1 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  textInput: { padding: 12, borderRadius: 8, fontSize: 16, borderWidth: 1 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 24 },
  btnSecondary: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: 'transparent' },
  btnPrimary: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, backgroundColor: '#5865F2' },

  folderSelectItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, marginBottom: 8 },
  folderSelectItemText: { flex: 1, fontSize: 16, marginLeft: 12 },

  optionsModalContent: { width: 360, padding: 20, borderRadius: 16, borderWidth: 1, gap: 8 },
  optionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, gap: 12 },
  optionRowText: { fontSize: 16, fontWeight: '500' },

  cardEditImageContainer: { marginTop: 4, alignItems: 'center' },
  cardEditImage: { width: '100%', height: 200, borderRadius: 12 },
  imagePreviewContainer: { width: '100%', position: 'relative' },
  removeImageBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: '#fff', borderRadius: 15 },
  changeImageBtn: { position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  addImageBtn: { width: '100%', height: 120, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed' as any, justifyContent: 'center', alignItems: 'center', cursor: 'pointer' as any },
});
