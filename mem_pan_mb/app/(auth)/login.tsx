import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, useColorScheme, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [sendingReset, setSendingReset] = useState(false);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const theme = {
    background: isDark ? '#111111' : '#ffffff',
    text: isDark ? '#f4f4f5' : '#1a1f36',
    textMuted: isDark ? '#a1a1aa' : '#8a94a6',
    inputBg: isDark ? '#27272a' : '#f6f7fa',
    btnDisabled: isDark ? '#3f3f46' : '#f6f7fa',
    btnDisabledText: isDark ? '#71717a' : '#c2c8d0',
    primary: '#4255ff'
  };

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
        // Cập nhật token vào bộ nhớ tạm để gọi các API khác
        const { setAuthToken, setRefreshToken } = await import('../../services/api');
        const token = data.token || data.accessToken || (data.data && data.data.accessToken);
        if (token) {
          await setAuthToken(token);
        }
        const rToken = data.refreshToken || (data.data && data.data.refreshToken);
        if (rToken) {
          await setRefreshToken(rToken);
        }
        
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

  const handleForgotPassword = async () => {
    if (!forgotEmail.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập email của bạn.');
      return;
    }
    try {
      setSendingReset(true);
      const { forgotPassword } = await import('../../services/api');
      await forgotPassword(forgotEmail.trim());
      setShowForgotModal(false);
      setForgotEmail('');
      Alert.alert('Đã gửi', 'Vui lòng kiểm tra email để nhận liên kết đặt lại mật khẩu.');
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể gửi email. Vui lòng thử lại.');
    } finally {
      setSendingReset(false);
    }
  };

  const isFormValid = identifier.length > 0 && password.length > 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color={theme.text} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.title, { color: theme.text }]}>Đăng nhập</Text>

        <View style={styles.formContainer}>
          <View style={[styles.inputContainer, { backgroundColor: theme.inputBg }]}>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="Email hoặc tên người dùng"
              placeholderTextColor={theme.textMuted}
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={[styles.inputContainer, { backgroundColor: theme.inputBg }]}>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="Mật khẩu"
              placeholderTextColor={theme.textMuted}
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
                color={theme.textMuted}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.loginButton, !isFormValid && { backgroundColor: theme.btnDisabled }]}
            onPress={handleLogin}
            disabled={!isFormValid || loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={[styles.loginButtonText, !isFormValid && { color: theme.btnDisabledText }]}>
                Đăng nhập
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.forgotPasswordButton} onPress={() => setShowForgotModal(true)}>
            <Text style={[styles.forgotPasswordText, { color: theme.primary }]}>Quên mật khẩu</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.registerLinkButton}
            onPress={() => router.push('/(auth)/register' as any)}
          >
            <Text style={[styles.registerLinkText, { color: theme.text }]}>Chưa có tài khoản? Đăng ký ngay</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      {/* Forgot Password Modal */}
      <Modal visible={showForgotModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.background }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Quên mật khẩu</Text>
            <Text style={[styles.modalSubtitle, { color: theme.textMuted }]}>
              Nhập email để nhận liên kết đặt lại mật khẩu.
            </Text>
            <View style={[styles.inputContainer, { backgroundColor: theme.inputBg }]}>
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="Email của bạn"
                placeholderTextColor={theme.textMuted}
                value={forgotEmail}
                onChangeText={setForgotEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
            <TouchableOpacity
              style={[styles.loginButton, { marginTop: 12 }]}
              onPress={handleForgotPassword}
              disabled={sendingReset}
            >
              {sendingReset
                ? <ActivityIndicator color="#ffffff" />
                : <Text style={styles.loginButtonText}>Gửi liên kết</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.forgotPasswordButton} onPress={() => { setShowForgotModal(false); setForgotEmail(''); }}>
              <Text style={[styles.forgotPasswordText, { color: theme.textMuted }]}>Hủy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    marginBottom: 32,
  },
  formContainer: {
    gap: 16,
  },
  inputContainer: {
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 56,
  },
  input: {
    flex: 1,
    fontSize: 16,
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
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  forgotPasswordButton: {
    alignItems: 'center',
    marginTop: 16,
  },
  forgotPasswordText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  registerLinkButton: {
    alignItems: 'center',
    marginTop: 8,
  },
  registerLinkText: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalBox: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    gap: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 8,
  },
});
