import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function CreateScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tạo mới</Text>
      </View>
      <View style={styles.content}>
        <TouchableOpacity style={styles.createOption} onPress={() => router.push('/module/create' as any)}>
          <View style={styles.iconContainer}>
            <Ionicons name="albums-outline" size={24} color="#5865F2" />
          </View>
          <View style={styles.optionTextContainer}>
            <Text style={styles.optionTitle}>Học phần</Text>
            <Text style={styles.optionSubtitle}>Tạo học phần mới với thuật ngữ và định nghĩa</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.createOption} onPress={() => router.push('/folder/create' as any)}>
          <View style={styles.iconContainer}>
            <Ionicons name="folder-outline" size={24} color="#5865F2" />
          </View>
          <View style={styles.optionTextContainer}>
            <Text style={styles.optionTitle}>Thư mục</Text>
            <Text style={styles.optionSubtitle}>Tổ chức các học phần của bạn</Text>
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { padding: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1f2937' },
  content: { padding: 16 },
  createOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', padding: 16, borderRadius: 12, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  iconContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  optionTextContainer: { flex: 1 },
  optionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginBottom: 4 },
  optionSubtitle: { fontSize: 14, color: '#6b7280' }
});
