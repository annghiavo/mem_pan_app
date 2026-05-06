import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator, useColorScheme, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { startStudySession, reviewCard, finishStudySession, getDeckCards } from '../../services/api';
import { Audio } from 'expo-av';


export default function QuizScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const deckId = id as string;

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
    optionCorrectBg: isDark ? '#064e3b' : '#ecfdf5',
    optionCorrectBorder: isDark ? '#10b981' : '#10b981',
    optionCorrectText: isDark ? '#34d399' : '#047857',
    optionIncorrectBg: isDark ? '#7f1d1d' : '#fef2f2',
    optionIncorrectBorder: isDark ? '#ef4444' : '#ef4444',
    optionIncorrectText: isDark ? '#f87171' : '#b91c1c',
  };

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [deckCardsMap, setDeckCardsMap] = useState<Record<string, any>>({});
  const [deckCardsList, setDeckCardsList] = useState<any[]>([]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [options, setOptions] = useState<string[]>([]);
  const [correctIndex, setCorrectIndex] = useState(-1);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [cardStartTime, setCardStartTime] = useState<number>(Date.now());
  const [sessionFinished, setSessionFinished] = useState(false);

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


  useEffect(() => {
    const initSession = async () => {
      try {
        const [sessionRes, cardsRes] = await Promise.all([
          startStudySession(deckId, 10, 20),
          getDeckCards(deckId)
        ]);

        const cardsMap: Record<string, any> = {};
        cardsRes.cards?.forEach((c: any) => {
          cardsMap[c.cardId] = c;
        });

        setSession(sessionRes.session);
        setDeckCardsMap(cardsMap);
        setDeckCardsList(cardsRes.cards || []);
      } catch (err) {
        console.error('Error starting session:', err);
      } finally {
        setLoading(false);
      }
    };
    if (deckId) {
      initSession();
    }
  }, [deckId]);

  const generateOptions = (currentCardContent: any) => {
    const correctAnswer = currentCardContent.contentBack;
    const otherCards = deckCardsList.filter(c => c.cardId !== currentCardContent.cardId);
    
    // Shuffle other cards and pick up to 3
    const shuffledOthers = [...otherCards].sort(() => 0.5 - Math.random());
    const wrongAnswers = shuffledOthers.slice(0, 3).map(c => c.contentBack);
    
    const allOptions = [correctAnswer, ...wrongAnswers];
    // Shuffle options
    allOptions.sort(() => 0.5 - Math.random());
    
    setOptions(allOptions);
    setCorrectIndex(allOptions.indexOf(correctAnswer));
    setCardStartTime(Date.now());
  };

  useEffect(() => {
    if (session && session.cards && session.cards.length > 0 && currentIndex < session.cards.length) {
      const cardItem = session.cards[currentIndex];
      const cardContent = deckCardsMap[cardItem.cardId];
      if (cardContent) {
        generateOptions(cardContent);
      }
    }
  }, [currentIndex, session, deckCardsMap]);

  const handleSelect = async (index: number) => {
    if (isAnswered) return;
    
    setSelectedOption(index);
    setIsAnswered(true);

    const durationMs = Date.now() - cardStartTime;
    const isCorrect = index === correctIndex;

    let rating = 1; // 1 = Again
    if (isCorrect) {
      playSound('correct');
      if (durationMs < 3000) {
        rating = 4; // Easy
      } else if (durationMs < 8000) {
        rating = 3; // Good
      } else {
        rating = 2; // Hard
      }
    }


    try {
      const cardItem = session.cards[currentIndex];
      await reviewCard(session.sessionId, cardItem.cardId, rating, durationMs);
    } catch (err) {
      console.error('Error reviewing card:', err);
    }
  };

  const handleNext = async () => {
    if (currentIndex < session.cards.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      // Finish session
      try {
        setLoading(true);
        await finishStudySession(session.sessionId);
        setSessionFinished(true);
        playSound('end');

      } catch (err) {
        console.error('Error finishing session:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </SafeAreaView>
    );
  }

  if (!session || !session.cards || session.cards.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontSize: 18, color: theme.textMuted, marginBottom: 16 }}>Không có thẻ nào để học lúc này!</Text>
        <TouchableOpacity style={styles.nextButton} onPress={() => router.back()}>
          <Text style={styles.nextButtonText}>Quay lại</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (sessionFinished) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Ionicons name="checkmark-circle" size={80} color="#10b981" style={{ marginBottom: 16 }} />
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: theme.text, marginBottom: 8 }}>Tuyệt vời!</Text>
        <Text style={{ fontSize: 16, color: theme.textMuted, marginBottom: 32 }}>Bạn đã hoàn thành phiên học.</Text>
        <TouchableOpacity style={[styles.nextButton, { width: 200 }]} onPress={() => router.back()}>
          <Text style={styles.nextButtonText}>Hoàn tất</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const currentCardItem = session.cards[currentIndex];
  const cardContent = deckCardsMap[currentCardItem.cardId];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="close" size={28} color={theme.iconColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{currentIndex + 1} / {session.cards.length}</Text>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="settings-outline" size={24} color={theme.iconColor} />
        </TouchableOpacity>
      </View>

      <View style={[styles.progressBarBg, { backgroundColor: isDark ? '#27272a' : '#e5e7eb' }]}>
        <View style={[styles.progressBarFill, { width: `${((currentIndex) / session.cards.length) * 100}%` }]} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.questionContainer}>
          <Text style={[styles.questionLabel, { color: theme.textMuted }]}>Định nghĩa</Text>
          {cardContent?.imageUrl ? (
            <Image source={{ uri: cardContent.imageUrl }} style={styles.questionImage} resizeMode="contain" />
          ) : null}
          <Text style={[styles.questionText, { color: theme.text }]}>{cardContent?.contentFront}</Text>
        </View>

        <View style={styles.optionsContainer}>
          <Text style={[styles.optionsLabel, { color: theme.textMuted }]}>Chọn thuật ngữ đúng</Text>
          {options.map((opt, index) => {
            let optionStyle = [styles.optionCard, { backgroundColor: theme.surface, borderColor: theme.border }];
            let textStyle = [styles.optionText, { color: theme.text }];
            
            if (isAnswered) {
              if (index === correctIndex) {
                optionStyle = [styles.optionCard, { backgroundColor: theme.optionCorrectBg, borderColor: theme.optionCorrectBorder }] as any;
                textStyle = [styles.optionText, { color: theme.optionCorrectText }] as any;
              } else if (index === selectedOption) {
                optionStyle = [styles.optionCard, { backgroundColor: theme.optionIncorrectBg, borderColor: theme.optionIncorrectBorder }] as any;
                textStyle = [styles.optionText, { color: theme.optionIncorrectText }] as any;
              }
            }

            return (
              <TouchableOpacity 
                key={index} 
                style={optionStyle}
                onPress={() => handleSelect(index)}
                activeOpacity={0.7}
              >
                <Text style={textStyle}>{opt}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {isAnswered ? (
        <View style={[styles.footer, { backgroundColor: theme.surface, borderTopColor: theme.borderLight }]}>
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>{currentIndex < session.cards.length - 1 ? 'Tiếp tục' : 'Hoàn thành'}</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  headerTitle: { fontSize: 16, fontWeight: 'bold' },
  iconButton: { padding: 8 },
  progressBarBg: { height: 4, width: '100%' },
  progressBarFill: { height: '100%', backgroundColor: '#5865F2' },
  content: { padding: 20 },
  questionContainer: { marginBottom: 40 },
  questionLabel: { fontSize: 14, fontWeight: '600', marginBottom: 12, textTransform: 'uppercase' },
  questionText: { fontSize: 24, fontWeight: '500', lineHeight: 34 },
  questionImage: { width: '100%', height: 200, marginBottom: 16, borderRadius: 12 },
  optionsContainer: { flex: 1 },
  optionsLabel: { fontSize: 16, fontWeight: '600', marginBottom: 16 },
  optionCard: { padding: 20, borderRadius: 16, marginBottom: 12, borderWidth: 2 },
  optionText: { fontSize: 18, textAlign: 'center', fontWeight: '500' },
  footer: { padding: 20, borderTopWidth: 1 },
  nextButton: { backgroundColor: '#5865F2', paddingVertical: 16, borderRadius: 30, alignItems: 'center', paddingHorizontal: 24 },
  nextButtonText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' }
});
