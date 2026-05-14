import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, Switch, ActivityIndicator, Modal, useColorScheme, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getDeck, getDeckStudySettings, updateDeckStudySettings } from '../../services/api';
import { StudySettings, defaultStudySettings } from '../../types/studySettings';

const STRICTNESS_LABELS: Record<string, string> = {
  flexible: 'Nới lỏng',
  strict: 'Chặt chẽ',
};

const STRICTNESS_DESCRIPTIONS: Record<string, string> = {
  flexible: 'Bỏ qua chính tả nhỏ, dấu câu và khoảng trắng',
  strict: 'Phải khớp chính xác (chỉ bỏ qua viết hoa/thường)',
};

export default function QuizSettingsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const deckId = id as string;

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const theme = {
    background: isDark ? '#111111' : '#ffffff',
    surface: isDark ? '#1c1c1e' : '#ffffff',
    surfaceAlt: isDark ? '#27272a' : '#f3f4f6',
    text: isDark ? '#f4f4f5' : '#111827',
    textMuted: isDark ? '#a1a1aa' : '#6b7280',
    border: isDark ? '#3f3f46' : '#e5e7eb',
    primary: '#5865F2',
    iconColor: isDark ? '#f4f4f5' : '#1f2937',
  };

  const [loadingInit, setLoadingInit] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deckName, setDeckName] = useState('');
  const [settings, setSettings] = useState<StudySettings>(defaultStudySettings);
  const [showStrictnessPicker, setShowStrictnessPicker] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [deckRes, settingsRes] = await Promise.all([
          getDeck(deckId),
          getDeckStudySettings(deckId).catch(() => null),
        ]);
        setDeckName(deckRes?.deck?.name ?? '');
        if (settingsRes?.settings) {
          const s = settingsRes.settings;
          setSettings({
            shuffleTerms: s.shuffleTerms ?? defaultStudySettings.shuffleTerms,
            textToSpeech: s.textToSpeech ?? defaultStudySettings.textToSpeech,
            answerWithTerm: s.answerWithTerm ?? defaultStudySettings.answerWithTerm,
            answerWithDefinition: s.answerWithDefinition ?? defaultStudySettings.answerWithDefinition,
            questionTypeFlashcards: s.questionTypeFlashcards ?? defaultStudySettings.questionTypeFlashcards,
            questionTypeMultipleChoice: s.questionTypeMultipleChoice ?? defaultStudySettings.questionTypeMultipleChoice,
            questionTypeWritten: s.questionTypeWritten ?? defaultStudySettings.questionTypeWritten,
            strictnessLevel: s.strictnessLevel ?? defaultStudySettings.strictnessLevel,
            requireRetypingCorrectAnswer: s.requireRetypingCorrectAnswer ?? defaultStudySettings.requireRetypingCorrectAnswer,
          });
        }
      } catch (err) {
        console.error('Error loading settings:', err);
      } finally {
        setLoadingInit(false);
      }
    };
    if (deckId) load();
  }, [deckId]);

  const update = useCallback((patch: Partial<StudySettings>) => {
    setSettings(prev => ({ ...prev, ...patch }));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDeckStudySettings(deckId, settings);
      router.back();
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể lưu cài đặt. Vui lòng thử lại.');
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAnswerWith = (field: 'answerWithTerm' | 'answerWithDefinition', val: boolean) => {
    const other = field === 'answerWithTerm' ? settings.answerWithDefinition : settings.answerWithTerm;
    if (!val && !other) return; // at least one must remain on
    update({ [field]: val });
  };

  const handleToggleQuestionType = (
    field: 'questionTypeFlashcards' | 'questionTypeMultipleChoice' | 'questionTypeWritten',
    val: boolean,
  ) => {
    const { questionTypeFlashcards: f, questionTypeMultipleChoice: mc, questionTypeWritten: w } = settings;
    const counts = [
      field === 'questionTypeFlashcards' ? val : f,
      field === 'questionTypeMultipleChoice' ? val : mc,
      field === 'questionTypeWritten' ? val : w,
    ].filter(Boolean).length;
    if (counts === 0) return; // at least one must remain on
    update({ [field]: val });
  };

  if (loadingInit) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.iconButton, { backgroundColor: theme.surfaceAlt }]}>
          <Ionicons name="close" size={28} color={theme.iconColor} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {deckName ? (
          <Text style={[styles.deckName, { color: theme.textMuted }]}>{deckName.toUpperCase()}</Text>
        ) : null}

        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: theme.text }]}>Cài đặt{'\n'}học tập</Text>
          <View style={styles.iconWrapper}>
            <Ionicons name="settings" size={32} color="#ffffff" />
          </View>
        </View>

        {/* ─── Chung ─── */}
        <Text style={[styles.sectionHeader, { color: theme.textMuted }]}>CHUNG</Text>
        <View style={[styles.section, { borderColor: theme.border }]}>
          <View style={[styles.row, { borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
            <View style={styles.labelGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Xáo trộn thuật ngữ</Text>
              <Text style={[styles.subLabel, { color: theme.textMuted }]}>Ngẫu nhiên thứ tự thẻ mỗi phiên</Text>
            </View>
            <Switch
              value={settings.shuffleTerms}
              onValueChange={v => update({ shuffleTerms: v })}
              trackColor={{ false: '#d1d5db', true: theme.primary }}
              thumbColor="#ffffff"
            />
          </View>

          <View style={styles.row}>
            <View style={styles.labelGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Đọc văn bản</Text>
              <Text style={[styles.subLabel, { color: theme.textMuted }]}>Phát âm câu hỏi và đáp án</Text>
            </View>
            <Switch
              value={settings.textToSpeech}
              onValueChange={v => update({ textToSpeech: v })}
              trackColor={{ false: '#d1d5db', true: theme.primary }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        {/* ─── Trả lời bằng ─── */}
        <Text style={[styles.sectionHeader, { color: theme.textMuted }]}>TRẢ LỜI BẰNG</Text>
        <View style={[styles.section, { borderColor: theme.border }]}>
          <View style={[styles.row, { borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
            <Text style={[styles.label, { color: theme.text }]}>Thuật ngữ</Text>
            <Switch
              value={settings.answerWithTerm}
              onValueChange={v => handleToggleAnswerWith('answerWithTerm', v)}
              trackColor={{ false: '#d1d5db', true: theme.primary }}
              thumbColor="#ffffff"
            />
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.text }]}>Định nghĩa</Text>
            <Switch
              value={settings.answerWithDefinition}
              onValueChange={v => handleToggleAnswerWith('answerWithDefinition', v)}
              trackColor={{ false: '#d1d5db', true: theme.primary }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        {/* ─── Loại câu hỏi ─── */}
        <Text style={[styles.sectionHeader, { color: theme.textMuted }]}>LOẠI CÂU HỎI</Text>
        <View style={[styles.section, { borderColor: theme.border }]}>
          <View style={[styles.row, { borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
            <Text style={[styles.label, { color: theme.text }]}>Thẻ nhớ</Text>
            <Switch
              value={settings.questionTypeFlashcards}
              onValueChange={v => handleToggleQuestionType('questionTypeFlashcards', v)}
              trackColor={{ false: '#d1d5db', true: theme.primary }}
              thumbColor="#ffffff"
            />
          </View>
          <View style={[styles.row, { borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
            <Text style={[styles.label, { color: theme.text }]}>Nhiều lựa chọn</Text>
            <Switch
              value={settings.questionTypeMultipleChoice}
              onValueChange={v => handleToggleQuestionType('questionTypeMultipleChoice', v)}
              trackColor={{ false: '#d1d5db', true: theme.primary }}
              thumbColor="#ffffff"
            />
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.text }]}>Tự luận</Text>
            <Switch
              value={settings.questionTypeWritten}
              onValueChange={v => handleToggleQuestionType('questionTypeWritten', v)}
              trackColor={{ false: '#d1d5db', true: theme.primary }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        {/* ─── Chấm điểm ─── */}
        <Text style={[styles.sectionHeader, { color: theme.textMuted }]}>CHẤM ĐIỂM</Text>
        <View style={[styles.section, { borderColor: theme.border }]}>
          <TouchableOpacity
            style={[styles.row, { borderBottomColor: theme.border, borderBottomWidth: 1 }]}
            onPress={() => setShowStrictnessPicker(true)}
            activeOpacity={0.6}
          >
            <View style={styles.labelGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Độ chặt chẽ</Text>
              <Text style={[styles.subLabel, { color: theme.textMuted }]}>
                {STRICTNESS_DESCRIPTIONS[settings.strictnessLevel]}
              </Text>
            </View>
            <View style={styles.pickerButton}>
              <Text style={[styles.pickerText, { color: theme.primary }]}>
                {STRICTNESS_LABELS[settings.strictnessLevel]}
              </Text>
              <Ionicons name="caret-down" size={16} color={theme.primary} style={{ marginLeft: 4 }} />
            </View>
          </TouchableOpacity>

          <View style={styles.row}>
            <View style={styles.labelGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Yêu cầu gõ lại đáp án đúng</Text>
              <Text style={[styles.subLabel, { color: theme.textMuted }]}>
                Bắt buộc gõ lại khi trả lời sai
              </Text>
            </View>
            <Switch
              value={settings.requireRetypingCorrectAnswer}
              onValueChange={v => update({ requireRetypingCorrectAnswer: v })}
              trackColor={{ false: '#d1d5db', true: theme.primary }}
              thumbColor="#ffffff"
            />
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.saveButton, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#ffffff" />
            : <Text style={styles.saveButtonText}>Lưu cài đặt</Text>}
        </TouchableOpacity>
      </View>

      {/* Strictness picker modal */}
      <Modal visible={showStrictnessPicker} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowStrictnessPicker(false)}
        >
          <View style={[styles.pickerModal, { backgroundColor: theme.surface }]}>
            <View style={[styles.pickerHandle, { backgroundColor: theme.border }]} />
            <Text style={[styles.pickerTitle, { color: theme.text }]}>Độ chặt chẽ chấm điểm</Text>
            <Text style={[styles.pickerSubtitle, { color: theme.textMuted }]}>
              Áp dụng cho câu hỏi tự luận
            </Text>

            {(['flexible', 'strict'] as const).map(level => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.pickerOption,
                  settings.strictnessLevel === level && { backgroundColor: isDark ? '#27272a' : '#eef2ff' },
                ]}
                onPress={() => {
                  update({ strictnessLevel: level });
                  setShowStrictnessPicker(false);
                }}
              >
                <View style={styles.pickerOptionContent}>
                  <Text style={[
                    styles.pickerOptionTitle,
                    { color: settings.strictnessLevel === level ? theme.primary : theme.text },
                  ]}>
                    {STRICTNESS_LABELS[level]}
                  </Text>
                  <Text style={[styles.pickerOptionDesc, { color: theme.textMuted }]}>
                    {STRICTNESS_DESCRIPTIONS[level]}
                  </Text>
                </View>
                {settings.strictnessLevel === level ? (
                  <Ionicons name="checkmark" size={22} color={theme.primary} />
                ) : null}
              </TouchableOpacity>
            ))}
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
  content: { padding: 24, paddingBottom: 8 },
  deckName: { fontSize: 14, fontWeight: '600', marginBottom: 8, letterSpacing: 0.5 },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  title: { fontSize: 32, fontWeight: 'bold', lineHeight: 40 },
  iconWrapper: { backgroundColor: '#5865F2', padding: 12, borderRadius: 12 },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 4,
  },
  section: {
    borderWidth: 1,
    borderRadius: 16,
    marginBottom: 24,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  labelGroup: { flex: 1, marginRight: 12 },
  label: { fontSize: 17, fontWeight: '500' },
  subLabel: { fontSize: 13, marginTop: 2 },
  pickerButton: { flexDirection: 'row', alignItems: 'center' },
  pickerText: { fontSize: 16, fontWeight: '500' },
  footer: { padding: 24, paddingBottom: 32, borderTopWidth: 1 },
  saveButton: {
    backgroundColor: '#5865F2',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  saveButtonText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerModal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  pickerHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  pickerTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  pickerSubtitle: { fontSize: 14, marginBottom: 16 },
  pickerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  pickerOptionContent: { flex: 1, marginRight: 8 },
  pickerOptionTitle: { fontSize: 17, fontWeight: '600', marginBottom: 2 },
  pickerOptionDesc: { fontSize: 13 },
});
