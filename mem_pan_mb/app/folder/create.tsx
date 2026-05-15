import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, Alert, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { createFolder } from '../../services/api';
import { WebContainer } from '../../components/ui/WebContainer';

export default function CreateFolderScreen() {
  const router = useRouter();

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const theme = {
    background: isDark ? '#111111' : '#ffffff',
    text: isDark ? '#f4f4f5' : '#1f2937',
    textMuted: isDark ? '#a1a1aa' : '#9ca3af',
    border: isDark ? '#27272a' : '#e5e7eb',
    primary: isDark ? '#818cf8' : '#4255ff',
    iconColor: isDark ? '#f4f4f5' : '#4b5563',
    cancelBg: isDark ? '#27272a' : '#f3f4f6',
    cancelText: isDark ? '#f4f4f5' : '#1f2937',
    disabledBtn: isDark ? '#3f3f46' : '#9ca3af',
  };

  const [folderName, setFolderName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = async () => {
    if (!folderName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên thư mục');
      return;
    }

    setIsLoading(true);
    try {
      await createFolder(folderName.trim(), '');
      router.back();
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể tạo thư mục');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <WebContainer maxWidth={720}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.headerButton, { backgroundColor: theme.cancelBg }]}>
            <Text style={[styles.cancelText, { color: theme.cancelText }]}>Hủy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleCreate}
            style={[styles.createButton, { backgroundColor: theme.primary }, !folderName.trim() && { backgroundColor: theme.disabledBtn }]}
            disabled={!folderName.trim() || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.createText}>Tạo</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="folder-outline" size={48} color={theme.iconColor} />
          </View>
          <TextInput
            style={[styles.input, { color: theme.text, borderBottomColor: theme.border }]}
            placeholder="Thư mục chưa đặt tên"
            placeholderTextColor={theme.textMuted}
            value={folderName}
            onChangeText={setFolderName}
            autoFocus
            textAlign="center"
          />
        </View>
      </WebContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  createButton: {
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  createText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 24,
  },
  iconContainer: {
    marginBottom: 24,
  },
  input: {
    fontSize: 24,
    fontWeight: 'bold',
    width: '100%',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
});
