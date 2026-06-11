import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Switch, ActivityIndicator, Modal, FlatList, Alert, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getDeck, getDeckCards, isPlusAccessError, PLUS_REQUIRED_MESSAGE } from '../../services/api';
import { WebContainer } from '../../components/ui/WebContainer';

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

export default function PracticeSetupScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const deckId = id as string;

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const theme = {
    background: isDark ? '#111111' : '#ffffff',
    surface: isDark ? '#1c1c1e' : '#ffffff',
    text: isDark ? '#f4f4f5' : '#111827',
    textMuted: isDark ? '#a1a1aa' : '#6b7280',
    border: isDark ? '#3f3f46' : '#e5e7eb',
    primary: '#5865F2',
    iconColor: isDark ? '#f4f4f5' : '#1f2937',
  };

  const [loading, setLoading] = useState(true);
  const [deck, setDeck] = useState<any>(null);
  const [totalCards, setTotalCards] = useState(0);
  const [plusAccessRequired, setPlusAccessRequired] = useState(false);

  const [numQuestions, setNumQuestions] = useState(5);
  const [showAnswerImmed, setShowAnswerImmed] = useState(false);
  const [answerSide, setAnswerSide] = useState<'back' | 'front'>('back');
  const [langFrontLabel, setLangFrontLabel] = useState('');
  const [langBackLabel, setLangBackLabel] = useState('');
  const [trueFalse, setTrueFalse] = useState(false);
  const [multipleChoice, setMultipleChoice] = useState(true);
  const [written, setWritten] = useState(false);

  const [showQuestionPicker, setShowQuestionPicker] = useState(false);
  const [showAnswerSidePicker, setShowAnswerSidePicker] = useState(false);

  const minQuestions = 2;
  const maxQuestions = totalCards;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setPlusAccessRequired(false);
        const deckRes = await getDeck(deckId);
        setDeck(deckRes.deck);
        const cardsRes = await getDeckCards(deckId);
        const cardsList = cardsRes.cards || [];
        const count = cardsList.length;
        setTotalCards(count);
        // Default to min(5, card count), but at least 2
        setNumQuestions(Math.max(minQuestions, Math.min(5, count)));
        // Read languages from first card
        if (cardsList.length > 0) {
          const firstCard = cardsList[0];
          const fl = firstCard.langFront ? (langNameMap[firstCard.langFront] || firstCard.langFront) : 'Thuật ngữ';
          const bl = firstCard.langBack ? (langNameMap[firstCard.langBack] || firstCard.langBack) : 'Định nghĩa';
          setLangFrontLabel(fl);
          setLangBackLabel(bl);
        }
      } catch (err) {
        console.error('Error fetching deck:', err);
        if (isPlusAccessError(err)) {
          setPlusAccessRequired(true);
        }
      } finally {
        setLoading(false);
      }
    };
    if (deckId) fetchData();
  }, [deckId]);

  // Ensure at least one question type is always selected
  const handleToggleTrueFalse = (val: boolean) => {
    if (!val && !multipleChoice && !written) return; // can't turn off last one
    setTrueFalse(val);
  };
  const handleToggleMultipleChoice = (val: boolean) => {
    if (!val && !trueFalse && !written) return;
    setMultipleChoice(val);
  };
  const handleToggleWritten = (val: boolean) => {
    if (!val && !trueFalse && !multipleChoice) return;
    setWritten(val);
  };

  const handleStart = () => {
    if (totalCards < 2) {
      Alert.alert('Không đủ thẻ', 'Cần ít nhất 2 thẻ trong bộ thẻ để tạo bài kiểm tra.');
      return;
    }
    router.push({
      pathname: `/practice/${deckId}`,
      params: {
        numQuestions,
        showAnswerImmed: showAnswerImmed ? 'true' : 'false',
        answerSide,
        trueFalse: trueFalse ? 'true' : 'false',
        multipleChoice: multipleChoice ? 'true' : 'false',
        written: written ? 'true' : 'false',
      }
    } as any);
  };

  // Generate picker options: 2..maxQuestions
  const pickerOptions = [];
  for (let i = minQuestions; i <= maxQuestions; i++) {
    pickerOptions.push(i);
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </SafeAreaView>
    );
  }

  if (plusAccessRequired) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }]}>
        <Text style={{ color: theme.text, fontSize: 18, textAlign: 'center', marginBottom: 16 }}>{PLUS_REQUIRED_MESSAGE}</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: theme.primary, fontWeight: '700' }}>Quay lại</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <WebContainer maxWidth={720}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.iconButton, { backgroundColor: isDark ? '#27272a' : '#f3f4f6' }]}>
            <Ionicons name="close" size={28} color={theme.iconColor} />
          </TouchableOpacity>
        </View>
      </WebContainer>

      <ScrollView contentContainerStyle={styles.content}>
        <WebContainer maxWidth={720} paddingHorizontal={0}>
        {deck ? (
          <Text style={[styles.deckName, { color: theme.textMuted }]}>{deck.name.toUpperCase()}</Text>
        ) : null}

        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: theme.text }]}>Thiết lập bài{'\n'}kiểm tra</Text>
          <View style={styles.iconWrapper}>
            <Ionicons name="document-text" size={32} color="#ffffff" />
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.row, { borderBottomColor: theme.border, borderBottomWidth: 1 }]}
            onPress={() => setShowQuestionPicker(true)}
            activeOpacity={0.6}
          >
            <Text style={[styles.label, { color: theme.text }]}>Số câu hỏi</Text>
            <View style={styles.pickerButton}>
              <Text style={styles.pickerText}>{numQuestions}</Text>
              <Ionicons name="caret-down" size={16} color={theme.primary} style={{ marginLeft: 4 }} />
            </View>
          </TouchableOpacity>

          <View style={[styles.row, { borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
            <Text style={[styles.label, { color: theme.text }]}>Hiển thị đáp án ngay</Text>
            <Switch
              value={showAnswerImmed}
              onValueChange={setShowAnswerImmed}
              trackColor={{ false: '#d1d5db', true: theme.primary }}
              thumbColor={'#ffffff'}
            />
          </View>

          <TouchableOpacity
            style={[styles.row, { borderBottomColor: theme.border, borderBottomWidth: 1 }]}
            onPress={() => setShowAnswerSidePicker(true)}
            activeOpacity={0.6}
          >
            <View>
              <Text style={[styles.label, { color: theme.text }]}>Trả lời bằng</Text>
              <Text style={[styles.subLabel, { color: theme.textMuted }]}>{answerSide === 'back' ? langBackLabel || 'Định nghĩa' : langFrontLabel || 'Thuật ngữ'}</Text>
            </View>
            <Ionicons name="caret-down" size={16} color={theme.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={[styles.row, { borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
            <Text style={[styles.label, { color: theme.text }]}>Đúng/sai</Text>
            <Switch
              value={trueFalse}
              onValueChange={handleToggleTrueFalse}
              trackColor={{ false: '#d1d5db', true: theme.primary }}
              thumbColor={'#ffffff'}
            />
          </View>

          <View style={[styles.row, { borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
            <Text style={[styles.label, { color: theme.text }]}>Nhiều lựa chọn</Text>
            <Switch
              value={multipleChoice}
              onValueChange={handleToggleMultipleChoice}
              trackColor={{ false: '#d1d5db', true: theme.primary }}
              thumbColor={'#ffffff'}
            />
          </View>

          <View style={[styles.row, { borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
            <Text style={[styles.label, { color: theme.text }]}>Tự luận</Text>
            <Switch
              value={written}
              onValueChange={handleToggleWritten}
              trackColor={{ false: '#d1d5db', true: theme.primary }}
              thumbColor={'#ffffff'}
            />
          </View>
        </View>

        {totalCards < 2 ? (
          <Text style={{ color: '#ef4444', fontSize: 14, textAlign: 'center' }}>
            Cần ít nhất 2 thẻ trong bộ thẻ để tạo bài kiểm tra.
          </Text>
        ) : null}
        </WebContainer>
      </ScrollView>

      <WebContainer maxWidth={720}>
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.startButton, totalCards < 2 && { opacity: 0.5 }]}
            onPress={handleStart}
            disabled={totalCards < 2}
          >
            <Text style={styles.startButtonText}>Bắt đầu làm kiểm tra</Text>
          </TouchableOpacity>
        </View>
      </WebContainer>

      {/* Question Count Picker Modal */}
      <Modal visible={showQuestionPicker} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowQuestionPicker(false)}>
          <View style={[styles.pickerModal, { backgroundColor: theme.surface }]}>
            <View style={[styles.pickerModalHandle, { backgroundColor: theme.border }]} />
            <Text style={[styles.pickerModalTitle, { color: theme.text }]}>Số câu hỏi</Text>
            <Text style={[styles.pickerModalSubtitle, { color: theme.textMuted }]}>Tối thiểu 2, tối đa {maxQuestions} (số thẻ trong bộ)</Text>
            <FlatList
              data={pickerOptions}
              keyExtractor={(item) => item.toString()}
              style={{ maxHeight: 300 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.pickerOption, item === numQuestions && { backgroundColor: isDark ? '#27272a' : '#eef2ff' }]}
                  onPress={() => { setNumQuestions(item); setShowQuestionPicker(false); }}
                >
                  <Text style={[styles.pickerOptionText, { color: item === numQuestions ? theme.primary : theme.text }]}>
                    {item}
                  </Text>
                  {item === numQuestions ? (
                    <Ionicons name="checkmark" size={22} color={theme.primary} />
                  ) : null}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Answer Side Picker Modal */}
      <Modal visible={showAnswerSidePicker} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowAnswerSidePicker(false)}>
          <View style={[styles.pickerModal, { backgroundColor: theme.surface }]}>
            <View style={[styles.pickerModalHandle, { backgroundColor: theme.border }]} />
            <Text style={[styles.pickerModalTitle, { color: theme.text }]}>Trả lời bằng</Text>
            <Text style={[styles.pickerModalSubtitle, { color: theme.textMuted }]}>Chọn mặt của thẻ để trả lời</Text>

            <TouchableOpacity
              style={[styles.pickerOption, answerSide === 'back' && { backgroundColor: isDark ? '#27272a' : '#eef2ff' }]}
              onPress={() => { setAnswerSide('back'); setShowAnswerSidePicker(false); }}
            >
              <Text style={[styles.pickerOptionText, { color: answerSide === 'back' ? theme.primary : theme.text }]}>
                {langBackLabel || 'Định nghĩa'}
              </Text>
              {answerSide === 'back' ? (
                <Ionicons name="checkmark" size={22} color={theme.primary} />
              ) : null}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.pickerOption, answerSide === 'front' && { backgroundColor: isDark ? '#27272a' : '#eef2ff' }]}
              onPress={() => { setAnswerSide('front'); setShowAnswerSidePicker(false); }}
            >
              <Text style={[styles.pickerOptionText, { color: answerSide === 'front' ? theme.primary : theme.text }]}>
                {langFrontLabel || 'Thuật ngữ'}
              </Text>
              {answerSide === 'front' ? (
                <Ionicons name="checkmark" size={22} color={theme.primary} />
              ) : null}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, paddingBottom: 0 },
  iconButton: { alignSelf: 'flex-start', padding: 8, borderRadius: 20 },
  content: { padding: 24 },
  deckName: { fontSize: 14, fontWeight: '600', marginBottom: 8, letterSpacing: 0.5 },
  titleContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 },
  title: { fontSize: 32, fontWeight: 'bold', lineHeight: 40 },
  iconWrapper: { backgroundColor: '#5865F2', padding: 12, borderRadius: 12 },
  section: { marginBottom: 32 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16 },
  label: { fontSize: 18, fontWeight: '500' },
  subLabel: { fontSize: 16, marginTop: 4 },
  pickerButton: { flexDirection: 'row', alignItems: 'center' },
  pickerText: { fontSize: 18, color: '#5865F2', fontWeight: '500' },
  footer: { padding: 24, paddingBottom: 32 },
  startButton: { backgroundColor: '#5865F2', paddingVertical: 16, borderRadius: 30, alignItems: 'center' },
  startButtonText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pickerModal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  pickerModalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  pickerModalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  pickerModalSubtitle: { fontSize: 14, marginBottom: 16 },
  pickerOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 4 },
  pickerOptionText: { fontSize: 18, fontWeight: '500' },
});
