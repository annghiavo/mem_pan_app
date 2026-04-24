import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function QuizScreen() {
  const router = useRouter();
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);

  const question = "Describing someone or something that wants to succeed.";
  const options = [
    "creative",
    "ambitious",
    "diligent",
    "lazy"
  ];
  const correctIndex = 1;

  const handleSelect = (index: number) => {
    if (!isAnswered) {
      setSelectedOption(index);
      setIsAnswered(true);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="close" size={28} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>1 / 69</Text>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="settings-outline" size={24} color="#1f2937" />
        </TouchableOpacity>
      </View>

      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: '5%' }]} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.questionContainer}>
          <Text style={styles.questionLabel}>Định nghĩa</Text>
          <Text style={styles.questionText}>{question}</Text>
        </View>

        <View style={styles.optionsContainer}>
          <Text style={styles.optionsLabel}>Chọn thuật ngữ đúng</Text>
          {options.map((opt, index) => {
            let optionStyle = styles.optionCard;
            let textStyle = styles.optionText;
            
            if (isAnswered) {
              if (index === correctIndex) {
                optionStyle = [styles.optionCard, styles.optionCorrect] as any;
                textStyle = [styles.optionText, styles.textCorrect] as any;
              } else if (index === selectedOption) {
                optionStyle = [styles.optionCard, styles.optionIncorrect] as any;
                textStyle = [styles.optionText, styles.textIncorrect] as any;
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

      {isAnswered && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.nextButton} onPress={() => {
            setSelectedOption(null);
            setIsAnswered(false);
          }}>
            <Text style={styles.nextButtonText}>Tiếp tục</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#374151' },
  iconButton: { padding: 8 },
  progressBarBg: { height: 4, backgroundColor: '#e5e7eb', width: '100%' },
  progressBarFill: { height: '100%', backgroundColor: '#5865F2' },
  content: { padding: 20 },
  questionContainer: { marginBottom: 40 },
  questionLabel: { fontSize: 14, color: '#6b7280', fontWeight: '600', marginBottom: 12, textTransform: 'uppercase' },
  questionText: { fontSize: 24, color: '#111827', fontWeight: '500', lineHeight: 34 },
  optionsContainer: { flex: 1 },
  optionsLabel: { fontSize: 16, color: '#4b5563', fontWeight: '600', marginBottom: 16 },
  optionCard: { backgroundColor: '#ffffff', padding: 20, borderRadius: 16, marginBottom: 12, borderWidth: 2, borderColor: '#e5e7eb' },
  optionText: { fontSize: 18, color: '#1f2937', textAlign: 'center', fontWeight: '500' },
  optionCorrect: { borderColor: '#10b981', backgroundColor: '#ecfdf5' },
  textCorrect: { color: '#047857' },
  optionIncorrect: { borderColor: '#ef4444', backgroundColor: '#fef2f2' },
  textIncorrect: { color: '#b91c1c' },
  footer: { padding: 20, backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  nextButton: { backgroundColor: '#5865F2', paddingVertical: 16, borderRadius: 30, alignItems: 'center' },
  nextButtonText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' }
});
