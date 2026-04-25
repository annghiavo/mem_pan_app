import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function CreateScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const theme = {
    background: isDark ? '#111111' : '#f8f9fa',
    surface: isDark ? '#1c1c1e' : '#ffffff',
    text: isDark ? '#f4f4f5' : '#1f2937',
    textMuted: isDark ? '#a1a1aa' : '#6b7280',
    border: isDark ? '#27272a' : '#f3f4f6',
    primary: '#5865F2',
    iconBg: isDark ? '#312e81' : '#EEF2FF',
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Tạo mới</Text>
      </View>
      <View style={styles.content}>
        <TouchableOpacity style={[styles.createOption, { backgroundColor: theme.surface, shadowColor: isDark ? 'transparent' : '#000' }]} onPress={() => router.push('/module/create' as any)}>
          <View style={[styles.iconContainer, { backgroundColor: theme.iconBg }]}>
            <Ionicons name="albums-outline" size={24} color={theme.primary} />
          </View>
          <View style={styles.optionTextContainer}>
            <Text style={[styles.optionTitle, { color: theme.text }]}>Học phần</Text>
            <Text style={[styles.optionSubtitle, { color: theme.textMuted }]}>Tạo học phần mới với thuật ngữ và định nghĩa</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.createOption, { backgroundColor: theme.surface, shadowColor: isDark ? 'transparent' : '#000' }]} onPress={() => router.push('/folder/create' as any)}>
          <View style={[styles.iconContainer, { backgroundColor: theme.iconBg }]}>
            <Ionicons name="folder-outline" size={24} color={theme.primary} />
          </View>
          <View style={styles.optionTextContainer}>
            <Text style={[styles.optionTitle, { color: theme.text }]}>Thư mục</Text>
            <Text style={[styles.optionSubtitle, { color: theme.textMuted }]}>Tổ chức các học phần của bạn</Text>
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 24, fontWeight: 'bold' },
  content: { padding: 16 },
  createOption: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 12, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  iconContainer: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  optionTextContainer: { flex: 1 },
  optionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  optionSubtitle: { fontSize: 14 }
});
