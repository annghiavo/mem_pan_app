import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { WebContainer } from '../../components/ui/WebContainer';

export default function RegisterScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !password || !username || !fullName) return;
    
    setLoading(true);
    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL;
      const response = await fetch(`${apiUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName,
          username,
          email,
          password,
        }),
      });

      let data;
      const responseText = await response.text();
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error("Non-JSON response from server:", responseText);
        Alert.alert('Lỗi máy chủ', 'Máy chủ trả về dữ liệu không hợp lệ (có thể là trang HTML chặn truy cập).');
        setLoading(false);
        return;
      }

      if (response.ok) {
        Alert.alert('Thành công', 'Đăng ký tài khoản thành công!', [
          { text: 'Đăng nhập ngay', onPress: () => router.replace('/(auth)/login' as any) }
        ]);
      } else {
        Alert.alert('Lỗi đăng ký', data.message || 'Có lỗi xảy ra, vui lòng thử lại.');
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể kết nối đến máy chủ.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = email.length > 0 && password.length > 0 && username.length > 0 && fullName.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <WebContainer maxWidth={480} paddingHorizontal={0}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={28} color="#212529" />
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>Tạo tài khoản</Text>

          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Họ và tên"
                placeholderTextColor="#8a94a6"
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Tên người dùng"
                placeholderTextColor="#8a94a6"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#8a94a6"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Mật khẩu"
                placeholderTextColor="#8a94a6"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity 
                style={styles.eyeIcon} 
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons 
                  name={showPassword ? "eye-outline" : "eye-off-outline"} 
                  size={22} 
                  color="#8a94a6" 
                />
              </TouchableOpacity>
            </View>

            <View style={styles.termsContainer}>
              <Text style={styles.termsText}>
                Bằng việc đăng ký, bạn chấp nhận{' '}
                <Text style={styles.termsLink}>Điều khoản dịch vụ</Text> và{' '}
                <Text style={styles.termsLink}>Chính sách quyền riêng tư</Text> của chúng tôi
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.registerButton, !isFormValid && styles.registerButtonDisabled]}
              onPress={handleRegister}
              disabled={!isFormValid || loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={[styles.registerButtonText, !isFormValid && styles.registerButtonTextDisabled]}>
                  Tạo tài khoản
                </Text>
              )}
            </TouchableOpacity>
          </View>
          </WebContainer>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    marginTop: Platform.OS === 'android' ? 40 : 10,
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1f36',
    marginBottom: 32,
  },
  formContainer: {
    gap: 16,
  },
  inputContainer: {
    backgroundColor: '#f6f7fa',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 56,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1a1f36',
    fontWeight: '500',
  },
  eyeIcon: {
    padding: 8,
  },
  termsContainer: {
    marginVertical: 12,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  termsText: {
    textAlign: 'center',
    color: '#5e6c84',
    fontSize: 14,
    lineHeight: 20,
  },
  termsLink: {
    color: '#4255ff',
    fontWeight: '600',
  },
  registerButton: {
    backgroundColor: '#4255ff',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerButtonDisabled: {
    backgroundColor: '#f6f7fa',
  },
  registerButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  registerButtonTextDisabled: {
    color: '#c2c8d0',
  },
});
