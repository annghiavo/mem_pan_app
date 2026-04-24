import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!identifier || !password) return;

    setLoading(true);
    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL;
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: identifier, // Assuming backend accepts username/email in the email field or we just pass it as email
          password: password,
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
        // Here you would typically save the token (data.accessToken) to SecureStore or similar
        // and update global auth state
        Alert.alert('Thành công', 'Đăng nhập thành công!');
        router.replace('/(tabs)');
      } else {
        Alert.alert('Lỗi đăng nhập', data.message || 'Tài khoản hoặc mật khẩu không chính xác.');
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể kết nối đến máy chủ.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = identifier.length > 0 && password.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#212529" />
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>Đăng nhập</Text>

        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Email hoặc tên người dùng"
              placeholderTextColor="#8a94a6"
              value={identifier}
              onChangeText={setIdentifier}
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

          <TouchableOpacity
            style={[styles.loginButton, !isFormValid && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={!isFormValid || loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={[styles.loginButtonText, !isFormValid && styles.loginButtonTextDisabled]}>
                Đăng nhập
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.forgotPasswordButton}>
            <Text style={styles.forgotPasswordText}>Quên mật khẩu</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.registerLinkButton}
            onPress={() => router.push('/(auth)/register' as any)}
          >
            <Text style={styles.registerLinkText}>Chưa có tài khoản? Đăng ký ngay</Text>
          </TouchableOpacity>
        </View>
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
    paddingHorizontal: 24,
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
  loginButton: {
    backgroundColor: '#4255ff',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonDisabled: {
    backgroundColor: '#f6f7fa',
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginButtonTextDisabled: {
    color: '#c2c8d0',
  },
  forgotPasswordButton: {
    alignItems: 'center',
    marginTop: 16,
  },
  forgotPasswordText: {
    color: '#4255ff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  registerLinkButton: {
    alignItems: 'center',
    marginTop: 8,
  },
  registerLinkText: {
    color: '#1a1f36',
    fontSize: 16,
    fontWeight: '500',
  },
});
