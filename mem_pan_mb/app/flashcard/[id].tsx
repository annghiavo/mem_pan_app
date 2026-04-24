import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

export default function FlashcardScreen() {
  const router = useRouter();
  const [isFlipped, setIsFlipped] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;

  const [currentIndex, setCurrentIndex] = useState(0);
  const terms = [
    { term: 'ambitious', definition: 'Describing someone or something that wants to succeed.' },
    { term: 'creative', definition: 'Relating to or involving the imagination or original ideas.' }
  ];

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
    if (currentIndex < terms.length - 1) {
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="close" size={28} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.progressText}>{currentIndex + 1} / {terms.length}</Text>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="settings-outline" size={24} color="#1f2937" />
        </TouchableOpacity>
      </View>

      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${((currentIndex + 1) / terms.length) * 100}%` }]} />
      </View>

      {/* Card Area */}
      <View style={styles.cardContainer}>
        <TouchableOpacity activeOpacity={1} onPress={flipCard} style={styles.cardWrapper}>
          {/* Front */}
          <Animated.View style={[styles.card, styles.cardFront, frontAnimatedStyle]}>
            <Text style={styles.cardText}>{terms[currentIndex].term}</Text>
          </Animated.View>
          {/* Back */}
          <Animated.View style={[styles.card, styles.cardBack, backAnimatedStyle]}>
            <Text style={styles.cardText}>{terms[currentIndex].definition}</Text>
          </Animated.View>
        </TouchableOpacity>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity onPress={prevCard} disabled={currentIndex === 0} style={[styles.navButton, currentIndex === 0 && styles.navDisabled]}>
          <Ionicons name="arrow-back" size={28} color={currentIndex === 0 ? "#9ca3af" : "#5865F2"} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.playButton}>
          <Ionicons name="play" size={28} color="#ffffff" style={{ marginLeft: 4 }} />
        </TouchableOpacity>
        <TouchableOpacity onPress={nextCard} disabled={currentIndex === terms.length - 1} style={[styles.navButton, currentIndex === terms.length - 1 && styles.navDisabled]}>
          <Ionicons name="arrow-forward" size={28} color={currentIndex === terms.length - 1 ? "#9ca3af" : "#5865F2"} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  iconButton: { padding: 8 },
  progressText: { fontSize: 16, fontWeight: 'bold', color: '#374151' },
  progressBarBg: { height: 4, backgroundColor: '#e5e7eb', width: '100%' },
  progressBarFill: { height: '100%', backgroundColor: '#5865F2' },
  cardContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  cardWrapper: { width: '100%', height: height * 0.55 },
  card: { position: 'absolute', width: '100%', height: '100%', backgroundColor: '#ffffff', borderRadius: 20, justifyContent: 'center', alignItems: 'center', padding: 32, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 15, elevation: 5, backfaceVisibility: 'hidden' },
  cardFront: {},
  cardBack: {},
  cardText: { fontSize: 32, fontWeight: '500', color: '#1f2937', textAlign: 'center' },
  controls: { flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center', paddingBottom: 40, paddingHorizontal: 20 },
  navButton: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#e0e7ff', justifyContent: 'center', alignItems: 'center' },
  navDisabled: { backgroundColor: '#f3f4f6' },
  playButton: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#5865F2', justifyContent: 'center', alignItems: 'center', shadowColor: '#5865F2', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }
});
