import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';

export default function CreateScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Tạo mới</Text>
        <Text style={styles.subtitle}>Tạo học phần, thư mục hoặc lớp học mới</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10, color: '#1f2937' },
  subtitle: { fontSize: 16, color: '#6b7280', textAlign: 'center' }
});
