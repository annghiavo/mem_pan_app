import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator, useColorScheme } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { WebContainer } from '../../components/ui/WebContainer';
import { showAlert } from '../../utils/alert';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string }>();
  const token = typeof params.token === 'string' ? params.token : '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const theme = {
    background: isDark ? '#111111' : '#ffffff',
    text: isDark ? '#f4f4f5' : '#1a1f36',
    textMuted: isDark ? '#a1a1aa' : '#8a94a6',
    inputBg: isDark ? '#27272a' : '#f6f7fa',
    btnDisabled: isDark ? '#3f3f46' : '#f6f7fa',
    btnDisabledText: isDark ? '#71717a' : '#c2c8d0',
    primary: '#4255ff',
  };

  const handleSubmit = async () => {
    if (!token) {
      showAlert('Liên kết không hợp lệ', 'Không tìm thấy mã đặt lại mật khẩu trong liên kết.');
      return;
    }
    if (password.length < 6) {
      showAlert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }
    if (password !== confirmPassword) {
      showAlert('Lỗi', 'Mật khẩu xác nhận không khớp.');
      return;
    }
    try {
      setSubmitting(true);
      const { resetPassword } = await import('../../services/api');
      await resetPassword(token, password);
      showAlert('Thành công', 'Mật khẩu đã được đặt lại. Vui lòng đăng nhập.', () =>
        router.replace('/(auth)/login' as any)
      );
    } catch (error: any) {
      showAlert('Lỗi', error?.message || 'Không thể đặt lại mật khẩu. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const isFormValid = password.length > 0 && confirmPassword.length > 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <WebContainer maxWidth={480} paddingHorizontal={0}>
          <View style={styles.header} />

          <Text style={[styles.title, { color: theme.text }]}>Đặt lại mật khẩu</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Nhập mật khẩu mới cho tài khoản của bạn.
          </Text>

          <View style={styles.formContainer}>
            <View style={[styles.inputContainer, { backgroundColor: theme.inputBg }]}>
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="Mật khẩu mới"
                placeholderTextColor={theme.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={22}
                  color={theme.textMuted}
                />
              </TouchableOpacity>
            </View>

            <View style={[styles.inputContainer, { backgroundColor: theme.inputBg }]}>
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="Nhập lại mật khẩu mới"
                placeholderTextColor={theme.textMuted}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={[styles.submitButton, !isFormValid && { backgroundColor: theme.btnDisabled }]}
              onPress={handleSubmit}
              disabled={!isFormValid || submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={[styles.submitButtonText, !isFormValid && { color: theme.btnDisabledText }]}>
                  Đặt lại mật khẩu
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backToLoginButton}
              onPress={() => router.replace('/(auth)/login' as any)}
            >
              <Text style={[styles.backToLoginText, { color: theme.primary }]}>Quay lại đăng nhập</Text>
            </TouchableOpacity>
          </View>
        </WebContainer>
      </KeyboardAvoidingView>
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
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
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
  submitButton: {
    backgroundColor: '#4255ff',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backToLoginButton: {
    alignItems: 'center',
    marginTop: 16,
  },
  backToLoginText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
