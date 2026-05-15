import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Animated, Dimensions, ActivityIndicator, useColorScheme, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getDeckCards } from '../../services/api';
import { WebContainer } from '../../components/ui/WebContainer';

const { width, height } = Dimensions.get('window');

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

export default function FlashcardScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const deckId = id as string;

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const theme = {
    background: isDark ? '#111111' : '#f8f9fa',
    surface: isDark ? '#1c1c1e' : '#ffffff',
    text: isDark ? '#f4f4f5' : '#374151',
    textMuted: isDark ? '#a1a1aa' : '#4b5563',
    iconColor: isDark ? '#f4f4f5' : '#1f2937',
    cardText: isDark ? '#f4f4f5' : '#1f2937',
    navBg: isDark ? '#312e81' : '#e0e7ff',
    navDisabled: isDark ? '#27272a' : '#f3f4f6',
    navDisabledIcon: isDark ? '#52525b' : '#9ca3af',
    primary: '#5865F2',
  };

  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isFlipped, setIsFlipped] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const fetchCards = async () => {
      try {
        const response = await getDeckCards(deckId);
        setCards(response.cards || []);
      } catch (error) {
        console.error('Error fetching cards:', error);
      } finally {
        setLoading(false);
      }
    };
    if (deckId) {
      fetchCards();
    }
  }, [deckId]);

  const flipCard = () => {
    Animated.timing(flipAnim, {
      toValue: isFlipped ? 0 : 180,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setIsFlipped(!isFlipped));
  };

  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg']
  });

  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['180deg', '360deg']
  });

  const frontAnimatedStyle = { transform: [{ rotateY: frontInterpolate }] };
  const backAnimatedStyle = { transform: [{ rotateY: backInterpolate }] };

  const nextCard = () => {
    if (currentIndex < cards.length - 1) {
      if (isFlipped) flipCard();
      setTimeout(() => setCurrentIndex(currentIndex + 1), isFlipped ? 300 : 0);
    }
  };

  const prevCard = () => {
    if (currentIndex > 0) {
      if (isFlipped) flipCard();
      setTimeout(() => setCurrentIndex(currentIndex - 1), isFlipped ? 300 : 0);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </SafeAreaView>
    );
  }

  if (cards.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontSize: 18, color: theme.textMuted, marginBottom: 16 }}>Không có thẻ nào trong học phần này.</Text>
        <TouchableOpacity style={{ backgroundColor: theme.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 24 }} onPress={() => router.back()}>
          <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 16 }}>Quay lại</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <WebContainer maxWidth={900}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
            <Ionicons name="close" size={28} color={theme.iconColor} />
          </TouchableOpacity>
          <Text style={[styles.progressText, { color: theme.text }]}>{currentIndex + 1} / {cards.length}</Text>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="settings-outline" size={24} color={theme.iconColor} />
          </TouchableOpacity>
        </View>

        <View style={[styles.progressBarBg, { backgroundColor: isDark ? '#27272a' : '#e5e7eb' }]}>
          <View style={[styles.progressBarFill, { width: `${((currentIndex + 1) / cards.length) * 100}%` }]} />
        </View>

        {/* Card Area */}
        <View style={styles.cardContainer}>
          <TouchableOpacity activeOpacity={1} onPress={flipCard} style={styles.cardWrapper}>
            {/* Front */}
            <Animated.View style={[styles.card, styles.cardFront, frontAnimatedStyle, { backgroundColor: theme.surface, shadowColor: isDark ? 'transparent' : '#000' }]}>
              {cards[currentIndex].langFront ? (
                <Text style={[styles.cardLangLabel, { color: theme.textMuted }]}>{langNameMap[cards[currentIndex].langFront] || cards[currentIndex].langFront}</Text>
              ) : null}
              {cards[currentIndex].imageUrl ? (
                <Image source={{ uri: cards[currentIndex].imageUrl }} style={styles.cardImage} resizeMode="contain" />
              ) : null}
              <Text style={[styles.cardText, { color: theme.cardText }]}>{cards[currentIndex].contentFront}</Text>
            </Animated.View>
            {/* Back */}
            <Animated.View style={[styles.card, styles.cardBack, backAnimatedStyle, { backgroundColor: theme.surface, shadowColor: isDark ? 'transparent' : '#000' }]}>
              {cards[currentIndex].langBack ? (
                <Text style={[styles.cardLangLabel, { color: theme.textMuted }]}>{langNameMap[cards[currentIndex].langBack] || cards[currentIndex].langBack}</Text>
              ) : null}
              <Text style={[styles.cardText, { color: theme.cardText }]}>{cards[currentIndex].contentBack}</Text>
            </Animated.View>
          </TouchableOpacity>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity onPress={prevCard} disabled={currentIndex === 0} style={[styles.navButton, { backgroundColor: theme.navBg }, currentIndex === 0 && { backgroundColor: theme.navDisabled }]}>
            <Ionicons name="arrow-back" size={28} color={currentIndex === 0 ? theme.navDisabledIcon : theme.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.playButton}>
            <Ionicons name="play" size={28} color="#ffffff" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
          <TouchableOpacity onPress={nextCard} disabled={currentIndex === cards.length - 1} style={[styles.navButton, { backgroundColor: theme.navBg }, currentIndex === cards.length - 1 && { backgroundColor: theme.navDisabled }]}>
            <Ionicons name="arrow-forward" size={28} color={currentIndex === cards.length - 1 ? theme.navDisabledIcon : theme.primary} />
          </TouchableOpacity>
        </View>
      </WebContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  iconButton: { padding: 8 },
  progressText: { fontSize: 16, fontWeight: 'bold' },
  progressBarBg: { height: 4, width: '100%' },
  progressBarFill: { height: '100%', backgroundColor: '#5865F2' },
  cardContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  cardWrapper: { width: '100%', height: height * 0.55 },
  card: { position: 'absolute', width: '100%', height: '100%', borderRadius: 20, justifyContent: 'center', alignItems: 'center', padding: 32, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 15, elevation: 5, backfaceVisibility: 'hidden' },
  cardFront: {},
  cardBack: {},
  cardText: { fontSize: 32, fontWeight: '500', textAlign: 'center' },
  cardImage: { width: '80%', height: '40%', marginBottom: 20, borderRadius: 12 },
  cardLangLabel: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12, position: 'absolute', top: 20 },
  controls: { flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center', paddingBottom: 40, paddingHorizontal: 20 },
  navButton: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
  playButton: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#5865F2', justifyContent: 'center', alignItems: 'center', shadowColor: '#5865F2', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }
});
