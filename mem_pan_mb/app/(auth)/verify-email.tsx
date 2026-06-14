import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator, useColorScheme } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { WebContainer } from '../../components/ui/WebContainer';
import { showAlert } from '../../utils/alert';
import { verifyEmail, resendVerification } from '../../services/api';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string; email?: string }>();
  const token = typeof params.token === 'string' ? params.token : '';
  const initialEmail = typeof params.email === 'string' ? params.email : '';

  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>(token ? 'verifying' : 'idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [resending, setResending] = useState(false);

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
    success: '#10b981',
    error: '#ef4444'
  };

  useEffect(() => {
    if (token) {
      handleVerify();
    }
  }, [token]);

  const handleVerify = async () => {
    try {
      setStatus('verifying');
      await verifyEmail(token);
      setStatus('success');
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err?.message || 'Không thể xác thực email. Mã xác thực có thể đã hết hạn hoặc không hợp lệ.');
    }
  };

  const handleResend = async () => {
    if (!email.trim()) {
      showAlert('Lỗi', 'Vui lòng nhập địa chỉ email của bạn.');
      return;
    }
    try {
      setResending(true);
      await resendVerification(email.trim());
      showAlert('Thành công', 'Đã gửi email xác thực mới. Vui lòng kiểm tra hộp thư.');
      setEmail('');
    } catch (err: any) {
      showAlert('Lỗi', err?.message || 'Không thể gửi lại email xác thực. Vui lòng thử lại.');
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <WebContainer maxWidth={480} paddingHorizontal={0}>
          <View style={styles.header} />

          {status === 'verifying' && (
            <View style={styles.contentCenter}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={[styles.title, { color: theme.text, marginTop: 24, textAlign: 'center' }]}>Đang xác thực email</Text>
              <Text style={[styles.subtitle, { color: theme.textMuted, textAlign: 'center' }]}>Vui lòng chờ trong giây lát...</Text>
            </View>
          )}

          {status === 'success' && (
            <View style={styles.contentCenter}>
              <Ionicons name="checkmark-circle" size={80} color={theme.success} />
              <Text style={[styles.title, { color: theme.text, marginTop: 16, textAlign: 'center' }]}>Xác thực thành công!</Text>
              <Text style={[styles.subtitle, { color: theme.textMuted, textAlign: 'center', marginBottom: 32 }]}>
                Email của bạn đã được xác thực thành công. Bây giờ bạn có thể đăng nhập vào tài khoản.
              </Text>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: theme.primary, width: '100%' }]}
                onPress={() => router.replace('/(auth)/login' as any)}
              >
                <Text style={styles.primaryButtonText}>Đăng nhập ngay</Text>
              </TouchableOpacity>
            </View>
          )}

          {(status === 'error' || status === 'idle') && (
            <View style={styles.formContainer}>
              {status === 'error' ? (
                <View style={styles.contentCenter}>
                  <Ionicons name="alert-circle" size={80} color={theme.error} />
                  <Text style={[styles.title, { color: theme.text, marginTop: 16, textAlign: 'center' }]}>Xác thực thất bại</Text>
                  <Text style={[styles.subtitle, { color: theme.textMuted, textAlign: 'center', marginBottom: 24 }]}>
                    {errorMessage}
                  </Text>
                </View>
              ) : (
                <View style={styles.contentCenter}>
                  <Ionicons name="mail" size={80} color={theme.primary} />
                  <Text style={[styles.title, { color: theme.text, marginTop: 16, textAlign: 'center' }]}>Xác thực email</Text>
                  <Text style={[styles.subtitle, { color: theme.textMuted, textAlign: 'center', marginBottom: 24 }]}>
                    Tài khoản của bạn cần được xác thực email. Vui lòng kiểm tra hộp thư hoặc gửi lại email xác thực dưới đây.
                  </Text>
                </View>
              )}

              <View style={styles.divider} />
              
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Gửi lại email xác thực</Text>
              <View style={[styles.inputContainer, { backgroundColor: theme.inputBg }]}>
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="Nhập email của bạn"
                  placeholderTextColor={theme.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: theme.primary, marginTop: 8 }]}
                onPress={handleResend}
                disabled={resending}
              >
                {resending ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Gửi email xác thực</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.replace('/(auth)/login' as any)}
              >
                <Text style={[styles.backButtonText, { color: theme.primary }]}>Quay lại đăng nhập</Text>
              </TouchableOpacity>
            </View>
          )}
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
  contentCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
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
  primaryButton: {
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    alignItems: 'center',
    marginTop: 16,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#e4e4e7',
    marginVertical: 16,
  }
});
