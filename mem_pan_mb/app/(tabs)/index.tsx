import React from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#6b7280" />
            <TextInput placeholder="Tìm kiếm" style={styles.searchInput} />
          </View>
          <TouchableOpacity style={styles.avatarContainer} onPress={() => router.push('/(settings)' as any)}>
            <Text style={styles.avatarText}>M</Text>
          </TouchableOpacity>
        </View>

        {/* Học tiếp (Continue Learning) */}
        <Text style={styles.sectionTitle}>Học tiếp</Text>
        <TouchableOpacity style={styles.continueCard} onPress={() => router.push('/module/1' as any)}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>TOEIC: Intermediate...</Text>
            <Ionicons name="ellipsis-vertical" size={20} color="#6b7280" />
          </View>
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: '0%' }]} />
            </View>
          </View>
          <Text style={styles.progressText}>Đã hoàn thành 0% số câu hỏi</Text>
          <TouchableOpacity style={styles.continueButton} onPress={() => router.push('/module/1' as any)}>
            <Text style={styles.continueButtonText}>Tiếp tục</Text>
          </TouchableOpacity>
        </TouchableOpacity>

        {/* Gần đây (Recent) */}
        <Text style={styles.sectionTitle}>Gần đây</Text>
        <TouchableOpacity style={styles.recentItem} onPress={() => router.push('/module/1' as any)}>
          <View style={styles.recentIcon}>
            <Ionicons name="albums-outline" size={24} color="#008080" />
          </View>
          <View style={styles.recentInfo}>
            <Text style={styles.recentTitle}>TOEIC: Intermediate...</Text>
            <Text style={styles.recentSubtitle}>69 thẻ • Tác giả: Quizlet</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.recentItem} onPress={() => router.push('/module/2' as any)}>
          <View style={styles.recentIcon}>
            <Ionicons name="albums-outline" size={24} color="#008080" />
          </View>
          <View style={styles.recentInfo}>
            <Text style={styles.recentTitle}>KANJI MARUGOTO...</Text>
            <Text style={styles.recentSubtitle}>544 thẻ • Tác giả: bạn</Text>
          </View>
        </TouchableOpacity>

        {/* Cá nhân hóa nội dung cho bạn */}
        <Text style={styles.sectionTitle}>Cá nhân hóa nội dung cho bạn</Text>
        <View style={{ height: 100 }} /> {/* Spacer for tab bar */}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 10,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    marginRight: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#1f2937',
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#5865F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
    marginTop: 8,
  },
  continueCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#5865F2',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 16,
  },
  continueButton: {
    backgroundColor: '#5865F2',
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  recentIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#e0f2f1',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  recentInfo: {
    flex: 1,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  recentSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
});
