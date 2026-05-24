import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView,
  ActivityIndicator, useColorScheme, Image, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import {
  startStudySession, reviewCard, finishStudySession,
  getDeckCards, getDeckProgress, getDeckStudySettings,
} from '../../services/api';
import { StudySettings, defaultStudySettings } from '../../types/studySettings';
import { Audio } from 'expo-av';
import { checkWrittenAnswer } from '../../utils/learningLogic';
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

// ─── Types ────────────────────────────────────────────────────────────────────

type QuestionType = 'mc' | 'written';

// Each "question key" identifies a (cardId, questionType) pair. With both
// MC and Written enabled the user has to answer each card once per type,
// so 50 cards × 2 types = 100 question keys.
type QuestionKey = string; // `${cardId}__${type}`

const makeKey = (cardId: string, type: QuestionType): QuestionKey => `${cardId}__${type}`;
const parseKey = (key: QuestionKey): { cardId: string; type: QuestionType } => {
  const idx = key.lastIndexOf('__');
  return { cardId: key.slice(0, idx), type: key.slice(idx + 2) as QuestionType };
};

type QuizQuestion = {
  key: QuestionKey;
  cardId: string;
  type: QuestionType;
  direction: 'front-to-back' | 'back-to-front';
  questionText: string;
  imageUrl?: string;
  correctAnswer: string;
  options?: string[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRandomBatchSize(poolSize: number): number {
  const size = Math.floor(Math.random() * 4) + 7; // 7–10
  return Math.min(size, poolSize);
}

function enabledQuestionTypes(settings: StudySettings): QuestionType[] {
  const types: QuestionType[] = [];
  if (settings.questionTypeMultipleChoice) types.push('mc');
  if (settings.questionTypeWritten) types.push('written');
  if (types.length === 0) types.push('mc');
  return types;
}

// Expand a list of card IDs into one key per (card, enabled type) pair.
function expandCardsToKeys(cardIds: string[], settings: StudySettings): QuestionKey[] {
  const types = enabledQuestionTypes(settings);
  const keys: QuestionKey[] = [];
  for (const cardId of cardIds) {
    for (const type of types) {
      keys.push(makeKey(cardId, type));
    }
  }
  return keys;
}

function buildRoundQuestions(
  keys: QuestionKey[],
  cardsMap: Record<string, any>,
  allCards: any[],
  settings: StudySettings,
  appearancesMap: Record<string, number>
): QuizQuestion[] {
  const list: QuizQuestion[] = [];
  for (const key of keys) {
    const { cardId, type } = parseKey(key);
    const card = cardsMap[cardId];
    if (!card) continue;

    // Track appearance for this specific building iteration
    const currentAppearance = (appearancesMap[cardId] || 0) + 1;
    appearancesMap[cardId] = currentAppearance;

    // Determine direction
    let direction: 'front-to-back' | 'back-to-front' = 'front-to-back';
    if (settings.answerWithDefinition && !settings.answerWithTerm) {
      direction = 'front-to-back'; // Question = Front, Answer = Back
    } else if (settings.answerWithTerm && !settings.answerWithDefinition) {
      direction = 'back-to-front'; // Question = Back, Answer = Front
    } else {
      // Both selected: alternate based on appearances
      direction = currentAppearance % 2 === 1 ? 'front-to-back' : 'back-to-front';
    }

    const questionText = direction === 'front-to-back' ? card.contentFront : card.contentBack;
    const correctAnswer = direction === 'front-to-back' ? card.contentBack : card.contentFront;

    if (type === 'mc') {
      const others = allCards.filter((c: any) => c.cardId !== cardId);
      const wrong = [...others]
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map((c: any) => direction === 'front-to-back' ? c.contentBack : c.contentFront);
      const opts = [correctAnswer, ...wrong].sort(() => Math.random() - 0.5);
      list.push({
        key,
        cardId,
        type: 'mc',
        direction,
        questionText,
        imageUrl: card.imageUrl,
        correctAnswer,
        options: opts,
      });
    } else {
      list.push({
        key,
        cardId,
        type: 'written',
        direction,
        questionText,
        imageUrl: card.imageUrl,
        correctAnswer,
      });
    }
  }
  return list;
}

function mergeSettings(s: any): StudySettings {
  return {
    shuffleTerms: s.shuffleTerms ?? defaultStudySettings.shuffleTerms,
    textToSpeech: s.textToSpeech ?? defaultStudySettings.textToSpeech,
    answerWithTerm: s.answerWithTerm ?? defaultStudySettings.answerWithTerm,
    answerWithDefinition: s.answerWithDefinition ?? defaultStudySettings.answerWithDefinition,
    questionTypeFlashcards: s.questionTypeFlashcards ?? defaultStudySettings.questionTypeFlashcards,
    questionTypeMultipleChoice: s.questionTypeMultipleChoice ?? defaultStudySettings.questionTypeMultipleChoice,
    questionTypeWritten: s.questionTypeWritten ?? defaultStudySettings.questionTypeWritten,
    strictnessLevel: s.strictnessLevel ?? defaultStudySettings.strictnessLevel,
    requireRetypingCorrectAnswer: s.requireRetypingCorrectAnswer ?? defaultStudySettings.requireRetypingCorrectAnswer,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function QuizScreen() {
  const router = useRouter();
  const { id, filterState } = useLocalSearchParams();
  const deckId = id as string;
  const filterStateParam = filterState as string | undefined;
  const isFilteredMode = !!filterStateParam;
  const filterLabel = filterStateParam === 'new' ? 'Chưa học'
    : filterStateParam === 'studying' ? 'Đang học'
      : filterStateParam === 'memorized' ? 'Thành thạo' : '';

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const theme = {
    background: isDark ? '#111111' : '#f8f9fa',
    surface: isDark ? '#1c1c1e' : '#ffffff',
    text: isDark ? '#f4f4f5' : '#111827',
    textMuted: isDark ? '#a1a1aa' : '#6b7280',
    border: isDark ? '#3f3f46' : '#e5e7eb',
    borderLight: isDark ? '#27272a' : '#f3f4f6',
    primary: '#5865F2',
    iconColor: isDark ? '#f4f4f5' : '#1f2937',
    correctBg: isDark ? '#064e3b' : '#ecfdf5',
    correctBorder: '#10b981',
    correctText: isDark ? '#34d399' : '#047857',
    incorrectBg: isDark ? '#7f1d1d' : '#fef2f2',
    incorrectBorder: '#ef4444',
    incorrectText: isDark ? '#f87171' : '#b91c1c',
  };

  // ─── Core state ───────────────────────────────────────────────────────────

  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<StudySettings>(defaultStudySettings);
  const sessionIdRef = useRef<string | null>(null);
  // Stable refs for data used inside async callbacks
  const cardsMapRef = useRef<Record<string, any>>({});
  const allCardsRef = useRef<any[]>([]);
  const settingsRef = useRef<StudySettings>(defaultStudySettings);
  const cardAppearancesRef = useRef<Record<string, number>>({});

  const [langFrontLabel, setLangFrontLabel] = useState('Thuật ngữ');
  const [langBackLabel, setLangBackLabel] = useState('Định nghĩa');

  // ─── Round system ─────────────────────────────────────────────────────────
  // Pools hold question keys (cardId+type), not raw cardIds — so with
  // both MC and Written enabled, each card has two separate questions.

  const [pendingPool, setPendingPool] = useState<QuestionKey[]>([]);
  const [currentBatch, setCurrentBatch] = useState<QuizQuestion[]>([]);
  const [batchIndex, setBatchIndex] = useState(0);
  const [wrongInRound, setWrongInRound] = useState<QuestionKey[]>([]);
  const [roundCorrect, setRoundCorrect] = useState(0);
  const [roundWrong, setRoundWrong] = useState(0);
  const [roundNumber, setRoundNumber] = useState(1);
  const [showRoundSummary, setShowRoundSummary] = useState(false);
  const [sessionFinished, setSessionFinished] = useState(false);
  const [totalCards, setTotalCards] = useState(0);
  // Total questions the user must answer correctly (cards × enabled types)
  // and how many they've gotten right so far across the whole session.
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [correctTotal, setCorrectTotal] = useState(0);

  // ─── Question state ───────────────────────────────────────────────────────

  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [writtenInput, setWrittenInput] = useState('');
  const [retypeInput, setRetypeInput] = useState('');
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [cardStartTime, setCardStartTime] = useState(Date.now());

  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The server stores one review per (sessionId, cardId). With both MC and
  // Written enabled, the same cardId appears in the question pool twice — we
  // submit only the first attempt to avoid 409 (already reviewed) or 400
  // (session auto-finished after the first card's review).
  const submittedCardsRef = useRef<Set<string>>(new Set());

  // ─── Helpers ──────────────────────────────────────────────────────────────

  function resetQuestionState() {
    setSelectedOption(null);
    setWrittenInput('');
    setRetypeInput('');
    setIsAnswered(false);
    setIsCorrect(false);
    setCardStartTime(Date.now());
  }

  async function playSound(type: 'correct' | 'end') {
    try {
      const source = type === 'correct'
        ? require('../../assets/sounds/correct.mp3')
        : require('../../assets/sounds/end.mp3');
      const { sound } = await Audio.Sound.createAsync(source);
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate(status => {
        if (status.isLoaded && status.didJustFinish) sound.unloadAsync();
      });
    } catch { }
  }

  // ─── Init ─────────────────────────────────────────────────────────────────

  const initSession = useCallback(async () => {
    setLoading(true);
    submittedCardsRef.current = new Set();
    try {
      const [cardsRes, settingsRes] = await Promise.all([
        getDeckCards(deckId),
        getDeckStudySettings(deckId).catch(() => null),
      ]);

      const cards: any[] = cardsRes.cards || [];
      const map: Record<string, any> = {};
      cards.forEach((c: any) => { map[c.cardId] = c; });

      if (cards.length > 0) {
        const firstCard = cards[0];
        setLangFrontLabel(firstCard.langFront ? (langNameMap[firstCard.langFront] || firstCard.langFront) : 'Thuật ngữ');
        setLangBackLabel(firstCard.langBack ? (langNameMap[firstCard.langBack] || firstCard.langBack) : 'Định nghĩa');
      }

      cardAppearancesRef.current = {};

      const loadedSettings = settingsRes?.settings
        ? mergeSettings(settingsRes.settings)
        : defaultStudySettings;

      setSettings(loadedSettings);
      settingsRef.current = loadedSettings;
      cardsMapRef.current = map;
      allCardsRef.current = cards;

      let cardIds: string[];

      if (filterStateParam) {
        const tagLabel = filterStateParam === 'studying' ? 'learning' : filterStateParam;
        const progressRes = await getDeckProgress(deckId).catch(() => null);
        const tag = progressRes?.tags?.find((t: any) => t.label === tagLabel);
        const ids = new Set<string>(tag?.cardIds ?? []);
        let filtered = cards.filter((c: any) => ids.has(c.cardId));
        if (loadedSettings.shuffleTerms) filtered.sort(() => Math.random() - 0.5);
        cardIds = filtered.map((c: any) => c.cardId);
      } else {
        const sessionRes = await startStudySession(deckId, 10, 20);
        sessionIdRef.current = sessionRes.session?.sessionId ?? null;
        const rawCards = sessionRes.session?.cards ?? [];
        const shuffled = loadedSettings.shuffleTerms
          ? [...rawCards].sort(() => Math.random() - 0.5)
          : rawCards;
        cardIds = shuffled.map((c: any) => c.cardId);
      }

      setTotalCards(cardIds.length);

      // Expand each card into one question per enabled type (MC + Written → 2 questions/card).
      let allKeys = expandCardsToKeys(cardIds, loadedSettings);
      if (loadedSettings.shuffleTerms) {
        allKeys = [...allKeys].sort(() => Math.random() - 0.5);
      }
      setTotalQuestions(allKeys.length);
      setCorrectTotal(0);

      const batchSize = getRandomBatchSize(allKeys.length);
      const firstBatchKeys = allKeys.slice(0, batchSize);
      const remaining = allKeys.slice(batchSize);

      setCurrentBatch(buildRoundQuestions(firstBatchKeys, map, cards, loadedSettings, cardAppearancesRef.current));
      setPendingPool(remaining);
    } catch (err) {
      console.error('Quiz init error:', err);
    } finally {
      setLoading(false);
    }
  }, [deckId, filterStateParam]);

  useEffect(() => {
    if (deckId) initSession();
  }, [initSession]);

  useFocusEffect(
    useCallback(() => {
      const checkSettings = async () => {
        try {
          const res = await getDeckStudySettings(deckId).catch(() => null);
          if (res?.settings) {
            const newSettings = mergeSettings(res.settings);
            if (JSON.stringify(newSettings) !== JSON.stringify(settingsRef.current)) {
              initSession();
            }
          }
        } catch (err) { }
      };
      if (deckId && !loading) checkSettings();
    }, [deckId, loading, initSession])
  );

  // ─── Derived ──────────────────────────────────────────────────────────────

  const currentQuestion = currentBatch[batchIndex];
  const isMC = currentQuestion?.type === 'mc';
  const isWritten = currentQuestion?.type === 'written';
  const isRetypeMode = isAnswered && !isCorrect && isWritten;
  const retypeMatches =
    retypeInput.trim().toLowerCase() === currentQuestion?.correctAnswer.trim().toLowerCase();

  // ─── Actions ──────────────────────────────────────────────────────────────

  const submitReview = async (correct: boolean) => {
    if (isFilteredMode || !sessionIdRef.current || !currentQuestion) return;
    if (submittedCardsRef.current.has(currentQuestion.cardId)) return;
    submittedCardsRef.current.add(currentQuestion.cardId);
    const durationMs = Date.now() - cardStartTime;
    const rating = !correct ? 1 : durationMs < 3000 ? 4 : durationMs < 8000 ? 3 : 2;
    try { await reviewCard(sessionIdRef.current, currentQuestion.cardId, rating, durationMs); } catch { }
  };

  // advanceToNext reads batchIndex/currentBatch from render closure.
  // We keep a ref so setTimeout always calls the latest version.
  const advanceToNext = () => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    const nextIndex = batchIndex + 1;
    if (nextIndex < currentBatch.length) {
      setBatchIndex(nextIndex);
      resetQuestionState();
    } else {
      setShowRoundSummary(true);
    }
  };
  const advanceToNextRef = useRef(advanceToNext);
  advanceToNextRef.current = advanceToNext;

  const scheduleAutoAdvance = () => {
    if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
    autoAdvanceTimerRef.current = setTimeout(() => advanceToNextRef.current(), 700);
  };

  const startNextRound = async () => {
    const newPool: QuestionKey[] = [...wrongInRound, ...pendingPool];

    if (newPool.length === 0) {
      if (!isFilteredMode && sessionIdRef.current) {
        try { await finishStudySession(sessionIdRef.current); } catch { }
      }
      playSound('end');
      setSessionFinished(true);
      return;
    }

    const batchSize = getRandomBatchSize(newPool.length);
    const batchKeys = newPool.slice(0, batchSize);
    const remaining = newPool.slice(batchSize);

    setCurrentBatch(
      buildRoundQuestions(batchKeys, cardsMapRef.current, allCardsRef.current, settingsRef.current, cardAppearancesRef.current),
    );
    setPendingPool(remaining);
    setBatchIndex(0);
    setWrongInRound([]);
    setRoundCorrect(0);
    setRoundWrong(0);
    setRoundNumber(prev => prev + 1);
    setShowRoundSummary(false);
    resetQuestionState();
  };

  const handleSelectMC = async (index: number) => {
    if (isAnswered) return;
    const correct = currentQuestion.options![index] === currentQuestion.correctAnswer;
    setSelectedOption(index);
    setIsAnswered(true);
    setIsCorrect(correct);
    if (correct) {
      setRoundCorrect(prev => prev + 1);
      setCorrectTotal(prev => prev + 1);
      playSound('correct');
      scheduleAutoAdvance();
    } else {
      setWrongInRound(prev => [...prev, currentQuestion.key]);
      setRoundWrong(prev => prev + 1);
    }
    await submitReview(correct);
  };

  const handleSubmitWritten = async () => {
    if (isAnswered || !writtenInput.trim()) return;
    const correct = checkWrittenAnswer(writtenInput, currentQuestion.correctAnswer, settings.strictnessLevel);
    setIsAnswered(true);
    setIsCorrect(correct);
    if (correct) {
      setRoundCorrect(prev => prev + 1);
      setCorrectTotal(prev => prev + 1);
      playSound('correct');
      scheduleAutoAdvance();
    } else {
      setWrongInRound(prev => [...prev, currentQuestion.key]);
      setRoundWrong(prev => prev + 1);
    }
    await submitReview(correct);
  };

  // ─── Guards ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </SafeAreaView>
    );
  }

  // Treat "no current question" the same as an empty batch — guards against
  // a brief state transition (e.g. round restart) where batchIndex points
  // past the new batch before it's been populated.
  if ((!currentBatch.length || !currentQuestion) && !showRoundSummary && !sessionFinished) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontSize: 18, color: theme.textMuted, marginBottom: 16 }}>
          Không có thẻ nào để học lúc này!
        </Text>
        <TouchableOpacity style={styles.actionButton} onPress={() => router.back()}>
          <Text style={styles.actionButtonText}>Quay lại</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (sessionFinished) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <Ionicons name="checkmark-circle" size={80} color="#10b981" style={{ marginBottom: 16 }} />
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: theme.text, marginBottom: 8 }}>Tuyệt vời!</Text>
        <Text style={{ fontSize: 16, color: theme.textMuted, marginBottom: 32, textAlign: 'center' }}>
          Bạn đã hoàn thành tất cả {totalQuestions} câu trên {totalCards} thẻ.
        </Text>
        <TouchableOpacity style={[styles.actionButton, { width: 200 }]} onPress={() => router.back()}>
          <Text style={styles.actionButtonText}>Hoàn tất</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ─── Round Summary ────────────────────────────────────────────────────────

  if (showRoundSummary) {
    const hasMore = wrongInRound.length > 0 || pendingPool.length > 0;
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <WebContainer maxWidth={720}>
        <View style={styles.summaryContainer}>
          <Text style={[styles.summaryTitle, { color: theme.text }]}>Vòng {roundNumber} hoàn tất</Text>

          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: theme.correctBg, borderColor: theme.correctBorder }]}>
              <Ionicons name="checkmark-circle" size={36} color={theme.correctText} />
              <Text style={[styles.statNumber, { color: theme.correctText }]}>{roundCorrect}</Text>
              <Text style={[styles.statLabel, { color: theme.correctText }]}>Đúng</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.incorrectBg, borderColor: theme.incorrectBorder }]}>
              <Ionicons name="close-circle" size={36} color={theme.incorrectText} />
              <Text style={[styles.statNumber, { color: theme.incorrectText }]}>{roundWrong}</Text>
              <Text style={[styles.statLabel, { color: theme.incorrectText }]}>Sai</Text>
            </View>
          </View>

          {wrongInRound.length > 0 && (
            <View style={[styles.retryNote, { backgroundColor: isDark ? '#27272a' : '#f3f4f6' }]}>
              <Ionicons name="refresh-circle-outline" size={20} color={theme.textMuted} style={{ marginRight: 8 }} />
              <Text style={[styles.retryNoteText, { color: theme.textMuted }]}>
                {wrongInRound.length} câu sai sẽ được hỏi lại ở vòng tiếp theo
              </Text>
            </View>
          )}

          {pendingPool.length > 0 && (
            <Text style={[styles.pendingNote, { color: theme.textMuted }]}>
              Còn {pendingPool.length} câu chưa học
            </Text>
          )}

          <Text style={[styles.pendingNote, { color: theme.textMuted, marginTop: 6 }]}>
            Còn lại tổng cộng: {Math.max(totalQuestions - correctTotal, 0)}/{totalQuestions} câu
          </Text>

          <TouchableOpacity
            style={[styles.actionButton, { marginTop: 40 }]}
            onPress={startNextRound}
          >
            <Text style={styles.actionButtonText}>
              {hasMore ? 'Tiếp tục →' : 'Hoàn thành'}
            </Text>
          </TouchableOpacity>
        </View>
        </WebContainer>
      </SafeAreaView>
    );
  }

  // ─── Footer ───────────────────────────────────────────────────────────────

  const showFooter =
    (isWritten && !isAnswered) ||
    isRetypeMode ||
    (isMC && isAnswered && !isCorrect);

  let footerNode: React.ReactNode = null;
  if (isWritten && !isAnswered) {
    footerNode = (
      <TouchableOpacity
        style={[styles.actionButton, !writtenInput.trim() && { opacity: 0.4 }]}
        onPress={handleSubmitWritten}
        disabled={!writtenInput.trim()}
      >
        <Text style={styles.actionButtonText}>Kiểm tra</Text>
      </TouchableOpacity>
    );
  } else if (isRetypeMode) {
    footerNode = (
      <TouchableOpacity
        style={[styles.actionButton, !retypeMatches && { opacity: 0.4 }]}
        onPress={advanceToNext}
        disabled={!retypeMatches}
      >
        <Text style={styles.actionButtonText}>Tiếp tục</Text>
      </TouchableOpacity>
    );
  } else if (isMC && isAnswered && !isCorrect) {
    footerNode = (
      <TouchableOpacity style={styles.actionButton} onPress={advanceToNext}>
        <Text style={styles.actionButtonText}>Tiếp tục</Text>
      </TouchableOpacity>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const screenBg = isAnswered && isCorrect
    ? (isDark ? '#0a2318' : '#f0fdf4')
    : theme.background;

  // Remaining questions across the whole session — decreases only on
  // correct answers, so wrong answers leave it unchanged (the question
  // will come back next round).
  const questionsRemaining = Math.max(totalQuestions - correctTotal, 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: screenBg }]}>
      <WebContainer maxWidth={900}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
            <Ionicons name="close" size={28} color={theme.iconColor} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              {filterLabel ? `${filterLabel}  ` : ''}
              {'Vòng '}{roundNumber}{'  ·  '}{batchIndex + 1}{'/'}{currentBatch.length}
            </Text>
            <Text style={[styles.headerRemaining, { color: theme.textMuted }]}>
              Còn {questionsRemaining}/{totalQuestions} câu
            </Text>
          </View>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push(`/quiz-settings/${deckId}` as any)}
          >
            <Ionicons name="settings-outline" size={24} color={theme.iconColor} />
          </TouchableOpacity>
        </View>

        {/* Progress: full-session fill driven by correct-answer count, so
            wrong answers leave the bar where it was (the question returns later). */}
        <View style={[styles.progressBg, { backgroundColor: isDark ? '#27272a' : '#e5e7eb' }]}>
          <View style={[styles.progressFill, { width: `${(correctTotal / Math.max(totalQuestions, 1)) * 100}%` }]} />
        </View>
      </WebContainer>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <WebContainer maxWidth={900} paddingHorizontal={0}>
          {/* Badge */}
          <View style={[styles.badge, {
            backgroundColor: isMC
              ? (isDark ? '#1e1b4b' : '#eef2ff')
              : (isDark ? '#2e1065' : '#fdf4ff'),
          }]}>
            <Text style={[styles.badgeText, { color: isMC ? theme.primary : '#9333ea' }]}>
              {isMC ? 'Trắc nghiệm' : 'Tự luận'}
            </Text>
          </View>

          {/* Question */}
          <View style={styles.questionBlock}>
            <Text style={[styles.questionLabel, { color: theme.textMuted }]}>
              {currentQuestion.direction === 'front-to-back' ? langFrontLabel : langBackLabel}
            </Text>
            {currentQuestion.imageUrl ? (
              <Image
                source={{ uri: currentQuestion.imageUrl }}
                style={styles.questionImage}
                resizeMode="contain"
              />
            ) : null}
            <Text style={[styles.questionText, { color: theme.text }]}>
              {currentQuestion.questionText}
            </Text>
          </View>

          {/* ── MC options ── */}
          {isMC && (
            <View>
              <Text style={[styles.optionsLabel, { color: theme.textMuted }]}>
                Chọn {currentQuestion.direction === 'front-to-back' ? langBackLabel.toLowerCase() : langFrontLabel.toLowerCase()} đúng
              </Text>
              {currentQuestion.options!.map((opt, index) => {
                const isSelected = selectedOption === index;
                const isThisCorrect = opt === currentQuestion.correctAnswer;
                let bg = theme.surface;
                let border = theme.border;
                let textColor = theme.text;

                if (isAnswered) {
                  if (isThisCorrect) {
                    bg = theme.correctBg; border = theme.correctBorder; textColor = theme.correctText;
                  } else if (!isCorrect && isSelected) {
                    bg = theme.incorrectBg; border = theme.incorrectBorder; textColor = theme.incorrectText;
                  }
                }

                return (
                  <TouchableOpacity
                    key={index}
                    style={[styles.optionCard, { backgroundColor: bg, borderColor: border }]}
                    onPress={() => handleSelectMC(index)}
                    activeOpacity={0.7}
                    disabled={isAnswered}
                  >
                    <Text style={[styles.optionText, { color: textColor }]}>{opt}</Text>
                  </TouchableOpacity>
                );
              })}

            </View>
          )}

          {/* ── Written input / result ── */}
          {isWritten && (
            <View>
              {!isAnswered ? (
                <TextInput
                  style={[
                    styles.writtenInput,
                    { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text },
                  ]}
                  placeholder="Nhập câu trả lời..."
                  placeholderTextColor={theme.textMuted}
                  value={writtenInput}
                  onChangeText={setWrittenInput}
                  multiline
                  autoFocus
                />
              ) : isCorrect ? (
                <View style={[styles.resultBox, { backgroundColor: theme.correctBg, borderColor: theme.correctBorder }]}>
                  <Text style={[styles.resultLabel, { color: theme.correctText }]}>✓ Đúng rồi!</Text>
                  <Text style={[styles.resultAnswer, { color: theme.correctText }]}>{writtenInput}</Text>
                </View>
              ) : (
                <View style={styles.retypeBlock}>
                  <View style={[styles.yourAnswerBox, { backgroundColor: theme.incorrectBg, borderColor: theme.incorrectBorder }]}>
                    <Text style={[styles.yourAnswerLabel, { color: theme.incorrectText }]}>
                      Câu trả lời của bạn:
                    </Text>
                    <Text style={[styles.yourAnswerText, { color: theme.incorrectText }]}>
                      {writtenInput}
                    </Text>
                  </View>
                  <View style={[styles.correctAnswerBox, { backgroundColor: theme.correctBg, borderColor: theme.correctBorder }]}>
                    <Text style={[styles.correctAnswerLabel, { color: theme.correctText }]}>
                      Đáp án đúng:
                    </Text>
                    <Text style={[styles.correctAnswerText, { color: theme.correctText }]}>
                      {currentQuestion.correctAnswer}
                    </Text>
                  </View>
                  <Text style={[styles.retypeLabel, { color: theme.textMuted }]}>
                    Gõ lại đáp án đúng để tiếp tục:
                  </Text>
                  <TextInput
                    style={[
                      styles.writtenInput,
                      {
                        backgroundColor: theme.surface,
                        borderColor: retypeMatches ? theme.correctBorder : theme.border,
                        color: theme.text,
                      },
                    ]}
                    placeholder="Gõ lại đáp án đúng..."
                    placeholderTextColor={theme.textMuted}
                    value={retypeInput}
                    onChangeText={setRetypeInput}
                    multiline
                    autoFocus
                  />
                </View>
              )}
            </View>
          )}
          </WebContainer>
        </ScrollView>

        {/* Footer */}
        {showFooter && footerNode ? (
          <WebContainer maxWidth={900} paddingHorizontal={0}>
            <View style={[styles.footer, { backgroundColor: theme.surface, borderTopColor: theme.borderLight }]}>
              {footerNode}
            </View>
          </WebContainer>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: 'bold' },
  headerRemaining: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  iconButton: { padding: 8 },
  progressBg: { height: 4, width: '100%' },
  progressFill: { height: '100%', backgroundColor: '#5865F2' },
  content: { padding: 20, paddingBottom: 8 },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 20,
  },
  badgeText: { fontSize: 13, fontWeight: '700' },
  questionBlock: { marginBottom: 32 },
  questionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  questionImage: { width: '100%', height: 200, marginBottom: 16, borderRadius: 12 },
  questionText: { fontSize: 24, fontWeight: '500', lineHeight: 34 },
  optionsLabel: { fontSize: 14, fontWeight: '600', marginBottom: 14 },
  optionCard: { padding: 20, borderRadius: 16, marginBottom: 12, borderWidth: 2 },
  optionText: { fontSize: 18, textAlign: 'center', fontWeight: '500' },
  writtenInput: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 16,
    fontSize: 17,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  resultBox: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  resultLabel: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
  resultAnswer: { fontSize: 18, fontWeight: '500' },
  retypeBlock: { marginTop: 8 },
  yourAnswerBox: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  yourAnswerLabel: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  yourAnswerText: { fontSize: 18, fontWeight: '500' },
  correctAnswerBox: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  correctAnswerLabel: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  correctAnswerText: { fontSize: 18, fontWeight: '600' },
  retypeLabel: { fontSize: 14, marginBottom: 10 },
  footer: { padding: 20, borderTopWidth: 1 },
  actionButton: {
    backgroundColor: '#5865F2',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  actionButtonText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  // Round summary
  summaryContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  summaryTitle: { fontSize: 28, fontWeight: 'bold', marginBottom: 32 },
  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  statCard: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  statNumber: { fontSize: 40, fontWeight: 'bold' },
  statLabel: { fontSize: 14, fontWeight: '600' },
  retryNote: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  retryNoteText: { fontSize: 14, flex: 1 },
  pendingNote: { fontSize: 14, marginTop: 4 },
});
