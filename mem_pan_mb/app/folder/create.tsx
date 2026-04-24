import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { createFolder } from '../../services/api';

export default function CreateFolderScreen() {
  const router = useRouter();
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Text style={styles.cancelText}>Hủy</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={handleCreate} 
          style={[styles.createButton, !folderName.trim() && styles.createButtonDisabled]}
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
          <Ionicons name="folder-outline" size={48} color="#4b5563" />
        </View>
        <TextInput
          style={styles.input}
          placeholder="Thư mục chưa đặt tên"
          placeholderTextColor="#9ca3af"
          value={folderName}
          onChangeText={setFolderName}
          autoFocus
          textAlign="center"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
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
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  createButton: {
    paddingVertical: 8,
    paddingHorizontal: 24,
    backgroundColor: '#4255ff',
    borderRadius: 20,
  },
  createButtonDisabled: {
    backgroundColor: '#9ca3af',
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
    color: '#1f2937',
    width: '100%',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
});
