import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator, useColorScheme, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { WebContainer } from '../../components/ui/WebContainer';
import { showAlert, showConfirm } from '../../utils/alert';
import { devlog } from '../../services/devlog';

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
    devlog.event('login:submit', { identifierLen: identifier.length });
    if (!identifier || !password) {
      devlog.warn('login:submit aborted — empty field');
      return;
    }

    setLoading(true);
    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL;
      const url = `${apiUrl}/auth/login`;
      const body = JSON.stringify({
        email: identifier, // Assuming backend accepts username/email in the email field or we just pass it as email
        password: password,
      });
      const { logRequest, logResponse } = await import('../../services/api');
      logRequest('POST', url, body);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body,
      });

      let data;
      const responseText = await response.text();
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        logResponse('POST', url, response.status, `<invalid JSON> ${responseText}`);
        devlog.error('login: non-JSON response from server', e, { snippet: responseText.slice(0, 200) });
        showAlert('Lỗi máy chủ', 'Máy chủ trả về dữ liệu không hợp lệ (có thể là trang HTML chặn truy cập).');
        setLoading(false);
        return;
      }
      logResponse('POST', url, response.status, data);

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

        devlog.event('login:success', { hasRefreshToken: !!rToken });

        // Fire-and-forget: register FCM token + report timezone now that we
        // have an auth token. The bootstrap call from app/_layout.tsx no-ops
        // pre-login, so this is what actually registers the device.
        import('../../services/notifications')
          .then(({ bootstrapNotifications, syncTimezone }) => {
            bootstrapNotifications();
            syncTimezone();
          })
          .catch((e) => devlog.warn('login: bootstrapNotifications/syncTimezone failed', { error: String(e) }));

        showAlert('Thành công', 'Đăng nhập thành công!', () => router.replace('/(tabs)'));
        if (Platform.OS === 'web') return; // router.replace already called in showAlert callback
      } else {
        devlog.warn('login:failed', { status: response.status, message: data?.message });
        if (data?.message === 'email not verified') {
          showConfirm(
            'Xác thực email',
            'Tài khoản của bạn chưa được xác thực email. Bạn có muốn đi tới trang xác thực để gửi lại email kích hoạt không?',
            () => router.push({ pathname: '/(auth)/verify-email', params: { email: identifier } } as any),
            'Xác thực',
            'Đóng'
          );
        } else {
          showAlert('Lỗi đăng nhập', data.message || 'Tài khoản hoặc mật khẩu không chính xác.');
        }
      }
    } catch (error) {
      devlog.error('login: network/unknown error', error);
      showAlert('Lỗi', 'Không thể kết nối đến máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail.trim()) {
      showAlert('Lỗi', 'Vui lòng nhập email của bạn.');
      return;
    }
    try {
      setSendingReset(true);
      const { forgotPassword } = await import('../../services/api');
      await forgotPassword(forgotEmail.trim());
      setShowForgotModal(false);
      setForgotEmail('');
      showAlert('Đã gửi', 'Vui lòng kiểm tra email để nhận liên kết đặt lại mật khẩu.');
    } catch (error: any) {
      showAlert('Lỗi', error.message || 'Không thể gửi email. Vui lòng thử lại.');
    } finally {
      setSendingReset(false);
    }
  };

  const isFormValid = identifier.length > 0 && password.length > 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior="padding"
      >
        <WebContainer maxWidth={480} paddingHorizontal={0}>
          <View style={styles.header} />

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
                onSubmitEditing={() => {
                  if (isFormValid && !loading) {
                    handleLogin();
                  }
                }}
                returnKeyType="done"
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
        </WebContainer>
      </KeyboardAvoidingView>
      {/* Forgot Password Modal */}
      <Modal visible={showForgotModal} transparent animationType="slide">
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior="padding"
        >
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
                  autoFocus
                  onSubmitEditing={handleForgotPassword}
                  returnKeyType="send"
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
        </KeyboardAvoidingView>
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
