import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator, TextInput, useColorScheme, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getDeckCards, getDeckStudySettings } from '../../services/api';
import { checkAnswer } from '../../utils/learningLogic';
import { defaultStudySettings } from '../../types/studySettings';
import { Audio } from 'expo-av';
import { WebContainer } from '../../components/ui/WebContainer';


export default function PracticeTestScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const deckId = params.id as string;
  const numQuestions = parseInt(params.numQuestions as string || '5');
  const showAnswerImmed = params.showAnswerImmed === 'true';
  const answerSide = (params.answerSide as string) || 'back';
  const trueFalse = params.trueFalse === 'true';
  const multipleChoice = params.multipleChoice === 'true';
  const written = params.written === 'true';

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const theme = {
    background: isDark ? '#111111' : '#ffffff',
    surface: isDark ? '#1c1c1e' : '#f9fafb',
    text: isDark ? '#f4f4f5' : '#111827',
    textMuted: isDark ? '#a1a1aa' : '#6b7280',
    border: isDark ? '#3f3f46' : '#e5e7eb',
    primary: '#5865F2',
    iconColor: isDark ? '#f4f4f5' : '#1f2937',
    correct: '#10b981',
    incorrect: '#ef4444',
    correctBg: isDark ? 'rgba(16, 185, 129, 0.2)' : '#ecfdf5',
    incorrectBg: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fef2f2',
  };

  const [loading, setLoading] = useState(true);
  const [strictnessLevel, setStrictnessLevel] = useState<'flexible' | 'strict'>(defaultStudySettings.strictnessLevel);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<any[]>([]);
  const [isFinished, setIsFinished] = useState(false);

  async function playSound(type: 'correct' | 'end') {
    try {
      const source = type === 'correct' 
        ? require('../../assets/sounds/correct.mp3') 
        : require('../../assets/sounds/end.mp3');
      const { sound } = await Audio.Sound.createAsync(source);
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  }


  // State for current question
  const [currentAnswerText, setCurrentAnswerText] = useState('');
  const [hasAnsweredCurrent, setHasAnsweredCurrent] = useState(false);
  const [isCurrentCorrect, setIsCurrentCorrect] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  useEffect(() => {
    const initTest = async () => {
      try {
        const [res, settingsRes] = await Promise.all([
          getDeckCards(deckId),
          getDeckStudySettings(deckId).catch(() => null),
        ]);
        if (settingsRes?.settings?.strictnessLevel) {
          setStrictnessLevel(settingsRes.settings.strictnessLevel);
        }
        const cards = res.cards || [];
        
        if (cards.length === 0) {
          setLoading(false);
          return;
        }

        const shuffled = [...cards].sort(() => Math.random() - 0.5);
        const actualCount = Math.max(2, Math.min(numQuestions, cards.length));
        const selectedCards = shuffled.slice(0, actualCount);

        // Build available types list
        const availableTypes: string[] = [];
        if (multipleChoice) availableTypes.push('mc');
        if (trueFalse) availableTypes.push('tf');
        if (written) availableTypes.push('w');
        if (availableTypes.length === 0) availableTypes.push('mc');

        // Distribute types evenly via round-robin
        const typeAssignments: string[] = [];
        for (let i = 0; i < actualCount; i++) {
          typeAssignments.push(availableTypes[i % availableTypes.length]);
        }
        // Shuffle the assignments so same types aren't grouped together
        typeAssignments.sort(() => Math.random() - 0.5);

        // Determine question/answer sides based on answerSide param
        // answerSide='back' means answer with contentBack (question shows contentFront)
        // answerSide='front' means answer with contentFront (question shows contentBack)
        const getQuestion = (card: any) => answerSide === 'front' ? card.contentBack : card.contentFront;
        const getAnswer = (card: any) => answerSide === 'front' ? card.contentFront : card.contentBack;

        const generated = selectedCards.map((card, idx) => {
          const qType = typeAssignments[idx];

          if (qType === 'mc') {
            const otherCards = cards.filter((c: any) => c.cardId !== card.cardId);
            const wrongAnswers = [...otherCards].sort(() => Math.random() - 0.5).slice(0, 3).map((c: any) => getAnswer(c));
            const correctAnswer = getAnswer(card);
            const options = [correctAnswer, ...wrongAnswers].sort(() => Math.random() - 0.5);
            return { type: 'mc', card, questionText: getQuestion(card), correctAnswer, options };
          } else if (qType === 'tf') {
            const isTrue = Math.random() > 0.5;
            let displayedAnswer = getAnswer(card);
            if (!isTrue && cards.length > 1) {
              const otherCards = cards.filter((c: any) => c.cardId !== card.cardId);
              displayedAnswer = getAnswer(otherCards[Math.floor(Math.random() * otherCards.length)]);
            }
            return { type: 'tf', card, questionText: getQuestion(card), displayedAnswer, correctAnswer: isTrue ? 'Đúng' : 'Sai' };
          } else {
            return { type: 'w', card, questionText: getQuestion(card), correctAnswer: getAnswer(card) };
          }
        });

        setQuestions(generated);
      } catch (err) {
        console.error('Error fetching cards:', err);
      } finally {
        setLoading(false);
      }
    };
    initTest();
  }, [deckId]);

  const handleAnswer = (answer: string) => {
    if (hasAnsweredCurrent) return;

    const q = questions[currentIndex];
    const isCorrect = q.type === 'w'
      ? checkAnswer(q, answer, strictnessLevel)
      : q.correctAnswer.toLowerCase().trim() === answer.toLowerCase().trim();

    setSelectedOption(answer);
    setIsCurrentCorrect(isCorrect);
    setHasAnsweredCurrent(true);

    if (isCorrect) {
      playSound('correct');
    }


    const answerRecord = {
      question: q,
      userAnswer: answer,
      isCorrect,
    };

    if (showAnswerImmed) {
      // User must click "Tiếp tục"
      setUserAnswers(prev => {
        const newAns = [...prev];
        newAns[currentIndex] = answerRecord;
        return newAns;
      });
    } else {
      // Automatically advance
      setUserAnswers(prev => [...prev, answerRecord]);
      setTimeout(() => {
        goToNext();
      }, 300);
    }
  };

  const goToNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setHasAnsweredCurrent(false);
      setSelectedOption(null);
      setCurrentAnswerText('');
    } else {
      setIsFinished(true);
      playSound('end');
    }

  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </SafeAreaView>
    );
  }

  if (questions.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: theme.text }}>Không có thẻ nào để kiểm tra.</Text>
        <TouchableOpacity style={{ marginTop: 16 }} onPress={() => router.back()}>
          <Text style={{ color: theme.primary }}>Quay lại</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (isFinished) {
    const correctCount = userAnswers.filter(a => a.isCorrect).length;
    const incorrectCount = userAnswers.length - correctCount;
    const percentage = Math.round((correctCount / userAnswers.length) * 100) || 0;

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <WebContainer maxWidth={900}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.replace(`/module/${deckId}` as any)} style={styles.iconButton}>
              <Ionicons name="close" size={28} color={theme.iconColor} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.text }]}>{userAnswers.length} / {questions.length}</Text>
            <View style={{ width: 44 }} />
          </View>
        </WebContainer>

        <ScrollView contentContainerStyle={styles.resultContent}>
          <WebContainer maxWidth={900} paddingHorizontal={0}>
          <Text style={[styles.resultTitle, { color: theme.text }]}>Bạn đang tiến bộ!</Text>
          
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Kết quả của bạn</Text>
          <View style={styles.statsContainer}>
            <View style={styles.chartContainer}>
              <View style={[styles.chartCircle, { borderColor: percentage >= 50 ? theme.correct : theme.incorrect }]}>
                <Text style={[styles.chartText, { color: theme.text }]}>{percentage}%</Text>
              </View>
            </View>
            <View style={styles.statsLabels}>
              <View style={styles.statRow}>
                <Text style={[styles.statLabel, { color: theme.correct }]}>Đúng</Text>
                <View style={[styles.statBadge, { borderColor: theme.correct }]}>
                  <Text style={[styles.statCount, { color: theme.correct }]}>{correctCount}</Text>
                </View>
              </View>
              <View style={styles.statRow}>
                <Text style={[styles.statLabel, { color: '#f97316' }]}>Sai</Text>
                <View style={[styles.statBadge, { borderColor: '#f97316' }]}>
                  <Text style={[styles.statCount, { color: '#f97316' }]}>{incorrectCount}</Text>
                </View>
              </View>
            </View>
          </View>

          <Text style={[styles.sectionTitle, { color: theme.text }]}>Bước tiếp theo</Text>
          <TouchableOpacity style={styles.studyButton} onPress={() => router.replace(`/quiz/${deckId}` as any)}>
            <Ionicons name="refresh-circle-outline" size={24} color="#ffffff" />
            <Text style={styles.studyButtonText}>Ôn luyện bằng chế độ Học</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.newTestButton, { backgroundColor: theme.surface }]} onPress={() => router.replace(`/practice-setup/${deckId}` as any)}>
            <Ionicons name="document-text-outline" size={24} color={theme.primary} />
            <Text style={[styles.newTestButtonText, { color: theme.primary }]}>Làm bài kiểm tra mới</Text>
          </TouchableOpacity>

          <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 24 }]}>Đáp án của bạn</Text>
          {userAnswers.map((ans, idx) => (
            <View key={idx} style={[styles.answerCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.answerHeader}>
                <Text style={[styles.answerQuestion, { color: theme.textMuted }]}>{ans.question.questionText}</Text>
                {ans.isCorrect ? (
                  <Ionicons name="checkmark-circle" size={24} color={theme.correct} />
                ) : (
                  <Ionicons name="close-circle" size={24} color={theme.incorrect} />
                )}
              </View>
              <View style={[styles.answerBox, ans.isCorrect ? { backgroundColor: theme.correctBg } : { backgroundColor: theme.incorrectBg }]}>
                <Text style={[styles.answerText, { color: ans.isCorrect ? theme.correct : theme.incorrect }]}>
                  {ans.userAnswer}
                </Text>
              </View>
              {!ans.isCorrect ? (
                <View style={{ marginTop: 8 }}>
                  <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: 4 }}>Đáp án đúng:</Text>
                  <Text style={{ color: theme.correct, fontSize: 16, fontWeight: '500' }}>{ans.question.correctAnswer}</Text>
                </View>
              ) : null}
            </View>
          ))}
          </WebContainer>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const q = questions[currentIndex];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <WebContainer maxWidth={900}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
            <Ionicons name="close" size={28} color={theme.iconColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>{currentIndex + 1} / {questions.length}</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${((currentIndex) / questions.length) * 100}%` }]} />
        </View>
      </WebContainer>

      <ScrollView contentContainerStyle={styles.qContent}>
        <WebContainer maxWidth={900} paddingHorizontal={0}>
        <Text style={[styles.qLabel, { color: theme.textMuted }]}>Thuật ngữ</Text>
        {q.card.imageUrl ? (
          <Image source={{ uri: q.card.imageUrl }} style={styles.qImage} resizeMode="contain" />
        ) : null}
        <Text style={[styles.qText, { color: theme.text }]}>{q.questionText}</Text>

        {q.type === 'tf' ? (
          <View style={styles.tfContainer}>
            <Text style={[styles.qLabel, { color: theme.textMuted, marginTop: 24 }]}>Định nghĩa này có đúng không?</Text>
            <Text style={[styles.tfText, { color: theme.text }]}>{q.displayedAnswer}</Text>
          </View>
        ) : null}

        <View style={styles.optionsArea}>
          {q.type === 'mc' ? q.options.map((opt: string, idx: number) => {
            let btnStyle: any = [styles.optionBtn, { backgroundColor: theme.surface, borderColor: theme.border }];
            let textStyle: any = [styles.optionText, { color: theme.text }];

            if (showAnswerImmed && hasAnsweredCurrent) {
              if (opt === q.correctAnswer) {
                btnStyle = [styles.optionBtn, { backgroundColor: theme.correctBg, borderColor: theme.correct }];
                textStyle = [styles.optionText, { color: theme.correct }];
              } else if (opt === selectedOption) {
                btnStyle = [styles.optionBtn, { backgroundColor: theme.incorrectBg, borderColor: theme.incorrect }];
                textStyle = [styles.optionText, { color: theme.incorrect }];
              }
            } else if (opt === selectedOption) {
              btnStyle = [styles.optionBtn, { backgroundColor: theme.primary, borderColor: theme.primary }];
              textStyle = [styles.optionText, { color: '#fff' }];
            }

            return (
              <TouchableOpacity key={idx} style={btnStyle} onPress={() => handleAnswer(opt)}>
                <Text style={textStyle}>{opt}</Text>
              </TouchableOpacity>
            );
          }) : null}

          {q.type === 'tf' ? (
            <View style={styles.tfButtonsRow}>
              <TouchableOpacity 
                style={[styles.tfButton, { backgroundColor: showAnswerImmed && hasAnsweredCurrent && q.correctAnswer === 'Đúng' ? theme.correctBg : theme.surface, borderColor: showAnswerImmed && hasAnsweredCurrent && q.correctAnswer === 'Đúng' ? theme.correct : theme.border }]} 
                onPress={() => handleAnswer('Đúng')}
              >
                <Text style={{ fontSize: 18, fontWeight: '500', color: theme.text }}>Đúng</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.tfButton, { backgroundColor: showAnswerImmed && hasAnsweredCurrent && q.correctAnswer === 'Sai' ? theme.correctBg : theme.surface, borderColor: showAnswerImmed && hasAnsweredCurrent && q.correctAnswer === 'Sai' ? theme.correct : theme.border }]} 
                onPress={() => handleAnswer('Sai')}
              >
                <Text style={{ fontSize: 18, fontWeight: '500', color: theme.text }}>Sai</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {q.type === 'w' ? (
            <View>
              <TextInput
                style={[styles.textInput, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                value={currentAnswerText}
                onChangeText={setCurrentAnswerText}
                placeholder="Nhập đáp án..."
                placeholderTextColor={theme.textMuted}
                editable={!hasAnsweredCurrent}
                onSubmitEditing={() => handleAnswer(currentAnswerText)}
              />
              {!hasAnsweredCurrent ? (
                <TouchableOpacity style={styles.submitBtn} onPress={() => handleAnswer(currentAnswerText)}>
                  <Text style={styles.submitBtnText}>Trả lời</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          {showAnswerImmed && hasAnsweredCurrent ? (
            <View style={styles.resultFeedback}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: isCurrentCorrect ? theme.correct : theme.incorrect, marginBottom: 16 }}>
                {isCurrentCorrect ? 'Chính xác!' : 'Chưa đúng!'}
              </Text>
              <TouchableOpacity style={styles.nextBtn} onPress={goToNext}>
                <Text style={styles.nextBtnText}>Tiếp tục</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
        </WebContainer>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  headerTitle: { fontSize: 16, fontWeight: 'bold' },
  iconButton: { padding: 8, backgroundColor: 'transparent' },
  progressBg: { height: 4, width: '100%', backgroundColor: '#e5e7eb' },
  progressFill: { height: '100%', backgroundColor: '#5865F2' },
  qContent: { padding: 24, paddingBottom: 40, flexGrow: 1 },
  qLabel: { fontSize: 14, fontWeight: '600', textTransform: 'uppercase', marginBottom: 8 },
  qText: { fontSize: 28, fontWeight: '500', marginBottom: 32 },
  qImage: { width: '100%', height: 180, marginBottom: 16, borderRadius: 12 },
  tfContainer: { marginBottom: 32, padding: 16, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.02)' },
  tfText: { fontSize: 22, fontWeight: '500', textAlign: 'center' },
  optionsArea: { flex: 1, justifyContent: 'flex-end' },
  optionBtn: { padding: 16, borderRadius: 12, borderWidth: 2, marginBottom: 12 },
  optionText: { fontSize: 18, textAlign: 'center', fontWeight: '500' },
  tfButtonsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  tfButton: { flex: 1, padding: 20, borderRadius: 12, borderWidth: 2, alignItems: 'center', marginHorizontal: 6 },
  textInput: { padding: 16, borderRadius: 12, borderWidth: 1, fontSize: 18, marginBottom: 16 },
  submitBtn: { backgroundColor: '#5865F2', padding: 16, borderRadius: 12, alignItems: 'center' },
  submitBtnText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  resultFeedback: { marginTop: 24, padding: 16, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.02)', alignItems: 'center' },
  nextBtn: { backgroundColor: '#5865F2', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 30, width: '100%', alignItems: 'center' },
  nextBtnText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },

  // Result screen styles
  resultContent: { padding: 24, paddingBottom: 40 },
  resultTitle: { fontSize: 32, fontWeight: 'bold', marginBottom: 32 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  statsContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 32 },
  chartContainer: { marginRight: 32 },
  chartCircle: { width: 100, height: 100, borderRadius: 50, borderWidth: 8, justifyContent: 'center', alignItems: 'center' },
  chartText: { fontSize: 24, fontWeight: 'bold' },
  statsLabels: { flex: 1 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statLabel: { fontSize: 18, fontWeight: '600' },
  statBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16, borderWidth: 1 },
  statCount: { fontSize: 16, fontWeight: 'bold' },
  studyButton: { backgroundColor: '#5865F2', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 30, marginBottom: 16 },
  studyButtonText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', marginLeft: 8 },
  newTestButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 30, marginBottom: 24 },
  newTestButtonText: { fontSize: 18, fontWeight: 'bold', marginLeft: 8 },
  answerCard: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  answerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  answerQuestion: { fontSize: 18, fontWeight: '500', flex: 1, marginRight: 16 },
  answerBox: { padding: 12, borderRadius: 8 },
  answerText: { fontSize: 16, fontWeight: '500' }
});
